import React from 'react';

const BattleCryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.636 5.636a9 9 0 0112.728 0m-12.728 0a9 9 0 010 12.728" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01M10 14a2 2 0 104 0H10z" />
  </svg>
);

export default BattleCryIcon;