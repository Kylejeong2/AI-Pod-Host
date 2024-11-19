"use client";

import React, {
  createContext,
  useState,
  useCallback,
  useContext,
} from "react";
import { VoiceId } from "@/data/voices";

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
      You are an expert on explaining things. You're responses should only be 2 sentences as most.
      Here's a summary of what you need to know: ${summary}. Wait for the user to speak first.
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

  const connect = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/livekit`, { // getting room name etc
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch token");
    }

    const { accessToken, url } = await response.json();

    setConnectionDetails({
      wsUrl: url,
      token: accessToken,
      shouldConnect: true,
      voice: data.sessionConfig.voice,
    });
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
