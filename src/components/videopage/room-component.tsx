"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";

import { Chat } from "@/components/chat";
import { Transcript } from "@/components/transcript";
import { useConnection } from "@/hooks/use-connection";
import { AgentProvider } from "@/hooks/use-agent";
import { useRef } from "react";

export function RoomComponent() {
  const { shouldConnect, wsUrl, token } = useConnection();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const scrollButtonRef = useRef<HTMLButtonElement>(null);
  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token} 
      connect={shouldConnect}
      audio={true}
      className="flex h-screen flex-col flex-grow overflow-hidden border-l border-r border-b rounded-b-md mb-2 bg-white rounded-xl"
      style={{ "--lk-bg": "white" } as React.CSSProperties}
    >
      <AgentProvider>
        <div className="flex flex-col h-full border-l relative">
          <div className="flex-grow overflow-hidden flex flex-col">
            <div className="flex-grow overflow-y-auto rounded-xl h-3/5 p-2" ref={transcriptContainerRef}>
              <Transcript
                scrollContainerRef={transcriptContainerRef}
                scrollButtonRef={scrollButtonRef}
              />
            </div>
          </div>
          <div className="h-2/5 flex-shrink-0 p-2">
            <RoomAudioRenderer />
            <StartAudio label="Click to allow audio playback" />
            <Chat />
          </div>
        </div>
      </AgentProvider>
    </LiveKitRoom>
  );
}
