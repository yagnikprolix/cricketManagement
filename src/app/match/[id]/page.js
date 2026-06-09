"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AppBar from '@/components/ui/AppBar';
import Tabs from '@/components/ui/Tabs';
import GroundArt from '@/components/ui/GroundArt';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Chip from '@/components/ui/Chip';
import { ArrowLeft, Share2, MoreVertical, Calendar, Clock, MapPin, IndianRupee, Users, Trophy, MessageSquare, ListChecks, Check, X, HelpCircle, Send, Volume2, CheckCircle, Info, Activity } from 'lucide-react';
import clsx from 'clsx';
import Loader from '@/components/ui/Loader';
import GoogleAd from '@/components/ui/GoogleAd';

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [user, setUser] = useState(null);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [scrolled, setScrolled] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  const fetchMatchData = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (!authData.user) {
        router.push('/login');
        return;
      }
      setUser(authData.user);

      const matchRes = await fetch(`/api/matches/${id}`);
      if (!matchRes.ok) throw new Error('Match not found');
      const matchData = await matchRes.json();
      setMatch(matchData.match);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchData();

    let pusher, channel;
    async function connectPusher() {
      const PusherClient = (await import('pusher-js')).default;
      pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      });
      channel = pusher.subscribe('cricket-live');
      channel.bind('match-update', (liveMatchData) => {
        try {
          if (liveMatchData && liveMatchData._refetch) {
            fetchMatchData();
            return;
          }
          if (liveMatchData && liveMatchData._id === id) {
            setMatch(liveMatchData);
          }
        } catch (err) {}
      });
    }
    connectPusher();
    return () => {
      if (channel) channel.unbind_all();
      if (pusher) pusher.disconnect();
    };
  }, [id, router]);

  const handleRsvp = async (status) => {
    setRsvpLoading(true);
    try {
      const res = await fetch(`/api/matches/${match._id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMatch(data.match);
      toast.success('RSVP updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!match) return <div className="p-8 text-center bg-[var(--background)] h-screen text-[var(--on-surface)]">Match not found</div>;

  const isLive = match.scorecard?.status === 'live';
  const isCompleted = match.scorecard?.status === 'completed';
  const state = isLive ? 'live' : isCompleted ? 'completed' : 'upcoming';

  const userRsvpObj = match.rsvps?.find((r) => r.userId === user?.id);
  const userRsvp = userRsvpObj?.status;
  const paymentStatus = userRsvpObj?.paymentStatus || 'pending';
  
  const yesAttendees = match.rsvps?.filter((r) => r.status === 'yes') || [];
  const playerShare = yesAttendees.length > 0 ? ((match.totalCost || 0) / yesAttendees.length) : (match.totalCost || 0);
  const roundedCost = Math.round(playerShare);

  const dateStr = new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Score calculations
  const sc = match.scorecard || {};
  const totalBallsBowled = (sc.overs || 0) * 6 + (sc.balls || 0);
  const crr = totalBallsBowled > 0 ? ((sc.runs || 0) / totalBallsBowled * 6).toFixed(2) : '0.00';
  const target = sc.target || 0;
  const runsNeeded = target - (sc.runs || 0);
  const remainingBalls = Math.max(0, 120 - totalBallsBowled);
  const rrr = remainingBalls > 0 ? (runsNeeded / remainingBalls * 6).toFixed(2) : '0.00';

  const activePartnership = (sc.activeStriker?.runs || 0) + (sc.activeNonStriker?.runs || 0);

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <AppBar
        title="Match Details"
        scrolled={scrolled}
        leading={<IconButton icon={ArrowLeft} onClick={() => router.back()} />}
      />

      <div 
        onScroll={e => setScrolled(e.currentTarget.scrollTop > 16)}
        className="flex-1 overflow-y-auto no-scrollbar"
      >
        {/* HERO */}
        <div className="relative md:mt-6 md:mx-4 md:rounded-3xl overflow-hidden shrink-0">
          <GroundArt variant="ground-2" height={180} state={state} />
          <div className="absolute inset-0 pointer-events-none"
               style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.55) 100%)' }} />
          <div className="absolute left-5 right-5 bottom-4 text-white">
            <div className="m3-headline-lg font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{match.title}</div>
            <div className="flex items-center gap-2 mt-1 opacity-90">
              <MapPin size={16} />
              <span className="m3-body-md">{match.location}</span>
              <span>·</span>
              <span className="m3-body-md">{dateStr}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-32">
          
          {/* LIVE SCORE BLOCK - Always visible if live */}
          {isLive && (
            <div className="-mt-7 relative z-10 bg-[var(--surface-container-low)] rounded-3xl p-4 shadow-[var(--el-2)] animate-[crkFadeUp_0.35s_var(--ease-emph)]">
              <div className="flex items-center justify-between mb-3.5">
                <Chip tone="live" size="sm">LIVE · {sc.battingTeam} Batting</Chip>
                <span className="m3-label-sm text-[var(--on-surface-variant)]">CRR {crr}</span>
              </div>

              <div className="flex items-baseline gap-3.5 mb-1.5">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[56px] font-bold text-[var(--primary)] leading-none tracking-tight">
                    {sc.runs}
                  </span>
                  <span className="text-[32px] text-[var(--on-surface-variant)]">/{sc.wickets}</span>
                </div>
                <div className="ml-auto text-right">
                  <div className="m3-label-sm text-[var(--on-surface-variant)]">OVERS</div>
                  <div className="m3-title-lg font-semibold">{sc.overs}.{sc.balls}</div>
                </div>
              </div>

              {sc.tossWinner && (
                <div className="mt-2 text-xs text-amber-500 font-medium bg-[var(--surface-container)] px-3 py-2 rounded-xl flex items-center gap-1.5 border border-amber-500/10">
                  🪙 <strong>{sc.tossWinner === 'Team A' ? (sc.battingTeam || 'Team A') : sc.tossWinner === 'Team B' ? (sc.bowlingTeam || 'Team B') : sc.tossWinner}</strong> won the toss and elected to <strong>{sc.tossDecision === 'bat' ? 'bat' : 'bowl'}</strong> first.
                </div>
              )}

              {/* Batters */}
              <div className="mt-3.5 p-3 rounded-2xl bg-[var(--surface-container)] grid grid-cols-2 gap-3">
                <div>
                  <div className="m3-label-sm text-[var(--on-surface-variant)] mb-1">STRIKER</div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {sc.activeStriker?.name?.slice(0, 2).toUpperCase() || 'S1'}
                    </div>
                    <div className="min-w-0">
                      <div className="m3-title-sm font-semibold flex items-center gap-1 truncate">
                        {sc.activeStriker?.name || 'N/A'} <span className="text-[var(--primary)]">•</span>
                      </div>
                      <div className="m3-label-md text-[var(--on-surface-variant)] truncate">
                        {sc.activeStriker?.runs || 0} ({sc.activeStriker?.balls || 0})
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="m3-label-sm text-[var(--on-surface-variant)] mb-1">NON-STRIKER</div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {sc.activeNonStriker?.name?.slice(0, 2).toUpperCase() || 'S2'}
                    </div>
                    <div className="min-w-0">
                      <div className="m3-title-sm font-semibold truncate">
                        {sc.activeNonStriker?.name || 'N/A'}
                      </div>
                      <div className="m3-label-md text-[var(--on-surface-variant)] truncate">
                        {sc.activeNonStriker?.runs || 0} ({sc.activeNonStriker?.balls || 0})
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bowler */}
              <div className="mt-2 p-3 rounded-2xl bg-[var(--surface-container)] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[var(--error-container)] text-[var(--on-error-container)] flex items-center justify-center flex-shrink-0">
                  <Activity size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="m3-title-sm font-semibold truncate">{sc.activeBowler?.name || 'N/A'}</div>
                  <div className="m3-label-md text-[var(--on-surface-variant)] truncate">
                    {sc.activeBowler?.overs || 0}.{sc.activeBowler?.balls || 0} ov · {sc.activeBowler?.runsConceded || 0} runs · {sc.activeBowler?.wickets || 0} wkt
                  </div>
                </div>
              </div>

              {/* Recent deliveries */}
              {sc.commentary && sc.commentary.length > 0 && (
                <div className="mt-3.5">
                  <div className="m3-label-sm text-[var(--on-surface-variant)] mb-2">RECENT BALLS</div>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {sc.commentary.slice(0, 8).map((comm, idx) => {
                      let bg = 'bg-[var(--surface-container-high)] text-[var(--on-surface)]';
                      let txt = comm.runs;
                      const descUpper = comm.description?.toUpperCase() || '';
                      if (descUpper.includes('OUT!')) { bg = 'bg-[var(--error)] text-[var(--on-error)]'; txt = 'W'; }
                      else if (comm.runs === 4 && !descUpper.includes('EXTRA')) { bg = 'bg-[#0EA5E9] text-[#fff]'; }
                      else if (comm.runs === 6 && !descUpper.includes('EXTRA')) { bg = 'bg-[var(--primary)] text-[var(--on-primary)]'; }
                      else if (comm.runs === 0 && !descUpper.includes('OUT!')) { txt = '0'; bg = 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'; }
                      return (
                        <span key={idx} className={clsx("flex-shrink-0 w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-bold tracking-[0.2px]", bg)}>
                          {txt}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* IMPORTANT (always) — Your RSVP / Payment status */}
          <div className={clsx("p-4 rounded-3xl bg-[var(--surface-container-low)]", isLive ? "mt-3.5" : "mt-4")}>
            <div className="flex items-center justify-between mb-3">
              <div className="m3-title-md font-bold">Your attendance</div>
              <Chip tone={userRsvp === 'yes' ? 'success' : userRsvp === 'no' ? 'error' : 'warning'} size="sm">
                RSVP: {(userRsvp || 'pending').toUpperCase()}
              </Chip>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="m3-label-sm text-[var(--on-surface-variant)]">SHARED COST</div>
                <div className="m3-headline-sm text-[var(--primary)] font-bold">
                  ₹{roundedCost}
                  <span className="m3-body-sm text-[var(--on-surface-variant)] font-normal"> / {yesAttendees.length || 1} players</span>
                </div>
              </div>
              {userRsvp === 'yes' && paymentStatus !== 'completed' && (
                <Button variant="filled" size="sm" icon={IndianRupee}>Pay now</Button>
              )}
              {userRsvp === 'yes' && paymentStatus === 'completed' && (
                <Chip tone="success" icon={CheckCircle} size="md">Paid</Chip>
              )}
            </div>

            <div className="flex gap-2 md:justify-end">
              <Button
                variant={userRsvp === 'yes' ? 'success' : userRsvp === 'no' ? 'outlined' : 'tonal'}
                icon={Check} size="sm"
                className="flex-1 md:flex-none md:w-auto"
                disabled={rsvpLoading}
                onClick={() => handleRsvp('yes')}
              >
                Yes, I'm in
              </Button>
              <Button
                variant={userRsvp === 'no' ? 'error' : 'outlined'}
                icon={X} size="sm"
                className="flex-1 md:flex-none md:w-auto"
                disabled={rsvpLoading}
                onClick={() => handleRsvp('no')}
              >
                Can't make it
              </Button>
            </div>
          </div>

          {/* Google Ads Section */}
          <div className="mt-4">
            <GoogleAd adSlot="match-detail-ad" />
          </div>

          {/* Secondary content — tabs */}
          <Tabs
            current={tab}
            onChange={setTab}
            items={[
              { id: 'overview', label: 'Overview', icon: Info },
              { id: 'commentary', label: 'Commentary', icon: MessageSquare },
              { id: 'scorecard', label: 'Scorecard', icon: ListChecks },
              { id: 'squad', label: 'Squad', icon: Users },
            ]}
            className="-mx-4 px-2 mt-[22px] md:mx-0 md:border md:border-[var(--outline-variant)] md:rounded-2xl md:overflow-hidden"
          />

          <div className="pt-4 animate-[crkFadeUp_0.25s_var(--ease-emph)]" key={tab}>
            
            {tab === 'overview' && (
              <div className="grid gap-0 bg-[var(--surface-container-low)] rounded-2xl overflow-hidden">
                {[
                  { icon: Calendar, label: 'Date', value: dateStr },
                  { icon: Clock, label: 'Time', value: match.time },
                  { icon: MapPin, label: 'Venue', value: match.location },
                  { icon: IndianRupee, label: 'Ground fee', value: `₹${(match.totalCost || 0).toLocaleString('en-IN')}` },
                  { icon: Users, label: 'Squad', value: `${yesAttendees.length} attending` },
                  { icon: Trophy, label: 'Format', value: 'T20' },
                ].map((r, i) => (
                  <div key={r.label} className={clsx("flex items-center gap-3.5 px-4 py-3.5", i > 0 && "border-t border-[var(--outline-variant)]")}>
                    <r.icon size={18} className="text-[var(--on-surface-variant)]" />
                    <span className="m3-body-md text-[var(--on-surface-variant)] flex-[0_0_80px]">{r.label}</span>
                    <span className="m3-title-sm flex-1 font-semibold">{r.value}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'commentary' && (
              <div className="grid gap-2.5">
                {sc.commentary?.length > 0 ? sc.commentary.map((c, i) => {
                  const descUpper = c.description?.toUpperCase() || '';
                  const highlight = descUpper.includes('OUT!') || (c.runs >= 4 && !descUpper.includes('EXTRA'));
                  return (
                    <div key={i} className={clsx(
                      "flex gap-3 p-3 rounded-xl animate-[crkFadeUp_0.3s_var(--ease-emph)_both]",
                      highlight ? "bg-[var(--primary-container)] text-[var(--on-primary-container)]" : "bg-[var(--surface-container-low)] text-[var(--on-surface)]"
                    )} style={{ animationDelay: `${i * 0.04}s` }}>
                      <div className="shrink-0 w-10 flex items-start">
                        {highlight || descUpper.includes('OUT!') ? (
                          <span className={clsx(
                            "inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold tracking-[0.2px] shrink-0",
                            descUpper.includes('OUT!') ? "bg-[var(--error)] text-[var(--on-error)]" : "bg-[var(--primary)] text-[var(--on-primary)]"
                          )}>{descUpper.includes('OUT!') ? 'W' : c.runs}</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-container)] text-[var(--on-surface-variant)] text-[11px] font-semibold shrink-0">
                            {c.ball}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="m3-label-sm opacity-70 mb-0.5">OVER {c.ball}</div>
                        <div className={clsx("m3-body-md", highlight ? "font-semibold" : "font-normal")}>
                          {c.description}
                        </div>
                      </div>
                    </div>
                  );
                }) : <div className="p-8 text-center text-[var(--on-surface-variant)] italic">No commentary yet</div>}
              </div>
            )}

            {tab === 'scorecard' && (
              <div>
                <div className="bg-[var(--surface-container-low)] rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_38px_38px_36px_36px_44px] px-3.5 py-2.5 bg-[var(--surface-container)] text-[11px] font-bold tracking-[0.5px] text-[var(--on-surface-variant)]">
                    <span>BATTER</span><span className="text-right">R</span><span className="text-right">B</span>
                    <span className="text-right">4s</span><span className="text-right">6s</span><span className="text-right">SR</span>
                  </div>
                  {sc.batsmenStats?.map((b, i) => (
                    <div key={b.name} className={clsx(
                      "grid grid-cols-[1fr_38px_38px_36px_36px_44px] px-3.5 py-3 items-center",
                      i > 0 && "border-t border-[var(--outline-variant)]"
                    )}>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {b.name?.slice(0, 2).toUpperCase() || 'BT'}
                        </div>
                        <div className="min-w-0">
                          <div className="m3-title-sm font-semibold flex items-center gap-1 truncate">
                            {b.name.split(' ')[0]} 
                            {(sc.teamACaptain === b.userId || sc.teamBCaptain === b.userId) && <span className="text-amber-500 text-[10px] font-bold"> (c)</span>}
                            {b.name === sc.activeStriker?.name && <span className="text-[var(--primary)]">•</span>}
                          </div>
                          <div className="m3-label-md text-[var(--on-surface-variant)] truncate">{b.dismissalInfo || 'not out'}</div>
                        </div>
                      </div>
                      <span className="m3-title-sm text-right font-bold">{b.runs}</span>
                      <span className="m3-body-sm text-right text-[var(--on-surface-variant)]">{b.balls}</span>
                      <span className="m3-body-sm text-right text-[var(--on-surface-variant)]">{b.fours}</span>
                      <span className="m3-body-sm text-right text-[var(--on-surface-variant)]">{b.sixes}</span>
                      <span className="m3-body-sm text-right text-[var(--on-surface-variant)]">{b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(0) : 0}</span>
                    </div>
                  ))}
                  {!sc.batsmenStats?.length && <div className="p-4 text-center text-xs text-[var(--on-surface-variant)] italic">No batting stats</div>}
                </div>

                <div className="mt-3.5 bg-[var(--surface-container-low)] rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_44px_44px_44px_44px] px-3.5 py-2.5 bg-[var(--surface-container)] text-[11px] font-bold tracking-[0.5px] text-[var(--on-surface-variant)]">
                    <span>BOWLER</span><span className="text-right">O</span><span className="text-right">R</span>
                    <span className="text-right">W</span><span className="text-right">ECON</span>
                  </div>
                  {sc.bowlersStats?.map((b, i) => (
                    <div key={b.name} className="grid grid-cols-[1fr_44px_44px_44px_44px] px-3.5 py-3 items-center border-t border-[var(--outline-variant)]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {b.name?.slice(0, 2).toUpperCase() || 'BW'}
                        </div>
                        <span className="m3-title-sm font-semibold truncate">
                          {b.name.split(' ')[0]}
                          {(sc.teamACaptain === b.userId || sc.teamBCaptain === b.userId) && <span className="text-amber-500 text-[10px] font-bold"> (c)</span>}
                        </span>
                      </div>
                      <span className="m3-body-sm text-right">{b.overs}.{b.balls}</span>
                      <span className="m3-body-sm text-right">{b.runsConceded}</span>
                      <span className="m3-title-sm text-right font-bold text-[var(--error)]">{b.wickets}</span>
                      <span className="m3-body-sm text-right">
                        {((b.overs * 6 + b.balls) > 0 ? (b.runsConceded / ((b.overs * 6 + b.balls) / 6)).toFixed(2) : 0)}
                      </span>
                    </div>
                  ))}
                  {!sc.bowlersStats?.length && <div className="p-4 text-center text-xs text-[var(--on-surface-variant)] italic">No bowling stats</div>}
                </div>

                {isLive && activePartnership > 0 && (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-[var(--surface-container-low)]">
                    <div className="m3-label-sm text-[var(--on-surface-variant)] mb-1.5">CURRENT PARTNERSHIP</div>
                    <div className="flex items-baseline gap-2">
                      <span className="m3-headline-sm text-[var(--primary)] font-bold">{activePartnership} runs</span>
                      <span className="m3-body-sm text-[var(--on-surface-variant)]">· {sc.activeStriker?.name?.split(' ')[0]} &amp; {sc.activeNonStriker?.name?.split(' ')[0]}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'squad' && (
              <div className="flex flex-col gap-4">
                {/* Grouped squads if set */}
                {(sc.teamAPlayers?.length > 0 || sc.teamBPlayers?.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[var(--surface-container-low)] p-4 rounded-2xl flex flex-col gap-3">
                      <div className="m3-title-md font-bold text-[var(--primary)] border-b border-[var(--outline-variant)] pb-2 flex justify-between items-center">
                        <span>Team A ({sc.battingTeam === 'Team A' ? sc.battingTeam : sc.bowlingTeam})</span>
                        {sc.teamACaptain && (
                          <span className="text-[11px] text-amber-500 font-normal">
                            👑 Captain: {yesAttendees.find(p => p.userId === sc.teamACaptain)?.name || 'Captain'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {sc.teamAPlayers?.map(id => {
                          const p = yesAttendees.find(player => player.userId === id);
                          if (!p) return null;
                          return (
                            <div key={id} className="flex items-center gap-2.5 p-1 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs">
                                {p.name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="m3-title-sm font-semibold">{p.name}</span>
                              {sc.teamACaptain === id && <span className="text-[10px] text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full ml-auto">Captain</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-[var(--surface-container-low)] p-4 rounded-2xl flex flex-col gap-3">
                      <div className="m3-title-md font-bold text-[var(--primary)] border-b border-[var(--outline-variant)] pb-2 flex justify-between items-center">
                        <span>Team B ({sc.battingTeam === 'Team B' ? sc.battingTeam : sc.bowlingTeam})</span>
                        {sc.teamBCaptain && (
                          <span className="text-[11px] text-amber-500 font-normal">
                            👑 Captain: {yesAttendees.find(p => p.userId === sc.teamBCaptain)?.name || 'Captain'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {sc.teamBPlayers?.map(id => {
                          const p = yesAttendees.find(player => player.userId === id);
                          if (!p) return null;
                          return (
                            <div key={id} className="flex items-center gap-2.5 p-1 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs">
                                {p.name?.slice(0, 2).toUpperCase() || 'P'}
                              </div>
                              <span className="m3-title-sm font-semibold">{p.name}</span>
                              {sc.teamBCaptain === id && <span className="text-[10px] text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full ml-auto">Captain</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* All RSVPs flat list */}
                <div className="grid gap-1 bg-[var(--surface-container-low)] rounded-2xl overflow-hidden p-1">
                  <div className="m3-label-sm text-[var(--on-surface-variant)] px-2.5 py-1.5 uppercase font-bold tracking-wide">
                    All RSVP Responses
                  </div>
                  {match.rsvps?.map(p => (
                    <div key={p.userId} className="flex items-center gap-3 p-2.5 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {p.name?.slice(0, 2).toUpperCase() || 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="m3-title-sm font-semibold">{p.name}</div>
                        <div className="m3-label-md text-[var(--on-surface-variant)]">
                          {p.status === 'yes' ? (
                            sc.teamAPlayers?.includes(p.userId) ? 'Team A Squad' : sc.teamBPlayers?.includes(p.userId) ? 'Team B Squad' : 'Attending'
                          ) : 'Declined'}
                        </div>
                      </div>
                      <Chip
                        tone={p.status === 'yes' ? 'success' : p.status === 'no' ? 'error' : 'warning'}
                        size="sm"
                        icon={p.status === 'yes' ? Check : p.status === 'no' ? X : HelpCircle}
                      >
                        {p.status === 'yes' ? 'In' : p.status === 'no' ? 'Out' : 'Pending'}
                      </Chip>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
