import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search as SearchIcon, Play, Pause, Heart, MoreHorizontal, Plus, ListPlus, Zap, ChevronRight, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { searchTracks, getTrendingTracks, getMoodTracks } from '../services/api';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { TrackCardSkeleton, HistorySkeleton } from './Skeletons';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const MOOD_PILLS = ['Relax', 'Workout', 'Energize', 'Commute', 'Focus', 'Party', 'Sad', 'Romance'];

/** 
 * Portal-based Dropdown
 */
export const TrackDropdown = ({
  track, onClose, triggerRef,
}: { 
  track: Track; 
  onClose: () => void; 
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}) => {
  const { playlists, addTrackToPlaylist, toggleLike, likedSongs, addToQueue, toggleDownload, downloadedIds, downloadingIds } = usePlayerStore();
  const liked = likedSongs?.some((t) => t.id === track.id);
  const isDownloaded = downloadedIds.includes(track.videoId);
  const isDownloading = downloadingIds.includes(track.videoId);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const updatePos = () => {
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const menuHeight = 280;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        // Prefer showing below, but if no space, show above
        let top = rect.bottom + 6;
        if (spaceBelow < menuHeight && rect.top > menuHeight) {
          top = rect.top - menuHeight - 6;
        }

        setPos({
          top: Math.max(10, Math.min(top, window.innerHeight - menuHeight - 10)),
          right: Math.max(10, window.innerWidth - rect.right),
        });
      } else {
        // Fallback: center-right but not stuck to bottom
        setPos({ top: window.innerHeight / 2 - 140, right: 20 });
      }
    };

    updatePos();
    // Re-calculate on window resize
    window.addEventListener('resize', updatePos);
    return () => window.removeEventListener('resize', updatePos);
  }, [triggerRef]);

  useEffect(() => {
    const close = () => onClose();
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
    <>
    <div className="track-dropdown-backdrop" onClick={onClose} />
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 9999 }}
      className="track-dropdown-menu w-56 bg-bg-sidebar border border-white/10 rounded-2xl shadow-2xl py-2 backdrop-blur-3xl"
    >
      <button
        onClick={() => { toggleLike(track); onClose(); }}
        className="w-full text-left px-5 md:px-4 py-3 md:py-2.5 hover:bg-white/5 active:bg-white/10 text-sm transition-colors flex items-center gap-3"
      >
        <Heart className={cn('w-4 h-4', liked ? 'fill-rose-500 text-rose-500' : 'text-text-dim')} />
        <span className={liked ? 'text-rose-400' : 'text-white'}>{liked ? 'Unlike' : 'Like song'}</span>
      </button>
      <button
        onClick={() => { addToQueue(track); onClose(); }}
        className="w-full text-left px-5 md:px-4 py-3 md:py-2.5 hover:bg-white/5 active:bg-white/10 text-sm text-white transition-colors flex items-center gap-3"
      >
        <ListPlus className="w-4 h-4 text-accent" />
        Add to queue
      </button>
      <button
        onClick={() => { toggleDownload(track); onClose(); }}
        className="w-full text-left px-5 md:px-4 py-3 md:py-2.5 hover:bg-white/5 active:bg-white/10 text-sm transition-colors flex items-center gap-3"
      >
        {isDownloading ? (
          <Loader2 className="w-4 h-4 text-accent animate-spin" />
        ) : isDownloaded ? (
          <CheckCircle2 className="w-4 h-4 text-accent" />
        ) : (
          <Download className="w-4 h-4 text-text-dim" />
        )}
        <span className={isDownloaded ? 'text-accent' : 'text-white'}>
          {isDownloading ? 'Downloading...' : isDownloaded ? 'Downloaded' : 'Download for offline'}
        </span>
      </button>
      {playlists?.length > 0 && (
        <>
          <div className="border-t border-white/5 mt-1 mb-1" />
          <p className="px-4 py-1.5 text-[10px] font-black text-text-dim uppercase tracking-widest">Add to playlist</p>
          {playlists.map((pl) => (
            <button key={pl.id} onClick={() => { addTrackToPlaylist(pl.id, track); onClose(); }}
              className="w-full text-left px-5 md:px-4 py-3 md:py-2 hover:bg-white/5 active:bg-white/10 text-sm text-white transition-colors flex items-center justify-between group/btn">
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
    </>
  );

  return createPortal(menu, document.body);
};

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
  const [activePill, setActivePill] = useState<string | null>(null);
  const { activeDropdown, setActiveDropdown, getTriggerRef, getRefForId } = useTrackDropdown();

  const {
    playTrack, listeningHistory, user,
  } = usePlayerStore();

  const hasHistory = listeningHistory.length > 0;

  const performSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      const d = await searchTracks(searchQuery);
      if (d.length > 0) setResults(d);
      else throw new Error("No results");
    } catch (_) {
      const td = await getTrendingTracks();
      setResults(td);
    } finally {
      setLoading(false);
    }
  };

  const isExactSearch = query.trim().split(/\s+/).length >= 3;

  // Initial load: personalized by recent artists
  useEffect(() => {
    if (query || activePill) return;
    if (hasHistory) {
      const recentArtists = Array.from(new Set(listeningHistory.map(t => t.artist))).slice(0, 3);
      performSearch(`${recentArtists.join(' ')} music`);
    } else {
      performSearch('trending pop music');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced query search
  useEffect(() => {
    if (!query.trim()) return;
    setActivePill(null);
    const id = setTimeout(() => performSearch(query), 600);
    return () => clearTimeout(id);
  }, [query]);

  // Mood pill search: personalized using user's top artists
  useEffect(() => {
    if (!activePill) return;
    setQuery('');
    setLoading(true);
    const topArtists = Array.from(new Set(listeningHistory.map(t => t.artist))).slice(0, 2);
    getMoodTracks(activePill.toLowerCase(), topArtists)
      .then(d => { if (d.length > 0) setResults(d); else return getTrendingTracks().then(setResults); })
      .catch(() => getTrendingTracks().then(setResults))
      .finally(() => setLoading(false));
  }, [activePill]);

  const quickPicks = listeningHistory.slice(0, 10);
  
  // Divide results into rows for YT Music style horizontal scrolling
  const row1 = results.slice(0, 12);
  const row2 = results.slice(12, 24);
  const row3 = results.slice(24, 36);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-main pb-36">
      
      {/* ─── Sticky Header (Search + Pills) ─── */}
      <div className="sticky top-0 z-20 px-4 md:px-8 py-3 bg-[#010409]/90 backdrop-blur-2xl flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <form onSubmit={(e) => e.preventDefault()} className="relative group flex-1 max-w-xl">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-accent transition-colors" />
            <input
              type="text" placeholder="Songs, artists, podcasts..." value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-full py-2.5 md:py-3 pl-12 pr-6 outline-none focus:bg-white/10 transition-all text-sm placeholder:text-text-dim"
            />
          </form>
          {query && (
            <button onClick={() => setQuery('')} className="text-xs text-text-dim hover:text-white font-bold transition-colors">Clear</button>
          )}
        </div>

        {/* ─── Filter Pills (YT Music Style) ─── */}
        {!query && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1 animate-in fade-in slide-in-from-left-4 duration-500">
            {MOOD_PILLS.map((pill) => (
              <button
                key={pill}
                onClick={() => setActivePill(activePill === pill ? null : pill)}
                className={cn(
                  "px-5 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all border shadow-lg",
                  activePill === pill 
                    ? "bg-accent text-black border-accent scale-105" 
                    : "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 active:scale-95"
                )}
              >
                {pill}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 md:px-8 py-6 space-y-12">

        {/* ─── HERO MIX SECTION (If not searching) ─── */}
        {!query && !activePill && (
          <section className="relative overflow-hidden rounded-[2rem] group cursor-pointer" onClick={() => window.location.href = '/playlists/mix'}>
            <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-[#010409] to-blue-600/20 opacity-80" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            
            <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <p className="text-sm font-bold text-accent mb-2 tracking-widest uppercase">{getGreeting()}</p>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight mb-4">
                  {user ? `Your Custom Mix, ${user.username}` : 'Discover Your Mix'}
                </h1>
                <p className="text-white/70 text-lg">Endless personalized music based on your taste. Updated daily.</p>
              </div>
              <button 
                aria-label="Play Mix"
                title="Play Mix"
                className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10 shrink-0"
              >
                <Play className="w-8 h-8 fill-current ml-1" />
              </button>
            </div>
          </section>
        )}

        {/* ─── QUICK PICKS (Horizontal Grid) ─── */}
        {!query && !activePill && quickPicks.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white tracking-tight">Jump back in</h2>
            </div>
            {/* Horizontal scrolling grid, 2 rows deep */}
            <div className="flex flex-col gap-3 overflow-x-auto hide-scrollbar pb-4 snap-x">
              <div className="flex gap-4">
                {quickPicks.slice(0, 5).map((track, i) => (
                  <HorizontalTrackCard key={i} track={track} results={quickPicks} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} getTriggerRef={getTriggerRef} getRefForId={getRefForId} />
                ))}
              </div>
              {quickPicks.length > 5 && (
                <div className="flex gap-4">
                  {quickPicks.slice(5, 10).map((track, i) => (
                    <HorizontalTrackCard key={i} track={track} results={quickPicks} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} getTriggerRef={getTriggerRef} getRefForId={getRefForId} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ─── RECOMMENDED ROW 1 ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-white tracking-tight">
              {query ? `Search results for "${query}"` : activePill ? `${activePill} Mixes` : 'Listen again'}
            </h2>
            <button className="hidden md:flex items-center text-sm font-bold text-text-dim hover:text-white transition-colors">More <ChevronRight className="w-4 h-4" /></button>
          </div>
          
          {loading ? (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6">
              {[1,2,3,4,5,6].map(i => <div key={i} className="min-w-[160px]"><TrackCardSkeleton index={i}/></div>)}
            </div>
          ) : row1.length === 0 ? (
            <p className="text-text-dim text-center py-10 font-medium">No results found.</p>
          ) : (
            <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 snap-x">
              {row1.map((track, i) => (
                <div key={i} className="min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px] snap-start">
                  <TrackCard track={track} results={row1} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} getTriggerRef={getTriggerRef} getRefForId={getRefForId} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── RECOMMENDED ROW 2 ─── */}
        {!loading && row2.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white tracking-tight">Mixed for you</h2>
            </div>
            <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 snap-x">
              {row2.map((track, i) => (
                <div key={i} className="min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px] snap-start">
                  <TrackCard track={track} results={row2} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} getTriggerRef={getTriggerRef} getRefForId={getRefForId} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── RECOMMENDED ROW 3 ─── */}
        {!loading && row3.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-black text-white tracking-tight">Trending worldwide</h2>
            </div>
            <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 snap-x">
              {row3.map((track, i) => (
                <div key={i} className="min-w-[140px] md:min-w-[180px] w-[140px] md:w-[180px] snap-start">
                  <TrackCard track={track} results={row3} activeDropdown={activeDropdown} setActiveDropdown={setActiveDropdown} getTriggerRef={getTriggerRef} getRefForId={getRefForId} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── VER MÁS EN YOUTUBE ─── */}
        {query && !loading && (
          <section className="flex flex-col items-center py-6 gap-3">
            <p className="text-text-dim text-sm font-medium">
              {isExactSearch
                ? `¿No encontraste "${query}"?`
                : `¿Quieres explorar más resultados?`}
            </p>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent/30 text-white font-bold text-sm transition-all active:scale-95"
            >
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              Ver más en YouTube
            </a>
          </section>
        )}

      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

/** 
 * Horizontal List Track Card (Used for Quick Picks) 
 */
const HorizontalTrackCard = memo(({ track, results, activeDropdown, setActiveDropdown, getTriggerRef, getRefForId }: any) => {
  const { playTrack, currentTrack, isPlaying, togglePause, downloadedIds } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const isDownloaded = downloadedIds.includes(track.videoId);

  return (
    <div
      onClick={() => isActive ? togglePause() : playTrack(track, results)}
      className="flex items-center gap-4 min-w-[280px] md:min-w-[340px] p-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors snap-start"
    >
      <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden shadow-md">
        <img src={track.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
        {isActive && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            {isPlaying ? <Pause className="w-5 h-5 text-accent fill-current" /> : <Play className="w-5 h-5 text-accent fill-current" />}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn("text-[14px] font-bold truncate", isActive ? "text-accent" : "text-white")}>{track.title}</p>
          {isDownloaded && <CheckCircle2 className="w-3 h-3 text-accent shrink-0" />}
        </div>
        <p className="text-[12px] text-text-dim truncate">{track.artist}</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <button
          ref={getTriggerRef(track.id)}
          onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
          aria-label="More options"
          title="More options"
          className="p-2 text-text-dim hover:text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all touch-visible"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} triggerRef={getRefForId(track.id)} />}
      </div>
    </div>
  );
});

/** 
 * Square Track Card (Used for Carousels)
 */
const TrackCard = memo(({ track, results, activeDropdown, setActiveDropdown, getTriggerRef, getRefForId }: any) => {
  const { playTrack, currentTrack, isPlaying, togglePause, downloadedIds } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  const isDownloaded = downloadedIds.includes(track.videoId);

  return (
    <div
      onClick={() => isActive ? togglePause() : playTrack(track, results)}
      className="flex flex-col group cursor-pointer transition-all w-full"
    >
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-lg mb-3">
        <img 
          src={track.thumbnail} 
          alt={track.title} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className={cn(
            "w-12 h-12 bg-black/60 backdrop-blur-md rounded-full items-center justify-center shadow-xl border border-white/10 transition-all",
            isActive ? "flex" : "hidden group-hover:flex hover:scale-110 hover:bg-black/80"
          )}>
            {isActive && isPlaying ? <Pause className="w-6 h-6 text-white fill-current" /> : <Play className="w-6 h-6 text-white fill-current ml-1" />}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className={cn('text-[15px] font-bold truncate leading-tight', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
            {isDownloaded && <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />}
          </div>
          <p className="text-[13px] text-text-dim truncate mt-0.5">{track.artist}</p>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            ref={getTriggerRef(track.id)}
            onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
            aria-label="More options"
            title="More options"
            className="p-1.5 text-text-dim hover:text-white rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 touch-visible"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} triggerRef={getRefForId(track.id)} />}
        </div>
      </div>
    </div>
  );
});
