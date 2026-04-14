import React from 'react';
import { Library as LibraryIcon, Search, ListMusic, Mic2, Disc, Play, MoreVertical, Plus } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

const LibraryCategory = ({ icon: Icon, title, count }: { icon: any, title: string, count: number }) => (
  <div className="bg-white/5 hover:bg-white/10 p-6 rounded-[28px] border border-white/5 transition-all cursor-pointer group hover:border-accent/30 hover:shadow-2xl hover:shadow-accent/5">
    <div className="w-14 h-14 bg-accent/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-accent/10">
      <Icon className="text-accent w-7 h-7" />
    </div>
    <h3 className="text-lg font-black text-white mb-1 tracking-tight">{title}</h3>
    <p className="text-text-dim text-xs font-bold uppercase tracking-widest">{count} items</p>
  </div>
);

export const Library = () => {
  const { playlists, likedSongs, followedArtists, listeningHistory, playTrack, currentTrack, isPlaying } = usePlayerStore();

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar">
      <div className="px-10 py-12">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Your Library</h1>
            <p className="text-text-dim text-sm mt-2 font-medium">Manage your personal collection and history.</p>
          </div>
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold text-sm rounded-2xl hover:opacity-90 shadow-xl shadow-accent/20 transition-all">
                <Plus className="w-4 h-4" /> Create Playlist
             </button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <LibraryCategory icon={ListMusic} title="Playlists" count={playlists?.length || 0} />
          <LibraryCategory icon={Mic2} title="Artists" count={followedArtists?.length || 0} />
          <LibraryCategory icon={Disc} title="Liked Songs" count={likedSongs?.length || 0} />
          <LibraryCategory icon={LibraryIcon} title="History" count={listeningHistory?.length || 0} />
        </div>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tight">Recent Activity</h2>
            <button className="text-text-dim hover:text-white text-sm font-bold transition-colors">View All History</button>
          </div>
          
          {(!listeningHistory || listeningHistory.length === 0) ? (
            <div className="bg-white/5 rounded-[32px] border border-white/5 p-12 text-center backdrop-blur-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <LibraryIcon className="text-white/20 w-8 h-8" />
                </div>
                <p className="text-text-main font-bold text-lg mb-2">No recent activity found</p>
                <p className="text-text-dim text-sm max-w-xs mx-auto mb-8 font-medium">Start listening to build your library and see your most played tracks here.</p>
                <button className="px-8 py-3 bg-white text-bg-main font-black text-xs rounded-xl hover:scale-105 transition-transform shadow-2xl">Explore Trends</button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listeningHistory.slice(0, 9).map((track) => (
                <div 
                  key={`history-${track.id}`}
                  onClick={() => playTrack(track)}
                  className="flex items-center gap-4 bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-2xl cursor-pointer transition-all group hover:scale-[1.02]"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden relative shadow-lg">
                    <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-6 h-6 text-white fill-current ml-1" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={cn("text-sm font-bold truncate", currentTrack?.id === track.id ? "text-accent" : "text-white")}>{track.title}</h3>
                    <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
