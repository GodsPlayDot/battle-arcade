import React, { useState, useEffect, useCallback } from 'react';

// Configuration for each level
const LEVELS = [
    { level: 1, rows: 2, cols: 2, pairs: 2, timeLimit: 20 },
    { level: 2, rows: 2, cols: 3, pairs: 3, timeLimit: 30 },
    { level: 3, rows: 3, cols: 4, pairs: 6, timeLimit: 60 },
    { level: 4, rows: 4, cols: 4, pairs: 8, timeLimit: 75 },
    { level: 5, rows: 4, cols: 5, pairs: 10, timeLimit: 90 },
    { level: 6, rows: 4, cols: 6, pairs: 12, timeLimit: 120 },
    { level: 7, rows: 5, cols: 6, pairs: 15, timeLimit: 150 },
    { level: 8, rows: 5, cols: 6, pairs: 15, timeLimit: 130 },
    { level: 9, rows: 6, cols: 6, pairs: 18, timeLimit: 180 },
    { level: 10, rows: 6, cols: 6, pairs: 18, timeLimit: 160 },
    { level: 11, rows: 6, cols: 7, pairs: 21, timeLimit: 200 },
    { level: 12, rows: 6, cols: 7, pairs: 21, timeLimit: 180 },
    { level: 13, rows: 6, cols: 8, pairs: 24, timeLimit: 200 },
    { level: 14, rows: 7, cols: 8, pairs: 28, timeLimit: 240 },
    { level: 15, rows: 7, cols: 8, pairs: 28, timeLimit: 220 },
    { level: 16, rows: 8, cols: 8, pairs: 32, timeLimit: 280 },
    { level: 17, rows: 8, cols: 8, pairs: 32, timeLimit: 250 },
];
const SYMBOLS = ['★', '♥', '♦', '♣', '♠', '☻', '☺', '♫', '☼', '§', 'Δ', 'Ω', 'Ψ', 'φ', 'θ', 'α', 'β', 'γ', 'Σ', 'π', 'λ', 'μ', 'τ', 'Φ', 'Θ', 'Ξ', 'Π', 'ζ', 'η', 'ψ', 'ω', '∇'];

interface Card {
    id: number;
    symbol: string;
    state: 'hidden' | 'visible' | 'matched';
}

const MemoryPuzzleGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [level, setLevel] = useState(1);
    const [cards, setCards] = useState<Card[]>([]);
    const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [moves, setMoves] = useState(0);
    const [message, setMessage] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [timeLeft, setTimeLeft] = useState(LEVELS[0].timeLimit);
    const [gameOver, setGameOver] = useState(false);
    const [animatingMatches, setAnimatingMatches] = useState<number[]>([]);

    const setupLevel = useCallback((currentLevel: number) => {
        const config = LEVELS[currentLevel - 1];
        if (!config) {
            setMessage(`You beat all ${LEVELS.length} levels!`);
            setGameOver(true);
            return;
        }

        setMessage(`Level ${currentLevel}`);
        setTimeLeft(config.timeLimit);
        const symbolsForLevel = SYMBOLS.slice(0, config.pairs);
        let cardSymbols = [...symbolsForLevel, ...symbolsForLevel];

        // Shuffle
        for (let i = cardSymbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cardSymbols[i], cardSymbols[j]] = [cardSymbols[j], cardSymbols[i]];
        }

        setCards(cardSymbols.map((symbol, index) => ({ id: index, symbol, state: 'hidden' })));
        setFlippedIndices([]);
        setMoves(0);
        setGameOver(false);
    }, []);

    useEffect(() => {
        setupLevel(level);
    }, [level, setupLevel]);
    
    // Timer Effect
    useEffect(() => {
        if (gameOver || (cards.length > 0 && cards.every(c => c.state === 'matched'))) {
            return;
        }
        
        if (timeLeft <= 0) {
            setGameOver(true);
            setMessage("Time's Up!");
            return;
        }

        const timerId = setInterval(() => {
            setTimeLeft(t => t - 1);
        }, 1000);

        return () => clearInterval(timerId);
    }, [timeLeft, gameOver, cards]);

    useEffect(() => {
        if (flippedIndices.length === 2) {
            setIsChecking(true);
            setMoves(m => m + 1);
            const [firstIndex, secondIndex] = flippedIndices;
            const firstCard = cards[firstIndex];
            const secondCard = cards[secondIndex];

            if (firstCard.symbol === secondCard.symbol) {
                // Match
                setAnimatingMatches([firstIndex, secondIndex]);
                setTimeout(() => setAnimatingMatches([]), 800);

                setCards(prevCards => prevCards.map((card, index) => 
                    (index === firstIndex || index === secondIndex) ? { ...card, state: 'matched' } : card
                ));
                setScore(s => s + 10);
                setFlippedIndices([]);
                setIsChecking(false);
            } else {
                // No match
                setTimeout(() => {
                    setCards(prevCards => prevCards.map((card, index) => 
                        (index === firstIndex || index === secondIndex) ? { ...card, state: 'hidden' } : card
                    ));
                    setFlippedIndices([]);
                    setIsChecking(false);
                }, 1000);
            }
        }
    }, [flippedIndices, cards]);

    // Check for level clear
    useEffect(() => {
        if (cards.length > 0 && cards.every(card => card.state === 'matched')) {
            const timeBonus = timeLeft * 2;
            setScore(s => s + level * 10 + timeBonus); // Level bonus + Time bonus
            setMessage(`Level ${level} Cleared! +${timeBonus} time bonus!`);
        }
    }, [cards, level, timeLeft]);

    const handleCardClick = (index: number) => {
        if (isChecking || gameOver || flippedIndices.length === 2 || cards[index].state !== 'hidden') {
            return;
        }
        setCards(prevCards => prevCards.map((card, i) => i === index ? { ...card, state: 'visible' } : card));
        setFlippedIndices(prev => [...prev, index]);
    };
    
    const allMatched = cards.length > 0 && cards.every(c => c.state === 'matched');
    const isMaxLevel = level >= LEVELS.length;

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Memory Puzzle</h4>
            <div className="flex justify-between w-full text-lg mb-2 px-4" style={{maxWidth: '400px'}}>
                 <span>Score: {score}</span>
                 <span>Time: {timeLeft}</span>
                 <span>Moves: {moves}</span>
            </div>
            <div 
                className="pixel-border bg-black p-2 inline-grid gap-2"
                style={{
                    gridTemplateColumns: `repeat(${LEVELS[level-1]?.cols ?? 2}, 50px)`,
                }}
            >
               {cards.map((card, index) => (
                   <div 
                       key={card.id}
                       onClick={() => handleCardClick(index)}
                       className={`card-container w-[50px] h-[50px] cursor-pointer ${card.state !== 'hidden' ? 'flipped' : ''}`}
                   >
                       <div className="card-flipper">
                           <div className="card-front bg-green-600 text-3xl flex items-center justify-center">?</div>
                           <div className={`card-back bg-gray-700 text-3xl ${card.state === 'matched' ? 'bg-green-800' : ''} ${animatingMatches.includes(index) ? 'matched-glow' : ''}`}>
                               {card.symbol}
                           </div>
                       </div>
                   </div>
               ))}
            </div>
            <div className="mt-4 text-center" style={{ minHeight: '80px' }}>
                <p className="text-xl mb-4">{message}</p>
                 {(allMatched || gameOver) && (
                    <div className="space-y-2">
                        {allMatched && !isMaxLevel && (
                             <button onClick={() => setLevel(l => l + 1)} className="pixel-border p-2 w-48 hover:bg-green-400 hover:text-black transition-colors duration-200">
                                Next Level
                            </button>
                        )}
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 w-48 hover:bg-gray-700 transition-colors duration-200">
                            End Game (EXP: {score})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryPuzzleGame;