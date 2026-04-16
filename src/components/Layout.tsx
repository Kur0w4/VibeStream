import React from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Player } from './Player';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-bg-main text-text-main font-sans selection:bg-accent/30">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-main text-text-main overflow-hidden font-sans">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e293b,#020617)]" />
      </div>

      <Sidebar className="will-change-transform contain-layout" />
      
      <main className="flex-1 flex flex-col relative overflow-hidden z-10 contain-paint">
        <TopBar />
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 md:pb-32 px-0 will-change-scroll">
          {children}
        </div>
      </main>

      <Player />
      <MobileNav />
    </div>
  );
};
