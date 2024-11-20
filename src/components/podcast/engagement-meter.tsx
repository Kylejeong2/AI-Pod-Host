"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AlertCircle, ArrowDown, ArrowUp, MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

interface EngagementMeterProps {
  score: number;
  recentResponseLength: number;
  topicRepetition: number;
}

export function EngagementMeter({ 
  score, 
  recentResponseLength, 
  topicRepetition 
}: EngagementMeterProps) {
  const getEngagementLevel = () => {
    if (score > 0.7) return { level: 'High', color: 'green', icon: <ArrowUp className="w-4 h-4" /> };
    if (score > 0.4) return { level: 'Medium', color: 'yellow', icon: <MessageCircle className="w-4 h-4" /> };
    return { level: 'Low', color: 'red', icon: <ArrowDown className="w-4 h-4" /> };
  };

  const engagement = getEngagementLevel();

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4 border rounded-lg bg-white/50 backdrop-blur-sm">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Engagement Level</span>
            <Tooltip>
              <TooltipTrigger>
                <span className={cn(
                  "text-sm flex items-center gap-1",
                  engagement.color === 'green' && "text-green-600",
                  engagement.color === 'yellow' && "text-yellow-600",
                  engagement.color === 'red' && "text-red-600"
                )}>
                  {engagement.icon}
                  {engagement.level}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Based on response length and interaction patterns</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Progress 
            value={score * 100} 
            className={cn(
              "h-2",
              score > 0.7 && "bg-green-600",
              score > 0.4 && score <= 0.7 && "bg-yellow-600",
              score <= 0.4 && "bg-red-600"
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Tooltip>
            <TooltipTrigger className="text-left">
              <div>
                <span className="block text-sm text-muted-foreground">Response Length</span>
                <span className="text-sm font-medium">
                  {recentResponseLength > 0 ? `${recentResponseLength} chars` : 'No response yet'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Length of your most recent response</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger className="text-left">
              <div>
                <span className="block text-sm text-muted-foreground">Topic Returns</span>
                <span className="text-sm font-medium">
                  {topicRepetition}x
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Number of times returning to discussed topics</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {score < 0.4 && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-4 h-4" />
            <span>Consider switching topics or asking follow-up questions</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
} 