/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loader2 } from 'lucide-react';

// Lazy load pages for performance
const Search = lazy(() => import('./components/Search').then(m => ({ default: m.Search })));
const Trends = lazy(() => import('./pages/Trends').then(m => ({ default: m.Trends })));
const Library = lazy(() => import('./pages/Library').then(m => ({ default: m.Library })));
const LikedSongs = lazy(() => import('./pages/LikedSongs').then(m => ({ default: m.LikedSongs })));
const Playlists = lazy(() => import('./pages/Playlists').then(m => ({ default: m.Playlists })));
const PlaylistDetail = lazy(() => import('./pages/PlaylistDetail').then(m => ({ default: m.PlaylistDetail })));
const Artists = lazy(() => import('./pages/Artists').then(m => ({ default: m.Artists })));
const ArtistProfile = lazy(() => import('./pages/ArtistProfile').then(m => ({ default: m.ArtistProfile })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));

const PageLoader = () => (
  <div className="flex-1 flex flex-col items-center justify-center p-20 animate-in fade-in duration-500">
    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
    <p className="text-text-dim font-bold animate-pulse">Loading experience...</p>
  </div>
);

export default function App() {
  return (
    <Router>
      <Layout>
        <Suspense fallback={<PageLoader />}>
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
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}
