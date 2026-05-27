"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import MatchCard from '@/components/match/MatchCard';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
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
  }, []);

  const filtered = query.trim() === '' ? [] : matches.filter(m => 
    m.title.toLowerCase().includes(query.toLowerCase()) || 
    m.location.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-[120px] bg-[var(--background)]">
      <AppBar title="Search" large />
      
      <div className="px-4 mt-2">
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" size={20} />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search matches or grounds..."
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-[var(--surface-container-high)] border-none text-[var(--on-surface)] text-[15px] outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
          />
        </div>

        {query.trim() !== '' && (
          <div className="space-y-3">
            <h3 className="m3-title-md text-[var(--on-surface-variant)] mb-2">Results ({filtered.length})</h3>
            {filtered.length > 0 ? filtered.map(m => (
              <MatchCard key={m._id} match={m} onClick={() => router.push(`/match/${m._id}`)} />
            )) : (
              <div className="p-8 text-center text-[var(--on-surface-variant)] italic">No matches found for "{query}"</div>
            )}
          </div>
        )}

        {query.trim() === '' && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-[var(--on-surface-variant)] opacity-70">
            <SearchIcon size={48} className="mb-4 opacity-50" />
            <p>Type above to find past or upcoming matches, locations, or opponents.</p>
          </div>
        )}
      </div>

    </div>
  );
}
