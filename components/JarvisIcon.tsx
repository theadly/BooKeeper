
import React from 'react';

interface JarvisIconProps {
  className?: string;
  size?: number | string;
}

const JarvisIcon: React.FC<JarvisIconProps> = ({ className = "h-8 w-8", size }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={`inline-block fill-current ${className}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* God-Level Robot Head Design */}
      <circle cx="50" cy="50" r="45" fill="currentColor" fillOpacity="0.05" />
      
      {/* Main Cranium */}
      <path 
        d="M25 40 C25 20 40 10 50 10 S75 20 75 40 V65 C75 75 65 85 50 85 S25 75 25 65 V40Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="6" 
        strokeLinecap="round" 
      />
      
      {/* Titanium Side Panels */}
      <path d="M25 45 L15 55 V65 L25 70" stroke="currentColor" strokeWidth="4" fill="none" />
      <path d="M75 45 L85 55 V65 L75 70" stroke="currentColor" strokeWidth="4" fill="none" />

      {/* Ocular Units (Eyes) */}
      <g transform="translate(35, 38)">
        <rect x="0" y="0" width="10" height="4" rx="2" fill="currentColor" />
        <circle cx="5" cy="2" r="1.5" fill="white" className="animate-pulse" />
      </g>
      <g transform="translate(55, 38)">
        <rect x="0" y="0" width="10" height="4" rx="2" fill="currentColor" />
        <circle cx="5" cy="2" r="1.5" fill="white" className="animate-pulse" />
      </g>
      
      {/* Neural Link / Central Processing Core */}
      <path 
        d="M50 20 V30 M40 25 H60" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        opacity="0.5"
      />
      
      {/* Mouth / Data Port Segment */}
      <path 
        d="M40 70 H60" 
        stroke="currentColor" 
        strokeWidth="4" 
        strokeLinecap="round" 
        opacity="0.8"
      />
      
      {/* Vertical Data Streams */}
      <rect x="42" y="74" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.6" />
      <rect x="50" y="74" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.6" />
      <rect x="58" y="74" width="2" height="6" rx="1" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
};

export default JarvisIcon;
