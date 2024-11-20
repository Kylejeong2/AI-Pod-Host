"use client"

import { createContext, useContext, ReactNode, useState } from 'react';

interface SummaryContextType {
  summary: string | null;
  setSummary: (summary: string) => void;
}

const SummaryContext = createContext<SummaryContextType | undefined>(undefined);

export function SummaryProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <SummaryContext.Provider value={{
      summary,
      setSummary
    }}>
      {children}
    </SummaryContext.Provider>
  );
}

export function useSummary() {
  const context = useContext(SummaryContext);
  if (context === undefined) {
    throw new Error('useSummary must be used within a SummaryProvider');
  }
  return context;
}
