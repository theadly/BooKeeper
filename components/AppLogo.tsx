
import React from 'react';

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
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full drop-shadow-sm"
      >
        {/* Outer Teal Ring */}
        <circle cx="50" cy="50" r="48" fill="#0d9488" />
        
        {/* Lighter Teal Inner Ring */}
        <circle cx="50" cy="50" r="42" fill="#14b8a6" />
        
        {/* Main White Background */}
        <circle cx="50" cy="50" r="36" fill="white" />

        {/* Logo Icon Group (Teal Lines) */}
        <g stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Heart Outline */}
          <path d="M50 48 C50 48 48 40 40 40 C34 40 30 44 30 50 C30 58 42 68 50 72 C58 68 70 58 70 50 C70 44 66 40 60 40 C52 40 50 48 50 48Z" fill="none" strokeWidth="3" />
          
          {/* Upward Trend Arrow */}
          <path d="M32 68 L48 52 L58 58 L78 38" strokeWidth="4" />
          <path d="M70 38 H78 V46" strokeWidth="4" />
          
          {/* Stack of Coins */}
          <g transform="translate(62, 58)">
            {/* Top Coin */}
            <ellipse cx="6" cy="4" rx="8" ry="3.5" fill="white" strokeWidth="2" />
            <text x="6" y="6" fontSize="5" fontWeight="black" fill="#0d9488" textAnchor="middle" stroke="none">$</text>
            
            {/* Lower Coins (Edges) */}
            <path d="M-2 7 A 8 3.5 0 0 0 14 7 V10 A 8 3.5 0 0 1 -2 10 Z" fill="white" strokeWidth="2" />
            <path d="M-2 10 A 8 3.5 0 0 0 14 10 V13 A 8 3.5 0 0 1 -2 13 Z" fill="white" strokeWidth="2" />
          </g>
        </g>
      </svg>
    </div>
  );
};

export default AppLogo;
