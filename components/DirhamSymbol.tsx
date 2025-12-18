
import React from 'react';

interface DirhamSymbolProps {
  className?: string;
  // Added size prop to support cloning with size in AnimatedLogo
  size?: number | string;
}

// Fix: Support size prop and pass it to the svg element for consistent scaling with other icons
const DirhamSymbol: React.FC<DirhamSymbolProps> = ({ className = "h-[1em] w-[1em]", size }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`inline-block align-baseline fill-current ${className}`}
      width={size}
      height={size}
      aria-label="Dirham Symbol"
    >
      {/* 
        Approximation of the stylized 'D' from the guideline:
        - Main curve of the D
        - Two horizontal bars crossing the vertical stroke
        - Pointed terminals on the bars
      */}
      <path d="M30 15 v70 h20 c22 0 38 -15 38 -35 s-16 -35 -38 -35 h-20 z M38 23 h12 c18 0 30 10 30 27 s-12 27 -30 27 h-12 v-54 z" />
      {/* Upper Bar */}
      <path d="M22 43 q5 0 10 -2 h38 q5 2 10 2 v4 q-5 0 -10 2 h-38 q-5 -2 -10 -2 z" />
      {/* Lower Bar */}
      <path d="M22 55 q5 0 10 -2 h38 q5 2 10 2 v4 q-5 0 -10 2 h-38 q-5 -2 -10 -2 z" />
    </svg>
  );
};

export default DirhamSymbol;
