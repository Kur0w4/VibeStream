import React, { useState } from 'react';
import { Plus, Search, ListMusic, Play, Clock, MoreHorizontal, Heart, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { usePlayerStore } from '../store/usePlayerStore';

const PlaylistCard = ({ title, tracks, color, image }: { title: string, tracks: string, color: string, image: string }) => (
  <div className="group bg-white/5 hover:bg-white/10 rounded-[32px] border border-white/5 p-5 transition-all duration-500 cursor-pointer flex flex-col relative overflow-hidden">
    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-1000", color)} />
    
    <div className="relative aspect-square rounded-[24px] overflow-hidden mb-5 shadow-2xl bg-white/5 flex items-center justify-center">
      {image ? (
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
      ) : (
        <ListMusic className="w-16 h-16 text-text-dim group-hover:scale-110 transition-transform duration-700" />
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
          <Play className="w-7 h-7 fill-current ml-1" />
        </button>
      </div>
    </div>
    
    <div className="relative z-10">
      <h3 className="text-lg font-black text-white group-hover:text-accent transition-colors tracking-tight line-clamp-1">{title}</h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{tracks} Tracks</span>
        <span className="w-1 h-1 bg-white/20 rounded-full" />
        <span className="text-[10px] font-black text-accent uppercase tracking-widest">Public</span>
      </div>
    </div>
  </div>
);

export const Playlists = () => {
  const { playlists, createPlaylist } = usePlayerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar relative">
      <div className="px-10 py-12">
        <header className="flex items-end justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-accent rounded-[32px] flex items-center justify-center shadow-2xl shadow-accent/20 rotate-3">
              <ListMusic className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter">Playlists</h1>
              <p className="text-text-dim text-sm mt-1 font-medium italic">"Your life, your soundtrack."</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-8 py-4 bg-white text-bg-main font-black text-sm rounded-2xl hover:scale-105 transition-transform shadow-2xl"
          >
            <Plus className="w-5 h-5" /> New Playlist
          </button>
        </header>

        <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {['All', 'Chill', 'Workout', 'Focus', 'Electronic', 'Jazz', 'Pop'].map((tag) => (
            <button key={tag} className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-text-dim hover:text-white hover:bg-white/10 hover:border-accent/30 transition-all whitespace-nowrap">
              {tag}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
          {/* User Custom Playlists */}
          {playlists.map((pl) => (
            <PlaylistCard 
              key={pl.id} 
              title={pl.name} 
              tracks={pl.tracks.length.toString()} 
              color="bg-accent" 
              image={pl.tracks.length > 0 ? pl.tracks[0].thumbnail : ""} 
            />
          ))}

          {/* Preset Playlists */}
          <PlaylistCard title="Midnight Lofi" tracks="42" color="bg-blue-500" image="https://picsum.photos/seed/playlist1/400" />
          <PlaylistCard title="Deep Focus" tracks="28" color="bg-purple-500" image="https://picsum.photos/seed/playlist2/400" />
          <PlaylistCard title="Morning Coffee" tracks="15" color="bg-orange-500" image="https://picsum.photos/seed/playlist3/400" />
          <PlaylistCard title="Gym Energy" tracks="56" color="bg-red-500" image="https://picsum.photos/seed/playlist4/400" />
          <PlaylistCard title="Rainy Jazz" tracks="31" color="bg-indigo-500" image="https://picsum.photos/seed/playlist5/400" />
          <PlaylistCard title="Synthwave Mix" tracks="24" color="bg-pink-500" image="https://picsum.photos/seed/playlist6/400" />
          <PlaylistCard title="Late Night Soul" tracks="19" color="bg-amber-500" image="https://picsum.photos/seed/playlist7/400" />
          <PlaylistCard title="Acoustic Chill" tracks="35" color="bg-green-500" image="https://picsum.photos/seed/playlist8/400" />
        </div>
      </div>

      {/* Create Playlist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-bg-sidebar border border-white/10 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-6 right-6 p-2 text-text-dim hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-black text-white mb-6">Create Playlist</h2>
            <form onSubmit={handleCreate}>
              <input 
                type="text" 
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="e.g. My Awesome Playlist"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-accent mb-8 transition-colors"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-text-dim hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={!newPlaylistName.trim()} className="px-8 py-3 bg-accent text-black font-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-accent/20">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
