import React, { memo, useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle,
  Maximize2, VolumeX, ChevronDown, AlertTriangle, ListMusic, X, Trash2,
  Download, CheckCircle2, Loader2, ArrowDownCircle
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePlayerStore, API_BASE_URL } from '../store/usePlayerStore';
import { offlineService } from '../lib/offlineService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Pure Helpers (defined outside component to avoid recreation on each render) ─

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const NGROK_HEADERS = {
  'ngrok-skip-browser-warning': 'true',
  'X-Requested-With': 'com.vibestream.app',
};

const isNativePlatform = Capacitor.isNativePlatform();



const PlayerInner = () => {
  const {
    currentTrack, isPlaying, togglePause, volume, setVolume,
    progress, setProgress, duration, setDuration, setIsPlaying,
    isExpanded, setIsExpanded, queue, removeFromQueue, clearQueue,
    nextTrack, prevTrack, isShuffle, toggleShuffle, repeatMode, toggleRepeat,
    seekTrigger
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const isFirstLoad = useRef(true);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const { downloadedIds, downloadingIds, toggleDownload } = usePlayerStore();

  // ─── Offline Storage Handling ──────────────────────────────────────────────
  // ─── Ngrok Bypass / Streaming URL Handling ────────────────────────────────
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    if (!currentTrack) {
      setStreamUrl('');
      return;
    }

    let active = true;
    const originalUrl = `${API_BASE_URL}/api/stream/${currentTrack.videoId}${isNativePlatform ? '?native=1' : ''}`;
    let objectUrlToCleanup: string | null = null;

    const updateStream = async () => {
      // 1. Check if it's already downloaded (Offline mode)
      if (downloadedIds.includes(currentTrack.videoId)) {
        try {
          const trackData = await offlineService.getTrack(currentTrack.videoId);
          if (trackData && active) {
            const objectUrl = URL.createObjectURL(trackData.blob);
            objectUrlToCleanup = objectUrl;
            setStreamUrl(objectUrl);
            setLocalUrl(objectUrl);
            return;
          }
        } catch (err) {
          console.error("[Offline] Failed to load local blob:", err);
        }
      }

      // 2. Native Android/iOS cannot attach custom headers to the <audio> request.
      // For ngrok-backed streams, fetch the audio with headers and play a local blob URL instead.
      if (originalUrl.includes('ngrok') && isNativePlatform) {
        try {
          await fetch(`${API_BASE_URL}/api/health`, { headers: NGROK_HEADERS }).catch(() => {});

          const response = await fetch(originalUrl, {
            headers: NGROK_HEADERS,
          });

          if (!response.ok) {
            throw new Error(`Native stream fetch failed with status ${response.status}`);
          }

          const blob = await response.blob();
          if (!active) return;

          objectUrlToCleanup = URL.createObjectURL(blob);
          setStreamUrl(objectUrlToCleanup);
          setLocalUrl(objectUrlToCleanup);
          setPlayerError(false);
          return;
        } catch (err) {
          console.error('[Audio] Native ngrok blob streaming failed:', err);
        }
      }

      // 3. Web and non-ngrok cases can stream directly.
      if (active) {
        setStreamUrl(originalUrl);
        setLocalUrl(null);
        setPlayerError(false);
      }
    };

    updateStream();

    return () => {
      active = false;
      if (objectUrlToCleanup?.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrlToCleanup);
      }
    };
  }, [currentTrack, downloadedIds]);

  // ─── Native Audio Handlers ──────────────────────────────────────────────────
  
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.currentTime / audio.duration;
    if (!isNaN(p)) setProgress(p);
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
    setIsReady(true);
    if (isPlaying) audio.play().catch(() => {});
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const handleError = (e: any) => {
    console.error('[Audio] Error:', e);
    setPlayerError(true);
    setIsReady(true);
  };

  // Sync isPlaying state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;

    if (isPlaying) {
      audio.play().catch(err => {
        console.warn("[Audio] Play blocked by browser:", err);
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, isReady, setIsPlaying]);

  // Sync volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle Seek Trigger
  useEffect(() => {
    if (audioRef.current && seekTrigger !== 0) {
      audioRef.current.currentTime = 0;
    }
  }, [seekTrigger]);

  // Restore progress on first load
  useEffect(() => {
    if (isReady && isFirstLoad.current && progress > 0 && audioRef.current) {
      audioRef.current.currentTime = progress * audioRef.current.duration;
      isFirstLoad.current = false;
    }
  }, [isReady, progress]);

  // ─── Media Session API ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: 'VibeStream',
      artwork: [
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
    ms.setActionHandler('play', () => setIsPlaying(true));
    ms.setActionHandler('pause', () => setIsPlaying(false));
    ms.setActionHandler('previoustrack', () => prevTrack());
    ms.setActionHandler('nexttrack', () => nextTrack());
    ms.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
    ms.setActionHandler('seekbackward', () => {
      if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    });
    ms.setActionHandler('seekforward', () => {
      if (audioRef.current) audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 10);
    });
    ms.setActionHandler('stop', () => {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.currentTime = 0;
    });
  }, [setIsPlaying, prevTrack, nextTrack]);

  // Update Media Session Position State
  useEffect(() => {
    if (!('mediaSession' in navigator) || !audioRef.current || !isReady || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: duration || 0,
        playbackRate: audioRef.current.playbackRate || 1,
        position: (progress * duration) || 0,
      });
    } catch (e) {
      // Some browsers might not support certain position state combinations
    }
  }, [progress, duration, isReady]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = val * audioRef.current.duration;
    }
  }, [setProgress]);


  const SILENT_AUDIO_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

  return (
    <div className={cn('fixed inset-0 pointer-events-none z-50', !currentTrack && 'opacity-0')}>
      <audio 
        ref={audioRef} 
        src={streamUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        preload="auto"
        playsInline 
        className="hidden" 
      />
      <div className="pointer-events-auto">

        {/* ══ YouTube Player container (Video square / MV Mode) ══ */}
        <div
          className={cn(
            'fixed overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-2xl z-[110]',
            isExpanded
              ? 'top-0 left-0 right-0 h-[38vh] max-h-none rounded-none shadow-[0_24px_80px_rgba(0,0,0,0.65)] md:top-[6vh] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-[800px] md:max-h-[42vh] md:h-auto md:aspect-video md:rounded-3xl md:shadow-[0_0_100px_rgba(56,189,248,0.1)]'
              : 'bottom-[75px] left-2 w-[80px] h-[80px] rounded-xl md:bottom-[16px] md:left-[16px] md:w-[64px] md:h-[64px] md:rounded-lg md:cursor-pointer md:group'
          )}
        >
          {/* Mobile mini: transparent overlay to intercept YT-iframe clicks → open MV */}
          {!isExpanded && (
            <div
              className="absolute inset-0 z-[15] md:hidden cursor-pointer"
              onClick={(e) => { e.stopPropagation(); if (currentTrack) setIsExpanded(true); }}
            />
          )}

          {/* Desktop Hover Indicator */}
          {!isExpanded && (
            <div
              className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 bg-black/60 backdrop-blur-[2px] cursor-pointer"
              onClick={() => { if (currentTrack) setIsExpanded(true); }}
            >
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

          <div className={cn('absolute z-10 transition-all duration-500 overflow-hidden inset-0', 
            isReady ? 'opacity-100' : 'opacity-0'
          )}>
            <img 
              src={currentTrack?.thumbnail} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* ══ Mobile Mini Control Bar (sits right of the video square) ══ */}
        <AnimatePresence>
          {!isExpanded && currentTrack && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed bottom-[75px] left-[92px] right-2 h-[80px] z-[109] md:hidden bg-bg-sidebar/95 backdrop-blur-xl border border-white/5 rounded-xl flex items-center px-3 gap-2"
            >
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(true)}>
                <p className="text-[13px] font-bold text-white truncate leading-tight">{currentTrack.title}</p>
                <p className="text-[11px] text-text-dim truncate mt-0.5">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center shrink-0 gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); prevTrack(); }} title="Previous" className="p-2 text-text-dim active:scale-90 transition-transform">
                  <SkipBack className="w-[18px] h-[18px] fill-current" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); togglePause(); }} title={isPlaying ? 'Pause' : 'Play'} className="w-9 h-9 bg-white text-black rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-md mx-0.5">
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); nextTrack(); }} title="Next" className="p-2 text-text-dim active:scale-90 transition-transform">
                  <SkipForward className="w-[18px] h-[18px] fill-current" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* ══ Expanded view overlay (MV Mode — YouTube Music style) ══ */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }} transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed inset-0 z-[100] bg-[#080c12] md:bg-bg-main/98 backdrop-blur-3xl flex flex-col overflow-y-auto custom-scrollbar scroll-smooth"
            >
              {/* Subtle ambient glow behind video */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050810] to-[#080c12] pointer-events-none z-0" />

              {/* ── Desktop: invisible spacer for the floating video container ── */}
              <div className="hidden md:flex w-full justify-center shrink-0">
                <div className="w-full max-w-[800px] h-[6vh]" />
              </div>
              <div className="hidden md:flex w-full justify-center shrink-0">
                <div className="w-full max-w-[800px] aspect-video max-h-[42vh] invisible" />
              </div>

              {/* ── Mobile: spacer equal to the video height (38vh) ── */}
              <div className="md:hidden shrink-0 h-[38vh]" />

              {/* ── Main content area (below video on both layouts) ── */}
              <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full md:max-w-[800px] md:mx-auto md:mt-2 px-6 md:px-0">

                {/* Track info: left-aligned on mobile (YT Music style), centered on desktop */}
                <div className="shrink-0 mt-5 md:mt-0 mb-4 md:mb-4 md:text-center">
                  <h2 className="text-[20px] md:text-2xl lg:text-4xl font-black text-white tracking-tight leading-tight truncate">
                    {currentTrack.title}
                  </h2>
                  <p className="text-[15px] md:text-lg lg:text-2xl text-text-dim font-medium truncate mt-1">
                    {currentTrack.artist}
                  </p>
                </div>

                {/* Download / Info Bar */}
                <div className="shrink-0 flex items-center justify-between mb-4 md:mb-6 md:max-w-xl md:mx-auto w-full px-1">
                   <div className="flex items-center gap-6">
                      <button 
                        onClick={() => toggleDownload(currentTrack)}
                        className={cn(
                          "flex flex-col items-center gap-1 transition-all active:scale-90",
                          downloadedIds.includes(currentTrack.videoId) ? "text-accent" : "text-text-dim hover:text-white"
                        )}
                      >
                        <div className={cn(
                          "p-2.5 rounded-full bg-white/5 border border-white/10",
                          downloadingIds.includes(currentTrack.videoId) && "animate-pulse"
                        )}>
                          {downloadingIds.includes(currentTrack.videoId) ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : downloadedIds.includes(currentTrack.videoId) ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <ArrowDownCircle className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {downloadingIds.includes(currentTrack.videoId) ? 'Downloading' : 
                           downloadedIds.includes(currentTrack.videoId) ? 'Offline' : 'Download'}
                        </span>
                      </button>

                      <button className="flex flex-col items-center gap-1 text-text-dim hover:text-white transition-all active:scale-90">
                         <div className="p-2.5 rounded-full bg-white/5 border border-white/10">
                            <ListMusic className="w-5 h-5" />
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-widest">Add to Playlist</span>
                      </button>
                   </div>
                </div>

                {/* Progress bar */}
                <div className="shrink-0 mb-6 md:mb-8 w-full max-w-2xl md:mx-auto">
                  <PlaybackProgress onSeek={handleSeek} formatTime={formatTime} isExpanded />
                </div>

                {/* Playback controls */}
                <div className="flex items-center justify-between md:justify-center md:gap-12 mb-6 shrink-0 px-1 md:px-0">
                  <button onClick={toggleShuffle} title="Toggle Shuffle"
                    className={cn("p-2 transition-all active:scale-90", isShuffle ? "text-accent" : "text-text-dim")}>
                    <Shuffle className="w-[22px] h-[22px]" />
                  </button>
                  <button onClick={prevTrack} title="Previous Track"
                    className="p-2 text-white transition-all active:scale-90">
                    <SkipBack className="w-9 h-9 fill-current" />
                  </button>
                  <button onClick={togglePause} title={isPlaying ? "Pause" : "Play"}
                    className="w-16 h-16 md:w-20 md:h-20 bg-white text-black rounded-full flex items-center justify-center active:scale-95 transition-all shadow-xl shadow-white/10">
                    {isPlaying
                      ? <Pause className="w-7 h-7 md:w-9 md:h-9 fill-current" />
                      : <Play className="w-7 h-7 md:w-9 md:h-9 fill-current ml-1" />}
                  </button>
                  <button onClick={() => nextTrack()} title="Next Track"
                    className="p-2 text-white transition-all active:scale-90">
                    <SkipForward className="w-9 h-9 fill-current" />
                  </button>
                  <button onClick={toggleRepeat} title="Toggle Repeat"
                    className={cn("p-2 transition-all active:scale-90 relative", repeatMode !== 'off' ? "text-accent" : "text-text-dim")}>
                    <Repeat className="w-[22px] h-[22px]" />
                    {repeatMode === 'one' && (
                      <span className="absolute top-0.5 right-0.5 text-[8px] font-black bg-accent text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">1</span>
                    )}
                  </button>
                </div>

                {/* ── Bottom tabs (YT Music style) ── */}
                <div className="shrink-0 border-t border-white/8 mt-auto pb-[env(safe-area-inset-bottom)]">
                  <div className="flex items-stretch h-14">
                    <button
                      onClick={() => { setIsExpanded(false); setShowQueue(true); }}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5 text-text-dim hover:text-white transition-colors active:bg-white/5 rounded-xl"
                    >
                      <ListMusic className="w-4 h-4" />
                      <span className="text-[11px] font-bold tracking-wide">Up next</span>
                    </button>
                    <div className="w-px bg-white/8 my-3" />
                    <button
                      onClick={toggleShuffle}
                      className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-white/5 rounded-xl",
                        isShuffle ? "text-accent" : "text-text-dim hover:text-white")}
                    >
                      <Shuffle className="w-4 h-4" />
                      <span className="text-[11px] font-bold tracking-wide">Shuffle</span>
                    </button>
                    <div className="w-px bg-white/8 my-3" />
                    <button
                      onClick={toggleRepeat}
                      className={cn("flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors active:bg-white/5 rounded-xl",
                        repeatMode !== 'off' ? "text-accent" : "text-text-dim hover:text-white")}
                    >
                      <Repeat className="w-4 h-4" />
                      <span className="text-[11px] font-bold tracking-wide">
                        {repeatMode === 'one' ? 'Repeat 1' : 'Repeat'}
                      </span>
                    </button>
                  </div>
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

/** Memoized Player — prevents re-renders on route/parent changes */
export const Player = memo(PlayerInner);

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
