"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@/components/ui/AppBar';
import ThemeToggle from '@/components/theme/ThemeToggle';
import Button from '@/components/ui/Button';
import { Settings, LogOut, Shield, ChevronRight, User } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) return <div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen pb-[120px] bg-[var(--background)]">
      <AppBar 
        title="Profile" 
        actions={<ThemeToggle />}
        large 
      />
      
      <div className="px-4 mt-4 space-y-6">
        
        {/* User Card */}
        <div className="flex items-center gap-4 bg-[var(--surface-container-low)] p-4 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center text-xl font-bold">
            {user?.name?.slice(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <div className="text-[var(--on-surface-variant)] text-sm">{user?.email || 'player@curius.in'}</div>
            <div className="mt-1 inline-flex items-center gap-1 bg-[var(--secondary-container)] text-[var(--on-secondary-container)] px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
              {user?.role}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="bg-[var(--surface-container-low)] rounded-3xl overflow-hidden">
          <button className="w-full flex items-center justify-between p-4 bg-transparent border-none text-left m3-state border-b border-[var(--outline-variant)]">
            <div className="flex items-center gap-3 text-[var(--on-surface)]">
              <User size={20} className="text-[var(--primary)]" />
              <span className="font-semibold text-[15px]">Personal Details</span>
            </div>
            <ChevronRight size={20} className="text-[var(--on-surface-variant)]" />
          </button>
          
          <button className="w-full flex items-center justify-between p-4 bg-transparent border-none text-left m3-state border-b border-[var(--outline-variant)]" onClick={() => router.push('/payments')}>
            <div className="flex items-center gap-3 text-[var(--on-surface)]">
              <Shield size={20} className="text-[var(--primary)]" />
              <span className="font-semibold text-[15px]">Payments & Dues</span>
            </div>
            <ChevronRight size={20} className="text-[var(--on-surface-variant)]" />
          </button>
          
          <button className="w-full flex items-center justify-between p-4 bg-transparent border-none text-left m3-state">
            <div className="flex items-center gap-3 text-[var(--on-surface)]">
              <Settings size={20} className="text-[var(--primary)]" />
              <span className="font-semibold text-[15px]">App Settings</span>
            </div>
            <ChevronRight size={20} className="text-[var(--on-surface-variant)]" />
          </button>
        </div>

        <Button 
          variant="outlined" 
          full 
          icon={LogOut}
          onClick={handleLogout}
          className="text-[var(--error)] border-[var(--error)]"
        >
          Sign Out
        </Button>
        
      </div>
    </div>
  );
}
