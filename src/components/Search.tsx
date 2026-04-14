import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Clock, MoreHorizontal, Heart } from 'lucide-react';
import { searchTracks, getTrendingTracks } from '../services/api';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack, currentTrack, isPlaying, playlists, addTrackToPlaylist, toggleLike, likedSongs } = usePlayerStore();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      const data = await getTrendingTracks();
      setResults(data);
      setLoading(false);
    };
    if (!query) {
      fetchInitial();
    }
  }, [query]);

  useEffect(() => {
    if (!query.trim()) return;

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const data = await searchTracks(query);
      setResults(data);
      setLoading(false);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  // Close dropdown when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar">
      {/* Header with Search */}
      <div className="sticky top-0 z-10 px-8 py-6 bg-bg-main/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
        <form onSubmit={handleSearch} className="relative group w-96">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
          <input 
            type="text" 
            placeholder="Search for music, artists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 outline-none focus:border-accent/50 focus:bg-white/10 transition-all text-sm placeholder:text-text-dim/50"
          />
        </form>
        
        <div className="flex items-center gap-4">
          <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">Sign In</button>
          <button className="px-5 py-2.5 rounded-xl bg-accent text-black text-sm font-bold hover:opacity-90 shadow-lg shadow-accent/20 transition-all">Upgrade Plan</button>
        </div>
      </div>

      <div className="px-8 py-6 space-y-12 pb-32">
        {/* Recommended/Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white">Recommended for you</h3>
              <p className="text-text-dim text-sm mt-1">Based on your recent listening</p>
            </div>
            <button className="text-accent text-sm font-bold hover:underline underline-offset-4">View All</button>
          </div>
          
          <div className="space-y-1">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              results.map((track, index) => (
                <div 
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={cn(
                    "grid grid-cols-[40px_1fr_1fr_80px_40px] gap-4 px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all duration-300 relative",
                    currentTrack?.id === track.id ? "bg-accent/10 border border-accent/20" : "hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className="flex items-center justify-center">
                    {currentTrack?.id === track.id && isPlaying ? (
                      <div className="wave-container">
                        <div className="wave-bar" />
                        <div className="wave-bar" style={{ animationDelay: '0.1s' }} />
                        <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-text-dim group-hover:hidden">{index + 1}</span>
                    )}
                    <Play className={cn(
                      "w-4 h-4 text-accent hidden group-hover:block fill-current",
                      currentTrack?.id === track.id && "block"
                    )} />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <img src={track.thumbnail} className="w-12 h-12 rounded-xl object-cover shadow-lg" alt={track.title} />
                    <div className="min-w-0">
                      <p className={cn("text-sm font-bold truncate", currentTrack?.id === track.id ? "text-accent" : "text-white")}>
                        {track.title}
                      </p>
                      <p className="text-xs text-text-dim truncate font-medium">{track.artist}</p>
                    </div>
                  </div>
                  
                  <span className="text-xs text-text-dim font-medium">Vibe Album</span>
                  <span className="text-xs text-text-dim font-mono text-center">{track.duration}</span>
                  
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white"
                    >
                      <Heart className={cn("w-4 h-4", likedSongs?.some(t => t.id === track.id) ? "fill-rose-500 text-rose-500" : "")} />
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === track.id ? null : track.id); }}
                      className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Playlist Dropdown */}
                    {activeDropdown === track.id && (
                      <div 
                        className="absolute right-12 top-10 w-48 bg-bg-sidebar border border-white/10 rounded-xl shadow-2xl py-2 z-50 overflow-hidden" 
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="px-4 py-2 text-xs font-bold text-text-dim uppercase tracking-wider mb-1">Add to Playlist</div>
                        {playlists?.length > 0 ? playlists.map(pl => (
                          <button 
                            key={pl.id}
                            onClick={() => { addTrackToPlaylist(pl.id, track); setActiveDropdown(null); }}
                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white transition-colors flex items-center justify-between group/btn"
                          >
                            <span className="truncate pr-2">{pl.name}</span>
                            <span className="text-[10px] text-accent opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap">Add +</span>
                          </button>
                        )) : (
                          <div className="px-4 py-2 text-sm text-text-dim italic">No playlists yet. Go to Playlists tab to create one.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
