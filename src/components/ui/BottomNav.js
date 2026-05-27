'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Trophy, Search, Smile } from 'lucide-react';
import clsx from 'clsx';

const ITEMS = [
  { id: 'matches', href: '/',        icon: Trophy },
  { id: 'search',  href: '/search',  icon: Search },
  { id: 'me',      href: '/profile', icon: Smile },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (!pathname || pathname === '/login') {
    return null;
  }

  let currentIndex = 0;
  if (pathname.startsWith('/search')) {
    currentIndex = 1;
  } else if (pathname.startsWith('/profile') || pathname.startsWith('/payments')) {
    currentIndex = 2;
  } else {
    currentIndex = 0;
  }

  return (
    <nav className="fixed bottom-6 inset-x-0 z-50 flex justify-center md:hidden pointer-events-none">
      <div 
        className="relative flex items-center gap-2 px-3 py-2.5 rounded-[32px] bg-[var(--surface-container-high)] shadow-[var(--el-3)] pointer-events-auto"
        style={{ border: '1px solid var(--outline-variant)' }}
      >
        {/* Sliding Indicator */}
        <div 
          className="absolute left-3 top-2.5 w-[56px] h-[44px] rounded-full bg-[var(--secondary-container)] transition-transform duration-300 ease-[var(--ease-emph)]"
          style={{ transform: `translateX(${currentIndex * 64}px)` }}
        />

        {ITEMS.map((it, idx) => {
          const active = idx === currentIndex;
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => router.push(it.href)}
              className="relative z-10 flex items-center justify-center w-[56px] h-[44px] rounded-full transition-colors cursor-pointer active:scale-95"
            >
              <Icon 
                size={24} 
                strokeWidth={active ? 2.5 : 2} 
                className={clsx(
                  "transition-colors duration-300", 
                  active ? 'text-[var(--on-secondary-container)]' : 'text-[var(--on-surface-variant)]'
                )} 
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
