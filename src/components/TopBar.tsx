import React, { useState } from 'react';
import { User, LogOut, Settings, Trash2, History } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';

export const TopBar = () => {
  const navigate = useNavigate();
  const { user, logout, clearQueue } = usePlayerStore();
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '';

  React.useEffect(() => {
    const handleOutsideClick = () => setShowMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const clearHistory = async () => {
    usePlayerStore.setState({ listeningHistory: [] });
  };

  return (
    <header className="sticky top-0 z-[100] w-full px-4 md:px-8 py-2 bg-bg-main/95 backdrop-blur-2xl flex items-center justify-end h-[64px] md:h-[72px] shrink-0">
      <div className="flex items-center gap-4">
        {!user ? (
          <Link
            to="/auth"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90 text-black font-black rounded-xl transition-all shadow-xl shadow-accent/20 hover:scale-105 text-sm"
          >
            <User className="w-4 h-4" />
            Sign In
          </Link>
        ) : (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 pr-4 md:pr-5 py-2 md:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-black font-black text-xs md:text-sm">{initials}</span>
              </div>
              <span className="text-xs md:text-sm font-bold text-white max-w-[80px] md:max-w-[120px] truncate">{user.username}</span>
            </button>

            {/* Settings Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-[115%] w-56 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-bold text-white truncate">{user.username}</p>
                  <p className="text-xs text-text-dim">Premium User</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <button 
                    onClick={() => { setShowMenu(false); navigate('/settings'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Account Settings
                  </button>
                  <button 
                    onClick={() => { 
                      setShowMenu(false); 
                      usePlayerStore.getState().clearHistory().then(() => alert("History cleared successfully.")); 
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <History className="w-4 h-4" /> Clear History
                  </button>
                  <button 
                    onClick={() => { setShowMenu(false); clearQueue(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Queue
                  </button>
                </div>

                <div className="p-2 border-t border-white/5">
                  <button 
                    onClick={() => { setShowMenu(false); logout(); navigate('/'); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
