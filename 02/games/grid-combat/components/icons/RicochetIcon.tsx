import React from 'react';

const RicochetIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6.13a2 2 0 013.414-.08l5.872 10.676a2 2 0 003.414-.08V6.13" />
  </svg>
);
export default RicochetIcon;
