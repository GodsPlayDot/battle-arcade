import React from 'react';

const RageOutIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2m-4.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41" />
  </svg>
);

export default RageOutIcon;
