# Code VIA livekit agents, edited by Kyle Jeong 2024 

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from typing import Callable, Literal, Protocol

import openai
from livekit import rtc
from livekit.agents import llm, stt, tokenize, transcription, utils, vad
from livekit.agents._constants import ATTRIBUTE_AGENT_STATE
from livekit.agents._types import AgentState
from livekit.agents.log import logger
from livekit.agents.multimodal import agent_playout
from livekit.plugins.openai import realtime
from pinecone import Pinecone

EventTypes = Literal[
    "user_started_speaking",
    "user_stopped_speaking",
    "agent_started_speaking",
    "agent_stopped_speaking",
]


@dataclass(frozen=True)
class AgentTranscriptionOptions:
    user_transcription: bool = True
    """Whether to forward the user transcription to the client"""
    agent_transcription: bool = True
    """Whether to forward the agent transcription to the client"""
    agent_transcription_speed: float = 1.0
    """The speed at which the agent's speech transcription is forwarded to the client.
    We try to mimic the agent's speech speed by adjusting the transcription speed."""
    sentence_tokenizer: tokenize.SentenceTokenizer = tokenize.basic.SentenceTokenizer()
    """The tokenizer used to split the speech into sentences.
    This is used to decide when to mark a transcript as final for the agent transcription."""
    word_tokenizer: tokenize.WordTokenizer = tokenize.basic.WordTokenizer(
        ignore_punctuation=False
    )
    """The tokenizer used to split the speech into words.
    This is used to simulate the "interim results" of the agent transcription."""
    hyphenate_word: Callable[[str], list[str]] = tokenize.basic.hyphenate_word
    """A function that takes a string (word) as input and returns a list of strings,
    representing the hyphenated parts of the word."""


class S2SModel(Protocol): ...


@dataclass(frozen=True)
class _ImplOptions:
    transcription: AgentTranscriptionOptions


