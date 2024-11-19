"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useConnection } from "@/hooks/use-connection";
import { Loader2, Mic } from "lucide-react";
import { useVideo } from "@/hooks/VideoContext";

export function ConnectButton() {
  const { connect, disconnect, shouldConnect } = useConnection();
  const [connecting, setConnecting] = useState<boolean>(false);
  const { isPaused } = useVideo();

  const handleConnectionToggle = async () => {
    if (shouldConnect) {
      await disconnect();
    } else {
      await initiateConnection();
    }
  };

  const initiateConnection = useCallback(async () => {
    setConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error("Connection failed:", error);
    } finally {
      setConnecting(false);
    }
  }, [connect]);

  useEffect(() => {
    if (process.env.OPENAI_API_KEY && isPaused) {
      initiateConnection();
    }
  }, [initiateConnection, process.env.OPENAI_API_KEY, isPaused]);

  return ( 
    <>
      <Button
        onClick={handleConnectionToggle}
        disabled={connecting || shouldConnect || !isPaused}
        className="text-sm font-semibold bg-green-600"
      >
        { !isPaused ? (
          <>
            Pause Video to Talk
          </>
        ) :
          connecting || shouldConnect ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting
            </>
          ) : (
            <>
              <Mic className="mr-2 h-4 w-4" />
              Connect
            </>
          )}
      </Button>
    </>
  );
}
