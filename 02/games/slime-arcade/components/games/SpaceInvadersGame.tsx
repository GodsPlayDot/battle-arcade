import React, { useState, useEffect, useCallback, useRef } from 'react';

const WIDTH = 440;
const HEIGHT = 400;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 20;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 11;
const ALIEN_SIZE = 20;
const SHIELD_BLOCK_SIZE = 5;

// Interfaces for game objects
interface GameObject { x: number; y: number; }
interface Alien extends GameObject { alive: boolean; row: number; }
interface Bullet extends GameObject { owner: 'player' | 'alien'; }
interface ShieldBlock extends GameObject { hp: number; }
interface Ufo extends GameObject { alive: boolean; direction: 1 | -1; }


const createInitialAliens = (): Alien[] => {
    const initialAliens: Alien[] = [];
    for (let row = 0; row < ALIEN_ROWS; row++) {
        for (let col = 0; col < ALIEN_COLS; col++) {
            initialAliens.push({
                x: col * (ALIEN_SIZE + 15) + 30,
                y: row * (ALIEN_SIZE + 10) + 30,
                alive: true,
                row: row, // Store row for scoring
            });
        }
    }
    return initialAliens;
};

const createInitialShields = (): ShieldBlock[] => {
    const shields: ShieldBlock[] = [];
    const shieldPattern = [
        [0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1],
        [1, 1, 0, 0, 0, 1, 1],
        [1, 0, 0, 0, 0, 0, 1]
    ];
    const shieldBaseY = HEIGHT - 90;
    const shieldCount = 4;

    for (let i = 0; i < shieldCount; i++) {
        const shieldBaseX = (WIDTH / (shieldCount + 0.8)) * (i + 0.5) - (shieldPattern[0].length * SHIELD_BLOCK_SIZE / 2);
        shieldPattern.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell === 1) {
                    shields.push({
                        x: shieldBaseX + c * SHIELD_BLOCK_SIZE,
                        y: shieldBaseY + r * SHIELD_BLOCK_SIZE,
                        hp: 3, // Each block can take 3 hits
                    });
                }
            });
        });
    }
    return shields;
}

const SpaceInvadersGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [player, setPlayer] = useState<GameObject>({ x: WIDTH / 2 - PLAYER_WIDTH / 2, y: HEIGHT - 30 });
    const [aliens, setAliens] = useState<Alien[]>(createInitialAliens());
    const [shields, setShields] = useState<ShieldBlock[]>(createInitialShields());
    const [ufo, setUfo] = useState<Ufo | null>(null);
    const [alienDirection, setAlienDirection] = useState(1);
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [keys, setKeys] = useState<Record<string, boolean>>({});
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [gameOver, setGameOver] = useState(false);
    const gameLoopRef = useRef<number | null>(null);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault();
        setKeys(prev => ({ ...prev, [e.key]: true }));
        if (e.key === ' ' && !e.repeat) {
            setBullets(prev => {
                if (prev.some(b => b.owner === 'player')) return prev; // Only one player bullet at a time
                return [...prev, { x: player.x + PLAYER_WIDTH / 2 - 2, y: player.y, owner: 'player' }];
            });
        }
    }, [player]);
    const handleKeyUp = useCallback((e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key]: false })), []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        // 1. PLAYER MOVEMENT
        let nextPlayerX = player.x;
        if (keys['ArrowLeft']) nextPlayerX -= 5;
        if (keys['ArrowRight']) nextPlayerX += 5;
        const finalPlayerX = Math.max(0, Math.min(WIDTH - PLAYER_WIDTH, nextPlayerX));
        
        // 2. UFO LOGIC
        let nextUfo = ufo;
        if (nextUfo) {
            nextUfo.x += 2 * nextUfo.direction;
            if (nextUfo.x > WIDTH + 30 || nextUfo.x < -60) nextUfo = null;
        } else if (Math.random() < 0.001) {
            const direction = Math.random() < 0.5 ? 1 : -1;
            nextUfo = { x: direction === 1 ? -30 : WIDTH, y: 15, alive: true, direction };
        }

        // 3. ALIEN MOVEMENT
        let nextAliens = [...aliens];
        const livingAliens = nextAliens.filter(a => a.alive);
        if (livingAliens.length === 0 && nextAliens.length > 0) { setGameOver(true); return; }
        
        const speed = 0.5 + (ALIEN_ROWS * ALIEN_COLS - livingAliens.length) * 0.025; // Slower speed increase
        let edgeReached = false;
        livingAliens.forEach(a => {
            if ((a.x + ALIEN_SIZE >= WIDTH && alienDirection > 0) || (a.x <= 0 && alienDirection < 0)) edgeReached = true;
        });

        let nextAlienDirection = alienDirection;
        if (edgeReached) {
            nextAlienDirection *= -1;
            nextAliens = nextAliens.map(a => ({ ...a, y: a.y + 8 })); // Slower descent
        } else {
            nextAliens = nextAliens.map(a => a.alive ? { ...a, x: a.x + speed * alienDirection } : a);
        }
        
        // 4. BULLET MOVEMENT
        let nextBullets = bullets.map(b => ({ ...b, y: b.y + (b.owner === 'player' ? -8 : 4) }));

        // 5. COLLISION DETECTION
        let scoreToAdd = 0;
        let nextShields = [...shields];
        
        const uncollidedBullets: Bullet[] = [];
        for (const b of nextBullets) {
            let collided = false;
            
            // Bullet vs Shield
            for (let i = 0; i < nextShields.length; i++) {
                const block = nextShields[i];
                if (b.x > block.x && b.x < block.x + SHIELD_BLOCK_SIZE && b.y > block.y && b.y < block.y + SHIELD_BLOCK_SIZE) {
                    nextShields[i] = { ...block, hp: block.hp - 1 };
                    collided = true;
                    break;
                }
            }
            nextShields = nextShields.filter(block => block.hp > 0);
            if (collided) continue;

            // Player Bullet vs Alien/UFO
            if (b.owner === 'player') {
                for (let i = 0; i < nextAliens.length; i++) {
                    const a = nextAliens[i];
                    if (a.alive && b.x > a.x && b.x < a.x + ALIEN_SIZE && b.y > a.y && b.y < a.y + ALIEN_SIZE) {
                        nextAliens[i] = { ...a, alive: false };
                        scoreToAdd += (5 - a.row) * 10;
                        collided = true;
                        break;
                    }
                }
                if (collided) continue;

                if (nextUfo?.alive && b.x > nextUfo.x && b.x < nextUfo.x + 30 && b.y > nextUfo.y && b.y < nextUfo.y + 15) {
                    nextUfo = { ...nextUfo, alive: false };
                    scoreToAdd += [50, 100, 150][Math.floor(Math.random() * 3)];
                    collided = true;
                }
            } 
            // Alien Bullet vs Player
            else {
                if (b.x > finalPlayerX && b.x < finalPlayerX + PLAYER_WIDTH && b.y > player.y && b.y < player.y + PLAYER_HEIGHT) {
                    if (lives - 1 <= 0) {
                        setGameOver(true);
                    } else {
                        setLives(l => l - 1);
                        // Reset player position temporarily for safety
                        setPlayer({ x: WIDTH / 2 - PLAYER_WIDTH / 2, y: HEIGHT - 30 });
                    }
                    collided = true;
                }
            }

            if (!collided && b.y > 0 && b.y < HEIGHT) uncollidedBullets.push(b);
        }
        
        // 6. ALIENS SHOOT
        const currentLivingAliens = nextAliens.filter(a => a.alive);
        if (currentLivingAliens.length > 0 && Math.random() < 0.015) { // Slower fire rate
            const shooter = currentLivingAliens[Math.floor(Math.random() * currentLivingAliens.length)];
            uncollidedBullets.push({ x: shooter.x + ALIEN_SIZE / 2, y: shooter.y + ALIEN_SIZE, owner: 'alien' });
        }
        
        // 7. CHECK LOSE CONDITION
        if (nextAliens.some(a => a.alive && a.y + ALIEN_SIZE >= HEIGHT - 50)) {
            setGameOver(true);
        }
        
        // 8. UPDATE STATE
        setPlayer({ ...player, x: finalPlayerX });
        setUfo(nextUfo);
        setAliens(nextAliens);
        setBullets(uncollidedBullets);
        setShields(nextShields);
        setAlienDirection(nextAlienDirection);
        if (scoreToAdd > 0) setScore(s => s + scoreToAdd);

    }, [gameOver, player, aliens, alienDirection, bullets, shields, ufo, keys, lives]);

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
            <h4 className="text-xl mb-2">Advanced Training: Space Invaders</h4>
            <div className="pixel-border bg-black relative" style={{ width: WIDTH, height: HEIGHT }}>
                {aliens.map((a, i) => a.alive && <div key={i} className="text-green-400" style={{ position: 'absolute', left: a.x, top: a.y, width: ALIEN_SIZE, height: ALIEN_SIZE }}>{'<o>'}</div>)}
                {ufo?.alive && <div className="text-red-500 font-bold" style={{ position: 'absolute', left: ufo.x, top: ufo.y, width: 30, height: 15 }}>{'<@@>'}</div>}
                
                {shields.map((block, i) => (
                     <div key={i} className="bg-green-600" style={{ position: 'absolute', left: block.x, top: block.y, width: SHIELD_BLOCK_SIZE, height: SHIELD_BLOCK_SIZE, opacity: block.hp / 3 }} />
                ))}

                <div className="bg-cyan-400" style={{ position: 'absolute', left: player.x, top: player.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }} />
                {bullets.map((b, i) => (
                    <div key={i} className={b.owner === 'player' ? 'bg-yellow-300' : 'bg-red-500'} style={{ position: 'absolute', left: b.x, top: b.y, width: 4, height: 10 }} />
                ))}
                {gameOver && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-red-500">{aliens.filter(a=>a.alive).length === 0 ? "YOU WIN!" : "GAME OVER"}</h2>
                        <p className="text-xl mt-2">Final Score: {score} EXP</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200">
                            Back to Training
                        </button>
                    </div>
                )}
            </div>
             <div className="flex justify-between w-full text-lg mt-2 px-1" style={{maxWidth: WIDTH}}>
                <span>Score: {score}</span>
                <span>Lives: {lives}</span>
            </div>
            <p className="mt-1 text-sm">Arrows to move, Space to shoot</p>
        </div>
    );
};

export default SpaceInvadersGame;