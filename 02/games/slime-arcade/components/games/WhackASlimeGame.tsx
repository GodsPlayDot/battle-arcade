import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_SIZE = 9; // 3x3 grid
const MAX_LEVEL = 12;

type SlimeType = 'regular' | 'golden' | 'bomb';

interface Hole {
    id: number;
    state: 'empty' | 'up' | 'hit' | 'hiding';
    type: SlimeType;
    timeoutId?: number;
}

interface FloatingScore {
    id: number;
    value: number;
    holeIndex: number;
}

const LEVEL_CONFIG = Array.from({ length: MAX_LEVEL }, (_, i) => ({
    level: i + 1,
    targetScore: 15 + i * 5,
    timeLimit: 30, // seconds
    slimeUptime: { regular: Math.max(500, 1500 - i * 80), golden: Math.max(300, 1000 - i * 70), bomb: Math.max(600, 1600 - i * 80) },
    spawnInterval: Math.max(100, 700 - i * 45), // ms
}));

const KEY_MAP: { [key: string]: number } = {
    'Numpad7': 0, '7': 0,
    'Numpad8': 1, '8': 1,
    'Numpad9': 2, '9': 2,
    'Numpad4': 3, '4': 3,
    'Numpad5': 4, '5': 4,
    'Numpad6': 5, '6': 5,
    'Numpad1': 6, '1': 6,
    'Numpad2': 7, '2': 7,
    'Numpad3': 8, '3': 8,
};

const DISPLAY_KEY_MAP = [7, 8, 9, 4, 5, 6, 1, 2, 3];

const WhackASlimeGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [level, setLevel] = useState(1);
    const [holes, setHoles] = useState<Hole[]>(() => Array(GRID_SIZE).fill(null).map((_, i) => ({ id: i, state: 'empty', type: 'regular' })));
    const [score, setScore] = useState(0);
    const [levelScore, setLevelScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(LEVEL_CONFIG[0].timeLimit);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [floatingScores, setFloatingScores] = useState<FloatingScore[]>([]);

    const gameIntervalRef = useRef<number | null>(null);
    const timerIntervalRef = useRef<number | null>(null);

    const setupLevel = useCallback((lvl: number) => {
        const config = LEVEL_CONFIG[lvl - 1];
        if (!config) {
            setMessage(`You beat all ${MAX_LEVEL} levels!`);
            setGameOver(true);
            return;
        }

        setLevel(lvl);
        setLevelScore(0);
        setTimeLeft(config.timeLimit);
        setHoles(Array(GRID_SIZE).fill(null).map((_, i) => ({ id: i, state: 'empty', type: 'regular' })));
        setMessage(`Level ${lvl}`);
        setTimeout(() => setMessage(''), 1500);
        setGameOver(false);
    }, []);

    useEffect(() => {
        setupLevel(1);
    }, [setupLevel]);

    const handleWhack = useCallback((id: number) => {
        if (gameOver) return;
        
        setHoles(prevHoles => {
            const hole = prevHoles.find(h => h.id === id);
            if (hole && hole.state === 'up') {
                if (hole.timeoutId) clearTimeout(hole.timeoutId);
                
                let points = 0;
                switch(hole.type) {
                    case 'regular': points = 1; break;
                    case 'golden': points = 5; break;
                    case 'bomb': points = -3; break;
                }
                setLevelScore(s => Math.max(0, s + points));
                
                const newScoreId = Date.now();
                setFloatingScores(scores => [...scores.slice(-5), { id: newScoreId, value: points, holeIndex: id }]);
                setTimeout(() => setFloatingScores(scores => scores.filter(s => s.id !== newScoreId)), 1000);
    
                return prevHoles.map(h => h.id === id ? { ...h, state: 'hit', timeoutId: undefined } : h);
            }
            return prevHoles;
        });
    }, [gameOver]);
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (KEY_MAP[e.key] !== undefined) {
            e.preventDefault();
            handleWhack(KEY_MAP[e.key]);
        }
    }, [handleWhack]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const popUpSlime = useCallback(() => {
        setHoles(currentHoles => {
            const availableHoles = currentHoles.map((h, i) => h.state === 'empty' ? i : -1).filter(i => i !== -1);
            if (availableHoles.length === 0) return currentHoles;
    
            const randomIndex = availableHoles[Math.floor(Math.random() * availableHoles.length)];
            const rand = Math.random();
            const type: SlimeType = rand < 0.1 ? 'golden' : rand < 0.25 ? 'bomb' : 'regular';
            const uptime = LEVEL_CONFIG[level - 1].slimeUptime[type];
            
            const newHoles = [...currentHoles];

            const timeoutId = window.setTimeout(() => {
                setHoles(prev => prev.map(h => h.id === randomIndex ? { ...h, state: 'hiding', timeoutId: undefined } : h));
            }, uptime);

            newHoles[randomIndex] = { ...newHoles[randomIndex], state: 'up', type, timeoutId };
            return newHoles;
        });
    }, [level]);

    useEffect(() => {
        if (gameOver) {
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            holes.forEach(h => { if (h.timeoutId) clearTimeout(h.timeoutId); });
            return;
        }

        gameIntervalRef.current = window.setInterval(popUpSlime, LEVEL_CONFIG[level - 1].spawnInterval);
        timerIntervalRef.current = window.setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);

        return () => {
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            // Clear any lingering timeouts on unmount
            setHoles(currentHoles => {
                currentHoles.forEach(h => { if(h.timeoutId) clearTimeout(h.timeoutId); });
                return currentHoles;
            })
        };
    }, [gameOver, popUpSlime, level, holes]);

    useEffect(() => {
        if (timeLeft <= 0 && !gameOver) {
            setMessage("Time's Up!");
            setGameOver(true);
        }
    }, [timeLeft, gameOver]);

    useEffect(() => {
        const config = LEVEL_CONFIG[level - 1];
        if (!gameOver && levelScore >= config.targetScore) {
            const expGained = levelScore * level * 2;
            setScore(s => s + expGained);
             if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
             if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

            if (level + 1 > MAX_LEVEL) {
                setMessage('You win! All levels cleared!');
                setGameOver(true);
            } else {
                setMessage(`Level ${level} Cleared!`);
                setTimeout(() => setupLevel(level + 1), 2000);
            }
        }
    }, [levelScore, level, setupLevel, gameOver]);


    const SlimeVisual = ({type, state}: {type: SlimeType, state: Hole['state']}) => {
        let color = 'bg-green-500';
        let face = 'oo';
        if (type === 'golden') { color = 'bg-yellow-400'; face = '$$'; }
        if (type === 'bomb') { color = 'bg-gray-800'; face = '!!'; }
        
        let animationClass = '';
        if (state === 'up') animationClass = 'slime-up';
        if (state === 'hit') animationClass = 'slime-hit';
        if (state === 'hiding') animationClass = 'slime-hiding';

        return (
            <div className={`w-16 h-16 rounded-t-full relative ${color} ${animationClass}`}>
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-black font-bold text-sm">
                    {face}
                </div>
                 {type === 'bomb' && <div className="absolute top-0 right-1 w-1 h-4 bg-red-500 -rotate-45" />}
            </div>
        )
    };

    const config = LEVEL_CONFIG[level - 1];

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Slime Whack</h4>
            <div className="flex justify-between w-full text-lg mb-2 px-4" style={{maxWidth: '300px'}}>
                 <span>Level: {level}/{MAX_LEVEL}</span>
                 <span className={`transition-colors ${timeLeft <= 5 ? 'text-red-500 timer-pulse' : ''}`}>Time: {timeLeft}</span>
            </div>
             <div className="pixel-border bg-yellow-900 p-2 inline-grid grid-cols-3 gap-2" style={{width: '300px', height: '300px'}}>
                {holes.map(hole => (
                    <div key={hole.id} onClick={() => handleWhack(hole.id)} className="bg-black/50 border-4 border-yellow-800 rounded-full flex items-end justify-center cursor-pointer overflow-hidden relative">
                        <div className="absolute top-1 left-1 text-gray-600 text-lg font-bold select-none">{DISPLAY_KEY_MAP[hole.id]}</div>
                        {(hole.state === 'up' || hole.state === 'hit' || hole.state === 'hiding') && (
                            <SlimeVisual type={hole.type} state={hole.state} />
                        )}
                        {floatingScores.filter(fs => fs.holeIndex === hole.id).map(fs => (
                            <div key={fs.id} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold whack-score ${fs.value > 0 ? 'text-yellow-300' : 'text-red-500'}`} style={{textShadow: '1px 1px #000'}}>
                                {fs.value > 0 ? `+${fs.value}` : fs.value}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mt-4 text-center" style={{ minHeight: '100px' }}>
                <p className="text-xl mb-4">Score: {levelScore} / {config?.targetScore ?? 0}</p>
                 {gameOver && (
                    <div className="space-y-2">
                        <p className="text-2xl text-yellow-400 flicker">{message}</p>
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 w-64 hover:bg-gray-700 transition-colors duration-200">
                            Back to Training (Total EXP: {score})
                        </button>
                    </div>
                )}
            </div>
             <p className="mt-2 text-sm">Click or use Numpad (1-9) to whack!</p>
        </div>
    );
};

export default WhackASlimeGame;
