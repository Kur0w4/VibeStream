import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mic2, Play, Pause, UserPlus, UserCheck, Loader2, Heart, MoreHorizontal, Search as SearchIcon } from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { searchTracks } from '../services/api';
import { TrackDropdown } from '../components/Search';
import { HeroSkeleton, TrackRowSkeleton } from '../components/Skeletons';
import { cn } from '../lib/utils';

export const ArtistProfile = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, togglePause, followArtist, unfollowArtist, followedArtists, likedSongs, toggleLike } = usePlayerStore();

  const artistName = name ? decodeURIComponent(name) : '';
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const isFollowed = followedArtists.some((a) => a.name === artistName);

  useEffect(() => {
    if (!artistName) return;
    setLoading(true);
    fetch(`/api/artist/${encodeURIComponent(artistName)}/tracks`)
      .then((r) => r.json())
      .then((data: Track[]) => {
        setTracks(data);
        if (data.length > 0 && !thumbnail) setThumbnail(data[0].thumbnail);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [artistName, thumbnail]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchTracks(`${artistName} ${searchQuery}`);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [searchQuery, artistName]);

  const displayTracks = searchQuery.trim() ? searchResults : tracks;

  if (loading) return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-main pb-36">
      <HeroSkeleton />
      <div className="px-10 py-10 space-y-4">
        {[1,2,3,4,5,6,7,8].map((i, idx) => <TrackRowSkeleton key={i} index={idx} />)}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-bg-main to-black pb-36">
      {/* Hero */}
      <div className="relative h-64 md:h-72 px-4 md:px-10 flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-bg-main z-10" />
        {thumbnail && (
          <img 
            src={thumbnail} 
            loading="lazy" 
            onLoad={(e) => (e.currentTarget.style.opacity = '0.2')}
            className="absolute inset-0 w-full h-full object-cover opacity-0 scale-110 blur-sm transition-opacity duration-1000" 
            alt="" 
          />
        )}

        <button
          onClick={() => navigate('/artists')}
          title="Go back to artists"
          className="absolute top-4 md:top-6 left-4 md:left-6 z-20 p-2 md:p-2.5 bg-black/40 hover:bg-black/60 rounded-full transition-all text-white border border-white/5 shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative z-20 flex items-center md:items-end gap-5 md:gap-6 pb-6 text-center md:text-left">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl shrink-0 mx-auto md:mx-0">
            {thumbnail ? (
              <img src={thumbnail} loading="lazy" className="w-full h-full object-cover" alt={artistName} />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Mic2 className="w-10 h-10 md:w-14 md:h-14 text-text-dim" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] md:text-[10px] font-black text-accent uppercase tracking-[0.3em]">Artist</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter mt-1 truncate">{artistName}</h1>
            <p className="text-text-dim text-xs md:text-sm mt-1">{tracks.length} songs available</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 md:px-10 py-5 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => tracks.length > 0 && playTrack(tracks[0], tracks)}
          disabled={tracks.length === 0}
          title="Play top songs"
          className="w-12 h-12 md:w-14 md:h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
        >
          <Play className="w-6 h-6 md:w-7 md:h-7 fill-current ml-0.5" />
        </button>

        <button
          onClick={() => {
            const artist = { name: artistName, thumbnail };
            isFollowed ? unfollowArtist(artistName) : followArtist(artist);
          }}
          className={cn(
            'flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-2xl text-[13px] md:text-sm font-bold border transition-all',
            isFollowed
              ? 'bg-accent/10 border-accent/30 text-accent hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-bg-main'
          )}
        >
          {isFollowed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {isFollowed ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Tracks */}
      <div className="px-4 md:px-10 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h2 className="text-xl font-black text-white tracking-tight">
            {searchQuery.trim() ? `Search results for "${searchQuery}"` : 'Top Songs'}
          </h2>
          
          <div className="relative group max-w-sm w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              placeholder={`Search songs...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={`Search songs from ${artistName}`}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 md:py-3 pl-12 pr-4 outline-none focus:border-accent/50 focus:bg-white/8 transition-all text-sm placeholder:text-text-dim/50"
            />
          </div>
        </div>

        {isSearching && searchQuery.trim() ? (
          <div className="space-y-1">
            {[1,2,3,4,5].map((i, idx) => <TrackRowSkeleton key={i} index={idx} />)}
          </div>
        ) : displayTracks.length === 0 ? (
          <p className="text-center text-text-dim py-16">
            {searchQuery.trim() ? `No results found for "${searchQuery}"` : 'No songs found for this artist'}
          </p>
        ) : (
          <div className="space-y-1">
            {displayTracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={`${track.id}-${index}`}
                  onClick={() => isActive ? togglePause() : playTrack(track, displayTracks)}
                  className={cn(
                    'grid grid-cols-[40px_1fr_40px] md:grid-cols-[40px_1fr_80px_40px_40px] gap-2 md:gap-4 px-2 md:px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all',
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
                        <div className={cn('hidden group-hover:flex', isActive && 'flex')}>
                          {isActive ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <img 
                      src={track.thumbnail} 
                      loading="lazy" 
                      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                      className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover shadow-lg shrink-0 opacity-0 transition-opacity duration-500" 
                      alt="" 
                    />
                    <div className="min-w-0">
                      <p className={cn('text-[13px] md:text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
                      <p className="text-[11px] md:text-xs text-text-dim font-medium truncate md:hidden">{track.duration}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-mono text-center hidden md:block">{track.duration}</span>

                  <div className="flex items-center justify-end h-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                      title={likedSongs?.some(t => t.id === track.id) ? "Unlike" : "Like"}
                      className={cn(
                        "p-1.5 transition-all focus:opacity-100",
                        likedSongs?.some(t => t.id === track.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <Heart className={cn('w-4 h-4 transition-all hover:scale-110', likedSongs?.some(t => t.id === track.id) ? 'fill-rose-500 text-rose-500 opacity-100' : 'text-text-dim hover:text-white')} />
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
