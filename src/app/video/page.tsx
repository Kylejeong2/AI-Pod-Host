'use client';

import React, { useState, useEffect } from 'react';
import Video from '@/components/videopage/video';
import { RoomComponent } from '@/components/videopage/room-component';
import { VideoProvider } from '@/hooks/VideoContext';
import { useSearchParams } from 'next/navigation';
import { useTranscript } from '@/hooks/TranscriptContext';
import { CaptionItem } from '@/types/interfaces';

const VideoPage = () => {
    const [loading, setLoading] = useState(true);
    const [transcript, setTranscript] = useState([]);
    const searchParams = useSearchParams();
    const url = searchParams.get('url');
    const videoId = url ? extractVideoId(url) : null;
    const { setSummary } = useTranscript();

    useEffect(() => {
        const processVideo = async () => {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/process_video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ videoId }),
                });

                if (!response.ok) {
                    throw new Error('Failed to process video');
                }

                const data = await response.json();
                if (data.status === 'success') {
                    setTranscript(data.transcript);
                    setSummary(data.summary);
                    setLoading(false);
                } else {
                    throw new Error('Processing failed');
                }
            } catch (error) {
                console.error('Error processing video:', error);
                setLoading(false);
            }
        };

        if (videoId) {
            processVideo();
        }
    }, [videoId, setSummary]);

    return (
        <VideoProvider>
            <div className="min-h-screen bg-gradient-to-br max-h-screen from-orange-50 via-red-50 to-orange-100">
                {loading ? (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                        <div className="text-white text-2xl mb-4 text-center">
                            <p>Processing your video</p>
                            <p className="mt-2">This will take about 2-3 minutes</p>
                        </div>
                        <div className="w-24 h-24 border-8 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
                        <div className="text-white text-lg mt-8">
                            Please wait...
                        </div>
                    </div>
                ) : (
                    <div className="max-w-full mx-auto flex">
                        <div className="w-1/2 max-h-screen p-2">
                            <Video url={url} transcript={transcript as CaptionItem[]} />
                        </div>
                        <div className='w-1/2 max-h-screen p-2'>
                            <RoomComponent />
                        </div>
                    </div>
                )}
            </div>
        </VideoProvider>
    );
};

export default VideoPage;

function extractVideoId(url: string) {
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/);
  return match ? match[1] : null;
}
