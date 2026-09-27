
import React from 'react';
import type { Slime } from '../types';
import CoinIcon from './icons/CoinIcon';
import ExpIcon from './icons/ExpIcon';

interface HeaderProps {
  slime: Slime;
  expToNextLevel: number;
  currentView: 'main' | 'training' | 'stats' | 'battle';
}

const Header: React.FC<HeaderProps> = ({ slime, expToNextLevel }) => {
  const expPercentage = (slime.exp / expToNextLevel) * 100;

  return (
    <header 
      className="pixel-border p-4 mb-4 text-green-400"
    >
      <div className="flex justify-between items-center text-xl">
        <h1>
          {slime.name} the {slime.evolutionStage.name}
        </h1>
        <span>Lvl {slime.level}</span>
        <div className="flex items-center">
          <CoinIcon className="w-6 h-6 mr-2 text-yellow-400" />
          <span>{slime.quarters} Q</span>
        </div>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-sm mb-1">
          <span>EXP</span>
          <span>{slime.exp} / {expToNextLevel}</span>
        </div>
        <div className="w-full bg-gray-700 border-2 border-current">
          <div
            className="h-3 bg-green-400"
            style={{ width: `${expPercentage}%`, transition: 'width 0.5s ease-in-out' }}
          ></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
