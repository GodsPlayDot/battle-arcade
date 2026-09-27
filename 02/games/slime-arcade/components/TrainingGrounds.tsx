import React, { useState } from 'react';
import type { Slime, MiniGame } from '../types';
import { MINI_GAMES } from '../constants';
import HelpBook from './HelpBook';

interface TrainingGroundsProps {
  slime: Slime;
  highScores: Record<string, number>;
  onStartGame: (gameName: string) => void;
}

const TrainingGrounds: React.FC<TrainingGroundsProps> = ({ slime, highScores, onStartGame }) => {
  const [showHelp, setShowHelp] = useState(false);

  const gamesByLevel = MINI_GAMES.reduce((acc, game) => {
    const level = game.levelReq;
    if (!acc[level]) {
        acc[level] = [];
    }
    acc[level].push(game);
    return acc;
  }, {} as Record<number, MiniGame[]>);

  const levelTiers = Object.keys(gamesByLevel).map(Number).sort((a, b) => a - b);

  return (
    <>
      {showHelp && <HelpBook onClose={() => setShowHelp(false)} />}
      <div className="pixel-border p-4 space-y-8">
        <div>
          <div className="text-center mb-4">
            <h3 className="text-2xl">TRAINING GROUNDS</h3>
            <p className="text-sm">Spend Quarters to play mini-games and earn EXP!</p>
          </div>
          <div className="flex justify-center items-center mb-6 gap-6">
             <p className="text-xl text-yellow-400">Quarters: {slime.quarters}</p>
             <button
                onClick={() => setShowHelp(true)}
                className="pixel-border p-2 text-lg hover:bg-blue-500 hover:text-black transition-colors duration-200"
              >
                📖 Help Book
              </button>
          </div>
          
          {levelTiers.map(tier => (
            <div key={tier} className="mb-8">
              <h4 className={`text-xl text-center mb-4 ${slime.level >= tier ? 'text-green-300' : 'text-gray-500'}`}>
                -- Level {tier}+ Training -- {slime.level < tier && `(Unlocks at Lvl ${tier})`}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gamesByLevel[tier].map(game => {
                    const isLocked = slime.level < game.levelReq;
                    const highScore = highScores[game.name] || 0;
                    return (
                        <div key={game.name} className={`pixel-border p-4 flex flex-col items-center transition-opacity duration-300 ${isLocked ? 'opacity-50' : ''}`}>
                            <h4 className="text-xl mb-2">{game.name}</h4>
                            <p className="text-sm text-center mb-4 h-10">{game.description}</p>
                            <p className="mb-2">Base EXP: {game.expBase}</p>
                            <p className="text-sm text-yellow-300 mb-4">High Score: {highScore}</p>
                            <button
                                onClick={() => onStartGame(game.name)}
                                disabled={slime.quarters <= 0 || isLocked}
                                className="pixel-border p-2 bg-black w-full hover:bg-green-400 hover:text-black disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-green-400 transition-colors duration-200"
                            >
                                {isLocked ? `Lvl ${game.levelReq} Req` : 'Play (1 Q)'}
                            </button>
                        </div>
                    );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {slime.quarters <= 0 && <p className="text-center mt-6 text-red-500">You're out of Quarters! Win battles to earn more.</p>}
      </div>
    </>
  );
};

export default TrainingGrounds;