import { create } from 'zustand';
import { Topic } from './use-podcast-session';

interface ConversationContext {
  recentKeywords: string[];
  topicHistory: string[];
  contextualQuotes: string[];
  currentDepth: number;
  lastQuestionType: 'followup' | 'transition' | 'clarification' | 'initial' | null;
}

interface ConversationState {
  context: ConversationContext;
  topicInsights: Record<string, {
    keyPoints: string[];
    userInterests: string[];
    uncoveredAspects: string[];
  }>;
  updateContext: (newContext: Partial<ConversationContext>) => void;
  addTopicInsight: (topicId: string, insight: {
    keyPoint?: string;
    userInterest?: string;
    uncoveredAspect?: string;
  }) => void;
  analyzeResponse: (response: string, currentTopic: Topic) => void;
  getNextQuestionStrategy: (topic: Topic, engagement: number) => {
    type: 'followup' | 'transition' | 'clarification' | 'initial';
    suggestion: string;
  };
  resetContext: () => void;
}

export const useConversationContext = create<ConversationState>()((set, get) => ({
  context: {
    recentKeywords: [],
    topicHistory: [],
    contextualQuotes: [],
    currentDepth: 0,
    lastQuestionType: null,
  },
  topicInsights: {},

  updateContext: (newContext) => set((state) => ({
    context: { ...state.context, ...newContext },
  })),

  addTopicInsight: (topicId, insight) => set((state) => {
    const currentInsights = state.topicInsights[topicId] || {
      keyPoints: [],
      userInterests: [],
      uncoveredAspects: [],
    };

    return {
      topicInsights: {
        ...state.topicInsights,
        [topicId]: {
          keyPoints: insight.keyPoint 
            ? [...currentInsights.keyPoints, insight.keyPoint]
            : currentInsights.keyPoints,
          userInterests: insight.userInterest
            ? [...currentInsights.userInterests, insight.userInterest]
            : currentInsights.userInterests,
          uncoveredAspects: insight.uncoveredAspect
            ? [...currentInsights.uncoveredAspects, insight.uncoveredAspect]
            : currentInsights.uncoveredAspects,
        },
      },
    };
  }),

  analyzeResponse: async (response, currentTopic) => {
    try {
      const analysis = await fetch('/api/analyze-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response,
          topicId: currentTopic.id,
          currentContext: get().context,
        }),
      }).then(res => res.json());

      set((state) => ({
        context: {
          ...state.context,
          recentKeywords: analysis.keywords,
          currentDepth: analysis.depth,
          contextualQuotes: analysis.relevantQuotes,
        },
      }));

      // Update topic insights
      if (analysis.keyPoints?.length > 0) {
        analysis.keyPoints.forEach((point: string) => {
          get().addTopicInsight(currentTopic.id, { keyPoint: point });
        });
      }
    } catch (error) {
      console.error('Error analyzing response:', error);
    }
  },

  getNextQuestionStrategy: (topic, engagement) => {
    const state = get();
    const topicInsights = state.topicInsights[topic.id];
    const context = state.context;

    // If engagement is low, try to transition or ask clarifying questions
    if (engagement < 0.4) {
      if (context.currentDepth > 2) {
        return {
          type: 'transition',
          suggestion: topic.segue_to_next || "Let's explore a different aspect...",
        };
      }
      return {
        type: 'clarification',
        suggestion: "Could you elaborate on that point?",
      };
    }

    // If there are uncovered aspects, focus on those
    if (topicInsights?.uncoveredAspects.length > 0) {
      return {
        type: 'followup',
        suggestion: `Let's explore ${topicInsights.uncoveredAspects[0]}...`,
      };
    }

    // Default to following up on user interests
    if (topicInsights?.userInterests.length > 0) {
      return {
        type: 'followup',
        suggestion: `You mentioned ${topicInsights.userInterests[0]}. Can you tell me more about that?`,
      };
    }

    return {
      type: 'initial',
      suggestion: topic.questions[0],
    };
  },

  resetContext: () => set({
    context: {
      recentKeywords: [],
      topicHistory: [],
      contextualQuotes: [],
      currentDepth: 0,
      lastQuestionType: null,
    },
    topicInsights: {},
  }),
})); 