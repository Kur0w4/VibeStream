import React, { useState } from 'react';
import { Heart, Play, Pause, Clock, MoreHorizontal, Search as SearchIcon, Shuffle } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { TrackDropdown } from '../components/Search';
import { cn } from '../lib/utils';

export const LikedSongs = () => {
  const { playTrack, currentTrack, isPlaying, togglePause, likedSongs, user } = usePlayerStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const filtered = likedSongs.filter((t) =>
    !searchQuery.trim() ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const playAll = () => { if (filtered.length > 0) playTrack(filtered[0]); };
  const playShuffle = () => {
    if (filtered.length === 0) return;
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
  };

  const displayName = user?.username ?? 'You';

  return (
    <div className="flex-1 bg-gradient-to-b from-rose-900/30 via-bg-main to-black overflow-y-auto custom-scrollbar pb-36">
      {/* Hero Header */}
      <div className="px-6 md:px-10 py-10 md:py-14 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 text-center md:text-left">
        <div className="w-40 h-40 md:w-52 md:h-52 bg-gradient-to-br from-rose-500 to-red-700 rounded-[32px] md:rounded-[36px] shadow-[0_20px_50px_rgba(244,63,94,0.3)] flex items-center justify-center p-10 md:p-12 shrink-0">
          <Heart className="w-full h-full text-white fill-white drop-shadow-2xl" />
        </div>
        <div className="mb-2">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">Playlist</span>
          <h1 className="text-4xl md:text-7xl font-black text-white mt-2 tracking-tighter">Liked Songs</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-4 md:mt-5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <span className="text-[10px] font-black text-black">{displayName.slice(0, 1).toUpperCase()}</span>
            </div>
            <span className="text-sm font-black text-white">{displayName}</span>
            <span className="w-1 h-1 bg-white/30 rounded-full" />
            <span className="text-sm font-medium text-text-dim">
              {likedSongs.length} song{likedSongs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 md:px-10 py-6">
        {/* Actions bar */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={playAll}
            disabled={likedSongs.length === 0}
            title="Play all"
            className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
          >
            <Play className="w-7 h-7 fill-current ml-0.5" />
          </button>
          <button
            onClick={playShuffle}
            disabled={likedSongs.length === 0}
            title="Shuffle play"
            className="p-3 rounded-full hover:bg-white/5 text-text-dim hover:text-white transition-all disabled:opacity-40"
          >
            <Shuffle className="w-6 h-6" />
          </button>
          <button title="More actions" className="p-3 rounded-full hover:bg-white/5 text-text-dim hover:text-white transition-all hidden md:block">
            <MoreHorizontal className="w-6 h-6" />
          </button>

          {/* Search */}
          <div className="ml-auto relative group">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in liked songs"
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-text-dim/50 outline-none focus:border-accent/50 focus:bg-white/8 transition-all w-52"
            />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_40px] md:grid-cols-[40px_1fr_1fr_100px_40px] gap-2 md:gap-4 px-2 md:px-6 py-3 border-b border-white/5 text-[10px] font-black text-text-dim uppercase tracking-widest mb-2 overflow-hidden">
          <span className="text-center">#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span className="text-center hidden md:block"><Clock className="w-4 h-4 mx-auto" /></span>
        </div>

        {/* Track list */}
        <div className="space-y-1">
          {likedSongs.length === 0 ? (
            <div className="text-center py-20">
              <Heart className="w-12 h-12 mx-auto mb-4 text-rose-500/30" />
              <p className="text-text-dim font-medium italic">No liked songs yet.</p>
              <p className="text-text-dim text-sm mt-1">Like tracks from the Home or Trends tabs</p>
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
                    isActive ? 'bg-rose-500/10 border border-rose-500/20' : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="text-center">
                    {isActive && isPlaying ? (
                      <div className="flex gap-[2px] items-end h-4 justify-center">
                        {[1,2,3].map((i) => (
                          <div 
                            key={i} 
                            className="w-[3px] bg-rose-400 rounded-full animate-bounce" 
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
                          {isActive ? <Pause className="w-4 h-4 text-rose-400 fill-current" /> : <Play className="w-4 h-4 text-rose-400 fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-xl shadow-lg shrink-0 object-cover" alt="" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', isActive ? 'text-rose-400' : 'text-white')}>{track.title}</p>
                      <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-medium truncate hidden md:block">YouTube Music</span>
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
