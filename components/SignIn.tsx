
import React, { useState } from 'react';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';

interface SignInProps {
  onSignIn: () => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate authentication delay
    setTimeout(() => {
      onSignIn();
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Aesthetic Background Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />

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
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm font-medium">Please enter your credentials to access the workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white"
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
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center group-hover:border-primary transition-colors">
                  <div className="w-2.5 h-2.5 bg-primary rounded-sm opacity-0 group-hover:opacity-20" />
                </div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Remember Device</span>
              </label>
              <button type="button" className="text-[11px] font-black text-primary uppercase tracking-tight hover:underline">Forgot Access?</button>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Enter Workspace <ArrowRight size={18} /></>
              )}
            </button>
          </form>
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
