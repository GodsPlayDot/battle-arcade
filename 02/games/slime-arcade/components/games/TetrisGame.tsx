import React, { useState, useEffect, useCallback } from 'react';

const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const TILE_SIZE = 20; // in pixels
const LINES_PER_LEVEL = 10;
const MAX_LEVEL = 12;

const TETROMINOES = {
    'I': { shape: [[1, 1, 1, 1]], color: 'cyan' },
    'J': { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
    'L': { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' },
    'O': { shape: [[1, 1], [1, 1]], color: 'yellow' },
    'S': { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' },
    'T': { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
    'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
};
const TETROMINO_KEYS = Object.keys(TETROMINOES);

const createEmptyGrid = () => Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill({ value: 0, color: 'black' }));

interface TetrisGameProps {
    onGameEnd: (score: number) => void;
}

const TetrisGame: React.FC<TetrisGameProps> = ({ onGameEnd }) => {
    const [grid, setGrid] = useState(createEmptyGrid());
    const [player, setPlayer] = useState({
        pos: { x: 0, y: 0 },
        tetromino: TETROMINOES['I'].shape,
        color: 'cyan',
    });
    const [score, setScore] = useState(0);
    const [level, setLevel] = useState(1);
    const [linesClearedThisLevel, setLinesClearedThisLevel] = useState(0);
    const [totalLinesCleared, setTotalLinesCleared] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isWin, setIsWin] = useState(false);
    const [dropTime, setDropTime] = useState(1000);

    const checkCollision = (playerPiece: typeof player, gameGrid: typeof grid, move = { x: 0, y: 0 }) => {
        for (let y = 0; y < playerPiece.tetromino.length; y++) {
            for (let x = 0; x < playerPiece.tetromino[y].length; x++) {
                if (playerPiece.tetromino[y][x] !== 0) {
                    const newY = playerPiece.pos.y + y + move.y;
                    const newX = playerPiece.pos.x + x + move.x;
                    if (
                        !gameGrid[newY] || // outside height
                        !gameGrid[newY][newX] || // outside width
                        gameGrid[newY][newX].value !== 0 // collision with other pieces
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    };

    const resetPlayer = useCallback((currentGrid: typeof grid) => {
        const key = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
        const tetromino = TETROMINOES[key as keyof typeof TETROMINOES];
        const newPlayer = {
            pos: { x: Math.floor(GRID_WIDTH / 2) - 1, y: 0 },
            tetromino: tetromino.shape,
            color: tetromino.color,
        };
        if (checkCollision(newPlayer, currentGrid)) {
            setGameOver(true);
            setIsWin(false);
        } else {
            setPlayer(newPlayer);
        }
    }, []);

    useEffect(() => {
        resetPlayer(grid);
    }, []);

    const updatePlayerPos = useCallback((move: { x: number, y: number }) => {
        if (!checkCollision(player, grid, move)) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x + move.x, y: prev.pos.y + move.y } }));
        }
    }, [player, grid]);

    const drop = useCallback(() => {
        if (!checkCollision(player, grid, { x: 0, y: 1 })) {
            setPlayer(prev => ({ ...prev, pos: { x: prev.pos.x, y: prev.pos.y + 1 } }));
        } else {
            const newGrid = JSON.parse(JSON.stringify(grid));
            player.tetromino.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        const gridY = player.pos.y + y;
                        const gridX = player.pos.x + x;
                        if (gridY >= 0 && gridY < GRID_HEIGHT) {
                           newGrid[gridY][gridX] = { value: 1, color: player.color };
                        }
                    }
                });
            });

            let clearedLinesCount = 0;
            const gridAfterClear = newGrid.filter((row: any[]) => !row.every((cell: {value: number}) => cell.value !== 0));
            clearedLinesCount = GRID_HEIGHT - gridAfterClear.length;
            
            while (gridAfterClear.length < GRID_HEIGHT) {
                gridAfterClear.unshift(Array(GRID_WIDTH).fill({ value: 0, color: 'black' }));
            }
            
            if (clearedLinesCount > 0) {
                setScore(s => s + [0, 40, 100, 300, 1200][clearedLinesCount] * level);
                setTotalLinesCleared(l => l + clearedLinesCount);
                const newLinesThisLevel = linesClearedThisLevel + clearedLinesCount;
                
                if (newLinesThisLevel >= LINES_PER_LEVEL) {
                    const nextLevel = level + 1;
                    if (nextLevel > MAX_LEVEL) {
                        setIsWin(true);
                        setGameOver(true);
                    } else {
                        setLevel(nextLevel);
                        setLinesClearedThisLevel(0);
                        setDropTime(t => Math.max(100, t * 0.85));
                    }
                } else {
                    setLinesClearedThisLevel(newLinesThisLevel);
                }
            }

            setGrid(gridAfterClear);
            resetPlayer(gridAfterClear);
        }
    }, [player, grid, resetPlayer, level, linesClearedThisLevel]);
    
    const hardDrop = useCallback(() => {
       let y = 0;
       while(!checkCollision(player, grid, {x: 0, y: y + 1})){
           y++;
       }
       setPlayer(prev => ({...prev, pos: {x: prev.pos.x, y: prev.pos.y + y}}));
    }, [player, grid]);
    
    useEffect(() => {
      const isHardDropping = checkCollision(player, grid, {x:0, y:1});
      const dropTimeout = setTimeout(() => {
          if(isHardDropping) drop();
      }, 0);
      return () => clearTimeout(dropTimeout);
    }, [player.pos.y, drop, grid]);

    const rotatePlayer = useCallback(() => {
        const clonedPlayer = JSON.parse(JSON.stringify(player));
        const { tetromino } = clonedPlayer;
        const rotated = tetromino[0].map((_: any, colIndex: number) => tetromino.map((row: any[]) => row[colIndex]).reverse());
        clonedPlayer.tetromino = rotated;

        let offset = 1;
        while(checkCollision(clonedPlayer, grid)){
            clonedPlayer.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if(offset > clonedPlayer.tetromino[0].length + 1) return;
        }
        setPlayer(clonedPlayer);
    }, [player, grid]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameOver) return;
        e.preventDefault();
        switch (e.key) {
            case 'ArrowLeft': updatePlayerPos({ x: -1, y: 0 }); break;
            case 'ArrowRight': updatePlayerPos({ x: 1, y: 0 }); break;
            case 'ArrowDown': drop(); break;
            case 'ArrowUp': rotatePlayer(); break;
            case ' ': hardDrop(); break;
        }
    }, [gameOver, drop, hardDrop, rotatePlayer, updatePlayerPos]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    useEffect(() => {
        if(gameOver) return;
        const interval = setInterval(drop, dropTime);
        return () => clearInterval(interval);
    }, [drop, dropTime, gameOver]);

    const displayGrid = JSON.parse(JSON.stringify(grid));
    if (!gameOver) {
        player.tetromino.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const gridY = player.pos.y + y;
                    const gridX = player.pos.x + x;
                    if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < GRID_WIDTH) {
                      displayGrid[gridY][gridX] = { value, color: player.color };
                    }
                }
            });
        });
    }

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Slime Tetris</h4>
            <div className="pixel-border bg-black relative" style={{ width: GRID_WIDTH * TILE_SIZE, height: GRID_HEIGHT * TILE_SIZE }}>
                 <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_WIDTH}, ${TILE_SIZE}px)`, gridTemplateRows: `repeat(${GRID_HEIGHT}, ${TILE_SIZE}px)`}}>
                    {displayGrid.map((row: any[], y: number) => row.map((cell: {color: string; value: number}, x: number) => (
                        <div key={`${y}-${x}`} style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: cell.color, border: cell.value ? '1px solid #333' : 'none' }} />
                    )))}
                </div>
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        {isWin ? (
                            <h2 className="text-3xl text-yellow-400">YOU WIN! All 12 levels cleared!</h2>
                        ) : (
                            <h2 className="text-3xl text-red-500">GAME OVER</h2>
                        )}
                        <p className="text-xl mt-2">Final Score: {score} EXP</p>
                        <p className="text-sm mt-1">Total Lines Cleared: {totalLinesCleared}</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                            Back to Training
                        </button>
                    </div>
                )}
            </div>
            <div className="flex justify-between w-full text-lg mt-2 px-1" style={{maxWidth: GRID_WIDTH * TILE_SIZE}}>
                <span>Score: {score}</span>
                <span>Level: {level > MAX_LEVEL ? MAX_LEVEL : level}</span>
                <span>Lines: {linesClearedThisLevel}/{LINES_PER_LEVEL}</span>
            </div>
            <p className="mt-1 text-sm">Arrows to move/rotate, Space to drop</p>
        </div>
    );
};

export default TetrisGame;