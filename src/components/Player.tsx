import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle,
  Maximize2, VolumeX, ChevronDown, AlertTriangle, ListMusic, X, Trash2,
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { loadYouTubeApi } from '../lib/youtube';
import { motion, AnimatePresence } from 'framer-motion';

const YT_DIV_ID = 'vibestream-yt-player';

export const Player = () => {
  const {
    currentTrack, isPlaying, togglePause, volume, setVolume,
    progress, setProgress, duration, setDuration, setIsPlaying,
    isExpanded, setIsExpanded, queue, removeFromQueue, clearQueue, playNext, nextTrack,
  } = usePlayerStore();

  const ytPlayerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const clearProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgress = useCallback(() => {
    clearProgress();
    progressIntervalRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player) return;
      try {
        const current: number = player.getCurrentTime?.() ?? 0;
        const total: number = player.getDuration?.() ?? 0;
        if (total > 0) { setProgress(current / total); setDuration(total); }
      } catch (_) {}
    }, 500);
  }, [setProgress, setDuration]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Create YT Player once ─────────────────────────────────────────────────

  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then(() => {
      if (destroyed) return;
      const player = new window.YT.Player(YT_DIV_ID, {
        width: '100%', height: '100%',
        playerVars: { controls: 0, rel: 0, modestbranding: 1, playsinline: 1, origin: window.location.origin, enablejsapi: 1 },
        events: {
          onReady: () => {
            console.log('[YT] Player ready');
            ytPlayerRef.current = player;
            try { player.setVolume(Math.round(volume * 100)); if (isMuted) player.mute(); } catch (_) {}
          },
          onStateChange: (e: any) => {
            const state = e.data;
            if (state === window.YT.PlayerState.PLAYING) {
              setIsReady(true); setPlayerError(false); setIsPlaying(true); startProgress();
              try { const dur = player.getDuration?.() ?? 0; if (dur > 0) setDuration(dur); } catch (_) {}
            } else if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false); clearProgress();
            } else if (state === window.YT.PlayerState.ENDED) {
              setIsPlaying(false); clearProgress(); setProgress(0);
              // Auto-play next from queue
              nextTrack();
            }
          },
          onError: (e: any) => {
            console.error('[YT] error:', e.data);
            setPlayerError(true); setIsReady(false); setIsPlaying(false); clearProgress();
          },
        },
      });
      ytPlayerRef.current = player;
    });
    return () => { destroyed = true; clearProgress(); try { ytPlayerRef.current?.destroy(); } catch (_) {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentTrack?.videoId) return;
    setIsReady(false); setPlayerError(false); setProgress(0); clearProgress();
    const player = ytPlayerRef.current;
    if (!player) return;
    try { player.loadVideoById({ videoId: currentTrack.videoId, startSeconds: 0 }); }
    catch (err) { console.error('[YT] loadVideoById error:', err); setPlayerError(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.videoId]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !isReady) return;
    try { if (isPlaying) { player.playVideo(); startProgress(); } else { player.pauseVideo(); clearProgress(); } }
    catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isReady]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    try { if (isMuted) player.mute(); else { player.unMute(); player.setVolume(Math.round(volume * 100)); } }
    catch (_) {}
  }, [volume, isMuted]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    const player = ytPlayerRef.current;
    if (!player) return;
    try { const dur = player.getDuration?.() ?? 0; if (dur > 0) player.seekTo(val * dur, true); } catch (_) {}
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50', !currentTrack && 'opacity-0')}>
      <div className="pointer-events-auto">

        {/* ══ YouTube Player container ══ */}
        <div
          className={cn(
            'fixed z-[70] overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group shadow-2xl ring-1 ring-white/10',
            isExpanded
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] aspect-video rounded-[40px] shadow-[0_0_100px_rgba(0,245,255,0.15)]'
              : 'bottom-[20px] left-[32px] w-40 h-[90px] rounded-lg hover:scale-105'
          )}
          onClick={() => { if (currentTrack) setIsExpanded(true); }}
        >
          {currentTrack && (
            <img src={currentTrack.thumbnail} alt={currentTrack.title}
              className={cn('absolute inset-0 w-full h-full object-cover transition-all duration-700 z-0',
                isPlaying ? isExpanded ? 'opacity-30 scale-100' : 'opacity-20 scale-105' : 'opacity-40 scale-100')}
            />
          )}
          {playerError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 text-center p-2 gap-1">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 text-[10px] font-bold leading-tight">Video no<br />disponible</span>
            </div>
          )}
          {!isReady && !playerError && currentTrack && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}
          <div className={cn('absolute inset-0 z-10 transition-opacity duration-500', isReady ? 'opacity-100' : 'opacity-0')}>
            <div id={YT_DIV_ID} style={{ width: '100%', height: '100%' }} />
          </div>
          {!isExpanded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/50 backdrop-blur-[1px]">
              <Maximize2 className="text-accent w-5 h-5" />
            </div>
          )}
        </div>

        {/* ══ Expanded view overlay ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed inset-0 z-[60] bg-bg-main/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 overflow-y-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-main pointer-events-none" />
              <button onClick={() => setIsExpanded(false)}
                className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white z-50 transition-all hover:scale-105">
                <ChevronDown className="w-8 h-8" />
              </button>
              <div className="w-full max-w-[1000px] aspect-video invisible" />
              <div className="mt-12 text-center max-w-[1000px] w-full px-8 relative z-50">
                <h2 className="text-5xl font-black text-white tracking-tighter mb-3 truncate">{currentTrack.title}</h2>
                <p className="text-2xl text-accent font-bold mb-12 truncate">{currentTrack.artist}</p>
                <div className="flex flex-col gap-4 mb-16">
                  <div className="flex justify-between items-center text-sm font-mono font-bold text-text-dim px-2">
                    <span>{formatTime((progress || 0) * duration)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
                    <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" style={{ width: `${(progress || 0) * 100}%` }} />
                    <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-14">
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><Shuffle className="w-8 h-8" /></button>
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipBack className="w-10 h-10 fill-current" /></button>
                  <button onClick={togglePause} className="w-28 h-28 bg-white text-bg-main rounded-[40px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-accent/20">
                    {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
                  </button>
                  <button onClick={() => nextTrack()} className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipForward className="w-10 h-10 fill-current" /></button>
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><Repeat className="w-8 h-8" /></button>
                </div>

                {/* Queue preview in expanded view */}
                {queue.length > 0 && (
                  <div className="mt-16 text-left">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                      <ListMusic className="w-5 h-5 text-accent" /> Next in queue ({queue.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {queue.slice(0, 5).map((t, i) => (
                        <div key={t.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group">
                          <img src={t.thumbnail} className="w-9 h-9 rounded-lg object-cover" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{t.title}</p>
                            <p className="text-xs text-text-dim truncate">{t.artist}</p>
                          </div>
                          <button onClick={() => removeFromQueue(i)} className="opacity-0 group-hover:opacity-100 p-1 text-text-dim hover:text-red-400 transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ Queue slide-out panel ══ */}
        <AnimatePresence>
          {showQueue && !isExpanded && (
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-[95px] w-80 bg-bg-sidebar/98 backdrop-blur-xl border-l border-white/10 z-[55] flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-black text-white">Queue</h3>
                  <p className="text-xs text-text-dim mt-0.5">{queue.length} song{queue.length !== 1 ? 's' : ''} up next</p>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 0 && (
                    <button onClick={clearQueue} className="p-2 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Clear queue">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setShowQueue(false)} className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                    <ListMusic className="w-12 h-12 text-white/10" />
                    <p className="text-text-dim font-medium text-sm">Queue is empty</p>
                    <p className="text-text-dim text-xs">Add songs using the ··· menu on any track</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {queue.map((t, i) => (
                      <div key={`${t.id}-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 group transition-colors">
                        <span className="text-xs text-text-dim w-5 text-center font-bold shrink-0">{i + 1}</span>
                        <img src={t.thumbnail} className="w-10 h-10 rounded-xl object-cover shadow-md shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{t.title}</p>
                          <p className="text-xs text-text-dim truncate">{t.artist}</p>
                        </div>
                        <button onClick={() => removeFromQueue(i)} className="opacity-0 group-hover:opacity-100 p-1.5 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ Footer player bar ══ */}
        <div className={cn(
          'fixed bottom-0 left-0 right-0 h-[95px] bg-bg-sidebar/95 backdrop-blur-3xl border-t border-glass-border px-8 flex items-center justify-between z-50 transition-transform duration-500',
          (isExpanded || !currentTrack) ? 'translate-y-full' : 'translate-y-0'
        )}>
          {/* Left: track info */}
          <div className="flex items-center gap-5 w-[320px]">
            <div className="w-40 h-[90px] shrink-0" />
            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-text-main font-bold text-sm truncate tracking-tight">{currentTrack?.title}</h3>
              <p className="text-text-dim text-[11px] truncate font-medium mt-0.5">{currentTrack?.artist}</p>
            </div>
          </div>

          {/* Center: controls + seek */}
          <div className="flex flex-col items-center gap-2.5 flex-1 max-w-2xl px-4">
            <div className="flex items-center gap-8">
              <button className="text-text-dim hover:text-accent transition-all hover:scale-110 active:scale-90"><Shuffle className="w-4 h-4" /></button>
              <button className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipBack className="w-5 h-5 fill-current" /></button>
              <button onClick={togglePause} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                {isPlaying ? <Pause className="text-bg-main w-6 h-6 fill-current" /> : <Play className="text-bg-main w-6 h-6 fill-current ml-1" />}
              </button>
              <button onClick={() => nextTrack()} className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipForward className="w-5 h-5 fill-current" /></button>
              <button className="text-text-dim hover:text-accent transition-all hover:scale-110 active:scale-90"><Repeat className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-4 w-full">
              <span className="text-[10px] text-text-dim w-10 text-right font-bold font-mono">{formatTime((progress || 0) * duration)}</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" style={{ width: `${(progress || 0) * 100}%` }} />
                <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={handleSeek} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              </div>
              <span className="text-[10px] text-text-dim w-10 font-bold font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: volume + queue */}
          <div className="flex items-center justify-end gap-4 w-[320px]">
            {/* Queue button */}
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={cn('p-2 rounded-lg transition-all hover:scale-110 relative', showQueue ? 'text-accent bg-accent/10' : 'text-text-dim hover:text-accent')}
              title="Queue"
            >
              <ListMusic className="w-4 h-4" />
              {queue.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-black text-[9px] font-black rounded-full flex items-center justify-center">
                  {queue.length > 9 ? '9+' : queue.length}
                </span>
              )}
            </button>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsMuted(!isMuted)} className="text-text-dim hover:text-text-main transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-24 h-1.5 bg-white/5 rounded-full relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-text-main rounded-full" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
                <input type="range" min={0} max={1} step="any" value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
            <button onClick={() => setIsExpanded(true)} className="text-text-dim hover:text-accent transition-all hover:scale-110">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
