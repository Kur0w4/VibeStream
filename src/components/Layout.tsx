import React from 'react';
import { Sidebar } from './Sidebar';
import { Player } from './Player';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-bg-main text-text-main overflow-hidden font-sans">
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e293b,#020617)]" />
      </div>

      <Sidebar />
      
      <main className="flex-1 flex flex-col relative overflow-hidden z-10">
        <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
          {children}
        </div>
      </main>

      <Player />
    </div>
  );
};
