import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    // Fetch all matches, sorted by date ascending (upcoming matches first)
    const matches = await Match.find({}).sort({ date: 1 });
    return NextResponse.json({ matches }, { status: 200 });
  } catch (error) {
    console.error('Fetch matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const session = await getSessionUser();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { title, date, time, location, totalCost, notes } = await request.json();

    if (!title || !date || !time || !location) {
      return NextResponse.json(
        { error: 'Please provide title, date, time, and location' },
        { status: 400 }
      );
    }

    const match = await Match.create({
      title,
      date: new Date(date),
      time,
      location,
      totalCost: Number(totalCost) || 0,
      notes: notes || '',
      rsvps: [],
    });

    return NextResponse.json(
      { message: 'Match created successfully', match },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
