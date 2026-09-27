import React from 'react';
import AIIcon from './icons/AIIcon';

interface AIToggleProps {
  isAi: boolean;
  onToggle: (isAi: boolean) => void;
  disabled: boolean;
}

const AIToggle: React.FC<AIToggleProps> = ({ isAi, onToggle, disabled }) => {
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isAi);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className={`relative inline-flex items-center h-8 rounded-full w-16 transition-colors duration-300 ease-in-out focus:outline-none ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${isAi ? 'bg-purple-600' : 'bg-green-600'}`}
      aria-label={`Toggle AI control. Currently ${isAi ? 'On' : 'Off'}`}
    >
      <span
        className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ease-in-out flex items-center justify-center ${isAi ? 'translate-x-9' : 'translate-x-1'}`}
      >
        {isAi && <AIIcon className="w-4 h-4 text-purple-600" />}
      </span>
      <div className="absolute left-2 text-white font-bold text-sm">H</div>
      <div className="absolute right-2 text-white font-bold text-sm">A</div>
    </button>
  );
};

export default AIToggle;
