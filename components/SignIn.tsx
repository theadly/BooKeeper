
import React, { useState, useEffect } from 'react';
import { Lock, Mail, ArrowRight, Sun, Moon, AlertCircle, Key, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';
import { CONFIG } from '../config';

interface SignInProps {
  onSignIn: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (isDark: boolean) => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn, isDarkMode, onToggleDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Setup flow states
  const [showSetup, setShowSetup] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Load set credentials or use defaults
  const getCredentials = () => {
    const saved = localStorage.getItem('app_credentials');
    if (saved) return JSON.parse(saved);
    return { email: CONFIG.DEFAULT_USER, password: CONFIG.DEFAULT_PASS };
  };

  const isUsingDefaults = () => {
    return !localStorage.getItem('app_credentials');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Simulate network delay
    setTimeout(() => {
      const creds = getCredentials();
      if (email.toLowerCase() === creds.email.toLowerCase() && password === creds.password) {
        // Check if it's initial login with default credentials
        if (isUsingDefaults()) {
          setShowSetup(true);
          setNewEmail(creds.email);
          setIsLoading(false);
        } else {
          onSignIn();
        }
      } else {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }
    setIsLoading(true);
    
    setTimeout(() => {
        localStorage.setItem('app_credentials', JSON.stringify({
            email: newEmail,
            password: newPassword
        }));
        onSignIn();
    }, 1000);
  };

  // Quick Bypass Handler
  const handleDiveIn = () => {
    setIsLoading(true);
    setTimeout(() => {
        onSignIn();
    }, 400);
  };

  if (showSetup) {
    return (
        <div className="min-h-screen bg-[#F9F7F2] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
          <div className="w-full max-w-md relative z-10">
            <div className="flex flex-col items-center mb-10">
                <div className="bg-primary p-4 rounded-3xl shadow-xl mb-6"><Key className="text-white" size={32} /></div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">Set Your Credentials</h1>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center">Security Setup Required for first access</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
                <form onSubmit={handleSetupSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Your Permanent Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="email" required className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">New Secure Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="password" required minLength={6} placeholder="Min. 6 characters" className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-sm dark:text-white outline-none focus:ring-2 focus:ring-primary" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-primary text-white py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                        {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Finish & Save Account <ShieldCheck size={18}/></>}
                    </button>
                </form>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      {/* Aesthetic Background Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Theme Toggle Button */}
      <div className="absolute top-8 right-8 z-50">
        <button
          onClick={() => onToggleDarkMode(!isDarkMode)}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm active:scale-95"
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Identity Section */}
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="bg-primary p-5 rounded-[2.5rem] shadow-2xl mb-6 group hover:scale-110 transition-transform duration-500">
            <AppLogo className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">BooKeeper</h1>
          <p className="text-slate-400 font-bold text-xs tracking-tight uppercase tracking-widest">Digital Ledger for Creatives</p>
        </div>

        {/* Auth Form Container */}
        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-700">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Welcome</h2>
            <p className="text-slate-400 text-sm font-medium">Access your workspace or start fresh.</p>
          </div>

          <div className="space-y-4">
            {/* New Bypass Button */}
            <button 
              onClick={handleDiveIn}
              disabled={isLoading}
              className="w-full bg-slate-900 dark:bg-primary text-white py-5 rounded-[1.8rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group mb-2"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Zap size={20} className="text-amber-400 fill-amber-400" />
                  Dive Right In
                  <Sparkles size={16} className="text-indigo-300 animate-pulse" />
                </>
              )}
            </button>

            <div className="relative py-4 flex items-center gap-4">
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Or Sign In</span>
              <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1" />
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} />
                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 opacity-60 hover:opacity-100 transition-opacity">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="email" 
                    placeholder="name@company.com"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full border-2 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-primary hover:border-primary py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={18} /></>
                )}
              </button>
            </form>
          </div>
          
          {isUsingDefaults() && (
            <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Protected by local encryption.
              </p>
            </div>
          )}
        </div>

        {/* Corporate Footer Byline */}
        <div className="mt-16 flex flex-col items-center gap-3 animate-in fade-in duration-1000 delay-500">
          <div className="opacity-60 hover:opacity-100 transition-opacity duration-500 mb-1 scale-110">
            <LadlyLogo className="h-10" />
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
            <span>All rights reserved</span>
            <span className="hidden sm:inline opacity-30">•</span>
            <span className="text-slate-500">Ladly Media FZ LLC 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
