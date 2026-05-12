import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Firebase Auth Singleton ─────────────────────────────────────────────────
// Imported once at module level to avoid repeated dynamic import resolution
// on every single API call (which was the previous behavior in apiFetch).
let _authInstance: any = null;
async function getAuth() {
  if (_authInstance) return _authInstance;
  const { auth } = await import('../lib/firebase');
  _authInstance = auth;
  return auth;
}

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
  id: string | number;
  username: string;
  email?: string;
  avatar?: string;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isExpanded: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  seekTrigger: number; // Increment this to force a seek to start

  // Context & Queue
  playbackContext: Track[] | null;
  contextIndex: number;
  queue: Track[];

  // Auth
  user: User | null;

  // User Data
  playlists: { id: string; name: string; tracks: Track[] }[];
  likedSongs: Track[];
  followedArtists: { name: string; thumbnail: string }[];
  listeningHistory: Track[];

  // Player actions
  playTrack: (track: Track, context?: Track[]) => void;
  togglePause: () => void;
  setIsPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  setIsExpanded: (v: boolean) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  nextTrack: () => void;
  prevTrack: () => void;

  // Queue actions
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void; // consume first item from queue

  // Auth actions
  login: (user: User) => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
  syncFromServer: () => Promise<void>;
  clearHistory: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;

  // Data actions
  createPlaylist: (name: string) => Promise<void>;
  importPlaylist: (url: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, videoId: string) => Promise<void>;
  toggleLike: (track: Track) => Promise<void>;
  followArtist: (artist: { name: string; thumbnail: string }) => Promise<void>;
  unfollowArtist: (name: string) => Promise<void>;
  addToHistory: (track: Track) => Promise<void>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
