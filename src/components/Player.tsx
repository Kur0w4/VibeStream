import React, { useRef, useState, useEffect } from 'react';
import ReactPlayerBase from 'react-player';
const ReactPlayer = ReactPlayerBase as any;
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Repeat, 
  Shuffle, 
  Maximize2, 
  VolumeX, 
  ChevronDown,
  ExternalLink,
  Minimize2
} from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const Player = () => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePause, 
    volume, 
    setVolume, 
    progress, 
    setProgress,
    duration,
    setDuration,
    setIsPlaying,
    isExpanded,
    setIsExpanded
  } = usePlayerStore();
  
  const playerRef = useRef<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying && isReady && playerRef.current) {
      interval = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime();
        const totalTime = playerRef.current.getDuration();
        if (totalTime > 0) {
          setProgress(currentTime / totalTime);
          if (duration !== totalTime) setDuration(totalTime);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isReady, duration]);

  useEffect(() => {
    if (currentTrack) {
      setIsReady(false);
      setProgress(0);
    }
  }, [currentTrack?.url]);

  const handleProgress = (state: { played: number }) => {
    if (!isNaN(state.played) && state.played >= 0) {
      setProgress(state.played);
    }
  };

  const handleDuration = (dur: number) => {
    if (dur > 0) {
      setDuration(dur);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (playerRef.current) {
      playerRef.current.seekTo(val);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("fixed inset-0 pointer-events-none z-50", !currentTrack && "opacity-0")}>
      <div className="pointer-events-auto">
        {/* SINGLE MOUNTED REACT PLAYER (ToS Compliant, Always Visisble) */}
        <div 
          className={cn(
            "fixed z-[70] overflow-hidden bg-black transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer group shadow-2xl ring-1 ring-white/10 flex items-center justify-center",
            isExpanded 
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1000px] aspect-video rounded-[40px] shadow-[0_0_100px_rgba(0,245,255,0.15)]" 
              : "bottom-[20px] left-[32px] w-20 h-14 rounded-lg hover:scale-105"
          )}
          onClick={() => { if (!isExpanded && currentTrack) setIsExpanded(true); }}
        >
          {currentTrack && (
            <img 
              src={currentTrack.thumbnail} 
              alt={currentTrack.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-all duration-700 z-0",
                isPlaying ? (isExpanded ? "opacity-30 scale-100" : "opacity-20 scale-105") : "opacity-40 scale-100"
              )}
            />
          )}
          
          <div className={cn(
            "relative z-10 w-full h-full transition-opacity duration-1000",
            isReady ? "opacity-100" : "opacity-0"
          )}>
            <ReactPlayer
              ref={playerRef}
              url={currentTrack?.url || undefined}
              playing={isPlaying}
              volume={volume}
              muted={isMuted}
              width="100%"
              height="100%"
              onProgress={handleProgress as any}
              onDuration={handleDuration as any}
              onReady={() => setIsReady(true)}
              onError={(e) => console.error('[Player] Error:', e)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              config={{ 
                youtube: { 
                  playerVars: { 
                    autoplay: 1, 
                    modestbranding: 1, 
                    rel: 0, 
                    origin: window.location.origin 
                  } 
                } as any
              }}
            />
          </div>

          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity z-20 backdrop-blur-[1px]",
            isExpanded ? "opacity-0" : "opacity-0 group-hover:opacity-100 bg-black/60"
          )}>
             <Maximize2 className="text-accent w-6 h-6" />
          </div>
        </div>

        {/* Expanded View UI (Backdrop & Center Controls) */}
        <AnimatePresence>
          {isExpanded && currentTrack && (
            <motion.div 
              initial={{ opacity: 0, y: '10%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '10%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="fixed inset-0 z-[60] bg-bg-main/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 overflow-y-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-main pointer-events-none" />
              
              <button 
                onClick={() => setIsExpanded(false)}
                className="absolute top-8 left-8 p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-white z-50 transition-all hover:scale-105"
              >
                <ChevronDown className="w-8 h-8" />
              </button>

              {/* Placeholder for the fixed video container */}
              <div className="w-full max-w-[1000px] aspect-video invisible" />

              <div className="mt-12 text-center max-w-[1000px] w-full px-8 relative z-50">
                <h2 className="text-5xl font-black text-white tracking-tighter mb-3">{currentTrack.title}</h2>
                <p className="text-2xl text-accent font-bold mb-12">{currentTrack.artist}</p>
                
                {/* Massive Progress Bar */}
                <div className="flex flex-col gap-4 mb-16">
                  <div className="flex justify-between items-center text-sm font-mono font-bold text-text-dim px-2">
                     <span>{formatTime((progress || 0) * duration)}</span>
                     <span>{formatTime(duration)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" 
                      style={{ width: `${(progress || 0) * 100}%` }}
                    />
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step="any"
                      value={progress || 0}
                      onChange={handleSeek}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    />
                  </div>
                </div>

                {/* Large Controls */}
                <div className="flex items-center justify-center gap-14">
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><Shuffle className="w-8 h-8" /></button>
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipBack className="w-10 h-10 fill-current" /></button>
                  <button 
                    onClick={togglePause}
                    className="w-28 h-28 bg-white text-bg-main rounded-[40px] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-accent/20"
                  >
                    {isPlaying ? <Pause className="w-12 h-12 fill-current" /> : <Play className="w-12 h-12 fill-current ml-2" />}
                  </button>
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><SkipForward className="w-10 h-10 fill-current" /></button>
                  <button className="text-text-dim hover:text-white transition-all hover:scale-110"><Repeat className="w-8 h-8" /></button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Player GUI */}
        <div 
          className={cn(
            "fixed bottom-0 left-0 right-0 h-[95px] bg-bg-sidebar/95 backdrop-blur-3xl border-t border-glass-border px-8 flex items-center justify-between z-50 transition-transform duration-500",
            (isExpanded || !currentTrack) ? "translate-y-full" : "translate-y-0"
          )}
        >
          <div className="flex items-center gap-5 w-[320px]">
            {/* Invisible placeholder for where the actual video sits */}
            <div className="w-20 h-14" />

            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-text-main font-bold text-sm truncate tracking-tight">{currentTrack?.title}</h3>
              <p className="text-text-dim text-[11px] truncate font-medium mt-0.5">{currentTrack?.artist}</p>
            </div>
          </div>

          {/* Main Footer Controls */}
          <div className="flex flex-col items-center gap-2.5 flex-1 max-w-2xl px-4">
            <div className="flex items-center gap-8">
              <button className="text-text-dim hover:text-accent transition-all hover:scale-110 active:scale-90"><Shuffle className="w-4 h-4" /></button>
              <button className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipBack className="w-5 h-5 fill-current" /></button>
              <button 
                onClick={togglePause}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
              >
                {isPlaying ? <Pause className="text-bg-main w-6 h-6 fill-current" /> : <Play className="text-bg-main w-6 h-6 fill-current ml-1" />}
              </button>
              <button className="text-text-dim hover:text-text-main transition-all hover:scale-110 active:scale-90"><SkipForward className="w-5 h-5 fill-current" /></button>
              <button className="text-text-dim hover:text-accent transition-all hover:scale-110 active:scale-90"><Repeat className="w-4 h-4" /></button>
            </div>
            
            <div className="flex items-center gap-4 w-full">
              <span className="text-[10px] text-text-dim w-10 text-right font-bold font-mono">
                {formatTime((progress || 0) * duration)}
              </span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full relative group cursor-pointer overflow-hidden border border-white/5">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-blue-400 rounded-full transition-all duration-150 z-10" 
                  style={{ width: `${(progress || 0) * 100}%` }}
                />
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step="any"
                  value={progress || 0}
                  onChange={handleSeek}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                />
              </div>
              <span className="text-[10px] text-text-dim w-10 font-bold font-mono">
                {formatTime(duration)}
              </span>
            </div>
          </div>

        {/* Footer Volume Controls */}
        <div className="flex items-center justify-end gap-6 w-[320px]">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMuted(!isMuted)} className="text-text-dim hover:text-text-main transition-colors">
              {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="w-24 h-1.5 bg-white/5 rounded-full relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-text-main rounded-full" 
                style={{ width: `${volume * 100}%` }}
              />
              <input 
                type="range"
                min={0}
                max={1}
                step="any"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
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
