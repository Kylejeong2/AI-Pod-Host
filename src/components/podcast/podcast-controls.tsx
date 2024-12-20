"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Settings } from "lucide-react";
import { useAgent } from "@/hooks/use-agent";
import { usePodcastSession } from "@/hooks/use-podcast-session";
import { useConversationContext } from "@/hooks/use-conversation-context";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";

export function PodcastControls() {
  const router = useRouter();
  const [isMuted, setIsMuted] = useState(false);
  const [autoProgress, setAutoProgress] = useState(true);
  const { resetSession } = usePodcastSession();
  const { resetContext } = useConversationContext();

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // Add your mute logic here
  };

  const handleAutoProgressToggle = (checked: boolean) => {
    setAutoProgress(checked);
  };

  const handleReset = () => {
    router.push('/summary');
  };

  const handleStartNew = () => {
    resetSession();
    resetContext();
    router.push('/');
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleMuteToggle}
          className={isMuted ? "bg-red-50 text-red-600" : ""}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Podcast Settings</SheetTitle>
              <SheetDescription>
                Configure your podcast session preferences
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-progress">Auto Progress Topics</Label>
                <Switch
                  id="auto-progress"
                  checked={autoProgress}
                  onCheckedChange={handleAutoProgressToggle}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleStartNew}
        >
          Start New
        </Button>
        <Button
          variant="destructive"
          onClick={handleReset}
        >
          End & View Summary
        </Button>
      </div>
    </div>
  );
} 