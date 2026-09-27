import React, { useState, useEffect, useCallback } from 'react';

const ROWS = 6;
const COLS = 7;
const MAX_LEVEL = 12;
const WINDOW_LENGTH = 4;

type Player = 1 | 2;
type Cell = 0 | Player;
type Board = Cell[][];

const AI_PLAYER = 2 as Player;
const HUMAN_PLAYER = 1 as Player;

const createEmptyBoard = (): Board => Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

const checkWin = (board: Board): Player | null => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            const slice = board[r].slice(c, c + 4);
            if (slice.every(cell => cell === 1)) return 1;
            if (slice.every(cell => cell === 2)) return 2;
        }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r <= ROWS - 4; r++) {
            if (board[r][c] !== 0 && board[r][c] === board[r+1][c] && board[r][c] === board[r+2][c] && board[r][c] === board[r+3][c]) {
                return board[r][c] as Player;
            }
        }
    }
    // Diagonal (down-right)
    for (let r = 0; r <= ROWS - 4; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
             if (board[r][c] !== 0 && board[r][c] === board[r+1][c+1] && board[r][c] === board[r+2][c+2] && board[r][c] === board[r+3][c+3]) {
                return board[r][c] as Player;
            }
        }
    }
    // Diagonal (up-right)
    for (let r = 3; r < ROWS; r++) {
        for (let c = 0; c <= COLS - 4; c++) {
            if (board[r][c] !== 0 && board[r][c] === board[r-1][c+1] && board[r][c] === board[r-2][c+2] && board[r][c] === board[r-3][c+3]) {
                return board[r][c] as Player;
            }
        }
    }
    return null;
};

const isBoardFull = (board: Board): boolean => {
    return board[0].every(cell => cell !== 0);
};

const evaluateWindow = (window: Cell[], piece: Player): number => {
    let score = 0; const opp_piece = piece === HUMAN_PLAYER ? AI_PLAYER : HUMAN_PLAYER;
    const piece_count = window.filter(p => p === piece).length; const opp_piece_count = window.filter(p => p === opp_piece).length; const empty_count = window.filter(p => p === 0).length;
    if (piece_count === 4) score += 100; else if (piece_count === 3 && empty_count === 1) score += 5; else if (piece_count === 2 && empty_count === 2) score += 2; if (opp_piece_count === 3 && empty_count === 1) score -= 4;
    return score;
};

const scorePosition = (board: Board, piece: Player): number => {
    let score = 0; const center_array = board.map(row => row[Math.floor(COLS / 2)]); score += center_array.filter(p => p === piece).length * 3;
    for (let r = 0; r < ROWS; r++) { for (let c = 0; c <= COLS - WINDOW_LENGTH; c++) { score += evaluateWindow(board[r].slice(c, c + WINDOW_LENGTH), piece); } }
    for (let c = 0; c < COLS; c++) { for (let r = 0; r <= ROWS - WINDOW_LENGTH; r++) { score += evaluateWindow([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]], piece); } }
    for (let r = 0; r <= ROWS - WINDOW_LENGTH; r++) { for (let c = 0; c <= COLS - WINDOW_LENGTH; c++) { score += evaluateWindow([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]], piece); score += evaluateWindow([board[r + 3][c], board[r + 2][c + 1], board[r + 1][c + 2], board[r][c + 3]], piece); } }
    return score;
};

const getValidLocations = (board: Board): number[] => Array.from({ length: COLS }, (_, i) => i).filter(col => board[0][col] === 0);
const dropPiece = (board: Board, col: number, piece: Player): Board | null => {
    const newBoard = board.map(row => [...row]);
    for (let r = ROWS - 1; r >= 0; r--) { if (newBoard[r][col] === 0) { newBoard[r][col] = piece; return newBoard; } }
    return null;
};
const isTerminalNode = (board: Board): boolean => checkWin(board) !== null || isBoardFull(board);

const minimax = (board: Board, depth: number, alpha: number, beta: number, maximizingPlayer: boolean): [number | null, number] => {
    const valid_locations = getValidLocations(board); const is_terminal = isTerminalNode(board);
    if (depth === 0 || is_terminal) {
        if (is_terminal) { const winner = checkWin(board); if (winner === AI_PLAYER) return [null, 10000000]; if (winner === HUMAN_PLAYER) return [null, -10000000]; return [null, 0]; }
        return [null, scorePosition(board, AI_PLAYER)];
    }
    if (maximizingPlayer) {
        let value = -Infinity; let column = valid_locations[0];
        for (const col of valid_locations) { const b_copy = dropPiece(board, col, AI_PLAYER)!; const new_score = minimax(b_copy, depth - 1, alpha, beta, false)[1]; if (new_score > value) { value = new_score; column = col; } alpha = Math.max(alpha, value); if (alpha >= beta) break; }
        return [column, value];
    } else {
        let value = Infinity; let column = valid_locations[0];
        for (const col of valid_locations) { const b_copy = dropPiece(board, col, HUMAN_PLAYER)!; const new_score = minimax(b_copy, depth - 1, alpha, beta, true)[1]; if (new_score < value) { value = new_score; column = col; } beta = Math.min(beta, value); if (alpha >= beta) break; }
        return [column, value];
    }
};

