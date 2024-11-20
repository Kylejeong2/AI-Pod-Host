import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Topic {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'completed';
  questions: string[];
  excerpts: string[];
  segue_to_next: string;
  discussionLength: number;
}

interface PodcastState {
  documentNamespace: string | null;
  topics: Topic[];
  currentTopicId: string | null;
  engagementMetrics: {
    score: number;
    responseLengths: number[];
    topicRepetitions: Record<string, number>;
    lastResponses: string[];
  };
  setDocumentNamespace: (namespace: string) => void;
  setTopics: (topics: Topic[]) => void;
  setCurrentTopic: (topicId: string) => void;
  updateTopicStatus: (topicId: string, status: Topic['status']) => void;
  addResponse: (text: string, topicId: string) => void;
  updateEngagementScore: (score: number) => void;
  resetSession: () => void;
}

export const usePodcastSession = create<PodcastState>()(
  persist(
    (set) => ({
      documentNamespace: null,
      topics: [],
      currentTopicId: null,
      engagementMetrics: {
        score: 1.0,
        responseLengths: [],
        topicRepetitions: {},
        lastResponses: [],
      },

      setDocumentNamespace: (namespace) => set({ documentNamespace: namespace }),
      
      setTopics: (topics) => set({ topics }),
      
      setCurrentTopic: (topicId) => set((state) => ({
        currentTopicId: topicId,
        topics: state.topics.map((topic) =>
          topic.id === topicId
            ? { ...topic, status: 'active' }
            : topic
        ),
      })),

      updateTopicStatus: (topicId, status) => set((state) => ({
        topics: state.topics.map((topic) =>
          topic.id === topicId ? { ...topic, status } : topic
        ),
      })),
      
      addResponse: (text, topicId) => set((state) => {
        const newResponseLengths = [...state.engagementMetrics.responseLengths, text.length];
        const newLastResponses = [...state.engagementMetrics.lastResponses, text].slice(-5);
        
        const topicRepetitions = { ...state.engagementMetrics.topicRepetitions };
        topicRepetitions[topicId] = (topicRepetitions[topicId] || 0) + 1;
        
        const topics = state.topics.map((topic) =>
          topic.id === topicId
            ? { ...topic, discussionLength: (topic.discussionLength || 0) + 1 }
            : topic
        );
        
        return {
          topics,
          engagementMetrics: {
            ...state.engagementMetrics,
            responseLengths: newResponseLengths,
            topicRepetitions,
            lastResponses: newLastResponses,
          },
        };
      }),

      updateEngagementScore: (score) => set((state) => ({
        engagementMetrics: {
          ...state.engagementMetrics,
          score,
        },
      })),
      
      resetSession: () => set({
        documentNamespace: null,
        topics: [],
        currentTopicId: null,
        engagementMetrics: {
          score: 1.0,
          responseLengths: [],
          topicRepetitions: {},
          lastResponses: [],
        },
      }),
    }),
    {
      name: 'podcast-session',
    }
  )
); 