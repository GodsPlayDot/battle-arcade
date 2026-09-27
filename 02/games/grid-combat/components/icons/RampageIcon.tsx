import React from 'react';

const RampageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 15s1.5-2 5-2 5 2 5 2m-8-4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10L8 8m8 2l1-2" />
  </svg>
);

export default RampageIcon;