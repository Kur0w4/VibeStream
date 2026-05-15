/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';

import { Search } from './components/Search';
import { Trends } from './pages/Trends';
import { Library } from './pages/Library';
import { LikedSongs } from './pages/LikedSongs';
import { Playlists } from './pages/Playlists';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Artists } from './pages/Artists';
import { ArtistProfile } from './pages/ArtistProfile';
import { History } from './pages/History';
import { Auth } from './pages/Auth';
import { Settings } from './pages/Settings';
import { OfflineTracks } from './pages/OfflineTracks';
import { useEffect } from 'react';
import { API_BASE_URL } from './store/usePlayerStore';
import { Capacitor } from '@capacitor/core';

const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-20 animate-in fade-in duration-500">
    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
    <p className="text-text-dim font-bold animate-pulse">Loading experience...</p>
  </div>
);

export default function App() {
  // Ngrok Warmup: Attempt to authorize the session with the skip-warning header
  // This helps when opening the app on a new device.
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(Capacitor.isNativePlatform() ? { 'X-Requested-With': 'com.vibestream.app' } : {}),
      },
      mode: 'cors'
    }).catch(() => {});
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/history" element={<History />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:name" element={<ArtistProfile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/library/offline" element={<OfflineTracks />} />
        </Routes>
      </Layout>
    </Router>
  );
}
