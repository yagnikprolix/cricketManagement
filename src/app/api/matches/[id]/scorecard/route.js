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
      match.scorecard = {
        status: 'scheduled',
        battingTeam: 'Team A',
        bowlingTeam: 'Team B',
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        target: 0,
        activeStriker: null,
        activeNonStriker: null,
        activeBowler: null,
        batsmenStats: [],
        bowlersStats: [],
        commentary: [],
        tossWinner: '',
        tossDecision: '',
        teamACaptain: '',
        teamBCaptain: '',
        teamAPlayers: [],
        teamBPlayers: [],
        previousBowlerId: '',
      };
    }

    if (body.reset) {
      match.scorecard = {
        status: 'scheduled',
        battingTeam: 'Team A',
        bowlingTeam: 'Team B',
        runs: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        target: 0,
        activeStriker: null,
        activeNonStriker: null,
        activeBowler: null,
        batsmenStats: [],
        bowlersStats: [],
        commentary: [],
        tossWinner: '',
        tossDecision: '',
        teamACaptain: '',
        teamBCaptain: '',
        teamAPlayers: [],
        teamBPlayers: [],
        previousBowlerId: '',
      };
      await match.save();
      await broadcastMatchUpdate(match);
      return NextResponse.json({ message: 'Scorecard reset successfully', match }, { status: 200 });
    }

    if (body.status) match.scorecard.status = body.status;
    if (body.battingTeam) match.scorecard.battingTeam = body.battingTeam;
    if (body.bowlingTeam) match.scorecard.bowlingTeam = body.bowlingTeam;
    if (typeof body.target === 'number') match.scorecard.target = body.target;

    if (body.tossWinner !== undefined) match.scorecard.tossWinner = body.tossWinner;
    if (body.tossDecision !== undefined) match.scorecard.tossDecision = body.tossDecision;
    if (body.teamACaptain !== undefined) match.scorecard.teamACaptain = body.teamACaptain;
    if (body.teamBCaptain !== undefined) match.scorecard.teamBCaptain = body.teamBCaptain;
    if (body.teamAPlayers !== undefined) match.scorecard.teamAPlayers = body.teamAPlayers;
    if (body.teamBPlayers !== undefined) match.scorecard.teamBPlayers = body.teamBPlayers;
    if (body.previousBowlerId !== undefined) match.scorecard.previousBowlerId = body.previousBowlerId;

    if (typeof body.runs === 'number') match.scorecard.runs = body.runs;
    if (typeof body.wickets === 'number') match.scorecard.wickets = body.wickets;
    if (typeof body.overs === 'number') match.scorecard.overs = body.overs;
    if (typeof body.balls === 'number') match.scorecard.balls = body.balls;

    if (body.activeStriker !== undefined) {
      match.scorecard.activeStriker = body.activeStriker;
    }
    if (body.activeNonStriker !== undefined) {
      match.scorecard.activeNonStriker = body.activeNonStriker;
    }
    if (body.activeBowler !== undefined) {
      match.scorecard.activeBowler = body.activeBowler;
    }

    if (body.batsmenStats) {
      match.scorecard.batsmenStats = body.batsmenStats;
    }
    if (body.bowlersStats) {
      match.scorecard.bowlersStats = body.bowlersStats;
    }

    if (body.newCommentary) {
      match.scorecard.commentary.unshift({
        ball: body.newCommentary.ball || `${match.scorecard.overs}.${match.scorecard.balls}`,
        runs: body.newCommentary.runs || 0,
        description: body.newCommentary.description,
        timestamp: new Date(),
      });
      if (match.scorecard.commentary.length > 50) {
        match.scorecard.commentary = match.scorecard.commentary.slice(0, 50);
      }
    }

    await match.save();

    await broadcastMatchUpdate(match);

    return NextResponse.json(
      { message: 'Scorecard successfully updated', match },
      { status: 200 }
    );
  } catch (error) {
    console.error('Detailed scorecard update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
