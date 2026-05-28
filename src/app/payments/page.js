"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import { CreditCard, Check, Clock, ChevronDown, ChevronUp, Send, CheckCircle, MapPin, Receipt, Trophy, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import MatchCard from '@/components/match/MatchCard';
import Loader from '@/components/ui/Loader';

export default function PaymentsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState(null);

  useEffect(() => {
    async function fetchData() {
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
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  if (loading) return <Loader fullScreen />;

  const matchesWithPayments = matches.filter(m => (m.scorecard?.status === 'completed' || m.rsvps?.some(r => r.paymentStatus)) && m.rsvps?.length > 0);

  let totalPending = 0;
  matchesWithPayments.forEach(m => {
    const yesAttendees = m.rsvps.filter(r => r.status === 'yes');
    const playerShare = yesAttendees.length > 0 ? (m.totalCost / yesAttendees.length) : 0;
    const userRsvp = m.rsvps.find(r => r.userId === user?.id);
    if (userRsvp?.status === 'yes' && userRsvp.paymentStatus !== 'completed') {
      totalPending += playerShare;
    }
  });

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      <AppBar 
        title="Payments" 
        leading={<IconButton icon={ArrowLeft} onClick={() => router.back()} />}
      />
      
      <div className="flex-1 overflow-y-auto px-4 pb-[120px] no-scrollbar pt-2">
        {/* Summary card */}
        <div 
          className="rounded-[28px] p-5 mb-4.5 shadow-[var(--el-2)] text-[var(--on-primary)]"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary), #000 15%) 100%)' }}
        >
          <div className="m3-label-sm opacity-85">YOU OWE</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[44px] font-bold tracking-tight">₹{Math.round(totalPending).toLocaleString('en-IN')}</span>
          </div>
          <div className="m3-body-sm opacity-85 mt-0.5">
            Across {matchesWithPayments.filter(m => m.rsvps?.find(r => r.userId === user?.id && r.paymentStatus !== 'completed' && r.status === 'yes')).length} matches
          </div>
          <div className="flex gap-2 mt-3.5">
            <Button
              variant="filled"
              size="sm"
              icon={CreditCard}
              style={{ background: 'var(--on-primary)', color: 'var(--primary)' }}
            >
              Pay all now
            </Button>
            <Button
              variant="outlined"
              size="sm"
              icon={Receipt}
              style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'var(--on-primary)' }}
            >
              View receipts
            </Button>
          </div>
        </div>

        {/* Match payment breakdown — accordion */}
        <div className="mt-6 mb-3">
          <h3 className="m3-title-lg font-bold">By match</h3>
          <div className="text-sm text-[var(--on-surface-variant)]">{matchesWithPayments.length} matches</div>
        </div>

        <div className="grid gap-2.5">
          {matchesWithPayments.map(match => {
            const yesAttendees = match.rsvps.filter(r => r.status === 'yes');
            const playerShare = yesAttendees.length > 0 ? Math.round(match.totalCost / yesAttendees.length) : 0;
            const paidCount = yesAttendees.filter(p => p.paymentStatus === 'completed').length;
            const pendingCount = yesAttendees.length - paidCount;
            const expanded = expandedMatchId === match._id;
            const pct = yesAttendees.length > 0 ? (paidCount / yesAttendees.length) * 100 : 0;

            return (
              <div 
                key={match._id} 
                className="bg-[var(--surface-container-low)] rounded-[24px] overflow-hidden transition-shadow"
                style={{ boxShadow: expanded ? 'var(--el-2)' : 'none' }}
              >
                <button 
                  onClick={() => setExpandedMatchId(expanded ? null : match._id)} 
                  className="m3-state flex items-center gap-3 w-full p-3.5 bg-transparent border-none cursor-pointer font-inherit text-[var(--on-surface)] text-left"
                >
                  <div className="w-11 h-11 rounded-[12px] bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center shrink-0">
                    <Trophy size={22} className="fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="m3-title-md font-bold truncate">{match.title}</div>
                    <div className="m3-body-sm text-[var(--on-surface-variant)] truncate">
                      ₹{(match.totalCost || 0).toLocaleString('en-IN')} ground · ₹{playerShare} / player
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-1.5 justify-end mb-1">
                      <span className="m3-label-md text-[var(--success)]">{paidCount} paid</span>
                      {pendingCount > 0 && <span className="m3-label-md text-[var(--warning)]">· {pendingCount} due</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="w-24 h-1.5 bg-[var(--surface-container-high)] rounded-full float-right">
                      <div className="h-full rounded-full transition-all duration-400 ease-[var(--ease-emph)]" 
                           style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--primary)' }} />
                    </div>
                  </div>
                  {expanded ? <ChevronUp size={22} className="text-[var(--on-surface-variant)] shrink-0 ml-1" /> : <ChevronDown size={22} className="text-[var(--on-surface-variant)] shrink-0 ml-1" />}
                </button>

                {expanded && (
                  <div className="p-3.5 pt-1 border-t border-[var(--outline-variant)] animate-[crkFadeUp_0.25s_var(--ease-emph)]">
                    {yesAttendees.map(p => (
                      <div key={p.userId} className="flex items-center gap-3 py-2.5 border-b border-[var(--outline-variant)] last:border-b-0">
                        <div className="w-8 h-8 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold text-xs shrink-0">
                          {p.name?.slice(0, 2).toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="m3-title-sm font-semibold truncate">{p.name} {p.userId === user?.id && '(You)'}</div>
                          <div className="m3-label-md text-[var(--on-surface-variant)]">Player</div>
                        </div>
                        {p.paymentStatus === 'completed' ? (
                          <Chip tone="success" icon={CheckCircle} size="sm">Paid ₹{playerShare}</Chip>
                        ) : (
                          <>
                            <Chip tone="warning" icon={Clock} size="sm">₹{playerShare} due</Chip>
                            <IconButton icon={Send} size={32} className="bg-[var(--secondary-container)] text-[var(--on-secondary-container)] ml-1" />
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-3">
                      <Button variant="tonal" size="sm" icon={Send} full>Remind unpaid ({pendingCount})</Button>
                      <Button variant="filled" size="sm" icon={CheckCircle} full>Mark all paid</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
