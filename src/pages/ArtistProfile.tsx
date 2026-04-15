import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Mic2, Play, Pause, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { cn } from '../lib/utils';

export const ArtistProfile = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { playTrack, currentTrack, isPlaying, togglePause, followArtist, unfollowArtist, followedArtists } = usePlayerStore();

  const artistName = name ? decodeURIComponent(name) : '';
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbnail, setThumbnail] = useState('');

  const isFollowed = followedArtists.some((a) => a.name === artistName);

  useEffect(() => {
    if (!artistName) return;
    setLoading(true);
    fetch(`/api/artist/${encodeURIComponent(artistName)}/tracks`)
      .then((r) => r.json())
      .then((data: Track[]) => {
        setTracks(data);
        if (data.length > 0 && !thumbnail) setThumbnail(data[0].thumbnail);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [artistName]);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-gradient-to-b from-bg-main to-black pb-36">
      {/* Hero */}
      <div className="relative h-72 px-10 flex flex-col justify-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-bg-main z-10" />
        {thumbnail && (
          <img src={thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-20 scale-110 blur-sm" alt="" />
        )}

        <button
          onClick={() => navigate('/artists')}
          className="absolute top-6 left-6 z-20 p-2.5 bg-black/40 hover:bg-black/60 rounded-full transition-all text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative z-20 flex items-end gap-6 pb-6">
          <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl shrink-0">
            {thumbnail ? (
              <img src={thumbnail} className="w-full h-full object-cover" alt={artistName} />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <Mic2 className="w-14 h-14 text-text-dim" />
              </div>
            )}
          </div>
          <div>
            <span className="text-[10px] font-black text-accent uppercase tracking-[0.3em]">Artist</span>
            <h1 className="text-4xl font-black text-white tracking-tighter mt-1">{artistName}</h1>
            <p className="text-text-dim text-sm mt-1">{tracks.length} songs loaded</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-10 py-5 flex items-center gap-4 border-b border-white/5">
        <button
          onClick={() => tracks.length > 0 && playTrack(tracks[0])}
          disabled={tracks.length === 0}
          className="w-14 h-14 bg-accent text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 disabled:opacity-40"
        >
          <Play className="w-7 h-7 fill-current ml-0.5" />
        </button>

        <button
          onClick={() => {
            const artist = { name: artistName, thumbnail };
            isFollowed ? unfollowArtist(artistName) : followArtist(artist);
          }}
          className={cn(
            'flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold border transition-all',
            isFollowed
              ? 'bg-accent/10 border-accent/30 text-accent hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
              : 'bg-white/5 border-white/10 text-white hover:bg-white hover:text-bg-main'
          )}
        >
          {isFollowed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {isFollowed ? 'Following' : 'Follow'}
        </button>
      </div>

      {/* Tracks */}
      <div className="px-10 py-6">
        <h2 className="text-xl font-black text-white mb-5 tracking-tight">Songs</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <span className="ml-3 text-text-dim">Loading songs...</span>
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-text-dim py-16">No songs found for this artist</p>
        ) : (
          <div className="space-y-1">
            {tracks.map((track, index) => {
              const isActive = currentTrack?.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => isActive ? togglePause() : playTrack(track)}
                  className={cn(
                    'grid grid-cols-[40px_1fr_80px] gap-4 px-4 py-3 rounded-2xl items-center group cursor-pointer transition-all',
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
                        <div className={cn('hidden group-hover:flex', isActive && 'flex')}>
                          {isActive ? <Pause className="w-4 h-4 text-accent fill-current" /> : <Play className="w-4 h-4 text-accent fill-current" />}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-4 min-w-0">
                    <img src={track.thumbnail} className="w-11 h-11 rounded-xl object-cover shadow-lg shrink-0" alt="" />
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', isActive ? 'text-accent' : 'text-white')}>{track.title}</p>
                      <p className="text-xs text-text-dim font-medium truncate">{track.duration}</p>
                    </div>
                  </div>

                  <span className="text-xs text-text-dim font-mono text-right">{track.duration}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
