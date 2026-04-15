import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Play, Pause, Shuffle, MoreHorizontal, Trash2, Loader2, Zap, ListMusic } from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { TrackDropdown } from '../components/Search';
import { cn } from '../lib/utils';

export const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playlists, playTrack, currentTrack, isPlaying, togglePause, removeTrackFromPlaylist } = usePlayerStore();
  const [mixTracks, setMixTracks] = useState<Track[]>([]);
  const [mixLoading, setMixLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  React.useEffect(() => {
    const h = () => setActiveDropdown(null);
    window.addEventListener('click', h);
    return () => window.removeEventListener('click', h);
  }, []);

  const isMix = id === 'mix';

  const playlist = isMix
    ? { id: 'mix', name: 'Your Mix', tracks: mixTracks }
    : playlists.find((pl) => pl.id === id);

  useEffect(() => {
    if (!isMix) return;
    setMixLoading(true);
    fetch('/api/mix', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => { setMixTracks(Array.isArray(data) ? data : []); setMixLoading(false); })
      .catch(() => setMixLoading(false));
  }, [isMix]);

  if (!isMix && !playlist) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4">
        <ListMusic className="w-16 h-16 text-white/20" />
        <p className="text-text-dim font-bold">Playlist not found</p>
        <button onClick={() => navigate('/playlists')} className="text-accent font-bold hover:underline">Back to Playlists</button>
      </div>
    );
  }

  const tracks = playlist?.tracks ?? [];
  const cover = isMix ? null : tracks[0]?.thumbnail;

  const playAll = () => { if (tracks.length > 0) playTrack(tracks[0]); };
  const playShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-bg-main to-black pb-36">
      {/* Hero */}
      <div className="relative px-10 py-12 flex items-end gap-8">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-bg-main pointer-events-none" />
        <button
          onClick={() => navigate('/playlists')}
          className="absolute top-6 left-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Cover */}
        <div className="w-52 h-52 rounded-[32px] overflow-hidden shadow-2xl shrink-0 relative z-10">
          {isMix ? (
            <div className="w-full h-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center">
              <Zap className="w-24 h-24 text-black/70" />
            </div>
          ) : cover ? (
            <img src={cover} alt={playlist?.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/5 flex items-center justify-center">
              <ListMusic className="w-24 h-24 text-text-dim" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="relative z-10 pb-2">
          <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">
            {isMix ? 'Auto Mix' : 'Playlist'}
          </span>
          <h1 className="text-5xl font-black text-white mt-2 tracking-tighter">{playlist?.name}</h1>
          <p className="text-text-dim text-sm mt-3 font-medium">
            {mixLoading ? 'Generating your mix...' : `${tracks.length} songs`}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-10 py-6 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={playAll}
          disabled={tracks.length === 0}
          className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
        >
          <Play className="w-7 h-7 fill-current ml-0.5" />
        </button>
        <button
          onClick={playShuffle}
          disabled={tracks.length === 0}
          className="p-3 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all disabled:opacity-40"
        >
          <Shuffle className="w-6 h-6" />
        </button>
      </div>

      {/* Track list */}
      <div className="px-10 py-4">
        {mixLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="ml-3 text-text-dim font-medium">Building your mix...</span>
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-20 text-text-dim">
            <ListMusic className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-bold text-white/50">
              {isMix ? 'Listen to some music first to generate your mix' : 'No songs in this playlist yet'}
            </p>
            {!isMix && (
              <p className="text-sm mt-1">Search for songs and add them here</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => isActive ? togglePause() : playTrack(track)}
                  className={cn(
                    'grid gap-4 px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all',
                    isMix
                      ? 'grid-cols-[40px_1fr_80px_40px]'
                      : 'grid-cols-[40px_1fr_80px_40px_40px]',
                    isActive ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/5 border border-transparent'
                  )}
                >
                  <div className="flex items-center justify-center">
                    {isActive && isPlaying ? (
                      <div className="flex gap-[2px] items-end h-4">
                        {[1,2,3].map((i) => (
                          <div key={i} className="w-[3px] bg-accent rounded-full animate-bounce" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className={cn('text-xs font-medium text-text-dim group-hover:hidden', isActive && 'hidden')}>{index + 1}</span>
                        <div className={cn('hidden group-hover:flex items-center', isActive && 'flex')}>
                          {isActive ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 min-w-0">
                    <img src={track.thumbnail} className="w-10 h-10 rounded-xl object-cover shadow-lg shrink-0" alt="" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
                      <p className="text-xs text-text-dim font-medium truncate">{track.artist}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-mono text-center">{track.duration}</span>

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === track.id ? null : track.id)}
                      className="text-text-dim hover:text-white p-1.5 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {activeDropdown === track.id && <TrackDropdown track={track} onClose={() => setActiveDropdown(null)} />}
                  </div>

                  {!isMix && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeTrackFromPlaylist(id!, track.videoId); }}
                      className="text-text-dim hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
