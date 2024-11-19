import React, { createContext, useContext, useState } from 'react';

interface VideoContextType {
  isPaused: boolean;
  setIsPaused: (isPaused: boolean) => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <VideoContext.Provider value={{ isPaused, setIsPaused }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}

