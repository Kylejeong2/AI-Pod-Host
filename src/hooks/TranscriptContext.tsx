"use client";

import React, { createContext, useState, useContext } from 'react';

type TranscriptContextType = {
  summary: string;
  setSummary: (summary: string) => void;
};

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export const TranscriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [summary, setSummary] = useState('');

  return (
    <TranscriptContext.Provider value={{ summary, setSummary }}>
      {children}
    </TranscriptContext.Provider>
  );
};

export const useTranscript = () => {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
};

