"use client";

import { createContext, useContext, ReactNode, useState } from 'react';

interface TranscriptContextType {
  documentNamespace: string | null;
  summary: string | null;
  setDocumentNamespace: (namespace: string) => void;
  setSummary: (summary: string) => void;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [documentNamespace, setDocumentNamespace] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <TranscriptContext.Provider value={{
      documentNamespace,
      summary,
      setDocumentNamespace,
      setSummary
    }}>
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscript() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error('useTranscript must be used within a TranscriptProvider');
  }
  return context;
}

