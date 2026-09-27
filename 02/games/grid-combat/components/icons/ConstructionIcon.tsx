import React from 'react';

const ConstructionIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21v-7m0-4V3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-9m0-4V3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-5m0-4V3" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 5h20" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 13h20" />
  </svg>
);

export default ConstructionIcon;