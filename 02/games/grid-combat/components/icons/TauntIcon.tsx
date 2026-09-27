import React from 'react';

const TauntIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a6 6 0 00-6 6h12a6 6 0 00-6-6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01" />
  </svg>
);

export default TauntIcon;
