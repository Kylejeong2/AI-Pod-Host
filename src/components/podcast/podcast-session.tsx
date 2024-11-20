"use client";

import { useEffect, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import { AgentProvider } from "@/hooks/use-agent";
import { PodcastTranscript } from "./podcast-transcript";
import { PodcastControls } from "./podcast-controls";
import { TopicsList } from "./topics-list";
import { EngagementMeter } from "./engagement-meter";
import { DocumentUpload } from "./document-upload";
import { useConnection } from "@/hooks/use-connection";
import { Topic, usePodcastSession } from "@/hooks/use-podcast-session";
import { useConversationContext } from "@/hooks/use-conversation-context";
import { TopicManager } from "@/services/topic-manager";
import { Separator } from "@/components/ui/separator";
import { EngagementTracker } from "./engagement-tracker";

export function PodcastSession() {
  const { shouldConnect, wsUrl, token } = useConnection();
  const { 
    topics, 
    currentTopicId, 
    engagementMetrics, 
    setTopics, 
    setCurrentTopic,
    updateTopicStatus 
  } = usePodcastSession();
  const { 
    context, 
    topicInsights,
    updateContext,
    getNextQuestionStrategy 
  } = useConversationContext();
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const scrollButtonRef = useRef<HTMLButtonElement>(null);

  // Intelligent topic management
  useEffect(() => {
    const manageTopicTransition = async () => {
      if (!currentTopicId || topics.length === 0) return;

      const currentTopic = topics.find(t => t.id === currentTopicId);
      if (!currentTopic) return;

      // Get current topic metrics
      const discussionLength = currentTopic.discussionLength;
      const repetitions = engagementMetrics.topicRepetitions[currentTopicId] || 0;

      // Evaluate if we should transition
      const evaluation = await TopicManager.evaluateTopicTransition(
        currentTopic,
        topics,
        engagementMetrics.score,
        discussionLength,
        repetitions
      );

      if (evaluation.shouldTransition && evaluation.nextTopicId) {
        // Update current topic status in both local state and backend
        try {
          await fetch('/api/update-topic-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicId: currentTopicId,
              status: 'completed',
            }),
          });

          updateTopicStatus(currentTopicId, 'completed');
          setCurrentTopic(evaluation.nextTopicId);
          
          updateContext({
            topicHistory: [...context.topicHistory, currentTopicId],
            lastQuestionType: 'transition'
          });
        } catch (error) {
          console.error('Error updating topic status:', error);
        }
      } else {
        const strategy = getNextQuestionStrategy(currentTopic, engagementMetrics.score);
        updateContext({ lastQuestionType: strategy.type });
      }
    };

    manageTopicTransition();
  }, [engagementMetrics.score, currentTopicId, topics]);

  // Track topic depth and insights
  useEffect(() => {
    if (!currentTopicId) return;
    
    const currentTopic = topics.find(t => t.id === currentTopicId);
    if (!currentTopic) return;

    const depth = TopicManager.getTopicDepth(currentTopic);
    updateContext({ currentDepth: depth });

    // Suggest follow-up question if needed
    if (context.lastQuestionType === 'followup') {
      TopicManager.suggestFollowUpQuestion(currentTopic, context)
        .then(question => {
          // You can use this question in your agent's response logic
          console.log('Suggested follow-up:', question);
        });
    }
  }, [currentTopicId, context.lastQuestionType]);

  const handleTopicsUpdate = (newTopics: Topic[]) => {
    setTopics(newTopics);
  };

  return (
    <div className="flex flex-col h-screen max-w-7xl mx-auto p-4 gap-4">
      {!shouldConnect ? (
        <DocumentUpload />
      ) : (
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={shouldConnect}
          audio={true}
          className="flex flex-grow overflow-hidden border rounded-xl bg-white"
        >
          <AgentProvider>
            <div className="flex flex-col w-full">
              <div className="flex-grow overflow-hidden flex">
                {/* Main content area */}
                <div className="w-2/3 p-4 border-r">
                  <div className="h-full flex flex-col">
                    <div className="flex-grow overflow-y-auto">
                      <PodcastTranscript />
                    </div>
                  </div>
                </div>
                
                {/* Sidebar */}
                <div className="w-1/3 p-4 flex flex-col">
                  <h2 className="text-lg font-semibold mb-4">Discussion Progress</h2>
                  <EngagementMeter 
                    score={engagementMetrics.score}
                    recentResponseLength={engagementMetrics.responseLengths[engagementMetrics.responseLengths.length - 1] || 0}
                    topicRepetition={Object.values(engagementMetrics.topicRepetitions).reduce((a, b) => a + b, 0)}
                  />
                  <Separator className="my-4" />
                  <TopicsList 
                    topics={topics} 
                    currentTopicId={currentTopicId} 
                    onTopicsUpdate={handleTopicsUpdate}
                    topicInsights={topicInsights}
                    currentDepth={context.currentDepth}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="h-32 border-t p-4">
                <RoomAudioRenderer />
                <StartAudio label="Click to enable audio" />
                <PodcastControls />
              </div>
            </div>
            <EngagementTracker />
          </AgentProvider>
        </LiveKitRoom>
      )}
    </div>
  );
} 