"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

  // Sync WebSocket updates
  useEffect(() => {
    fetchStadiumData();

    let socket;
    let reconnectTimeout;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-stream`;
      console.log('[WS Player] Connecting to:', wsUrl);
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const updatedMatch = JSON.parse(event.data);
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
          console.error('[WS Player] Failed to parse socket message:', err);
        }
      };

      socket.onclose = () => {
        console.log('[WS Player] Connection closed. Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('[WS Player] Socket error:', err);
        socket.close();
      };
    }

    connect();

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
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
      clearTimeout(reconnectTimeout);
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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#060913', color: 'var(--text-main)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '18px', color: 'var(--text-muted)' }}>Entering Stadium Hub...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // Visual placeholders if no match is currently running or scheduled
  if (!activeMatch) {
    return (
      <div style={{ background: '#060913', minHeight: '100vh', color: 'var(--text-main)', display: 'flex', flexDirection: 'column' }}>
        <nav className="navbar">
          <div className="nav-brand"><span>🏏</span> Live Stadium Portal</div>
          <div className="nav-links">
            <button onClick={() => router.push('/')} className="btn btn-secondary">Back to Dashboard</button>
          </div>
        </nav>
        <main className="main-wrapper" style={{ paddingTop: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <div className="glass-card text-center p-30" style={{ maxWidth: '600px' }}>
            <span style={{ fontSize: '64px' }}>📡</span>
            <h2 style={{ color: 'white', fontSize: '24px', marginTop: '20px', marginBottom: '8px' }}>Stadium Screens Off</h2>
            <p style={{ color: 'var(--text-muted)' }}>
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
      
      let bubbleClass = 'ball-run';
      let displayText = comm.runs;

      if (isWicket) {
        bubbleClass = 'ball-wicket';
        displayText = 'W';
      } else if (isFour) {
        bubbleClass = 'ball-boundary-four';
        displayText = '4';
      } else if (isSix) {
        bubbleClass = 'ball-boundary-six';
        displayText = '6';
      } else if (isDot) {
        bubbleClass = 'ball-dot';
        displayText = '•';
      } else if (isExtra) {
        bubbleClass = 'ball-extra';
        displayText = comm.runs + 'ex';
      }

      return (
        <span key={comm._id || idx} className={`ball-bubble ${bubbleClass}`} title={comm.description}>
          {displayText}
        </span>
      );
    });

  return (
    <div style={{ background: '#060913', minHeight: '100vh', color: 'var(--text-main)' }}>
      
      <nav className="navbar">
        <div className="nav-brand">
          <span>🏏</span> stadium live matchcast
        </div>
        <div className="nav-links">
          {user && <span className="user-badge" style={{ fontSize: '11px' }}>Attending: {user.name}</span>}
          <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Player Dashboard
          </button>
        </div>
      </nav>

      <main className="main-wrapper" style={{ paddingTop: '100px' }}>
        
        {/* Dynamic TV Scoreboard Ticker */}
        {sc.status === 'live' && (
          <div className="ticker-wrap" style={{ position: 'fixed', top: '70px', left: 0, right: 0, zIndex: 99 }}>
            <div className="ticker-track">
              <div className="ticker-content">
                <span className="ticker-item">🏆 LIVE: <span>{activeMatch.title}</span></span>
                <span className="ticker-item">🏏 SCORE: <strong>{sc.runs}/{sc.wickets}</strong> <span>({sc.overs}.{sc.balls} ov)</span></span>
                {sc.activeStriker?.name && <span className="ticker-item">🏏 Striker: <strong>{sc.activeStriker.name}*</strong> ({sc.activeStriker.runs} runs)</span>}
                {sc.activeBowler?.name && <span className="ticker-item">🔴 Bowler: <strong>{sc.activeBowler.name}</strong> ({sc.activeBowler.wickets}/{sc.activeBowler.runsConceded})</span>}
                {sc.commentary && sc.commentary.length > 0 && <span className="ticker-item">🎙️ Last Ball: <span>{sc.commentary[0].description}</span></span>}
              </div>
              <div className="ticker-content" aria-hidden="true">
                <span className="ticker-item">🏆 LIVE: <span>{activeMatch.title}</span></span>
                <span className="ticker-item">🏏 SCORE: <strong>{sc.runs}/{sc.wickets}</strong> <span>({sc.overs}.{sc.balls} ov)</span></span>
                {sc.activeStriker?.name && <span className="ticker-item">🏏 Striker: <strong>{sc.activeStriker.name}*</strong> ({sc.activeStriker.runs} runs)</span>}
                {sc.activeBowler?.name && <span className="ticker-item">🔴 Bowler: <strong>{sc.activeBowler.name}</strong> ({sc.activeBowler.wickets}/{sc.activeBowler.runsConceded})</span>}
                {sc.commentary && sc.commentary.length > 0 && <span className="ticker-item">🎙️ Last Ball: <span>{sc.commentary[0].description}</span></span>}
              </div>
            </div>
          </div>
        )}

        <div className="grid-2 mt-20" style={{ gap: '30px', alignItems: 'flex-start', paddingTop: sc.status === 'live' ? '45px' : '0' }}>
          
          {/* Main Visual Scoreboard Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="scoreboard-display" style={{ padding: '30px', background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(0,0,0,0.4) 100%)', border: '2px solid rgba(16, 185, 129, 0.25)', boxShadow: '0 15px 35px rgba(0,0,0,0.4)' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', marginBottom: '15px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {sc.battingTeam} Batting
                </span>
                {sc.status === 'live' ? (
                  <span className="live-badge-pulse" style={{ padding: '4px 8px', fontSize: '10px' }}>LIVE MATCHCAST</span>
                ) : sc.status === 'completed' ? (
                  <span className="user-badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>🏁 FINISHED</span>
                ) : (
                  <span className="user-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>📅 SCHEDULED</span>
                )}
              </div>

              <div className="score-main" style={{ fontSize: '64px', fontWeight: '900', textShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}>
                {sc.runs} / {sc.wickets}
              </div>

              <div className="score-sub" style={{ fontSize: '16px', display: 'flex', gap: '20px', color: 'var(--text-muted)' }}>
                <span>Overs: <strong style={{ color: 'white', fontSize: '20px' }}>{sc.overs}.{sc.balls}</strong></span>
                {target > 0 && <span>🎯 Target: <strong style={{ color: 'white', fontSize: '20px' }}>{target}</strong></span>}
              </div>
            </div>

            {/* Active Players Bar */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Batter (Striker)</span>
                  {sc.activeStriker?.name ? (
                    <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                      🏏 {sc.activeStriker.name}* <span style={{ color: 'white', marginLeft: '5px' }}>{sc.activeStriker.runs} ({sc.activeStriker.balls}b)</span>
                    </strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting striker...</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Batter (Non-Striker)</span>
                  {sc.activeNonStriker?.name ? (
                    <strong style={{ color: 'white', fontSize: '15px' }}>
                      {sc.activeNonStriker.name} <span style={{ marginLeft: '5px' }}>{sc.activeNonStriker.runs} ({sc.activeNonStriker.balls}b)</span>
                    </strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting non-striker...</span>
                  )}
                </div>
              </div>

              <div className="flex-between">
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Active Bowler</span>
                  {sc.activeBowler?.name ? (
                    <strong style={{ color: 'white', fontSize: '14px' }}>
                      🔴 {sc.activeBowler.name}
                    </strong>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting bowler...</span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {sc.activeBowler?.name && (
                    <strong style={{ color: 'var(--color-secondary)', fontSize: '15px' }}>
                      {sc.activeBowler.wickets} / {sc.activeBowler.runsConceded} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({sc.activeBowler.overs}.{sc.activeBowler.balls} ov)</span>
                    </strong>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Deliveries row */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '10px', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Recent Deliveries (Last 10 Balls)</span>
              {recentBallsBubbles.length > 0 ? (
                <div className="recent-balls-container">{recentBallsBubbles}</div>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for the first delivery...</span>
              )}
            </div>

            {/* List other matches sidebar */}
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '20px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '12px', textTransform: 'uppercase' }}>Other Club matches</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                {matches.filter(m => m._id !== activeMatch._id).map(m => (
                  <div key={m._id} onClick={() => router.push(`/live?matchId=${m._id}`)} style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.02)',
                    background: 'rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'var(--transition-smooth)'
                  }} className="other-match-card-hover">
                    <div>
                      <strong style={{ fontSize: '13px', color: 'white' }}>{m.title}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>📍 {m.location}</span>
                    </div>
                    <span className="user-badge" style={{ fontSize: '10px' }}>{m.scorecard?.status}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Interactive Commentary Feed and Text-to-Speech Control Center */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Premium TTS Audio Announcer Card */}
            <div className="glass-card p-20" style={{ border: '1px solid rgba(14, 165, 233, 0.3)', background: 'linear-gradient(135deg, rgba(14,165,233,0.04) 0%, rgba(9,13,22,0.6) 100%)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '150px', height: '150px', background: 'rgba(14, 165, 233, 0.08)', borderRadius: '50%', filter: 'blur(50px)', zIndex: 0 }} />
              
              <div className="flex-between" style={{ zIndex: 1, position: 'relative' }}>
                <div>
                  <h3 style={{ color: 'white', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎙️ Stadium Voice Commentary
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '2px' }}>
                    Speak dynamically generated commentary sentences out loud in real time!
                  </p>
                </div>
                
                {/* Visual Speaking Equalizer Animation */}
                {isSpeaking && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px', width: '25px' }}>
                    <div className="eq-bar eq-bar-1" />
                    <div className="eq-bar eq-bar-2" />
                    <div className="eq-bar eq-bar-3" />
                    <div className="eq-bar eq-bar-4" />
                    <style>{`
                      .eq-bar { width: 3px; background: var(--color-primary); border-radius: 1px; }
                      .eq-bar-1 { height: 10px; animation: eq 0.6s ease infinite alternate; }
                      .eq-bar-2 { height: 15px; animation: eq 0.8s ease infinite alternate 0.15s; }
                      .eq-bar-3 { height: 8px; animation: eq 0.5s ease infinite alternate 0.3s; }
                      .eq-bar-4 { height: 12px; animation: eq 0.7s ease infinite alternate 0.05s; }
                      @keyframes eq { 0% { height: 3px; } 100% { height: 100%; } }
                    `}</style>
                  </div>
                )}
              </div>

              <div className="flex-between mt-20" style={{ zIndex: 1, position: 'relative', gap: '15px' }}>
                <button
                  onClick={toggleAudio}
                  className={`btn ${audioEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    flex: 1,
                    padding: '10px',
                    fontWeight: '700',
                    background: audioEnabled ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'rgba(255,255,255,0.03)',
                    border: audioEnabled ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {audioEnabled ? '🔊 Live Audio Voice Active' : '🔇 Turn Live Audio Voice ON'}
                </button>
              </div>

              {audioEnabled && (
                <div className="mt-16" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', zIndex: 1, position: 'relative', fontSize: '11px' }}>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Choose Voice Engine</label>
                    <select
                      className="form-input"
                      value={selectedVoiceName}
                      onChange={(e) => setSelectedVoiceName(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: '12px', background: '#0b0f19', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {availableVoices.map(v => (
                        <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2" style={{ gap: '10px', marginBottom: '0' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Speech Rate: {speechRate}x</span>
                      <input
                        type="range"
                        min="0.6"
                        max="1.5"
                        step="0.1"
                        value={speechRate}
                        onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#0ea5e9' }}
                      />
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Pitch Level: {speechPitch}</span>
                      <input
                        type="range"
                        min="0.7"
                        max="1.3"
                        step="0.1"
                        value={speechPitch}
                        onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                        style={{ width: '100%', accentColor: '#0ea5e9' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stadium Navigation Tabs */}
            <div style={{ width: '100%' }}>
              <div className="live-tabs-nav" style={{ marginBottom: '15px' }}>
                <button onClick={() => setActiveLiveTab('commentary')} className={`live-tab-btn ${activeLiveTab === 'commentary' ? 'active' : ''}`}>
                  🎙️ Dynamic Commentary
                </button>
                <button onClick={() => setActiveLiveTab('scorecard')} className={`live-tab-btn ${activeLiveTab === 'scorecard' ? 'active' : ''}`}>
                  📊 Team Scorecard
                </button>
                <button onClick={() => setActiveLiveTab('analytics')} className={`live-tab-btn ${activeLiveTab === 'analytics' ? 'active' : ''}`}>
                  📈 Chase Analytics
                </button>
              </div>

              {/* Dynamic Commentary Tab Content */}
              {activeLiveTab === 'commentary' && (
                <div style={{ maxHeight: '380px', overflowY: 'auto' }} className="commentary-container">
                  {sc.commentary && sc.commentary.length > 0 ? (
                    sc.commentary.map((comm, idx) => {
                      const descUpper = comm.description?.toUpperCase() || '';
                      const isWicket = descUpper.includes('OUT!');
                      const isFour = comm.runs === 4 && !descUpper.includes('EXTRA');
                      const isSix = comm.runs === 6 && !descUpper.includes('EXTRA');
                      return (
                        <div key={comm._id || idx} className="commentary-item" style={{ borderLeft: isWicket ? '4px solid var(--color-danger)' : isFour || isSix ? '4px solid var(--color-secondary)' : '4px solid var(--color-primary)' }}>
                          <div className="flex-between" style={{ marginBottom: '4px' }}>
                            <span className="commentary-ball" style={{ fontWeight: '800', color: 'white' }}>Ball {comm.ball}</span>
                            {isWicket ? (
                              <span className="badge-status badge-no" style={{ fontSize: '9px', padding: '1px 5px' }}>WICKET</span>
                            ) : isFour || isSix ? (
                              <span className="badge-status badge-yes" style={{ fontSize: '9px', padding: '1px 5px', background: isFour ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)', color: isFour ? 'var(--color-primary)' : 'var(--color-secondary)', border: isFour ? '1px solid var(--color-primary)' : '1px solid var(--color-secondary)' }}>
                                {isFour ? 'FOUR' : 'SIX'}
                              </span>
                            ) : null}
                          </div>
                          <p style={{ fontSize: '13px', lineHeight: '1.4', color: 'rgba(255,255,255,0.85)' }}>
                            <strong style={{ color: 'white' }}>{comm.runs} Run(s)</strong> — {comm.description}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                      Waiting for the umpire to record the opening delivery. Live commentary will stream dynamically here!
                    </div>
                  )}
                </div>
              )}

              {/* Full Scorecard Tab Content */}
              {activeLiveTab === 'scorecard' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '380px', overflowY: 'auto' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Batting Roster</h4>
                    {sc.batsmenStats && sc.batsmenStats.length > 0 ? (
                      <div className="custom-table-container">
                        <table className="custom-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px 12px' }}>Batsman</th>
                              <th style={{ padding: '8px 12px' }}>Dismissal Info</th>
                              <th style={{ padding: '8px 12px' }}>Runs</th>
                              <th style={{ padding: '8px 12px' }}>Balls</th>
                              <th style={{ padding: '8px 12px' }}>4s</th>
                              <th style={{ padding: '8px 12px' }}>6s</th>
                              <th style={{ padding: '8px 12px' }}>SR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sc.batsmenStats.map((b) => (
                              <tr key={b.userId || b.name}>
                                <td style={{ padding: '8px 12px' }}><strong>{b.name}</strong></td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{b.dismissalInfo}</td>
                                <td style={{ padding: '8px 12px' }}>{b.runs}</td>
                                <td style={{ padding: '8px 12px' }}>{b.balls}</td>
                                <td style={{ padding: '8px 12px' }}>{b.fours}</td>
                                <td style={{ padding: '8px 12px' }}>{b.sixes}</td>
                                <td style={{ padding: '8px 12px' }}>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No batting stats logged yet.</p>
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--color-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Bowling Roster</h4>
                    {sc.bowlersStats && sc.bowlersStats.length > 0 ? (
                      <div className="custom-table-container">
                        <table className="custom-table" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: '8px 12px' }}>Bowler</th>
                              <th style={{ padding: '8px 12px' }}>Overs</th>
                              <th style={{ padding: '8px 12px' }}>Runs</th>
                              <th style={{ padding: '8px 12px' }}>Wickets</th>
                              <th style={{ padding: '8px 12px' }}>Econ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sc.bowlersStats.map((bo) => {
                              const totalBowlerBalls = (bo.overs || 0) * 6 + (bo.balls || 0);
                              const econ = totalBowlerBalls > 0 ? ((bo.runsConceded / totalBowlerBalls) * 6).toFixed(2) : '0.00';
                              return (
                                <tr key={bo.userId || bo.name}>
                                  <td style={{ padding: '8px 12px' }}><strong>{bo.name}</strong></td>
                                  <td style={{ padding: '8px 12px' }}>{bo.overs}.{bo.balls}</td>
                                  <td style={{ padding: '8px 12px' }}>{bo.runsConceded}</td>
                                  <td style={{ padding: '8px 12px' }}><strong>{bo.wickets}</strong></td>
                                  <td style={{ padding: '8px 12px' }}>{econ}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No bowling stats logged yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Analytics Tab Content */}
              {activeLiveTab === 'analytics' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="grid-2" style={{ gap: '15px' }}>
                    <div className="stats-grid-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Run Rate Meter</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                        <span>Current Run Rate (CRR):</span>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '16px' }}>{crr}</strong>
                      </div>
                      {target > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: '8px', fontSize: '13px' }}>
                          <span>Required Run Rate (RRR):</span>
                          <strong style={{ color: 'var(--color-warning)', fontSize: '16px' }}>{rrr}</strong>
                        </div>
                      )}
                    </div>

                    <div className="stats-grid-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partnership</span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                        <span>Batting Partnership:</span>
                        <strong style={{ color: 'white', fontSize: '16px' }}>{activePartnership} runs</strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'block', marginTop: '4px' }}>
                        {sc.activeStriker?.name || 'Striker'} & {sc.activeNonStriker?.name || 'Non-Striker'}
                      </span>
                    </div>
                  </div>

                  {target > 0 && (
                    <div className="stats-grid-card" style={{ padding: '20px', background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-warning)', textTransform: 'uppercase', fontWeight: '800' }}>Target Tracker</span>
                      <div style={{ fontSize: '18px', color: 'white', fontWeight: '700', marginTop: '6px' }}>
                        Need <span style={{ color: 'var(--color-warning)', fontSize: '22px' }}>{runsNeeded}</span> runs off <span style={{ color: 'var(--color-secondary)', fontSize: '22px' }}>{remainingBalls}</span> deliveries remaining!
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
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#060913', color: 'var(--text-main)' }}>
        <p>Loading Stadium Broadcast Engine...</p>
      </div>
    }>
      <LiveStadiumContent />
    </Suspense>
  );
}
