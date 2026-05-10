import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { usePlayerStore } from './store/usePlayerStore.ts';

function Root() {
  const initAuth = usePlayerStore((s) => s.initAuth);
  useEffect(() => { initAuth(); }, []);
  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
