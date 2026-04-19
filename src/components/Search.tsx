import { useState, useEffect, memo } from 'react';
import { Search as SearchIcon, Play, Pause, Heart, MoreHorizontal, Plus, ListPlus, Zap } from 'lucide-react';
import { searchTracks, getTrendingTracks } from '../services/api';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { TrackCardSkeleton, HistorySkeleton } from './Skeletons';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Shared track card dropdown — like, add to playlist, add to queue */
export const TrackDropdown = ({
  track, onClose,
}: { track: Track; onClose: () => void }) => {
  const { playlists, addTrackToPlaylist, toggleLike, likedSongs, addToQueue } = usePlayerStore();
  const liked = likedSongs?.some((t) => t.id === track.id);

  return (
    <div className="absolute right-0 top-10 w-56 bg-bg-sidebar border border-white/10 rounded-2xl shadow-2xl py-2 z-[100]" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => { toggleLike(track); onClose(); }}
        className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm transition-colors flex items-center gap-3"
      >
        <Heart className={cn('w-4 h-4', liked ? 'fill-rose-500 text-rose-500' : 'text-text-dim')} />
        <span className={liked ? 'text-rose-400' : 'text-white'}>{liked ? 'Unlike' : 'Like song'}</span>
      </button>
      <button
        onClick={() => { addToQueue(track); onClose(); }}
        className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm text-white transition-colors flex items-center gap-3"
      >
        <ListPlus className="w-4 h-4 text-accent" />
        Add to queue
      </button>
      {playlists?.length > 0 && (
        <>
          <div className="border-t border-white/5 mt-1 mb-1" />
          <p className="px-4 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-widest">Add to playlist</p>
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => { addTrackToPlaylist(pl.id, track); onClose(); }}
              className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white transition-colors flex items-center justify-between group/btn">
              <span className="truncate pr-2 flex items-center gap-2"><Plus className="w-3 h-3 text-text-dim" />{pl.name}</span>
            </button>
          ))}
        </>
      )}
      {(!playlists || playlists.length === 0) && (
        <>
          <div className="border-t border-white/5 mt-1" />
          <p className="px-4 py-2 text-xs text-text-dim italic">No playlists — create one first</p>
        </>
      )}
    </div>
  );
};

