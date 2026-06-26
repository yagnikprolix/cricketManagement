import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import { getSessionUser } from '@/lib/auth';
import { broadcastMatchUpdate } from '@/lib/pusher';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const session = await getSessionUser();

    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    if (!match.scorecard) {
      return NextResponse.json(
        { error: 'Scorecard not initialized' },
        { status: 400 }
      );
    }

    const isActive = typeof body.active === 'boolean' ? body.active : !match.scorecard.liveVideoActive;
    match.scorecard.liveVideoActive = isActive;

    await match.save();
    await broadcastMatchUpdate(match);

    return NextResponse.json(
      { message: `Live video ${isActive ? 'started' : 'stopped'}`, match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Live video toggle error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
