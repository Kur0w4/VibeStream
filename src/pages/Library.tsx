import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library as LibraryIcon, ListMusic, Mic2, Disc, Play, Plus, Clock, X, ArrowRight, Heart, MoreHorizontal } from 'lucide-react';
import { TrackDropdown } from '../components/Search';
import { usePlayerStore } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export const Library = () => {
  const navigate = useNavigate();
  const {
    playlists, likedSongs, followedArtists, listeningHistory,
    playTrack, currentTrack, isPlaying, createPlaylist, toggleLike
  } = usePlayerStore();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreateModal(false);
    navigate('/playlists');
  };

  const categories = [
    { icon: ListMusic, title: 'Playlists', count: playlists?.length ?? 0, to: '/playlists', color: 'from-purple-500/20 to-accent/10', iconColor: 'text-purple-400' },
    { icon: Mic2, title: 'Artists', count: followedArtists?.length ?? 0, to: '/artists', color: 'from-pink-500/20 to-rose-500/10', iconColor: 'text-pink-400' },
    { icon: Disc, title: 'Liked Songs', count: likedSongs?.length ?? 0, to: '/liked-songs', color: 'from-rose-500/20 to-red-500/10', iconColor: 'text-rose-400' },
    { icon: LibraryIcon, title: 'History', count: listeningHistory?.length ?? 0, to: '/library/history', color: 'from-blue-500/20 to-cyan-500/10', iconColor: 'text-blue-400' },
  ];

  return (
    <div className="flex-1 bg-gradient-to-b from-bg-main to-black overflow-y-auto custom-scrollbar pb-36 px-0">
      <div className="px-6 md:px-10 py-10 md:py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">Your Library</h1>
            <p className="text-text-dim text-sm mt-2 font-medium">Your personal music collection</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold text-sm rounded-2xl hover:opacity-90 shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95 w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Create Playlist
          </button>
        </header>

        {/* Category cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-14">
          {categories.map(({ icon: Icon, title, count, to, color, iconColor }) => (
            <button
              key={title}
              onClick={() => navigate(to)}
              className={cn(
                'bg-gradient-to-br border border-white/5 p-6 rounded-[28px] text-left transition-all cursor-pointer group hover:scale-[1.02] hover:border-white/10 active:scale-[0.98]',
                color
              )}
            >
              <div className="w-14 h-14 bg-black/30 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Icon className={cn('w-7 h-7', iconColor)} />
              </div>
              <h3 className="text-lg font-black text-white mb-0.5 tracking-tight">{title}</h3>
              <p className="text-text-dim text-xs font-bold uppercase tracking-widest">{count} items</p>
              <div className="flex items-center gap-1 mt-4 text-text-dim group-hover:text-white transition-colors">
                <span className="text-xs font-bold">View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>

        {/* Recent Activity */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" /> Recent Activity
            </h2>
            {listeningHistory.length > 9 && (
              <button
                onClick={() => navigate('/library/history')}
                className="text-sm text-accent font-bold hover:underline underline-offset-4 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(!listeningHistory || listeningHistory.length === 0) ? (
            <div className="bg-white/3 rounded-[28px] border border-white/5 p-12 text-center">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <LibraryIcon className="text-white/20 w-7 h-7" />
              </div>
              <p className="text-text-main font-bold text-lg mb-2">No recent activity</p>
              <p className="text-text-dim text-sm max-w-xs mx-auto mb-6 font-medium">Start listening to build your history</p>
              <button onClick={() => navigate('/')} className="px-8 py-3 bg-accent text-black font-black text-sm rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-accent/20">
                Explore music
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {listeningHistory.slice(0, 9).map((track, index) => {
                const isActive = currentTrack?.id === track.id;
                const isLiked = likedSongs?.some(t => t.id === track.id);
                return (
                  <div
                    key={`${track.id}-${index}`}
                    onClick={() => playTrack(track, listeningHistory)}
                    className={cn(
                      'flex items-center gap-3 border p-3 rounded-2xl cursor-pointer transition-all group hover:scale-[1.01] relative',
                      isActive
                        ? 'bg-accent/10 border-accent/20'
                        : 'bg-white/4 hover:bg-white/8 border-white/5 hover:border-white/10',
                      activeDropdown === track.id ? 'z-50' : ''
                    )}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden relative shadow-md shrink-0 bg-white/5">
                      <img 
                        src={track.thumbnail} 
                        alt={track.title} 
                        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                        className="w-full h-full object-cover opacity-0 transition-opacity duration-500" 
                      />
                      <div className={cn('absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center', isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                        {isActive && isPlaying ? (
                           <div className="flex gap-[2px] items-end h-3">
                              <div className="w-[2px] h-3 bg-white animate-bounce" />
                              <div className="w-[2px] h-2 bg-white animate-bounce" {...({ style: { '--delay': '0.1s' } as React.CSSProperties })} />
                              <div className="w-[2px] h-3 bg-white animate-bounce" {...({ style: { '--delay': '0.2s' } as React.CSSProperties })} />
                           </div>
                        ) : (
                          <Play className="w-5 h-5 text-white fill-white" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={cn('text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>
                        {track.title}
                      </h3>
                      <p className="text-xs text-text-dim font-medium truncate mt-0.5">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-2">
                       <button
                         onClick={(e) => { e.stopPropagation(); toggleLike(track); }}
                         title={isLiked ? "Unlike" : "Like"}
                         className={cn('p-1.5 rounded-full transition-all hover:scale-110 opacity-100', isLiked ? '' : '')}
                       >
                         <Heart className={cn('w-4 h-4', isLiked ? 'fill-rose-500 text-rose-500' : 'text-text-dim hover:text-white')} />
                       </button>

                       <div className="relative" onClick={(e) => e.stopPropagation()}>
                         <button
                           onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                           title="More options"
                           className="p-1.5 text-text-dim hover:text-white hover:bg-white/10 rounded-lg opacity-100 transition-all"
                         >
                           <MoreHorizontal className="w-4 h-4" />
                         </button>
                         {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-bg-sidebar border border-white/10 rounded-[32px] p-8 w-full max-w-md relative shadow-2xl">
            <button onClick={() => setShowCreateModal(false)} title="Close" className="absolute top-6 right-6 p-2 text-text-dim hover:text-white hover:bg-white/10 rounded-full transition-all">
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-6 py-3 rounded-xl font-bold text-text-dim hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={!newPlaylistName.trim()} className="px-8 py-3 bg-accent text-black font-black rounded-xl hover:scale-105 transition-transform disabled:opacity-40 disabled:hover:scale-100 shadow-xl shadow-accent/20">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
