import React, { useState, useEffect, useCallback, useRef } from 'react';

const WIDTH = 500;
const HEIGHT = 300;
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 60;
const BALL_RADIUS = 8;
const WINNING_SCORE = 5;
const MAX_LEVEL = 12;
const POWERUP_SIZE = 12;
const POWERUP_DURATION = 300; // 5 seconds at 60fps

type PowerUpType = 'growPlayer' | 'shrinkAI' | 'fastBall' | 'slowAI';
interface PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
}

const PongGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [level, setLevel] = useState(1);
    const [ball, setBall] = useState({ x: WIDTH / 2, y: HEIGHT / 2, vx: 4, vy: 2 });
    const [playerY, setPlayerY] = useState(HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const [aiY, setAiY] = useState(HEIGHT / 2 - PADDLE_HEIGHT / 2);
    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAiScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [totalExp, setTotalExp] = useState(0);
    const [powerUp, setPowerUp] = useState<PowerUp | null>(null);
    const [activeEffects, setActiveEffects] = useState({ growPlayer: 0, shrinkAI: 0, fastBall: 0, slowAI: 0 });

    const gameLoopRef = useRef<number | null>(null);
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const powerUpSpawnTimerRef = useRef(300); // Spawn first powerup after 5s

    const resetBall = useCallback((direction: number) => {
        const baseSpeed = 4 + (level - 1) * 0.5;
        setBall({
            x: WIDTH / 2,
            y: HEIGHT / 2,
            vx: baseSpeed * direction,
            vy: (Math.random() * 4) - 2
        });
        setMessage(`Level ${level}`);
        setTimeout(() => setMessage(''), 1000);
    }, [level]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!gameAreaRef.current) return;
        const rect = gameAreaRef.current.getBoundingClientRect();
        const newY = e.clientY - rect.top - (activeEffects.growPlayer > 0 ? PADDLE_HEIGHT * 1.5 : PADDLE_HEIGHT) / 2;
        setPlayerY(Math.max(0, Math.min(HEIGHT - (activeEffects.growPlayer > 0 ? PADDLE_HEIGHT * 1.5 : PADDLE_HEIGHT), newY)));
    }, [activeEffects.growPlayer]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        // Update active effects
        setActiveEffects(prev => ({
            growPlayer: Math.max(0, prev.growPlayer - 1),
            shrinkAI: Math.max(0, prev.shrinkAI - 1),
            fastBall: Math.max(0, prev.fastBall - 1),
            slowAI: Math.max(0, prev.slowAI - 1)
        }));

        // Spawn power-ups
        powerUpSpawnTimerRef.current--;
        if (powerUpSpawnTimerRef.current <= 0 && !powerUp) {
            const powerUpTypes: PowerUpType[] = ['growPlayer', 'shrinkAI', 'fastBall', 'slowAI'];
            const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
            setPowerUp({
                type,
                x: WIDTH / 4 + Math.random() * (WIDTH / 2),
                y: HEIGHT / 4 + Math.random() * (HEIGHT / 2),
            });
            powerUpSpawnTimerRef.current = 600; // a new one every 10s
        }

        // Apply effects
        const playerPaddleHeight = activeEffects.growPlayer > 0 ? PADDLE_HEIGHT * 1.5 : PADDLE_HEIGHT;
        const aiPaddleHeight = activeEffects.shrinkAI > 0 ? PADDLE_HEIGHT * 0.5 : PADDLE_HEIGHT;
        const ballSpeedMultiplier = activeEffects.fastBall > 0 ? 1.5 : 1;
        const aiSpeed = (activeEffects.slowAI > 0 ? 1.8 : 3) + (level - 1) * 0.25;

        // Ball movement
        setBall(b => {
            let newBall = { ...b };
            newBall.x += newBall.vx * ballSpeedMultiplier;
            newBall.y += newBall.vy * ballSpeedMultiplier;

            if (newBall.y - BALL_RADIUS < 0 || newBall.y + BALL_RADIUS > HEIGHT) newBall.vy *= -1;

            const playerPaddle = { x: 10, y: playerY, width: PADDLE_WIDTH, height: playerPaddleHeight };
            const aiPaddle = { x: WIDTH - 10 - PADDLE_WIDTH, y: aiY, width: PADDLE_WIDTH, height: aiPaddleHeight };

            if (newBall.vx < 0 && newBall.x - BALL_RADIUS < playerPaddle.x + playerPaddle.width && newBall.x - BALL_RADIUS > playerPaddle.x && newBall.y > playerPaddle.y && newBall.y < playerPaddle.y + playerPaddle.height) {
                newBall.vx *= -1.1;
                let deltaY = newBall.y - (playerPaddle.y + playerPaddle.height / 2);
                newBall.vy = deltaY * 0.2;
            }
            if (newBall.vx > 0 && newBall.x + BALL_RADIUS > aiPaddle.x && newBall.x + BALL_RADIUS < aiPaddle.x + aiPaddle.width && newBall.y > aiPaddle.y && newBall.y < aiPaddle.y + aiPaddle.height) {
                newBall.vx *= -1.1;
                let deltaY = newBall.y - (aiPaddle.y + aiPaddle.height / 2);
                newBall.vy = deltaY * 0.2;
            }

            if (powerUp) {
                const dist = Math.hypot(newBall.x - powerUp.x, newBall.y - powerUp.y);
                if (dist < BALL_RADIUS + POWERUP_SIZE) {
                    setActiveEffects(prev => ({ ...prev, [powerUp.type]: POWERUP_DURATION }));
                    setMessage(`${powerUp.type.replace(/([A-Z])/g, ' $1').toUpperCase()}!`);
                    setTimeout(() => setMessage(''), 1500);
                    setPowerUp(null);
                }
            }

            if (newBall.x + BALL_RADIUS < 0) {
                setAiScore(s => s + 1);
                resetBall(1);
            } else if (newBall.x - BALL_RADIUS > WIDTH) {
                setPlayerScore(s => s + 1);
                resetBall(-1);
            }

            return newBall;
        });

        setAiY(currentAiY => {
            const paddleCenter = currentAiY + aiPaddleHeight / 2;
            const diff = ball.y - paddleCenter;
            const reactionThreshold = 10 - Math.min(8, level); // AI gets more reactive at higher levels
            if (Math.abs(diff) > reactionThreshold) {
                let newAiY = currentAiY + Math.sign(diff) * aiSpeed;
                return Math.max(0, Math.min(HEIGHT - aiPaddleHeight, newAiY));
            }
            return currentAiY;
        });

    }, [gameOver, playerY, aiY, ball.y, resetBall, powerUp, activeEffects, level]);

    useEffect(() => {
        gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60);
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        };
    }, [gameLoop]);

    useEffect(() => {
        if (playerScore >= WINNING_SCORE) {
            const expGained = 10 + level * 5;
            setTotalExp(e => e + expGained);
            if (level + 1 > MAX_LEVEL) {
                setMessage('You beat all levels!');
                setGameOver(true);
            } else {
                setMessage(`Level ${level} Cleared!`);
                setTimeout(() => {
                    setLevel(l => l + 1);
                    setPlayerScore(0);
                    setAiScore(0);
                    resetBall(1);
                }, 2000);
            }
        } else if (aiScore >= WINNING_SCORE) {
            setMessage(`You lost level ${level}. Try again!`);
            setTimeout(() => {
                setPlayerScore(0);
                setAiScore(0);
                resetBall(1);
            }, 2000);
        }
    }, [playerScore, aiScore, level, resetBall]);

    const getPowerUpColor = (type: PowerUpType) => {
        switch (type) {
            case 'growPlayer': return 'lime';
            case 'shrinkAI': return 'red';
            case 'fastBall': return 'cyan';
            case 'slowAI': return 'purple';
        }
    }

    const playerPaddleHeight = activeEffects.growPlayer > 0 ? PADDLE_HEIGHT * 1.5 : PADDLE_HEIGHT;
    const aiPaddleHeight = activeEffects.shrinkAI > 0 ? PADDLE_HEIGHT * 0.5 : PADDLE_HEIGHT;

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Slime Pong</h4>
            <div 
                ref={gameAreaRef}
                className="pixel-border bg-black relative cursor-none" 
                style={{ width: WIDTH, height: HEIGHT }}
                onMouseMove={handleMouseMove}
            >
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="h-2 w-1 bg-gray-600 my-2"></div>
                    ))}
                </div>
                
                <div className="bg-cyan-400" style={{ position: 'absolute', left: 10, top: playerY, width: PADDLE_WIDTH, height: playerPaddleHeight, transition: 'height 0.3s' }} />
                <div className="bg-red-500" style={{ position: 'absolute', right: 10, top: aiY, width: PADDLE_WIDTH, height: aiPaddleHeight, transition: 'height 0.3s' }} />

                <div className="bg-yellow-400" style={{ position: 'absolute', left: ball.x - BALL_RADIUS, top: ball.y - BALL_RADIUS, width: BALL_RADIUS * 2, height: BALL_RADIUS * 2, borderRadius: '50%' }} />

                {powerUp && (
                    <div className="rounded-full animate-pulse" style={{ position: 'absolute', left: powerUp.x - POWERUP_SIZE, top: powerUp.y - POWERUP_SIZE, width: POWERUP_SIZE * 2, height: POWERUP_SIZE * 2, backgroundColor: getPowerUpColor(powerUp.type), boxShadow: `0 0 10px ${getPowerUpColor(powerUp.type)}` }} />
                )}

                <div className="absolute top-4 left-1/4 text-5xl opacity-50">{playerScore}</div>
                <div className="absolute top-4 right-1/4 text-5xl opacity-50">{aiScore}</div>

                {(gameOver || message) && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-yellow-400 flicker">{message}</h2>
                        {gameOver && (
                            <>
                                <p className="text-xl mt-2">Final Score: {playerScore} - {aiScore}</p>
                                <button onClick={() => onGameEnd(totalExp)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                                    Back to Training (Total EXP: {totalExp})
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-between w-full text-lg mt-2 px-1" style={{maxWidth: WIDTH}}>
                <span>Level: {level}/{MAX_LEVEL}</span>
                <span>EXP: {totalExp}</span>
            </div>
            <p className="mt-1 text-sm">Move mouse to control your paddle</p>
        </div>
    );
};

export default PongGame;