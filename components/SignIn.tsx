import React, { useState } from 'react';
import { Sun, Moon, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import AppLogo from './AppLogo';
import LadlyLogo from './LadlyLogo';

interface SignInProps {
  onSignIn: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: (isDark: boolean) => void;
}

const SignIn: React.FC<SignInProps> = ({ onSignIn, isDarkMode, onToggleDarkMode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEnter = async () => {
    setIsLoading(true);
    // Simulate a brief loading state for UX
    setTimeout(() => {
        setIsLoading(false);
        onSignIn();
    }, 800);
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

          <div className="space-y-6">
            <button 
              onClick={handleEnter}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[1.8rem] font-black uppercase text-xs tracking-[0.15em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <>
                  Enter Workspace
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="pt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1 rounded-full">
                <ShieldCheck size={12} /> Local Encrypted Storage
              </div>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Secure Offline-Ready Mode</p>
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