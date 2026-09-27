import React from 'react';

const TripIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 20V9a2 2 0 012-2h0a2 2 0 012 2v11" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11 20l-3-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 20l3-3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 17a10.2 10.2 0 0113.5-2.9" />
  </svg>
);
export default TripIcon;