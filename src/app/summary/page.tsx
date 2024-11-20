"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, Star, Timer } from "lucide-react";
import { useTranscriptStore } from '@/hooks/use-transcript-store';

interface SummaryData {
  mainPoints: string[];
  keyTakeaways: string[];
  topicsCovered: Array<{
    title: string;
    duration: number;
    engagement: number;
  }>;
  overallEngagement: number;
  duration: number;
}

export default function SummaryPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const { getFullTranscript } = useTranscriptStore();

  useEffect(() => {
    const generateSummary = async () => {
      try {
        const response = await fetch('/api/generate-summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: getFullTranscript()
          }),
        });
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error('Error generating summary:', error);
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, []);

  const handleStartNew = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Podcast Summary</h1>
        <Button onClick={handleStartNew}>Start New Podcast</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Key Takeaways
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary?.keyTakeaways.map((point, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Star className="w-4 h-4 mt-1 text-yellow-500" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Topics Covered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-4">
              {summary?.topicsCovered.map((topic, index) => (
                <div key={index} className="mb-4 p-3 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{topic.title}</h3>
                    <Badge variant={topic.engagement > 0.7 ? "default" : "secondary"}>
                      {topic.engagement > 0.7 ? "High" : "Moderate"} Engagement
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    {Math.round(topic.duration / 60)} minutes
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 