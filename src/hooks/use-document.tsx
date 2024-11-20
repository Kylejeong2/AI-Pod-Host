"use client";

import { create } from 'zustand';

interface DocumentState {
  content: string;
  namespace: string | null;
  topics: Array<{
    id: string;
    title: string;
    questions: string[];
    excerpts: string[];
  }>;
  setDocument: (content: string) => Promise<void>;
  reset: () => void;
}

export const useDocument = create<DocumentState>((set, get) => ({
  content: '',
  namespace: null,
  topics: [],
  
  setDocument: async (content: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_BASE_URL}/process_document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: 'text' })
      });
      
      const data = await response.json();
      set({ 
        content,
        namespace: data.namespace,
        topics: data.topics
      });
    } catch (error) {
      console.error('Failed to process document:', error);
    }
  },
  
  reset: () => set({ content: '', namespace: null, topics: [] })
})); 