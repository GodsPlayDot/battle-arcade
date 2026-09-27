import React, { useState } from 'react';
import InfoIcon from './icons/InfoIcon';

const GameRules: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 rounded-full bg-gray-700 hover:bg-blue-600 transition-colors" aria-label="Show game rules">
        <InfoIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="modal-enter-active bg-gray-800 border-2 border-yellow-400 rounded-lg p-6 max-w-lg w-full text-left"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">How to Play</h2>
            <div className="space-y-3 text-gray-300">
              <p><strong className="text-white">Objective:</strong> Reduce your opponent's HP to zero to win the game.</p>
              <p><strong className="text-white">Turns:</strong> Both players select their moves at the same time. Once both have confirmed, the turn resolves.</p>
              <p><strong className="text-white">Actions:</strong> Each turn, you select a <span className="text-cyan-400">Primary Move</span> and a <span className="text-cyan-400">Follow-up Move</span>. You must select a skill and a target on the grid for both.</p>
              <p><strong className="text-white">Resources:</strong> Skills cost either <span className="text-blue-400">MP (Mana)</span> or <span className="text-green-400">Stamina</span>. Manage your resources wisely!</p>
              <p><strong className="text-white">Range:</strong> Skills have a limited range. The grid will highlight valid targets in green when you select a skill.</p>
              <p><strong className="text-white">AI Mode:</strong> You can toggle Player 2 to be an AI opponent using the switch at the top-right of the screen.</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameRules;