/**
 * apiClient - Cliente centralizado para peticiones a la API de VibeStream
 * Maneja automáticamente los tokens JWT y la configuración de producción.
 */

import { API_BASE_URL } from '../store/usePlayerStore';

let _authInstance: any = null;
async function getAuth() {
  if (_authInstance) return _authInstance;
  const { auth } = await import('./firebase');
  _authInstance = auth;
  return auth;
}

export async function apiClient<T = any>(url: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // Bypass Ngrok free tier warning page
    ...((opts?.headers as any) || {}) 
  };
  
  // 1. Obtener Token JWT local (el más rápido y persistente)
  const localToken = localStorage.getItem('vibestream_token');
  if (localToken) {
    headers['Authorization'] = `Bearer ${localToken}`;
  } else {
    // 2. Fallback a Firebase si hay sesión activa pero no tenemos JWT aún
    try {
      const auth = await getAuth();
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignorar errores de auth si no es crítico
    }
  }

  // Asegurar que la URL sea absoluta si empieza por /
  const finalUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
  
  // No usar credentials: 'include' con JWT en headers para evitar conflictos de CORS
  const fetchOpts: RequestInit = { 
    ...opts,
    headers,
  };

  try {
    const response = await fetch(finalUrl, fetchOpts);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  } catch (err) {
    console.error(`[apiClient] Error calling ${url}:`, err);
    throw err;
  }
}
