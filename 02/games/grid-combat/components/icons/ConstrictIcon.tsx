import React from 'react';

const ConstrictIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-3 3-3-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15l3-3 3 3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l-3 3 3 3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l3-3-3-3" />
  </svg>
);

export default ConstrictIcon;