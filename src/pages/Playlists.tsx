import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ListMusic, Play, X, Zap, Trash2, Download, Youtube } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const Playlists = () => {
  const navigate = useNavigate();
  const { playlists, createPlaylist, deletePlaylist, importPlaylist } = usePlayerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsModalOpen(false);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setIsImporting(true);
    setImportError('');
    try {
      await importPlaylist(importUrl.trim());
      setImportUrl('');
      setIsImportModalOpen(false);
    } catch (err: any) {
      setImportError(err.message || 'Failed to import. Is the playlist public?');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar relative pb-36">
      <div className="px-4 md:px-10 py-8 md:py-12">
        <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 md:gap-8 mb-10 md:mb-12">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-500 to-accent rounded-[28px] md:rounded-[32px] flex items-center justify-center shadow-2xl shadow-accent/20 md:rotate-3 shrink-0">
              <ListMusic className="w-10 h-10 md:w-12 md:h-12 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter truncate">Playlists</h1>
              <p className="text-text-dim text-xs md:text-sm mt-1 font-medium italic hidden sm:block">"Your life, your soundtrack."</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 md:py-4 bg-white/5 hover:bg-white/10 text-white font-bold text-sm rounded-2xl transition-all border border-white/10"
            >
              <Download className="w-5 h-5 text-accent" /> Import from YT
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 md:py-4 bg-white text-bg-main font-black text-sm rounded-2xl hover:scale-105 transition-transform shadow-2xl"
            >
              <Plus className="w-5 h-5" /> New Playlist
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
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

      {/* Manual Create Modal */}
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

      {/* YouTube Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-bg-sidebar border border-white/10 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setIsImportModalOpen(false)} title="Close" className="absolute top-6 right-6 p-2 text-text-dim hover:text-white hover:bg-white/10 rounded-full transition-all">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
               <Youtube className="w-8 h-8 text-red-500" />
               <h2 className="text-2xl font-black text-white">Import from YT</h2>
            </div>
            <p className="text-text-dim text-sm mb-6 font-medium">Paste a YouTube Playlist URL to import up to 100 songs.</p>
            
            <form onSubmit={handleImport}>
              <input
                type="url" value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://www.youtube.com/playlist?list=..."
                autoFocus aria-label="YouTube Playlist URL"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none focus:border-accent mb-2 transition-colors placeholder:text-text-dim/40"
              />
              
              {importError && (
                <p className="text-red-400 text-xs font-bold mb-6 mt-1 flex items-center gap-1">
                   <X className="w-3 h-3" /> {importError}
                </p>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsImportModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-text-dim hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button 
                  type="submit" 
                  disabled={!importUrl.trim() || isImporting} 
                  className={`px-8 py-3 bg-red-600 text-white font-black rounded-xl hover:scale-105 transition-all shadow-xl shadow-red-600/20 flex items-center gap-2 ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isImporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
