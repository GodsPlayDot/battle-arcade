import React from 'react';

const FreezeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20m-8-8h16M4 12l4-4m-4 4l4 4m8-12l4 4m-4-4l4-4" />
  </svg>
);

export default FreezeIcon;