// ─── API configuration ────────────────────────────────────────────────────────
// IMPORTANT: For mobile apps, you MUST set a full URL (e.g., https://your-server.com)
// Relative paths (/api/...) will only work if the web app and server share the same origin.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function apiFetch(url: string, opts?: RequestInit) {
  const headers: Record<string, string> = { ...((opts?.headers as any) || {}) };
  
  // 1. Try to get local JWT first (native-friendly)
  const localToken = localStorage.getItem('vibestream_token');
  if (localToken) {
    headers['Authorization'] = `Bearer ${localToken}`;
  } else {
    // 2. Fallback to Firebase token if logged in but no local token yet
    const auth = await getAuth();
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const finalUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
  
  if (import.meta.env.DEV) {
    console.log(`[apiFetch] Request: ${opts?.method || 'GET'} ${finalUrl}`);
  }

  try {
    const r = await fetch(finalUrl, { 
      ...opts,
      headers
    });
    if (!r.ok) {
      const errorText = await r.text();
      console.warn(`[apiFetch] ${opts?.method || 'GET'} ${url} → ${r.status}:`, errorText);
      throw new Error(errorText);
    }
    return r.json();
  } catch (err) {
    console.error(`[apiFetch] Request failed: ${url}`, err);
    throw err;
  }
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
      isShuffle: false,
      repeatMode: 'off',
      seekTrigger: 0,
      playbackContext: null as Track[] | null,
      contextIndex: -1,
      queue: [] as Track[],
      user: null as User | null,
      playlists: [] as { id: string; name: string; tracks: Track[] }[],
      likedSongs: [] as Track[],
      followedArtists: [] as { name: string; thumbnail: string }[],
      listeningHistory: [] as Track[],

      // ── Player ──────────────────────────────────────────────────────────────────
      playTrack: (track, context) => {
        let updates: any = { currentTrack: track, isPlaying: true, progress: 0 };
        if (context) {
          const idx = context.findIndex((t) => t.id === track.id);
          updates = { ...updates, playbackContext: context, contextIndex: idx >= 0 ? idx : 0 };
        } else {
          // If a single track is explicitly played, wipe existing context
          updates = { ...updates, playbackContext: null, contextIndex: -1 };
        }
        set(updates);
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
        if (queue.length > 0) {
          const [next, ...rest] = queue;
          set({ queue: rest, currentTrack: next, isPlaying: true, progress: 0 });
          get().addToHistory(next);
        } else {
          get().nextTrack(); // use intelligent nextTrack
        }
      },
      toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
      toggleRepeat: () => set((s) => ({
        repeatMode: s.repeatMode === 'off' ? 'all' : s.repeatMode === 'all' ? 'one' : 'off'
      })),
      nextTrack: () => {
        const { queue, playbackContext, contextIndex, repeatMode, isShuffle, currentTrack } = get();
        
        // 1. Queue supersedes everything
        if (queue.length > 0) {
          const [next, ...rest] = queue;
          set({ queue: rest, currentTrack: next, isPlaying: true, progress: 0 });
          get().addToHistory(next);
          return;
        }

        // 2. Playback Context (Playlists / Albums)
        if (playbackContext && playbackContext.length > 0) {
           let nextIdx = contextIndex + 1;
           if (nextIdx >= playbackContext.length) {
              if (repeatMode === 'all') {
                nextIdx = 0;
              } else {
                // End of context, no repeat
                set({ isPlaying: false, progress: 0 });
                return;
              }
           }
           const next = playbackContext[nextIdx];
           set({ currentTrack: next, contextIndex: nextIdx, isPlaying: true, progress: 0 });
           get().addToHistory(next);
           return;
        }

        // 3. Auto-Shuffle random fallback for lonely songs
        if (isShuffle && currentTrack?.artist) {
            fetch('/api/search?q=' + encodeURIComponent(currentTrack.artist + ' song'))
              .then(r => r.json())
              .then((results: Track[]) => {
                 if (results && results.length > 0) {
                    const pool = results.filter(t => t.id !== currentTrack.id);
                    if (pool.length > 0) {
                      const next = pool[Math.floor(Math.random() * pool.length)];
                      set({ currentTrack: next, isPlaying: true, progress: 0 });
                      get().addToHistory(next);
                    }
                 }
              }).catch(() => { set({ isPlaying: false }); });
            return;
        }

        // 4. Default: Stop playing
        set({ isPlaying: false, progress: 0 });
      },
      prevTrack: () => {
        const { progress, playbackContext, contextIndex, repeatMode } = get();
        // If > 3 seconds, rewind to start
        if (progress > 0.02) { 
           set({ progress: 0, seekTrigger: Date.now() });
           return;
        }
        
        // Else go back in context
        if (playbackContext && playbackContext.length > 0) {
           let prevIdx = contextIndex - 1;
           if (prevIdx < 0) {
              if (repeatMode === 'all') {
                prevIdx = playbackContext.length - 1;
              } else {
                prevIdx = 0;
              }
           }
           const prev = playbackContext[prevIdx];
           set({ currentTrack: prev, contextIndex: prevIdx, isPlaying: true, progress: 0 });
           get().addToHistory(prev);
        }
      },

      // ── Auth ─────────────────────────────────────────────────────────────────
      login: (userData: any) => {
        // userData can be { user, token }
        const { user, token } = userData;
        if (token) localStorage.setItem('vibestream_token', token);
        set({ user });
        get().syncFromServer();
      },
      loginWithGoogle: async () => {
        try {
          const { auth, googleProvider } = await import('../lib/firebase');
          const { signInWithPopup } = await import('firebase/auth');
          const result = await signInWithPopup(auth, googleProvider);
          const fUser = result.user;
          const fToken = await fUser.getIdToken();
          
          // Exchange Firebase token for our JWT
          const { user, token } = await apiFetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: fToken })
          });
          
          if (token) localStorage.setItem('vibestream_token', token);
          set({ user });
          await get().syncFromServer();
        } catch (err) {
          console.error('[Auth] Google Login failed:', err);
          throw err;
        }
      },
      clearHistory: async () => {
        try {
          await apiFetch('/api/history', { method: 'DELETE' });
          set({ listeningHistory: [] });
        } catch (err) {
          console.error('[Auth] Clear History failed:', err);
        }
      },
      updateUsername: async (username: string) => {
        try {
          const res = await apiFetch('/api/auth/me', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
          });
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, username: res.username } });
          }
        } catch (err: any) {
          console.error('[Auth] Update Username failed:', err);
          throw err;
        }
      },
      logout: async () => {
        localStorage.removeItem('vibestream_token');
        set({ user: null, playlists: [], likedSongs: [], followedArtists: [], listeningHistory: [] });
      },
      initAuth: async () => {
        const { auth } = await import('../lib/firebase');
        
        // 1. FAST CACHE: If we already have a user and token, sync immediately
        if (get().user && localStorage.getItem('vibestream_token')) {
          get().syncFromServer().catch(() => {});
        }

        // 2. VERIFICATION: Restore remote session if Firebase is active
        auth.onAuthStateChanged(async (fUser) => {
          if (fUser) {
            try {
              const fToken = await fUser.getIdToken();
              const { user, token } = await apiFetch('/api/auth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: fToken })
              });
              
              if (token) localStorage.setItem('vibestream_token', token);
              if (user) {
                set({ user });
                await get().syncFromServer();
              }
            } catch (err) {
              console.error('[Auth] initAuth sync failed:', err);
            }
          } else {
            // If Firebase says no user, but we have a local JWT, we can still be logged in!
            // This is crucial for offline/native support.
            if (localStorage.getItem('vibestream_token')) {
              get().syncFromServer().catch(() => {
                // If sync fails with 401, then we really are logged out
                localStorage.removeItem('vibestream_token');
                set({ user: null });
              });
            }
          }
        });
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
            likedSongs: Array.isArray(liked) ? liked : [],
            playlists: Array.isArray(playlists) ? playlists : [],
            listeningHistory: Array.isArray(history) ? history : [],
            followedArtists: Array.isArray(artists) ? artists : [],
          });
        } catch (err) {
          console.error('[Store] Sync from server failed:', err);
        }
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
      importPlaylist: async (url) => {
        const { importYoutubePlaylist } = await import('../services/api');
        const newPlaylist = await importYoutubePlaylist(url);
        set((s) => ({ playlists: [newPlaylist, ...s.playlists] }));
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
          apiFetch('/api/history', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(track) 
          }).catch(() => {});
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
        currentTrack: s.currentTrack,
        playbackContext: s.playbackContext,
        contextIndex: s.contextIndex,
        queue: s.queue,
        progress: s.progress,
        duration: s.duration,
        isShuffle: s.isShuffle,
        repeatMode: s.repeatMode,
        // Persist everything as a local cache for snappiness on reload
        user: s.user,
        playlists: s.playlists,
        likedSongs: s.likedSongs,
        followedArtists: s.followedArtists,
        listeningHistory: s.listeningHistory,
      }),
    }
  )
);
