"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Loader from '@/components/ui/Loader';
import LiveVideoViewer from '@/components/ui/LiveVideoViewer';
import { ArrowLeft, Radio, Trophy, Activity, User, CircleDot, Mic, MicOff, MapPin, Table, LineChart, Target, Volume2, VolumeX } from 'lucide-react';

function LiveStadiumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedMatchId = searchParams.get('matchId');

  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Live Match being tracked
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeLiveTab, setActiveLiveTab] = useState('commentary'); // 'commentary', 'scorecard', 'analytics'

  // Voice TTS States
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');

  const lastSpokenBallRef = useRef(null);

  // Fetch initial matches & session
  const fetchStadiumData = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.user) {
        setUser(authData.user);
      }

      const matchesRes = await fetch('/api/matches');
      const matchesData = await matchesRes.json();
      const loadedMatches = matchesData.matches || [];
      setMatches(loadedMatches);

      // Find the appropriate match to show
      determineActiveMatch(loadedMatches);
    } catch (error) {
      console.error('Error fetching stadium data:', error);
    } finally {
      setLoading(false);
    }
  };

  const determineActiveMatch = (allMatches) => {
    let match = null;
    if (requestedMatchId) {
      match = allMatches.find(m => m._id === requestedMatchId);
    }
    if (!match) {
      match = allMatches.find(m => m.scorecard?.status === 'live');
    }
    if (!match && allMatches.length > 0) {
      match = allMatches[0];
    }

    if (match) {
      setActiveMatch(match);
      // Seed the current ball to prevent repeating historical commentary on page load
      if (match.scorecard?.commentary?.length > 0) {
        lastSpokenBallRef.current = match.scorecard.commentary[0].ball;
      }
    }
  };

  // Sync Pusher real-time updates
  useEffect(() => {
    fetchStadiumData();

    let pusher;
    let channel;

    async function connectPusher() {
      const PusherClient = (await import('pusher-js')).default;
      pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });

      channel = pusher.subscribe('cricket-live');
      console.log('[Pusher Live] Subscribed to cricket-live channel');

      channel.bind('match-update', (updatedMatch) => {
        try {
          if (updatedMatch && updatedMatch._refetch) {
            // Payload was too large — re-fetch from API
            fetchStadiumData();
            return;
          }
          if (updatedMatch && updatedMatch._id) {
            // Update local matches list
            setMatches(prev => prev.map(m => m._id === updatedMatch._id ? updatedMatch : m));

            // If this is the active match being displayed, update it reactively
            setActiveMatch(prevActive => {
              if (prevActive && prevActive._id === updatedMatch._id) {
                return updatedMatch;
              }
              return prevActive;
            });
          }
        } catch (err) {
          console.error('[Pusher Live] Failed to process event:', err);
        }
      });
    }

    connectPusher();

    // Load available TTS voices
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        // Default to a nice English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'));
        if (englishVoice) {
          setSelectedVoiceName(englishVoice.name);
        } else if (voices.length > 0) {
          const anyEnglish = voices.find(v => v.lang.startsWith('en'));
          setSelectedVoiceName(anyEnglish ? anyEnglish.name : voices[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (channel) channel.unbind_all();
      if (pusher) pusher.disconnect();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [requestedMatchId]);

  // Speaking utility
  const speakText = (text, force = false) => {
    if (!('speechSynthesis' in window)) return;
    if (!audioEnabled && !force) return;

    window.speechSynthesis.cancel(); // cancel any active talking
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;

    const voices = window.speechSynthesis.getVoices();
    const selectVoice = voices.find(v => v.name === selectedVoiceName);
    if (selectVoice) {
      utterance.voice = selectVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Separate reactive announcer effect to bypass stale closures in WebSocket event listeners
  useEffect(() => {
    if (!audioEnabled || !activeMatch || !activeMatch.scorecard?.commentary || activeMatch.scorecard.commentary.length === 0) return;

    const latestComm = activeMatch.scorecard.commentary[0];
    const latestBall = latestComm.ball;
    const latestDesc = latestComm.description;

    // Avoid repeating the same ball descriptions
    if (latestBall !== lastSpokenBallRef.current) {
      lastSpokenBallRef.current = latestBall;
      speakText(latestDesc);
    }
  }, [activeMatch, audioEnabled, speechRate, speechPitch, selectedVoiceName]);

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    if (nextState) {
      // Warm up browser audio context with a small greeting to bypass security restrictions
      setTimeout(() => {
        speakText("Live audio matchcast activated. Standing by for ball updates!", true);
      }, 100);
    } else {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    }
  };

  if (loading) {
    return <Loader text="Entering Stadium Hub..." fullScreen />;
  }

  // Visual placeholders if no match is currently running or scheduled
  if (!activeMatch) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--on-background)]">
        <AppBar 
          title="Live Stadium Portal"
          leading={<IconButton icon={ArrowLeft} onClick={() => router.push('/')} />}
        />
        <main className="flex-1 flex justify-center items-center p-6">
          <div className="bg-[var(--surface-container-low)] rounded-[32px] p-10 max-w-[600px] w-full text-center shadow-[var(--el-1)]">
            <Radio size={64} className="text-[var(--primary)] mb-5 mx-auto" />
            <h2 className="text-[24px] text-[var(--on-surface)] mt-5 mb-2 font-bold">Stadium Screens Off</h2>
            <p className="text-[var(--on-surface-variant)]">
              No matches have been logged or scheduled inside the database yet. When an admin starts scoring, live updates will appear here!
            </p>
          </div>
        </main>
      </div>
    );
  }

  const sc = activeMatch.scorecard || {
    status: 'scheduled',
    battingTeam: 'Team A',
    bowlingTeam: 'Team B',
    runs: 0,
    wickets: 0,
    overs: 0,
    balls: 0,
    target: 0,
    batsmenStats: [],
    bowlersStats: [],
    commentary: []
  };

  // Chase Analytics variables
  const totalBallsBowled = (sc.overs || 0) * 6 + (sc.balls || 0);
  const crr = totalBallsBowled > 0 ? ((sc.runs || 0) / totalBallsBowled * 6).toFixed(2) : '0.00';
  
  const target = sc.target || 0;
  const runsNeeded = target - (sc.runs || 0);
  const totalMatchBalls = 120; // Default T20 limit
  const remainingBalls = Math.max(0, totalMatchBalls - totalBallsBowled);
  const rrr = remainingBalls > 0 ? (runsNeeded / remainingBalls * 6).toFixed(2) : '0.00';
  
  const strikerRuns = sc.activeStriker?.runs || 0;
  const nonStrikerRuns = sc.activeNonStriker?.runs || 0;
  const activePartnership = strikerRuns + nonStrikerRuns;

  // Ball-by-ball circles
  const recentBallsBubbles = (sc.commentary || [])
    .slice(0, 10)
    .reverse()
    .map((comm, idx) => {
      const descUpper = comm.description?.toUpperCase() || '';
      const isWicket = descUpper.includes('OUT!');
      const isFour = comm.runs === 4 && !descUpper.includes('EXTRA');
      const isSix = comm.runs === 6 && !descUpper.includes('EXTRA');
      const isDot = comm.runs === 0 && !isWicket;
      const isExtra = descUpper.includes('EXTRA') || descUpper.includes('WIDE') || descUpper.includes('NO BALL');
      
      let bubbleClass = 'bg-[var(--surface-container-high)] text-[var(--on-surface)] shadow-sm';
      let displayText = comm.runs;

      if (isWicket) {
        bubbleClass = 'bg-[var(--error)] text-[var(--on-error)] shadow-md';
        displayText = 'W';
      } else if (isFour) {
        bubbleClass = 'bg-[#10b981] text-[#ffffff] shadow-sm';
        displayText = '4';
      } else if (isSix) {
        bubbleClass = 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md';
        displayText = '6';
      } else if (isDot) {
        bubbleClass = 'bg-[var(--surface-container)] text-[var(--on-surface-variant)] border border-[var(--outline-variant)]';
        displayText = '•';
      } else if (isExtra) {
        bubbleClass = 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)] shadow-sm';
        displayText = comm.runs + 'ex';
      }

      return (
        <span key={comm._id || idx} className={`flex items-center justify-center w-[34px] h-[34px] rounded-full text-[13px] font-black shrink-0 ${bubbleClass}`} title={comm.description}>
          {displayText}
        </span>
      );
    });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--on-background)] pb-12">
      
      <AppBar 
        title="Stadium Live Matchcast"
        leading={<IconButton icon={ArrowLeft} onClick={() => router.push('/')} />}
        actions={
          <div className="flex items-center gap-2 pr-2">
            {user && <span className="hidden md:inline text-[12px] text-[var(--on-surface-variant)] mr-2">Attending: {user.name}</span>}
            <Button variant="tonal" size="sm" onClick={() => router.push('/')}>
              Player Dashboard
            </Button>
          </div>
        }
      />

      <main className="main-wrapper" style={{ paddingTop: '20px' }}>
        
        {/* Dynamic TV Scoreboard Ticker */}
        {sc.status === 'live' && (
          <div className="ticker-wrap" style={{ position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 99 }}>
            <div className="ticker-track">
              <div className="ticker-content">
                <span className="ticker-item"><Trophy size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> LIVE: <span>{activeMatch.title}</span></span>
                <span className="ticker-item"><Activity size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> SCORE: <strong>{sc.runs}/{sc.wickets}</strong> <span>({sc.overs}.{sc.balls} ov)</span></span>
                {sc.activeStriker?.name && <span className="ticker-item"><User size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> Striker: <strong>{sc.activeStriker.name}*</strong> ({sc.activeStriker.runs} runs)</span>}
                {sc.activeBowler?.name && <span className="ticker-item"><CircleDot size={14} className="inline mr-1 mb-0.5 text-[var(--error)]"/> Bowler: <strong>{sc.activeBowler.name}</strong> ({sc.activeBowler.wickets}/{sc.activeBowler.runsConceded})</span>}
                {sc.commentary && sc.commentary.length > 0 && <span className="ticker-item"><Mic size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> Last Ball: <span>{sc.commentary[0].description}</span></span>}
              </div>
              <div className="ticker-content" aria-hidden="true">
                <span className="ticker-item"><Trophy size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> LIVE: <span>{activeMatch.title}</span></span>
                <span className="ticker-item"><Activity size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> SCORE: <strong>{sc.runs}/{sc.wickets}</strong> <span>({sc.overs}.{sc.balls} ov)</span></span>
                {sc.activeStriker?.name && <span className="ticker-item"><User size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> Striker: <strong>{sc.activeStriker.name}*</strong> ({sc.activeStriker.runs} runs)</span>}
                {sc.activeBowler?.name && <span className="ticker-item"><CircleDot size={14} className="inline mr-1 mb-0.5 text-[var(--error)]"/> Bowler: <strong>{sc.activeBowler.name}</strong> ({sc.activeBowler.wickets}/{sc.activeBowler.runsConceded})</span>}
                {sc.commentary && sc.commentary.length > 0 && <span className="ticker-item"><Mic size={14} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> Last Ball: <span>{sc.commentary[0].description}</span></span>}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 max-w-[1200px] mx-auto mt-8" style={{ paddingTop: sc.status === 'live' ? '45px' : '0' }}>
          
          {/* Main Visual Scoreboard Panel */}
          <div className="flex flex-col gap-6">

            {/* Live Video Player */}
            <LiveVideoViewer
              matchId={activeMatch._id}
              isVideoActive={!!sc.liveVideoActive}
            />
            
            <div className="bg-[var(--surface-container-high)] rounded-[32px] p-8 shadow-[var(--el-1)]">
              <div className="flex justify-between items-center border-b border-[var(--outline-variant)] pb-3 mb-5">
                <span className="text-[13px] font-bold text-[var(--primary)] uppercase tracking-wider">
                  {sc.battingTeam} Batting
                </span>
                {sc.status === 'live' ? (
                  <span className="bg-[var(--live)] text-[var(--on-live)] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest animate-pulse">LIVE MATCHCAST</span>
                ) : sc.status === 'completed' ? (
                  <span className="bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest">FINISHED</span>
                ) : (
                  <span className="bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] px-3 py-1 rounded-full text-[10px] font-bold tracking-widest">SCHEDULED</span>
                )}
              </div>

              <div className="text-[64px] font-black text-[var(--on-surface)] leading-tight">
                {sc.runs} / {sc.wickets}
              </div>

              <div className="flex gap-6 text-[16px] text-[var(--on-surface-variant)] mt-2">
                <span>Overs: <strong className="text-[var(--on-surface)] text-[20px]">{sc.overs}.{sc.balls}</strong></span>
                {target > 0 && <span><Target size={20} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> Target: <strong className="text-[var(--on-surface)] text-[20px]">{target}</strong></span>}
              </div>

              {sc.tossWinner && (
                <div className="mt-4 pt-4 border-t border-[var(--outline-variant)] text-[14px] text-amber-500 font-medium flex items-center gap-1">
                  🪙 <strong>{sc.tossWinner === 'Team A' ? (sc.battingTeam || 'Team A') : sc.tossWinner === 'Team B' ? (sc.bowlingTeam || 'Team B') : sc.tossWinner}</strong> won the toss & elected to <strong>{sc.tossDecision === 'bat' ? 'bat' : 'bowl'}</strong> first.
                </div>
              )}
            </div>

            {/* Active Players Bar */}
            <div className="bg-[var(--surface-container-low)] p-6 rounded-[32px] flex flex-col gap-4 shadow-[var(--el-1)]">
              <div className="flex justify-between border-b border-[var(--outline-variant)] pb-2">
                <div>
                  <span className="text-[var(--on-surface-variant)] text-[10px] uppercase block mb-1">Batter (Striker)</span>
                  {sc.activeStriker?.name ? (
                    <strong className="text-[var(--primary)] text-[15px]">
                      <User size={15} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> {sc.activeStriker.name}* <span className="text-[var(--on-surface)] ml-1">{sc.activeStriker.runs} ({sc.activeStriker.balls}b)</span>
                    </strong>
                  ) : (
                    <span className="text-[var(--on-surface-variant)] text-[13px] italic">Selecting striker...</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[var(--on-surface-variant)] text-[10px] uppercase block mb-1">Batter (Non-Striker)</span>
                  {sc.activeNonStriker?.name ? (
                    <strong className="text-[var(--on-surface)] text-[15px]">
                      {sc.activeNonStriker.name} <span className="ml-1">{sc.activeNonStriker.runs} ({sc.activeNonStriker.balls}b)</span>
                    </strong>
                  ) : (
                    <span className="text-[var(--on-surface-variant)] text-[13px] italic">Selecting non-striker...</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-[var(--on-surface-variant)] text-[10px] uppercase block mb-1">Active Bowler</span>
                  {sc.activeBowler?.name ? (
                    <strong className="text-[var(--on-surface)] text-[14px]">
                      <CircleDot size={15} className="inline mr-1 mb-0.5 text-[var(--error)]"/> {sc.activeBowler.name}
                    </strong>
                  ) : (
                    <span className="text-[var(--on-surface-variant)] text-[13px] italic">Selecting bowler...</span>
                  )}
                </div>
                <div className="text-right">
                  {sc.activeBowler?.name && (
                    <strong className="text-[var(--primary)] text-[15px]">
                      {sc.activeBowler.wickets} / {sc.activeBowler.runsConceded} <span className="text-[12px] text-[var(--on-surface-variant)] font-normal">({sc.activeBowler.overs}.{sc.activeBowler.balls} ov)</span>
                    </strong>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Deliveries row */}
            <div className="bg-[var(--surface-container-highest)] p-6 rounded-[32px] shadow-[var(--el-1)]">
              <span className="text-[11px] text-[var(--on-surface-variant)] uppercase block mb-2 font-bold tracking-wide">Recent Deliveries (Last 10 Balls)</span>
              {recentBallsBubbles.length > 0 ? (
                <div className="flex gap-2 flex-wrap">{recentBallsBubbles}</div>
              ) : (
                <span className="text-[12px] text-[var(--on-surface-variant)] italic">Waiting for the first delivery...</span>
              )}
            </div>

            {/* List other matches sidebar */}
            <div className="bg-[var(--surface-container-low)] p-6 rounded-[32px] shadow-[var(--el-1)]">
              <h3 className="text-[14px] text-[var(--on-surface)] mb-3 uppercase font-bold tracking-wide">Other Club matches</h3>
              <div className="flex flex-col gap-3 max-h-[180px] overflow-y-auto no-scrollbar">
                {matches.filter(m => m._id !== activeMatch._id).map(m => (
                  <div key={m._id} onClick={() => router.push(`/live?matchId=${m._id}`)} className="p-3 rounded-2xl bg-[var(--surface-container)] hover:bg-[var(--surface-container-highest)] cursor-pointer flex justify-between items-center transition-colors">
                    <div>
                      <strong className="text-[13px] text-[var(--on-surface)]">{m.title}</strong>
                      <span className="block text-[11px] text-[var(--on-surface-variant)] mt-1"><MapPin size={12} className="inline mr-1 mb-0.5 text-[var(--primary)]"/> {m.location}</span>
                    </div>
                    <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] px-2 py-1 rounded-md text-[10px] uppercase font-bold">{m.scorecard?.status}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Commentary Feed and Text-to-Speech Control Center */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Premium TTS Audio Announcer Card */}
            <div className="bg-[var(--surface-container-low)] p-6 rounded-[24px] relative overflow-hidden shadow-[var(--el-1)]">
              <div className="absolute -top-16 -right-16 w-32 h-32 bg-[var(--primary)] opacity-10 rounded-full blur-3xl z-0" />
              
              <div className="flex justify-between items-center z-10 relative">
                <div>
                  <h3 className="text-[var(--on-surface)] text-[16px] font-bold flex items-center gap-2">
                    <Mic size={18} className="text-[var(--primary)]"/> Stadium Voice Commentary
                  </h3>
                  <p className="text-[var(--on-surface-variant)] text-[12px] mt-1">
                    Speak dynamically generated commentary sentences out loud in real time!
                  </p>
                </div>
                
                {/* Visual Speaking Equalizer Animation */}
                {isSpeaking && (
                  <div className="flex items-end gap-[3px] h-[18px] w-[25px]">
                    <div className="eq-bar eq-bar-1" />
                    <div className="eq-bar eq-bar-2" />
                    <div className="eq-bar eq-bar-3" />
                    <div className="eq-bar eq-bar-4" />
                    <style>{`
                      .eq-bar { width: 3px; background: var(--primary); border-radius: 1px; }
                      .eq-bar-1 { height: 10px; animation: eq 0.6s ease infinite alternate; }
                      .eq-bar-2 { height: 15px; animation: eq 0.8s ease infinite alternate 0.15s; }
                      .eq-bar-3 { height: 8px; animation: eq 0.5s ease infinite alternate 0.3s; }
                      .eq-bar-4 { height: 12px; animation: eq 0.7s ease infinite alternate 0.05s; }
                      @keyframes eq { 0% { height: 3px; } 100% { height: 100%; } }
                    `}</style>
                  </div>
                )}
              </div>

              <div className="flex mt-6 z-10 relative gap-4">
                <Button
                  onClick={toggleAudio}
                  variant={audioEnabled ? 'filled' : 'tonal'}
                  icon={audioEnabled ? Volume2 : VolumeX}
                  full
                >
                  {audioEnabled ? 'Live Audio Voice Active' : 'Turn Live Audio Voice ON'}
                </Button>
              </div>

              {audioEnabled && (
                <div className="mt-6 flex flex-col gap-4 border-t border-[var(--outline-variant)] pt-4 z-10 relative text-[11px]">
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-[var(--on-surface-variant)] font-bold uppercase tracking-wide">Choose Voice Engine</label>
                    <select
                      className="h-[40px] px-3 rounded-xl bg-[var(--surface-container-high)] border-transparent text-[13px] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none"
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                    >
                      {availableVoices.map(v => (
                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[var(--on-surface-variant)] block mb-1">Speech Rate: {speechRate}x</span>
                      <input
                        type="range"
                        min="0.6"
                        max="1.5"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        className="w-full accent-[var(--primary)]"
                      />
                    </div>
                    <div>
                      <span className="text-[var(--on-surface-variant)] block mb-1">Pitch Level: {speechPitch}</span>
                      <input
                        type="range"
                        min="0.7"
                        max="1.3"
                        step="0.1"
                        value={speechPitch}
                        onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                        className="w-full accent-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stadium Navigation Tabs */}
            <div className="w-full">
              <Tabs
                current={activeLiveTab}
                onChange={setActiveLiveTab}
                className="mb-6 shrink-0"
                items={[
                  { id: 'commentary', label: 'Dynamic Commentary', icon: Mic },
                  { id: 'scorecard', label: 'Team Scorecard', icon: Table },
                  { id: 'analytics', label: 'Chase Analytics', icon: LineChart }
                ]}
              />

              {/* Dynamic Commentary Tab Content */}
              {activeLiveTab === 'commentary' && (
                <div className="max-h-[500px] overflow-y-auto pr-2 flex flex-col gap-3 no-scrollbar pb-4">
                  {sc.commentary && sc.commentary.length > 0 ? (
                    sc.commentary.map((comm, idx) => {
                      const descUpper = comm.description?.toUpperCase() || '';
                      const isWicket = descUpper.includes('OUT!');
                      const isFour = comm.runs === 4 && !descUpper.includes('EXTRA');
                      const isSix = comm.runs === 6 && !descUpper.includes('EXTRA');
                      
                      let borderLeftColor = 'var(--primary)';
                      if (isWicket) borderLeftColor = 'var(--error)';
                      if (isFour || isSix) borderLeftColor = '#10b981'; // Green for boundaries
                      
                      return (
                        <div key={comm._id || idx} className="bg-[var(--surface-container)] p-4 rounded-xl shadow-[var(--el-1)]" style={{ borderLeft: `4px solid ${borderLeftColor}` }}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[13px] font-bold text-[var(--on-surface)]">Ball {comm.ball}</span>
                            {isWicket ? (
                              <span className="bg-[var(--error-container)] text-[var(--on-error-container)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">WICKET</span>
                            ) : isFour || isSix ? (
                              <span className="bg-[#d1fae5] text-[#065f46] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                {isFour ? 'FOUR' : 'SIX'}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[14px] text-[var(--on-surface-variant)]">
                            <strong className="text-[var(--on-surface)]">{comm.runs} Run(s)</strong> — {comm.description}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-10 text-center bg-[var(--surface-container)] rounded-2xl text-[var(--on-surface-variant)] text-[14px] italic">
                      Waiting for the umpire to record the opening delivery. Live commentary will stream dynamically here!
                    </div>
                  )}
                </div>
              )}

              {/* Full Scorecard Tab Content */}
              {activeLiveTab === 'scorecard' && (
                <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 no-scrollbar pb-4">
                  {/* Divided Squads and Captains banner */}
                  {(sc.teamAPlayers?.length > 0 || sc.teamBPlayers?.length > 0) && (
                    <div className="bg-[var(--surface-container)] p-5 rounded-2xl flex flex-col gap-4 border border-[var(--outline-variant)]">
                      <h4 className="text-[13px] text-[var(--on-surface)] uppercase tracking-wide font-bold border-b border-[var(--outline-variant)] pb-2 flex items-center gap-1.5">
                        👥 Divided Match Squads
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <h5 className="text-[14px] text-[var(--primary)] font-bold flex items-center gap-1">
                            Team A ({sc.battingTeam === 'Team A' ? sc.battingTeam : sc.bowlingTeam})
                            {sc.teamACaptain && (
                              <span className="text-[11px] text-amber-500 font-normal ml-1">
                                (👑 Captain: {yesAttendees.find(p => p.userId === sc.teamACaptain)?.name || 'Captain'})
                              </span>
                            )}
                          </h5>
                          <ul className="text-[13px] text-[var(--on-surface-variant)] list-disc pl-5 flex flex-col gap-1">
                            {sc.teamAPlayers?.map(id => {
                              const isCaptain = sc.teamACaptain === id;
                              return (
                                <li key={id} className={isCaptain ? 'text-amber-500 font-medium' : ''}>
                                  {yesAttendees.find(p => p.userId === id)?.name || 'Player'}
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        <div className="flex flex-col gap-2">
                          <h5 className="text-[14px] text-[var(--primary)] font-bold flex items-center gap-1">
                            Team B ({sc.battingTeam === 'Team B' ? sc.battingTeam : sc.bowlingTeam})
                            {sc.teamBCaptain && (
                              <span className="text-[11px] text-amber-500 font-normal ml-1">
                                (👑 Captain: {yesAttendees.find(p => p.userId === sc.teamBCaptain)?.name || 'Captain'})
                              </span>
                            )}
                          </h5>
                          <ul className="text-[13px] text-[var(--on-surface-variant)] list-disc pl-5 flex flex-col gap-1">
                            {sc.teamBPlayers?.map(id => {
                              const isCaptain = sc.teamBCaptain === id;
                              return (
                                <li key={id} className={isCaptain ? 'text-amber-500 font-medium' : ''}>
                                  {yesAttendees.find(p => p.userId === id)?.name || 'Player'}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[13px] text-[var(--primary)] mb-2 uppercase tracking-wide font-bold">Batting Roster</h4>
                    {sc.batsmenStats && sc.batsmenStats.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl bg-[var(--surface-container)]">
                        <table className="w-full text-left text-[13px] border-collapse">
                          <thead className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border-b border-[var(--outline-variant)]">
                            <tr>
                              <th className="p-3 font-medium">Batsman</th>
                              <th className="p-3 font-medium">Dismissal Info</th>
                              <th className="p-3 font-medium">Runs</th>
                              <th className="p-3 font-medium">Balls</th>
                              <th className="p-3 font-medium">4s</th>
                              <th className="p-3 font-medium">6s</th>
                              <th className="p-3 font-medium">SR</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--outline-variant)]">
                            {sc.batsmenStats.map((b) => (
                              <tr key={b.userId || b.name} className="hover:bg-[var(--surface-container-highest)] transition-colors">
                                <td className="p-3 font-bold text-[var(--on-surface)]">
                                  {b.name} {(sc.teamACaptain === b.userId || sc.teamBCaptain === b.userId) ? ' (c)' : ''}
                                </td>
                                <td className="p-3 text-[var(--on-surface-variant)]">{b.dismissalInfo}</td>
                                <td className="p-3 font-bold text-[var(--on-surface)]">{b.runs}</td>
                                <td className="p-3 text-[var(--on-surface)]">{b.balls}</td>
                                <td className="p-3 text-[var(--on-surface)]">{b.fours}</td>
                                <td className="p-3 text-[var(--on-surface)]">{b.sixes}</td>
                                <td className="p-3 text-[var(--on-surface)]">{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--on-surface-variant)] italic text-center p-4 bg-[var(--surface-container)] rounded-xl">No batting stats logged yet.</p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[13px] text-[var(--primary)] mb-2 uppercase tracking-wide font-bold">Bowling Roster</h4>
                    {sc.bowlersStats && sc.bowlersStats.length > 0 ? (
                      <div className="overflow-x-auto rounded-2xl bg-[var(--surface-container)]">
                        <table className="w-full text-left text-[13px] border-collapse">
                          <thead className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] border-b border-[var(--outline-variant)]">
                            <tr>
                              <th className="p-3 font-medium">Bowler</th>
                              <th className="p-3 font-medium">Overs</th>
                              <th className="p-3 font-medium">Runs</th>
                              <th className="p-3 font-medium">Wickets</th>
                              <th className="p-3 font-medium">Econ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--outline-variant)]">
                            {sc.bowlersStats.map((bo) => {
                              const totalBowlerBalls = (bo.overs || 0) * 6 + (bo.balls || 0);
                              const econ = totalBowlerBalls > 0 ? ((bo.runsConceded / totalBowlerBalls) * 6).toFixed(2) : '0.00';
                              return (
                                <tr key={bo.userId || bo.name} className="hover:bg-[var(--surface-container-highest)] transition-colors">
                                  <td className="p-3 font-bold text-[var(--on-surface)]">
                                    {bo.name} {(sc.teamACaptain === bo.userId || sc.teamBCaptain === bo.userId) ? ' (c)' : ''}
                                  </td>
                                  <td className="p-3 text-[var(--on-surface)]">{bo.overs}.{bo.balls}</td>
                                  <td className="p-3 text-[var(--on-surface)]">{bo.runsConceded}</td>
                                  <td className="p-3 font-bold text-[var(--primary)]">{bo.wickets}</td>
                                  <td className="p-3 text-[var(--on-surface)]">{econ}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--on-surface-variant)] italic text-center p-4 bg-[var(--surface-container)] rounded-xl">No bowling stats logged yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Analytics Tab Content */}
              {activeLiveTab === 'analytics' && (
                <div className="max-h-[500px] overflow-y-auto pr-2 flex flex-col gap-4 no-scrollbar pb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--surface-container)] p-5 rounded-2xl">
                      <span className="text-[11px] text-[var(--on-surface-variant)] uppercase font-bold tracking-wide">Run Rate Meter</span>
                      <div className="flex justify-between items-center text-[13px] mt-3">
                        <span className="text-[var(--on-surface)]">Current Run Rate (CRR):</span>
                        <strong className="text-[var(--primary)] text-[16px]">{crr}</strong>
                      </div>
                      {target > 0 && (
                        <div className="flex justify-between items-center text-[13px] border-t border-[var(--outline-variant)] pt-3 mt-3">
                          <span className="text-[var(--on-surface)]">Required Run Rate (RRR):</span>
                          <strong className="text-[var(--warning)] text-[16px]">{rrr}</strong>
                        </div>
                      )}
                    </div>

                    <div className="bg-[var(--surface-container)] p-5 rounded-2xl">
                      <span className="text-[11px] text-[var(--on-surface-variant)] uppercase font-bold tracking-wide">Partnership</span>
                      <div className="flex justify-between items-center text-[13px] mt-3">
                        <span className="text-[var(--on-surface)]">Batting Partnership:</span>
                        <strong className="text-[var(--on-surface)] text-[16px]">{activePartnership} runs</strong>
                      </div>
                      <span className="text-[11px] text-[var(--on-surface-variant)] italic block mt-2">
                        {sc.activeStriker?.name || 'Striker'} & {sc.activeNonStriker?.name || 'Non-Striker'}
                      </span>
                    </div>
                  </div>

                  {target > 0 && (
                    <div className="bg-[var(--warning-container)] p-6 rounded-2xl text-center">
                      <span className="flex justify-center items-center gap-2 text-[12px] text-[var(--on-warning-container)] uppercase font-black tracking-wider"><Target size={14}/> Target Tracker</span>
                      <div className="text-[20px] text-[var(--on-warning-container)] font-bold mt-2">
                        Need <span className="text-[var(--warning)] text-[26px] mx-1">{runsNeeded}</span> runs off <span className="text-[var(--primary)] text-[26px] mx-1">{remainingBalls}</span> deliveries remaining!
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}

export default function LiveStadium() {
  return (
    <Suspense fallback={<Loader text="" fullScreen />}>
      <LiveStadiumContent />
    </Suspense>
  );
}
