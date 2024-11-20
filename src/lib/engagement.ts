export function getEngagementIndicator(text: string) {
  const length = text.length;
  const words = text.split(/\s+/).length;
  const avgWordLength = length / words;
  
  // More lenient engagement metrics
  if (length > 100 && avgWordLength > 3) {
    return {
      type: 'high',
      message: 'Detailed and engaged response'
    };
  }
  
  if (length > 50 || (length > 30 && avgWordLength > 3.5)) {
    return {
      type: 'medium',
      message: 'Good engagement'
    };
  }
  
  return {
    type: 'low',
    message: 'Consider expanding your response'
  };
}

export function calculateTopicProgress(discussionLength: number): number {
  // More gradual progress calculation
  let progress = Math.min(100, (discussionLength / 7) * 100);
  return Math.round(progress);
}

export function shouldTransitionTopic(
  currentEngagement: number,
  discussionLength: number,
  repetitions: number
): boolean {
  // More lenient transition conditions
  return (
    (currentEngagement < 0.3 && discussionLength > 5) || // Only transition if both engagement is low AND we've discussed for a while
    discussionLength > 15 || // Allow longer discussions
    repetitions > 4 // Allow more repetitions
  );
} 