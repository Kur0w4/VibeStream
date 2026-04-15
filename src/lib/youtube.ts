/**
 * Singleton loader for the YouTube IFrame Player API.
 * Guarantees the script tag is injected only once and all callers
 * receive the same Promise, regardless of how many components call it.
 */

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

let _promise: Promise<void> | null = null;

export function loadYouTubeApi(): Promise<void> {
  if (_promise) return _promise;

  _promise = new Promise<void>((resolve) => {
    // Already loaded (e.g. HMR refresh)
    if (window.YT?.Player) {
      resolve();
      return;
    }

    // Chain with any callback already registered
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      resolve();
    };

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  });

  return _promise;
}
