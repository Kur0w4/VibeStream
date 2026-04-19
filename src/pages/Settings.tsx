import React, { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { User, Settings as SettingsIcon, LogOut, Check, X, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const Settings = () => {
  const { user, updateUsername, logout } = usePlayerStore();
  const navigate = useNavigate();
  
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleUpdateUsername = async () => {
    if (newUsername.trim() === user.username) {
      setEditingUsername(false);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateUsername(newUsername);
      setSuccessMsg('Username updated successfully!');
      setEditingUsername(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-accent" />
          Account Settings
        </h1>
        <p className="text-text-dim mt-2 font-medium">Manage your profile, preferences, and account security.</p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Section */}
        <section className="bg-white/5 border border-white/10 rounded-[24px] p-6 md:p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none" />
          
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
            <User className="w-5 h-5 text-text-dim" /> Profile
          </h2>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent to-blue-500 flex items-center justify-center shadow-lg shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                 <span className="text-3xl font-black text-black">{user.username.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0 space-y-4">
              <div>
                <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Username</label>
                {editingUsername ? (
                  <div className="mt-1 flex items-center gap-3 max-w-sm">
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      autoFocus
                      className="flex-1 bg-black/40 border border-white/20 rounded-xl py-2 px-4 text-white text-sm outline-none focus:border-accent"
                    />
                    <button 
                      onClick={handleUpdateUsername}
                      disabled={loading || newUsername.length < 3}
                      className="p-2 bg-accent text-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center w-10 h-10"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => setEditingUsername(false)}
                      disabled={loading}
                      className="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all flex items-center justify-center w-10 h-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center justify-between max-w-sm group">
                    <span className="text-lg font-bold text-white truncate">{user.username}</span>
                    <button 
                      onClick={() => setEditingUsername(true)}
                      className="text-xs font-bold text-accent px-3 py-1.5 bg-accent/10 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              
              {user.email && (
                <div>
                  <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">Email</label>
                  <p className="mt-1 text-sm font-medium text-white/70">{user.email}</p>
                </div>
              )}
              
              <AnimatePresence>
                {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-bold">{error}</motion.p>}
                {successMsg && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-xs font-bold">{successMsg}</motion.p>}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Security & Data Section */}
        <section className="bg-white/5 border border-white/10 rounded-[24px] p-6 md:p-8">
           <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-text-dim" /> Account & Data
          </h2>
          
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                <div>
                  <p className="font-bold text-white text-sm">Session Management</p>
                  <p className="text-xs text-text-dim mt-1">Sign out of VibeStream on this device</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all border border-transparent hover:border-red-500/30"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
             </div>
             
             {/* Note: Clear history is handled in TopBar, but we could add it here too */}
             <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-rose-500/10">
                <div>
                  <p className="font-bold text-rose-400 text-sm">Danger Zone</p>
                  <p className="text-xs text-text-dim mt-1">Permanently delete your account and all associated data</p>
                </div>
                <button 
                  onClick={() => alert("Contact support to delete your account.")}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-rose-500/20 group"
                >
                  Delete Account <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>
        </section>
        
        {/* Info */}
        <p className="text-center text-xs text-text-dim font-medium py-4">
          VibeStream Premium &copy; 2026. All rights reserved.
        </p>

      </div>
    </div>
  );
};
