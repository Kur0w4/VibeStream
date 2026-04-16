import React, { useState } from 'react';
import { User, LogOut, Settings, Trash2, History } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { AuthModal } from './AuthModal';

export const TopBar = () => {
  const { user, logout, clearQueue } = usePlayerStore();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '';

  React.useEffect(() => {
    const handleOutsideClick = () => setShowMenu(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const clearHistory = async () => {
    // We update local store directly, we could also call API but for now we reset the store visually
    usePlayerStore.setState({ listeningHistory: [] });
  };

  return (
    <header className="sticky top-0 z-[100] w-full px-8 py-5 bg-bg-main/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-end h-[90px] shrink-0">
      <div className="flex items-center gap-4">
        {!user ? (
          <button
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-accent to-blue-500 hover:from-accent/90 hover:to-blue-500/90 text-black font-black rounded-2xl transition-all shadow-xl shadow-accent/20 hover:scale-105"
          >
            <User className="w-5 h-5" />
            Sign In
          </button>
        ) : (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 pl-3 pr-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-black font-black text-sm">{initials}</span>
              </div>
              <span className="text-sm font-bold text-white max-w-[120px] truncate">{user.username}</span>
            </button>

            {/* Settings Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-[115%] w-56 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl py-2 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-bold text-white truncate">{user.username}</p>
                  <p className="text-xs text-text-dim">Premium User</p>
                </div>
                
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Settings className="w-4 h-4" /> Account Settings
                  </button>
                  <button onClick={clearHistory} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <History className="w-4 h-4" /> Clear History
                  </button>
                  <button onClick={clearQueue} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                    <Trash2 className="w-4 h-4" /> Clear Queue
                  </button>
                </div>

                <div className="p-2 border-t border-white/5">
                  <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </header>
  );
};
