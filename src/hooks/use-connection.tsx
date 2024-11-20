"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useContext,
} from "react";
import { VoiceId } from "@/data/voices";
import axios from "axios";

import { TurnDetectionTypeId } from "@/data/turn-end-types";
import { ModalitiesId } from "@/data/modalities";
import { ModelId } from "@/data/models";
import { TranscriptionModelId } from "@/data/transcription-models";
import { ChatbotData } from  "@/data/chatbot-data"
import { useTranscript } from '@/hooks/TranscriptContext';

export type ConnectFn = () => Promise<void>;

type TokenGeneratorData = {
  shouldConnect: boolean;
  wsUrl: string;
  token: string;
  data: ChatbotData;
  voice: VoiceId;
  disconnect: () => Promise<void>;
  connect: ConnectFn;
};

const ConnectionContext = createContext<TokenGeneratorData | undefined>(
  undefined,
);

export const ConnectionProvider = ({ children }: {
  children: React.ReactNode;
}) => {
  const { summary } = useTranscript();
  const [connectionDetails, setConnectionDetails] = useState<{
    wsUrl: string;
    token: string;
    shouldConnect: boolean;
    voice: VoiceId;
  }>({ wsUrl: "", token: "", shouldConnect: false, voice: VoiceId.alloy });

  const data = {
    instructions: `
      You are an expert podcast co-host and interviewer. Your goal is to have an engaging conversation about the provided content.
      
      Key behaviors:
      1. Ask insightful questions based on the user's responses
      2. Notice when responses get shorter or less engaged and switch topics
      3. Share relevant insights or examples to deepen the discussion
      4. Keep responses concise (2-3 sentences) to maintain conversation flow
      5. Use the document context to guide the conversation but don't be rigid
      
      Document context: ${summary}
      
      Wait for the user to speak first, then begin with an engaging question about their thoughts on the topic.
    `,
    openaiAPIKey: process.env.OPENAI_API_KEY,
    sessionConfig: {
      model: ModelId.gpt_4o_realtime,
      transcriptionModel: TranscriptionModelId.whisper1,
      turnDetection: TurnDetectionTypeId.server_vad,
      modalities: ModalitiesId.text_and_audio,
      voice: VoiceId.alloy,
      temperature: 0.8,
      maxOutputTokens: null,
      vadThreshold: 0.5,
      vadSilenceDurationMs: 200,
      vadPrefixPaddingMs: 300,
    },
  } as ChatbotData;

  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_BASE_URL;

  const connect = async () => {
    try {
      const response = await axios.post('/api/livekit', data);
      const { accessToken, url } = response.data;

      setConnectionDetails({
        wsUrl: url,
        token: accessToken,
        shouldConnect: true,
        voice: data.sessionConfig.voice,
      });
    } catch (error) {
      throw new Error("Failed to fetch token");
    }
  };

  const disconnect = useCallback(async () => {
    setConnectionDetails((prev) => ({ ...prev, shouldConnect: false }));
  }, []);

  return (
    <ConnectionContext.Provider
      value={{
        wsUrl: connectionDetails.wsUrl,
        token: connectionDetails.token,
        shouldConnect: connectionDetails.shouldConnect,
        voice: connectionDetails.voice,
        data,
        connect,
        disconnect,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);

  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider");
  }

  return context;
};
