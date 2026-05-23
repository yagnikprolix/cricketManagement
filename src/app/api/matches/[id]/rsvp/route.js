import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import { getSessionUser } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await dbConnect();
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login first.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['yes', 'no'].includes(status)) {
      return NextResponse.json(
        { error: 'Please provide a valid RSVP status (yes or no)' },
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

    // Check if user has already RSVP'd
    const existingRsvpIndex = match.rsvps.findIndex(
      (rsvp) => rsvp.userId.toString() === session.id
    );

    if (existingRsvpIndex > -1) {
      // Update existing RSVP status
      match.rsvps[existingRsvpIndex].status = status;
      match.rsvps[existingRsvpIndex].updatedAt = new Date();
    } else {
      // Add new RSVP
      match.rsvps.push({
        userId: session.id,
        name: session.name,
        email: session.email,
        status: status,
        paymentStatus: 'pending',
        updatedAt: new Date(),
      });
    }

    await match.save();

    if (global.broadcastMatchUpdate) {
      global.broadcastMatchUpdate(match);
    }

    return NextResponse.json(
      { message: 'RSVP submitted successfully', match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Submit RSVP error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
