import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, Sun, Moon, AlertCircle, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Try to sign in first
      await signInWithEmailAndPassword(auth, email, password);
      onSignIn();
    } catch (err: any) {
      // If account doesn't exist, create it to ensure a smooth onboarding as requested
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          onSignIn();
        } catch (createErr: any) {
          setError(createErr.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] dark:bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl animate-pulse" />
      
      <div className="absolute top-8 right-8 z-50">
        <button
          onClick={() => onToggleDarkMode(!isDarkMode)}
          className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm active:scale-95"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="bg-primary p-5 rounded-[2.5rem] shadow-2xl mb-6">
            <AppLogo className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">BooKeeper</h1>
          <p className="text-slate-400 font-bold text-xs tracking-tight uppercase tracking-widest">AI-Cloud Digital Ledger</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Secure Access</h2>
            <p className="text-slate-400 text-sm font-medium">Real-time sync enabled.</p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <AlertCircle size={18} />
                <p className="text-xs font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Email</label>
                <input 
                  type="email" 
                  required
                  autoComplete="email"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white outline-none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                <input 
                  type="password" 
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary font-bold text-sm dark:text-white outline-none"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-primary text-white py-4.5 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all mt-4"
              >
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Enter Ledger <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-3">
          <LadlyLogo className="h-10 opacity-60" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Firebase Cloud Persistence</p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;