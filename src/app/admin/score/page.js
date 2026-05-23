"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#060913', color: 'var(--text-main)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '18px', color: 'var(--text-muted)' }}>Loading Scoring Deck...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Dashboard Match Selector if no matchId is specified
  if (!matchId) {
    const liveAndUpcoming = matches.filter(m => m.scorecard?.status !== 'completed');
    return (
      <div style={{ background: '#060913', minHeight: '100vh', color: 'var(--text-main)' }}>
        <nav className="navbar">
          <div className="nav-brand">🏏 dedicated scoring cockpit</div>
          <div className="nav-links">
            <button onClick={() => router.push('/admin')} className="btn btn-secondary">Back to command center</button>
          </div>
        </nav>

        <main className="main-wrapper" style={{ paddingTop: '100px' }}>
          <div className="glass-card p-30 text-center" style={{ maxWidth: '700px', margin: '0 auto' }}>
            <h2 style={{ color: 'white', fontSize: '28px', marginBottom: '10px' }}>Select Live Match to Score</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
              Choose a match from the active scheduling roster below to initiate Cricbuzz-style live scorecast updates.
            </p>

            {liveAndUpcoming.length === 0 ? (
              <div style={{ padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No active or scheduled matches found. Go schedule one first!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                {liveAndUpcoming.map(m => (
                  <div key={m._id} style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--card-border)',
                    background: 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <h3 style={{ color: 'white', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {m.title}
                        {m.scorecard?.status === 'live' && <span className="live-badge-pulse" style={{ fontSize: '9px', padding: '2px 6px' }}>Live</span>}
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {m.location} | ⏰ {m.time} | 📅 {new Date(m.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/score?matchId=${m._id}`)}
                      className="btn btn-primary"
                      style={{ padding: '10px 20px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)' }}
                    >
                      🎤 Score Match
                    </button>
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
    <div style={{ background: '#060913', minHeight: '100vh', color: 'var(--text-main)' }}>
      
      {/* Toast Alert Indicator */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '40px',
          padding: '16px 24px',
          borderRadius: '12px',
          background: toastType === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          zIndex: 1001,
          backdropFilter: 'blur(8px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastType === 'success' ? '✓' : '⚠️'} {toastMsg}
        </div>
      )}

      <nav className="navbar">
        <div className="nav-brand"><span>🏏</span> Cricbuzz Umpiring Scoring Center</div>
        <div className="nav-links">
          <button onClick={() => router.push('/admin')} className="btn btn-secondary">Command center</button>
          <button onClick={() => router.push('/live')} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>📺 Live Player View</button>
        </div>
      </nav>

      <main className="main-wrapper" style={{ paddingTop: '100px' }}>
        
        {selectedMatch && (
          <div className="glass-card p-30 mb-30" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', position: 'relative' }}>
            
            {/* Wicket Out Form Modal Overlay */}
            {showWicketForm && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(9, 13, 22, 0.96)',
                borderRadius: '16px',
                zIndex: 100,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '30px'
              }}>
                <div className="glass-card p-30" style={{ width: '100%', maxWidth: '480px', border: '1px solid var(--color-danger)' }}>
                  <h3 style={{ fontSize: '22px', color: 'var(--color-danger)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🔴 Dismissal Form
                  </h3>
                  
                  <form onSubmit={handleWicketSubmit}>
                    <div className="form-group">
                      <label className="form-label">Who is OUT?</label>
                      <select className="form-input" value={whoIsOut} onChange={(e) => setWhoIsOut(e.target.value)}>
                        <option value="striker">Striker: {activeStriker?.name || 'Empty'}</option>
                        <option value="nonStriker">Non-Striker: {activeNonStriker?.name || 'Empty'}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Dismissal Type</label>
                      <select className="form-input" value={dismissedType} onChange={(e) => setDismissedType(e.target.value)}>
                        <option value="Caught">Caught</option>
                        <option value="Bowled">Bowled</option>
                        <option value="LBW">LBW</option>
                        <option value="Run Out">Run Out</option>
                        <option value="Stumped">Stumped</option>
                      </select>
                    </div>

                    {['Caught', 'Run Out', 'Stumped'].includes(dismissedType) && (
                      <div className="form-group">
                        <label className="form-label">Fielder Involved</label>
                        <select className="form-input" value={fielderId} onChange={(e) => setFielderId(e.target.value)} required>
                          <option value="">-- Select Fielder --</option>
                          {yesAttendees.map(p => (
                            <option key={p.userId} value={p.userId}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="gap-12 mt-20">
                      <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Confirm OUT</button>
                      <button type="button" onClick={() => setShowWicketForm(false)} className="btn btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="flex-between" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '15px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '24px', color: 'white' }}>Active Match: <span style={{ color: 'var(--color-primary)' }}>{selectedMatch.title}</span></h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>📍 {selectedMatch.location} | Umpiring Dashboard</p>
              </div>
              {scoreStatus === 'live' ? (
                <span className="live-badge-pulse" style={{ padding: '6px 12px', fontSize: '12px' }}>Live Scoring Active</span>
              ) : (
                <span className="user-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>Status: {scoreStatus}</span>
              )}
            </div>

            <div className="grid-2" style={{ gap: '30px' }}>
              
              {/* Umpiring Settings Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <form onSubmit={handleMetadataSubmit} style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <h3 style={{ fontSize: '15px', color: 'white', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px' }}>Scorecard parameters</h3>
                  
                  <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Batting Team</label>
                      <input type="text" className="form-input" value={battingTeam} onChange={(e) => setBattingTeam(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Bowling Team</label>
                      <input type="text" className="form-input" value={bowlingTeam} onChange={(e) => setBowlingTeam(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Target (Runs)</label>
                      <input type="number" className="form-input" value={target} onChange={(e) => setTarget(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '12px' }}>Scoring Status</label>
                      <select className="form-input" value={scoreStatus} onChange={(e) => setScoreStatus(e.target.value)} style={{ background: '#0b0f19' }}>
                        <option value="scheduled">Scheduled (Upcoming)</option>
                        <option value="live">🟢 Live Scoring Active</option>
                        <option value="completed">🏁 Completed</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ width: '100%', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', background: 'none' }}>
                    ✓ Update Teams & Status
                  </button>
                </form>

                {/* Active Batter & Bowler Selector */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ fontSize: '14px', color: 'white', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                    Active Batsmen & Bowler (from RSVP Yes)
                  </h3>
                  
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🏏 Striker (On Strike)</label>
                    <select className="form-input" value={strikerId} onChange={(e) => handleActivePlayerSelect('striker', e.target.value)} style={{ background: '#0b0f19' }}>
                      <option value="">-- Select Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === nonStrikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🏏 Non-Striker</label>
                    <select className="form-input" value={nonStrikerId} onChange={(e) => handleActivePlayerSelect('nonStriker', e.target.value)} style={{ background: '#0b0f19' }}>
                      <option value="">-- Select Non-Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === strikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🔴 Bowler</label>
                    <select className="form-input" value={bowlerId} onChange={(e) => handleActivePlayerSelect('bowler', e.target.value)} style={{ background: '#0b0f19' }}>
                      <option value="">-- Select Bowler --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Digital Scoreboard & scoring grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div className="scoreboard-display" style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0.3) 100%)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      BAT: {battingTeam}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BOWLING: {bowlingTeam}</span>
                  </div>
                  
                  <div className="score-main" style={{ fontSize: '48px', fontWeight: '800', margin: '10px 0', textShadow: '0 0 15px rgba(16,185,129,0.2)' }}>
                    {runs} / {wickets}
                  </div>

                  <div className="score-sub" style={{ fontSize: '15px' }}>
                    Overs: <strong style={{ color: 'white', fontSize: '18px' }}>{overs}.{balls}</strong>
                    {target > 0 && <span style={{ marginLeft: '15px' }}>🎯 Target: {target}</span>}
                  </div>
                </div>

                <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '10px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>🏏 On Strike: <strong>{activeStriker?.name ? `${activeStriker.name} ${activeStriker.runs}* (${activeStriker.balls}b) [${activeStriker.fours}x4, ${activeStriker.sixes}x6]` : 'Select Striker'}</strong></div>
                  <div>🏏 Non-Strike: <strong>{activeNonStriker?.name ? `${activeNonStriker.name} ${activeNonStriker.runs} (${activeNonStriker.balls}b)` : 'Select Non-Striker'}</strong></div>
                  <div>🔴 Bowler: <strong>{activeBowler?.name ? `${activeBowler.name} ${activeBowler.wickets}/${activeBowler.runsConceded} (${activeBowler.overs}.${activeBowler.balls} ov)` : 'Select Bowler'}</strong></div>
                </div>

                {/* Score Increment Grid */}
                <div className="scoring-grid">
                  <button onClick={() => handleScoreChange('runs', 0)} className="scoring-btn">0 (Dot)</button>
                  <button onClick={() => handleScoreChange('runs', 1)} className="scoring-btn">+1 Run</button>
                  <button onClick={() => handleScoreChange('runs', 2)} className="scoring-btn">+2 Runs</button>
                  <button onClick={() => handleScoreChange('runs', 3)} className="scoring-btn">+3 Runs</button>
                  
                  <button onClick={() => handleScoreChange('runs', 4)} className="scoring-btn scoring-btn-accent">+4 Four</button>
                  <button onClick={() => handleScoreChange('runs', 6)} className="scoring-btn scoring-btn-accent">+6 Six</button>
                  <button onClick={() => handleScoreChange('extras', 'Wide')} className="scoring-btn">Wide (+1)</button>
                  <button onClick={() => handleScoreChange('extras', 'No Ball')} className="scoring-btn">No Ball (+1)</button>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowWicketForm(true)}
                    className="btn btn-danger"
                    style={{ flex: 1, padding: '12px', fontWeight: '800', background: 'linear-gradient(135deg, var(--color-danger) 0%, #b91c1c 100%)' }}
                  >
                    🔴 OUT / Dismissal
                  </button>
                </div>

                {/* Custom commentary logger */}
                <form onSubmit={handleCustomCommentary} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Log custom commentary overrides..."
                    className="form-input"
                    style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
                    value={commentaryText}
                    onChange={(e) => setCommentaryText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '12px' }}>
                    Log Ball
                  </button>
                </form>

                <div className="flex-between">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    * Batsmen are auto-rotated on odd singles and at the end of every over.
                  </span>
                  <button onClick={handleResetScorecard} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '10px', background: 'none', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', boxShadow: 'none' }}>
                    Reset Scorecard
                  </button>
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
