import React, { useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Maximize2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

const PlayerComponent = ReactPlayer as any;

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
    setDuration
  } = usePlayerStore();
  
  const playerRef = useRef<any>(null);

  if (!currentTrack) return null;

  const handleProgress = (state: any) => {
    setProgress(state.played);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    playerRef.current?.seekTo(val);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[90px] bg-bg-sidebar/80 backdrop-blur-2xl border-t border-glass-border px-6 flex items-center justify-between z-50">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-[300px]">
        <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-accent/30 group bg-black">
          <img 
            src={currentTrack.thumbnail} 
            alt={currentTrack.title}
            className="w-full h-full object-cover opacity-60"
          />
          {/* YouTube Video (Required for ToS) */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             <PlayerComponent
              ref={playerRef}
              url={currentTrack.url}
              playing={isPlaying}
              volume={volume}
              width="100%"
              height="100%"
              onProgress={handleProgress}
              onDuration={setDuration}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
          </div>
          {/* Hidden but playing player for audio */}
          <div className="hidden">
            <PlayerComponent
              url={currentTrack.url}
              playing={isPlaying}
              volume={volume}
              onProgress={handleProgress}
              onDuration={setDuration}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[8px] font-bold text-accent text-center leading-tight">YT<br/>64x64</span>
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <h3 className="text-text-main font-semibold text-sm truncate">{currentTrack.title}</h3>
          <p className="text-text-dim text-xs truncate">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-2 flex-1 max-w-2xl">
        <div className="flex items-center gap-6">
          <button className="text-text-dim hover:text-text-main transition-colors opacity-50">
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button className="text-text-dim hover:text-text-main transition-colors opacity-50">
            <SkipBack className="w-4 h-4 fill-current" />
          </button>
          <button 
            onClick={togglePause}
            className="w-10 h-10 bg-text-main rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
          >
            {isPlaying ? (
              <Pause className="text-bg-main w-5 h-5 fill-current" />
            ) : (
              <Play className="text-bg-main w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button className="text-text-dim hover:text-text-main transition-colors opacity-50">
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
          <button className="text-text-dim hover:text-text-main transition-colors opacity-50">
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>
        
        <div className="flex items-center gap-3 w-full max-w-[450px]">
          <span className="text-[11px] text-text-dim w-8 text-right font-medium">
            {formatTime(progress * duration)}
          </span>
          <div className="flex-1 h-1 bg-glass-border rounded-full relative group cursor-pointer">
            <div 
              className="absolute top-0 left-0 h-full bg-accent rounded-full" 
              style={{ width: `${progress * 100}%` }}
            />
            <input 
              type="range"
              min={0}
              max={1}
              step="any"
              value={progress}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[11px] text-text-dim w-8 font-medium">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Volume & Extra */}
      <div className="flex items-center justify-end gap-4 w-[300px]">
        <div className="flex items-center gap-3 group">
          <Volume2 className="w-4 h-4 text-text-dim group-hover:text-text-main" />
          <div className="w-24 h-1 bg-glass-border rounded-full relative cursor-pointer">
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
        <button className="text-text-dim hover:text-text-main transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
