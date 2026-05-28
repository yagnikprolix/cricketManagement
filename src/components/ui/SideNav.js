'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy, Search, CreditCard, Smile } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { id: 'matches', label: 'Matches',  href: '/',         icon: Trophy },
  { id: 'search',  label: 'Search',   href: '/search',   icon: Search },
  { id: 'payments',label: 'Payments', href: '/payments', icon: CreditCard },
  { id: 'profile', label: 'Profile',  href: '/profile',  icon: Smile },
];

export default function SideNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === '/login') return null;

  return (
    <div className="hidden md:block w-[280px] shrink-0 border-r border-[var(--outline-variant)] bg-[var(--surface)] z-40">
      <aside className="sticky top-0 h-screen flex flex-col p-4">
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
    </aside>
    </div>
  );
}
