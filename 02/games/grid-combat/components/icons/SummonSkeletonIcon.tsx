import React from 'react';

const SummonSkeletonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 00-10 10c0 4.418 3.582 8 8 8h4c4.418 0 8-3.582 8-8a10 10 0 00-10-10z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M10 14a2 2 0 104 0h-4z" />
  </svg>
);

export default SummonSkeletonIcon;
