import { RefObject, useEffect, useRef } from "react";
import { useAgent } from "@/hooks/use-agent";
import { cn } from "@/lib/utils";
import { MessageCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";

interface EngagementIndicator {
  type: 'high' | 'medium' | 'low';
  message: string;
}

export function PodcastTranscript() {
  const { displayTranscriptions } = useAgent();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const getEngagementIndicator = (text: string): EngagementIndicator | null => {
    const length = text.trim().length;
    if (length > 200) return { type: 'high', message: 'Highly engaged response' };
    if (length > 100) return { type: 'medium', message: 'Moderate engagement' };
    if (length < 50) return { type: 'low', message: 'Brief response - consider elaborating' };
    return null;
  };

  return (
    <TooltipProvider>
      <div className="bg-slate-100 h-full rounded-xl overflow-hidden">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest sticky top-0 left-0 w-full p-4 bg-white border-b">
          <span>Podcast Transcript</span>
          <div className="flex items-center gap-2 text-xs normal-case font-normal">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              High Engagement
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Low
            </span>
          </div>
        </div>
        
        <div className="p-4 min-h-[300px] relative">
          {displayTranscriptions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-600 text-sm">
              Upload a document to start the podcast conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {displayTranscriptions.map(({ segment, participant }) => {
                const engagement = !participant?.isAgent ? getEngagementIndicator(segment.text) : null;
                
                return segment.text.trim() !== "" && (
                  <div
                    key={segment.id}
                    className={cn(
                      "flex w-max max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                      participant?.isAgent
                        ? "bg-neutral-100 text-[#09090B]"
                        : "ml-auto bg-blue-500 text-white"
                    )}
                  >
                    <div className="flex items-center gap-2 text-xs opacity-70">
                      <span>{participant?.isAgent ? "AI Co-host" : "You"}</span>
                      {engagement && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "ml-2",
                                engagement.type === 'high' && "bg-green-100 text-green-800",
                                engagement.type === 'medium' && "bg-yellow-100 text-yellow-800",
                                engagement.type === 'low' && "bg-red-100 text-red-800"
                              )}
                            >
                              {engagement.type === 'high' && <MessageCircle className="w-3 h-3 mr-1" />}
                              {engagement.type === 'low' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {engagement.type}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{engagement.message}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    {segment.text.trim()}
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
} 