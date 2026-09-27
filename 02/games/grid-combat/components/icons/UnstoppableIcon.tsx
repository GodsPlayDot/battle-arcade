import React from 'react';

const UnstoppableIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 16.5l13-13" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5-5-5" />
  </svg>
);

export default UnstoppableIcon;
