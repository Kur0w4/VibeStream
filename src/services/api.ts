import { Track, API_BASE_URL } from '../store/usePlayerStore';

export const searchTracks = async (query: string): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Search failed');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};

export const getTrendingTracks = async (): Promise<Track[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search`);
    if (!response.ok) throw new Error('Failed to fetch trending');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return [];
  }
};
