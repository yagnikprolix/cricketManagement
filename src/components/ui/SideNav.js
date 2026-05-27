'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy, Search, CreditCard, User, Moon, Sun } from 'lucide-react';
import clsx from 'clsx';
import { useTheme } from '@/components/theme/ThemeProvider';

const ITEMS = [
  { id: 'matches', label: 'Matches',  href: '/',         icon: Trophy },
  { id: 'search',  label: 'Search',   href: '/search',   icon: Search },
  { id: 'payments',label: 'Payments', href: '/payments', icon: CreditCard },
  { id: 'profile', label: 'Profile',  href: '/profile',  icon: User },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();

  if (!pathname || pathname === '/login') return null;

  return (
    <aside className="sticky top-0 h-screen flex flex-col bg-[var(--surface)] p-4 border-r border-[var(--outline-variant)]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-10 h-10 bg-[var(--primary)] text-[var(--on-primary)] rounded-xl flex items-center justify-center font-black text-xl italic shadow-sm">
          C
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-[var(--on-surface)] leading-tight">Curius Cricket</h1>
          <div className="text-[11px] text-[var(--on-surface-variant)] font-medium">Premier League</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 flex-1">
        {ITEMS.map((it) => {
          const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => router.push(it.href)}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-full transition-colors font-semibold text-[14px]",
                active 
                  ? "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]"
                  : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] hover:text-[var(--on-surface)]"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {it.label}
            </button>
          );
        })}
      </nav>

      {/* User & Theme */}
      <div className="mt-auto pt-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[var(--success)] text-[var(--on-success)] flex items-center justify-center font-bold text-[13px]">
            VB
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[13px] font-bold text-[var(--on-surface)] leading-tight">Vasu Bhalodia</span>
            <span className="text-[10px] text-[var(--on-surface-variant)] uppercase tracking-wider font-semibold">All-rounder</span>
          </div>
        </div>
        <button onClick={toggle} className="p-2 rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)] transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </aside>
  );
}
