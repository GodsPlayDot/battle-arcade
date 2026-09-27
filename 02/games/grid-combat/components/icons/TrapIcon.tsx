import React from 'react';

const TrapIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22a10 10 0 100-20 10 10 0 000 20z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l1.768-1.768a2.5 2.5 0 013.535 0L12 12l1.697-1.697a2.5 2.5 0 013.535 0L19 12" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l1.768 1.768a2.5 2.5 0 003.535 0L12 12l1.697 1.697a2.5 2.5 0 003.535 0L19 12" />
  </svg>
);

export default TrapIcon;
