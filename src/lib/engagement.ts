export function getEngagementIndicator(text: string) {
  const length = text.length;
  const words = text.split(/\s+/).length;
  const avgWordLength = length / words;
  
  // Basic engagement metrics
  if (length > 200 && avgWordLength > 4) {
    return {
      type: 'high',
      message: 'Detailed and engaged response'
    };
  }
  
  if (length > 100 || (length > 50 && avgWordLength > 5)) {
    return {
      type: 'medium',
      message: 'Moderate engagement'
    };
  }
  
  return {
    type: 'low',
    message: 'Brief or limited response'
  };
}

export function calculateTopicProgress(discussionLength: number): number {
  // Base progress calculation
  let progress = Math.min(100, (discussionLength / 5) * 100);
  
  // Additional factors could be added here
  return Math.round(progress);
}

export function shouldTransitionTopic(
  currentEngagement: number,
  discussionLength: number,
  repetitions: number
): boolean {
  return (
    currentEngagement < 0.4 ||
    discussionLength > 10 ||
    repetitions > 3
  );
} 