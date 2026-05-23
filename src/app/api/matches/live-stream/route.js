import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    await dbConnect();
    
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();
    
    const interval = setInterval(async () => {
      try {
        const liveMatch = await Match.findOne({ 'scorecard.status': 'live' });
        if (liveMatch) {
          writer.write(encoder.encode(`data: ${JSON.stringify(liveMatch)}\n\n`));
        } else {
          writer.write(encoder.encode(`data: null\n\n`));
        }
      } catch (err) {
        console.error('SSE Stream write error:', err);
        clearInterval(interval);
        try {
          writer.close();
        } catch (_) {}
      }
    }, 2000);

    request.signal.addEventListener('abort', () => {
      clearInterval(interval);
      try {
        writer.close();
      } catch (_) {}
    });

    return new Response(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('SSE connection setup error:', error);
    return NextResponse.json(
      { error: 'Failed to establish event stream' },
      { status: 500 }
    );
  }
}
