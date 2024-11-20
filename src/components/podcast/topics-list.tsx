"use client";

import { useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  Clock, 
  MessageSquare, 
  Quote, 
  ArrowRight, 
  Brain,
  Star,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgent } from "@/hooks/use-agent";
import type { Topic } from "@/hooks/use-podcast-session";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface TopicsListProps {
  topics: Topic[];
  currentTopicId: string | null;
  onTopicsUpdate: (topics: Topic[]) => void;
  topicInsights: Record<string, {
    keyPoints: string[];
    userInterests: string[];
    uncoveredAspects: string[];
  }>;
  currentDepth: number;
}

export function TopicsList({ 
  topics, 
  currentTopicId, 
  onTopicsUpdate,
  topicInsights,
  currentDepth
}: TopicsListProps) {
  const { displayTranscriptions } = useAgent();

  useEffect(() => {
    if (displayTranscriptions.length > 0) {
      const lastTranscription = displayTranscriptions[displayTranscriptions.length - 1];
      
      onTopicsUpdate(topics.map(topic => {
        if (topic.id === currentTopicId) {
          return {
            ...topic,
            discussionLength: topic.discussionLength + 1,
          };
        }
        return topic;
      }));
    }
  }, [displayTranscriptions, currentTopicId]);

  const completedTopics = topics.filter(t => t.status === 'completed').length;
  const progress = (completedTopics / topics.length) * 100;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Discussion Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <ScrollArea className="h-[calc(100vh-20rem)]">
        <div className="space-y-4 pr-4">
          {topics.map((topic, index) => {
            const insights = topicInsights[topic.id] || {
              keyPoints: [],
              userInterests: [],
              uncoveredAspects: []
            };
            
            return (
              <Collapsible key={topic.id}>
                <div
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    topic.status === 'completed' && "bg-neutral-50",
                    topic.status === 'active' && "bg-blue-50 border-blue-200",
                    topic.id === currentTopicId && "ring-2 ring-blue-500"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{topic.title}</h3>
                    <div className="flex items-center gap-2">
                      {topic.id === currentTopicId && (
                        <Badge variant="outline" className="bg-white">
                          <Brain className="w-3 h-3 mr-1" />
                          Depth {currentDepth}
                        </Badge>
                      )}
                      <Badge variant={topic.status === 'completed' ? "secondary" : "default"}>
                        {topic.status === 'completed' ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : topic.status === 'active' ? (
                          <Clock className="w-3 h-3 mr-1" />
                        ) : null}
                        {topic.status}
                      </Badge>
                    </div>
                  </div>

                  <CollapsibleTrigger className="w-full">
                    <div className="space-y-2">
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {topic.questions.slice(0, 1).map((question, idx) => (
                          <p key={idx} className="flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" />
                            {question}
                          </p>
                        ))}
                      </div>
                      
                      {topic.discussionLength > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {topic.discussionLength} exchanges
                        </div>
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="mt-2 space-y-2">
                    {/* Key Points */}
                    {insights.keyPoints.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Key Points Discussed</h4>
                        {insights.keyPoints.map((point, idx) => (
                          <p key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Check className="w-3 h-3 text-green-600" />
                            {point}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* User Interests */}
                    {insights.userInterests.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Areas of Interest</h4>
                        {insights.userInterests.map((interest, idx) => (
                          <p key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="w-3 h-3 text-yellow-600" />
                            {interest}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Uncovered Aspects */}
                    {insights.uncoveredAspects.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">Yet to Explore</h4>
                        {insights.uncoveredAspects.map((aspect, idx) => (
                          <p key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <AlertCircle className="w-3 h-3 text-blue-600" />
                            {aspect}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Additional questions */}
                    {topic.questions.slice(1).map((question, idx) => (
                      <p key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {question}
                      </p>
                    ))}
                    
                    {/* Excerpts */}
                    {topic.excerpts.map((excerpt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-muted-foreground bg-neutral-50 p-2 rounded">
                        <Quote className="w-3 h-3 mt-1 flex-shrink-0" />
                        <p>{excerpt}</p>
                      </div>
                    ))}
                    
                    {/* Segue to next topic */}
                    {index < topics.length - 1 && topic.segue_to_next && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
                        <ArrowRight className="w-3 h-3" />
                        {topic.segue_to_next}
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 