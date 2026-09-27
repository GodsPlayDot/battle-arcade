
import React from 'react';

const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7.014A8.003 8.003 0 0122 12c0 3.771-2.5 7-6.343 6.657z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.5 16.5c-1.5 0-3-1.5-3-3s1.5-3 3-3c1.5 0 3 1.5 3 3s-1.5 3-3 3z" />
  </svg>
);
export default FireIcon;
