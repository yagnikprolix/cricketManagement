import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Match from '@/models/Match';
import { getSessionUser } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const session = await getSessionUser();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const match = await Match.findById(id);
    
    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetch match error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
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
    const { title, date, time, location, totalCost, notes } = await request.json();

    if (!title || !date || !time || !location) {
      return NextResponse.json(
        { error: 'Please provide title, date, time, and location' },
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

    match.title = title;
    match.date = new Date(date);
    match.time = time;
    match.location = location;
    match.totalCost = Number(totalCost) || 0;
    match.notes = notes || '';

    await match.save();

    return NextResponse.json(
      { message: 'Match updated successfully', match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
    const match = await Match.findByIdAndDelete(id);

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Match deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete match error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
