import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 19;
const TILE_SIZE = 20;
const MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,0,1,0,1,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
const TOTAL_FLAGS = 10;

const createInitialFlags = () => {
    const flagPositions: {x:number, y:number}[] = [];
    while(flagPositions.length < TOTAL_FLAGS) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        if (MAP[y]?.[x] === 0 && !flagPositions.some(f => f.x === x && f.y === y)) {
            flagPositions.push({ x, y });
        }
    }
    return flagPositions;
};

const RallyRacerGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [player, setPlayer] = useState({ x: 9, y: 17 });
    const [enemies, setEnemies] =useState([{ x: 1, y: 1 }, { x: 17, y: 1 }]);
    const [flags, setFlags] = useState<{x:number, y:number}[]>(createInitialFlags());
    const [fuel, setFuel] = useState(200);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const gameLoopRef = useRef<number | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameOver) return;
        e.preventDefault();
        setPlayer(p => {
            let { x, y } = p;
            switch (e.key) {
                case 'ArrowUp': y--; break;
                case 'ArrowDown': y++; break;
                case 'ArrowLeft': x--; break;
                case 'ArrowRight': x++; break;
            }
            if (x < 0) x = GRID_SIZE - 1; if (x >= GRID_SIZE) x = 0; // Screen wrap
            if (MAP[y]?.[x] !== 1) return { x, y };
            return p;
        });
    }, [gameOver]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        // Enemy Movement (simple chase)
        setEnemies(prevEnemies => prevEnemies.map(enemy => {
            const moves = [];
            if (MAP[enemy.y-1]?.[enemy.x] !== 1) moves.push({ x: 0, y: -1 });
            if (MAP[enemy.y+1]?.[enemy.x] !== 1) moves.push({ x: 0, y: 1 });
            if (MAP[enemy.y]?.[enemy.x-1] !== 1) moves.push({ x: -1, y: 0 });
            if (MAP[enemy.y]?.[enemy.x+1] !== 1) moves.push({ x: 1, y: 0 });
            
            if (moves.length > 0) {
                 moves.forEach((m: any) => { m.dist = Math.hypot((enemy.x + m.x) - player.x, (enemy.y + m.y) - player.y); });
                 moves.sort((a: any, b: any) => a.dist - b.dist);
                 return { x: enemy.x + moves[0].x, y: enemy.y + moves[0].y };
            }
            return enemy;
        }));

        // Collision
        if (enemies.some(e => e.x === player.x && e.y === player.y)) {
             setFuel(f => Math.max(0, f - 20)); // Penalty
        }
        
        const remainingFlags = flags.filter(f => {
            if (f.x === player.x && f.y === player.y) {
                setScore(s => s + 3);
                return false;
            }
            return true;
        });
        setFlags(remainingFlags);

        // Game state
        setFuel(f => f - 0.1);
        if (fuel <= 0 || (remainingFlags.length === 0 && flags.length > 0)) {
            setGameOver(true);
            if (remainingFlags.length === 0) setScore(s => s + 30); // bonus
        }

    }, [gameOver, player, enemies, flags, fuel]);

    useEffect(() => {
        gameLoopRef.current = window.setInterval(gameLoop, 200);
        return () => {
            if (gameLoopRef.current) {
                window.clearInterval(gameLoopRef.current);
            }
        };
    }, [gameLoop]);

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Rally Racer</h4>
            <div className="pixel-border bg-gray-600 relative" style={{ width: GRID_SIZE * TILE_SIZE, height: GRID_SIZE * TILE_SIZE }}>
                 <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE}px)` }}>
                    {MAP.map((row, y) => row.map((cell, x) => (
                        <div key={`${y}-${x}`} style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: cell === 1 ? '#333' : '#666' }} />
                    )))}
                </div>
                 {flags.map((f, i) => <div key={i} className="text-yellow-300 text-center" style={{ position: 'absolute', left: f.x*TILE_SIZE, top: f.y*TILE_SIZE }}>F</div>)}
                 {enemies.map((e, i) => <div key={i} className="bg-red-600" style={{ position: 'absolute', left: e.x*TILE_SIZE, top: e.y*TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}/>)}
                 <div className="bg-blue-500" style={{ position: 'absolute', left: player.x*TILE_SIZE, top: player.y*TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}/>
                 
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-red-500">{fuel > 0 ? "LEVEL CLEAR!" : "OUT OF FUEL!"}</h2>
                        <p className="text-xl mt-2">Final Score: {score} EXP</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                            Back to Training
                        </button>
                    </div>
                )}
            </div>
             <div className="w-full mt-2" style={{maxWidth: GRID_SIZE * TILE_SIZE}}>
                <div className="flex justify-between w-full text-lg px-1">
                    <span>Score: {score}</span>
                    <span>Flags: {flags.length}</span>
                </div>
                <div className="w-full bg-gray-700 border-2 border-current mt-1">
                    <div className="h-3 bg-orange-500" style={{ width: `${(fuel/200)*100}%`}}></div>
                </div>
            </div>
            <p className="mt-1 text-sm">Use Arrow Keys to Move</p>
        </div>
    );
};

export default RallyRacerGame;