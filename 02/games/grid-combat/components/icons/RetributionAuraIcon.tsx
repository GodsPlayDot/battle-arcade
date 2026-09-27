import React from 'react';

const RetributionAuraIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L3 7v5c0 5.55 3.84 10.42 9 11.95 5.16-1.53 9-6.4 9-11.95V7L12 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22V12m0-10l-3 5h6l-3-5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9 5 9-5m-9 15V12" />
  </svg>
);

export default RetributionAuraIcon;