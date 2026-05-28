"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AppBar from '@/components/ui/AppBar';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Loader from '@/components/ui/Loader';
import { ArrowLeft, LogOut } from 'lucide-react';

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
  const showToast = (msg, type = 'success') => {
    if (type === 'error') {
      toast.error(msg);
    } else if (type === 'info') {
      toast(msg, { icon: 'ℹ️' });
    } else {
      toast.success(msg);
    }
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
      showToast(`Ball recorded: ${commentaryDesc} (Select Striker/Bowler to track detailed stats!)`, 'info');
    } else {
      showToast(`Ball recorded: ${commentaryDesc}`);
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
    return <Loader text="Opening Command Center..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-[var(--background)] pb-24">
      <AppBar
        title="Admin Panel"
        leading={<IconButton icon={ArrowLeft} onClick={() => router.push('/')} />}
        actions={
          <div className="flex items-center gap-2 pr-2">
            <span className="m3-label-sm text-[var(--on-surface-variant)] hidden md:inline-block">
              {user?.name}
            </span>
            <Button variant="outlined" size="sm" onClick={handleLogout}>Log Out</Button>
          </div>
        }
      />

      <main className="w-full max-w-[1200px] mx-auto px-4 md:px-8 lg:px-12 mt-6 md:mt-10">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 mt-6">
          
          {/* Match Form */}
          <div className="xl:col-span-7 bg-[var(--surface-container-low)] p-6 md:p-8 rounded-[32px] shadow-[var(--el-1)]">
            <h2 className="text-[22px] text-[var(--on-surface-variant)] mb-6">
              {editingMatchId ? 'Edit Match details' : 'Schedule New Match'}
            </h2>
            <p className="m3-body-sm text-[var(--on-surface-variant)] mb-6">
              Set location, date, ground hire total cost, and timing. Per-player shares are computed dynamically based on attendance!
            </p>

            <form onSubmit={handleFormSubmit}>
              <div className="mb-4">
                <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Match Name / Title</label>
                <input
                  type="text"
                  placeholder="e.g. Saturday League vs Royal Tigers"
                  className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Date</label>
                  <input
                    type="date"
                    className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Timing / Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 15:30 - 18:30"
                    className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="mb-4">
                  <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Match Location / Stadium</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Turf Arena, Pitch 4"
                    className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Total Match Expense / Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1000.00"
                    className="w-full h-[52px] px-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                    value={totalCost}
                    onChange={(e) => setTotalCost(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-4" style={{ marginBottom: '25px' }}>
                <label className="text-[15px] text-[var(--on-surface-variant)] mb-2 block">Match Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Wear white jerseys. Bring extra spikes."
                  className="w-full p-4 rounded-2xl bg-[var(--surface-container-highest)] border-transparent text-[15px] text-[var(--on-surface)] placeholder:text-[var(--on-surface-variant)] focus:outline-none focus:border-[var(--on-surface-variant)] focus:ring-1 focus:ring-[var(--on-surface-variant)] transition-all"
                  style={{ resize: 'none' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="gap-12">
                <Button type="submit" variant="filled" full disabled={formLoading}>
                  {editingMatchId ? 'Update Match Schedule' : 'Create Match Schedule'}
                </Button>
                {editingMatchId && (
                  <Button type="button" variant="tonal" onClick={cancelEditForm}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Active Schedules */}
          <div className="xl:col-span-5 bg-[var(--surface-container-low)] p-6 md:p-8 rounded-[32px] shadow-[var(--el-1)] flex flex-col">
            <h2 className="text-[22px] text-[var(--on-surface-variant)] mb-6">
              Active Schedules
            </h2>
            
            {matches.length === 0 ? (
              <div className="text-center py-10 text-[var(--on-surface-variant)] m3-body-md">
                <p>No active schedules built yet. Fill in the creator form to get started!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto pr-2 no-scrollbar">
                {matches.map((m) => (
                  <div key={m._id} 
                    className={`p-5 rounded-2xl border cursor-pointer transition-all ${selectedMatchId === m._id ? 'border-[var(--outline)] bg-[var(--surface-container-high)] shadow-[var(--el-2)]' : 'border-[var(--outline-variant)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)]'}`}
                    onClick={() => setSelectedMatchId(m._id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="m3-title-md font-bold truncate text-[var(--on-surface)]">{m.title}</h3>
                        <p className="m3-body-sm text-[var(--on-surface-variant)] mt-1 truncate">
                          {m.location} · {m.time}
                        </p>
                      </div>
                      {m.scorecard?.status === 'live' && (
                        <span className="shrink-0 bg-[var(--live)] text-[var(--on-live)] text-[10px] font-bold px-2 py-0.5 rounded-full ">
                          Live
                        </span>
                      )}
                    </div>
                    
                    {selectedMatchId === m._id && (
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4 pt-4 border-t border-[var(--outline-variant)]" onClick={(e) => e.stopPropagation()}>
                        <Button variant="tonal" size="sm" onClick={() => broadcastMatchEmail(m._id)} disabled={actionLoading === m._id + '_email'}>
                          Broadcast
                        </Button>
                        <Button variant="tonal" size="sm" onClick={() => startEditMatch(m)}>
                          Edit
                        </Button>
                        <Button variant="outlined" className="!text-[var(--error)] !border-[var(--error)] col-span-2 sm:col-span-1" size="sm" onClick={() => handleDeleteMatch(m._id)} disabled={actionLoading === m._id}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Players RSVP & Payment Table Dashboard */}
        {selectedMatch && (
          <div className="mt-8 bg-[var(--surface-container-low)] p-6 md:p-8 rounded-[32px] shadow-[var(--el-1)] mb-8 overflow-x-auto">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between mb-6 pb-6 border-b border-[var(--outline-variant)] gap-4">
              <div className="flex-1">
                <h2 className="text-[22px] text-[var(--on-surface-variant)] mb-2">
                  Squad RSVPs & Payments: <span className="text-[var(--primary)] font-medium">{selectedMatch.title}</span>
                </h2>
                <p className="text-[15px] text-[var(--on-surface-variant)]">
                  Total Ground Cost: <strong className="text-[var(--on-surface)] font-medium">₹{(selectedMatch.totalCost || 0).toFixed(2)}</strong> | Attending: <strong className="text-[var(--on-surface)] font-medium">{yesCount} players</strong> | Per-Player Share: <strong className="text-[var(--primary)] text-[16px] font-medium">₹{(selectedMatchPlayerShare || 0).toFixed(2)}</strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-3 shrink-0">
                <Button variant="filled" onClick={() => router.push(`/admin/score?matchId=${selectedMatch._id}`)}>
                  Live Scoring Deck
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">

              <span className="bg-[rgba(16,185,129,0.1)] text-[#10b981] px-4 py-2 rounded-full text-[13px] font-medium border border-[#10b981]/20">
                {yesCount} Attending
              </span>
              <span className="bg-[rgba(239,68,68,0.1)] text-[#ef4444] px-4 py-2 rounded-full text-[13px] font-medium border border-[#ef4444]/20">
                {selectedMatch.rsvps?.filter((r) => r.status === 'no').length || 0} Declined
              </span>
            </div>

            {selectedMatch.rsvps && selectedMatch.rsvps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p>No players have RSVP'd to this match yet.</p>
              </div>
            ) : (
              <div className="w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[var(--outline-variant)]">
                      <th className="py-3 px-4 m3-label-md text-[var(--on-surface-variant)] uppercase">Player Name</th>
                      <th className="py-3 px-4 m3-label-md text-[var(--on-surface-variant)] uppercase">Email Address</th>
                      <th className="py-3 px-4 m3-label-md text-[var(--on-surface-variant)] uppercase">RSVP Status</th>
                      <th className="py-3 px-4 m3-label-md text-[var(--on-surface-variant)] uppercase">Payment (Calculated)</th>
                      <th className="py-3 px-4 m3-label-md text-[var(--on-surface-variant)] uppercase">Actions</th>
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
        )}
        
        {!selectedMatch && matches.length > 0 && (
          <div className="bg-[var(--surface-container-low)] p-8 text-center rounded-[32px] shadow-[var(--el-1)] border border-[var(--outline-variant)]">
            <p className="text-[var(--on-surface-variant)] text-[15px]">Please select a match from the active schedules to manage RSVPs and payments.</p>
          </div>
        )}

      </main>
    </div>
  );
}
