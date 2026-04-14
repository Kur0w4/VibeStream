import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, Clock, MoreHorizontal } from 'lucide-react';
import { searchTracks, getTrendingTracks } from '../services/api';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    const fetchInitial = async () => {
      setLoading(true);
      const data = await getTrendingTracks();
      setResults(data);
      setLoading(false);
    };
    fetchInitial();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchTracks(query);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <form onSubmit={handleSearch} className="relative w-full max-w-md">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim w-4 h-4" />
          <input 
            type="text"
            placeholder="Search artists, songs, or mood..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-glass border border-glass-border rounded-full py-2.5 pl-11 pr-4 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          />
        </form>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-600 border border-glass-border" />
          <span className="text-sm font-medium text-text-main">Alex Rivera</span>
        </div>
      </header>

      <section className="mb-10">
        <div className="relative h-[220px] rounded-[24px] overflow-hidden bg-gradient-to-br from-[#0ea5e9] to-[#6366f1] p-8 flex flex-col justify-end group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white mb-2 uppercase tracking-wider">
              NEW RELEASE
            </span>
            <h1 className="text-4xl font-extrabold text-white mb-1 tracking-tight">Midnight City Sessions</h1>
            <p className="text-white/80 text-sm max-w-md">Experience the ultimate lo-fi journey curated for deep focus.</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-bold mb-4 text-text-main">Trending Now</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {results.slice(0, 4).map((track) => (
            <div 
              key={track.id}
              className="group bg-glass hover:bg-white/5 p-3 rounded-[16px] border border-glass-border transition-all duration-300 cursor-pointer"
              onClick={() => playTrack(track)}
            >
              <div className="relative aspect-square rounded-[12px] overflow-hidden mb-3 shadow-lg">
                <img 
                  src={track.thumbnail} 
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 bg-text-main rounded-full flex items-center justify-center shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                    <Play className="text-bg-main fill-current w-5 h-5 ml-0.5" />
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-sm line-clamp-1 text-text-main">{track.title}</h3>
              <p className="text-text-dim text-xs">{track.artist}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-main">Recommended for you</h2>
          <button className="text-xs text-text-dim hover:text-text-main font-semibold transition-colors">Show all</button>
        </div>
        
        <div className="space-y-1">
          {results.map((track, index) => (
            <div 
              key={track.id}
              onClick={() => playTrack(track)}
              className={cn(
                "grid grid-cols-[40px_1fr_1fr_80px_40px] gap-4 px-4 py-2.5 rounded-xl items-center group cursor-pointer transition-colors",
                currentTrack?.id === track.id ? "bg-accent/10" : "hover:bg-glass"
              )}
            >
              <span className="text-xs text-text-dim group-hover:hidden">{index + 1}</span>
              <Play className="w-3.5 h-3.5 text-accent hidden group-hover:block fill-current" />
              
              <div className="flex items-center gap-3">
                <img src={track.thumbnail} className="w-10 h-10 rounded-lg object-cover border border-glass-border" />
                <div>
                  <p className={cn("text-sm font-semibold", currentTrack?.id === track.id ? "text-accent" : "text-text-main")}>
                    {track.title}
                  </p>
                  <p className="text-[11px] text-text-dim">{track.artist}</p>
                </div>
              </div>
              
              <span className="text-xs text-text-dim">Vibe Mix</span>
              <span className="text-xs text-text-dim text-center">{track.duration}</span>
              <button className="text-text-dim hover:text-text-main opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
