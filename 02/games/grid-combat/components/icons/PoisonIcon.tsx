import React from 'react';

const PoisonIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 10-7.072 7.072" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.464 8.464a5 5 0 107.072 7.072" />
  </svg>
);

export default PoisonIcon;
