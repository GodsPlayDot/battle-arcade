import React, { useState, useEffect, useCallback, useRef } from 'react';

const WIDTH = 400;
const HEIGHT = 400;
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 6;
const BRICK_COLS = 8;
const BRICK_WIDTH = WIDTH / BRICK_COLS;
const BRICK_HEIGHT = 20;

interface Ball { x: number; y: number; vx: number; vy: number; }
interface Brick { x: number; y: number; alive: boolean; }

const createInitialBricks = () => {
    const initialBricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
            initialBricks.push({ x: c * BRICK_WIDTH, y: r * BRICK_HEIGHT + 40, alive: true });
        }
    }
    return initialBricks;
};

const BreakoutGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [paddleX, setPaddleX] = useState(WIDTH / 2 - PADDLE_WIDTH / 2);
    const [ball, setBall] = useState<Ball>({ x: WIDTH / 2, y: HEIGHT - 50, vx: 3, vy: -3 });
    const [bricks, setBricks] = useState<Brick[]>(createInitialBricks());
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const gameLoopRef = useRef<number | null>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPaddleX(Math.max(0, Math.min(WIDTH - PADDLE_WIDTH, e.clientX - rect.left - PADDLE_WIDTH / 2)));
    }, []);

    const resetBall = () => {
        setBall({ x: WIDTH / 2, y: HEIGHT - 50, vx: 3, vy: -3 });
    };

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        // Ball movement
        let newBall = { ...ball };
        newBall.x += newBall.vx;
        newBall.y += newBall.vy;

        // Wall collision
        if (newBall.x - BALL_RADIUS < 0 || newBall.x + BALL_RADIUS > WIDTH) newBall.vx *= -1;
        if (newBall.y - BALL_RADIUS < 0) newBall.vy *= -1;

        // Paddle collision
        if (newBall.y + BALL_RADIUS > HEIGHT - PADDLE_HEIGHT && newBall.x > paddleX && newBall.x < paddleX + PADDLE_WIDTH) {
            newBall.vy *= -1;
            // Add angle based on where it hits the paddle
            let deltaX = newBall.x - (paddleX + PADDLE_WIDTH / 2);
            newBall.vx = deltaX * 0.15;
        }

        // Brick collision
        let scoreToAdd = 0;
        const newBricks = bricks.map(brick => {
            if (brick.alive && newBall.x > brick.x && newBall.x < brick.x + BRICK_WIDTH && newBall.y > brick.y && newBall.y < brick.y + BRICK_HEIGHT) {
                newBall.vy *= -1;
                scoreToAdd += 1;
                return { ...brick, alive: false };
            }
            return brick;
        });
        setBricks(newBricks);
        
        if (scoreToAdd > 0) {
            setScore(s => s + scoreToAdd);
            // Speed up ball
            const speedMultiplier = 1.01;
            newBall.vx *= speedMultiplier;
            newBall.vy *= speedMultiplier;
        }

        // Lose life
        if (newBall.y + BALL_RADIUS > HEIGHT) {
            if (lives - 1 <= 0) {
                setGameOver(true);
            } else {
                setLives(l => l - 1);
                resetBall();
            }
        }
        
        // Win condition
        if (bricks.every(b => !b.alive) && bricks.length > 0) {
            setGameOver(true);
            setScore(s => s + 25); // bonus
        }
        
        setBall(newBall);
    }, [ball, paddleX, bricks, lives, gameOver]);

    useEffect(() => {
        gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60);
        return () => {
            if (gameLoopRef.current) {
                window.clearInterval(gameLoopRef.current);
            }
        };
    }, [gameLoop]);

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Breakout</h4>
            <div 
                className="pixel-border bg-black relative cursor-none" 
                style={{ width: WIDTH, height: HEIGHT }}
                onMouseMove={handleMouseMove}
            >
                {bricks.map((b, i) => b.alive && (
                    <div key={i} className="bg-green-500" style={{ position: 'absolute', left: b.x, top: b.y, width: BRICK_WIDTH - 2, height: BRICK_HEIGHT - 2, margin: 1 }} />
                ))}
                <div className="bg-yellow-400" style={{ position: 'absolute', left: ball.x - BALL_RADIUS, top: ball.y - BALL_RADIUS, width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, borderRadius: '50%' }} />
                <div className="bg-cyan-400" style={{ position: 'absolute', bottom: 0, left: paddleX, width: PADDLE_WIDTH, height: PADDLE_HEIGHT }} />
                
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-red-500">{lives > 0 ? "YOU WIN!" : "GAME OVER"}</h2>
                        <p className="text-xl mt-2">Final Score: {score} EXP</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                            Back to Training
                        </button>
                    </div>
                )}
            </div>
             <div className="flex justify-between w-full text-lg mt-2 px-1" style={{maxWidth: WIDTH}}>
                <span>Score: {score}</span>
                <span>Lives: {'❤️'.repeat(lives)}</span>
            </div>
            <p className="mt-1 text-sm">Move mouse to control paddle</p>
        </div>
    );
};

export default BreakoutGame;