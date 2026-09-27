import React from 'react';
import { Circle } from 'react-konva';

interface AuraProps {
  radius: number;
  color: string;
}

const Aura: React.FC<AuraProps> = ({ radius, color }) => {
  return (
    <Circle
      radius={radius}
      fill={color}
      opacity={0.3}
      listening={false} // Make it non-interactive
    />
  );
};

export default Aura;
