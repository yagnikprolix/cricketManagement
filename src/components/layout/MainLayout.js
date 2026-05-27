"use client";
import { usePathname } from 'next/navigation';
import SideNav from '@/components/ui/SideNav';
import BottomNav from '@/components/ui/BottomNav';

export default function MainLayout({ children }) {
  const pathname = usePathname();
  
  // Pages that should take up the full screen and have no SideNav/BottomNav
  const isFullScreenPage = pathname === '/login' || pathname?.startsWith('/admin') || pathname === '/live';
  
  if (isFullScreenPage) {
    return (
      <main className="w-full relative overflow-x-hidden min-h-screen">
        {children}
      </main>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative">
      <SideNav />
      <main className="flex-1 w-full relative overflow-x-hidden">
        <div className="max-w-[1000px] mx-auto w-full min-h-screen">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
