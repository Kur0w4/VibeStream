import { Track, API_BASE_URL } from '../store/usePlayerStore';

/** Search for songs/tracks */
export const searchTracks = async (query: string): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&_t=${Date.now()}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Fetch trending songs (empty query search) */
export const getTrendingTracks = async (): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search?_t=${Date.now()}`);
    if (!response.ok) throw new Error('Failed to fetch trending');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Search for artists (unique channels) */
export interface Artist {
  name: string;
  thumbnail: string;
}

export const searchArtists = async (query: string): Promise<Artist[]> => {
  try {
    const url = query.trim()
      ? `${API_BASE_URL}/api/search/artist?q=${encodeURIComponent(query)}`
      : `${API_BASE_URL}/api/search/artist`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Artist search failed');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Get tracks for a specific artist profile */
export const getArtistTracks = async (artistName: string): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/artist/${encodeURIComponent(artistName)}/tracks`);
    if (!response.ok) throw new Error('Failed to fetch artist tracks');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Get Personalized "Your Mix" */
export const getYourMix = async (): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/mix`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch mix');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Import Playlist from YouTube */
export const importYoutubePlaylist = async (url: string): Promise<any> => {
  const { auth } = await import('../lib/firebase');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/playlists/import`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Import failed');
  }

  return await response.json();
};
