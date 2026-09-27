import React from 'react';

interface ComingSoonGameProps {
  gameName: string;
  onGameEnd: (expGained: number, refundQuarter: boolean) => void;
}

const ComingSoonGame: React.FC<ComingSoonGameProps> = ({ gameName, onGameEnd }) => {
  return (
    <div className="flex flex-col items-center text-center pixel-border p-8">
      <h2 className="text-3xl text-yellow-400 flicker mb-4">{gameName}</h2>
      <p className="text-xl mb-6">This arcade cabinet is under construction!</p>
      <p className="mb-8">Please check back later. Your Quarter has been refunded.</p>
      <button 
        onClick={() => onGameEnd(0, true)} 
        className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200"
      >
        Return to Training Grounds
      </button>
    </div>
  );
};

export default ComingSoonGame;