class MultimodalAgent(utils.EventEmitter[EventTypes]):
    def __init__(
        self,
        *,
        model: S2SModel,
        vad: vad.VAD | None = None,
        chat_ctx: llm.ChatContext | None = None,
        fnc_ctx: llm.FunctionContext | None = None,
        transcription: AgentTranscriptionOptions = AgentTranscriptionOptions(),
        loop: asyncio.AbstractEventLoop | None = None,
    ):
        super().__init__()
        self._loop = loop or asyncio.get_event_loop()

        from livekit.plugins.openai import realtime

        assert isinstance(model, realtime.RealtimeModel)

        self._model = model
        self._vad = vad
        self._chat_ctx = chat_ctx
        self._fnc_ctx = fnc_ctx

        self._opts = _ImplOptions(
            transcription=transcription,
        )

        # audio input
        self._read_micro_atask: asyncio.Task | None = None
        self._subscribed_track: rtc.RemoteAudioTrack | None = None
        self._input_audio_ch = utils.aio.Chan[rtc.AudioFrame]()

        # audio output
        self._playing_handle: agent_playout.PlayoutHandle | None = None

        self._linked_participant: rtc.RemoteParticipant | None = None
        self._started, self._closed = False, False

        self._update_state_task: asyncio.Task | None = None
        self._http_session: aiohttp.ClientSession | None = None  # noqa: F821

    @property
    def vad(self) -> vad.VAD | None:
        return self._vad

    @property
    def fnc_ctx(self) -> llm.FunctionContext | None:
        return self._session.fnc_ctx

    @fnc_ctx.setter
    def fnc_ctx(self, value: llm.FunctionContext | None) -> None:
        self._session.fnc_ctx = value

    def start(
        self, room: rtc.Room, participant: rtc.RemoteParticipant | str | None = None
    ) -> None:
        if self._started:
            raise RuntimeError("voice assistant already started")

        room.on("participant_connected", self._on_participant_connected)
        room.on("track_published", self._subscribe_to_microphone)
        room.on("track_subscribed", self._subscribe_to_microphone)

        self._room, self._participant = room, participant

        if participant is not None:
            if isinstance(participant, rtc.RemoteParticipant):
                self._link_participant(participant.identity)
            else:
                self._link_participant(participant)
        else:
            # no participant provided, try to find the first participant in the room
            for participant in self._room.remote_participants.values():
                self._link_participant(participant.identity)
                break

        self._session = self._model.session(
            chat_ctx=self._chat_ctx, fnc_ctx=self._fnc_ctx
        )
        self._main_atask = asyncio.create_task(self._main_task())

        @self._session.on("response_content_added")
        def _on_content_added(message: realtime.RealtimeContent):
            tr_fwd = transcription.TTSSegmentsForwarder(
                room=self._room,
                participant=self._room.local_participant,
                speed=self._opts.transcription.agent_transcription_speed,
                sentence_tokenizer=self._opts.transcription.sentence_tokenizer,
                word_tokenizer=self._opts.transcription.word_tokenizer,
                hyphenate_word=self._opts.transcription.hyphenate_word,
            )

            self._playing_handle = self._agent_playout.play(
                item_id=message.item_id,
                content_index=message.content_index,
                transcription_fwd=tr_fwd,
                text_stream=message.text_stream,
                audio_stream=message.audio_stream,
            )

        @self._session.on("input_speech_committed")
        def _input_speech_committed():
            self._stt_forwarder.update(
                stt.SpeechEvent(
                    type=stt.SpeechEventType.INTERIM_TRANSCRIPT,
                    alternatives=[stt.SpeechData(language="", text="")],
                )
            )

        @self._session.on("input_speech_transcription_completed")
        def _input_speech_transcription_completed(
            ev: realtime.InputTranscriptionCompleted,
        ):
            self._stt_forwarder.update(
                stt.SpeechEvent(
                    type=stt.SpeechEventType.FINAL_TRANSCRIPT,
                    alternatives=[stt.SpeechData(language="", text=ev.transcript)],
                )
            )

        @self._session.on("input_speech_started")
        def _input_speech_started():
            self._update_state("listening")
            if self._playing_handle is not None and not self._playing_handle.done():
                self._playing_handle.interrupt()

                self._session.conversation.item.truncate(
                    item_id=self._playing_handle.item_id,
                    content_index=self._playing_handle.content_index,
                    audio_end_ms=int(self._playing_handle.audio_samples / 24000 * 1000),
                )

                self._playing_handle = None

    def _update_state(self, state: AgentState, delay: float = 0.0):
        """Set the current state of the agent"""

        @utils.log_exceptions(logger=logger)
        async def _run_task(delay: float) -> None:
            await asyncio.sleep(delay)

            if self._room.isconnected():
                await self._room.local_participant.set_attributes(
                    {ATTRIBUTE_AGENT_STATE: state}
                )

        if self._update_state_task is not None:
            self._update_state_task.cancel()

        self._update_state_task = asyncio.create_task(_run_task(delay))

    @utils.log_exceptions(logger=logger)
    async def _main_task(self) -> None:
        self._update_state("initializing")
        self._audio_source = rtc.AudioSource(24000, 1)
        self._agent_playout = agent_playout.AgentPlayout(
            audio_source=self._audio_source
        )

        def _on_playout_started() -> None:
            self.emit("agent_started_speaking")
            self._update_state("speaking")

        def _on_playout_stopped(interrupted: bool) -> None:
            self.emit("agent_stopped_speaking")
            self._update_state("listening")

        self._agent_playout.on("playout_started", _on_playout_started)
        self._agent_playout.on("playout_stopped", _on_playout_stopped)

        track = rtc.LocalAudioTrack.create_audio_track(
            "assistant_voice", self._audio_source
        )
        self._agent_publication = await self._room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE)
        )

        await self._agent_publication.wait_for_subscription()

        bstream = utils.audio.AudioByteStream(
            24000,
            1,
            samples_per_channel=2400,
        )
        async for frame in self._input_audio_ch:
            for f in bstream.write(frame.data.tobytes()):
                self._session.input_audio_buffer.append(f)

    def _on_participant_connected(self, participant: rtc.RemoteParticipant):
        if self._linked_participant is None:
            return

        self._link_participant(participant.identity)

    def _link_participant(self, participant_identity: str) -> None:
        self._linked_participant = self._room.remote_participants.get(
            participant_identity
        )
        if self._linked_participant is None:
            logger.error("_link_participant must be called with a valid identity")
            return

        self._subscribe_to_microphone()

    async def _micro_task(self, track: rtc.LocalAudioTrack) -> None:
        stream_24khz = rtc.AudioStream(track, sample_rate=24000, num_channels=1)
        async for ev in stream_24khz:
            self._input_audio_ch.send_nowait(ev.frame)

    def _subscribe_to_microphone(self, *args, **kwargs) -> None:
        """Subscribe to the participant microphone if found"""

        if self._linked_participant is None:
            return

        for publication in self._linked_participant.track_publications.values():
            if publication.source != rtc.TrackSource.SOURCE_MICROPHONE:
                continue

            if not publication.subscribed:
                publication.set_subscribed(True)

            if (
                publication.track is not None
                and publication.track != self._subscribed_track
            ):
                self._subscribed_track = publication.track  # type: ignore
                self._stt_forwarder = transcription.STTSegmentsForwarder(
                    room=self._room,
                    participant=self._linked_participant,
                    track=self._subscribed_track,
                )

                if self._read_micro_atask is not None:
                    self._read_micro_atask.cancel()

                self._read_micro_atask = asyncio.create_task(
                    self._micro_task(self._subscribed_track)  # type: ignore
                )
                break

    def _ensure_session(self) -> aiohttp.ClientSession:  # noqa: F821
        if not self._http_session:
            self._http_session = utils.http_context.http_session()

        return self._http_session


