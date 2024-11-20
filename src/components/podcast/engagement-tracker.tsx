"use client";

import { useEffect } from 'react';
import { useAgent } from '@/hooks/use-agent';
import { usePodcastSession } from '@/hooks/use-podcast-session';
import { useTranscriptStore } from '@/hooks/use-transcript-store';

export function EngagementTracker() {
  const { displayTranscriptions } = useAgent();
  const { 
    addResponse, 
    currentTopicId, 
    engagementMetrics,
    updateEngagementScore 
  } = usePodcastSession();
  const { addEntry } = useTranscriptStore();

  useEffect(() => {
    if (displayTranscriptions.length > 0) {
      const lastTranscription = displayTranscriptions[displayTranscriptions.length - 1];
      
      // Save to transcript store
      addEntry(
        lastTranscription.segment.text,
        !!lastTranscription.participant?.isAgent
      );

      // Only track user responses
      if (!lastTranscription.participant?.isAgent) {
        const text = lastTranscription.segment.text;
        addResponse(text, currentTopicId || 'unknown');
        
        // Calculate engagement score
        const calculateScore = async () => {
          try {
            const response = await fetch('/api/analyze-engagement', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                responses: engagementMetrics.lastResponses,
                currentTopic: currentTopicId,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              updateEngagementScore(data.score);
              
              // You could also store additional metrics if needed
              // updateEngagementMetrics(data.metrics);
            }
          } catch (error) {
            console.error('Error analyzing engagement:', error);
          }
        };

        calculateScore();
      }
    }
  }, [displayTranscriptions]);

  return null; // This is a utility component, no UI needed
} 