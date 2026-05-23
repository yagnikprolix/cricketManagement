"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Match Form State
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [notes, setNotes] = useState('');

  // Selected Match ID
  const [selectedMatchId, setSelectedMatchId] = useState('');
  
  // Umpiring scoring states (linked to selectedMatch)
  const [battingTeam, setBattingTeam] = useState('Team A');
  const [bowlingTeam, setBowlingTeam] = useState('Team B');
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [overs, setOvers] = useState(0);
  const [balls, setBalls] = useState(0);
  const [target, setTarget] = useState(0);
  const [scoreStatus, setScoreStatus] = useState('scheduled');
  const [commentaryText, setCommentaryText] = useState('');

  // Advanced scoring active batsman/bowler states
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');

  const [activeStriker, setActiveStriker] = useState(null);
  const [activeNonStriker, setActiveNonStriker] = useState(null);
  const [activeBowler, setActiveBowler] = useState(null);
  
  const [batsmenStats, setBatsmenStats] = useState([]);
  const [bowlersStats, setBowlersStats] = useState([]);

  // Wicket Out Form Overlay States
  const [showWicketForm, setShowWicketForm] = useState(false);
  const [dismissedType, setDismissedType] = useState('Caught');
  const [whoIsOut, setWhoIsOut] = useState('striker'); // striker, nonStriker
  const [fielderId, setFielderId] = useState('');

  // Status indicators
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success'); 

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const fetchAdminData = async () => {
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
      
      if (loadedMatches.length > 0 && !selectedMatchId) {
        setSelectedMatchId(loadedMatches[0]._id);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  // Synchronize umpiring panel states when selected match changes
  useEffect(() => {
    const selected = matches.find((m) => m._id === selectedMatchId);
    if (selected && selected.scorecard) {
      setBattingTeam(selected.scorecard.battingTeam || 'Team A');
      setBowlingTeam(selected.scorecard.bowlingTeam || 'Team B');
      setRuns(selected.scorecard.runs || 0);
      setWickets(selected.scorecard.wickets || 0);
      setOvers(selected.scorecard.overs || 0);
      setBalls(selected.scorecard.balls || 0);
      setTarget(selected.scorecard.target || 0);
      setScoreStatus(selected.scorecard.status || 'scheduled');

      // Sync advanced scoring attributes
      setActiveStriker(selected.scorecard.activeStriker || null);
      setActiveNonStriker(selected.scorecard.activeNonStriker || null);
      setActiveBowler(selected.scorecard.activeBowler || null);

      setStrikerId(selected.scorecard.activeStriker?.userId || '');
      setNonStrikerId(selected.scorecard.activeNonStriker?.userId || '');
      setBowlerId(selected.scorecard.activeBowler?.userId || '');

      setBatsmenStats(selected.scorecard.batsmenStats || []);
      setBowlersStats(selected.scorecard.bowlersStats || []);
    }
  }, [selectedMatchId, matches]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    const body = {
      title,
      date,
      time,
      location,
      totalCost: Number(totalCost) || 0,
      notes,
    };

    try {
      const endpoint = editingMatchId ? `/api/matches/${editingMatchId}` : '/api/matches';
      const method = editingMatchId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(editingMatchId ? 'Match updated successfully!' : 'Match created successfully!');
      
      setEditingMatchId(null);
      setTitle('');
      setDate('');
      setTime('');
      setLocation('');
      setTotalCost('');
      setNotes('');

      const matchesRes = await fetch('/api/matches');
      const matchesData = await matchesRes.json();
      const updatedMatches = matchesData.matches || [];
      setMatches(updatedMatches);
      
      if (updatedMatches.length > 0) {
        setSelectedMatchId(editingMatchId || updatedMatches[updatedMatches.length - 1]._id);
      }
    } catch (error) {
      showToast(error.message || 'Failed to save match details', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  const startEditMatch = (match) => {
    setEditingMatchId(match._id);
    setTitle(match.title);
    const formattedDate = new Date(match.date).toISOString().split('T')[0];
    setDate(formattedDate);
    setTime(match.time);
    setLocation(match.location);
    setTotalCost(match.totalCost || 0);
    setNotes(match.notes || '');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMatch = async (matchId) => {
    if (!confirm('Are you sure you want to delete this match? All RSVPs and scorecards will be permanently lost.')) return;
    
    setActionLoading(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Match deleted successfully!');
      
      const remainingMatches = matches.filter((m) => m._id !== matchId);
      setMatches(remainingMatches);
      
      if (selectedMatchId === matchId) {
        setSelectedMatchId(remainingMatches.length > 0 ? remainingMatches[0]._id : '');
      }
    } catch (error) {
      showToast(error.message || 'Failed to delete match', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const togglePayment = async (matchId, userId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const res = await fetch(`/api/matches/${matchId}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, paymentStatus: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Payment marked as ${nextStatus.toUpperCase()}`);
      
      setMatches((prevMatches) =>
        prevMatches.map((m) => (m._id === matchId ? data.match : m))
      );
    } catch (error) {
      showToast(error.message || 'Failed to toggle payment status', 'error');
    }
  };

  const broadcastMatchEmail = async (matchId) => {
    setActionLoading(matchId + '_email');
    showToast('Sending emails in background... Please wait.', 'info');
    
    try {
      const res = await fetch(`/api/matches/${matchId}/email`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(data.message, data.fallbackMode ? 'info' : 'success');
    } catch (error) {
      showToast(error.message || 'Failed to send broadcast emails', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelEdit = () => {
    setEditingMatchId(null);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setTotalCost('');
    setNotes('');
  };

  // Umpire scoring API sync helper
  const syncScorecard = async (updatePayload) => {
    try {
      const res = await fetch(`/api/matches/${selectedMatchId}/scorecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMatches((prevMatches) =>
        prevMatches.map((m) => (m._id === selectedMatchId ? data.match : m))
      );
    } catch (error) {
      showToast(error.message || 'Database sync failed', 'error');
    }
  };

  const selectedMatch = matches.find((m) => m._id === selectedMatchId);
  const yesAttendees = selectedMatch?.rsvps?.filter((r) => r.status === 'yes') || [];
  const yesCount = yesAttendees.length;
  
  const selectedMatchPlayerShare = selectedMatch ? (yesCount > 0 ? ((selectedMatch.totalCost || 0) / yesCount) : (selectedMatch.totalCost || 0)) : 0;

  // Select active striker / non-striker / bowler
  const handleActivePlayerSelect = (role, userId) => {
    if (!selectedMatchId) return;
    const player = yesAttendees.find((r) => r.userId === userId);
    
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
    showToast(`Active ${role} updated!`);
  };

  // Umpire scoring actions
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
      
      // Update striker stats
      if (nextStriker) {
        nextStriker.runs = (Number(nextStriker.runs) || 0) + runVal;
        nextStriker.balls = (Number(nextStriker.balls) || 0) + 1;
        if (runVal === 4) nextStriker.fours = (Number(nextStriker.fours) || 0) + 1;
        if (runVal === 6) nextStriker.sixes = (Number(nextStriker.sixes) || 0) + 1;
        commentaryDesc = `${nextStriker.name} hits ${runVal === 4 ? 'FOUR!' : runVal === 6 ? 'SIX!' : runVal + ' run(s)'}.`;
      } else {
        commentaryDesc = `${runVal} run(s) scored.`;
      }

      // Update bowler stats
      if (nextBowler) {
        nextBowler.runsConceded = (Number(nextBowler.runsConceded) || 0) + runVal;
        nextBowler.balls = (Number(nextBowler.balls) || 0) + 1;
        if (nextBowler.balls >= 6) {
          nextBowler.overs = (Number(nextBowler.overs) || 0) + 1;
          nextBowler.balls = 0;
        }
      }

      // Striker swap logic (1 or 3 runs)
      if (nextStriker && nextNonStriker && (runVal === 1 || runVal === 3)) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }
    } else if (type === 'extras') {
      nextRuns += 1;
      commentaryDesc = `Extra run (${value}).`;
      
      if (nextBowler) {
        nextBowler.runsConceded = (Number(nextBowler.runsConceded) || 0) + 1;
      }
    }

    // Over ball progression calculations
    let isOverEnd = false;
    if (nextBalls >= 6) {
      nextBalls = 0;
      nextOvers += 1;
      isOverEnd = true;
      commentaryDesc += ` End of over ${nextOvers}.`;
      
      // Swap strikers at end of over
      if (nextStriker && nextNonStriker) {
        const temp = nextStriker;
        nextStriker = nextNonStriker;
        nextNonStriker = temp;
      }
    }

    // Auto update live states
    setRuns(nextRuns);
    setBalls(nextBalls);
    setOvers(nextOvers);
    setActiveStriker(nextStriker);
    setActiveNonStriker(nextNonStriker);
    setActiveBowler(nextBowler);

    // Prepare sync payload
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

    // Update historical batsmen stats in background list
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
    
    // Provide dynamic feedback toast
    if (!nextStriker || !nextBowler) {
      showToast(`🎙️ Ball recorded: ${commentaryDesc} (Select Striker/Bowler to track detailed stats!)`, 'info');
    } else {
      showToast(`🎙️ Ball recorded: ${commentaryDesc}`);
    }
  };

  // Confirm Wicket OUT
  const handleWicketSubmit = (e) => {
    e.preventDefault();
    
    let nextWickets = wickets + 1;
    let nextBalls = balls + 1;
    let nextOvers = overs;
    
    let dismissedBatsman = whoIsOut === 'striker' ? { ...activeStriker } : { ...activeNonStriker };
    if (!dismissedBatsman.name) return;

    let nextStriker = activeStriker ? { ...activeStriker } : null;
    let nextNonStriker = activeNonStriker ? { ...activeNonStriker } : null;
    let nextBowler = activeBowler ? { ...activeBowler } : null;

    // Automate bowler wickets count
    if (nextBowler) {
      nextBowler.wickets += 1;
      nextBowler.balls += 1;
      if (nextBowler.balls >= 6) {
        nextBowler.overs += 1;
        nextBowler.balls = 0;
      }
    }

    // Automate ball-to-over calculation
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
    else if (dismissedType === 'Stumped') dismissalText = `st ${fielder?.name || 'Wicketkeeper'} b ${activeBowler?.name || 'Bowler'}`;

    // Add +1 to batsman balls faced for the out delivery
    dismissedBatsman.balls += 1;

    // Update batsmen historical stats list
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

    // Vacate the correct batsman slot
    if (whoIsOut === 'striker') {
      nextStriker = null;
      setStrikerId('');
    } else {
      nextNonStriker = null;
      setNonStrikerId('');
    }

    const commDesc = `OUT! ${dismissedBatsman.name} ${dismissalText} for ${dismissedBatsman.runs} runs (${dismissedBatsman.balls} balls faced).`;

    // Update local states
    setWickets(nextWickets);
    setBalls(nextBalls);
    setOvers(nextOvers);
    setActiveStriker(nextStriker);
    setActiveNonStriker(nextNonStriker);
    setActiveBowler(nextBowler);
    setBatsmenStats(updatedBatsmenStats);
    setShowWicketForm(false);

    // Sync to Mongoose database
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
    showToast(`${dismissedBatsman.name} marked OUT!`);
  };

  const handleScorecardMetadataSubmit = (e) => {
    e.preventDefault();
    
    syncScorecard({
      status: scoreStatus,
      battingTeam,
      bowlingTeam,
      target: Number(target) || 0,
    });
    
    showToast('Match details & status successfully updated!');
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
    if (!confirm('Are you sure you want to completely reset the scorecard and delete all commentary?')) return;
    
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
    showToast('Scorecard cleared.');
  };

  const cancelEditForm = () => {
    setEditingMatchId(null);
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setTotalCost('');
    setNotes('');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#060913', color: 'var(--text-main)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '18px', color: 'var(--text-muted)' }}>Opening Command Center...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">
          <span>🏏</span> Admin Command Center
        </div>
        <div className="nav-links">
          {user && (
            <div className="nav-user-info">
              <span>Admin: <strong>{user.name}</strong></span>
              <button
                onClick={() => router.push('/admin/score')}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)' }}
              >
                🎤 Scoring Deck
              </button>
              <button
                onClick={() => router.push('/')}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px' }}
              >
                Player View Portal
              </button>
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Log Out
          </button>
        </div>
      </nav>

      <main className="main-wrapper">
        {toastMsg && (
          <div style={{
            position: 'fixed',
            top: '85px',
            right: '40px',
            padding: '16px 24px',
            borderRadius: '12px',
            background: toastType === 'success' ? 'rgba(16, 185, 129, 0.95)' : toastType === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(14, 165, 233, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
            fontWeight: '600',
            fontSize: '14px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 1001,
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {toastType === 'success' ? '✓ ' : toastType === 'error' ? '⚠️ ' : 'ℹ️ '} {toastMsg}
          </div>
        )}

        <div className="grid-2 mt-20 mb-30">
          
          <div className="glass-card p-30">
            <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '8px' }}>
              {editingMatchId ? '📝 Edit Match details' : '🏏 Schedule New Match'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Set location, date, ground hire total cost, and timing. Per-player shares are computed dynamically based on attendance!
            </p>

            <form onSubmit={handleFormSubmit}>
              <div className="form-group">
                <label className="form-label">Match Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Saturday League vs Royal Tigers"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Timing / Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 15:30 - 18:30"
                    className="form-input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                <div className="form-group">
                  <label className="form-label">Match Location / Stadium</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Turf Arena, Pitch 4"
                    className="form-input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Match Expense / Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1000.00"
                    className="form-input"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label className="form-label">Match Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Wear white jerseys. Bring extra spikes."
                  className="form-textarea"
                  style={{ resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="gap-12">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingMatchId ? 'Update Match Schedule' : 'Create Match Schedule'}
                </button>
                {editingMatchId && (
                  <button type="button" onClick={cancelEditForm} className="btn btn-secondary">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="glass-card p-30" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '24px', color: 'white' }}>📋 Active Schedules</h2>
            
            {matches.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p>No active schedules built yet. Fill in the creator form to get started!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', maxHeight: '420px', paddingRight: '5px' }}>
                {matches.map((m) => (
                  <div key={m._id} style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: selectedMatchId === m._id ? 'var(--color-primary)' : 'var(--card-border)',
                    background: selectedMatchId === m._id ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }} onClick={() => setSelectedMatchId(m._id)}>
                    <div className="flex-between">
                      <div className="gap-12">
                        <h3 style={{ color: 'white', fontSize: '16px' }}>{m.title}</h3>
                        {m.scorecard?.status === 'live' && (
                          <span className="live-badge-pulse" style={{ fontSize: '8px', padding: '2px 5px' }}>Live</span>
                        )}
                      </div>
                      <span className="user-badge" style={{ fontSize: '10px' }}>₹{(m.totalCost || 0).toFixed(2)}</span>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      📍 {m.location} | ⏰ {m.time}
                    </p>

                    {selectedMatchId === m._id && (
                      <div className="gap-12 mt-20" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => router.push(`/admin/score?matchId=${m._id}`)} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', background: 'linear-gradient(135deg, var(--color-primary) 0%, #059669 100%)' }}>
                          🎤 Dedicated Scorer
                        </button>
                        <button onClick={() => startEditMatch(m)} className="btn btn-warning" style={{ padding: '6px 12px', fontSize: '11px' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDeleteMatch(m._id)} disabled={actionLoading === m._id} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '11px' }}>
                          Delete
                        </button>
                        <button onClick={() => broadcastMatchEmail(m._id)} disabled={actionLoading === m._id + '_email'} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '11px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', boxShadow: 'none' }}>
                          📧 Broadcast Schedule
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Dynamic LIVE Cricbuzz Umpiring Scoring Deck */}
        {selectedMatch && (
          <div className="glass-card p-30 mb-30" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', position: 'relative' }}>
            
            {/* Wicket Out Dismissal Modal Overlay */}
            {showWicketForm && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(9, 13, 22, 0.95)',
                borderRadius: '16px',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '30px',
                animation: 'fadeIn 0.25s ease'
              }}>
                <div className="glass-card p-30" style={{ width: '100%', maxWidth: '480px', border: '1px solid var(--color-danger)' }}>
                  <h3 style={{ fontSize: '20px', color: 'var(--color-danger)', marginBottom: '15px' }}>🔴 Dismissal / Wicket Out Form</h3>
                  
                  <form onSubmit={handleWicketSubmit}>
                    <div className="form-group">
                      <label className="form-label">Who is OUT?</label>
                      <select className="form-input" value={whoIsOut} onChange={(e) => setWhoIsOut(e.target.value)}>
                        <option value="striker">Striker: {activeStriker?.name || 'Empty'}</option>
                        <option value="nonStriker">Non-Striker: {activeNonStriker?.name || 'Empty'}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Wicket / Dismissal Type</label>
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
                      <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>
                        Confirm Wicket OUT
                      </button>
                      <button type="button" onClick={() => setShowWicketForm(false)} className="btn btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <h2 style={{ fontSize: '24px', color: 'white', marginBottom: '8px' }}>
              🏏 Cricbuzz-Style Live Scoring & Umpiring Cockpit
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
              Configure active batting strikers, bowlers, increment scores dynamically, and tap the Wicket form to log comprehensive squad statistics.
            </p>

            <div className="grid-2" style={{ gap: '30px' }}>
              
              {/* Umpiring Control Settings Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <form onSubmit={handleScorecardMetadataSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Batting Team</label>
                      <input
                        type="text"
                        className="form-input"
                        value={battingTeam}
                        onChange={(e) => setBattingTeam(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Bowling Team</label>
                      <input
                        type="text"
                        className="form-input"
                        value={bowlingTeam}
                        onChange={(e) => setBowlingTeam(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: '15px', marginBottom: '0' }}>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Target (Runs)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 145"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                      <label className="form-label">Scoring Status</label>
                      <select
                        className="form-input"
                        value={scoreStatus}
                        onChange={(e) => setScoreStatus(e.target.value)}
                        style={{ background: 'rgba(15, 23, 42, 0.8)' }}
                      >
                        <option value="scheduled">Scheduled (Upcoming)</option>
                        <option value="live">🟢 Live Scoring Active</option>
                        <option value="completed">🏁 Completed / Finished</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-secondary" style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)' }}>
                    ✓ Update Teams & Status
                  </button>
                </form>

                {/* Active Batter & Bowler Selector panel */}
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '13px', color: 'white', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Select Active Players (from RSVP Yes)</h3>
                  
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🏏 Striker (On Strike)</label>
                    <select className="form-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={strikerId} onChange={(e) => handleActivePlayerSelect('striker', e.target.value)}>
                      <option value="">-- Choose Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === nonStrikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🏏 Non-Striker</label>
                    <select className="form-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={nonStrikerId} onChange={(e) => handleActivePlayerSelect('nonStriker', e.target.value)}>
                      <option value="">-- Choose Non-Striker --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId} disabled={p.userId === strikerId}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>🔴 Bowler</label>
                    <select className="form-input" style={{ padding: '8px 12px', fontSize: '13px' }} value={bowlerId} onChange={(e) => handleActivePlayerSelect('bowler', e.target.value)}>
                      <option value="">-- Choose Bowler --</option>
                      {yesAttendees.map(p => (
                        <option key={p.userId} value={p.userId}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Digital Scoreboard & Quick Click Action Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Scoreboard Display Panel */}
                <div className="scoreboard-display" style={{ padding: '16px' }}>
                  <div className="flex-between">
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-primary)' }}>
                      BAT: {battingTeam.toUpperCase()}
                    </span>
                    {scoreStatus === 'live' && <span className="live-badge-pulse" style={{ fontSize: '9px' }}>Live</span>}
                  </div>
                  
                  <div className="score-main" style={{ fontSize: '36px', margin: '5px 0' }}>
                    {runs} / {wickets}
                  </div>
                  
                  <div className="score-sub">
                    Overs: <strong style={{ color: 'white' }}>{overs}.{balls}</strong>
                    {target > 0 && <span style={{ marginLeft: '12px' }}>🎯 Target: {target}</span>}
                  </div>
                </div>

                {/* Active Stats Panel */}
                <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div>🏏 Striker: <strong>{activeStriker?.name ? `${activeStriker.name} ${activeStriker.runs}* (${activeStriker.balls}b) [${activeStriker.fours}x4, ${activeStriker.sixes}x6]` : 'Not selected'}</strong></div>
                  <div>🏏 Non-Striker: <strong>{activeNonStriker?.name ? `${activeNonStriker.name} ${activeNonStriker.runs} (${activeNonStriker.balls}b)` : 'Not selected'}</strong></div>
                  <div>🔴 Bowler: <strong>{activeBowler?.name ? `${activeBowler.name} ${activeBowler.wickets}/${activeBowler.runsConceded} (${activeBowler.overs}.${activeBowler.balls} ov)` : 'Not selected'}</strong></div>
                </div>

                {/* Score Increment Dashboard Grid */}
                <div className="scoring-grid">
                  <button onClick={() => handleScoreChange('runs', 0)} className="scoring-btn">
                    0 (Dot)
                  </button>
                  <button onClick={() => handleScoreChange('runs', 1)} className="scoring-btn">
                    +1 Run
                  </button>
                  <button onClick={() => handleScoreChange('runs', 2)} className="scoring-btn">
                    +2 Runs
                  </button>
                  <button onClick={() => handleScoreChange('runs', 4)} className="scoring-btn scoring-btn-accent">
                    +4 (Four)
                  </button>
                  
                  <button onClick={() => handleScoreChange('runs', 6)} className="scoring-btn scoring-btn-accent">
                    +6 (Six)
                  </button>
                  <button onClick={() => handleScoreChange('extras', 'Wide')} className="scoring-btn">
                    Wide (+1)
                  </button>
                  <button onClick={() => handleScoreChange('extras', 'No Ball')} className="scoring-btn">
                    No Ball (+1)
                  </button>
                  <button onClick={() => setShowWicketForm(true)} className="scoring-btn scoring-btn-danger">
                    🔴 OUT!
                  </button>
                </div>

                {/* Live Custom Commentary Logger */}
                <form onSubmit={handleCustomCommentary} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add ball description (e.g. Beautiful cover drive...)"
                    className="form-input"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                    value={commentaryText}
                    onChange={(e) => setCommentaryText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    Log Ball
                  </button>
                </form>

                <div className="flex-between">
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    * Striker auto-swaps on singles (1, 3 runs) and at end of overs (6 balls).
                  </span>
                  <button onClick={handleResetScorecard} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '10px' }}>
                    Reset Board
                  </button>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Players RSVP & Payment Table Dashboard */}
        {selectedMatch ? (
          <div className="glass-card p-30 mb-20">
            <div className="flex-between" style={{ marginBottom: '20px', borderBottom: '1px solid var(--card-border)', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ fontSize: '24px', color: 'white' }}>
                  👥 Squad RSVPs & Payments: <span style={{ color: 'var(--color-primary)' }}>{selectedMatch.title}</span>
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                  Total Ground Hire Cost: **₹{(selectedMatch.totalCost || 0).toFixed(2)}** | Attending: **{yesCount} players** | Per-Player Share: <strong style={{ color: 'var(--color-primary)' }}>₹{(selectedMatchPlayerShare || 0).toFixed(2)}</strong>
                </p>
              </div>

              <div className="gap-12">
                <span className="badge-status badge-yes">
                  {yesCount} Attending
                </span>
                <span className="badge-status badge-no">
                  {selectedMatch.rsvps?.filter((r) => r.status === 'no').length || 0} Declined
                </span>
              </div>
            </div>

            {selectedMatch.rsvps && selectedMatch.rsvps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p>No players have RSVP'd to this match yet.</p>
              </div>
            ) : (
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Player Name</th>
                      <th>Email Address</th>
                      <th>RSVP Status</th>
                      <th>Payment status (Calculated Share)</th>
                      <th>Last Response</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMatch.rsvps?.map((rsvp) => (
                      <tr key={rsvp.userId}>
                        <td><strong>{rsvp.name}</strong></td>
                        <td style={{ color: 'var(--text-muted)' }}>{rsvp.email}</td>
                        <td>
                          <span className={`badge-status ${rsvp.status === 'yes' ? 'badge-yes' : 'badge-no'}`}>
                            {rsvp.status}
                          </span>
                        </td>
                        <td>
                          {rsvp.status === 'yes' ? (
                            <span className={`badge-status ${rsvp.paymentStatus === 'completed' ? 'badge-yes' : 'badge-pending'}`}>
                              {rsvp.paymentStatus === 'completed' ? `Paid (₹${(selectedMatchPlayerShare || 0).toFixed(2)})` : `Pending (₹${(selectedMatchPlayerShare || 0).toFixed(2)})`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {new Date(rsvp.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          {rsvp.status === 'yes' ? (
                            <button
                              onClick={() => togglePayment(selectedMatch._id, rsvp.userId, rsvp.paymentStatus)}
                              className={`btn ${rsvp.paymentStatus === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                              style={{ padding: '6px 14px', fontSize: '11px' }}
                            >
                              {rsvp.paymentStatus === 'completed' ? 'Mark as Unpaid' : 'Mark as Paid'}
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Declined Match</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          matches.length > 0 && (
            <div className="glass-card text-center p-30">
              <p style={{ color: 'var(--text-muted)' }}>Please select a match from the active schedules to manage RSVPs and payments.</p>
            </div>
          )
        )}

      </main>
    </div>
  );
}