class CustomMultimodalAgent(MultimodalAgent):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Initialize Pinecone
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        openai.api_key = os.getenv("OPENAI_API_KEY_EMBEDDINGS")
        self._index = pc.Index("overlap")

    async def retrieve_context_from_pinecone(self, text_stream) -> str:
        try:
            # Collect the full text from the stream
            text = ""
            if hasattr(text_stream, '__aiter__'):
                logger.info("Processing async text stream...")
                async for chunk in text_stream:
                    text += chunk
            else:
                logger.info("Processing regular string input...")
                text = str(text_stream)
                
            logger.info(f"Input text for embedding: {text[:100]}...")  # Log first 100 chars
            
            # Get embeddings
            logger.info("Requesting embeddings from OpenAI...")
            response = openai.embeddings.create(
                model="text-embedding-3-large",
                input=text,
            )
            embedding = response.data[0].embedding
            logger.info(f"Received embedding vector of length: {len(embedding)}")
            
            # Query Pinecone
            logger.info("Querying Pinecone index 'overlap' for similar contexts...")
            results = self._index.query(
                vector=embedding,
                top_k=5,
                include_metadata=True
            )
            
            logger.info(f"Received {len(results['matches'])} matches from Pinecone")
            
            # Build context
            context_items = []
            for i, match in enumerate(results['matches'], 1):
                try:
                    timestamp = match['metadata'].get('timestamp', 'N/A')
                    score = match.get('score', 'N/A')
                    logger.info(f"Match {i}: Score={score:.4f}, Timestamp={timestamp}")
                    context_items.append(f"Timestamp: {timestamp}, Score: {score}")
                except Exception as e:
                    logger.error(f"Error processing match {i}: {e}")
                    continue
                    
            context = "\n".join(context_items)
            logger.info(f"Generated context ({len(context)} chars): {context[:200]}...")  # Log first 200 chars
            return context
            
        except Exception as e:
            logger.error(f"Error in retrieve_context_from_pinecone: {str(e)}")
            logger.exception("Full traceback:")  # This will log the full stack trace
            return ""

    async def enhance_with_context(self, text_stream, context: str):
        """Convert the enhanced text into an async generator to maintain stream compatibility"""
        async def enhanced_stream():
            # First yield the context
            logger.info(f"Enhancing stream with context ({len(context)} chars)")
            yield context + "\n"
            
            # Then yield the original stream contents
            chunk_count = 0
            total_chars = 0
            if hasattr(text_stream, '__aiter__'):
                logger.info("Streaming original content from async iterator...")
                async for chunk in text_stream:
                    chunk_count += 1
                    total_chars += len(chunk)
                    logger.debug(f"Yielding chunk {chunk_count} ({len(chunk)} chars)")
                    yield chunk
            else:
                text = str(text_stream)
                logger.info(f"Yielding original content as single string ({len(text)} chars)")
                yield text
                
            logger.info(f"Stream enhancement complete. Total: {chunk_count} chunks, {total_chars} chars")
                
        return enhanced_stream()

    def start(self, room: rtc.Room, participant: rtc.RemoteParticipant | str | None = None) -> None:
        super().start(room, participant)

        @self._session.on("response_content_added")
        def _on_content_added(message: realtime.RealtimeContent):
            # Create and run the async task
            asyncio.create_task(self._handle_content_added(message))
    
    async def _handle_content_added(self, message: realtime.RealtimeContent):
        """Separate async handler for content added events"""
        logger.info("Processing new response content...")
        
        # Retrieve and enhance context
        logger.info("Retrieving context from Pinecone...")
        context = await self.retrieve_context_from_pinecone(message.text_stream)
        
        logger.info("Enhancing text stream with retrieved context...")
        enhanced_text_stream = await self.enhance_with_context(message.text_stream, context)

        logger.info("Setting up transcription forwarder...")
        tr_fwd = transcription.TTSSegmentsForwarder(
            room=self._room,
            participant=self._room.local_participant,
            speed=self._opts.transcription.agent_transcription_speed,
            sentence_tokenizer=self._opts.transcription.sentence_tokenizer,
            word_tokenizer=self._opts.transcription.word_tokenizer,
            hyphenate_word=self._opts.transcription.hyphenate_word,
        )

        logger.info("Initiating playout with enhanced stream...")
        self._playing_handle = self._agent_playout.play(
            item_id=message.item_id,
            content_index=message.content_index,
            transcription_fwd=tr_fwd,
            text_stream=enhanced_text_stream,
            audio_stream=message.audio_stream,
        )
        logger.info("Playout initiated successfully")
