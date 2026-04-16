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
    isExpanded, setIsExpanded, queue, removeFromQueue, clearQueue,
    nextTrack, prevTrack, isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    seekTrigger
  } = usePlayerStore();

  const ytPlayerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isYTReady, setIsYTReady] = useState(false); // New: Tracks raw onReady event
  const [playerError, setPlayerError] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFirstLoad = useRef(true);
  const isReadyRef = useRef(false);

  // Sync isReady React state with Ref for interval access
  const updateIsReady = useCallback((val: boolean) => {
    isReadyRef.current = val;
    setIsReady(val);
  }, []);

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
      // Use Ref to check readiness inside interval to avoid stale closures
      if (!player || !isReadyRef.current) return;
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
            setIsYTReady(true);
            updateIsReady(true); // Immediate readiness to hide spinner
            try { player.setVolume(Math.round(volume * 100)); if (isMuted) player.mute(); } catch (_) {}
          },
          onStateChange: (e: any) => {
            const state = e.data;
            if (state === window.YT.PlayerState.PLAYING) {
              updateIsReady(true); setPlayerError(false); setIsPlaying(true); startProgress();
              try { const dur = player.getDuration?.() ?? 0; if (dur > 0) setDuration(dur); } catch (_) {}
            } else if (state === window.YT.PlayerState.PAUSED) {
              const { isPlaying: intendedPlaying, setIsPlaying } = usePlayerStore.getState();
              if (intendedPlaying && document.hidden) {
                // Background playback hack: YouTube's iframe API automatically pauses video when the browser tab is hidden on mobile.
                // If our app state says we should be playing, we immediately force it to resume.
                setTimeout(() => {
                  try { player.playVideo(); } catch (_) {}
                }, 50);
              } else {
                setIsPlaying(false); clearProgress();
              }
            } else if (state === window.YT.PlayerState.CUED) {
              updateIsReady(true);
            } else if (state === window.YT.PlayerState.ENDED) {
              const { repeatMode, nextTrack, setIsPlaying } = usePlayerStore.getState();
              if (repeatMode === 'one') {
                player.seekTo(0);
                player.playVideo();
              } else {
                setIsPlaying(false); clearProgress(); setProgress(0);
                nextTrack();
              }
            }
          },
          onError: (e: any) => {
            console.error('[YT] error:', e.data);
            setPlayerError(true); updateIsReady(false); setIsPlaying(false); clearProgress();
          },
        },
      });
      // Do NOT set ytPlayerRef.current here synchronously; wait for onReady
    });
    return () => { destroyed = true; clearProgress(); try { ytPlayerRef.current?.destroy(); } catch (_) {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single robust effect to handle track loading and initial restoration
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !isYTReady || !currentTrack?.videoId) return;

    setPlayerError(false);
    updateIsReady(false); // Show spinner while loading actual video context

    let startSeconds = 0;
    if (isFirstLoad.current) {
      startSeconds = Math.floor((progress || 0) * (duration || 0));
      isFirstLoad.current = false;
    } else {
      setProgress(0);
    }
    
    clearProgress();
    try { 
      // If we are recovering a session and it was playing, load it.
      // Otherwise cue it so it doesn't autoplay without user intent.
      if (isPlaying) {
        player.loadVideoById({ videoId: currentTrack.videoId, startSeconds }); 
      } else {
        player.cueVideoById({ videoId: currentTrack.videoId, startSeconds });
      }
    }
    catch (err) { console.error('[YT] loadVideoById error:', err); setPlayerError(true); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.videoId, isYTReady]);

  // Handle Play/Pause commands ONLY when player is ready
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !isYTReady || !isReady) return;
    try { 
      if (isPlaying) { 
        player.playVideo(); 
        startProgress(); 
        audioRef.current?.play().catch(() => {});
      } else { 
        player.pauseVideo(); 
        clearProgress(); 
        audioRef.current?.pause();
      } 
    }
    catch (_) {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isReady, isYTReady]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player) return;
    try { if (isMuted) player.mute(); else { player.unMute(); player.setVolume(Math.round(volume * 100)); } }
    catch (_) {}
  }, [volume, isMuted]);
  
  // Force Seek to start when seekTrigger changes
  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player || !isReady || seekTrigger === 0) return;
    try { player.seekTo(0, true); } catch (_) {}
  }, [seekTrigger, isReady]);

  // ─── Media Session API (Lock screen & OS controls) ─────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: 'VibeStream',
      artwork: [
        { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '128x128', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '192x192', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '384x384', type: 'image/jpeg' },
        { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });
  }, [currentTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => { setIsPlaying(true); });
    ms.setActionHandler('pause', () => { setIsPlaying(false); });
    ms.setActionHandler('previoustrack', () => { prevTrack(); });
    ms.setActionHandler('nexttrack', () => { nextTrack(); });
    ms.setActionHandler('seekbackward', (details) => {
      const player = ytPlayerRef.current;
      if (!player) return;
      const skipTime = details.seekOffset || 10;
      player.seekTo(Math.max(player.getCurrentTime() - skipTime, 0), true);
    });
    ms.setActionHandler('seekforward', (details) => {
      const player = ytPlayerRef.current;
      if (!player) return;
      const skipTime = details.seekOffset || 10;
      player.seekTo(player.getCurrentTime() + skipTime, true);
    });

    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('previoustrack', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('seekbackward', null);
      ms.setActionHandler('seekforward', null);
    };
  }, [setIsPlaying, prevTrack, nextTrack]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    const player = ytPlayerRef.current;
    if (!player) return;
    try { const dur = player.getDuration?.() ?? 0; if (dur > 0) player.seekTo(val * dur, true); } catch (_) {}
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50', !currentTrack && 'opacity-0')}>
      <audio ref={audioRef} src={SILENT_AUDIO_URI} loop playsInline style={{ display: 'none' }} />
      <div className="pointer-events-auto">

        {/* ══ YouTube Player container ══ */}
        <div
          className={cn(
            'fixed overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group shadow-2xl ring-1 ring-white/10',
            isExpanded
              ? 'top-[6vh] left-1/2 -translate-x-1/2 w-full max-w-[800px] max-h-[40vh] aspect-video rounded-3xl shadow-[0_0_80px_rgba(0,245,255,0.1)] z-[110]'
              : 'bottom-[85px] md:bottom-[20px] left-0 md:left-[32px] w-full md:w-40 h-[64px] md:h-[90px] rounded-none md:rounded-lg hover:scale-100 md:hover:scale-105 z-[70] border-y border-white/10 md:border-none'
          )}
          onClick={() => { if (currentTrack) setIsExpanded(true); }}
        >
          {/* Mobile playback indicator/controls (mini-bar style) */}
          {!isExpanded && (
            <div className="absolute inset-0 z-[1] md:hidden bg-bg-sidebar/40 backdrop-blur-md flex items-center px-4 gap-3">
              <img src={currentTrack?.thumbnail} className="w-12 h-12 rounded-lg object-cover shadow-lg" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate">{currentTrack?.title}</p>
                <p className="text-[11px] text-text-dim truncate">{currentTrack?.artist}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); togglePause(); }}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>
          )}
          {currentTrack && (
            <img src={currentTrack.thumbnail} alt={currentTrack.title}
              loading="lazy"
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
            <div className={cn("absolute z-20 flex items-center justify-center", isExpanded ? "inset-0" : "left-4 top-1/2 -translate-y-1/2 w-12 h-12 md:inset-0 md:w-auto md:h-auto md:translate-y-0")}>
              <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}
          <div className={cn('absolute z-10 transition-all duration-500 overflow-hidden', 
            isReady ? 'opacity-100' : 'opacity-0',
            isExpanded 
              ? 'inset-0 rounded-none' 
              : 'left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-lg pointer-events-none md:pointer-events-auto md:inset-0 md:w-auto md:h-auto md:left-0 md:top-0 md:translate-y-0 md:rounded-none'
          )}>
            <div id={YT_DIV_ID} className="w-[150%] h-[150%] -top-1/4 -left-1/4 relative pointer-events-auto md:w-full md:h-full md:top-0 md:left-0" />
          </div>
          {!isExpanded && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/50 backdrop-blur-[1px]">
              <Maximize2 className="text-accent w-5 h-5" />
            </div>
          )}
        </div>

        {/* ══ MV Close Button (Rendered Outside for max z-index) ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsExpanded(false)} title="Close expanded view"
              className="fixed top-8 left-8 md:top-10 md:left-10 p-3 bg-black/40 hover:bg-black/60 rounded-2xl border border-white/10 text-white z-[150] transition-all hover:scale-105 backdrop-blur-md">
              <ChevronDown className="w-6 h-6 md:w-8 md:h-8" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ══ Expanded view overlay ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: '10%' }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }} transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-bg-main/95 backdrop-blur-2xl flex flex-col items-center pt-[6vh] pb-6 px-8 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-main pointer-events-none" />
              <div className="w-full max-w-[800px] h-[40vh] max-h-[40vh] aspect-video shrink-0 invisible" />
              <div className="mt-4 text-center max-w-[800px] w-full px-4 relative z-50 flex-1 flex flex-col min-h-0">
                <div className="shrink-0 mb-3">
                  <h2 className="text-2xl lg:text-4xl font-black text-white tracking-tighter mb-0.5 truncate">{currentTrack.title}</h2>
                  <p className="text-base lg:text-xl text-accent font-bold truncate opacity-90">{currentTrack.artist}</p>
                </div>

                <div className="flex flex-col gap-1.5 mb-5 shrink-0">
                  <PlaybackProgress onSeek={handleSeek} formatTime={formatTime} isExpanded />
                </div>

                <div className="flex items-center justify-center gap-8 lg:gap-14 mb-6 lg:mb-8 shrink-0">
                  <button onClick={toggleShuffle} title="Toggle Shuffle" className={cn("transition-all hover:scale-110", isShuffle ? "text-accent drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]" : "text-text-dim hover:text-white")}><Shuffle className="w-5 h-5 lg:w-8 lg:h-8" /></button>
                  <button onClick={prevTrack} title="Previous Track" className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipBack className="w-7 h-7 lg:w-10 lg:h-10 fill-current" /></button>
                  <button onClick={togglePause} title={isPlaying ? "Pause" : "Play"} className="w-16 h-16 lg:w-28 lg:h-28 bg-white text-bg-main rounded-[24px] lg:rounded-[40px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-accent/20">
                    {isPlaying ? <Pause className="w-8 h-8 lg:w-12 lg:h-12 fill-current" /> : <Play className="w-8 h-8 lg:w-12 lg:h-12 fill-current ml-2" />}
                  </button>
                  <button onClick={() => nextTrack()} title="Next Track" className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipForward className="w-7 h-7 lg:w-10 lg:h-10 fill-current" /></button>
                  <button onClick={toggleRepeat} title="Toggle Repeat" className={cn("transition-all hover:scale-110 relative", repeatMode !== 'off' ? "text-accent drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]" : "text-text-dim hover:text-white")}>
                    <Repeat className="w-5 h-5 lg:w-8 lg:h-8" />
                    {repeatMode === 'one' && <span className="absolute -top-1 -right-1 text-[10px] font-black bg-bg-main rounded-full w-4 h-4 flex items-center justify-center">1</span>}
                  </button>
                </div>

                {/* Queue preview in expanded view - limited set to ensure visibility */}
                {queue.length > 0 && (
                  <div className="mt-4 text-left flex-1 min-h-0 flex flex-col opacity-60 hover:opacity-100 transition-opacity">
                    <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2 shrink-0">
                      <ListMusic className="w-4 h-4 text-accent" /> Next in queue
                    </h3>
                    <div className="space-y-1 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-2 pb-4">
                      {queue.slice(0, 10).map((t, i) => (
                        <div key={`${t.id}-${i}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group border border-transparent hover:border-white/5 transition-all">
                          <img src={t.thumbnail} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{t.title}</p>
                            <p className="text-[10px] text-text-dim truncate">{t.artist}</p>
                          </div>
                          <button onClick={() => removeFromQueue(i)} title="Remove from queue" className="opacity-0 group-hover:opacity-100 p-1 text-text-dim hover:text-red-400 transition-all">
                            <X className="w-3.5 h-3.5" />
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
                  <button onClick={() => setShowQueue(false)} title="Close queue" className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-xl transition-all">
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
                        <button onClick={() => removeFromQueue(i)} title="Remove from queue" className="opacity-0 group-hover:opacity-100 p-1.5 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
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
          'fixed bottom-0 left-0 right-0 h-[95px] bg-bg-sidebar/95 backdrop-blur-3xl border-t border-glass-border px-8 hidden md:flex items-center justify-between z-50 transition-transform duration-500',
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
              <button onClick={toggleShuffle} title="Toggle Shuffle" className={cn("transition-all hover:scale-110 active:scale-90", isShuffle ? "text-accent drop-shadow-[0_0_6px_rgba(0,245,255,0.4)]" : "text-text-dim hover:text-white")}><Shuffle className="w-4 h-4" /></button>
              <button onClick={prevTrack} title="Previous Track" className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipBack className="w-5 h-5 fill-current" /></button>
              <button onClick={togglePause} title={isPlaying ? "Pause" : "Play"} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                {isPlaying ? <Pause className="text-bg-main w-6 h-6 fill-current" /> : <Play className="text-bg-main w-6 h-6 fill-current ml-1" />}
              </button>
              <button onClick={() => nextTrack()} title="Next Track" className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipForward className="w-5 h-5 fill-current" /></button>
              <button onClick={toggleRepeat} title="Toggle Repeat" className={cn("transition-all hover:scale-110 active:scale-90 relative", repeatMode !== 'off' ? "text-accent drop-shadow-[0_0_6px_rgba(0,245,255,0.4)]" : "text-text-dim hover:text-white")}>
                <Repeat className="w-4 h-4" />
                {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black bg-bg-main rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>}
              </button>
            </div>
            <PlaybackProgress onSeek={handleSeek} formatTime={formatTime} />
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
              <div 
                className="absolute top-0 left-0 h-full bg-text-main rounded-full" 
                style={{ '--width': `${(isMuted ? 0 : volume) * 100}%` } as React.CSSProperties} 
              />
                <input type="range" min={0} max={1} step="any" value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                  aria-label="Volume" title="Adjust volume"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
            </div>
            <button onClick={() => setIsExpanded(true)} title="Expand player" className="text-text-dim hover:text-accent transition-all hover:scale-110">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Sub-components for Optimization ───────────────────────────────────────

/** 
 * Isolated progress bar that only re-renders on progress/duration changes.
 * This prevents the entire Player shell from re-rendering every 500ms.
 */
const PlaybackProgress = ({ 
  onSeek, 
  formatTime,
  isExpanded = false 
}: { 
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatTime: (s: number) => string;
  isExpanded?: boolean;
}) => {
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);

  if (isExpanded) {
    return (
      <>
        <div className="flex justify-between items-center text-[10px] lg:text-xs font-mono font-bold text-text-dim px-2">
          <span>{formatTime((progress || 0) * duration)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" 
            style={{ '--width': `${(progress || 0) * 100}%` } as React.CSSProperties} 
          />
          <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={onSeek} aria-label="Seek track" title="Seek" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
        </div>
      </>
    );
  }

  return (
    <div className="flex items-center gap-4 w-full">
      <span className="text-[10px] text-text-dim w-10 text-right font-bold font-mono">{formatTime((progress || 0) * duration)}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" 
          style={{ '--width': `${(progress || 0) * 100}%` } as React.CSSProperties} 
        />
        <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={onSeek} aria-label="Seek track" title="Seek" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
      </div>
      <span className="text-[10px] text-text-dim w-10 font-bold font-mono">{formatTime(duration)}</span>
    </div>
  );
};
