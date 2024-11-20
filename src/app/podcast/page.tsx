import { PodcastSession } from "@/components/podcast/podcast-session";
import { ConnectionProvider } from "@/hooks/use-connection";

export default function PodcastPage() {
  return (
    <ConnectionProvider>
      <PodcastSession />
    </ConnectionProvider>
  );
} 