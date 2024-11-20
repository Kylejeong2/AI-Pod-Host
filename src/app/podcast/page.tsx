import { PodcastSession } from "@/components/podcast/podcast-session";
import { ConnectionProvider } from "@/hooks/use-connection";
import { TranscriptProvider } from "@/hooks/TranscriptContext";

export default function PodcastPage() {
  return (
    <TranscriptProvider>
      <ConnectionProvider>
        <PodcastSession />
      </ConnectionProvider>
    </TranscriptProvider>
  );
} 