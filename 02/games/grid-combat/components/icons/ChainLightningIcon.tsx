import React from 'react';

const ChainLightningIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-4 4h3l-4 4" />
  </svg>
);

export default ChainLightningIcon;
