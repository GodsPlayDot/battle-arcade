import React, { useState } from 'react';
import Modal from './Modal';
import { MINI_GAMES, MINI_GAME_HELP_DATA } from '../constants';

interface HelpBookProps {
  onClose: () => void;
}

const HelpBook: React.FC<HelpBookProps> = ({ onClose }) => {
  const [selectedGame, setSelectedGame] = useState(MINI_GAMES[0].name);
  const gameData = MINI_GAME_HELP_DATA[selectedGame];

  const renderSection = (title: string, content: string | { name: string; description: string }[] | undefined) => {
    if (!content || (Array.isArray(content) && content.length === 0)) {
      return null;
    }
    return (
      <div className="mb-4">
        <h4 className="text-lg text-yellow-300 flicker mb-1">{title}</h4>
        {typeof content === 'string' ? (
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{content}</p>
        ) : (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
            {content.map((item) => (
              <li key={item.name}>
                <strong>{item.name}:</strong> {item.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col h-[85vh]">
        <h2 className="text-2xl text-center mb-4">ARCADE HELP BOOK</h2>
        <div className="flex-grow flex gap-4 overflow-hidden">
          {/* Left Pane: Game List */}
          <div className="w-1/3 pixel-border p-2 overflow-y-auto">
            <ul className="space-y-1">
              {MINI_GAMES.map((game) => (
                <li key={game.name}>
                  <button
                    onClick={() => setSelectedGame(game.name)}
                    className={`w-full text-left p-1 text-sm transition-colors duration-200 ${
                      selectedGame === game.name
                        ? 'bg-green-700 text-white'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    {game.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {/* Right Pane: Game Details */}
          <div className="w-2/3 pixel-border p-4 overflow-y-auto">
            {gameData ? (
              <>
                <h3 className="text-xl text-green-300 mb-4">{selectedGame}</h3>
                {renderSection('Rules', gameData.rules)}
                {renderSection('Scoring & EXP', gameData.scoring)}
                {renderSection('Levels & Progression', gameData.progression)}
                {renderSection('Power-ups', gameData.powerups)}
                {renderSection('Enemies', gameData.enemies)}
                {renderSection('Bosses', gameData.bosses)}
              </>
            ) : (
              <p>Select a game to see its details.</p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HelpBook;
