import React from 'react';
import { Heart, Play, Clock, MoreHorizontal, Search, Shuffle } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export const LikedSongs = () => {
  const { playTrack, currentTrack, isPlaying, likedSongs, toggleLike } = usePlayerStore();
  
  return (
    <div className="flex-1 bg-gradient-to-b from-rose-900/40 via-bg-main to-black overflow-y-auto custom-scrollbar">
      {/* Hero Header */}
      <div className="px-10 py-16 flex items-end gap-8 bg-gradient-to-b from-transparent to-bg-main/60">
        <div className="w-56 h-56 bg-gradient-to-br from-rose-500 to-red-700 rounded-[40px] shadow-[0_20px_50px_rgba(244,63,94,0.3)] flex items-center justify-center p-12">
           <Heart className="w-full h-full text-white fill-white drop-shadow-2xl" />
        </div>
        <div className="mb-4">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-[0.4em]">Playlist</span>
          <h1 className="text-7xl font-black text-white mt-2 tracking-tighter">Liked Songs</h1>
          <div className="flex items-center gap-2 mt-6">
            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
              <img src="https://picsum.photos/seed/user/100" className="w-full h-full rounded-full object-cover" />
            </div>
            <span className="text-sm font-black text-white">Alex Rivera</span>
            <span className="w-1 h-1 bg-white/30 rounded-full" />
            <span className="text-sm font-medium text-text-dim">{likedSongs?.length || 0} songs</span>
          </div>
        </div>
      </div>

      <div className="px-10 py-8">
        {/* Actions bar */}
        <div className="flex items-center gap-6 mb-10">
          <button className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20">
             <Play className="w-7 h-7 fill-current ml-1" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/5 text-text-dim hover:text-white transition-all">
             <Shuffle className="w-6 h-6" />
          </button>
          <button className="p-3 rounded-full hover:bg-white/5 text-text-dim hover:text-white transition-all">
             <MoreHorizontal className="w-6 h-6" />
          </button>
          <div className="ml-auto relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-white transition-colors" />
             <input 
               type="text" 
               placeholder="Search in liked songs"
               className="bg-transparent border-none text-sm text-white placeholder:text-text-dim focus:ring-0 pl-10 w-48 transition-all"
             />
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_1fr_100px_40px] gap-4 px-6 py-3 border-b border-white/5 text-[10px] font-black text-text-dim uppercase tracking-widest mb-4">
          <span className="text-center">#</span>
          <span>Title</span>
          <span>Album</span>
          <span className="text-center"><Clock className="w-4 h-4 mx-auto" /></span>
          <span />
        </div>

        {/* Tracks List */}
        <div className="space-y-1 pb-32">
          {(!likedSongs || likedSongs.length === 0) ? (
            <div className="text-center py-20 text-text-dim font-medium italic">
               No liked songs yet. Start liking tracks in the Search tab!
            </div>
          ) : (
            likedSongs.map((track, index) => (
              <div 
                key={track.id}
                onClick={() => playTrack(track)}
                className={cn(
                  "grid grid-cols-[40px_1fr_1fr_100px_40px] gap-4 px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all",
                  currentTrack?.id === track.id ? "bg-white/10" : "hover:bg-white/5"
                )}
              >
                <div className="text-center">
                  {currentTrack?.id === track.id && isPlaying ? (
                    <div className="wave-container scale-50 justify-center">
                      <div className="wave-bar" />
                      <div className="wave-bar" style={{ animationDelay: '0.1s' }} />
                      <div className="wave-bar" style={{ animationDelay: '0.2s' }} />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-text-dim group-hover:hidden">{index + 1}</span>
                  )}
                  <Play className={cn("w-4 h-4 text-white mx-auto hidden group-hover:block fill-white", currentTrack?.id === track.id && "block")} />
                </div>

                <div className="flex items-center gap-4">
                  <img src={track.thumbnail} className="w-10 h-10 rounded-lg shadow-lg" alt={track.title} />
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold truncate", currentTrack?.id === track.id ? "text-accent" : "text-white")}>
                      {track.title}
                    </p>
                    <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                  </div>
                </div>

                <span className="text-xs text-text-dim font-medium truncate">Premium Vibe Selection</span>
                <span className="text-xs text-text-dim font-mono text-center font-bold">{track.duration}</span>

                <div className="flex justify-end pr-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleLike(track); }} className="hover:scale-110 active:scale-90 transition-transform p-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
