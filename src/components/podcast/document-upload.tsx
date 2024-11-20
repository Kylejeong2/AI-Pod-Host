"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useConnection } from "@/hooks/use-connection";
import { usePodcastSession } from "@/hooks/use-podcast-session";

export function DocumentUpload() {
  const [content, setContent] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { connect } = useConnection();
  const { setDocumentNamespace, setTopics } = usePodcastSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const response = await fetch('/api/process-document', {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" 
        },
        body: JSON.stringify({
          content,
          type: "text"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDocumentNamespace(data.namespace);
      
      // Parse and set topics with discussion length initialized
      const topics = data.analysis.topics.map((topic: any) => ({
        ...topic,
        discussionLength: 0,
      }));
      setTopics(topics);
      
      toast({
        title: "Document processed",
        description: "Ready to start the podcast conversation!",
      });

      connect();

    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a Podcast Session</CardTitle>
        <CardDescription>
          Paste your essay, article, or topic to begin the conversation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Paste your content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-32 font-mono"
            required
          />
          <Button 
            type="submit" 
            disabled={isProcessing || !content}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Start Podcast
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 