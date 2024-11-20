"use client"

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TranscriptState {
  transcript: Array<{
    text: string;
    isAgent: boolean;
    timestamp: number;
  }>;
  addEntry: (text: string, isAgent: boolean) => void;
  getFullTranscript: () => string;
  reset: () => void;
}

export const useTranscriptStore = create<TranscriptState>()(
  persist(
    (set, get) => ({
      transcript: [],
      
      addEntry: (text, isAgent) => set((state) => ({
        transcript: [
          ...state.transcript,
          {
            text,
            isAgent,
            timestamp: Date.now()
          }
        ]
      })),

      getFullTranscript: () => {
        return get().transcript
          .map(entry => `${entry.isAgent ? 'AI: ' : 'User: '}${entry.text}`)
          .join('\n\n');
      },

      reset: () => set({ transcript: [] })
    }),
    {
      name: 'podcast-transcript'
    }
  )
); 