/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Search } from './components/Search';
import { Trends } from './pages/Trends';
import { Library } from './pages/Library';
import { LikedSongs } from './pages/LikedSongs';
import { Playlists } from './pages/Playlists';
import { PlaylistDetail } from './pages/PlaylistDetail';
import { Artists } from './pages/Artists';
import { ArtistProfile } from './pages/ArtistProfile';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/history" element={<Library />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlists/:id" element={<PlaylistDetail />} />
          <Route path="/artists" element={<Artists />} />
          <Route path="/artists/:name" element={<ArtistProfile />} />
        </Routes>
      </Layout>
    </Router>
  );
}
