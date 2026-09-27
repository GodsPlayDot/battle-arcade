import React, { useState, useEffect } from 'react';
// Fix: Import the Modal component.
import Modal from './Modal';
import { MINI_GAMES, MINI_GAME_HELP_DATA } from '../constants';
import SnakeGame from './games/SnakeGame';
import TetrisGame from './games/TetrisGame';
import PongGame from './games/PongGame';
import SlimeImpactGame from './games/SlimeImpactGame';
import MeteorStrikeGame from './games/MeteorStrikeGame';
import MemoryPuzzleGame from './games/MemoryPuzzleGame';
import JumpFrogGame from './games/JumpFrogGame';
import ConnectTheDotsGame from './games/ConnectTheDotsGame';
import NibblesGame from './games/NibblesGame';
import ConnectFourGame from './games/ConnectFourGame';
import BombermanGame from './games/BombermanGame';
import WhackASlimeGame from './games/WhackASlimeGame';

interface GameRunnerProps {
  gameName: string;
  onGameEnd: (expGained: number, refund?: boolean) => void;
}

const GAME_COMPONENTS: { [key: string]: React.FC<any> } = {
    'Slime Snake': SnakeGame,
    'Slime Tetris': TetrisGame,
    'Slime Whack': WhackASlimeGame,
    'Slime Pong': PongGame,
    'Slime Impact': SlimeImpactGame,
    'Meteor Strike': MeteorStrikeGame,
    'Memory Puzzle': MemoryPuzzleGame,
    'Jump Frog': JumpFrogGame,
    'Connect the Dots': ConnectTheDotsGame,
    'Nibbles': NibblesGame,
    'Connect Four': ConnectFourGame,
    'Slime Bomber': BombermanGame,
};

const GameRunner: React.FC<GameRunnerProps> = ({ gameName, onGameEnd }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [checks, setChecks] = useState<string[]>([]);

  const gameHelp = MINI_GAME_HELP_DATA[gameName];
  const GAME_CHECKS = [
      'Initializing graphics...',
      'Calibrating controls...',
      'Loading game logic...',
      `Verifying wave system... (${gameHelp?.progression ? 'OK' : 'N/A'})`,
      `Loading AI parameters... (${(gameHelp?.enemies || gameHelp?.bosses) ? 'OK' : 'N/A'})`,
      `Testing physics engine... (${['Meteor Strike', 'Slime Impact'].includes(gameName) ? 'OK' : 'N/A'})`,
      'System Ready.',
      'Starting game...'
  ];


  useEffect(() => {
    let checkIndex = 0;
    const interval = setInterval(() => {
      setChecks(prev => [...prev, GAME_CHECKS[checkIndex]]);
      checkIndex++;
      if (checkIndex >= GAME_CHECKS.length) {
        clearInterval(interval);
        setTimeout(() => setIsChecking(false), 500);
      }
    }, 350);

    return () => clearInterval(interval);
  }, [gameName]); // Re-run if the game changes

  const GameComponent = GAME_COMPONENTS[gameName];

  if (isChecking) {
    return (
      <Modal onClose={() => {}}>
        <div className="text-center p-4">
          <h2 className="text-2xl mb-4 flicker">SYSTEM CHECK: {gameName}</h2>
          <div className="text-left font-mono text-sm h-48 overflow-y-auto bg-black p-2">
            {checks.map((check, index) => (
              <p key={index}>&gt; {check}</p>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  if (GameComponent) {
    return <GameComponent onGameEnd={onGameEnd} />;
  }
  
  return (
      <div className="text-center pixel-border p-8">
          <h2 className="text-2xl text-red-500">Error: Game Not Found</h2>
          <p>The cabinet for "{gameName}" seems to be broken.</p>
          <button onClick={() => onGameEnd(0, true)} className="pixel-border p-2 mt-4">Return Quarter</button>
      </div>
  );
};

export default GameRunner;