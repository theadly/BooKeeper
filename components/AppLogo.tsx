
import React from 'react';
import { Heart, DollarSign } from 'lucide-react';
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
      {/* Main Stylized "B" Logo from reference image - Hardcoded White for visibility */}
      <div className="relative z-10 w-full h-full">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* The Outer Folder/Document Shape */}
          <path 
            d="M30 30V80H70V45C70 45 70 30 60 30H30" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* The Flap */}
          <path 
            d="M45 15H65L75 30" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          {/* The Vertical Stem of the 'B' */}
          <path 
            d="M45 15V80" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round"
          />
          {/* Top Curve of 'B' */}
          <path 
            d="M45 45H55C60 45 60 52 55 52H45" 
            stroke="white" 
            strokeWidth="7" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          {/* Bottom Curve of 'B' */}
          <path 
            d="M45 62H58C63 62 63 70 58 70H45" 
            stroke="white" 
            strokeWidth="7" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* The Red Heart from the image */}
          <path 
            d="M75 25C75 25 73 20 69 20C65 20 63 23 63 25C63 29 75 35 75 35C75 35 87 29 87 25C87 23 85 20 81 20C77 20 75 25 75 25Z" 
            fill="#EF4444" 
            stroke="white" 
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Orbiting Elements Container */}
      <div className="absolute inset-[-60%] orbit-container pointer-events-none select-none">
        
        {/* Revolving Heart 1 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 orbit-item">
           <Heart size={14} className="fill-rose-500 text-rose-500 animate-pulse-soft" />
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

        {/* Revolving Heart 2 */}
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 orbit-item" style={{ animationDelay: '-11.25s' }}>
           <Heart size={12} className="fill-rose-400 text-rose-400 animate-float" />
        </div>

      </div>
    </div>
  );
};

export default AppLogo;
