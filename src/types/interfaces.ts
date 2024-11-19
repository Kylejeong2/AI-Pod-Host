export interface TranscriptSegment {
    text: string;
    start: number;
    duration: number;
  };

export interface CaptionItem {
    text: string;
    start: number;
    duration: number;
  }
  
export interface CaptionsProps {
    videoId: string;
    currentTime: number;
    transcript: CaptionItem[];
  }

export interface VideoProps {
  url: string | null;
  transcript: CaptionItem[] | null;
}