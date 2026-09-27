import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 11;
const TILE_SIZE = 30;
const MAX_LEVEL = 12;

interface LaneConfig {
    type: 'safe' | 'river' | 'road';
    speed?: number;
    baseSize?: number;
    canDive?: boolean;
    obstacleType?: 'log' | 'turtle' | 'alligator';
}

const LANES: LaneConfig[] = [
    { type: 'safe' }, // Goal lane
    { type: 'river', speed: 1.2, baseSize: 4, obstacleType: 'alligator' },
    { type: 'river', speed: -1, baseSize: 3, canDive: true, obstacleType: 'turtle' },
    { type: 'river', speed: 2.5, baseSize: 2, obstacleType: 'log' },
    { type: 'safe' },
    { type: 'road', speed: -2, baseSize: 1 },
    { type: 'road', speed: 1, baseSize: 1 },
    { type: 'road', speed: -3, baseSize: 2 },
    { type: 'road', speed: 1.5, baseSize: 1 },
    { type: 'safe' }, // Start lane
];
const START_POS = { x: 5, y: 9 };

interface Frog { x: number; y: number; }
interface Obstacle { x: number; size: number; isDiving?: boolean; diveTimer?: number; type: 'log' | 'turtle' | 'alligator'; isWarning?: boolean; }
interface DeathAnimation { type: 'squash' | 'splash'; x: number; y: number; key: number; }

const JumpFrogGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [frog, setFrog] = useState<Frog>({ x: START_POS.x, y: START_POS.y });
    const [obstacles, setObstacles] = useState<Obstacle[][]>(LANES.map(() => []));
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [isHopping, setIsHopping] = useState(false);
    const [deathAnimation, setDeathAnimation] = useState<DeathAnimation | null>(null);

    const gameLoopRef = useRef<number | null>(null);
    const frogRef = useRef(frog);
    frogRef.current = frog;
    
    const resetFrog = useCallback(() => {
        setFrog({ x: START_POS.x, y: START_POS.y });
    }, []);

    const handleDeath = useCallback((type: 'squash' | 'splash') => {
        setDeathAnimation({ type, x: frogRef.current.x, y: frogRef.current.y, key: Date.now() });
        setTimeout(() => setDeathAnimation(null), 500);

        if (lives - 1 <= 0) {
            setGameOver(true);
            setMessage('GAME OVER');
        } else {
            setLives(l => l - 1);
            resetFrog();
        }
    }, [lives, resetFrog]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameOver || isHopping) return;
        e.preventDefault();

        setIsHopping(true);
        setTimeout(() => setIsHopping(false), 100);

        let newFrogPos = { ...frogRef.current };
        let moved = false;
        switch (e.key) {
            case 'ArrowUp': newFrogPos.y--; moved = true; break;
            case 'ArrowDown': newFrogPos.y++; moved = true; break;
            case 'ArrowLeft': newFrogPos.x--; moved = true; break;
            case 'ArrowRight': newFrogPos.x++; moved = true; break;
        }

        if (moved) {
            if (newFrogPos.x < 0 || newFrogPos.x >= GRID_SIZE || newFrogPos.y < 0 || newFrogPos.y >= LANES.length) {
                // Out of bounds, do nothing
            } else if (newFrogPos.y === 0) {
                const expGained = 100 + level * 10;
                setScore(s => s + expGained);
                 if (level >= MAX_LEVEL) { 
                    setMessage('You Win!'); 
                    setGameOver(true);
                 } else {
                    const nextLevel = level + 1;
                    setLevel(nextLevel);
                    setShowLevelUp(true);
                    setTimeout(() => setShowLevelUp(false), 1500);
                 }
                resetFrog();
            } else {
                setFrog(newFrogPos);
            }
        }
    }, [gameOver, isHopping, level, resetFrog]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        const levelSpeedMultiplier = 1 + (level - 1) * 0.04;
        const levelSizeMultiplier = 1 + (level - 1) * 0.03;
        
        // 1. Calculate the next state of all obstacles
        const nextObstacles = obstacles.map((lane, i) => {
            const laneInfo = LANES[i];
            if (laneInfo.type === 'safe') return [];
            
            let newLane = lane.map(obs => ({...obs, x: obs.x + (laneInfo.speed ?? 0) * levelSpeedMultiplier}));
            
            if (laneInfo.canDive) {
                newLane = newLane.map(obs => {
                    let newDiveTimer = (obs.diveTimer ?? 180) - 1;
                    let isDiving = obs.isDiving;
                    let isWarning = obs.isWarning;
                    if (newDiveTimer <= 0) {
                        isDiving = !isDiving;
                        newDiveTimer = isDiving ? 90 : 180;
                        isWarning = false;
                    } else if (newDiveTimer <= 60 && !isDiving) {
                        isWarning = true;
                    }
                    return { ...obs, diveTimer: newDiveTimer, isDiving, isWarning };
                });
            }

            // Spawning logic
            const lastObs = newLane[newLane.length - 1];
            const gap = TILE_SIZE * (5 + level * 0.1);
            const speed = laneInfo.speed ?? 0;
            if (speed > 0) { 
                if (newLane.length === 0 || lastObs.x > gap) { 
                    newLane.push({ x: -TILE_SIZE * 4, size: Math.floor(laneInfo.baseSize! * levelSizeMultiplier), type: laneInfo.obstacleType || 'log' }); 
                } 
            } else if (speed < 0) { 
                if (newLane.length === 0 || lastObs.x < GRID_SIZE * TILE_SIZE - gap) { 
                    const size = Math.floor(laneInfo.baseSize! * levelSizeMultiplier); 
                    newLane.push({ x: GRID_SIZE * TILE_SIZE + size, size, type: laneInfo.obstacleType || 'log' }); 
                } 
            }

            return newLane.filter(obs => obs.x < (GRID_SIZE + 5) * TILE_SIZE && obs.x > -5 * TILE_SIZE);
        });

        // 2. Calculate the frog's next position and check for collisions using the *new* obstacle state
        let nextFrog = { ...frogRef.current };
        let isDead = false;
        let deathType: 'squash' | 'splash' = 'splash';

        const currentLaneIndex = nextFrog.y;
        const currentLane = LANES[currentLaneIndex];
        const frogXpx = nextFrog.x * TILE_SIZE;

        if (currentLane.type === 'river') {
            let isSafeOnObject = false;
            for (const obs of nextObstacles[currentLaneIndex]) {
                if (!obs.isDiving && frogXpx + (TILE_SIZE / 2) > obs.x && frogXpx < obs.x + obs.size * TILE_SIZE - (TILE_SIZE / 2)) {
                    isSafeOnObject = true;
                    if (obs.type === 'alligator') {
                        const headPositionX = currentLane.speed! > 0 ? obs.x + (obs.size - 1) * TILE_SIZE : obs.x;
                        if (frogXpx + TILE_SIZE > headPositionX && frogXpx < headPositionX + TILE_SIZE) {
                            isSafeOnObject = false;
                            break;
                        }
                    }
                    nextFrog.x += (currentLane.speed! * levelSpeedMultiplier) / TILE_SIZE;
                    break;
                }
            }
            if (!isSafeOnObject) {
                isDead = true;
                deathType = 'splash';
            }
        } else if (currentLane.type === 'road') {
            if (nextObstacles[currentLaneIndex].some(car => frogXpx + TILE_SIZE > car.x && frogXpx < car.x + car.size * TILE_SIZE)) {
                isDead = true;
                deathType = 'squash';
            }
        }

        if (nextFrog.x * TILE_SIZE < -TILE_SIZE / 2 || nextFrog.x * TILE_SIZE > GRID_SIZE * TILE_SIZE - TILE_SIZE / 2) {
            isDead = true;
            deathType = currentLane.type === 'river' ? 'splash' : 'squash';
        }

        // 3. Commit all state updates
        setObstacles(nextObstacles);

        if (isDead) {
            if (!deathAnimation) { // Prevent multiple death triggers in one animation cycle
                handleDeath(deathType);
            }
        } else {
            setFrog(nextFrog);
        }
    }, [gameOver, level, obstacles, handleDeath, deathAnimation]);

    useEffect(() => {
        gameLoopRef.current = window.setInterval(gameLoop, 1000 / 30);
        return () => { if (gameLoopRef.current) window.clearInterval(gameLoopRef.current) };
    }, [gameLoop]);

    const renderObstacle = (obs: Obstacle, laneInfo: LaneConfig) => {
        const obsStyle: React.CSSProperties = {
            position: 'absolute',
            top: 0,
            left: 0,
            width: obs.size * TILE_SIZE,
            height: TILE_SIZE,
            transition: 'opacity 0.5s',
            opacity: obs.isDiving ? 0.3 : 1,
        };

        if (laneInfo.type === 'road') {
            return <div style={{...obsStyle, background: obs.size > 1 ? '#a0a0a0' : '#ffff00' }} />;
        }
        if (laneInfo.type === 'river') {
            if (obs.type === 'log') return <div style={{...obsStyle, background: '#8B4513'}} />;
            if (obs.type === 'turtle') return <div style={{...obsStyle, background: '#2E8B57', borderRadius: '50%', animation: obs.isWarning ? 'blink 0.5s infinite' : 'none' }} />;
            if (obs.type === 'alligator') {
                const headPos = laneInfo.speed! > 0 ? { right: 0 } : { left: 0 };
                return (
                    <div style={{...obsStyle, background: '#006400'}}>
                        <div style={{ position: 'absolute', ...headPos, top: 0, width: TILE_SIZE, height: TILE_SIZE, background: '#556B2F' }} />
                    </div>
                );
            }
        }
        return null;
    };
    
    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Jump Frog</h4>
            <div className="pixel-border bg-black relative" style={{ width: GRID_SIZE * TILE_SIZE, height: (LANES.length + 1) * TILE_SIZE }}>
                {LANES.map((lane, i) => { let color = '#333'; if (lane.type === 'road') color = '#444'; if (lane.type === 'river') color = '#114488'; return <div key={i} style={{ position: 'absolute', top: (i + 1) * TILE_SIZE, width: '100%', height: TILE_SIZE, background: color }} />; })}
                
                {obstacles.map((lane, i) => lane.map((obs, j) => (
                    <div key={`${i}-${j}`} style={{ position: 'absolute', top: (i + 1) * TILE_SIZE, left: obs.x, width: obs.size * TILE_SIZE, height: TILE_SIZE }}>
                        {renderObstacle(obs, LANES[i])}
                    </div>
                )))}
                
                {deathAnimation && ( <div key={deathAnimation.key} className={deathAnimation.type === 'squash' ? 'squash-animation' : 'splash-animation'} style={{ position: 'absolute', left: deathAnimation.x * TILE_SIZE, top: (deathAnimation.y + 1) * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} /> )}
                
                {!deathAnimation && <div className={`flex items-center justify-center ${isHopping ? 'frog-hop' : ''}`} style={{ position: 'absolute', left: frog.x * TILE_SIZE, top: (frog.y + 1) * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, background: '#32CD32', borderRadius: '20%' }} />}
                
                {gameOver && ( 
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center transition-opacity duration-300"> 
                        <h2 className="text-3xl text-yellow-400 flicker">{message}</h2> 
                        <p className="text-xl mt-2">Final Score: {score} EXP</p> 
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200"> Back to Training </button>
                    </div> 
                )}
                 {showLevelUp && !gameOver && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none level-up-animation">
                        <h2 className="text-4xl text-yellow-400 flicker" style={{ textShadow: '2px 2px #000' }}>Level {level}!</h2>
                    </div>
                )}
            </div>
            <div className="flex justify-between w-full text-lg mt-4 px-1" style={{maxWidth: GRID_SIZE * TILE_SIZE}}> <span>Level: {level}/{MAX_LEVEL}</span> <span>Score: {score}</span> <span>Lives: {'❤️'.repeat(lives)}</span> </div>
        </div>
    );
};
export default JumpFrogGame;