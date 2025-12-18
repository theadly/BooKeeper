
import React from 'react';

interface FiNancyIconProps {
  className?: string;
}

const FiNancyIcon: React.FC<FiNancyIconProps> = ({ className = "h-8 w-8" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`inline-block fill-current ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 
        FiNancy Minimal Logo Concept:
        An abstract, geometric mark combining the letter 'n' with a stylized bob silhouette.
        The base is a perfect circle, and the internal shapes represent:
        1. A signature bob hair curve (top arc)
        2. A calculator grid motif (bottom dot array)
        3. A professional, forward-leaning stance.
      */}
      
      {/* Signature Bob Curve / Initial 'n' arc */}
      <path 
        d="M20 50 C20 25 35 15 50 15 S80 25 80 50 V85" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="10" 
        strokeLinecap="round" 
      />
      
      {/* Internal "Face" / Calculator Pun */}
      <g transform="translate(38, 45)">
        {/* Two upper dots as eyes/buttons */}
        <rect x="0" y="0" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="16" y="0" width="8" height="8" rx="2" fill="currentColor" />
        
        {/* Lower dots as a subtle smile/row of buttons */}
        <rect x="0" y="14" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="16" y="14" width="8" height="8" rx="2" fill="currentColor" />
      </g>
      
      {/* The "Heart/Dot" - The dot of the 'i' or a hidden friendly detail */}
      <circle cx="20" cy="85" r="5" fill="currentColor" />
      
      {/* Abstract Trend Line - Connecting the concepts */}
      <path 
        d="M50 45 L50 85" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinecap="round" 
        opacity="0.3"
      />
    </svg>
  );
};

export default FiNancyIcon;
