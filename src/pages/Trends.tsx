import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, TrendingUp, MoreHorizontal, Clock, Heart } from 'lucide-react';
import { getTrendingTracks } from '../services/api';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { TrackDropdown } from '../components/Search';
import { cn } from '../lib/utils';

export const Trends = () => {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const { playTrack, currentTrack, isPlaying, likedSongs, toggleLike } = usePlayerStore();

  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      const data = await getTrendingTracks();
      setResults(data);
      setLoading(false);
    };
    fetchTrends();
  }, []);

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar">
      {/* Hero Section for Trends */}
      <div className="relative h-80 px-8 py-12 flex flex-col justify-end overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-blue-500/20 z-0 group-hover:scale-105 transition-transform duration-1000" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/40 to-transparent z-10" />
        
        <div className="relative z-20 flex items-end gap-6">
          <div className="w-48 h-48 rounded-2xl bg-white/5 border border-white/10 shadow-2xl flex items-center justify-center backdrop-blur-md rotate-3 group-hover:rotate-0 transition-transform duration-500">
             <TrendingUp className="w-24 h-24 text-accent drop-shadow-[0_0_20px_rgba(0,245,255,0.5)]" />
          </div>
          <div className="mb-4">
            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em] bg-accent/10 px-3 py-1 rounded-full border border-accent/20">Playlist Premium</span>
            <h1 className="text-6xl font-black text-white mt-4 tracking-tighter">Global Trends</h1>
            <p className="text-text-dim text-sm mt-2 max-w-md font-medium">The most played tracks on VibeStream right now. Updated every hour.</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 pb-32">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => results.length > 0 && playTrack(results[0], results)}
              className="flex items-center gap-2 text-sm font-bold text-accent"
            >
               <Play className="fill-accent w-4 h-4" /> Play All
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-text-dim uppercase tracking-widest">
               <Clock className="w-3.5 h-3.5" /> 24 Tracks • 1h 32m
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
               <SearchIcon className="w-4 h-4 text-text-dim" />
            </button>
          </div>
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
                onClick={() => {
                  const isActive = currentTrack?.id === track.id;
                  isActive ? togglePause() : playTrack(track, results);
                }}
                className={cn(
                  "grid grid-cols-[40px_1fr_1fr_80px_40px_40px] gap-4 px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all duration-300",
                  currentTrack?.id === track.id ? "bg-accent/10 border border-accent/20 shadow-lg shadow-accent/5" : "hover:bg-white/5 border border-transparent"
                )}
              >
                <div className="flex items-center justify-center">
                   {currentTrack?.id === track.id && isPlaying ? (
                     <div className="wave-container scale-75">
                       <div className="wave-bar" />
                       <div className="wave-bar" style={{ animationDelay: '0.1s' }} />
                       <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                     </div>
                   ) : (
                     <span className="text-xs font-bold text-text-dim group-hover:hidden">{index + 1}</span>
                   )}
                   <Play className={cn(
                     "w-4 h-4 text-accent hidden group-hover:block fill-current",
                     currentTrack?.id === track.id && "block"
                   )} />
                </div>
                
                <div className="flex items-center gap-4">
                  <img src={track.thumbnail} className="w-12 h-12 rounded-xl object-cover shadow-xl border border-white/5" alt={track.title} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold truncate", currentTrack?.id === track.id ? "text-accent" : "text-white")}>
                      {track.title}
                    </p>
                    <p className="text-xs text-text-dim truncate font-medium">{track.artist}</p>
                  </div>
                </div>
                
                <span className="text-xs text-text-dim font-medium">Vibe Album</span>
                <span className="text-xs text-text-dim font-mono text-center font-bold">{track.duration}</span>
                
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                  className="flex justify-end p-1.5 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                >
                  <Heart className={cn('w-4 h-4 transition-all hover:scale-110', likedSongs?.some(t => t.id === track.id) ? 'fill-rose-500 text-rose-500 opacity-100' : 'text-text-dim hover:text-white')} />
                </button>

                <div className="relative flex justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
