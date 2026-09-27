
import React from 'react';

const CoinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6.546l-1.007-.946a.75.75 0 10-1.022 1.092l2.25 2.125a.75.75 0 001.022 0l2.25-2.125a.75.75 0 10-1.022-1.092L12.75 12.546V6z" clipRule="evenodd" />
  </svg>
);
export default CoinIcon;
