import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Play, Pause, Trash2, Music2, Search as SearchIcon, ListMusic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore, Track } from '../store/usePlayerStore';
import { offlineService } from '../lib/offlineService';
import { cn } from '../lib/utils';

export const OfflineTracks = () => {
  const navigate = useNavigate();
  const { downloadedIds, playTrack, currentTrack, isPlaying, toggleDownload, playlists } = usePlayerStore();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadTracks = async () => {
      setLoading(true);
      const allTracks: Track[] = [];
      for (const id of downloadedIds) {
        const t = await offlineService.getTrack(id);
        if (t) {
          allTracks.push({
            id: t.videoId,
            videoId: t.videoId,
            ...t.metadata,
            url: '' // Not used for offline
          });
        }
      }
      setTracks(allTracks.sort((a, b) => a.title.localeCompare(b.title)));
      setLoading(false);
    };
    loadTracks();
  }, [downloadedIds]);

  const { groupedPlaylists, orphanTracks } = useMemo(() => {
    const downloadedSet = new Set(downloadedIds);
    const fullyDownloadedPlaylists = playlists.filter(p => 
      p.tracks.length > 0 && p.tracks.every(t => downloadedSet.has(t.videoId))
    );

    const tracksInFullPlaylists = new Set(
      fullyDownloadedPlaylists.flatMap(p => p.tracks.map(t => t.videoId))
    );

    const orphans = tracks.filter(t => !tracksInFullPlaylists.has(t.videoId));

    return {
      groupedPlaylists: fullyDownloadedPlaylists,
      orphanTracks: orphans
    };
  }, [tracks, downloadedIds, playlists]);

  const filteredPlaylists = groupedPlaylists.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrphans = orphanTracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.artist.toLowerCase().includes(search.toLowerCase())
  );

  const handlePlayPlaylist = (p: any) => {
    if (p.tracks.length > 0) {
      playTrack(p.tracks[0], p.tracks);
    }
  };

  return (
    <div className="flex-1 bg-bg-main overflow-y-auto custom-scrollbar pb-36">
      <div className="px-6 md:px-10 py-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-dim hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm">Back</span>
        </button>

        <header className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">Downloaded Music</h1>
          <p className="text-text-dim font-medium">Available offline • {tracks.length} tracks</p>
        </header>

        <div className="relative mb-8 max-w-md">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input 
            type="text"
            placeholder="Search in downloads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 outline-none focus:border-accent/40 transition-all text-sm"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
             <div className="w-10 h-10 border-2 border-white/10 border-t-accent rounded-full animate-spin mb-4" />
             <p className="text-text-dim font-bold">Loading local library...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="bg-white/3 rounded-[32px] border border-white/5 p-16 text-center">
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Music2 className="text-white/20 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No downloads yet</h3>
            <p className="text-text-dim text-sm max-w-xs mx-auto mb-8 font-medium">Download your favorite tracks to listen without internet connection.</p>
            <button onClick={() => navigate('/')} className="px-10 py-4 bg-accent text-black font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-accent/20">
              Find music to download
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredPlaylists.length > 0 && (
              <section>
                <h2 className="text-sm font-black text-text-dim uppercase tracking-widest mb-4 px-2">Downloaded Playlists</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlaylists.map(playlist => (
                    <div 
                      key={playlist.id}
                      onClick={() => handlePlayPlaylist(playlist)}
                      className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0 shadow-lg">
                        <ListMusic className="w-8 h-8 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{playlist.name}</p>
                        <p className="text-xs text-text-dim mt-1 font-medium">{playlist.tracks.length} tracks • Offline</p>
                      </div>
                      <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <Play className="w-5 h-5 text-black fill-current translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-sm font-black text-text-dim uppercase tracking-widest mb-4 px-2">
                {filteredPlaylists.length > 0 ? 'Individual Tracks' : 'Tracks'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrphans.map((track) => {
                  const isActive = currentTrack?.videoId === track.videoId;
                  return (
                    <div 
                      key={track.videoId}
                      onClick={() => playTrack(track, tracks)}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-2xl border transition-all cursor-pointer group",
                        isActive ? "bg-accent/10 border-accent/30" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                      )}
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-md">
                        <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                        {isActive && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {isPlaying ? <Pause className="w-5 h-5 text-accent fill-current" /> : <Play className="w-5 h-5 text-accent fill-current" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-bold truncate", isActive ? "text-accent" : "text-white")}>{track.title}</p>
                        <p className="text-xs text-text-dim truncate mt-0.5">{track.artist}</p>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleDownload(track); }}
                        className="p-2 text-text-dim hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove download"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};
