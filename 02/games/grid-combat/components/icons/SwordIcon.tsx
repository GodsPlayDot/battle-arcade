
import React from 'react';

const SwordIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m-6.364-8.364L4.222 9.222m15.556 5.556l-1.414-1.414M4 12H3m18 0h-1m-4.636-6.364l-1.414 1.414M19.778 4.222l-1.414 1.414M12 18a6 6 0 100-12 6 6 0 000 12z" />
  </svg>
);
export default SwordIcon;
