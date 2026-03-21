import React, { useState } from 'react';
import { Sun, Moon, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';
import { signInWithGoogle } from '../services/supabaseService';

interface SignInProps {
  onSignIn: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (isDark: boolean) => void;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

const SignIn: React.FC<SignInProps> = ({ onSignIn, isDarkMode, onToggleDarkMode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // Supabase will redirect back — onSignIn called via auth state change in App
    } catch (err: any) {
      setError(err.message || 'Sign in failed. Please try again.');
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

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="flex flex-col items-center mb-12 animate-in fade-in slide-in-from-top-10 duration-1000">
          <div className="bg-primary p-5 rounded-[2.5rem] shadow-2xl mb-6">
            <AppLogo className="w-14 h-14 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">BooKeeper</h1>
          <p className="text-slate-400 font-bold text-xs tracking-tight uppercase tracking-widest">AI-Cloud Digital Ledger</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
          <div className="mb-10">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm font-medium">Log in to manage your unified financials.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-4 rounded-[1.8rem] font-bold text-sm shadow hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </button>

            {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

            <div className="pt-2 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1 rounded-full">
                <ShieldCheck size={12} /> Secured by Supabase Auth
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center gap-3 animate-pulse">
          <LadlyLogo className="h-10 opacity-60" />
          <div className="flex items-center gap-1.5">
             <Sparkles size={10} className="text-primary" />
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Restricted Access: Laila Mourad</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;