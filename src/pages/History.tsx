import React, { useState } from 'react';
import { Clock, Play, Pause, MoreHorizontal, Search as SearchIcon, Shuffle, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackDropdown } from '../components/Search';
import { cn } from '../lib/utils';

export const History = () => {
  const { playTrack, currentTrack, isPlaying, togglePause, listeningHistory, user } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const filtered = listeningHistory.filter((t) =>
    !searchQuery.trim() ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playAll = () => { if (filtered.length > 0) playTrack(filtered[0], filtered); };
  const playShuffle = () => {
    if (filtered.length === 0) return;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const displayName = user?.username ?? 'You';

  return (
    <div className="flex-1 bg-gradient-to-b from-blue-900/20 via-bg-main to-black overflow-y-auto custom-scrollbar pb-36">
      {/* Hero Header */}
      <div className="px-6 md:px-10 py-10 md:py-14 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 relative overflow-hidden text-center md:text-left">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent pointer-events-none" />
        <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-[32px] md:rounded-[36px] shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex items-center justify-center p-10 md:p-12 shrink-0 relative z-10">
          <Clock className="w-full h-full text-white drop-shadow-2xl" />
        </div>
        <div className="mb-2 relative z-10">
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Personal Space</span>
          <h1 className="text-4xl md:text-7xl font-black text-white mt-2 tracking-tighter">Listening History</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-4 md:mt-5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <span className="text-[10px] font-black text-black">{displayName.slice(0, 1).toUpperCase()}</span>
            </div>
            <span className="text-sm font-black text-white">{displayName}</span>
            <span className="w-1 h-1 bg-white/30 rounded-full" />
            <span className="text-sm font-medium text-text-dim">
              {listeningHistory.length} track{listeningHistory.length !== 1 ? 's' : ''} recorded
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-10 py-6">
        {/* Actions bar */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={playAll}
              disabled={listeningHistory.length === 0}
              title="Play history from start"
              className="w-12 h-12 md:w-14 md:h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
            >
              <Play className="w-6 h-6 md:w-7 md:h-7 fill-current ml-0.5" />
            </button>
            <button
              onClick={playShuffle}
              disabled={listeningHistory.length === 0}
              title="Shuffle history"
              className="p-2.5 md:p-3 rounded-full hover:bg-white/5 text-text-dim hover:text-white transition-all disabled:opacity-40"
            >
              <Shuffle className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="md:ml-auto relative group w-full md:w-64">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in history"
              className="bg-white/5 border border-white/10 rounded-xl py-2 md:py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-dim/50 outline-none focus:border-accent/50 focus:bg-white/8 transition-all w-full"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_40px] md:grid-cols-[40px_1fr_1fr_100px_40px] gap-2 md:gap-4 px-2 md:px-6 py-3 border-b border-white/5 text-[10px] font-black text-text-dim uppercase tracking-widest mb-2">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Artist</span>
          <span className="text-center hidden md:block"><Clock className="w-4 h-4 mx-auto" /></span>
          <span />
        </div>

        {/* Track list */}
        <div className="space-y-1">
          {listeningHistory.length === 0 ? (
            <div className="text-center py-20 bg-white/3 rounded-[32px] border border-white/5">
              <Clock className="w-12 h-12 mx-auto mb-4 text-blue-500/30" />
              <p className="text-text-dim font-medium italic">No history recorded yet.</p>
              <p className="text-text-dim text-sm mt-1">Tracks you play will appear here</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-text-dim font-medium italic">No songs match "{searchQuery}"</p>
          ) : (
            filtered.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => isActive ? togglePause() : playTrack(track, filtered)}
                  className={cn(
                    'grid grid-cols-[40px_1fr_40px] md:grid-cols-[40px_1fr_1fr_100px_40px] gap-2 md:gap-4 px-2 md:px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all',
                    isActive ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="text-center">
                    {isActive && isPlaying ? (
                      <div className="flex gap-[2px] items-end h-4 justify-center">
                        {[1,2,3].map((i) => (
                          <div 
                            key={i} 
                            className="w-[3px] bg-accent rounded-full animate-bounce" 
                            style={{ 
                              '--height': `${8 + i * 4}px`, 
                              '--delay': `${i * 0.1}s` 
                            } as React.CSSProperties} 
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className={cn('text-xs font-bold text-text-dim group-hover:hidden', isActive && 'hidden')}>{index + 1}</span>
                        <div className={cn('hidden group-hover:flex justify-center', isActive && 'flex')}>
                          {isActive ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-xl shadow-lg shrink-0 object-cover" alt="" />
                    <div className="min-w-0">
                      <p className={cn('text-[13px] md:text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
                      <p className="text-[11px] md:text-xs text-text-dim font-medium truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-medium truncate hidden md:block">{track.artist}</span>
                  <span className="text-xs text-text-dim font-mono text-center font-bold hidden md:block">{track.duration}</span>

                  <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                      title="More options"
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeDropdown === track.id && (
                      <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
