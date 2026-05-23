"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlayerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Expandable sections per Match ID
  const [expandedBillingMatchId, setExpandedBillingMatchId] = useState(null);
  const [expandedScorecardMatchId, setExpandedScorecardMatchId] = useState(null);
  const [activeLiveTab, setActiveLiveTab] = useState('commentary'); // 'commentary', 'scorecard', 'analytics'
  const [activeMatchTabs, setActiveMatchTabs] = useState({}); // { [matchId]: 'commentary' }

  const setActiveTabForMatch = (matchId, tab) => {
    setActiveMatchTabs((prev) => ({
      ...prev,
      [matchId]: tab,
    }));
  };

  const fetchDashboardData = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUser(authData.user);

      const matchesRes = await fetch('/api/matches');
      const matchesData = await matchesRes.json();
      setMatches(matchesData.matches || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Establish Pusher Channels connection for true push stream live updates
  useEffect(() => {
    fetchDashboardData();

    let pusher;
    let channel;

    async function connectPusher() {
      const PusherClient = (await import('pusher-js')).default;
      pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });

      channel = pusher.subscribe('cricket-live');
      console.log('[Pusher] Subscribed to cricket-live channel');

      channel.bind('match-update', (liveMatchData) => {
        try {
          if (liveMatchData && liveMatchData._refetch) {
            // Payload was too large — re-fetch from API
            fetchDashboardData();
            return;
          }
          if (liveMatchData && liveMatchData._id) {
            // Reactively replace the live match entry in our local list to trigger immediate UI scores refresh
            setMatches((prevMatches) =>
              prevMatches.map((m) => (m._id === liveMatchData._id ? liveMatchData : m))
            );
          }
        } catch (err) {
          // Silent catch for unexpected payload formats
        }
      });
    }

    connectPusher();

    return () => {
      if (channel) channel.unbind_all();
      if (pusher) pusher.disconnect();
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleRsvp = async (matchId, status) => {
    setRsvpLoading(matchId);
    try {
      const res = await fetch(`/api/matches/${matchId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`RSVP updated to ${status.toUpperCase()}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      
      setMatches((prevMatches) =>
        prevMatches.map((m) => (m._id === matchId ? data.match : m))
      );
    } catch (error) {
      alert(error.message || 'Failed to update RSVP');
    } finally {
      setRsvpLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div className="loading-spinner" />
          <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Loading Cricket Portal...</p>
        </div>
      </div>
    );
  }

  const liveMatch = matches.find((m) => m.scorecard?.status === 'live');

  return (
    <div>
      {/* Navbar Header */}
      <nav className="navbar">
        <div className="nav-brand" onClick={() => router.push('/')}>
          <img src="/curius-logo.png" alt="Curius" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
          Curius Cricket
        </div>
        <div className="nav-links">
          {user && (
            <div className="nav-user-info">
              <span>Welcome, <strong>{user.name}</strong></span>
              <span className="user-badge">{user.role}</span>
              <button
                onClick={() => router.push('/live')}
                className="btn btn-primary"
                style={{ padding: '6px 14px', fontSize: '12px', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', border: 'none' }}
              >
                🟢 Live Match
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  Admin Center
                </button>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '13px' }}>
            Log Out
          </button>
        </div>
      </nav>

      {/* Dynamic TV Broadcast Scrolling Ticker Marquee */}
      {liveMatch && (
        <div className="ticker-wrap">
          <div className="ticker-track">
            <div className="ticker-content">
              <span className="ticker-item">🏆 LIVE NOW: <span>{liveMatch.title}</span></span>
              <span className="ticker-item">🏏 SCORE: <strong>{liveMatch.scorecard.runs}/{liveMatch.scorecard.wickets}</strong> <span>({liveMatch.scorecard.overs}.{liveMatch.scorecard.balls} ov)</span></span>
              {liveMatch.scorecard.activeStriker?.name && (
                <span className="ticker-item">🏏 Striker: <strong>{liveMatch.scorecard.activeStriker.name}*</strong> <span>{liveMatch.scorecard.activeStriker.runs} ({liveMatch.scorecard.activeStriker.balls}b)</span></span>
              )}
              {liveMatch.scorecard.activeNonStriker?.name && (
                <span className="ticker-item">🏏 Non-Striker: <span>{liveMatch.scorecard.activeNonStriker.name} {liveMatch.scorecard.activeNonStriker.runs} ({liveMatch.scorecard.activeNonStriker.balls}b)</span></span>
              )}
              {liveMatch.scorecard.activeBowler?.name && (
                <span className="ticker-item">🔴 Bowler: <strong>{liveMatch.scorecard.activeBowler.name}</strong> <span>{liveMatch.scorecard.activeBowler.wickets}/{liveMatch.scorecard.activeBowler.runsConceded} ({liveMatch.scorecard.activeBowler.overs}.{liveMatch.scorecard.activeBowler.balls} ov)</span></span>
              )}
              {liveMatch.scorecard.commentary && liveMatch.scorecard.commentary.length > 0 && (
                <span className="ticker-item">🎙️ Last Ball: <span>({liveMatch.scorecard.commentary[0].ball}) {liveMatch.scorecard.commentary[0].description}</span></span>
              )}
            </div>
            <div className="ticker-content" aria-hidden="true">
              <span className="ticker-item">🏆 LIVE NOW: <span>{liveMatch.title}</span></span>
              <span className="ticker-item">🏏 SCORE: <strong>{liveMatch.scorecard.runs}/{liveMatch.scorecard.wickets}</strong> <span>({liveMatch.scorecard.overs}.{liveMatch.scorecard.balls} ov)</span></span>
              {liveMatch.scorecard.activeStriker?.name && (
                <span className="ticker-item">🏏 Striker: <strong>{liveMatch.scorecard.activeStriker.name}*</strong> <span>{liveMatch.scorecard.activeStriker.runs} ({liveMatch.scorecard.activeStriker.balls}b)</span></span>
              )}
              {liveMatch.scorecard.activeNonStriker?.name && (
                <span className="ticker-item">🏏 Non-Striker: <span>{liveMatch.scorecard.activeNonStriker.name} {liveMatch.scorecard.activeNonStriker.runs} ({liveMatch.scorecard.activeNonStriker.balls}b)</span></span>
              )}
              {liveMatch.scorecard.activeBowler?.name && (
                <span className="ticker-item">🔴 Bowler: <strong>{liveMatch.scorecard.activeBowler.name}</strong> <span>{liveMatch.scorecard.activeBowler.wickets}/{liveMatch.scorecard.activeBowler.runsConceded} ({liveMatch.scorecard.activeBowler.overs}.{liveMatch.scorecard.activeBowler.balls} ov)</span></span>
              )}
              {liveMatch.scorecard.commentary && liveMatch.scorecard.commentary.length > 0 && (
                <span className="ticker-item">🎙️ Last Ball: <span>({liveMatch.scorecard.commentary[0].ball}) {liveMatch.scorecard.commentary[0].description}</span></span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Wrapper (adjusts padding dynamically if live ticker is active) */}
      <main className="main-wrapper" style={{ paddingTop: liveMatch ? '125px' : '80px', transition: 'var(--transition-smooth)' }}>
        
        {/* Featured Live Scorecard widget */}
        {(() => {
          if (!liveMatch) return null;
          
          // Compute Analytics variables dynamically
          const totalBallsBowled = (liveMatch.scorecard.overs || 0) * 6 + (liveMatch.scorecard.balls || 0);
          const crr = totalBallsBowled > 0 ? ((liveMatch.scorecard.runs || 0) / totalBallsBowled * 6).toFixed(2) : '0.00';
          
          const target = liveMatch.scorecard.target || 0;
          const runsNeeded = target - (liveMatch.scorecard.runs || 0);
          const totalMatchBalls = 120; // 20 overs default
          const remainingBalls = Math.max(0, totalMatchBalls - totalBallsBowled);
          const rrr = remainingBalls > 0 ? (runsNeeded / remainingBalls * 6).toFixed(2) : '0.00';
          
          const strikerRuns = liveMatch.scorecard.activeStriker?.runs || 0;
          const nonStrikerRuns = liveMatch.scorecard.activeNonStriker?.runs || 0;
          const activePartnership = strikerRuns + nonStrikerRuns;

          // circular ball bubbles parsing
          const recentBalls = (liveMatch.scorecard.commentary || [])
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
            <div className="glass-card mb-30 p-30" style={{ border: '2px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 35px rgba(239, 68, 68, 0.15)' }}>
              <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '20px' }}>
                <div className="gap-12" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span className="live-badge-pulse">Live Matchcast Hub</span>
                  <h2 style={{ fontSize: '20px', color: 'white', margin: 0 }}>Featured Match: {liveMatch.title}</h2>
                  <button
                    onClick={() => router.push(`/live?matchId=${liveMatch._id}`)}
                    className="btn btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '11px',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                      border: 'none',
                      boxShadow: '0 0 10px rgba(14, 165, 233, 0.4)'
                    }}
                  >
                    🎙️ Enter Talking Matchcast Hub
                  </button>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📍 {liveMatch.location}</span>
              </div>

              <div className="grid-2" style={{ gap: '20px', alignItems: 'flex-start' }}>
                
                {/* Scoreboard Overview Graphic panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="scoreboard-display">
                    <div style={{ color: 'var(--color-primary)', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                      🏏 {liveMatch.scorecard.battingTeam} VS {liveMatch.scorecard.bowlingTeam}
                    </div>
                    <div className="score-main">
                      {liveMatch.scorecard.runs} / {liveMatch.scorecard.wickets}
                    </div>
                    <div className="score-sub">
                      Overs: <strong style={{ color: 'white', fontSize: '18px' }}>{liveMatch.scorecard.overs}.{liveMatch.scorecard.balls}</strong>
                      {liveMatch.scorecard.target > 0 && <span style={{ marginLeft: '15px' }}>🎯 Target: {liveMatch.scorecard.target}</span>}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Batter (Striker)</span>
                        {liveMatch.scorecard.activeStriker?.name ? (
                          <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>
                            🏏 {liveMatch.scorecard.activeStriker.name}* <span style={{ color: 'white', marginLeft: '5px' }}>{liveMatch.scorecard.activeStriker.runs} ({liveMatch.scorecard.activeStriker.balls}b)</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px' }}>{liveMatch.scorecard.activeStriker.fours}x4 | {liveMatch.scorecard.activeStriker.sixes}x6</span>
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting striker...</span>
                        )}
                      </div>

                      <div style={{ flex: 1, textAlign: 'right', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '15px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Batter (Non-Striker)</span>
                        {liveMatch.scorecard.activeNonStriker?.name ? (
                          <strong style={{ color: 'white', fontSize: '14px' }}>
                            {liveMatch.scorecard.activeNonStriker.name} <span style={{ marginLeft: '5px' }}>{liveMatch.scorecard.activeNonStriker.runs} ({liveMatch.scorecard.activeNonStriker.balls}b)</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px' }}>{liveMatch.scorecard.activeNonStriker.fours}x4 | {liveMatch.scorecard.activeNonStriker.sixes}x6</span>
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting non-striker...</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-between">
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Bowler</span>
                        {liveMatch.scorecard.activeBowler?.name ? (
                          <strong style={{ color: 'white', fontSize: '14px' }}>
                            🔴 {liveMatch.scorecard.activeBowler.name}
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>Selecting bowler...</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {liveMatch.scorecard.activeBowler?.name && (
                          <strong style={{ color: 'var(--color-secondary)', fontSize: '15px' }}>
                            {liveMatch.scorecard.activeBowler.wickets} / {liveMatch.scorecard.activeBowler.runsConceded}
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '8px' }}>({liveMatch.scorecard.activeBowler.overs}.{liveMatch.scorecard.activeBowler.balls} ov)</span>
                          </strong>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent balls indicator row */}
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Recent Deliveries</span>
                    {recentBalls.length > 0 ? (
                      <div className="recent-balls-container">
                        {recentBalls}
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for first delivery...</span>
                    )}
                  </div>
                </div>

                {/* Tabbed Commentary, Scorecard, and Analytics section */}
                <div style={{ width: '100%' }}>
                  <div className="live-tabs-nav">
                    <button onClick={() => setActiveLiveTab('commentary')} className={`live-tab-btn ${activeLiveTab === 'commentary' ? 'active' : ''}`}>
                      🎙️ Commentary Feed
                    </button>
                    <button onClick={() => setActiveLiveTab('scorecard')} className={`live-tab-btn ${activeLiveTab === 'scorecard' ? 'active' : ''}`}>
                      📊 Team Scorecard
                    </button>
                    <button onClick={() => setActiveLiveTab('analytics')} className={`live-tab-btn ${activeLiveTab === 'analytics' ? 'active' : ''}`}>
                      📈 Analytics
                    </button>
                  </div>

                  {activeLiveTab === 'commentary' && (
                    <div style={{ maxHeight: '310px', overflowY: 'auto' }} className="commentary-container">
                      {liveMatch.scorecard.commentary && liveMatch.scorecard.commentary.length > 0 ? (
                        liveMatch.scorecard.commentary.map((comm, idx) => {
                          const descUpper = comm.description?.toUpperCase() || '';
                          const isWicket = descUpper.includes('OUT!');
                          const isFour = comm.runs === 4 && !descUpper.includes('EXTRA');
                          const isSix = comm.runs === 6 && !descUpper.includes('EXTRA');
                          return (
                            <div key={comm._id || idx} className="commentary-item" style={{ borderLeft: isWicket ? '3px solid var(--color-danger)' : isFour || isSix ? '3px solid var(--color-secondary)' : '3px solid var(--color-primary)' }}>
                              <div className="flex-between" style={{ marginBottom: '4px' }}>
                                <span className="commentary-ball">Over {comm.ball}</span>
                                {isWicket ? (
                                  <span className="badge-status badge-no" style={{ fontSize: '10px' }}>WICKET</span>
                                ) : isFour || isSix ? (
                                  <span className="badge-status badge-yes" style={{ fontSize: '10px', background: isFour ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)', color: isFour ? 'var(--color-primary)' : 'var(--color-secondary)', border: isFour ? '1px solid var(--color-primary)' : '1px solid var(--color-secondary)' }}>
                                    {isFour ? 'FOUR' : 'SIX'}
                                  </span>
                                ) : null}
                              </div>
                              <strong>{comm.runs} run{comm.runs !== 1 ? 's' : ''}</strong> - {comm.description}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                          No commentary logged yet. Admin is preparing the match.
                        </div>
                      )}
                    </div>
                  )}

                  {activeLiveTab === 'scorecard' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '310px', overflowY: 'auto', paddingRight: '5px' }}>
                      <div>
                        <h4 style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: '8px', textTransform: 'uppercase' }}>Batting Scorecard</h4>
                        {liveMatch.scorecard.batsmenStats && liveMatch.scorecard.batsmenStats.length > 0 ? (
                          <div className="custom-table-container">
                            <table className="custom-table" style={{ fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '6px 10px' }}>Batsman</th>
                                  <th style={{ padding: '6px 10px' }}>Status</th>
                                  <th style={{ padding: '6px 10px' }}>Runs</th>
                                  <th style={{ padding: '6px 10px' }}>Balls</th>
                                  <th style={{ padding: '6px 10px' }}>4s</th>
                                  <th style={{ padding: '6px 10px' }}>6s</th>
                                  <th style={{ padding: '6px 10px' }}>SR</th>
                                </tr>
                              </thead>
                              <tbody>
                                {liveMatch.scorecard.batsmenStats.map((b) => (
                                  <tr key={b.userId || b.name}>
                                    <td style={{ padding: '6px 10px' }}><strong>{b.name}</strong></td>
                                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{b.dismissalInfo}</td>
                                    <td style={{ padding: '6px 10px' }}>{b.runs}</td>
                                    <td style={{ padding: '6px 10px' }}>{b.balls}</td>
                                    <td style={{ padding: '6px 10px' }}>{b.fours}</td>
                                    <td style={{ padding: '6px 10px' }}>{b.sixes}</td>
                                    <td style={{ padding: '6px 10px' }}>{b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0'}</td>
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
                        <h4 style={{ fontSize: '13px', color: 'var(--color-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Bowling Scorecard</h4>
                        {liveMatch.scorecard.bowlersStats && liveMatch.scorecard.bowlersStats.length > 0 ? (
                          <div className="custom-table-container">
                            <table className="custom-table" style={{ fontSize: '12px' }}>
                              <thead>
                                <tr>
                                  <th style={{ padding: '6px 10px' }}>Bowler</th>
                                  <th style={{ padding: '6px 10px' }}>Overs</th>
                                  <th style={{ padding: '6px 10px' }}>Runs</th>
                                  <th style={{ padding: '6px 10px' }}>Wickets</th>
                                  <th style={{ padding: '6px 10px' }}>Econ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {liveMatch.scorecard.bowlersStats.map((bo) => {
                                  const totalBowlerBalls = (bo.overs || 0) * 6 + (bo.balls || 0);
                                  const econ = totalBowlerBalls > 0 ? ((bo.runsConceded / totalBowlerBalls) * 6).toFixed(2) : '0.00';
                                  return (
                                    <tr key={bo.userId || bo.name}>
                                      <td style={{ padding: '6px 10px' }}><strong>{bo.name}</strong></td>
                                      <td style={{ padding: '6px 10px' }}>{bo.overs}.{bo.balls}</td>
                                      <td style={{ padding: '6px 10px' }}>{bo.runsConceded}</td>
                                      <td style={{ padding: '6px 10px' }}><strong>{bo.wickets}</strong></td>
                                      <td style={{ padding: '6px 10px' }}>{econ}</td>
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

                  {activeLiveTab === 'analytics' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div className="grid-2" style={{ gap: '12px' }}>
                        <div className="stats-grid-card">
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Run Rate Meter</span>
                          <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                            <span>Current Run Rate (CRR):</span>
                            <strong style={{ color: 'var(--color-primary)', fontSize: '15px' }}>{crr}</strong>
                          </div>
                          {target > 0 && (
                            <div style={{ display: 'flex', justifycontent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '6px', fontSize: '13px' }}>
                              <span>Required Run Rate (RRR):</span>
                              <strong style={{ color: 'var(--color-warning)', fontSize: '15px' }}>{rrr}</strong>
                            </div>
                          )}
                        </div>

                        <div className="stats-grid-card">
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partnership Meter</span>
                          <div style={{ display: 'flex', justifycontent: 'space-between', fontSize: '13px', marginTop: '4px' }}>
                            <span>Active Partnership:</span>
                            <strong style={{ color: 'white', fontSize: '15px' }}>{activePartnership} runs</strong>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                            {liveMatch.scorecard.activeStriker?.name || 'Striker'} & {liveMatch.scorecard.activeNonStriker?.name || 'Non-Striker'}
                          </span>
                        </div>
                      </div>

                      {target > 0 && (
                        <div className="stats-grid-card" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-warning)', textTransform: 'uppercase', fontWeight: '800' }}>Chase Analytics</span>
                          <div style={{ fontSize: '16px', color: 'white', fontWeight: '700', marginTop: '4px' }}>
                            Need <span style={{ color: 'var(--color-warning)', fontSize: '18px' }}>{runsNeeded}</span> runs from <span style={{ color: 'var(--color-secondary)', fontSize: '18px' }}>{remainingBalls}</span> deliveries remaining!
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })()}

        {/* Club Intro Header */}
        <div className="glass-card mb-30 p-30" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="accent-glow" style={{ top: '-50px', right: '-50px' }} />
          
          <h1 style={{ fontSize: '32px', color: 'white', marginBottom: '8px', zIndex: 1, position: 'relative' }}>
            Club Schedules & Attendance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', zIndex: 1, position: 'relative' }}>
            Verify your squad attendance, submit Yes/No RSVPs, and track match ground fee divisions dynamically based on attendees!
          </p>

          {successMsg && (
            <div style={{ marginTop: '15px', padding: '10px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>
              ✓ {successMsg}
            </div>
          )}
        </div>

        {/* Matches Feed Grid */}
        {matches.length === 0 ? (
          <div className="glass-card empty-state">
            <div className="empty-state-icon">🏏</div>
            <h2 style={{ fontSize: '20px', color: 'white' }}>No Scheduled Matches Yet</h2>
            <p style={{ color: 'var(--text-muted)' }}>Wait for an email broadcast or admin scheduling updates!</p>
          </div>
        ) : (
          <div className="grid-2">
            {matches.map((match) => {
              const userRsvp = match.rsvps?.find((r) => r.userId === user.id);
              const yesAttendees = match.rsvps?.filter((r) => r.status === 'yes') || [];
              const yesCount = yesAttendees.length;
              
              const playerShare = yesCount > 0 ? ((match.totalCost || 0) / yesCount) : (match.totalCost || 0);
              
              const isBillingOpen = expandedBillingMatchId === match._id;
              const isScorecardOpen = expandedScorecardMatchId === match._id;

              return (
                <div key={match._id} className="glass-card p-24" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  <div>
                    <div className="flex-between" style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                      <div className="gap-12">
                        <h2 style={{ fontSize: '20px', color: 'white' }}>{match.title}</h2>
                        {match.scorecard?.status === 'live' && (
                          <span className="live-badge-pulse" style={{ fontSize: '9px', padding: '2px 6px' }}>Live</span>
                        )}
                        {match.scorecard?.status === 'completed' && (
                          <span className="user-badge" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '9px', padding: '2px 6px' }}>Finished</span>
                        )}
                      </div>
                      <span className="user-badge" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--color-primary)' }}>
                        Cost: ₹{(match.totalCost || 0).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
                      <p>📅 <strong style={{ color: 'white' }}>Date:</strong> {new Date(match.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p>⏰ <strong style={{ color: 'white' }}>Time:</strong> {match.time}</p>
                      <p>📍 <strong style={{ color: 'white' }}>Venue:</strong> {match.location}</p>
                      <p>👥 <strong style={{ color: 'white' }}>Attending Squad:</strong> {yesCount} player{yesCount !== 1 ? 's' : ''}</p>
                      
                      <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>💰 Shared Cost Per Player:</span>
                        <strong style={{ color: 'var(--color-primary)', fontSize: '16px' }}>₹{playerShare.toFixed(2)}</strong>
                      </div>

                      {match.notes && (
                        <p style={{ marginTop: '8px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--text-muted)', borderRadius: '4px', fontStyle: 'italic' }}>
                          💡 {match.notes}
                        </p>
                      )}
                    </div>

                    {match.scorecard?.status === 'live' && (
                      <div style={{ marginTop: '16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                        🏏 <strong>Live Match Score:</strong>
                        <div style={{ color: 'white', fontSize: '18px', fontWeight: '800', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{match.scorecard?.battingTeam || 'Team A'}: <span style={{ color: 'var(--color-primary)' }}>{match.scorecard?.runs || 0}/{match.scorecard?.wickets || 0}</span></span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({match.scorecard?.overs || 0}.{match.scorecard?.balls || 0} ov)</span>
                        </div>
                      </div>
                    )}

                    {match.scorecard?.status === 'completed' && (
                      <div style={{ marginTop: '16px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                        🏁 <strong>Match Completed Score:</strong>
                        <div style={{ color: 'white', fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>
                          {match.scorecard?.battingTeam || 'Team A'}: {match.scorecard?.runs || 0}/{match.scorecard?.wickets || 0} ({match.scorecard?.overs || 0}.{match.scorecard?.balls || 0} Overs)
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <h3 style={{ fontSize: '14px', color: 'white', marginBottom: '12px' }}>Your Attendance</h3>
                    
                    <div className="flex-between">
                      <div className="gap-12">
                        {userRsvp ? (
                          <>
                            <span className={`badge-status ${userRsvp.status === 'yes' ? 'badge-yes' : 'badge-no'}`}>
                              RSVP: {userRsvp.status}
                            </span>
                            {userRsvp.status === 'yes' && (
                              <span className={`badge-status ${userRsvp.paymentStatus === 'completed' ? 'badge-yes' : 'badge-pending'}`}>
                                Payment: {userRsvp.paymentStatus === 'completed' ? `Paid (₹${playerShare.toFixed(2)})` : `Pending (₹${playerShare.toFixed(2)})`}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="badge-status badge-pending">No RSVP Yet</span>
                        )}
                      </div>

                      <div className="gap-12">
                        <button
                          onClick={() => handleRsvp(match._id, 'yes')}
                          disabled={rsvpLoading === match._id}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '12px', background: userRsvp?.status === 'yes' ? 'var(--color-primary)' : 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--color-primary)' }}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => handleRsvp(match._id, 'no')}
                          disabled={rsvpLoading === match._id}
                          className="btn btn-danger"
                          style={{ padding: '8px 16px', fontSize: '12px', background: userRsvp?.status === 'no' ? 'var(--color-danger)' : 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)' }}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--card-border)', paddingTop: '14px' }}>
                        <button
                          onClick={() => setExpandedScorecardMatchId(isScorecardOpen ? null : match._id)}
                          className="btn btn-secondary"
                          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: '13px', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                        >
                          <span>📊 View Full Team Scorecard ({match.scorecard?.runs || 0}/{match.scorecard?.wickets || 0})</span>
                          <span>{isScorecardOpen ? '▲ Hide' : '▼ Expand'}</span>
                        </button>

                        {isScorecardOpen && (
                          <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {(() => {
                              const mTab = activeMatchTabs[match._id] || 'commentary';
                              const sc = match.scorecard || {
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

                              // Compute Analytics variables dynamically for this match
                              const totalBallsBowled = (sc.overs || 0) * 6 + (sc.balls || 0);
                              const crr = totalBallsBowled > 0 ? ((sc.runs || 0) / totalBallsBowled * 6).toFixed(2) : '0.00';
                              
                              const target = sc.target || 0;
                              const runsNeeded = target - (sc.runs || 0);
                              const totalMatchBalls = 120; // 20 overs default
                              const remainingBalls = Math.max(0, totalMatchBalls - totalBallsBowled);
                              const rrr = remainingBalls > 0 ? (runsNeeded / remainingBalls * 6).toFixed(2) : '0.00';
                              
                              const strikerRuns = sc.activeStriker?.runs || 0;
                              const nonStrikerRuns = sc.activeNonStriker?.runs || 0;
                              const activePartnership = strikerRuns + nonStrikerRuns;

                              // circular ball bubbles parsing for this match
                              const recentBalls = (sc.commentary || [])
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                  
                                  {/* Striker / Bowler overview widget inside the expanded card */}
                                  {(sc.activeStriker?.name || sc.activeBowler?.name) && (
                                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                        <div>
                                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Batter (Striker)</span>
                                          {sc.activeStriker?.name ? (
                                            <strong style={{ color: 'var(--color-primary)', fontSize: '13px' }}>
                                              🏏 {sc.activeStriker.name}* <span style={{ color: 'white', marginLeft: '5px' }}>{sc.activeStriker.runs} ({sc.activeStriker.balls}b)</span>
                                            </strong>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>N/A</span>
                                          )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Batter (Non-Striker)</span>
                                          {sc.activeNonStriker?.name ? (
                                            <strong style={{ color: 'white', fontSize: '13px' }}>
                                              {sc.activeNonStriker.name} <span style={{ marginLeft: '5px' }}>{sc.activeNonStriker.runs} ({sc.activeNonStriker.balls}b)</span>
                                            </strong>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>N/A</span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex-between">
                                        <div>
                                          <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', display: 'block' }}>Bowler</span>
                                          {sc.activeBowler?.name ? (
                                            <strong style={{ color: 'white', fontSize: '13px' }}>
                                              🔴 {sc.activeBowler.name}
                                            </strong>
                                          ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>N/A</span>
                                          )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                          {sc.activeBowler?.name && (
                                            <strong style={{ color: 'var(--color-secondary)', fontSize: '13px' }}>
                                              {sc.activeBowler.wickets} / {sc.activeBowler.runsConceded} ({sc.activeBowler.overs}.{sc.activeBowler.balls} ov)
                                            </strong>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recent Deliveries tracker */}
                                  <div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Recent Deliveries</span>
                                    {recentBalls.length > 0 ? (
                                      <div className="recent-balls-container">
                                        {recentBalls}
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting for deliveries...</span>
                                    )}
                                  </div>

                                  {/* Navigation tabs */}
                                  <div className="live-tabs-nav">
                                    <button onClick={() => setActiveTabForMatch(match._id, 'commentary')} className={`live-tab-btn ${mTab === 'commentary' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                      🎙️ Commentary
                                    </button>
                                    <button onClick={() => setActiveTabForMatch(match._id, 'scorecard')} className={`live-tab-btn ${mTab === 'scorecard' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                      📊 Scorecard
                                    </button>
                                    <button onClick={() => setActiveTabForMatch(match._id, 'analytics')} className={`live-tab-btn ${mTab === 'analytics' ? 'active' : ''}`} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                      📈 Analytics
                                    </button>
                                  </div>

                                  {/* Tab Contents */}
                                  {mTab === 'commentary' && (
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }} className="commentary-container">
                                      {match.scorecard.commentary && match.scorecard.commentary.length > 0 ? (
                                        match.scorecard.commentary.map((comm, idx) => {
                                          const descUpper = comm.description?.toUpperCase() || '';
                                          const isWicket = descUpper.includes('OUT!');
                                          const isFour = comm.runs === 4 && !descUpper.includes('EXTRA');
                                          const isSix = comm.runs === 6 && !descUpper.includes('EXTRA');
                                          return (
                                            <div key={comm._id || idx} className="commentary-item" style={{ borderLeft: isWicket ? '3px solid var(--color-danger)' : isFour || isSix ? '3px solid var(--color-secondary)' : '3px solid var(--color-primary)' }}>
                                              <div className="flex-between" style={{ marginBottom: '4px' }}>
                                                <span className="commentary-ball">Over {comm.ball}</span>
                                                {isWicket && <span className="badge-status badge-no" style={{ fontSize: '9px', padding: '1px 4px' }}>WICKET</span>}
                                                {(isFour || isSix) && (
                                                  <span className="badge-status badge-yes" style={{ fontSize: '9px', padding: '1px 4px', background: isFour ? 'rgba(16,185,129,0.1)' : 'rgba(14,165,233,0.1)', color: isFour ? 'var(--color-primary)' : 'var(--color-secondary)', border: isFour ? '1px solid var(--color-primary)' : '1px solid var(--color-secondary)' }}>
                                                    {isFour ? 'FOUR' : 'SIX'}
                                                  </span>
                                                )}
                                              </div>
                                              <strong>{comm.runs} run{comm.runs !== 1 ? 's' : ''}</strong> - {comm.description}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
                                          No commentary logged yet.
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {mTab === 'scorecard' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '250px', overflowY: 'auto' }}>
                                      <div>
                                        <h4 style={{ fontSize: '12px', color: 'var(--color-primary)', marginBottom: '6px', textTransform: 'uppercase' }}>Batting Scorecard</h4>
                                        {match.scorecard.batsmenStats && match.scorecard.batsmenStats.length > 0 ? (
                                          <div className="custom-table-container">
                                            <table className="custom-table" style={{ fontSize: '11px' }}>
                                              <thead>
                                                <tr>
                                                  <th style={{ padding: '6px 10px' }}>Batsman</th>
                                                  <th style={{ padding: '6px 10px' }}>Status</th>
                                                  <th style={{ padding: '6px 10px' }}>Runs</th>
                                                  <th style={{ padding: '6px 10px' }}>Balls</th>
                                                  <th style={{ padding: '6px 10px' }}>4s</th>
                                                  <th style={{ padding: '6px 10px' }}>6s</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {match.scorecard.batsmenStats.map((b) => (
                                                  <tr key={b.userId || b.name}>
                                                    <td style={{ padding: '6px 10px' }}><strong>{b.name}</strong></td>
                                                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{b.dismissalInfo}</td>
                                                    <td style={{ padding: '6px 10px' }}>{b.runs}</td>
                                                    <td style={{ padding: '6px 10px' }}>{b.balls}</td>
                                                    <td style={{ padding: '6px 10px' }}>{b.fours}</td>
                                                    <td style={{ padding: '6px 10px' }}>{b.sixes}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No batting stats logged.</p>
                                        )}
                                      </div>
                                      <div>
                                        <h4 style={{ fontSize: '12px', color: 'var(--color-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Bowling Scorecard</h4>
                                        {match.scorecard.bowlersStats && match.scorecard.bowlersStats.length > 0 ? (
                                          <div className="custom-table-container">
                                            <table className="custom-table" style={{ fontSize: '11px' }}>
                                              <thead>
                                                <tr>
                                                  <th style={{ padding: '6px 10px' }}>Bowler</th>
                                                  <th style={{ padding: '6px 10px' }}>Overs</th>
                                                  <th style={{ padding: '6px 10px' }}>Runs</th>
                                                  <th style={{ padding: '6px 10px' }}>Wickets</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {match.scorecard.bowlersStats.map((bo) => (
                                                  <tr key={bo.userId || bo.name}>
                                                    <td style={{ padding: '6px 10px' }}><strong>{bo.name}</strong></td>
                                                    <td style={{ padding: '6px 10px' }}>{bo.overs}.{bo.balls}</td>
                                                    <td style={{ padding: '6px 10px' }}>{bo.runsConceded}</td>
                                                    <td style={{ padding: '6px 10px' }}><strong>{bo.wickets}</strong></td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>No bowling stats logged.</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {mTab === 'analytics' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      <div className="grid-2" style={{ gap: '10px' }}>
                                        <div className="stats-grid-card">
                                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Run Rates</span>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                                            <span>Current Run Rate (CRR):</span>
                                            <strong style={{ color: 'var(--color-primary)' }}>{crr}</strong>
                                          </div>
                                          {target > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '4px', fontSize: '12px' }}>
                                              <span>Required Run Rate (RRR):</span>
                                              <strong style={{ color: 'var(--color-warning)' }}>{rrr}</strong>
                                            </div>
                                          )}
                                        </div>

                                        <div className="stats-grid-card">
                                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Partnership</span>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px' }}>
                                            <span>Batting Partnership:</span>
                                            <strong style={{ color: 'white' }}>{activePartnership} runs</strong>
                                          </div>
                                          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            {match.scorecard.activeStriker?.name || 'Striker'} & {match.scorecard.activeNonStriker?.name || 'Non-Striker'}
                                          </span>
                                        </div>
                                      </div>

                                      {target > 0 && (
                                        <div className="stats-grid-card" style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                          <span style={{ fontSize: '10px', color: 'var(--color-warning)', textTransform: 'uppercase', fontWeight: '800' }}>Chase Progress</span>
                                          <div style={{ fontSize: '14px', color: 'white', fontWeight: '700', marginTop: '2px' }}>
                                            Need <span style={{ color: 'var(--color-warning)' }}>{runsNeeded}</span> runs from <span style={{ color: 'var(--color-secondary)' }}>{remainingBalls}</span> balls remaining!
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                    <div>
                      <button
                        onClick={() => setExpandedBillingMatchId(isBillingOpen ? null : match._id)}
                        className="btn btn-secondary"
                        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: '13px', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <span>💰 Squad Payments & Billing Sheet ({yesCount} attending)</span>
                        <span>{isBillingOpen ? '▲ Hide' : '▼ Expand'}</span>
                      </button>

                      {isBillingOpen && (
                        <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease' }}>
                          {match.rsvps && match.rsvps.length > 0 ? (
                            <div className="custom-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                              <table className="custom-table" style={{ fontSize: '12px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ padding: '8px 12px' }}>Player</th>
                                    <th style={{ padding: '8px 12px' }}>RSVP</th>
                                    <th style={{ padding: '8px 12px' }}>Payment Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {match.rsvps.map((rsvp) => (
                                    <tr key={rsvp.userId}>
                                      <td style={{ padding: '8px 12px' }}><strong>{rsvp.name}</strong></td>
                                      <td style={{ padding: '8px 12px' }}>
                                        <span className={`badge-status ${rsvp.status === 'yes' ? 'badge-yes' : 'badge-no'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                          {rsvp.status}
                                        </span>
                                      </td>
                                      <td style={{ padding: '8px 12px' }}>
                                        {rsvp.status === 'yes' ? (
                                          <span className={`badge-status ${rsvp.paymentStatus === 'completed' ? 'badge-yes' : 'badge-pending'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                                            {rsvp.paymentStatus === 'completed' ? 'Paid (₹' + playerShare.toFixed(2) + ')' : 'Pending (₹' + playerShare.toFixed(2) + ')'}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>N/A</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>No players have RSVP'd yet.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
