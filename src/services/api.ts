import { Track } from '../store/usePlayerStore';
import { apiClient } from '../lib/apiClient';

// ─── In-Memory Search Cache ──────────────────────────────────────────────────
const CACHE_TTL = 5 * 60 * 1000;
interface CacheEntry<T> { data: T; expiresAt: number; }
const searchCache = new Map<string, CacheEntry<Track[]>>();

function getCached(key: string): Track[] | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { searchCache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: Track[]): void {
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
    const data = await apiClient(`/api/search?q=${encodeURIComponent(query)}`);
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    return [];
  }
};

/** Fetch trending songs */
export const getTrendingTracks = async (): Promise<Track[]> => {
  const cacheKey = 'trending';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiClient('/api/search');
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    return [];
  }
};

/** Fetch personalized trends */
export const getTrends = async (): Promise<Track[]> => {
  const cacheKey = 'trends:v3';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiClient('/api/trends');
    setCache(cacheKey, data);
    return data;
  } catch (error) {
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
    const data = await apiClient(`/api/search/mood?${params}`);
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    return [];
  }
};

/** Search for artists */
export interface Artist { name: string; thumbnail: string; }
export const searchArtists = async (query: string): Promise<Artist[]> => {
  try {
    const url = query.trim()
      ? `/api/search/artist?q=${encodeURIComponent(query)}`
      : `/api/search/artist`;
    return await apiClient(url);
  } catch (error) {
    return [];
  }
};

/** Get tracks for a specific artist profile */
export const getArtistTracks = async (artistName: string): Promise<Track[]> => {
  const cacheKey = `artist:${artistName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const data = await apiClient(`/api/artist/${encodeURIComponent(artistName)}/tracks`);
    setCache(cacheKey, data);
    return data;
  } catch (error) {
    return [];
  }
};

/** Get Personalized "Your Mix" */
export const getYourMix = async (): Promise<Track[]> => {
  try {
    const data = await apiClient('/api/mix');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    return [];
  }
};

/** Import Playlist from YouTube */
export const importYoutubePlaylist = async (url: string): Promise<any> => {
  return await apiClient('/api/playlists/import', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
};
