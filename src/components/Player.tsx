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


  const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50', !currentTrack && 'opacity-0')}>
      <audio ref={audioRef} src={SILENT_AUDIO_URI} loop playsInline className="hidden" />
      <div className="pointer-events-auto">

        {/* ══ YouTube Player container (Thumbnail / MV Mode) ══ */}
        <div
          className={cn(
            'fixed overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group shadow-2xl z-[110]',
            isExpanded
              ? 'top-0 left-0 right-0 h-[38vh] max-h-none rounded-none shadow-[0_24px_80px_rgba(0,0,0,0.65)] md:top-[8vh] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-[900px] md:max-h-[50vh] md:h-auto md:aspect-video md:rounded-3xl md:shadow-[0_0_100px_rgba(56,189,248,0.1)]'
              : 'bottom-[75px] left-2 right-2 h-[60px] rounded-xl md:bottom-[16px] md:left-[16px] md:right-auto md:w-[64px] md:h-[64px] md:rounded-lg'
          )}
          onClick={() => { if (currentTrack) setIsExpanded(true); }}
        >
          {/* Mobile playback indicator/controls (mini-bar style) */}
          {!isExpanded && (
            <div className="absolute inset-0 z-[1] md:hidden bg-bg-sidebar/95 backdrop-blur-xl flex items-center px-3 gap-3 border border-white/5 rounded-xl">
              <img src={currentTrack?.thumbnail} className="w-10 h-10 rounded object-cover shadow-lg shrink-0" alt="" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate">{currentTrack?.title}</p>
                <p className="text-[11px] text-text-dim truncate">{currentTrack?.artist}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); togglePause(); }}
                className="w-10 h-10 text-white rounded-full flex items-center justify-center active:scale-90 transition-transform shrink-0"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
            </div>
          )}

          {/* Desktop Hover Indicator */}
          {!isExpanded && (
            <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/60 backdrop-blur-[2px]">
              <Maximize2 className="text-white w-5 h-5 drop-shadow-md" />
            </div>
          )}

          {/* Background Cover (Shows when YT is loading/cued) */}
          {currentTrack && (
            <img src={currentTrack.thumbnail} alt={currentTrack.title}
              loading="lazy"
              className={cn('absolute inset-0 w-full h-full object-cover transition-all duration-700 z-0',
                isPlaying ? (isExpanded ? 'opacity-30 scale-100' : 'opacity-100 scale-100') : 'opacity-50 scale-105')}
            />
          )}

          {playerError && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 text-center p-2 gap-1">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 text-[10px] font-bold leading-tight">Video no<br />disponible</span>
            </div>
          )}

          {!isReady && !playerError && currentTrack && (
            <div className={cn("absolute z-20 flex items-center justify-center inset-0")}>
              <div className="w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          <div className={cn('absolute z-10 transition-all duration-500 overflow-hidden', 
            isReady ? 'opacity-100' : 'opacity-0',
            isExpanded 
              ? 'inset-0 rounded-none' 
              : 'inset-0 pointer-events-none md:pointer-events-auto'
          )}>
            <div id={YT_DIV_ID} className="w-[150%] h-[150%] -top-1/4 -left-1/4 relative pointer-events-auto md:w-full md:h-full md:top-0 md:left-0" />
          </div>
        </div>

        {/* ══ MV Close Button ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setIsExpanded(false)} title="Close expanded view"
              className="fixed top-[calc(env(safe-area-inset-top)+12px)] left-4 md:top-10 md:left-10 p-3 bg-black/40 hover:bg-black/50 rounded-full border border-white/10 text-white z-[150] transition-all hover:scale-105 backdrop-blur-xl shadow-xl">
              <ChevronDown className="w-7 h-7" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ══ Expanded view overlay (Modo MV) ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: '20px' }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '20px' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-[#03060c] md:bg-bg-main/98 backdrop-blur-3xl flex flex-col items-center pt-[calc(38vh+22px)] md:pt-[8vh] pb-[calc(env(safe-area-inset-bottom)+24px)] md:pb-8 px-5 md:px-6 lg:px-12 overflow-hidden"
            >
              {/* Dynamic Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-black via-[#07101b] to-black md:from-accent/5 md:via-transparent md:to-black pointer-events-none" />
              
              <div className="hidden md:block w-full max-w-[900px] h-[50vh] max-h-[50vh] aspect-video shrink-0 invisible" />
              
              <div className="mt-0 md:mt-8 text-center max-w-[900px] w-full relative z-50 flex-1 flex flex-col min-h-0">
                <div className="shrink-0 mb-5 md:mb-6 flex flex-col items-center">
                  <h2 className="text-2xl md:text-3xl lg:text-5xl font-black text-white tracking-tight md:tracking-tighter mb-2 truncate w-full">{currentTrack.title}</h2>
                  <p className="text-sm md:text-lg lg:text-2xl text-text-dim font-medium truncate w-full">{currentTrack.artist}</p>
                </div>

                <div className="flex flex-col gap-2 mb-7 md:mb-8 shrink-0 w-full max-w-2xl mx-auto">
                  <PlaybackProgress onSeek={handleSeek} formatTime={formatTime} isExpanded />
                </div>

                <div className="flex items-center justify-center gap-6 md:gap-10 lg:gap-16 mb-8 shrink-0">
                  <button onClick={toggleShuffle} title="Toggle Shuffle" className={cn("transition-all hover:scale-110", isShuffle ? "text-white" : "text-text-dim hover:text-white")}><Shuffle className="w-6 h-6 lg:w-7 lg:h-7" /></button>
                  <button onClick={prevTrack} title="Previous Track" className="text-white hover:text-accent transition-all hover:scale-110 active:scale-95"><SkipBack className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current" /></button>
                  <button onClick={togglePause} title={isPlaying ? "Pause" : "Play"} className="w-[68px] h-[68px] md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">
                    {isPlaying ? <Pause className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current" /> : <Play className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current ml-1.5 md:ml-2" />}
                  </button>
                  <button onClick={() => nextTrack()} title="Next Track" className="text-white hover:text-accent transition-all hover:scale-110 active:scale-95"><SkipForward className="w-9 h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 fill-current" /></button>
                  <button onClick={toggleRepeat} title="Toggle Repeat" className={cn("transition-all hover:scale-110 relative", repeatMode !== 'off' ? "text-white" : "text-text-dim hover:text-white")}>
                    <Repeat className="w-6 h-6 lg:w-7 lg:h-7" />
                    {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-white text-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
                  </button>
                </div>
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
              className="fixed right-0 top-0 bottom-[96px] w-80 bg-bg-sidebar/98 backdrop-blur-2xl border-l border-white/5 z-[55] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
                <div>
                  <h3 className="text-lg font-black text-white">Next in Queue</h3>
                  <p className="text-xs text-text-dim mt-0.5">{queue.length} song{queue.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {queue.length > 0 && (
                     <button onClick={clearQueue} className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all" title="Clear queue">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setShowQueue(false)} title="Close queue" className="p-2 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center opacity-50">
                    <ListMusic className="w-10 h-10 text-white" />
                    <p className="font-medium text-sm text-white">Queue is empty</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {queue.map((t, i) => (
                      <div key={`${t.id}-${i}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 group transition-colors">
                        <img src={t.thumbnail} className="w-10 h-10 rounded-md object-cover shrink-0" alt="" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{t.title}</p>
                          <p className="text-[11px] text-text-dim truncate">{t.artist}</p>
                        </div>
                        <button onClick={() => removeFromQueue(i)} title="Remove from queue" className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-2 text-text-dim hover:text-white rounded-full transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ══ Footer player bar (Desktop YT Music Style) ══ */}
        <div className={cn(
          'fixed bottom-0 left-0 right-0 h-[96px] bg-[#03060c] border-t border-white/5 hidden md:flex items-center justify-between z-[60] transition-transform duration-500',
          (isExpanded || !currentTrack) ? 'translate-y-full' : 'translate-y-0'
        )}>
          {/* Top Edge Progress Bar */}
          <div className="absolute top-[-1px] left-0 right-0 h-1 group cursor-pointer" >
             <PlaybackProgressEdge onSeek={handleSeek} />
          </div>

          {/* Left: track info (Offset to make room for absolute floating YT player) */}
          <div className="flex items-center gap-4 w-[30%] pl-[100px]">
            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-white font-bold text-[15px] truncate tracking-tight">{currentTrack?.title}</h3>
              <p className="text-text-dim text-[13px] truncate hover:underline cursor-pointer">{currentTrack?.artist}</p>
            </div>
          </div>

          {/* Center: controls */}
          <div className="flex flex-col items-center justify-center flex-1 max-w-2xl px-4">
            <div className="flex items-center gap-7">
              <button onClick={toggleShuffle} title="Toggle Shuffle" className={cn("transition-all hover:scale-110", isShuffle ? "text-white" : "text-text-dim hover:text-white")}><Shuffle className="w-5 h-5" /></button>
              <button onClick={prevTrack} title="Previous Track" className="text-text-dim hover:text-white transition-all hover:scale-110 active:scale-90"><SkipBack className="w-7 h-7 fill-current" /></button>
              <button onClick={togglePause} title={isPlaying ? "Pause" : "Play"} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
              </button>
              <button onClick={() => nextTrack()} title="Next Track" className="text-text-dim hover:text-white transition-all hover:scale-110 active:scale-90"><SkipForward className="w-7 h-7 fill-current" /></button>
              <button onClick={toggleRepeat} title="Toggle Repeat" className={cn("transition-all hover:scale-110 relative", repeatMode !== 'off' ? "text-white" : "text-text-dim hover:text-white")}>
                <Repeat className="w-5 h-5" />
                {repeatMode === 'one' && <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-white text-black rounded-full w-4 h-4 flex items-center justify-center">1</span>}
              </button>
            </div>
            {/* Time display underneath controls */}
            <div className="mt-1 flex gap-2 text-[11px] font-medium text-text-dim font-mono">
               <TimeDisplay formatTime={formatTime} />
            </div>
          </div>

          {/* Right: volume + queue */}
          <div className="flex items-center justify-end gap-6 w-[30%] pr-8">
            <button
              onClick={() => setShowQueue(!showQueue)}
              className={cn('p-2 rounded-full transition-all hover:bg-white/5 relative', showQueue ? 'text-white bg-white/10' : 'text-text-dim hover:text-white')}
              title="Queue"
            >
              <ListMusic className="w-5 h-5" />
              {queue.length > 0 && (
                <span className="absolute 0 top-0 right-0 w-3 h-3 bg-accent rounded-full border border-[#03060c]" />
              )}
            </button>
            <div className="flex items-center gap-3 group/vol">
              <button onClick={() => setIsMuted(!isMuted)} className="text-text-dim hover:text-white transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-20 py-3 -my-3 relative group-hover/vol:opacity-100 cursor-pointer flex items-center">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover/vol:bg-white/20 transition-colors relative">
                  <div 
                    className="absolute top-0 left-0 h-full w-full bg-white rounded-full origin-left transition-transform duration-100" 
                    {...({ style: { transform: `scaleX(${isMuted ? 0 : volume})` } })} 
                  />
                </div>
                <input type="range" min={0} max={1} step="any" value={isMuted ? 0 : volume}
                  onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                  aria-label="Volume" title="Adjust volume"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Sub-components for Optimization ───────────────────────────────────────

/** 
 * Time display that only re-renders on progress/duration changes.
 */
const TimeDisplay = ({ formatTime }: { formatTime: (s: number) => string }) => {
  const progress = usePlayerStore(s => s.progress);
  const duration = usePlayerStore(s => s.duration);
  return (
    <>
      <span>{formatTime((progress || 0) * duration)}</span>
      <span className="opacity-50">/</span>
      <span>{formatTime(duration)}</span>
    </>
  );
};

/**
 * Top Edge Progress Bar for YT Music style desktop footer
 */
const PlaybackProgressEdge = ({ onSeek }: { onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  const progress = usePlayerStore(s => s.progress);
  return (
    <div className="w-full h-1 bg-transparent hover:bg-white/10 relative transition-colors group/edge">
      {/* Progress track */}
      <div 
        className="absolute top-0 left-0 h-full w-full bg-accent transition-all duration-150 z-10 origin-left" 
        {...({ style: { transform: `scaleX(${progress || 0})` } })} 
      />
      {/* Hitbox expanded for easier clicking */}
      <div className="absolute -top-3 -bottom-3 left-0 right-0 z-20 flex items-center">
         <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={onSeek} aria-label="Seek track" title="Seek" className="w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  );
};

/** 
 * Standard progress bar for Expanded MV mode
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

  return (
    <>
      <div className="flex justify-between items-center text-xs font-mono font-medium text-text-dim px-1 mb-2">
        <span>{formatTime((progress || 0) * duration)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="py-4 -my-4 w-full relative cursor-pointer flex items-center group/prog">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full w-full bg-white rounded-full transition-all duration-150 z-10 origin-left group-hover/prog:bg-accent" 
            {...({ style: { transform: `scaleX(${progress || 0})` } })} 
          />
        </div>
        <input type="range" min={0} max={1} step="any" value={progress || 0} onChange={onSeek} aria-label="Seek track" title="Seek" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
      </div>
    </>
  );
};
