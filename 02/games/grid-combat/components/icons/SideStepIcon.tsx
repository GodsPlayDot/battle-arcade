import React from 'react';

const SideStepIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 10l-2 2 2 2" />
  </svg>
);
export default SideStepIcon;