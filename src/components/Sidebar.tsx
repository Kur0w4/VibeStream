import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Library, PlusSquare, Heart, Music2, TrendingUp, Mic2 } from 'lucide-react';
import { cn } from '../lib/utils';

const SidebarItem = ({ icon: Icon, label, to }: { icon: any; label: string; to: string }) => (
  <NavLink
    to={to}
    className={({ isActive }: { isActive: boolean }) =>
      cn(
        'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all duration-200 rounded-lg group',
        isActive ? 'bg-glass text-text-main border border-glass-border' : 'text-text-dim hover:text-text-main hover:bg-glass'
      )
    }
  >
    {({ isActive }: { isActive: boolean }) => (
      <>
        <Icon className={cn('w-4 h-4', isActive ? 'text-accent' : 'group-hover:text-accent')} />
        <span className="font-medium text-sm">{label}</span>
      </>
    )}
  </NavLink>
);

export const Sidebar = () => {
  const navigate = useNavigate();

  return (
    <>
      <div className="w-[var(--sidebar-width)] h-full bg-bg-sidebar border-r border-white/5 flex flex-col p-6 hidden md:flex z-20">

        {/* Logo — click goes to Home */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 mb-10 px-2 group w-full text-left"
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-accent to-blue-500 rounded-xl flex items-center justify-center rotate-3 shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
            <Music2 className="text-black w-6 h-6 fill-black" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white group-hover:text-accent transition-colors">VIBESTREAM</h1>
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest leading-none">Premium</span>
          </div>
        </button>

        {/* Nav */}
        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
          <div className="flex flex-col gap-2">
            <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] px-3 mb-2">Main Menu</h2>
            <div className="flex flex-col gap-1">
              <SidebarItem icon={Home} label="Home" to="/" />
              <SidebarItem icon={TrendingUp} label="Trends" to="/trends" />
              <SidebarItem icon={Library} label="Library" to="/library" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[11px] font-bold text-text-dim uppercase tracking-[0.2em] px-3 mb-2">Discover</h2>
            <div className="flex flex-col gap-1">
              <SidebarItem icon={PlusSquare} label="Playlists" to="/playlists" />
              <SidebarItem icon={Mic2} label="Artists" to="/artists" />
              <SidebarItem icon={Heart} label="Liked Songs" to="/liked-songs" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
