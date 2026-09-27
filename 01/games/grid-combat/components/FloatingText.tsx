import React from 'react';
import { Position } from '../types';

interface FloatingTextProps {
  text: string;
  color: string;
  position: Position;
  cellSizeRem: number;
}

const FloatingTextComponent: React.FC<FloatingTextProps> = ({ text, color, position, cellSizeRem }) => {
  const top = position.y * cellSizeRem;
  const left = position.x * cellSizeRem;

  return (
    <div
      className={`floating-text absolute pointer-events-none text-lg font-bold z-10 ${color}`}
      style={{
        top: `${top}rem`,
        left: `${left}rem`,
        width: `${cellSizeRem}rem`,
        textAlign: 'center',
        transform: 'translateZ(20px)',
      }}
    >
      <div className="player-token-inner inline-block">{text}</div>
    </div>
  );
};

export default FloatingTextComponent;