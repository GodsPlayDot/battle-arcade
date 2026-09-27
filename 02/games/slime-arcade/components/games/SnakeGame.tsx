import React, { useState, useEffect, useCallback } from 'react';

const GRID_SIZE = 20;
const TILE_SIZE = 20; // in pixels
const MAX_LEVEL = 12;

interface SnakeGameProps {
    onGameEnd: (score: number) => void;
}

const SnakeGame: React.FC<SnakeGameProps> = ({ onGameEnd }) => {
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 15, y: 15 });
    const [obstacles, setObstacles] = useState<{x: number, y: number}[]>([]);
    const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('RIGHT');
    const [speed, setSpeed] = useState(200);
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [pelletsEaten, setPelletsEaten] = useState(0);

    const pelletsToNextLevel = 5 + (level - 1) * 2;

    const generateRandomPosition = useCallback((currentSnake: {x: number, y: number}[], currentObstacles: {x: number, y: number}[]) => {
        let newPosition;
        const isOccupied = (pos: {x: number, y: number}) => 
            currentSnake.some(segment => segment.x === pos.x && segment.y === pos.y) ||
            currentObstacles.some(obs => obs.x === pos.x && obs.y === pos.y);
        
        do {
            newPosition = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (isOccupied(newPosition));
        return newPosition;
    }, []);

    const setupLevel = useCallback((lvl: number, currentSnake: {x:number, y:number}[], currentObs: {x:number, y:number}[]) => {
        setLevel(lvl);
        setPelletsEaten(0);
        setSpeed(Math.max(50, 200 - (lvl - 1) * 12));
        setFood(generateRandomPosition(currentSnake, currentObs));
    }, [generateRandomPosition]);


    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        switch (e.key) {
            case 'ArrowUp': setDirection(dir => (dir !== 'DOWN' ? 'UP' : dir)); break;
            case 'ArrowDown': setDirection(dir => (dir !== 'UP' ? 'DOWN' : dir)); break;
            case 'ArrowLeft': setDirection(dir => (dir !== 'RIGHT' ? 'LEFT' : dir)); break;
            case 'ArrowRight': setDirection(dir => (dir !== 'LEFT' ? 'RIGHT' : dir)); break;
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    useEffect(() => {
        if (gameOver) return;

        const gameInterval = setInterval(() => {
            setSnake(prevSnake => {
                const newSnake = [...prevSnake];
                const head = { ...newSnake[0] };

                switch (direction) {
                    case 'UP': head.y -= 1; break;
                    case 'DOWN': head.y += 1; break;
                    case 'LEFT': head.x -= 1; break;
                    case 'RIGHT': head.x += 1; break;
                }

                if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE ||
                    newSnake.some(segment => segment.x === head.x && segment.y === head.y) ||
                    obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
                    setGameOver(true);
                    clearInterval(gameInterval);
                    return prevSnake;
                }

                newSnake.unshift(head);

                if (head.x === food.x && head.y === food.y) {
                    const newScore = score + 10 * level;
                    setScore(newScore);
                    const newPelletsEaten = pelletsEaten + 1;
                    
                    if (newPelletsEaten >= pelletsToNextLevel) {
                        if (level + 1 > MAX_LEVEL) {
                            setGameOver(true);
                        } else {
                            setupLevel(level + 1, newSnake, obstacles);
                        }
                    } else {
                        setPelletsEaten(newPelletsEaten);
                        setFood(generateRandomPosition(newSnake, obstacles));
                    }
                } else {
                    newSnake.pop();
                }

                return newSnake;
            });
        }, speed);

        return () => clearInterval(gameInterval);
    }, [direction, food, speed, gameOver, obstacles, score, generateRandomPosition, level, pelletsEaten, pelletsToNextLevel, setupLevel]);


    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Slime Snake</h4>
            <div className="pixel-border bg-black relative" style={{ width: GRID_SIZE * TILE_SIZE, height: GRID_SIZE * TILE_SIZE }}>
                 <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`, gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)`}}>
                    {snake.map((segment, index) => (
                        <div key={index} style={{ gridColumn: segment.x + 1, gridRow: segment.y + 1, background: index === 0 ? '#32cd32' : '#0f0' }} />
                    ))}
                    <div style={{ gridColumn: food.x + 1, gridRow: food.y + 1, backgroundColor: 'yellow', borderRadius: '50%' }} />
                    {obstacles.map((obs, index) => (
                         <div key={`obs-${index}`} style={{ gridColumn: obs.x + 1, gridRow: obs.y + 1, background: '#555' }} />
                    ))}
                </div>
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-red-500">{level >= MAX_LEVEL ? "YOU WIN! All 12 levels cleared!" : "GAME OVER"}</h2>
                        <p className="text-xl mt-2">Final Score: {score} EXP</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                            Back to Training
                        </button>
                    </div>
                )}
            </div>
            <div className="flex justify-between w-full text-lg mt-2 px-1" style={{maxWidth: GRID_SIZE * TILE_SIZE}}>
                <span>Score: {score}</span>
                <span>Level: {level}</span>
                <span>Pellets: {pelletsEaten}/{pelletsToNextLevel}</span>
            </div>
            <p className="mt-1 text-sm">Use Arrow Keys to Move</p>
        </div>
    );
};

export default SnakeGame;