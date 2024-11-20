import { Topic } from '@/hooks/use-podcast-session';
import { useConversationContext } from '@/hooks/use-conversation-context';
import { shouldTransitionTopic } from '@/lib/engagement';

export class TopicManager {
  private static async fetchTopicSuggestions(
    currentTopic: Topic,
    context: ReturnType<typeof useConversationContext.getState>['context'],
    engagementScore: number
  ) {
    try {
      const response = await fetch('/api/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentTopic,
          context,
          engagementScore,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch topic suggestions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching topic suggestions:', error);
      return null;
    }
  }

  static async evaluateTopicTransition(
    currentTopic: Topic,
    topics: Topic[],
    engagementScore: number,
    discussionLength: number,
    repetitions: number
  ): Promise<{
    shouldTransition: boolean;
    nextTopicId?: string;
    transitionStrategy?: string;
  }> {
    const context = useConversationContext.getState().context;
    
    // Check if we should transition based on engagement metrics
    if (shouldTransitionTopic(engagementScore, discussionLength, repetitions)) {
      const suggestions = await this.fetchTopicSuggestions(currentTopic, context, engagementScore);
      
      if (suggestions) {
        const currentIndex = topics.findIndex(t => t.id === currentTopic.id);
        const nextTopic = topics[currentIndex + 1];

        return {
          shouldTransition: true,
          nextTopicId: nextTopic?.id,
          transitionStrategy: suggestions.transitionStrategy,
        };
      }
    }

    return { shouldTransition: false };
  }

  static getTopicDepth(topic: Topic): number {
    const insights = useConversationContext.getState().topicInsights[topic.id];
    if (!insights) return 0;

    return (
      insights.keyPoints.length +
      insights.userInterests.length
    );
  }

  static async suggestFollowUpQuestion(
    topic: Topic,
    context: ReturnType<typeof useConversationContext.getState>['context']
  ): Promise<string> {
    try {
      const response = await fetch('/api/suggest-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          context,
          depth: this.getTopicDepth(topic),
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch question suggestion');
      const data = await response.json();
      return data.question;
    } catch (error) {
      console.error('Error suggesting follow-up question:', error);
      return topic.questions[0]; // Fallback to predefined questions
    }
  }
} 