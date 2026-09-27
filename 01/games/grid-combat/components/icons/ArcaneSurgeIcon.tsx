import React from 'react';

const ArcaneSurgeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.5l6-5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 14.5L12.5 16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9.5l-4 4h3l-4 4" stroke="#4ade80"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 13a2 2 0 10-4 0v1a2 2 0 104 0v-1z" stroke="#60a5fa"/>
  </svg>
);

export default ArcaneSurgeIcon;