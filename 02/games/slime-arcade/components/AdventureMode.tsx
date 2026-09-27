// Fix: Implement the AdventureMode component for initiating battles.
import React from 'react';

interface AdventureModeProps {
  onStartBattle: () => void;
  onStartPCOpponentBattle: () => void;
  isLoading: boolean;
}

const AdventureMode: React.FC<AdventureModeProps> = ({ onStartBattle, onStartPCOpponentBattle, isLoading }) => {
  return (
    <div className="pixel-border p-4 flex flex-col items-center justify-center h-full">
      <h3 className="text-3xl text-center mb-4 flicker">ADVENTURE AWAITS!</h3>
      <p className="text-center mb-3">Choose a fair fight for your current build. Victories grant experience and 1–3 quarters.</p>
      <div className="w-full max-w-sm mb-5 grid grid-cols-2 gap-2 text-center text-sm">
        <div className="pixel-border p-2"><b className="text-red-300">WILD FOE</b><br/>~90% of your HP</div>
        <div className="pixel-border p-2"><b className="text-blue-300">PC DUEL</b><br/>~80% of your HP</div>
      </div>
      <div className="w-full flex flex-col items-center space-y-4">
          <button 
            onClick={onStartBattle} 
            disabled={isLoading}
            className="pixel-border text-2xl p-4 w-full max-w-sm bg-black hover:bg-red-500 hover:text-black disabled:opacity-50 transition-colors duration-200"
          >
            {isLoading ? 'GENERATING FOE...' : 'FIND AN OPPONENT'}
          </button>
          <p className="text-sm">OR</p>
           <button 
            onClick={onStartPCOpponentBattle} 
            disabled={isLoading}
            className="pixel-border text-xl p-3 w-full max-w-sm bg-black hover:bg-blue-500 hover:text-black disabled:opacity-50 transition-colors duration-200"
          >
            PLAY AGAINST PC
          </button>
      </div>
      {isLoading && <p className="mt-4 text-sm flicker">The arena is preparing a worthy foe...</p>}
    </div>
  );
};

export default AdventureMode;
