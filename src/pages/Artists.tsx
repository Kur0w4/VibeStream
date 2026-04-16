import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Mic2, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/usePlayerStore';
import { searchArtists, Artist } from '../services/api';
import { cn } from '../lib/utils';

export const Artists = () => {
  const navigate = useNavigate();
  const { followedArtists, followArtist, unfollowArtist } = usePlayerStore();

  const [query, setQuery] = useState('');
  const [suggested, setSuggested] = useState<Artist[]>([]);
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [loadingDefault, setLoadingDefault] = useState(true);
  const [searching, setSearching] = useState(false);

  // Load trending artists on mount
  useEffect(() => {
    searchArtists('').then(setSuggested).catch(() => {}).finally(() => setLoadingDefault(false));
  }, []);

  // Debounced search + pressing Enter navigates direct to artist profile
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return; }
    const id = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchArtists(query)); }
      catch {} finally { setSearching(false); }
    }, 600);
    return () => clearTimeout(id);
  }, [query]);

  const isFollowed = (name: string) => followedArtists.some((a) => a.name === name);
  const hasQuery = query.trim().length > 0;

  // On Enter → navigate directly to artist profile (best for specific artist names)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/artists/${encodeURIComponent(query.trim())}`);
  };

  const displayList: Artist[] = hasQuery ? searchResults : followedArtists.length > 0 ? followedArtists : suggested;
  const sectionLabel = hasQuery
    ? `Results for "${query}" — click any card or press Enter to view their songs`
    : followedArtists.length > 0 ? 'Artists you follow' : 'Trending artists';

  const ArtistCard = ({ artist }: { artist: Artist }) => {
    const followed = isFollowed(artist.name);
    return (
      <div
        onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
        className="group bg-white/5 hover:bg-white/10 p-5 rounded-[28px] border border-white/5 hover:border-accent/20 transition-all duration-300 cursor-pointer text-center"
      >
        <div className="relative w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-2 border-transparent group-hover:border-accent group-hover:shadow-[0_0_25px_rgba(56,189,248,0.3)] transition-all duration-500">
          {artist.thumbnail ? (
            <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center"><Mic2 className="w-10 h-10 text-text-dim" /></div>
          )}
          <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <h3 className="text-sm font-black text-white group-hover:text-accent transition-colors line-clamp-2 mb-3 min-h-[2.5rem]">{artist.name}</h3>

        <button
          onClick={(e) => { e.stopPropagation(); followed ? unfollowArtist(artist.name) : followArtist(artist); }}
          className={cn(
            'w-full py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border',
            followed
              ? 'bg-accent/10 border-accent/30 text-accent hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-bg-main'
          )}
        >
          {followed ? <><UserCheck className="w-3 h-3" />Following</> : <><UserPlus className="w-3 h-3" />Follow</>}
        </button>
      </div>
    );
  };

  const isLoading = (!hasQuery && loadingDefault) || (hasQuery && searching && searchResults.length === 0);

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar pb-36">
      <div className="px-4 md:px-10 py-8 md:py-12">
        <header className="flex flex-col gap-1 md:gap-2 mb-8 md:mb-10 text-center md:text-left">
          <span className="text-accent text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em]">Discover</span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Artists</h1>
          <p className="text-text-dim text-xs md:text-sm max-w-xl font-medium mt-1 mx-auto md:mx-0">Search by name and discover their full music collection</p>
        </header>

        {/* Search — Enter navigates to artist profile */}
        <form onSubmit={handleSearch} className="relative group mb-10 max-w-md mx-auto md:mx-0 flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artist..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 md:py-3.5 pl-12 pr-4 outline-none focus:border-accent/50 focus:bg-white/8 transition-all text-sm placeholder:text-text-dim/50"
            />
          </div>
          {query.trim() && (
            <button type="submit" className="px-4 md:px-5 py-3 md:py-3.5 bg-accent text-black font-black text-xs md:text-sm rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-accent/20 whitespace-nowrap">
              View songs
            </button>
          )}
          {query && !searching && (
            <button type="button" onClick={() => setQuery('')}
              className={cn("absolute top-1/2 -translate-y-1/2 text-text-dim hover:text-white text-xs transition-colors px-2", query.trim() ? "right-[110px] md:right-[130px]" : "right-2")}>✕</button>
          )}
          {searching && <Loader2 className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-accent animate-spin", query.trim() ? "right-[115px] md:right-[135px]" : "right-4")} />}
        </form>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-white tracking-tight">{sectionLabel}</h2>
          {!hasQuery && followedArtists.length > 0 && (
            <span className="text-xs text-text-dim font-bold">{followedArtists.length} following</span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="text-text-dim font-medium">Loading artists...</span>
          </div>
        ) : hasQuery && searchResults.length === 0 && !searching ? (
          <div className="text-center py-16">
            <Mic2 className="w-14 h-14 mx-auto mb-4 text-white/20" />
            <p className="text-white/50 font-bold text-lg">No matching channels found</p>
            <p className="text-text-dim text-sm mt-1">Press Enter or click "View songs" to see songs by <span className="text-accent">"{query}"</span></p>
            <button onClick={() => navigate(`/artists/${encodeURIComponent(query)}`)}
              className="mt-4 px-6 py-3 bg-accent text-black font-black text-sm rounded-2xl hover:opacity-90 shadow-lg shadow-accent/20">
              View "{query}" songs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {displayList.map((artist) => <ArtistCard key={artist.name} artist={artist} />)}
          </div>
        )}
      </div>
    </div>
  );
};
