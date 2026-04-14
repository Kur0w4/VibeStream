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

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isExpanded: boolean;
  
  // Dynamic Data
  playlists: { id: string; name: string; tracks: Track[] }[];
  likedSongs: Track[];
  followedArtists: { name: string; thumbnail: string }[];
  listeningHistory: Track[];
  
  // Actions
  playTrack: (track: Track) => void;
  togglePause: () => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsExpanded: (isExpanded: boolean) => void;
  
  // Data Actions
  createPlaylist: (name: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  toggleLike: (track: Track) => void;
  followArtist: (artist: { name: string; thumbnail: string }) => void;
  addToHistory: (track: Track) => void;
  
  nextTrack: () => void;
  prevTrack: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.7,
      progress: 0,
      duration: 0,
      isExpanded: false,
      playlists: [],
      likedSongs: [],
      followedArtists: [],
      listeningHistory: [],

      playTrack: (track) => set((state) => {
        // Add to history
        const newHistory = state.listeningHistory.filter(t => t.id !== track.id);
        newHistory.unshift(track);
        // Keep only top 100 history
        if (newHistory.length > 100) newHistory.pop();
        
        return { 
          currentTrack: track, 
          isPlaying: true, 
          progress: 0,
          listeningHistory: newHistory 
        };
      }),
      
      togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setIsPlaying: (isPlaying: boolean) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setIsExpanded: (isExpanded) => set({ isExpanded }),
      
      createPlaylist: (name) => set((state) => ({
        playlists: [...state.playlists, { id: Math.random().toString(36).substr(2, 9), name, tracks: [] }]
      })),
      
      addTrackToPlaylist: (playlistId, track) => set((state) => ({
        playlists: state.playlists.map(pl => 
          pl.id === playlistId && !pl.tracks.some(t => t.id === track.id)
            ? { ...pl, tracks: [...pl.tracks, track] }
            : pl
        )
      })),

      toggleLike: (track) => set((state) => {
        const isLiked = state.likedSongs.some(t => t.id === track.id);
        if (isLiked) {
          return { likedSongs: state.likedSongs.filter(t => t.id !== track.id) };
        } else {
          return { likedSongs: [track, ...state.likedSongs] };
        }
      }),

      followArtist: (artist) => set((state) => {
        const isFollowed = state.followedArtists.some(a => a.name === artist.name);
        if (isFollowed) {
          return { followedArtists: state.followedArtists.filter(a => a.name !== artist.name) };
        } else {
          return { followedArtists: [artist, ...state.followedArtists] };
        }
      }),

      addToHistory: (track) => set((state) => {
        const newHistory = state.listeningHistory.filter(t => t.id !== track.id);
        newHistory.unshift(track);
        if (newHistory.length > 100) newHistory.pop();
        return { listeningHistory: newHistory };
      }),

      nextTrack: () => {},
      prevTrack: () => {},
    }),
    {
      name: 'vibestream-storage',
      // We don't persist playing state or current progress so it starts fresh on reload
      partialize: (state) => ({ 
        playlists: state.playlists,
        likedSongs: state.likedSongs,
        followedArtists: state.followedArtists,
        listeningHistory: state.listeningHistory
      }),
    }
  )
);