const findAIMove = (board: Board, level: number): number => {
    const validMoves = getValidLocations(board); if (validMoves.length === 0) return -1;
    let aiDifficulty = 1; if (level >= 4) aiDifficulty = 2; if (level >= 7) aiDifficulty = 3; if (level >= 10) aiDifficulty = 4;

    if (aiDifficulty === 1) return validMoves[Math.floor(Math.random() * validMoves.length)];
    for (const move of validMoves) { const nextBoard = dropPiece(board, move, AI_PLAYER)!; if (checkWin(nextBoard) === AI_PLAYER) return move; }
    for (const move of validMoves) { const nextBoard = dropPiece(board, move, HUMAN_PLAYER)!; if (checkWin(nextBoard) === HUMAN_PLAYER) return move; }
    if (aiDifficulty === 2) { const centerPriority = [3, 2, 4, 1, 5, 0, 6]; for (const move of centerPriority) { if (validMoves.includes(move)) return move; } }
    if (aiDifficulty === 3) { const [bestMove] = minimax(board, 2, -Infinity, Infinity, true); return bestMove!; }
    if (aiDifficulty >= 4) { const [bestMove] = minimax(board, 4, -Infinity, Infinity, true); return bestMove!; }
    return validMoves[Math.floor(Math.random() * validMoves.length)];
};


const ConnectFourGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [board, setBoard] = useState<Board>(createEmptyBoard());
    const [level, setLevel] = useState(1);
    const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
    const [winner, setWinner] = useState<Player | 'draw' | null>(null);
    const [score, setScore] = useState(0);

    const resetLevel = useCallback((newLevel: number) => {
        setBoard(createEmptyBoard());
        setLevel(newLevel);
        setCurrentPlayer(1);
        setWinner(null);
    }, []);

    const handlePlayerMove = (col: number) => {
        if (currentPlayer !== 1 || winner || board[0][col] !== 0) return;
        const newBoard = dropPiece(board, col, 1);
        if (newBoard) {
            setBoard(newBoard);
            const gameWinner = checkWin(newBoard);
            if (gameWinner) { setWinner(gameWinner); setScore(s => s + level * 20); } 
            else if (isBoardFull(newBoard)) { setWinner('draw'); } 
            else { setCurrentPlayer(2); }
        }
    };

    useEffect(() => {
        if (currentPlayer === 2 && !winner) {
            const aiMoveTimeout = setTimeout(() => {
                const col = findAIMove(board, level); if (col === -1) return;
                const newBoard = dropPiece(board, col, 2);
                if(newBoard) {
                    setBoard(newBoard); const gameWinner = checkWin(newBoard);
                    if (gameWinner) { setWinner(gameWinner); } 
                    else if (isBoardFull(newBoard)) { setWinner('draw'); } 
                    else { setCurrentPlayer(1); }
                }
            }, 500 + Math.random() * 300);
            return () => clearTimeout(aiMoveTimeout);
        }
    }, [currentPlayer, winner, board, level]);

    const getStatusMessage = () => {
        if (winner) {
            if (winner === 1) return `You beat level ${level}!`;
            if (winner === 2) return `You lost level ${level}.`;
            return "It's a draw!";
        }
        return `Level ${level}/${MAX_LEVEL} - ${currentPlayer === 1 ? 'Your Turn' : "AI's Turn"}`;
    };

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Connect Four</h4>
            <div className="pixel-border bg-blue-900 p-2 inline-block">
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 40px)` }}>
                    {board.map((row, r) => row.map((cell, c) => (
                        <div key={`${r}-${c}`} className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-blue-700/50" onClick={() => handlePlayerMove(c)}>
                            <div className={`w-8 h-8 rounded-full transition-colors ${cell === 1 ? 'bg-red-500' : cell === 2 ? 'bg-yellow-400' : 'bg-blue-800'}`}></div>
                        </div>
                    )))}
                </div>
            </div>
            <div className="mt-4 text-center" style={{minHeight: '100px'}}>
                <p className="text-xl mb-4">{getStatusMessage()}</p>
                {winner && (
                    <div className="space-y-2 w-64 mx-auto">
                        {winner === 1 && level < MAX_LEVEL && (
                            <button onClick={() => resetLevel(level + 1)} className="pixel-border p-2 w-full hover:bg-green-400 hover:text-black transition-colors duration-200">
                                Next Level
                            </button>
                        )}
                        {winner === 1 && level >= MAX_LEVEL && (
                            <p className="text-yellow-400 flicker">You've beaten the master AI!</p>
                        )}
                        {(winner === 2 || winner === 'draw') && (
                            <button onClick={() => resetLevel(level)} className="pixel-border p-2 w-full hover:bg-yellow-400 hover:text-black transition-colors duration-200">
                                Try Again
                            </button>
                        )}
                        <button onClick={() => onGameEnd(score)} className="pixel-border p-2 w-full hover:bg-gray-700 transition-colors duration-200">
                            Back to Training (Total EXP: {score})
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConnectFourGame;