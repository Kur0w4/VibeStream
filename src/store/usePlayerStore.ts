import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  url: string;
}

export interface User {
  id: number;
  username: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isExpanded: boolean;

  // Queue
  queue: Track[];

  // Auth
  user: User | null;

  // User Data
  playlists: { id: string; name: string; tracks: Track[] }[];
  likedSongs: Track[];
  followedArtists: { name: string; thumbnail: string }[];
  listeningHistory: Track[];

  // Player actions
  playTrack: (track: Track) => void;
  togglePause: () => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  setIsExpanded: (v: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;

  // Queue actions
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void; // consume first item from queue

  // Auth actions
  login: (user: User) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
  syncFromServer: () => Promise<void>;

  // Data actions
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  toggleLike: (track: Track) => Promise<void>;
  followArtist: (artist: { name: string; thumbnail: string }) => Promise<void>;
  unfollowArtist: (name: string) => Promise<void>;
  addToHistory: (track: Track) => Promise<void>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(url: string, opts?: RequestInit) {
  const r = await fetch(url, { credentials: 'include', ...opts });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.7,
      progress: 0,
      duration: 0,
      isExpanded: false,
      queue: [],
      user: null,
      playlists: [],
      likedSongs: [],
      followedArtists: [],
      listeningHistory: [],

      // ── Player ──────────────────────────────────────────────────────────────────
      playTrack: (track) => {
        set({ currentTrack: track, isPlaying: true, progress: 0 });
        get().addToHistory(track);
      },
      togglePause: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setIsExpanded: (isExpanded) => set({ isExpanded }),

      // ── Queue ────────────────────────────────────────────────────────────────
      addToQueue: (track) =>
        set((s) => {
          // Don’t add duplicates
          if (s.queue.some((t) => t.id === track.id)) return s;
          return { queue: [...s.queue, track] };
        }),
      removeFromQueue: (index) =>
        set((s) => ({ queue: s.queue.filter((_, i) => i !== index) })),
      clearQueue: () => set({ queue: [] }),
      playNext: () => {
        const { queue } = get();
        if (queue.length === 0) return;
        const [next, ...rest] = queue;
        set({ queue: rest, currentTrack: next, isPlaying: true, progress: 0 });
        get().addToHistory(next);
      },
      nextTrack: () => get().playNext(),
      prevTrack: () => {},

      // ── Auth ─────────────────────────────────────────────────────────────────
      login: (user) => {
        set({ user });
        get().syncFromServer();
      },
      logout: async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        set({ user: null, playlists: [], likedSongs: [], followedArtists: [], listeningHistory: [] });
      },
      initAuth: async () => {
        try {
          const user = await apiFetch('/api/auth/me');
          if (user) {
            set({ user });
            await get().syncFromServer();
          }
        } catch {}
      },
      syncFromServer: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const [liked, playlists, history, artists] = await Promise.all([
            apiFetch('/api/liked'),
            apiFetch('/api/playlists'),
            apiFetch('/api/history'),
            apiFetch('/api/artists/followed'),
          ]);
          set({
            likedSongs: liked,
            playlists,
            listeningHistory: history,
            followedArtists: artists,
          });
        } catch {}
      },

      // ── Playlists ────────────────────────────────────────────────────────────
      createPlaylist: async (name) => {
        const { user, playlists } = get();
        if (user) {
          const pl = await apiFetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
          set({ playlists: [pl, ...playlists] });
        } else {
          const pl = { id: Math.random().toString(36).substr(2, 9), name, tracks: [] };
          set({ playlists: [pl, ...playlists] });
        }
      },
      deletePlaylist: async (id) => {
        const { user } = get();
        if (user) await apiFetch(`/api/playlists/${id}`, { method: 'DELETE' });
        set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) }));
      },
      addTrackToPlaylist: async (playlistId, track) => {
        const { user } = get();
        if (user) {
          await apiFetch(`/api/playlists/${playlistId}/tracks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) });
        }
        set((s) => ({
          playlists: s.playlists.map((pl) =>
            pl.id === playlistId && !pl.tracks.some((t) => t.id === track.id)
              ? { ...pl, tracks: [...pl.tracks, track] }
              : pl
          ),
        }));
      },
      removeTrackFromPlaylist: async (playlistId, videoId) => {
        const { user } = get();
        if (user) await apiFetch(`/api/playlists/${playlistId}/tracks/${videoId}`, { method: 'DELETE' });
        set((s) => ({
          playlists: s.playlists.map((pl) =>
            pl.id === playlistId ? { ...pl, tracks: pl.tracks.filter((t) => t.id !== videoId) } : pl
          ),
        }));
      },

      // ── Liked Songs ──────────────────────────────────────────────────────────
      toggleLike: async (track) => {
        const { user, likedSongs } = get();
        const isLiked = likedSongs.some((t) => t.id === track.id);
        if (user) {
          if (isLiked) await apiFetch(`/api/liked/${track.videoId}`, { method: 'DELETE' });
          else await apiFetch('/api/liked', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) });
        }
        set((s) => ({
          likedSongs: isLiked
            ? s.likedSongs.filter((t) => t.id !== track.id)
            : [track, ...s.likedSongs],
        }));
      },

      // ── Artists ──────────────────────────────────────────────────────────────
      followArtist: async (artist) => {
        const { user } = get();
        if (user) {
          await apiFetch('/api/artists/follow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(artist) });
        }
        set((s) => {
          if (s.followedArtists.some((a) => a.name === artist.name)) return s;
          return { followedArtists: [artist, ...s.followedArtists] };
        });
      },
      unfollowArtist: async (name) => {
        const { user } = get();
        if (user) await apiFetch(`/api/artists/follow/${encodeURIComponent(name)}`, { method: 'DELETE' });
        set((s) => ({ followedArtists: s.followedArtists.filter((a) => a.name !== name) }));
      },

      // ── History ──────────────────────────────────────────────────────────────
      addToHistory: async (track) => {
        const { user } = get();
        if (user) {
          fetch('/api/history', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(track) }).catch(() => {});
        }
        set((s) => {
          const hist = s.listeningHistory.filter((t) => t.id !== track.id);
          hist.unshift(track);
          return { listeningHistory: hist.slice(0, 100) };
        });
      },


    }),
    {
      name: 'vibestream-v2',
      partialize: (s) => ({
        volume: s.volume,
        // Guest data (no account)
        playlists: s.user ? [] : s.playlists,
        likedSongs: s.user ? [] : s.likedSongs,
        followedArtists: s.user ? [] : s.followedArtists,
        listeningHistory: s.user ? [] : s.listeningHistory,
      }),
    }
  )
);
