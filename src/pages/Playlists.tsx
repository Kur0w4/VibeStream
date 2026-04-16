import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListMusic, Play, X, Zap, Trash2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const Playlists = () => {
  const navigate = useNavigate();
  const { playlists, createPlaylist, deletePlaylist } = usePlayerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar relative pb-36">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Your Mix — always first */}
          <div
            onClick={() => navigate('/playlists/mix')}
            className="group bg-gradient-to-br from-accent/20 to-blue-500/20 hover:from-accent/30 hover:to-blue-500/30 rounded-[28px] border border-accent/20 p-5 transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className="relative aspect-square rounded-[20px] overflow-hidden mb-5 shadow-2xl bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <Zap className="w-20 h-20 text-black/70" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-14 h-14 text-white fill-white drop-shadow-xl" />
              </div>
            </div>
            <h3 className="text-lg font-black text-white group-hover:text-accent transition-colors tracking-tight">Your Mix</h3>
            <p className="text-xs text-text-dim font-bold mt-1">Auto-generated • Personalized</p>
          </div>

          {/* User playlists */}
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => navigate(`/playlists/${pl.id}`)}
              className="group bg-white/5 hover:bg-white/10 rounded-[28px] border border-white/5 hover:border-white/10 p-5 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              <div className="relative aspect-square rounded-[20px] overflow-hidden mb-5 shadow-xl bg-white/5 flex items-center justify-center">
                {pl.tracks.length > 0 ? (
                  <img src={pl.tracks[0].thumbnail} alt={pl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ListMusic className="w-16 h-16 text-text-dim" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-14 h-14 text-white fill-white drop-shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white group-hover:text-accent transition-colors tracking-tight line-clamp-1">{pl.name}</h3>
                  <p className="text-xs text-text-dim font-bold mt-0.5 uppercase tracking-widest">{pl.tracks.length} tracks</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deletePlaylist(pl.id); }}
                  className="p-1.5 text-text-dim hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                  title="Delete playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {playlists.length === 0 && (
            <div className="col-span-full text-center py-16 text-text-dim">
              <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="font-bold text-lg text-white/50">No playlists yet</p>
              <p className="text-sm mt-1">Create your first playlist to get started</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-bg-sidebar border border-white/10 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} title="Close" className="absolute top-6 right-6 p-2 text-text-dim hover:text-white hover:bg-white/10 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-3xl font-black text-white mb-6">New Playlist</h2>
            <form onSubmit={handleCreate}>
              <input
                type="text" value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My awesome playlist..."
                autoFocus aria-label="Playlist name"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-accent mb-8 transition-colors placeholder:text-text-dim/40"
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-text-dim hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={!newPlaylistName.trim()} className="px-8 py-3 bg-accent text-black font-black rounded-xl hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-xl shadow-accent/20">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
