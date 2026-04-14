import { create } from 'zustand';

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
  playTrack: (track: Track) => void;
  togglePause: () => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  playTrack: (track) => set({ currentTrack: track, isPlaying: true, progress: 0 }),
  togglePause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  nextTrack: () => {
    // Logic for next track can be added if we have a queue
  },
  prevTrack: () => {
    // Logic for prev track can be added if we have a queue
  },
}));
