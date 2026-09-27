import React from 'react';

const TwinEchoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20.5a9.5 9.5 0 100-19 9.5 9.5 0 000 19z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 16.5a9.5 9.5 0 100-19 9.5 9.5 0 000 19z" />
  </svg>
);

export default TwinEchoIcon;