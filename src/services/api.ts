import { Track, API_BASE_URL } from '../store/usePlayerStore';

// ─── In-Memory Search Cache ──────────────────────────────────────────────────
// Prevents redundant network requests for identical queries within a 5-minute window.
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry<Track[]>>();

function getCached(key: string): Track[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Track[]): void {
  // Limit cache size to avoid unbounded memory growth
  if (searchCache.size >= 50) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey !== undefined) searchCache.delete(firstKey);
  }
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ─── API Functions ──────────────────────────────────────────────────────────

/** Search for songs/tracks */
export const searchTracks = async (query: string): Promise<Track[]> => {
  const cacheKey = `search:${query}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Fetch trending songs (empty query search) */
export const getTrendingTracks = async (): Promise<Track[]> => {
  const cacheKey = 'trending';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE_URL}/api/search`);
    if (!response.ok) throw new Error('Failed to fetch trending');
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Fetch personalized trends (multi-genre + user history) */
export const getTrends = async (): Promise<Track[]> => {
  const cacheKey = 'trends:v2';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE_URL}/api/trends`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch trends');
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

/** Fetch mood-based personalized tracks */
export const getMoodTracks = async (mood: string, topArtists: string[] = []): Promise<Track[]> => {
  const artistsParam = topArtists.slice(0, 2).join(',');
  const cacheKey = `mood:${mood}:${artistsParam}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({ mood });
    if (artistsParam) params.set('artists', artistsParam);
    const response = await fetch(`${API_BASE_URL}/api/search/mood?${params}`);
    if (!response.ok) throw new Error('Mood search failed');
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
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
  const cacheKey = `artist:${artistName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(`${API_BASE_URL}/api/artist/${encodeURIComponent(artistName)}/tracks`);
    if (!response.ok) throw new Error('Failed to fetch artist tracks');
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
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
