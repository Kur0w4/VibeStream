import React, { useState } from 'react';
import { Music2, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { usePlayerStore, API_BASE_URL } from '../store/usePlayerStore';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const Auth = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = usePlayerStore();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = tab === 'login' ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      login(data);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.message.includes('YOUR_API_KEY')) {
         setError('Firebase configuration missing. Please add your credentials to src/lib/firebase.ts');
      } else {
         setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-text-dim hover:text-white transition-all group z-10"
      >
        <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:scale-110 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm tracking-tight">Back to VibeStream</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-[#0f172a]/80 backdrop-blur-3xl border border-white/10 rounded-[40px] p-8 md:p-12 shadow-[0_32px_100px_rgba(0,0,0,0.8)] overflow-hidden">
          
          {/* Logo Area */}
          <div className="flex flex-col items-center gap-5 mb-12 text-center">
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }} 
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 bg-gradient-to-tr from-accent to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-accent/20"
            >
              <Music2 className="text-black w-10 h-10 fill-black" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter">VIBESTREAM</h1>
              <p className="text-text-dim text-sm font-medium mt-1">Unlock your premium music experience</p>
            </div>
          </div>

          {/* Google Auth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-4 bg-white hover:bg-gray-100 text-black font-black py-4.5 rounded-[24px] transition-all shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            <GoogleIcon />
            <span className="text-sm tracking-tight">{tab === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
          </button>

          <div className="flex items-center gap-4 my-10">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">or use email</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Form Tabs */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={cn(
                  'flex-1 py-3.5 rounded-xl text-xs font-black transition-all uppercase tracking-widest',
                  tab === t ? 'bg-white/10 text-accent shadow-xl border border-white/10' : 'text-text-dim hover:text-white'
                )}
              >
                {t === 'login' ? 'Login' : 'Join'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 px-6 text-white outline-none focus:border-accent/40 focus:bg-white/8 transition-all placeholder:text-text-dim/20 text-sm font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] px-1">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4.5 px-6 pr-14 text-white outline-none focus:border-accent/40 focus:bg-white/8 transition-all placeholder:text-text-dim/20 text-sm font-medium"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-white transition-colors p-2.5"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  className="text-red-400 text-xs font-bold bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-4 flex items-center gap-3"
                >
                  <p className="leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="mt-4 py-5 bg-gradient-to-r from-accent to-blue-500 text-black font-black rounded-[24px] hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 shadow-2xl shadow-accent/20 flex items-center justify-center gap-3 text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <p className="mt-12 text-center text-[10px] text-text-dim uppercase font-black tracking-[0.3em] opacity-30">
            VibeStream Music &copy; 2026
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
