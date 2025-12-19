
import React from 'react';
import { Heart, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import DirhamSymbol from './DirhamSymbol';

interface AppLogoProps {
  className?: string;
  size?: number | string;
}

const AppLogo: React.FC<AppLogoProps> = ({ className = "h-10 w-10", size }) => {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`} 
      style={{ width: size, height: size }}
    >
      {/* Main Stylized "BK" Accounting Logo */}
      <div className="relative z-10 w-full h-full">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Ledger Book Background Shape */}
          <path 
            d="M25 20C25 17.2386 27.2386 15 30 15H75C77.7614 15 80 17.2386 80 20V80C80 82.7614 77.7614 85 75 85H30C27.2386 85 25 82.7614 25 80V20Z" 
            fill="currentColor" 
            fillOpacity="0.1"
          />
          
          {/* Document / Spine Outline */}
          <path 
            d="M35 15V85M25 20H75C77.7614 20 80 22.2386 80 25V75C80 77.7614 77.7614 80 75 80H25V20Z" 
            stroke="white" 
            strokeWidth="6" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Stylized 'B' */}
          <path 
            d="M45 35H55C58.3137 35 61 37.6863 61 41C61 44.3137 58.3137 47 55 47H45V35Z" 
            stroke="white" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />
          <path 
            d="M45 47H58C61.3137 47 64 49.6863 64 53C64 56.3137 61.3137 59 58 59H45V47Z" 
            stroke="white" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />
          <path d="M45 35V59" stroke="white" strokeWidth="5" strokeLinecap="round" />

          {/* Stylized 'K' (sharing the B's spine logic or adjacent) */}
          <path d="M70 35V59" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 47L80 35" stroke="white" strokeWidth="5" strokeLinecap="round" />
          <path d="M70 47L80 59" stroke="white" strokeWidth="5" strokeLinecap="round" />

          {/* Accounting Ledger Lines / Calculator Grid Motif at bottom */}
          <rect x="45" y="68" width="8" height="3" rx="1" fill="white" />
          <rect x="58" y="68" width="8" height="3" rx="1" fill="white" />
          <rect x="71" y="68" width="8" height="3" rx="1" fill="white" />
          
          {/* Decorative Success Checkmark (Accounting Verified) */}
          <circle cx="20" cy="20" r="10" fill="#10B981" />
          <path d="M16 20L19 23L24 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Orbiting Elements Container - Reinforcing the Smart/AI theme */}
      <div className="absolute inset-[-60%] orbit-container pointer-events-none select-none">
        
        {/* Revolving Calculator Icon */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 orbit-item">
           <div className="bg-primary text-white rounded-lg p-1.5 shadow-lg ring-2 ring-white/20">
             <Calculator size={12} strokeWidth={3} />
           </div>
        </div>

        {/* Revolving Dollar Sign */}
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 orbit-item" style={{ animationDelay: '-3.75s' }}>
           <div className="bg-emerald-500 text-white rounded-full p-1.5 shadow-lg ring-2 ring-white/20">
             <DollarSign size={12} strokeWidth={4} />
           </div>
        </div>

        {/* Revolving Dirham Symbol */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 orbit-item" style={{ animationDelay: '-7.5s' }}>
           <div className="bg-indigo-500 text-white rounded-full p-1.5 shadow-lg ring-2 ring-white/20">
             <DirhamSymbol className="w-3 h-3" />
           </div>
        </div>

        {/* Revolving Trending Up Arrow */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 orbit-item" style={{ animationDelay: '-11.25s' }}>
           <div className="bg-rose-500 text-white rounded-full p-1.5 shadow-lg ring-2 ring-white/20">
             <TrendingUp size={12} strokeWidth={3} />
           </div>
        </div>

      </div>
    </div>
  );
};

export default AppLogo;
