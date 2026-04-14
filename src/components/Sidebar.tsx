import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Library, PlusSquare, Heart, Music2, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

const SidebarItem = ({ icon: Icon, label, to }: { icon: any, label: string, to: string }) => (
  <NavLink 
    to={to}
    className={({ isActive }) => cn(
      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 rounded-lg group",
      isActive ? "bg-glass text-text-main border border-glass-border" : "text-text-dim hover:text-text-main hover:bg-glass"
    )}
  >
    {({ isActive }) => (
      <>
        <Icon className={cn("w-4 h-4", isActive ? "text-accent" : "group-hover:text-accent")} />
        <span className="font-medium text-sm">{label}</span>
      </>
    )}
  </NavLink>
);

export const Sidebar = () => {
  return (
    <div className="w-[var(--sidebar-width)] h-full bg-bg-sidebar border-r border-white/5 flex flex-col p-6 hidden md:flex z-20">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-gradient-to-tr from-accent to-blue-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-accent/20">
          <Music2 className="text-black w-6 h-6 fill-black" />
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white">VIBESTREAM</h1>
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">Premium</span>
        </div>
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] px-3 mb-2">
            Main Menu
          </h2>
          <div className="flex flex-col gap-1">
            <SidebarItem icon={Home} label="Home" to="/" />
            <SidebarItem icon={TrendingUp} label="Trends" to="/trends" />
            <SidebarItem icon={Library} label="Library" to="/library" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] px-3 mb-2">
            Discover
          </h2>
          <div className="flex flex-col gap-1">
            <SidebarItem icon={PlusSquare} label="Playlists" to="/playlists" />
            <SidebarItem icon={Music2} label="Artists" to="/artists" />
            <SidebarItem icon={Heart} label="Liked Songs" to="/liked-songs" />
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] text-accent font-black mb-1 uppercase tracking-widest">Upgrade to Pro</p>
          <p className="text-[11px] text-text-dim font-medium leading-relaxed">Experience high fidelity sound and offline mode.</p>
        </div>
        <button className="flex items-center gap-3 px-4 py-3 text-text-dim hover:text-white transition-colors group">
          <PlusSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-sm">Settings</span>
        </button>
      </div>
    </div>
  );
};
