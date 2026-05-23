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
    const { userId, paymentStatus } = await request.json();

    if (!userId || !paymentStatus || !['pending', 'completed'].includes(paymentStatus)) {
      return NextResponse.json(
        { error: 'Please provide a valid userId and paymentStatus (pending or completed)' },
        { status: 400 }
      );
    }

    const match = await Match.findById(id);
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    const rsvp = match.rsvps.find((r) => r.userId.toString() === userId);
    if (!rsvp) {
      return NextResponse.json(
        { error: 'RSVP not found for this user in this match' },
        { status: 404 }
      );
    }

    rsvp.paymentStatus = paymentStatus;
    rsvp.updatedAt = new Date();

    await match.save();

    await broadcastMatchUpdate(match);

    return NextResponse.json(
      { message: 'Payment status updated successfully', match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
