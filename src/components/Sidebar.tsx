import React from 'react';
import { Home, Search, Library, PlusSquare, Heart, Music2 } from 'lucide-react';
import { cn } from '../lib/utils';

const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={cn(
    "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 rounded-lg group",
    active ? "bg-glass text-text-main border border-glass-border" : "text-text-dim hover:text-text-main hover:bg-glass"
  )}>
    <Icon className={cn("w-4 h-4", active ? "text-accent" : "group-hover:text-accent")} />
    <span className="font-medium text-sm">{label}</span>
  </div>
);

export const Sidebar = () => {
  return (
    <div className="w-[240px] h-full bg-bg-sidebar border-r border-glass-border flex flex-col p-6 hidden md:flex z-20">
      <div className="flex items-center gap-2 mb-8">
        <Music2 className="text-accent w-6 h-6" />
        <h1 className="text-2xl font-extrabold tracking-tighter text-accent">
          VibeStream
        </h1>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold text-text-dim uppercase tracking-widest px-3">
            Discover
          </h2>
          <div className="flex flex-col gap-1">
            <SidebarItem icon={Home} label="Home" active />
            <SidebarItem icon={Search} label="Trends" />
            <SidebarItem icon={Library} label="Library" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-[10px] font-bold text-text-dim uppercase tracking-widest px-3">
            Your Collection
          </h2>
          <div className="flex flex-col gap-1">
            <SidebarItem icon={Heart} label="Liked Songs" />
            <SidebarItem icon={PlusSquare} label="Playlists" />
            <SidebarItem icon={Music2} label="Artists" />
          </div>
        </div>
      </div>

      <div className="mt-auto p-4 bg-glass rounded-2xl border border-glass-border">
        <p className="text-[10px] text-accent font-bold mb-1 uppercase tracking-wider">PRO PLAN</p>
        <p className="text-xs text-text-main font-medium mb-3">Get unlimited skips and no ads.</p>
        <button className="w-full py-2 bg-text-main text-bg-main text-xs font-bold rounded-lg hover:bg-white transition-colors">
          Upgrade Now
        </button>
      </div>
    </div>
  );
};
