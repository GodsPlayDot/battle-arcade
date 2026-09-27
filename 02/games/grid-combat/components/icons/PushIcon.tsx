import React from 'react';

const PushIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0l-4-4m4 4l-4 4M6 17h2m2 0h2M6 13h2m2 0h2m-4-4h2m2 0h2M6 5h2m2 0h2" />
    <path d="M6 3v18" />
  </svg>
);

export default PushIcon;