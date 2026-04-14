/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Search } from './components/Search';
import { Trends } from './pages/Trends';
import { Library } from './pages/Library';
import { LikedSongs } from './pages/LikedSongs';
import { Playlists } from './pages/Playlists';
import { Artists } from './pages/Artists';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/library" element={<Library />} />
          <Route path="/liked-songs" element={<LikedSongs />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/artists" element={<Artists />} />
          {/* Add more routes as needed */}
        </Routes>
      </Layout>
    </Router>
  );
}

