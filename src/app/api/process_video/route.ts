import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const { videoId } = await request.json();

    if (!videoId) {
        return NextResponse.json({ error: 'Invalid videoId' }, { status: 400 });
    }

    try {
        const response = await fetch(`${process.env.SERVER_BASE_URL}/process_video`, {
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
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        console.error('Error processing video:', error);
        return NextResponse.json({ error: 'Failed to process video' }, { status: 500 });
    }
}
