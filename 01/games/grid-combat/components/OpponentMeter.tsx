import React from 'react';
import { Player } from '../types';
import AbyssalBladeIcon from './icons/AbyssalBladeIcon';

interface OpponentMeterProps {
  opponents: Player[];
  currentOpponentIndex: number;
}

const OpponentMeter: React.FC<OpponentMeterProps> = ({ opponents, currentOpponentIndex }) => {
  return (
    <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-800/50 p-1 sm:p-2 rounded-lg">
      <h3 className="font-bold text-xs sm:text-sm text-gray-300 hidden md:block">Challengers:</h3>
      {opponents.map((opponent, index) => {
        const isDefeated = index < currentOpponentIndex;
        const isCurrent = index === currentOpponentIndex;
        const isBoss = opponent.id > 20;

        let baseStyle = 'relative px-2 py-1 text-xs rounded-md transition-all duration-300 sm:whitespace-nowrap ';
        if (isCurrent) {
            baseStyle += isBoss ? 'bg-black text-red-400 font-bold scale-110 shadow-lg border-2 border-red-500' : 'bg-yellow-500 text-black font-bold scale-105 shadow-lg';
        } else if (isDefeated) {
            baseStyle += 'bg-red-900/70 text-gray-500';
        } else {
            baseStyle += 'bg-gray-700 text-gray-300';
        }

        return (
          <div 
            key={opponent.id} 
            className={baseStyle}
          >
            <div className="flex items-center space-x-1 justify-center">
                {isBoss && <AbyssalBladeIcon className="w-4 h-4" />}
                <span className={isDefeated ? 'opacity-50' : ''}>{isBoss ? 'The Tyrant' : opponent.name}</span>
            </div>
            {isCurrent && (
              <div className="mt-1 pt-1 border-t border-black/20 flex justify-center space-x-2 text-xs">
                <span><strong className="opacity-70">STR:</strong>{opponent.stats.strength}</span>
                <span><strong className="opacity-70">INT:</strong>{opponent.stats.intelligence}</span>
                <span><strong className="opacity-70">DEF:</strong>{opponent.stats.defense}</span>
              </div>
            )}
            {isDefeated && (
              <div 
                className="absolute inset-0 flex items-center justify-center text-red-400 font-extrabold text-lg"
                style={{ textShadow: '0 0 5px rgba(0,0,0,0.7)' }}
              >
                ✕
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OpponentMeter;