"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import Chip from '@/components/ui/Chip';
import Fab from '@/components/ui/Fab';
import Button from '@/components/ui/Button';
import MatchCard from '@/components/match/MatchCard';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Loader from '@/components/ui/Loader';
import { Plus } from 'lucide-react';
import GoogleAd from '@/components/ui/GoogleAd';

export default function PlayerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  useEffect(() => {
    fetchDashboardData();
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
            fetchDashboardData();
            return;
          }
          if (liveMatchData && liveMatchData._id) {
            setMatches((prev) => prev.map((m) => (m._id === liveMatchData._id ? liveMatchData : m)));
          }
        } catch (err) {}
      });
    }
    connectPusher();
    return () => {
      if (channel) channel.unbind_all();
      if (pusher) pusher.disconnect();
    };
  }, [router]);

  if (loading) {
    return <Loader text="Loading Cricket Portal…" fullScreen />;
  }

  const live = matches.filter(m => m.scorecard?.status === 'live');
  const upcoming = matches.filter(m => m.scorecard?.status !== 'live' && m.scorecard?.status !== 'completed');
  const past = matches.filter(m => m.scorecard?.status === 'completed');

  let filteredMatches = matches;
  if (filter === 'upcoming') filteredMatches = upcoming;
  if (filter === 'completed') filteredMatches = past;

  return (
    <div className="min-h-screen pb-[120px] bg-[var(--background)]">
      <AppBar
        title="Matches"
        large
        actions={user?.role === 'admin' ? <Button variant="filled" size="sm" onClick={() => router.push('/admin')}>Admin</Button> : null}
      />

      <div className="px-4">
        <p className="m3-body-sm text-[var(--on-surface-variant)] mb-3">
          Welcome back, {user?.name} · {upcoming.length} upcoming · {live.length} live
        </p>
        <div className="flex gap-2 mb-4">
          {[['all','All'],['upcoming','Upcoming'],['completed','Past']].map(([id,l]) => (
            <Chip key={id} selected={filter===id} onClick={() => setFilter(id)}>{l}</Chip>
          ))}
        </div>
      </div>

      {/* Google Ads Section */}
      <div className="px-4 mb-4">
        <GoogleAd adSlot="dashboard-top-ad" />
      </div>

      <div className="px-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
        {(filter === 'all' ? live : []).map(m => (
          <MatchCard key={m._id} match={m} userRsvp={m.rsvps?.find(r => r.userId === user?.id)} onClick={() => router.push(`/match/${m._id}`)} />
        ))}
        {(filter === 'all' ? upcoming : filteredMatches).map(m => (
          <MatchCard key={m._id} match={m} userRsvp={m.rsvps?.find(r => r.userId === user?.id)} onClick={() => router.push(`/match/${m._id}`)} />
        ))}
      </div>

    </div>
  );
}
