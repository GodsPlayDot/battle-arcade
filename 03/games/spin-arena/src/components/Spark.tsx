import React from 'react';
import { Star } from 'react-konva';

export interface SparkState {
  x: number;
  y: number;
  radius: number;
  life: number;
  color?: string;
}

interface SparkProps {
  spark: SparkState;
}

const Spark: React.FC<SparkProps> = ({ spark }) => {
  const opacity = Math.max(0, spark.life / 10);

  return (
    <Star
      x={spark.x}
      y={spark.y}
      numPoints={5}
      innerRadius={spark.radius / 2}
      outerRadius={spark.radius}
      fill={spark.color || "#FFFFFF"}
      opacity={opacity}
      scaleX={opacity}
      scaleY={opacity}
    />
  );
};

export default Spark;
