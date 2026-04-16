import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Library, Heart, ListMusic } from 'lucide-react';
import { cn } from '../lib/utils';

export const MobileNav = () => {
  const navItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Compass, label: 'Trends', to: '/trends' },
    { icon: Library, label: 'Library', to: '/library' },
    { icon: Heart, label: 'Liked', to: '/liked-songs' },
    { icon: ListMusic, label: 'Playlists', to: '/playlists' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-bg-sidebar/95 backdrop-blur-3xl border-t border-white/5 px-4 pb-safe pt-2 md:hidden">
      <div className="flex items-center justify-around max-w-lg mx-auto h-[70px]">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }: { isActive: boolean }) => cn(
              'flex flex-col items-center gap-1 min-w-[64px] transition-all',
              isActive ? 'text-accent' : 'text-text-dim hover:text-white'
            )}
          >
            <div className={cn(
              'p-1 rounded-xl transition-all',
              'group-hover:bg-white/5'
            )}>
              <Icon className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-tight">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