export const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const {
    playTrack, currentTrack, isPlaying, togglePause,
    likedSongs, toggleLike, listeningHistory, user,
  } = usePlayerStore();

  const hasHistory = listeningHistory.length > 0;

  // Initial trending load or dynamic mix based on history
  useEffect(() => {
    if (query) return;
    setLoading(true);

    if (hasHistory) {
      // Pick top 2 most recent distinct artists to form a dynamic search
      const recentArtists = Array.from(new Set(listeningHistory.map(t => t.artist))).slice(0, 2);
      const dynamicQuery = `${recentArtists.join(' ')} music`;
      
      searchTracks(dynamicQuery).then((d) => {
        if (d.length > 0) {
          setResults(d);
          setLoading(false);
        } else {
          // fallback if search fails
          getTrendingTracks().then((td) => { setResults(td); setLoading(false); });
        }
      }).catch(() => {
        getTrendingTracks().then((d) => { setResults(d); setLoading(false); });
      });
    } else {
      getTrendingTracks().then((d) => { setResults(d); setLoading(false); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) return;
    const id = setTimeout(async () => {
      setLoading(true);
      setResults(await searchTracks(query));
      setLoading(false);
    }, 600);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const quickPicks = listeningHistory.slice(0, 6);

  // ─── Main Grid logic ───
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-bg-main to-black pb-36">
      {/* Sticky search header */}
      <div className="sticky top-0 z-10 px-4 md:px-8 py-4 md:py-5 bg-bg-main/85 backdrop-blur-xl border-b border-white/5 flex items-center gap-4">
        <form onSubmit={(e) => e.preventDefault()} className="relative group flex-1 max-w-lg">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
          <input
            type="text" placeholder="Songs, artists, moods..." value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search songs, artists, or moods"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 md:py-3 pl-12 pr-6 outline-none focus:border-accent/50 focus:bg-white/8 transition-all text-sm placeholder:text-text-dim/50"
          />
        </form>
        {query && (
          <button onClick={() => setQuery('')} className="text-xs text-text-dim hover:text-white font-bold transition-colors">Clear</button>
        )}
      </div>

      <div className="px-4 md:px-8 py-8 space-y-12">

        {/* ─── GREETING ─── */}
        {!query && (
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                {getGreeting()}{user ? `, ${user.username}` : ''} 👋
              </h1>
              <p className="text-text-dim mt-1 font-medium">
                {quickPicks.length > 0 ? 'Jump back in where you left off' : "Discover what's trending today"}
              </p>
            </div>
          </div>
        )}

        {/* ─── QUICK PICKS (history grid) ─── */}
        {!query && (
          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">Jump back in</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <HistorySkeleton key={i} index={i} />)}
              </div>
            ) : quickPicks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <p className="text-text-dim text-sm italic">Nothing played yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {quickPicks.map((track, index) => {
                      const isActive = currentTrack?.id === track.id;
                      const liked = likedSongs?.some((t) => t.id === track.id);
                      return (
                        <div
                          key={`${track.id}-${index}`}
                          onClick={() => isActive ? togglePause() : playTrack(track, quickPicks)}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl cursor-pointer group transition-all border relative',
                            isActive ? 'bg-accent/15 border-accent/30' : 'bg-white/5 hover:bg-white/10 border-white/5'
                          )}
                        >
                          <img 
                            src={track.thumbnail} 
                            loading="lazy" 
                            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                            className="w-16 h-16 rounded-l-[15px] object-cover shrink-0 opacity-0 transition-opacity duration-500" 
                            alt="" 
                          />
                          <div className="flex-1 min-w-0 pr-2">
                             <p className="font-bold text-sm text-white truncate leading-none">{track.title}</p>
                             <p className="text-[10px] text-text-dim mt-1 truncate font-medium">{track.artist}</p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 mr-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                              title={liked ? "Unlike" : "Like"}
                              aria-label={liked ? "Unlike song" : "Like song"}
                              className={cn('p-1.5 rounded-full transition-all hover:scale-110 opacity-100 md:opacity-0 md:group-hover:opacity-100', liked ? 'opacity-100' : '')}
                            >
                              <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-rose-500 text-rose-500' : 'text-text-dim hover:text-white')} />
                            </button>
                            
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                                  title="More options"
                                  aria-label="More options"
                                  className="p-1.5 text-text-dim hover:text-white hover:bg-white/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                                >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                              {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
                            </div>

                            <div className={cn('opacity-0 group-hover:opacity-0 transition-opacity', isActive && 'opacity-100')}>
                              {isActive && isPlaying ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
              </div>
            )}
          </section>
        )}

        {/* ─── YOUR MIX ─── */}
        {!query && (
          <section>
            <h2 className="text-xl font-black text-white tracking-tight mb-4">Made for you</h2>
            <div
              onClick={() => window.location.href = '/playlists/mix'}
              className="flex items-center gap-5 bg-gradient-to-r from-accent/10 to-blue-500/10 border border-accent/15 rounded-2xl p-5 cursor-pointer hover:from-accent/20 hover:to-blue-500/20 transition-all group"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-xl shadow-accent/20 shrink-0">
                <Zap className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-white">Your Mix</h3>
                <p className="text-text-dim text-sm mt-0.5">
                  {user ? 'Personalized playlist from your listening history' : 'Login to unlock this feature'}
                </p>
              </div>
              {user ? (
                <Play className="w-7 h-7 text-accent fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-black text-text-dim uppercase tracking-widest group-hover:border-accent group-hover:text-accent transition-all">
                  Locked
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── MAIN GRID (cards) ─── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {query ? `Results for "${query}"` : 'Recommended for you'}
              </h2>
              {!query && <p className="text-text-dim text-sm mt-0.5">{hasHistory ? "Based on what you've been listening to" : "Based on what's trending"}</p>}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => <TrackCardSkeleton key={i} index={i} />)}
            </div>
          ) : results.length === 0 ? (
            <p className="text-text-dim text-center py-16 font-medium">No results found for "{query}"</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {results.slice(0, 48).map((track, index) => (
                <div 
                  key={`${track.id}-${index}`} 
                  className={cn("animate-fade-in", activeDropdown === track.id && "z-[60] relative")}
                  style={{ '--delay': `${(index % 12) * 50}ms` } as React.CSSProperties}
                >
                  <TrackCard 
                    track={track} 
                    results={results}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

// ─── Sub-components for Optimization ───────────────────────────────────────

/** 
 * Memoized Track Card to prevent re-renders when other items or query change.
 * Extracted from main component to follow performance best practices.
 */
const TrackCard = memo(({ 
  track, 
  results,
  activeDropdown,
  setActiveDropdown
}: { 
  track: Track; 
  results: Track[];
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
}) => {
  const { playTrack, currentTrack, isPlaying, togglePause, likedSongs, toggleLike } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const liked = likedSongs?.some((t) => t.id === track.id);

  return (
    <div
      onClick={() => isActive ? togglePause() : playTrack(track, results)}
      className={cn(
        'group relative flex flex-col rounded-[24px] border cursor-pointer transition-all duration-300 hover:scale-[1.02]',
        isActive ? 'border-accent/30 bg-accent/5' : 'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/10',
        activeDropdown === track.id ? 'z-[60]' : 'z-0 hover:z-10'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden rounded-t-[23px]">
        <img 
          src={track.thumbnail} 
          alt={track.title} 
          loading="lazy"
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 opacity-0" 
        />
        <div className={cn(
          'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-200',
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <div className={cn(
            'w-12 h-12 bg-accent text-black rounded-full flex items-center justify-center shadow-xl transition-transform duration-300',
            isActive ? 'scale-100' : 'scale-75 group-hover:scale-100'
          )}>
            {isActive && isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </div>
        </div>
        {/* Like badge */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
          title={liked ? "Unlike" : "Like"}
          aria-label={liked ? "Unlike song" : "Like song"}
          className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:scale-110"
        >
          <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-rose-500 text-rose-500' : 'text-white')} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-bold truncate leading-tight', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
          <p className="text-xs text-text-dim truncate mt-0.5 font-medium">{track.artist}</p>
        </div>
        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
            title="More options"
            aria-label="More options"
            className="p-1.5 text-text-dim hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
        </div>
      </div>
    </div>
  );
});
