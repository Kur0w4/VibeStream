import React from 'react';
import { useLocation } from 'react-router';
import { Sidebar } from './Sidebar';
import { Player } from './Player';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { usePlayerStore } from '../store/usePlayerStore';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { initAuth } = usePlayerStore();
  const isAuthPage = location.pathname === '/auth';

  React.useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-bg-main text-text-main font-sans selection:bg-accent/30">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main text-text-main overflow-hidden font-sans">
      <Sidebar className="will-change-transform contain-layout" />
      
      <main className="flex-1 flex flex-col relative overflow-hidden z-10 contain-paint">
        <TopBar />
        {/* Padding bottom: 150px on mobile (for mobile nav + mini player), 96px on desktop (for bottom player) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-[150px] md:pb-[96px] px-0 will-change-scroll">
          {children}
        </div>
      </main>

      <Player />
      <MobileNav />
    </div>
  );
};
