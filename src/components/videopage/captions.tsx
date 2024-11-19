import { useState, useEffect, useRef } from 'react';
import { CaptionItem, CaptionsProps } from '@/types/interfaces';

export default function Component({ currentTime, transcript }: CaptionsProps) {
  const [captions, setCaptions] = useState<CaptionItem[] | null>(null);
  const captionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCaptions(transcript);
  }, [transcript]);

  useEffect(() => {
    if (captions && captionsRef.current) {
      const currentCaption = captions.find(
        (caption) => currentTime >= caption.start && currentTime < caption.start + caption.duration
      );
      if (currentCaption) {
        const captionElement = captionsRef.current.querySelector(`[data-start="${currentCaption.start}"]`);
        if (captionElement) {
          captionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, captions]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white h-full flex flex-col border-l">
      <div className="flex-grow overflow-y-auto" ref={captionsRef}>
        {captions ? (
          captions.map((caption, index) => (
            <div 
              key={index} 
              className={`flex py-2 px-4 border-b border-gray-100 last:border-b-0 ${
                currentTime >= caption.start && currentTime < caption.start + caption.duration
                  ? 'bg-gray-100'
                  : ''
              }`}
              data-start={caption.start}
            >
              <span className="text-gray-400 w-16 flex-shrink-0">{formatTime(caption.start)}</span>
              <span className="text-gray-800">{caption.text}</span>
            </div>
          ))
        ) : (
          <p className="text-gray-600 italic p-4">Loading captions...</p>
        )}
      </div>
    </div>
  );
}