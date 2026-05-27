"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { ArrowLeft } from 'lucide-react';

// Dynamic Commentary Generator Helper
const generateCommentarySentence = ({ strikerName, nonStrikerName, bowlerName, runs, type, extraType, dismissalType, dismissedName, fielderName }) => {
  const sName = strikerName || 'The striker';
  const nsName = nonStrikerName || 'the non-striker';
  const bName = bowlerName || 'the bowler';

  const dotTemplates = [
    `${bName} to ${sName}, no run. Solid defensive play.`,
    `${bName} bowls a dot ball. ${sName} plays it back carefully.`,
    `Good length delivery from ${bName}. ${sName} blocks it on the front foot.`,
    `${sName} swings and misses! Clean take by the keeper off ${bName}.`,
    `Tucked towards mid-on. No run taken by ${sName}.`
  ];

  const singleTemplates = [
    `${sName} works it into the gap off ${bName} and runs a quick single. Strike rotates!`,
    `Pushed to deep mid-wicket by ${sName} for 1 run. ${nsName} is now ready at the striker's end.`,
    `A gentle tap from ${sName} towards cover, and they hustle for a single.`,
    `Single taken! ${sName} opens the face of the bat, playing it to third man off ${bName}.`
  ];

  const doubleTemplates = [
    `Nice placement! ${sName} plays it through mid-wicket off ${bName} and runs hard for two.`,
    `Two runs! ${sName} lofts it over the infield, and they return comfortably for the second.`,
    `Driven towards deep sweep cover. Excellent running between the wickets by ${sName} and ${nsName} for a couple.`
  ];

  const threeTemplates = [
    `Good shot! ${sName} drives it past cover. They run hard and complete three runs! Strike rotates.`,
    `Cut away past point by ${sName}. They scramble for three runs off ${bName}'s delivery.`
  ];

  const fourTemplates = [
    `FOUR! Gorgeous cover drive by ${sName}! Off the meat of the bat off ${bName}.`,
    `FOUR RUNS! ${sName} pulls it in style through square leg for a boundary!`,
    `Shot! ${sName} picks up the length early and smashes it past mid-off for four!`,
    `Edged and past the slips! It races away to the third man boundary. Four runs!`
  ];

  const sixTemplates = [
    `SIX! Monumental strike! ${sName} launches ${bName} high into the grandstands!`,
    `BOOM! That is out of the ground! A colossal six from ${sName}!`,
    `MAXIMUM! ${sName} connects perfectly, sending it soaring over deep mid-wicket for a massive six!`
  ];

  const wideTemplates = [
    `Wide ball! ${bName} strayed down leg side. Extra run to the batting team.`,
    `Wide called! Upwards of the off-stump from ${bName}, keeper collects.`,
  ];

  const noBallTemplates = [
    `No ball called! ${bName} overstepped the crease. Free hit!`,
    `No ball! High full toss from ${bName}. Extra run added.`,
  ];

  const wicketTemplates = [
    `OUT! Breakthrough for the bowling side! ${dismissedName} has been dismissed!`,
    `WICKET! ${dismissedName} walks back to the pavilion. ${dismissalType} off the bowling of ${bName}!`,
    `CAUGHT! ${dismissedName} tries to go big but finds the fielder ${fielderName || ''}. ${dismissalType}! Big moment in the match.`
  ];

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (type === 'wicket') {
    return getRandom(wicketTemplates);
  }

  if (extraType === 'Wide') {
    return getRandom(wideTemplates);
  }

  if (extraType === 'No Ball') {
    return getRandom(noBallTemplates);
  }

  if (runs === 0) return getRandom(dotTemplates);
  if (runs === 1) return getRandom(singleTemplates);
  if (runs === 2) return getRandom(doubleTemplates);
  if (runs === 3) return getRandom(threeTemplates);
  if (runs === 4) return getRandom(fourTemplates);
  if (runs === 6) return getRandom(sixTemplates);

  return `${runs} run(s) scored by ${sName} off ${bName}.`;
};

function ScoreConsoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId');

  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Scoring parameters
  const [battingTeam, setBattingTeam] = useState('Team A');
  const [bowlingTeam, setBowlingTeam] = useState('Team B');
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [target, setTarget] = useState(0);
  const [scoreStatus, setScoreStatus] = useState('scheduled');
  const [commentaryText, setCommentaryText] = useState('');

  // Active striker/bowler selectors
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  const [activeStriker, setActiveStriker] = useState(null);
  const [activeNonStriker, setActiveNonStriker] = useState(null);
  const [activeBowler, setActiveBowler] = useState(null);

  const [batsmenStats, setBatsmenStats] = useState([]);
  const [bowlersStats, setBowlersStats] = useState([]);

  // Wicket Out overlays
  const [showWicketForm, setShowWicketForm] = useState(false);
  const [dismissedType, setDismissedType] = useState('Caught');
  const [whoIsOut, setWhoIsOut] = useState('striker'); // striker, nonStriker
  const [fielderId, setFielderId] = useState('');

  // Feedbacks
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const fetchScorerData = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      if (authData.user.role !== 'admin') {
        router.push('/');
        return;
      }

      setUser(authData.user);

      const matchesRes = await fetch('/api/matches');
      const matchesData = await matchesRes.json();
      const loadedMatches = matchesData.matches || [];
      setMatches(loadedMatches);

      if (matchId) {
        const selected = loadedMatches.find(m => m._id === matchId);
        if (selected && selected.scorecard) {
          syncScorecardStates(selected);
        }
      }
    } catch (error) {
      console.error('Error fetching scoring cockpit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncScorecardStates = (match) => {
    const sc = match.scorecard;
    setBattingTeam(sc.battingTeam || 'Team A');
    setBowlingTeam(sc.bowlingTeam || 'Team B');
    setRuns(sc.runs || 0);
    setWickets(sc.wickets || 0);
    setOvers(sc.overs || 0);
    setBalls(sc.balls || 0);
    setTarget(sc.target || 0);
    setScoreStatus(sc.status || 'scheduled');

    setActiveStriker(sc.activeStriker || null);
    setActiveNonStriker(sc.activeNonStriker || null);
    setActiveBowler(sc.activeBowler || null);

    setStrikerId(sc.activeStriker?.userId || '');
    setNonStrikerId(sc.activeNonStriker?.userId || '');
    setBowlerId(sc.activeBowler?.userId || '');

    setBatsmenStats(sc.batsmenStats || []);
    setBowlersStats(sc.bowlersStats || []);
  };

  useEffect(() => {
    fetchScorerData();
  }, [router, matchId]);

  const selectedMatch = matches.find(m => m._id === matchId);
  const yesAttendees = selectedMatch?.rsvps?.filter(r => r.status === 'yes') || [];

  const syncScorecard = async (updatePayload) => {
    try {
      const res = await fetch(`/api/matches/${matchId}/scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // update locally inside match array
      setMatches(prev => prev.map(m => m._id === matchId ? data.match : m));
      showToast('Scorecard Synced with Database & WebSockets!');
    } catch (err) {
      showToast(err.message || 'Database connection error', 'error');
    }
  };

  const handleActivePlayerSelect = (role, userId) => {
    if (!matchId) return;
    const player = yesAttendees.find(r => r.userId === userId);

    if (role === 'striker') {
      setStrikerId(userId);
      const strikerObj = userId ? {
        userId,
        name: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
      } : null;
      setActiveStriker(strikerObj);
      syncScorecard({ activeStriker: strikerObj });
    } else if (role === 'nonStriker') {
      setNonStrikerId(userId);
      const nonStrikerObj = userId ? {
        userId,
        name: player.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
      } : null;
      setActiveNonStriker(nonStrikerObj);
      syncScorecard({ activeNonStriker: nonStrikerObj });
    } else if (role === 'bowler') {
      setBowlerId(userId);
      const bowlerObj = userId ? {
        userId,
        name: player.name,
        runsConceded: 0,
        overs: 0,
        balls: 0,
        wickets: 0,
      } : null;
      setActiveBowler(bowlerObj);
      syncScorecard({ activeBowler: bowlerObj });
    }
    showToast(`Active ${role} changed successfully!`);
  };

  const handleScoreChange = (type, value) => {
    let nextRuns = Number(runs) || 0;
    let nextBalls = Number(balls) || 0;
    let nextOvers = Number(overs) || 0;
    let nextStriker = activeStriker ? { ...activeStriker } : null;
    let nextNonStriker = activeNonStriker ? { ...activeNonStriker } : null;
    let nextBowler = activeBowler ? { ...activeBowler } : null;
    let commentaryDesc = '';

    if (type === 'runs') {
      const runVal = Number(value) || 0;
      nextRuns += runVal;
      nextBalls += 1;

      // Update active striker info
      if (nextStriker) {
        nextStriker.runs = (Number(nextStriker.runs) || 0) + runVal;
        nextStriker.balls = (Number(nextStriker.balls) || 0) + 1;
        if (runVal === 4) nextStriker.fours = (Number(nextStriker.fours) || 0) + 1;
        if (runVal === 6) nextStriker.sixes = (Number(nextStriker.sixes) || 0) + 1;
      }

      // Update active bowler info
      if (nextBowler) {
        nextBowler.runsConceded = (Number(nextBowler.runsConceded) || 0) + runVal;
        nextBowler.balls = (Number(nextBowler.balls) || 0) + 1;
        if (nextBowler.balls >= 6) {
          nextBowler.overs = (Number(nextBowler.overs) || 0) + 1;
          nextBowler.balls = 0;
        }
      }

      // Generate dynamically templates
      commentaryDesc = generateCommentarySentence({
        strikerName: nextStriker?.name,
        nonStrikerName: nextNonStriker?.name,
        bowlerName: nextBowler?.name,
        runs: runVal,
        type: 'runs'
      });

      // Striker strike rotation swap on 1 or 3 runs
      if (nextStriker && nextNonStriker && (runVal === 1 || runVal === 3 || runVal === 5)) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }
    } else if (type === 'extras') {
      nextRuns += 1;
      
      if (nextBowler) {
        nextBowler.runsConceded = (Number(nextBowler.runsConceded) || 0) + 1;
      }

      commentaryDesc = generateCommentarySentence({
        strikerName: nextStriker?.name,
        nonStrikerName: nextNonStriker?.name,
        bowlerName: nextBowler?.name,
        runs: 1,
        type: 'extras',
        extraType: value
      });
    }

    // Handle end of over changes (6 valid balls bowled)
    if (nextBalls >= 6) {
      nextBalls = 0;
      nextOvers += 1;
      commentaryDesc += ` End of over ${nextOvers}.`;

      // Over change strike swap
      if (nextStriker && nextNonStriker) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }
    }

    setRuns(nextRuns);
    setBalls(nextBalls);
    setOvers(nextOvers);
    setActiveStriker(nextStriker);
    setActiveNonStriker(nextNonStriker);
    setActiveBowler(nextBowler);

    const syncPayload = {
      runs: nextRuns,
      balls: nextBalls,
      overs: nextOvers,
      activeStriker: nextStriker,
      activeNonStriker: nextNonStriker,
      activeBowler: nextBowler,
      newCommentary: {
        ball: `${nextOvers}.${nextBalls}`,
        runs: type === 'runs' ? Number(value) : 1,
        description: commentaryDesc,
      }
    };

    // Update batting stats array
    if (nextStriker) {
      const updatedBatsmenStats = [...batsmenStats];
      const idx = updatedBatsmenStats.findIndex(b => b.userId === nextStriker.userId);
      if (idx > -1) {
        updatedBatsmenStats[idx].runs = nextStriker.runs;
        updatedBatsmenStats[idx].balls = nextStriker.balls;
        updatedBatsmenStats[idx].fours = nextStriker.fours;
        updatedBatsmenStats[idx].sixes = nextStriker.sixes;
        updatedBatsmenStats[idx].status = 'batting';
      } else {
        updatedBatsmenStats.push({
          userId: nextStriker.userId,
          name: nextStriker.name,
          runs: nextStriker.runs,
          balls: nextStriker.balls,
          fours: nextStriker.fours,
          sixes: nextStriker.sixes,
          status: 'batting',
          dismissalInfo: 'not out',
        });
      }
      setBatsmenStats(updatedBatsmenStats);
      syncPayload.batsmenStats = updatedBatsmenStats;
    }

    // Update bowler stats array
    if (nextBowler) {
      const updatedBowlersStats = [...bowlersStats];
      const idx = updatedBowlersStats.findIndex(bo => bo.userId === nextBowler.userId);
      if (idx > -1) {
        updatedBowlersStats[idx].runsConceded = nextBowler.runsConceded;
        updatedBowlersStats[idx].overs = nextBowler.overs;
        updatedBowlersStats[idx].balls = nextBowler.balls;
        updatedBowlersStats[idx].wickets = nextBowler.wickets;
      } else {
        updatedBowlersStats.push({
          userId: nextBowler.userId,
          name: nextBowler.name,
          runsConceded: nextBowler.runsConceded,
          overs: nextBowler.overs,
          balls: nextBowler.balls,
          wickets: nextBowler.wickets,
        });
      }
      setBowlersStats(updatedBowlersStats);
      syncPayload.bowlersStats = updatedBowlersStats;
    }

    syncScorecard(syncPayload);
  };

  const handleWicketSubmit = (e) => {
    e.preventDefault();

    let nextWickets = wickets + 1;
    let nextBalls = balls + 1;
    let nextOvers = overs;

    let dismissedBatsman = whoIsOut === 'striker' ? { ...activeStriker } : { ...activeNonStriker };
    if (!dismissedBatsman || !dismissedBatsman.name) {
      showToast('Dismissed batsman slot is empty!', 'error');
      return;
    }

    let nextStriker = activeStriker ? { ...activeStriker } : null;
    let nextNonStriker = activeNonStriker ? { ...activeNonStriker } : null;
    let nextBowler = activeBowler ? { ...activeBowler } : null;

    if (nextBowler) {
      nextBowler.wickets += 1;
      nextBowler.balls += 1;
      if (nextBowler.balls >= 6) {
        nextBowler.overs += 1;
        nextBowler.balls = 0;
      }
    }

    if (nextBalls >= 6) {
      nextBalls = 0;
      nextOvers += 1;
    }

    const fielder = yesAttendees.find(r => r.userId === fielderId);
    let dismissalText = '';
    if (dismissedType === 'Bowled') dismissalText = `b ${activeBowler?.name || 'Bowler'}`;
    else if (dismissedType === 'LBW') dismissalText = `lbw b ${activeBowler?.name || 'Bowler'}`;
    else if (dismissedType === 'Caught') dismissalText = `c ${fielder?.name || 'Fielder'} b ${activeBowler?.name || 'Bowler'}`;
    else if (dismissedType === 'Run Out') dismissalText = `run out (${fielder?.name || 'Fielder'})`;
    else if (dismissedType === 'Stumped') dismissalText = `st ${fielder?.name || 'Keeper'} b ${activeBowler?.name || 'Bowler'}`;

    dismissedBatsman.balls += 1;

    const updatedBatsmenStats = [...batsmenStats];
    const idx = updatedBatsmenStats.findIndex(b => b.userId === dismissedBatsman.userId);
    if (idx > -1) {
      updatedBatsmenStats[idx].runs = dismissedBatsman.runs;
      updatedBatsmenStats[idx].balls = dismissedBatsman.balls;
      updatedBatsmenStats[idx].status = 'out';
      updatedBatsmenStats[idx].dismissalInfo = dismissalText;
    } else {
      updatedBatsmenStats.push({
        userId: dismissedBatsman.userId,
        name: dismissedBatsman.name,
        runs: dismissedBatsman.runs,
        balls: dismissedBatsman.balls,
        fours: dismissedBatsman.fours,
        sixes: dismissedBatsman.sixes,
        status: 'out',
        dismissalInfo: dismissalText,
      });
    }

    if (whoIsOut === 'striker') {
      nextStriker = null;
      setStrikerId('');
    } else {
      nextNonStriker = null;
      setNonStrikerId('');
    }

    const commDesc = generateCommentarySentence({
      strikerName: dismissedBatsman.name,
      bowlerName: activeBowler?.name,
      runs: 0,
      type: 'wicket',
      dismissalType: dismissalText,
      dismissedName: dismissedBatsman.name,
      fielderName: fielder?.name
    }) + ` OUT! Dismissed for ${dismissedBatsman.runs} runs.`;

    setWickets(nextWickets);
    setBalls(nextBalls);
    setOvers(nextOvers);
    setActiveStriker(nextStriker);
    setActiveNonStriker(nextNonStriker);
    setActiveBowler(nextBowler);
    setBatsmenStats(updatedBatsmenStats);
    setShowWicketForm(false);

    const syncPayload = {
      runs,
      wickets: nextWickets,
      balls: nextBalls,
      overs: nextOvers,
      activeStriker: nextStriker,
      activeNonStriker: nextNonStriker,
      activeBowler: nextBowler,
      batsmenStats: updatedBatsmenStats,
      newCommentary: {
        ball: `${nextOvers}.${nextBalls}`,
        runs: 0,
        description: commDesc,
      }
    };

    if (nextBowler) {
      const updatedBowlersStats = [...bowlersStats];
      const bowlerIdx = updatedBowlersStats.findIndex(bo => bo.userId === nextBowler.userId);
      if (bowlerIdx > -1) {
        updatedBowlersStats[bowlerIdx].wickets = nextBowler.wickets;
        updatedBowlersStats[bowlerIdx].overs = nextBowler.overs;
        updatedBowlersStats[bowlerIdx].balls = nextBowler.balls;
      }
      setBowlersStats(updatedBowlersStats);
      syncPayload.bowlersStats = updatedBowlersStats;
    }

    syncScorecard(syncPayload);
  };

  const handleMetadataSubmit = (e) => {
    e.preventDefault();
    syncScorecard({
      status: scoreStatus,
      battingTeam,
      bowlingTeam,
      target: Number(target) || 0
    });
    showToast('Match scoreboard parameters updated!');
  };

  const handleCustomCommentary = (e) => {
    e.preventDefault();
    if (!commentaryText.trim()) return;

    syncScorecard({
      newCommentary: {
        ball: `${overs}.${balls}`,
        runs: 0,
        description: commentaryText.trim(),
      }
    });

    setCommentaryText('');
    showToast('Custom commentary logged!');
  };

  const handleResetScorecard = () => {
    if (!confirm('Are you sure you want to completely wipe the scorecard for this match? This action cannot be undone.')) return;
    
    setRuns(0);
    setWickets(0);
    setOvers(0);
    setBalls(0);
    setTarget(0);
    setScoreStatus('scheduled');
    setActiveStriker(null);
    setActiveNonStriker(null);
    setActiveBowler(null);
    setStrikerId('');
    setNonStrikerId('');
    setBowlerId('');
    setBatsmenStats([]);
    setBowlersStats([]);

    syncScorecard({ reset: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading-spinner" />
          <p className="text-[16px] text-[var(--on-surface-variant)] tracking-[0.5px]">Loading Scoring Deck...</p>
        </div>
      </div>
    );
  }

  // Dashboard Match Selector if no matchId is specified
  if (!matchId) {
    const liveAndUpcoming = matches.filter(m => m.scorecard?.status !== 'completed');
    return (
      <div className="min-h-screen bg-[var(--background)] pb-24">
        <AppBar 
          title="Scoring Cockpit" 
          leading={<IconButton icon={ArrowLeft} onClick={() => router.push('/admin')} />} 
        />
        <main className="w-full max-w-[800px] mx-auto px-4 mt-6 md:mt-10">
          <div className="bg-[var(--surface-container-low)] p-6 md:p-10 text-center rounded-[32px] shadow-[var(--el-1)]">
            <h2 className="text-[28px] text-[var(--on-surface)] mb-2 font-medium">Select Live Match to Score</h2>
            <p className="text-[var(--on-surface-variant)] text-[15px] mb-8">
              Choose a match from the active scheduling roster below to initiate Cricbuzz-style live scorecast updates.
            </p>

            {liveAndUpcoming.length === 0 ? (
              <div className="p-8 text-[var(--on-surface-variant)] italic bg-[var(--surface-container-highest)] rounded-2xl">
                No active or scheduled matches found. Go schedule one first!
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-left">
                {liveAndUpcoming.map(m => (
                  <div key={m._id} className="p-5 rounded-2xl bg-[var(--surface-container-highest)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-[var(--surface-container)] transition-colors">
                    <div>
                      <h3 className="text-[18px] text-[var(--on-surface)] font-medium flex items-center gap-2">
                        {m.title}
                        {m.scorecard?.status === 'live' && <span className="shrink-0 bg-[var(--live)] text-[var(--on-live)] text-[10px] font-bold px-2 py-0.5 rounded-full">Live</span>}
                      </h3>
                      <p className="text-[13px] text-[var(--on-surface-variant)] mt-1">
                        Location: {m.location} | Time: {m.time}
                      </p>
                    </div>
                    <Button variant="filled" onClick={() => router.push(`/admin/score?matchId=${m._id}`)}>
                      Score Match
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      {/* Toast Alert Indicator */}
      {toastMsg && (
        <div className={`toast-notification ${toastType === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toastMsg}
        </div>
      )}

      <AppBar 
        title="Umpiring Scoring Center"
        leading={<IconButton icon={ArrowLeft} onClick={() => router.push('/admin')} />}
        actions={
          <div className="pr-2">
            <Button variant="filled" size="sm" onClick={() => router.push('/live')}>
              Live Player View
            </Button>
          </div>
        }
      />

      <main className="w-full max-w-[1200px] mx-auto px-4 md:px-8 mt-6 md:mt-10">
        
        {selectedMatch && (
          <div className="bg-[var(--surface-container-low)] p-6 md:p-8 rounded-[32px] shadow-[var(--el-1)] mb-8 relative">
            
            {/* Wicket Out Form Modal Overlay */}
            {showWicketForm && (
              <div className="absolute inset-0 bg-[var(--surface-container-high)]/95 backdrop-blur-sm rounded-[32px] z-10 flex flex-col justify-center items-center p-6">
                <div className="w-full max-w-md bg-[var(--surface-container-low)] p-6 rounded-2xl shadow-[var(--el-3)] overflow-y-auto max-h-full no-scrollbar">
                  <h3 className="text-[22px] text-[var(--error)] font-medium mb-6">Dismissal Form</h3>
                  
                  <form onSubmit={handleWicketSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[15px] text-[var(--on-surface-variant)]">Who is OUT?</label>
                      <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={whoIsOut} onChange={(e) => setWhoIsOut(e.target.value)}>
                        <option value="striker">Striker: {activeStriker?.name || 'Empty'}</option>
                        <option value="nonStriker">Non-Striker: {activeNonStriker?.name || 'Empty'}</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[15px] text-[var(--on-surface-variant)]">Dismissal Type</label>
                      <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={dismissedType} onChange={(e) => setDismissedType(e.target.value)}>
                        <option value="Caught">Caught</option>
                        <option value="Bowled">Bowled</option>
                        <option value="LBW">LBW</option>
                        <option value="Run Out">Run Out</option>
                        <option value="Stumped">Stumped</option>
                      </select>
                    </div>

                    {['Caught', 'Run Out', 'Stumped'].includes(dismissedType) && (
                      <div className="flex flex-col gap-2">
                        <label className="text-[15px] text-[var(--on-surface-variant)]">Fielder Involved</label>
                        <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={fielderId} onChange={(e) => setFielderId(e.target.value)} required>
                          <option value="">-- Select Fielder --</option>
                          {yesAttendees.map(p => (
                            <option key={p.userId} value={p.userId}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Button type="submit" variant="outlined" className="!text-[var(--error)] !border-[var(--error)]">
                        Confirm OUT
                      </Button>
                      <Button type="button" onClick={() => setShowWicketForm(false)} variant="tonal">
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-[var(--outline)]">
              <div>
                <h2 className="text-[24px] text-[var(--on-surface)]">Active Match: <span className="text-[var(--primary)]">{selectedMatch.title}</span></h2>
                <p className="text-[var(--on-surface-variant)] text-[14px] mt-1">Location: {selectedMatch.location} | Umpiring Dashboard</p>
              </div>
              <div className="mt-4 md:mt-0">
                {scoreStatus === 'live' ? (
                  <span className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 px-4 py-2 rounded-full text-[13px] font-medium ">Live Scoring Active</span>
                ) : (
                  <span className="bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] px-4 py-2 rounded-full text-[13px] font-medium ">Status: {scoreStatus}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Umpiring Settings Panel */}
              <div className="flex flex-col gap-6">
                <form onSubmit={handleMetadataSubmit} className="bg-[var(--surface-container)] p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-[15px] text-[var(--on-surface)]">Scorecard parameters</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] text-[var(--on-surface-variant)]">Batting Team</label>
                      <input type="text" className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={battingTeam} onChange={(e) => setBattingTeam(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] text-[var(--on-surface-variant)]">Bowling Team</label>
                      <input type="text" className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={bowlingTeam} onChange={(e) => setBowlingTeam(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] text-[var(--on-surface-variant)]">Target (Runs)</label>
                      <input type="number" className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={target} onChange={(e) => setTarget(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] text-[var(--on-surface-variant)]">Scoring Status</label>
                      <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={scoreStatus} onChange={(e) => setScoreStatus(e.target.value)}>
                        <option value="scheduled">Scheduled (Upcoming)</option>
                        <option value="live">Live Scoring Active</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" variant="outlined" full>
                    Update Teams & Status
                  </Button>
                </form>

                {/* Active Batter & Bowler Selector */}
                <div className="bg-[var(--surface-container)] p-6 rounded-2xl flex flex-col gap-4">
                  <h3 className="text-[15px] text-[var(--on-surface)]">
                    Active Batsmen & Bowler (from RSVP Yes)
                  </h3>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[var(--on-surface-variant)]">Striker (On Strike)</label>
                    <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={strikerId} onChange={(e) => handleActivePlayerSelect('striker', e.target.value)}>
                      <option value="">-- Select Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === nonStrikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[var(--on-surface-variant)]">Non-Striker</label>
                    <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={nonStrikerId} onChange={(e) => handleActivePlayerSelect('nonStriker', e.target.value)}>
                      <option value="">-- Select Non-Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === strikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] text-[var(--on-surface-variant)]">Bowler</label>
                    <select className="appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%238E8E93%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[position:right_1rem_center] bg-no-repeat w-full h-[52px] pl-4 pr-12 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all" value={bowlerId} onChange={(e) => handleActivePlayerSelect('bowler', e.target.value)}>
                      <option value="">-- Select Bowler --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Digital Scoreboard & scoring grid */}
              <div className="flex flex-col gap-6">
                
                <div className="p-6 rounded-2xl bg-[var(--surface-container)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[14px] font-medium text-[var(--primary)]">
                      BAT: {battingTeam}
                    </span>
                    <span className="text-[12px] text-[var(--on-surface-variant)]">BOWLING: {bowlingTeam}</span>
                  </div>
                  
                  <div className="text-[48px] text-[var(--on-surface)] font-bold leading-tight mb-2 tracking-wide">
                    {runs} <span className="text-[var(--on-surface-variant)] text-[36px] font-medium mx-1">/</span> {wickets}
                  </div>

                  <div className="text-[15px] text-[var(--on-surface-variant)]">
                    Overs: <strong className="text-[var(--on-surface)] text-[18px]">{overs}.{balls}</strong>
                    {target > 0 && <span className="ml-4">Target: {target}</span>}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--surface-container)] text-[13px] flex flex-col gap-2 text-[var(--on-surface-variant)]">
                  <div>Striker: <strong className="text-[var(--on-surface)]">{activeStriker?.name ? `${activeStriker.name} ${activeStriker.runs}* (${activeStriker.balls}b) [${activeStriker.fours}x4, ${activeStriker.sixes}x6]` : 'Select Striker'}</strong></div>
                  <div>Non-Strike: <strong className="text-[var(--on-surface)]">{activeNonStriker?.name ? `${activeNonStriker.name} ${activeNonStriker.runs} (${activeNonStriker.balls}b)` : 'Select Non-Striker'}</strong></div>
                  <div>Bowler: <strong className="text-[var(--on-surface)]">{activeBowler?.name ? `${activeBowler.name} ${activeBowler.wickets}/${activeBowler.runsConceded} (${activeBowler.overs}.${activeBowler.balls} ov)` : 'Select Bowler'}</strong></div>
                </div>

                {/* Score Increment Grid */}
                <div className="grid grid-cols-4 gap-3">
                  <Button variant="tonal" onClick={() => handleScoreChange('runs', 0)} className="py-4 px-2 w-full text-[16px] font-medium">0</Button>
                  <Button variant="tonal" onClick={() => handleScoreChange('runs', 1)} className="py-4 px-2 w-full text-[16px] font-medium">1</Button>
                  <Button variant="tonal" onClick={() => handleScoreChange('runs', 2)} className="py-4 px-2 w-full text-[16px] font-medium">2</Button>
                  <Button variant="tonal" onClick={() => handleScoreChange('runs', 3)} className="py-4 px-2 w-full text-[16px] font-medium">3</Button>
                  
                  <Button variant="filled" onClick={() => handleScoreChange('runs', 4)} className="py-4 px-2 w-full text-[16px] font-bold">4</Button>
                  <Button variant="filled" onClick={() => handleScoreChange('runs', 6)} className="py-4 px-2 w-full text-[16px] font-bold">6</Button>
                  <Button variant="tonal" onClick={() => handleScoreChange('extras', 'Wide')} className="py-4 px-2 w-full text-[14px]">Wide</Button>
                  <Button variant="tonal" onClick={() => handleScoreChange('extras', 'No Ball')} className="py-4 px-2 w-full text-[14px]">No Ball</Button>
                </div>

                <Button variant="filled" onClick={() => setShowWicketForm(true)} className="!bg-[var(--error)] !text-[var(--on-error)] py-4 font-medium" full>
                  OUT / Dismissal
                </Button>

                {/* Custom commentary logger */}
                <form onSubmit={handleCustomCommentary} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log custom commentary overrides..."
                    className="flex-1 h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                    value={commentaryText}
                    onChange={(e) => setCommentaryText(e.target.value)}
                  />
                  <Button type="submit" variant="filled">
                    Log Ball
                  </Button>
                </form>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-[12px] text-[var(--on-surface-variant)] italic">
                    * Batsmen are auto-rotated on odd singles and at the end of every over.
                  </span>
                  <Button variant="outlined" size="sm" onClick={handleResetScorecard} className="!text-[var(--error)] !border-[var(--error)] shrink-0">
                    Reset Scorecard
                  </Button>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default function DedicatedScorerConsole() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#060913', color: 'var(--text-main)' }}>
        <p>Loading Console components...</p>
      </div>
    }>
      <ScoreConsoleContent />
    </Suspense>
  );
}
