
import React from 'react';

interface LadlyLogoProps {
  className?: string;
  size?: number | string;
}

const LadlyLogo: React.FC<LadlyLogoProps> = ({ className = "h-6", size }) => {
  return (
    <svg 
      viewBox="0 0 450 160" 
      className={className} 
      style={{ height: size }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Deep red shadow matching the reference image */}
        <filter id="ladlyShadow" x="-20%" y="-20%" width="150%" height="150%">
          <feOffset dx="4" dy="4" result="offset" />
          <feFlood floodColor="#921927" />
          <feComposite in2="offset" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      {/* "ladly." Main Wordmark - Replicating the serif look and lowercase style */}
      <text 
        x="10" 
        y="125" 
        fontFamily="serif" 
        fontSize="140" 
        fontWeight="bold" 
        fill="#F3E5D8" 
        filter="url(#ladlyShadow)"
        letterSpacing="-6"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        ladly.
      </text>
      
      {/* "MEDIA" Curved text aligned to the top right of the 'y' */}
      <path id="mediaCurve" d="M 320,60 A 60,60 0 0 1 420,110" fill="transparent" />
      <text>
        <textPath xlinkHref="#mediaCurve" startOffset="5%" fontSize="22" fontWeight="900" fill="#F3E5D8" filter="url(#ladlyShadow)" letterSpacing="6">
          MEDIA
        </textPath>
      </text>
    </svg>
  );
};

export default LadlyLogo;
