import React, { useState, useEffect, useCallback } from 'react';

const MAX_LEVEL = 12;

const TILE_SIZE = 50;
const DOT_RADIUS = 5;
const LINE_WIDTH = 6;

type Player = 1 | 2; // 1: Human, 2: AI
type LineOwner = 0 | Player;
type Difficulty = 'Easy' | 'Medium' | 'Hard';

const ConnectTheDotsGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [level, setLevel] = useState(1);
    const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
    const [dotGridSize, setDotGridSize] = useState(0);
    const [boxGridSize, setBoxGridSize] = useState(0);

    const [hLines, setHLines] = useState<LineOwner[][]>([]);
    const [vLines, setVLines] = useState<LineOwner[][]>([]);
    const [boxes, setBoxes] = useState<LineOwner[][]>([]);
    const [playerScore, setPlayerScore] = useState(0);
    const [aiScore, setAiScore] = useState(0);
    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [gameOver, setGameOver] = useState(false);
    const [hoveredLine, setHoveredLine] = useState<{ type: 'h' | 'v', r: number, c: number } | null>(null);
    const [totalExp, setTotalExp] = useState(0);

    const initializeGame = useCallback((lvl: number) => {
        let diff: Difficulty = 'Easy';
        let dgs = 3, bgs = 2;
        if (lvl >= 5) { diff = 'Medium'; dgs = 5; bgs = 4; }
        if (lvl >= 9) { diff = 'Hard'; dgs = 6; bgs = 5; }

        setDifficulty(diff);
        setDotGridSize(dgs);
        setBoxGridSize(bgs);
        setHLines(Array(dgs).fill(null).map(() => Array(bgs).fill(0)));
        setVLines(Array(bgs).fill(null).map(() => Array(dgs).fill(0)));
        setBoxes(Array(bgs).fill(null).map(() => Array(bgs).fill(0)));
        setPlayerScore(0);
        setAiScore(0);
        setCurrentPlayer(1);
        setGameOver(false);
    }, []);
    
    useEffect(() => {
        initializeGame(level);
    }, [level, initializeGame]);


    const checkForNewBoxes = useCallback((currentHLines: LineOwner[][], currentVLines: LineOwner[][], claimingPlayer: Player) => {
        let newBoxesCount = 0;
        const newBoxes = boxes.map(row => [...row]);
        const size = newBoxes.length;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (newBoxes[r][c] === 0) {
                    const top = currentHLines[r][c];
                    const bottom = currentHLines[r + 1][c];
                    const left = currentVLines[r][c];
                    const right = currentVLines[r][c + 1];

                    if (top && bottom && left && right) {
                        newBoxes[r][c] = claimingPlayer;
                        newBoxesCount++;
                    }
                }
            }
        }
        if (newBoxesCount > 0) {
            setBoxes(newBoxes);
            if (claimingPlayer === 1) setPlayerScore(s => s + newBoxesCount);
            else setAiScore(s => s + newBoxesCount);
            return true;
        }
        return false;
    }, [boxes]);
    
    const handleLineClick = (type: 'h' | 'v', r: number, c: number) => {
        if (currentPlayer !== 1 || gameOver) return;
        
        const lines = type === 'h' ? hLines : vLines;
        if (lines[r][c] !== 0) return;

        const newHLines = hLines.map(row => [...row]);
        const newVLines = vLines.map(row => [...row]);
        
        if (type === 'h') newHLines[r][c] = 1;
        else newVLines[r][c] = 1;

        setHLines(newHLines);
        setVLines(newVLines);

        const boxMade = checkForNewBoxes(newHLines, newVLines, 1);
        if (!boxMade) {
            setCurrentPlayer(2);
        }
    };
    
    const countBoxSides = (h: LineOwner[][], v: LineOwner[][], r: number, c: number) => {
        let sides = 0;
        if (h[r][c]) sides++;
        if (h[r + 1][c]) sides++;
        if (v[r][c]) sides++;
        if (v[r][c + 1]) sides++;
        return sides;
    };
    
    const findAIMove = useCallback(() => {
        const availableMoves: { type: 'h' | 'v', r: number, c: number }[] = [];
        hLines.forEach((row, r) => row.forEach((line, c) => { if (line === 0) availableMoves.push({ type: 'h', r, c }); }));
        vLines.forEach((row, r) => row.forEach((line, c) => { if (line === 0) availableMoves.push({ type: 'v', r, c }); }));

        if (availableMoves.length === 0) return null;

        const winningMoves = availableMoves.filter(move => {
            const tempHLines = hLines.map(row => [...row]);
            const tempVLines = vLines.map(row => [...row]);
            if (move.type === 'h') tempHLines[move.r][move.c] = 2; else tempVLines[move.r][move.c] = 2;
            for (let r = 0; r < boxGridSize; r++) for (let c = 0; c < boxGridSize; c++) if (boxes[r][c] === 0 && countBoxSides(tempHLines, tempVLines, r, c) === 4) return true;
            return false;
        });
        if (winningMoves.length > 0) return winningMoves[0];

        const safeMoves = availableMoves.filter(move => {
            const tempHLines = hLines.map(row => [...row]);
            const tempVLines = vLines.map(row => [...row]);
            if (move.type === 'h') tempHLines[move.r][move.c] = 2; else tempVLines[move.r][move.c] = 2;
            for (let r = 0; r < boxGridSize; r++) for (let c = 0; c < boxGridSize; c++) if (countBoxSides(tempHLines, tempVLines, r, c) === 3) return false;
            return true;
        });
        
        if (safeMoves.length > 0) return safeMoves[Math.floor(Math.random() * safeMoves.length)];

        if (difficulty === 'Hard') {
            let bestSacrifice = availableMoves[0]; let minOpponentGain = Infinity;
            for (const move of availableMoves) {
                let opponentGain = 0; let tempHLines = hLines.map(row => [...row]); let tempVLines = vLines.map(row => [...row]); let tempBoxes = boxes.map(row => [...row]);
                if (move.type === 'h') tempHLines[move.r][move.c] = 2; else tempVLines[move.r][move.c] = 2;
                let chainReaction = true;
                while(chainReaction) {
                    chainReaction = false; let boxesMadeThisTurn = 0;
                    for (let r = 0; r < boxGridSize; r++) { for (let c = 0; c < boxGridSize; c++) { if (tempBoxes[r][c] === 0 && countBoxSides(tempHLines, tempVLines, r, c) === 4) { tempBoxes[r][c] = 1; boxesMadeThisTurn++; } } }
                    if (boxesMadeThisTurn > 0) { opponentGain += boxesMadeThisTurn; chainReaction = true; }
                }
                if(opponentGain < minOpponentGain) { minOpponentGain = opponentGain; bestSacrifice = move; }
            }
            return bestSacrifice;
        }

        return availableMoves[Math.floor(Math.random() * availableMoves.length)];

    }, [hLines, vLines, boxes, boxGridSize, difficulty]);

    useEffect(() => {
        if (currentPlayer === 2 && !gameOver) {
            const aiMoveTimeout = setTimeout(() => {
                const move = findAIMove();
                if (move) {
                    const newHLines = hLines.map(row => [...row]); const newVLines = vLines.map(row => [...row]);
                    if (move.type === 'h') newHLines[move.r][move.c] = 2; else newVLines[move.r][move.c] = 2;
                    setHLines(newHLines); setVLines(newVLines);
                    if (!checkForNewBoxes(newHLines, newVLines, 2)) setCurrentPlayer(1);
                }
            }, 800);
            return () => clearTimeout(aiMoveTimeout);
        }
    }, [currentPlayer, gameOver, hLines, vLines, findAIMove, checkForNewBoxes]);

    useEffect(() => {
        if (dotGridSize > 0) {
            const totalBoxes = boxGridSize * boxGridSize;
            const claimedBoxes = playerScore + aiScore;
            if (claimedBoxes === totalBoxes && !gameOver) {
                setGameOver(true);
            }
        }
    }, [playerScore, aiScore, boxGridSize, dotGridSize, gameOver]);

    const getStatusMessage = () => {
        if (gameOver) {
            if (playerScore > aiScore) return "You Win!";
            if (aiScore > playerScore) return "AI Wins!";
            return "It's a Draw!";
        }
        return `Level ${level}/${MAX_LEVEL}`;
    };

    const handleWin = () => {
        const expGained = 15 + level * 5;
        setTotalExp(e => e + expGained);
        if (level < MAX_LEVEL) {
            setLevel(l => l + 1);
        }
    };
    
    const handleRetry = () => {
        initializeGame(level);
    };

    const WIDTH = TILE_SIZE * dotGridSize;
    const HEIGHT = TILE_SIZE * dotGridSize;
    
    return (
        <div className="w-full flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center">
                <h4 className="text-xl mb-2">Connect the Dots</h4>
                <div className="pixel-border bg-gray-800 p-4 relative">
                    <svg width={WIDTH} height={HEIGHT}>
                        <g transform={`translate(${TILE_SIZE/2}, ${TILE_SIZE/2})`}>
                            {boxes.map((row, r) => row.map((owner, c) => owner > 0 && ( <rect key={`b-${r}-${c}`} x={c * TILE_SIZE} y={r * TILE_SIZE} width={TILE_SIZE} height={TILE_SIZE} fill={owner === 1 ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 0, 0.4)'} className="box-capture-animation" /> )))}
                            {hLines.map((row, r) => row.map((owner, c) => ( <g key={`h-${r}-${c}`} onClick={() => handleLineClick('h', r, c)} onMouseEnter={() => setHoveredLine({ type: 'h', r, c })} onMouseLeave={() => setHoveredLine(null)} > <rect x={c * TILE_SIZE} y={r * TILE_SIZE - TILE_SIZE / 4} width={TILE_SIZE} height={TILE_SIZE / 2} fill="transparent" className="cursor-pointer" /> {owner > 0 && <rect x={c * TILE_SIZE} y={r * TILE_SIZE - LINE_WIDTH / 2} width={TILE_SIZE} height={LINE_WIDTH} fill={owner === 1 ? "#00FFFF" : "#FF0000"} />} {hoveredLine?.type === 'h' && hoveredLine.r === r && hoveredLine.c === c && owner === 0 && ( <rect x={c * TILE_SIZE} y={r * TILE_SIZE - LINE_WIDTH / 2} width={TILE_SIZE} height={LINE_WIDTH} fill={currentPlayer === 1 ? "#00FFFF" : "#FF0000"} opacity="0.5" /> )} </g> )))}
                            {vLines.map((row, r) => row.map((owner, c) => ( <g key={`v-${r}-${c}`} onClick={() => handleLineClick('v', r, c)} onMouseEnter={() => setHoveredLine({ type: 'v', r, c })} onMouseLeave={() => setHoveredLine(null)} > <rect x={c * TILE_SIZE - TILE_SIZE / 4} y={r * TILE_SIZE} width={TILE_SIZE / 2} height={TILE_SIZE} fill="transparent" className="cursor-pointer" /> {owner > 0 && <rect x={c * TILE_SIZE - LINE_WIDTH / 2} y={r * TILE_SIZE} width={LINE_WIDTH} height={TILE_SIZE} fill={owner === 1 ? "#00FFFF" : "#FF0000"} />} {hoveredLine?.type === 'v' && hoveredLine.r === r && hoveredLine.c === c && owner === 0 && ( <rect x={c * TILE_SIZE - LINE_WIDTH / 2} y={r * TILE_SIZE} width={LINE_WIDTH} height={TILE_SIZE} fill={currentPlayer === 1 ? "#00FFFF" : "#FF0000"} opacity="0.5" /> )} </g> )))}
                            {Array(dotGridSize).fill(0).map((_, r) => Array(dotGridSize).fill(0).map((_, c) => ( <circle key={`${r}-${c}`} cx={c * TILE_SIZE} cy={r * TILE_SIZE} r={DOT_RADIUS} fill="white" /> )) )}
                        </g>
                    </svg>
                </div>
                <div className="mt-4 text-center" style={{ minHeight: '120px' }}>
                    <div className="flex justify-center items-center text-2xl mb-4 gap-4">
                        <span className={currentPlayer === 1 && !gameOver ? 'text-cyan-400 flicker' : 'text-cyan-400'}>Player: {playerScore}</span>
                        <span>|</span>
                        <span className={currentPlayer === 2 && !gameOver ? 'text-red-500 flicker' : 'text-red-500'}>AI: {aiScore}</span>
                    </div>
                     <p className="text-xl mb-4">{getStatusMessage()}</p>
                    {gameOver && (
                        <div className="space-y-2">
                           {playerScore > aiScore && level < MAX_LEVEL && (
                                <button onClick={handleWin} className="pixel-border p-2 w-64 hover:bg-green-400 hover:text-black">Next Level</button>
                           )}
                           {(playerScore <= aiScore) && (
                                <button onClick={handleRetry} className="pixel-border p-2 w-64 hover:bg-yellow-400 hover:text-black">Try Again</button>
                           )}
                            <button onClick={() => onGameEnd(totalExp)} className="pixel-border p-2 w-64 hover:bg-gray-700 transition-colors duration-200">
                                Back to Training (Total EXP: {totalExp})
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConnectTheDotsGame;