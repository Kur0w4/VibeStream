import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { searchTracks } from '../services/api';
import { ChevronLeft, Play, Pause, Shuffle, MoreHorizontal, Trash2, Loader2, Zap, ListMusic, Search as SearchIcon, Heart } from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { TrackDropdown } from '../components/Search';
import { cn } from '../lib/utils';

export const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, playlists, playTrack, currentTrack, isPlaying, togglePause, removeTrackFromPlaylist, addTrackToPlaylist, likedSongs, toggleLike } = usePlayerStore();
  const [mixTracks, setMixTracks] = useState<Track[]>([]);
  const [mixLoading, setMixLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try { setSearchResults(await searchTracks(searchQuery)); }
      catch {} finally { setIsSearching(false); }
    }, 600);
    return () => clearTimeout(t);
  }, [searchQuery]);

  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const isMix = id === 'mix';

  const playlist = isMix
    ? { id: 'mix', name: 'Your Mix', tracks: mixTracks }
    : playlists.find((pl) => pl.id === id);

  useEffect(() => {
    if (!isMix || !user) return;
    setMixLoading(true);
    fetch('/api/mix', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setMixTracks(Array.isArray(data) ? data : []); setMixLoading(false); })
      .catch(() => setMixLoading(false));
  }, [isMix, user]);

  if (isMix && !user) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-6 bg-gradient-to-b from-bg-main to-black p-10">
        <div className="w-24 h-24 bg-accent/10 border border-accent/20 rounded-[32px] flex items-center justify-center shadow-2xl">
          <Zap className="w-12 h-12 text-accent" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Login Required</h2>
          <p className="text-text-dim font-medium max-w-xs mx-auto">Please log in to unlock your personalized daily mix based on your listening habits.</p>
        </div>
        <button onClick={() => navigate('/library')} className="px-8 py-3 bg-accent text-black font-black text-sm rounded-2xl hover:scale-105 transition-all shadow-xl shadow-accent/20">
          Go to Login
        </button>
      </div>
    );
  }

  if (!isMix && !playlist) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <ListMusic className="w-16 h-16 text-white/20" />
        <p className="text-text-dim font-bold">Playlist not found</p>
        <button onClick={() => navigate('/playlists')} className="text-accent font-bold hover:underline">Back to Playlists</button>
      </div>
    );
  }

  const tracks = playlist?.tracks ?? [];
  const cover = isMix ? null : tracks[0]?.thumbnail;

  const playAll = () => { if (tracks.length > 0) playTrack(tracks[0], tracks); };
  const playShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-bg-main to-black pb-36 px-0 md:px-0">
      {/* Hero */}
      <div className="relative px-6 md:px-10 py-10 md:py-12 flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-main pointer-events-none" />
        <button
          onClick={() => navigate('/playlists')}
          title="Back to playlists"
          className="absolute top-6 left-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Cover */}
        <div className="w-40 h-40 md:w-52 md:h-52 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl shrink-0 relative z-10">
          {isMix ? (
            <div className="w-full h-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <Zap className="w-24 h-24 text-black/70" />
            </div>
          ) : cover ? (
            <img src={cover} alt={playlist?.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <ListMusic className="w-24 h-24 text-text-dim" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="relative z-10 pb-2 text-center md:text-left">
          <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">
            {isMix ? 'Auto Mix' : 'Playlist'}
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white mt-1.5 tracking-tighter">{playlist?.name}</h1>
          <p className="text-text-dim text-sm mt-3 font-medium">
            {mixLoading ? 'Generating your mix...' : `${tracks.length} songs`}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 md:px-10 py-6 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={playAll}
          disabled={tracks.length === 0}
          title="Play all"
          className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
        >
          <Play className="w-7 h-7 fill-current ml-0.5" />
        </button>
        <button
          onClick={playShuffle}
          disabled={tracks.length === 0}
          title="Shuffle play"
          className="p-3 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-40"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {/* Playlist Search area for adding new tracks (moved to top) */}
      {!isMix && (
        <div className="px-6 md:px-10 pt-8 pb-4">
          <h3 className="text-xl font-black text-white mb-4">Let's find something for your playlist</h3>
          <div className="relative max-w-md group mb-6">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search for songs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search for songs to add"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-accent/50 focus:bg-white/8 transition-all text-sm placeholder:text-text-dim/50"
            />
          </div>
          
          {isSearching ? (
             <div className="py-4 flex justify-start pl-6"><Loader2 className="w-6 h-6 text-accent animate-spin" /></div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 max-w-4xl mb-8 border-b border-white/5 pb-8">
              {searchResults.slice(0, 5).map((track, index) => {
                 const isAdded = tracks.some(t => t.id === track.id);
                 return (
                   <div key={`${track.id}-${index}`} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 group border border-transparent transition-all">
                     <div className="flex items-center gap-4 min-w-0 flex-1">
                       <img src={track.thumbnail} className="w-10 h-10 rounded-xl object-cover shrink-0" alt="" />
                       <div className="min-w-0 flex-1 pr-4">
                         <p className="text-sm font-bold text-white truncate">{track.title}</p>
                         <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                       </div>
                     </div>
                     <button
                       onClick={() => !isAdded && addTrackToPlaylist(id!, track)}
                       className={cn("px-5 py-2 rounded-full text-xs font-black border transition-all shrink-0", 
                         isAdded ? "bg-white/5 border-white/10 text-white/40 cursor-default" : "border-white/20 hover:border-white hover:text-bg-main hover:bg-white text-white")}
                     >
                       {isAdded ? "Added" : "Add"}
                     </button>
                   </div>
                 );
              })}
            </div>
          ) : searchQuery ? (
             <p className="text-text-dim text-sm py-4 italic mb-8">No results found for "{searchQuery}"</p>
          ) : null}
        </div>
      )}

      {/* Track list */}
      <div className="px-2 md:px-10 py-4 overflow-hidden">
        {mixLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="ml-3 text-text-dim font-medium">Building your mix...</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20 text-text-dim">
            <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold text-white/50">
              {isMix ? 'Listen to some music first to generate your mix' : 'No songs in this playlist yet'}
            </p>
            {!isMix && (
              <p className="text-sm mt-1">Search for songs below and add them here</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => isActive ? togglePause() : playTrack(track, tracks)}
                  className={cn(
                    'grid gap-2 md:gap-4 px-3 md:px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all',
                    isMix
                      ? 'grid-cols-[40px_1fr_40px_40px] md:grid-cols-[40px_1fr_80px_40px_40px]' // Hidden duration on mobile
                      : 'grid-cols-[40px_1fr_40px_40px] md:grid-cols-[40px_1fr_80px_40px_40px_40px]', 
                    isActive ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="flex items-center justify-center">
                    {isActive && isPlaying ? (
                      <div className="flex gap-[2px] items-end h-4">
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
                        <span className={cn('text-xs font-medium text-text-dim group-hover:hidden', isActive && 'hidden')}>{index + 1}</span>
                        <div className={cn('hidden group-hover:flex items-center', isActive && 'flex')}>
                          {isActive ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 min-w-0">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-xl object-cover shadow-lg shrink-0" alt="" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
                      <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-mono text-center hidden md:block">{track.duration}</span>

                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                    title={likedSongs.some(t => t.id === track.id) ? "Unlike" : "Like"}
                    className="flex justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                  >
                    <Heart className={cn('w-4 h-4 transition-all hover:scale-110', likedSongs.some(t => t.id === track.id) ? 'fill-rose-500 text-rose-500 opacity-100' : 'text-text-dim hover:text-white')} />
                  </button>

                  <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                      title="More options"
                      className="text-text-dim hover:text-white p-1.5 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
                  </div>

                  {!isMix && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(id!, track.videoId); }}
                      title="Remove from playlist"
                      className="text-text-dim hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
