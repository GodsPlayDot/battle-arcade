import React from 'react';

const MeditateIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 15v-1a2 2 0 012-2h12a2 2 0 012 2v1" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a3 3 0 100-6 3 3 0 000 6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l3-3 3 3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l-1 4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 15l1 4" />
  </svg>
);
export default MeditateIcon;