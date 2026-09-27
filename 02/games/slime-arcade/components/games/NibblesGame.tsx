import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 25;
const TILE_SIZE = 16;
const WIDTH = GRID_SIZE * TILE_SIZE;
const HEIGHT = GRID_SIZE * TILE_SIZE;
const INITIAL_SNAKE_LENGTH = 3;
const PROTECTION_DURATION = 120; // Ticks
const PROTECTIVE_FOOD_CHANCE = 0.2;
const MAX_LEVEL = 12;

interface SnakeSegment { x: number; y: number; }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const NibblesGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const createInitialPlayerSnake = (): SnakeSegment[] => {
        const head = { x: Math.floor(GRID_SIZE / 2), y: GRID_SIZE - 2 };
        return Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({ x: head.x, y: head.y + i }));
    };

    const createInitialAISnake = (): SnakeSegment[] => {
        const head = { x: Math.floor(GRID_SIZE / 2), y: 1 };
        return Array.from({ length: INITIAL_SNAKE_LENGTH }, (_, i) => ({ x: head.x, y: head.y - i }));
    };
    
    const [level, setLevel] = useState(1);
    const [playerSnake, setPlayerSnake] = useState<SnakeSegment[]>(createInitialPlayerSnake());
    const [aiSnake, setAISnake] = useState<SnakeSegment[]>(createInitialAISnake());
    const [playerDirection, setPlayerDirection] = useState<Direction>('UP');
    const [aiDirection, setAIDirection] = useState<Direction>('DOWN');
    const [food, setFood] = useState<SnakeSegment>({ x: 0, y: 0 });
    const [foodType, setFoodType] = useState<'normal' | 'protective'>('normal');
    const [playerProtectionTimer, setPlayerProtectionTimer] = useState(0);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState<string | null>(null);
    const [speed, setSpeed] = useState(150);
    const gameLoopRef = useRef<number | null>(null);

    const playerDirectionRef = useRef<Direction>(playerDirection);
    useEffect(() => {
        playerDirectionRef.current = playerDirection;
    }, [playerDirection]);

    const isOccupied = useCallback((pos: SnakeSegment, pSnake: SnakeSegment[], aSnake: SnakeSegment[]) => {
        if (pSnake.some(s => s.x === pos.x && s.y === pos.y)) return true;
        if (aSnake.some(s => s.x === pos.x && s.y === pos.y)) return true;
        return false;
    }, []);

    const generateFood = useCallback((pSnake: SnakeSegment[], aSnake: SnakeSegment[]) => {
        let newFoodPosition;
        do {
            newFoodPosition = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (isOccupied(newFoodPosition, pSnake, aSnake));
        setFood(newFoodPosition);
        setFoodType(Math.random() < PROTECTIVE_FOOD_CHANCE ? 'protective' : 'normal');
    }, [isOccupied]);
    
    const resetGame = useCallback((newLevel: number) => {
        setLevel(newLevel);
        const newPlayerSnake = createInitialPlayerSnake();
        const newAISnake = createInitialAISnake();
        setPlayerSnake(newPlayerSnake);
        setAISnake(newAISnake);
        setPlayerDirection('UP');
        setAIDirection('DOWN');
        generateFood(newPlayerSnake, newAISnake);
        setPlayerProtectionTimer(0);
        setGameOver(null);
        setSpeed(150 - (newLevel - 1) * 10);
    }, [generateFood]);

    useEffect(() => {
        generateFood(playerSnake, aiSnake);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        const currentDir = playerDirectionRef.current;
        let newDir = currentDir;
        
        switch (e.key) {
            case 'ArrowUp': if (currentDir !== 'DOWN') newDir = 'UP'; break;
            case 'ArrowDown': if (currentDir !== 'UP') newDir = 'DOWN'; break;
            case 'ArrowLeft': if (currentDir !== 'RIGHT') newDir = 'LEFT'; break;
            case 'ArrowRight': if (currentDir !== 'LEFT') newDir = 'RIGHT'; break;
        }
        
        if (newDir !== currentDir) {
            setPlayerDirection(newDir);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    const getNextHead = (snake: SnakeSegment[], direction: Direction): SnakeSegment => {
        const head = { ...snake[0] };
        switch (direction) {
            case 'UP': head.y--; break;
            case 'DOWN': head.y++; break;
            case 'LEFT': head.x--; break;
            case 'RIGHT': head.x++; break;
        }
        return head;
    };
    
    const isWallCollision = (head: SnakeSegment): boolean => {
        return head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE;
    };
    
    const isSnakeCollision = (head: SnakeSegment, ownSnake: SnakeSegment[], otherSnake: SnakeSegment[]): boolean => {
        return (
            ownSnake.some(s => s.x === head.x && s.y === head.y) ||
            otherSnake.some(s => s.x === head.x && s.y === head.y)
        );
    };

    const determineAIMove = useCallback((level: number): Direction => {
        const aiHead = aiSnake[0];
        const allSegments = [...playerSnake, ...aiSnake];
        const oppositeDirection: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };

        const possibleDirs = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as Direction[]).filter(dir => dir !== oppositeDirection[aiDirection]);

        const validMoves: { dir: Direction; pos: SnakeSegment }[] = [];
        for (const dir of possibleDirs) {
            const nextHead = getNextHead(aiSnake, dir);
            if (!isWallCollision(nextHead) && !allSegments.some(s => s.x === nextHead.x && s.y === nextHead.y)) {
                validMoves.push({ dir, pos: nextHead });
            }
        }
        
        if (validMoves.length === 0) return aiDirection;

        const aiDifficulty = level <= 2 ? 1 : level <= 6 ? 2 : 3;

        if (aiDifficulty === 1) {
            validMoves.sort((a, b) => Math.hypot(a.pos.x - food.x, a.pos.y - food.y) - Math.hypot(b.pos.x - food.x, b.pos.y - food.y));
            return validMoves[0].dir;
        }
        
        const floodFill = (startPos: SnakeSegment): number => {
            const q = [startPos]; const visited = new Set<string>([`${startPos.x},${startPos.y}`]);
            let count = 0; const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            while(q.length > 0) {
                const {x, y} = q.shift()!; count++;
                for(const [dx, dy] of dirs) { const nx = x + dx; const ny = y + dy; const key = `${nx},${ny}`;
                    if(nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && !visited.has(key) && !allSegments.some(s => s.x === nx && s.y === ny)) { visited.add(key); q.push({x: nx, y: ny}); }
                }
            }
            return count;
        };

        const scoredMoves = validMoves.map(move => {
            const freedom = floodFill(move.pos); const distToFood = Math.hypot(move.pos.x - food.x, move.pos.y - food.y);
            let score = 0;
            if (aiDifficulty === 2) { score = (freedom < aiSnake.length + 2 ? -1000 : freedom) - distToFood * 2; } 
            else { const playerNextHead = getNextHead(playerSnake, playerDirection); const distToPlayer = Math.hypot(move.pos.x - playerNextHead.x, move.pos.y - playerNextHead.y); score = (freedom < aiSnake.length + 2 ? -1000 : freedom * 1.5) - distToPlayer - distToFood; }
            return { ...move, score };
        });

        scoredMoves.sort((a, b) => b.score - a.score);
        return scoredMoves[0].dir;

    }, [aiSnake, food, playerSnake, aiDirection, playerDirection]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        if (playerProtectionTimer > 0) {
            setPlayerProtectionTimer(t => t - 1);
        }

        const playerNextHead = getNextHead(playerSnake, playerDirection);
        const nextAIDirection = determineAIMove(level);
        setAIDirection(nextAIDirection);
        const aiNextHead = getNextHead(aiSnake, nextAIDirection);
        
        if (playerNextHead.x === aiNextHead.x && playerNextHead.y === aiNextHead.y) {
            setGameOver(playerProtectionTimer > 0 ? "You Win! AI crashed into you!" : "Draw! Head-on collision!");
            return;
        }

        const playerWallCrashed = isWallCollision(playerNextHead);
        const playerSnakeCrashed = isSnakeCollision(playerNextHead, playerSnake, aiSnake);
        const aiCrashed = isWallCollision(aiNextHead) || isSnakeCollision(aiNextHead, aiSnake, playerSnake);
        
        const isPlayerCrashedFatal = playerWallCrashed || (playerSnakeCrashed && playerProtectionTimer <= 0);

        if (isPlayerCrashedFatal && aiCrashed) { setGameOver("Draw! Both crashed!"); return; }
        if (isPlayerCrashedFatal) { setGameOver("You Lose! You crashed."); return; }
        if (aiCrashed) { setGameOver(`You Win! AI crashed on level ${level}.`); setScore(s => s + 50 * level); return; }

        const moveSnake = (snake: SnakeSegment[], nextHead: SnakeSegment, isPlayer: boolean) => {
            const newSnake = [nextHead, ...snake];
            let ateFood = false;
            if (nextHead.x === food.x && nextHead.y === food.y) {
                ateFood = true;
                if (isPlayer) {
                    setScore(s => s + 10);
                    if (foodType === 'protective') {
                        setPlayerProtectionTimer(PROTECTION_DURATION);
                    }
                }
            } else {
                newSnake.pop();
            }
            return { newSnake, ateFood };
        };
        
        const playerShouldMove = !(playerSnakeCrashed && playerProtectionTimer > 0);
        const { newSnake: nextPlayerSnake, ateFood: playerAte } = playerShouldMove ? moveSnake(playerSnake, playerNextHead, true) : { newSnake: playerSnake, ateFood: false };
        const { newSnake: nextAISnake, ateFood: aiAte } = moveSnake(aiSnake, aiNextHead, false);

        setPlayerSnake(nextPlayerSnake);
        setAISnake(nextAISnake);

        if (playerAte || aiAte) {
            generateFood(nextPlayerSnake, nextAISnake);
        }
    }, [gameOver, playerSnake, aiSnake, playerDirection, determineAIMove, food, generateFood, playerProtectionTimer, foodType, level]);

    useEffect(() => {
        gameLoopRef.current = window.setInterval(gameLoop, speed);
        return () => { if (gameLoopRef.current) clearInterval(gameLoopRef.current); };
    }, [gameLoop, speed]);

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Nibbles</h4>
            <div className="pixel-border bg-black relative" style={{ width: WIDTH, height: HEIGHT }}>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)` }}>
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                        <div key={i} style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: '#222' }} />
                    ))}
                </div>
                <div style={{ position: 'absolute', top: 0, left: 0 }}>
                    {playerSnake.map((s, i) => <div key={`p-${i}`} className={playerProtectionTimer > 0 ? "bg-cyan-400" : "bg-green-500"} style={{ position: 'absolute', left: s.x * TILE_SIZE, top: s.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, opacity: 1 - i * 0.05 }} />)}
                    {aiSnake.map((s, i) => <div key={`a-${i}`} className="bg-red-500" style={{ position: 'absolute', left: s.x * TILE_SIZE, top: s.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, opacity: 1 - i * 0.05 }} />)}
                    <div className={`${foodType === 'protective' ? 'bg-blue-400' : 'bg-yellow-400'} rounded-full`} style={{ position: 'absolute', left: food.x * TILE_SIZE, top: food.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} />
                </div>
                
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-yellow-400">{gameOver}</h2>
                        <p className="text-xl mt-2">Level {level} | Total Score: {score} EXP</p>
                        <div className="mt-4 space-y-2">
                            {gameOver.includes('You Win') && level < MAX_LEVEL && (
                                <button onClick={() => resetGame(level + 1)} className="pixel-border p-2 w-48 hover:bg-green-400 hover:text-black">
                                    Next Level
                                </button>
                            )}
                            {gameOver.includes('You Lose') && (
                                <button onClick={() => resetGame(level)} className="pixel-border p-2 w-48 hover:bg-yellow-400 hover:text-black">
                                    Try Again
                                </button>
                            )}
                             {gameOver.includes('You Win') && level >= MAX_LEVEL && (
                                <p className="text-lime-400">You beat the master AI!</p>
                            )}
                            <button onClick={() => onGameEnd(score)} className="pixel-border p-2 w-48 hover:bg-gray-700">
                                Back to Training
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-2 text-center">
              <p className="text-lg">Level: {level}/{MAX_LEVEL} | Score: {score}</p>
              {playerProtectionTimer > 0 && <p className="text-lg text-cyan-400 flicker">PROTECTED!</p>}
            </div>
            <p className="mt-1 text-sm">Eat yellow food for points, blue for protection. Don't crash!</p>
        </div>
    );
};

export default NibblesGame;