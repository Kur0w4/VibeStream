import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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


/** 
 * Portal-based Dropdown — renders directly into document.body so it is NEVER
 * clipped by ancestor `position:relative`, `transform`, `overflow:hidden`, or
 * `z-index` stacking contexts. This is the definitive fix for dropdowns being
 * hidden behind sibling cards on mobile and desktop.
 */
export const TrackDropdown = ({
  track, onClose, triggerRef,
}: { 
  track: Track; 
  onClose: () => void; 
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) => {
  const { playlists, addTrackToPlaylist, toggleLike, likedSongs, addToQueue } = usePlayerStore();
  const liked = likedSongs?.some((t) => t.id === track.id);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  // Calculate position from the trigger button's bounding rect.
  // position:fixed is relative to the VIEWPORT so we do NOT add scrollY.
  useEffect(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        right: Math.max(4, window.innerWidth - rect.right),
      });
    } else {
      // Fallback: show near bottom-right if no ref provided
      setPos({ top: window.innerHeight - 280, right: 16 });
    }
  }, [triggerRef]);

  // Close on outside click / scroll
  useEffect(() => {
    const close = () => onClose();
    // Small delay so the opening click does not immediately close the menu
    const t = setTimeout(() => {
      document.addEventListener('click', close);
      window.addEventListener('scroll', close, true);
    }, 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  const menu = (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="w-56 bg-bg-sidebar border border-white/10 rounded-2xl shadow-2xl py-2"
    >
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

  return createPortal(menu, document.body);
};

/**
 * Hook to manage a dropdown trigger button ref + state together.
 * Use this in any component that renders TrackDropdown.
 */
export function useTrackDropdown() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const getTriggerRef = useCallback((id: string) => {
    return (el: HTMLButtonElement | null) => {
      if (el) triggerRefs.current.set(id, el);
      else triggerRefs.current.delete(id);
    };
  }, []);

  const getRefForId = useCallback((id: string): React.RefObject<HTMLButtonElement | null> => {
    return { current: triggerRefs.current.get(id) ?? null };
  }, []);

  return { activeDropdown, setActiveDropdown, getTriggerRef, getRefForId };
}



export const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeDropdown, setActiveDropdown, getTriggerRef, getRefForId } = useTrackDropdown();

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

  // No manual window listener needed — TrackDropdown portal handles its own close

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
                            'flex gap-3 rounded-xl cursor-pointer group transition-all items-center p-2',
                            isActive ? 'bg-white/10' : 'hover:bg-white/5'
                          )}
                        >
                          <img 
                            src={track.thumbnail} 
                            loading="lazy" 
                            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                            className="w-14 h-14 rounded-lg object-cover shrink-0 opacity-0 transition-opacity duration-500 shadow-md" 
                            alt="" 
                          />
                          <div className="flex-1 min-w-0 py-2">
                             <p className="font-bold text-sm text-white truncate leading-none">{track.title}</p>
                             <p className="text-[10px] text-text-dim mt-1 truncate font-medium">{track.artist}</p>
                          </div>
                          
                          <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                              title={liked ? "Unlike" : "Like"}
                              aria-label={liked ? "Unlike song" : "Like song"}
                              className="p-1.5 rounded-full transition-colors"
                            >
                              <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-rose-500 text-rose-500' : 'text-text-dim hover:text-white')} />
                            </button>
                            
                            <button
                              ref={getTriggerRef(track.id)}
                              onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                              title="More options"
                              aria-label="More options"
                              className="p-1.5 text-text-dim hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} triggerRef={getRefForId(track.id)} />}

                            {isActive && (
                              <div className="pl-1">
                                {isPlaying ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                              </div>
                            )}
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
                  className="animate-fade-in"
                  {...({ style: { '--delay': `${(index % 12) * 50}ms` } as React.CSSProperties })}
                >
                  <TrackCard 
                    track={track} 
                    results={results}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    getTriggerRef={getTriggerRef}
                    getRefForId={getRefForId}
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
 */
const TrackCard = memo(({ 
  track, 
  results,
  activeDropdown,
  setActiveDropdown,
  getTriggerRef,
  getRefForId,
}: { 
  track: Track; 
  results: Track[];
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  getTriggerRef: (id: string) => (el: HTMLButtonElement | null) => void;
  getRefForId: (id: string) => React.RefObject<HTMLButtonElement | null>;
}) => {
  const { playTrack, currentTrack, isPlaying, togglePause, likedSongs, toggleLike } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const liked = likedSongs?.some((t) => t.id === track.id);

  return (
    <div
      onClick={() => isActive ? togglePause() : playTrack(track, results)}
      className={cn(
        'flex flex-col group cursor-pointer transition-all hover:scale-[1.02]',
        isActive ? 'opacity-100' : 'opacity-90 hover:opacity-100'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-lg">
        <img 
          src={track.thumbnail} 
          alt={track.title} 
          loading="lazy"
          onLoad={(e) => (e.currentTarget.style.opacity = '1')}
          className="w-full h-full object-cover transition-all duration-700 opacity-0" 
        />
        {/* Play/Pause overlay — always visible while active, hidden otherwise */}
        {isActive && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-12 h-12 bg-accent text-black rounded-full flex items-center justify-center shadow-xl">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </div>
          </div>
        )}
        {/* Like badge — always visible */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
          title={liked ? "Unlike" : "Like"}
          aria-label={liked ? "Unlike song" : "Like song"}
          className="absolute top-2 right-2 p-1.5 bg-black/50 backdrop-blur-sm rounded-full transition-colors"
        >
          <Heart className={cn('w-3.5 h-3.5', liked ? 'fill-rose-500 text-rose-500' : 'text-white')} />
        </button>
      </div>

      {/* Info */}
      <div className="pt-3 pb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={cn('text-[15px] font-bold truncate leading-tight', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
          <p className="text-[13px] text-text-dim truncate mt-0.5 font-medium hover:text-white transition-colors">{track.artist}</p>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            ref={getTriggerRef(track.id)}
            onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
            title="More options"
            aria-label="More options"
            className="p-1.5 text-text-dim hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} triggerRef={getRefForId(track.id)} />}
        </div>
      </div>
    </div>
  );
});
