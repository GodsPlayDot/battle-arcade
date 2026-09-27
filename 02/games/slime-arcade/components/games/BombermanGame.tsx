import React, { useState, useEffect, useCallback, useRef } from 'react';

const GRID_WIDTH = 15;
const GRID_HEIGHT = 13;
const TILE_SIZE = 24;
const MAX_LEVEL = 12;

const TILE_TYPE = { EMPTY: 0, HARD_WALL: 1, SOFT_WALL: 2, EXIT: 3 };
const POWERUP_TYPE = { BOMB_UP: 'bomb', RANGE_UP: 'range', SPEED_UP: 'speed', KICK_BOMB: 'kick', DETONATOR: 'detonator', GHOST_POTION: 'ghost', PIERCE_BOMB: 'pierce' };
const ENEMY_TYPE = { WANDERER: 'wanderer', CHASER: 'chaser', GHOST: 'ghost', SPRINTER: 'sprinter' };

interface Boss { id: number; x: number; y: number; hp: number; maxHp: number; speed: number; decisionTimer: number; invincibleTimer: number; dir: { x: number; y: number }; attackPattern: 'chase' | 'line_bomb' | 'spiral_bomb'; attackSubTimer: number; }
interface Bomb { id: number, x: number; y: number; timer: number; range: number, dx: number, dy: number, isRemote?: boolean, isPiercing?: boolean }

const aStar = (start: {x:number, y:number}, end: {x:number, y:number}, grid: number[][], bombs: Bomb[], isGhost: boolean): {x:number, y:number}[] => {
    const openSet = [{...start, g:0, h: Math.abs(start.x - end.x) + Math.abs(start.y - end.y), f:0}];
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, { x: number; y: number; }>();

    const isNodePassable = (x: number, y: number) => {
        const tile = grid[y]?.[x];
        if (tile === TILE_TYPE.HARD_WALL) return false;
        if (!isGhost && tile === TILE_TYPE.SOFT_WALL) return false;
        if (!isGhost && bombs.some(b => b.x === x && b.y === y)) return false;
        return true;
    }

    while(openSet.length > 0) {
        openSet.sort((a,b) => (a.g + a.h) - (b.g + b.h));
        const current = openSet.shift()!;
        const currentKey = `${current.x},${current.y}`;

        if (current.x === end.x && current.y === end.y) {
            const path = [];
            let temp: {x:number, y:number} | undefined = current;
            while(temp) {
                path.unshift(temp);
                const key = `${temp.x},${temp.y}`;
                temp = cameFrom.get(key);
            }
            return path.slice(1);
        }

        closedSet.add(currentKey);
        const neighbors = [{x:0, y:1}, {x:0, y:-1}, {x:1, y:0}, {x:-1, y:0}];
        for(const n of neighbors) {
            const neighborPos = { x: current.x + n.x, y: current.y + n.y };
            const neighborKey = `${neighborPos.x},${neighborPos.y}`;
            if(closedSet.has(neighborKey) || !isNodePassable(neighborPos.x, neighborPos.y)) continue;
            
            const tentativeG = current.g + 1;
            let neighborNode = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y);
            if (!neighborNode) {
                neighborNode = {...neighborPos, g: tentativeG, h: Math.abs(neighborPos.x - end.x) + Math.abs(neighborPos.y - end.y), f: 0 };
                openSet.push(neighborNode);
            } else if (tentativeG >= neighborNode.g) {
                continue;
            }

            cameFrom.set(neighborKey, current);
            neighborNode.g = tentativeG;
        }
    }
    return []; // No path found
};

// Helper function for checking if the player is trapped
const findShortestPathToSafety = (
    startPos: { x: number; y: number },
    grid: number[][],
    safeTiles: Set<string>
): number => {
    if (safeTiles.has(`${startPos.x},${startPos.y}`)) return 0;

    const queue: { pos: { x: number; y: number }; dist: number }[] = [{ pos: startPos, dist: 0 }];
    const visited = new Set<string>([`${startPos.x},${startPos.y}`]);

    const isPassable = (x: number, y: number) => {
        const tile = grid[y]?.[x];
        return tile !== TILE_TYPE.HARD_WALL && tile !== TILE_TYPE.SOFT_WALL;
    };

    while (queue.length > 0) {
        const { pos, dist } = queue.shift()!;

        const neighbors = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
        for (const n of neighbors) {
            const neighborPos = { x: pos.x + n.x, y: pos.y + n.y };
            const neighborKey = `${neighborPos.x},${neighborPos.y}`;

            if (!visited.has(neighborKey) && isPassable(neighborPos.x, neighborPos.y)) {
                if (safeTiles.has(neighborKey)) {
                    return dist + 1;
                }
                visited.add(neighborKey);
                queue.push({ pos: neighborPos, dist: dist + 1 });
            }
        }
    }
    return Infinity; // No path found
};


const BombermanGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [level, setLevel] = useState(1);
    const [grid, setGrid] = useState<number[][]>([]);
    const [exitPos, setExitPos] = useState<{ x: number; y: number } | null>(null);
    const [player, setPlayer] = useState({ x: 1.5 * TILE_SIZE, y: 1.5 * TILE_SIZE, speed: 1.5 });
    const [enemies, setEnemies] = useState<{ id: number, x: number; y: number; type: string; speed: number; dir: {x: number, y: number}, decisionTimer: number, path?: {x:number, y:number}[] }[]>([]);
    const [boss, setBoss] = useState<Boss | null>(null);
    const [bombs, setBombs] = useState<Bomb[]>([]);
    const [explosions, setExplosions] = useState<{ x: number; y: number; timer: number }[]>([]);
    const [powerUps, setPowerUps] = useState<{ x: number; y: number; type: string }[]>([]);
    const [playerStats, setPlayerStats] = useState({ maxBombs: 1, bombRange: 1, canKickBomb: false, hasDetonator: false, ghostPotionTimer: 0, pierceBombCount: 0 });
    const [lives, setLives] = useState(3);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [message, setMessage] = useState('');
    const [invincibleTimer, setInvincibleTimer] = useState(0);
    const [screenFlashTimer, setScreenFlashTimer] = useState(0);
    const [floatingTexts, setFloatingTexts] = useState<{ id: number, text: string, x: number, y: number, type: 'powerup' | 'score' }[]>([]);
    const [phasingBombId, setPhasingBombId] = useState<number | null>(null);

    const gameLoopRef = useRef<number | null>(null);
    const keysRef = useRef<Record<string, boolean>>({});
    
    const isPassable = useCallback((gridX: number, gridY: number, isGhosting = false, checkBombs = false, allBombs: typeof bombs = [], ignoreBombId: number | null = null) => {
        if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) return false;
        const tile = grid[gridY]?.[gridX];
        if (tile === TILE_TYPE.HARD_WALL) return false;
        if (!isGhosting && tile === TILE_TYPE.SOFT_WALL) return false;
        if (checkBombs && !isGhosting && allBombs.some(b => b.x === gridX && b.y === gridY && b.id !== ignoreBombId)) return false;
        return true;
    }, [grid]);

    const generateLevel = useCallback((lvl: number) => {
        const newGrid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(TILE_TYPE.EMPTY));
        const isBossLevel = lvl === 5 || lvl === 10 || lvl === 12;

        for (let y = 0; y < GRID_HEIGHT; y++) for (let x = 0; x < GRID_WIDTH; x++) if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1 || (x % 2 === 0 && y % 2 === 0)) newGrid[y][x] = TILE_TYPE.HARD_WALL;
        
        setEnemies([]);
        setBoss(null);
        setExitPos(null);

        if (isBossLevel) {
            for (let y = 4; y < GRID_HEIGHT - 4; y++) for (let x = 4; x < GRID_WIDTH - 4; x++) newGrid[y][x] = TILE_TYPE.EMPTY;
             const bossHp = 50 + (lvl * 10) + (lvl === 12 ? 50 : 0);
             const bossSpeed = 0.5 + lvl * 0.05 + (lvl === 12 ? 0.2 : 0);
             setBoss({ id: Date.now(), x: (GRID_WIDTH / 2) * TILE_SIZE, y: (GRID_HEIGHT / 2) * TILE_SIZE, hp: bossHp, maxHp: bossHp, speed: bossSpeed, decisionTimer: 180, invincibleTimer: 0, dir: { x: 0, y: 0 }, attackPattern: 'chase', attackSubTimer: 0 });
        } else {
            const softWallCount = 45 + lvl * 2;
            let placedWalls = 0;
            while (placedWalls < softWallCount) { 
                const x = Math.floor(Math.random() * GRID_WIDTH); 
                const y = Math.floor(Math.random() * GRID_HEIGHT); 
                if (newGrid[y][x] === TILE_TYPE.EMPTY) { 
                    newGrid[y][x] = TILE_TYPE.SOFT_WALL; 
                    placedWalls++; 
                } 
            }
            
            // Fix: Force-clear the player's spawn area to guarantee safety from random wall placement.
            newGrid[1][1] = TILE_TYPE.EMPTY; // Player spawn point
            newGrid[1][2] = TILE_TYPE.EMPTY; // Escape path right
            newGrid[2][1] = TILE_TYPE.EMPTY; // Escape path down

            const softWallCoords: { x: number, y: number }[] = [];
            newGrid.forEach((row, y) => row.forEach((cell, x) => { if (cell === TILE_TYPE.SOFT_WALL) softWallCoords.push({ x, y }); }));

            if (softWallCoords.length > 0) {
                const exitCoord = softWallCoords.splice(Math.floor(Math.random() * softWallCoords.length), 1)[0];
                if (exitCoord) {
                    setExitPos(exitCoord);
                }
            }

            const newPowerUps: { x: number; y: number; type: string }[] = [];
            const powerUpTypes = [POWERUP_TYPE.BOMB_UP, POWERUP_TYPE.RANGE_UP, POWERUP_TYPE.SPEED_UP, POWERUP_TYPE.KICK_BOMB, POWERUP_TYPE.DETONATOR, POWERUP_TYPE.GHOST_POTION, POWERUP_TYPE.PIERCE_BOMB];
            for (const type of powerUpTypes) { if (softWallCoords.length > 0 && Math.random() < 0.5) { const pos = softWallCoords.splice(Math.floor(Math.random() * softWallCoords.length), 1)[0]; if (pos) newPowerUps.push({ x: pos.x, y: pos.y, type }); } }
            setPowerUps(newPowerUps);
            
            const newEnemies: { id: number, x: number, y: number, type: string, speed: number, dir: {x:number, y:number}, decisionTimer: number }[] = [];
            const createEnemies = (count: number, type: string, speed: number) => { while (newEnemies.filter(e => e.type === type).length < count) { const x = Math.floor(Math.random() * (GRID_WIDTH - 4)) + 3; const y = Math.floor(Math.random() * (GRID_HEIGHT - 4)) + 3; if (newGrid[y][x] === TILE_TYPE.EMPTY) { newEnemies.push({ id: Date.now() + Math.random(), x: x * TILE_SIZE + TILE_SIZE/2, y: y * TILE_SIZE + TILE_SIZE/2, type, speed, dir: {x:0, y:0}, decisionTimer: 0 }); } } };
            
            createEnemies(2 + Math.floor(lvl / 2), ENEMY_TYPE.WANDERER, 0.8);
            if (lvl >= 2) createEnemies(1 + Math.floor(lvl / 3), ENEMY_TYPE.CHASER, 0.6);
            if (lvl >= 4) createEnemies(1 + Math.floor((lvl-4) / 3), ENEMY_TYPE.GHOST, 0.4);
            if (lvl >= 6) createEnemies(1 + Math.floor((lvl-6) / 4), ENEMY_TYPE.SPRINTER, 1.8);

            setEnemies(newEnemies);
        }
        setGrid(newGrid);
        setMessage(`Level ${lvl}`); setTimeout(() => setMessage(''), 1500);
    }, []);

    useEffect(() => { generateLevel(level); }, [level, generateLevel]);

    const handleDeath = useCallback(() => {
        if (invincibleTimer > 0) return;
        setScreenFlashTimer(20);
        setInvincibleTimer(120);
        if (lives - 1 <= 0) {
            setGameOver(true);
            setMessage('GAME OVER');
        } else {
            setLives(l => l - 1);
            setPlayer(p => ({ ...p, x: 1.5 * TILE_SIZE, y: 1.5 * TILE_SIZE }));
        }
    }, [invincibleTimer, lives]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;

        // --- TIMERS ---
        if (invincibleTimer > 0) setInvincibleTimer(t => t - 1);
        if (screenFlashTimer > 0) setScreenFlashTimer(t => t - 1);
        if (playerStats.ghostPotionTimer > 0) setPlayerStats(s => ({...s, ghostPotionTimer: s.ghostPotionTimer - 1}));
        setFloatingTexts(ft => ft.slice(-10));
        setExplosions(ex => ex.map(e => ({...e, timer: e.timer - 1})).filter(e => e.timer > 0));

        // --- MOVEMENT ---
        setPlayer(p => {
            let { x, y, speed } = p; const keys = keysRef.current;
            const moveX = (keys['ArrowRight'] ? 1 : 0) - (keys['ArrowLeft'] ? 1 : 0); const moveY = (keys['ArrowDown'] ? 1 : 0) - (keys['ArrowUp'] ? 1 : 0);
            if (phasingBombId) { const phasingBomb = bombs.find(b => b.id === phasingBombId); const pGridX = Math.floor(x / TILE_SIZE); const pGridY = Math.floor(y / TILE_SIZE); if (!phasingBomb || pGridX !== phasingBomb.x || pGridY !== phasingBomb.y) { setPhasingBombId(null); } }
            if (moveX === 0 && moveY === 0) return p;
            let nextX = x + moveX * speed; let nextY = y + moveY * speed; const pSize = TILE_SIZE * 0.4;
            const isGhosting = playerStats.ghostPotionTimer > 0;
            const checkAndBlock = (checkX: number, checkY: number) => {
                const gridX = Math.floor(checkX / TILE_SIZE); const gridY = Math.floor(checkY / TILE_SIZE); if (!isPassable(gridX, gridY, isGhosting)) return true;
                for (const bomb of bombs) {
                    if (bomb.id === phasingBombId) continue;
                    const bombLeft = bomb.x * TILE_SIZE; const bombRight = bombLeft + TILE_SIZE; const bombTop = bomb.y * TILE_SIZE; const bombBottom = bombTop + TILE_SIZE;
                    if (checkX > bombLeft && checkX < bombRight && checkY > bombTop && checkY < bombBottom) {
                        if (playerStats.canKickBomb && bomb.dx === 0 && bomb.dy === 0) { const kickDx = moveX; const kickDy = moveY; if (isPassable(bomb.x + kickDx, bomb.y + kickDy, false, true, bombs)) { setBombs(bs => bs.map(b => b.id === bomb.id ? {...b, dx: kickDx, dy: kickDy} : b)); } }
                        return true;
                    }
                }
                return false;
            };
            if (moveX !== 0) { const checkY1 = y - pSize; const checkY2 = y + pSize; if (checkAndBlock(nextX + Math.sign(moveX) * pSize, checkY1) || checkAndBlock(nextX + Math.sign(moveX) * pSize, checkY2)) nextX = x; }
            if (moveY !== 0) { const checkX1 = x - pSize; const checkX2 = x + pSize; if (checkAndBlock(checkX1, nextY + Math.sign(moveY) * pSize) || checkAndBlock(checkX2, nextY + Math.sign(moveY) * pSize)) nextY = y; }
            return { ...p, x: nextX, y: nextY };
        });
        
        setEnemies(es => es.map(e => {
            let { x, y, dir, speed, decisionTimer, type, path } = e;
            const eGridX = Math.floor(x / TILE_SIZE); const eGridY = Math.floor(y / TILE_SIZE);
            decisionTimer--;

            if (decisionTimer <= 0) {
                const isGhost = type === ENEMY_TYPE.GHOST;
                if (type === ENEMY_TYPE.CHASER || type === ENEMY_TYPE.GHOST) {
                    const playerGrid = {x: Math.floor(player.x / TILE_SIZE), y: Math.floor(player.y / TILE_SIZE)};
                    path = aStar({x: eGridX, y: eGridY}, playerGrid, grid, bombs, isGhost);
                    if (path && path.length > 0) {
                        const nextStep = path[0];
                        dir = { x: Math.sign(nextStep.x - eGridX), y: Math.sign(nextStep.y - eGridY) };
                    } else {
                        dir = {x:0, y:0};
                    }
                } else if (type === ENEMY_TYPE.SPRINTER) {
                    const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; dir = dirs[Math.floor(Math.random() * dirs.length)];
                } else { 
                    const dirs = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}]; dir = dirs[Math.floor(Math.random() * dirs.length)];
                }
                decisionTimer = type === ENEMY_TYPE.CHASER ? 60 : 120;
            }
            
            let nextX = x + dir.x * speed; let nextY = y + dir.y * speed;
            const eSize = TILE_SIZE * 0.4;
            const isGhosting = type === ENEMY_TYPE.GHOST;
            if (!isPassable(Math.floor((nextX + (dir.x * eSize)) / TILE_SIZE), Math.floor((nextY + (dir.y * eSize)) / TILE_SIZE), isGhosting, true, bombs)) {
                decisionTimer = 1; if(type === ENEMY_TYPE.SPRINTER) dir = {x:0, y:0};
            } else { x = nextX; y = nextY; }
            return { ...e, x, y, dir, decisionTimer, path };
        }));

        setBombs(currentBombs => currentBombs.map(b => { if (b.dx !== 0 || b.dy !== 0) { const nextGridX = b.x + b.dx; const nextGridY = b.y + b.dy; return isPassable(nextGridX, nextGridY, false, true, currentBombs, b.id) ? { ...b, x: nextGridX, y: nextGridY } : { ...b, dx: 0, dy: 0 }; } return b; }));
        
        if(boss) { setBoss(b => { if(!b) return null; let { x, y, dir, speed, decisionTimer, invincibleTimer, attackPattern, attackSubTimer } = b; if(invincibleTimer > 0) invincibleTimer--; decisionTimer--; if (decisionTimer <= 0) { decisionTimer = 180 - level * 5; const attacks = ['chase']; if(level >= 10) attacks.push('line_bomb'); if(level >= 12) attacks.push('spiral_bomb'); attackPattern = attacks[Math.floor(Math.random() * attacks.length)] as Boss['attackPattern']; attackSubTimer = 0; } if(attackPattern === 'chase') { const dx = player.x - x; const dy = player.y - y; const dist = Math.hypot(dx, dy); dir = dist > 1 ? {x: dx/dist, y: dy/dist} : {x:0, y:0}; x += dir.x * speed; y += dir.y * speed; } else { attackSubTimer--; if (attackSubTimer <= 0) { if(attackPattern === 'line_bomb') { const gridX = Math.floor(x/TILE_SIZE); const gridY = Math.floor(y/TILE_SIZE); const dx = Math.sign(player.x - x); const dy = Math.sign(player.y - y); const isHorizontal = Math.abs(dx) > Math.abs(dy); setBombs(current => [...current, { id: Date.now(), x: gridX + (isHorizontal ? dx : 0), y: gridY + (!isHorizontal ? dy : 0), timer: 60, range: 2, dx: 0, dy: 0}]); attackSubTimer = 20; } if(attackPattern === 'spiral_bomb') { const angle = (Date.now()/100 % 8) * (Math.PI / 4); const gridX = Math.floor(x/TILE_SIZE) + Math.round(Math.cos(angle)*2); const gridY = Math.floor(y/TILE_SIZE) + Math.round(Math.sin(angle)*2); if(isPassable(gridX, gridY)) setBombs(current => [...current, { id: Date.now()+Math.random(), x: gridX, y: gridY, timer: 60, range: 1, dx: 0, dy: 0}]); attackSubTimer = 5; } } } return {...b, x, y, dir, decisionTimer, invincibleTimer, attackPattern, attackSubTimer}; }); }

        // --- BOMB EXPLOSION LOGIC ---
        const initialExploding: Bomb[] = [];
        const remainingBombs: Bomb[] = [];
        bombs.forEach(bomb => {
            const newTimer = bomb.timer - 1;
            if (newTimer <= 0) {
                initialExploding.push(bomb);
            } else {
                remainingBombs.push({ ...bomb, timer: newTimer });
            }
        });

        if (initialExploding.length > 0) {
            let allExplodingBombs = [...initialExploding];
            let nonExplodingBombs = [...remainingBombs];
            let newExplosionsFound = true;
            
            while (newExplosionsFound) {
                newExplosionsFound = false;
                const explosionTiles = new Set<string>();
                allExplodingBombs.forEach(b => {
                    explosionTiles.add(`${b.x},${b.y}`);
                    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                    for (const [dx, dy] of dirs) {
                        for (let i = 1; i <= b.range; i++) {
                            const ex = b.x + dx * i; const ey = b.y + dy * i;
                            if (grid[ey]?.[ex] === TILE_TYPE.HARD_WALL) break;
                            explosionTiles.add(`${ex},${ey}`);
                            if (grid[ey]?.[ex] === TILE_TYPE.SOFT_WALL && !b.isPiercing) break;
                        }
                    }
                });
                
                const triggeredBombs: Bomb[] = [];
                const stillSafeBombs: Bomb[] = [];
                nonExplodingBombs.forEach(b => { if (explosionTiles.has(`${b.x},${b.y}`)) { triggeredBombs.push(b); } else { stillSafeBombs.push(b); } });
                
                if (triggeredBombs.length > 0) {
                    newExplosionsFound = true;
                    allExplodingBombs.push(...triggeredBombs);
                    nonExplodingBombs = stillSafeBombs;
                }
            }
            
            setBombs(nonExplodingBombs);
            
            const finalExplosionTiles = new Set<string>();
            allExplodingBombs.forEach(b => {
                finalExplosionTiles.add(`${b.x},${b.y}`);
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                for (const [dx, dy] of dirs) {
                    for (let i = 1; i <= b.range; i++) {
                        const ex = b.x + dx * i; const ey = b.y + dy * i;
                        if (grid[ey]?.[ex] === TILE_TYPE.HARD_WALL) break;
                        finalExplosionTiles.add(`${ex},${ey}`);
                        if (grid[ey]?.[ex] === TILE_TYPE.SOFT_WALL && !b.isPiercing) break;
                    }
                }
            });
            
            setExplosions(ex => [...ex, ...Array.from(finalExplosionTiles).map(tile => { const [x, y] = tile.split(',').map(Number); return { x, y, timer: 20 }; })]);
            const pGridX = Math.floor(player.x / TILE_SIZE); const pGridY = Math.floor(player.y / TILE_SIZE);
            if (finalExplosionTiles.has(`${pGridX},${pGridY}`)) {
                const safeTiles = new Set<string>();
                for (let y = 0; y < GRID_HEIGHT; y++) { for (let x = 0; x < GRID_WIDTH; x++) { if ((grid[y][x] === TILE_TYPE.EMPTY || grid[y][x] === TILE_TYPE.EXIT) && !finalExplosionTiles.has(`${x},${y}`)) { safeTiles.add(`${x},${y}`); } } }
                if (safeTiles.size > 0) { const distToSafety = findShortestPathToSafety({ x: pGridX, y: pGridY }, grid, safeTiles); if (distToSafety !== Infinity) { handleDeath(); } } else { handleDeath(); }
            }
            setEnemies(es => es.filter(e => { const eGridX = Math.floor(e.x / TILE_SIZE); const eGridY = Math.floor(e.y / TILE_SIZE); if (finalExplosionTiles.has(`${eGridX},${eGridY}`)) { const killScore = (e.type === ENEMY_TYPE.CHASER ? 200 : e.type === ENEMY_TYPE.GHOST ? 150 : e.type === ENEMY_TYPE.SPRINTER ? 120 : 100); setScore(s => s + killScore); setFloatingTexts(fts => [...fts, { id: Date.now() + Math.random(), text: `+${killScore}`, x: e.x, y: e.y, type: 'score' }]); return false; } return true; }));
            if (boss && boss.invincibleTimer <= 0) { const bGridX1 = Math.floor((boss.x - TILE_SIZE / 2) / TILE_SIZE); const bGridY1 = Math.floor((boss.y - TILE_SIZE / 2) / TILE_SIZE); const bGridX2 = Math.floor((boss.x + TILE_SIZE / 2) / TILE_SIZE); const bGridY2 = Math.floor((boss.y + TILE_SIZE / 2) / TILE_SIZE); if (finalExplosionTiles.has(`${bGridX1},${bGridY1}`) || finalExplosionTiles.has(`${bGridX1},${bGridY2}`) || finalExplosionTiles.has(`${bGridX2},${bGridY1}`) || finalExplosionTiles.has(`${bGridX2},${bGridY2}`)) { const newHp = boss.hp - 1; setBoss(b => b ? { ...b, hp: newHp, invincibleTimer: 30 } : null); if (newHp <= 0) { const bossKillScore = 2000 * (level / 5) + (level === 12 ? 3000 : 0); setScore(s => s + bossKillScore); if (level >= MAX_LEVEL) { setGameOver(true); setMessage("YOU WIN!"); } else { setLevel(l => l + 1); } } } }
            setGrid(g => { 
                const newGrid = g.map(row => [...row]); 
                let changed = false; 
                finalExplosionTiles.forEach(tile => { 
                    const [x, y] = tile.split(',').map(Number); 
                    if (newGrid[y]?.[x] === TILE_TYPE.SOFT_WALL) {
                        if (exitPos && x === exitPos.x && y === exitPos.y) { newGrid[y][x] = TILE_TYPE.EXIT; } else { newGrid[y][x] = TILE_TYPE.EMPTY; } changed = true; 
                    }
                }); 
                return changed ? newGrid : g; 
            });

        } else {
            setBombs(remainingBombs);
        }

        // --- CHECK COLLISIONS & GAME STATE ---
        enemies.forEach(e => {
            const dist = Math.hypot(player.x - e.x, player.y - e.y);
            if (dist < TILE_SIZE * 0.8) {
                handleDeath();
            }
        });
        
        if (boss) { if (Math.abs(player.x - boss.x) < TILE_SIZE * 1.2 && Math.abs(player.y - boss.y) < TILE_SIZE * 1.2) handleDeath(); }
        
        const pGridX = Math.floor(player.x / TILE_SIZE);
        const pGridY = Math.floor(player.y / TILE_SIZE);
        setPowerUps(ps => ps.filter(p => { if (grid[p.y]?.[p.x] === TILE_TYPE.EMPTY && p.x === pGridX && p.y === pGridY) { let text = ''; if(p.type === POWERUP_TYPE.BOMB_UP) { setPlayerStats(s => ({ ...s, maxBombs: s.maxBombs + 1 })); text = "+1 Bomb"; } if(p.type === POWERUP_TYPE.RANGE_UP) { setPlayerStats(s => ({ ...s, bombRange: s.bombRange + 1 })); text = "+1 Range"; } if(p.type === POWERUP_TYPE.SPEED_UP) { setPlayer(pl => ({ ...pl, speed: Math.min(3, pl.speed * 1.15) })); text = "+Speed"; } if(p.type === POWERUP_TYPE.KICK_BOMB) { setPlayerStats(s => ({ ...s, canKickBomb: true })); text = "Kick!"; } if(p.type === POWERUP_TYPE.DETONATOR) { setPlayerStats(s => ({ ...s, hasDetonator: true })); text = "Detonator!"; } if(p.type === POWERUP_TYPE.GHOST_POTION) { setPlayerStats(s => ({ ...s, ghostPotionTimer: 300 })); text = "Ghost!"; } if(p.type === POWERUP_TYPE.PIERCE_BOMB) { setPlayerStats(s => ({ ...s, pierceBombCount: s.pierceBombCount + 1 })); text = "Pierce Bomb!"; } setFloatingTexts(fts => [...fts, {id: Date.now(), text, x: player.x, y: player.y, type: 'powerup'}]); return false; } return true; }));
        if (enemies.length === 0 && !boss) { if (grid[pGridY]?.[pGridX] === TILE_TYPE.EXIT) { setScore(s => s + 500); if (level >= MAX_LEVEL) { setGameOver(true); setMessage("YOU WIN!"); } else { setLevel(l => l + 1); } } }
    }, [gameOver, bombs, player, playerStats, grid, enemies, boss, handleDeath, lives, isPassable, level, generateLevel, phasingBombId, exitPos]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (gameOver) return;
        if (e.key !== ' ' && e.key !== 'Shift') e.preventDefault();
        keysRef.current[e.key] = true;

        if (e.key === ' ' && !e.repeat) {
            setBombs(currentBombs => {
                if (currentBombs.filter(b => !b.isRemote).length < playerStats.maxBombs) {
                    const gridX = Math.floor(player.x / TILE_SIZE);
                    const gridY = Math.floor(player.y / TILE_SIZE);
                    if (!currentBombs.some(b => b.x === gridX && b.y === gridY)) {
                        const newBomb = { id: Date.now(), x: gridX, y: gridY, timer: playerStats.hasDetonator ? Infinity : 120, range: playerStats.bombRange, dx: 0, dy: 0, isRemote: playerStats.hasDetonator, isPiercing: playerStats.pierceBombCount > 0 };
                        if (newBomb.isPiercing) setPlayerStats(s => ({ ...s, pierceBombCount: s.pierceBombCount - 1 }));
                        setPhasingBombId(newBomb.id);
                        return [...currentBombs, newBomb];
                    }
                }
                return currentBombs;
            });
        }
        if (e.key === 'Shift' && !e.repeat && playerStats.hasDetonator) {
            setBombs(bs => {
                const remoteBombs = bs.filter(b => b.isRemote);
                if (remoteBombs.length > 0) {
                    const oldestBombId = remoteBombs.sort((a, b) => a.id - b.id)[0].id;
                    return bs.map(b => b.id === oldestBombId ? { ...b, timer: 1 } : b);
                }
                return bs;
            });
        }
    }, [gameOver, playerStats, player.x, player.y]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        keysRef.current[e.key] = false;
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60);

        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameLoop, handleKeyDown, handleKeyUp]);


    const getEnemyColor = (type: string) => {
        switch(type) {
            case ENEMY_TYPE.WANDERER: return 'bg-red-600';
            case ENEMY_TYPE.CHASER: return 'bg-purple-600';
            case ENEMY_TYPE.GHOST: return 'bg-white';
            case ENEMY_TYPE.SPRINTER: return 'bg-yellow-400';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Slime Bomber</h4>
            <div className="flex justify-between w-full text-lg mb-2" style={{maxWidth: GRID_WIDTH * TILE_SIZE}}> <span>Score: {score}</span> <span>Level: {level}/{MAX_LEVEL}</span> <span>Lives: {'❤️'.repeat(lives)}</span> </div>
            <div className={`pixel-border bg-green-800 relative ${screenFlashTimer > 0 ? 'screen-flash' : ''}`} style={{ width: GRID_WIDTH * TILE_SIZE, height: GRID_HEIGHT * TILE_SIZE, overflow: 'hidden' }}>
                {grid.map((row, y) => row.map((cell, x) => { if (cell === TILE_TYPE.HARD_WALL) return <div key={`${x}-${y}`} className="bg-gray-600" style={{ position: 'absolute', left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }} />; if (cell === TILE_TYPE.SOFT_WALL) return <div key={`${x}-${y}`} className="bg-gray-400" style={{ position: 'absolute', left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, border: '1px solid #555' }} />; if (cell === TILE_TYPE.EXIT && enemies.length === 0 && !boss) return <div key={`${x}-${y}`} className="bg-blue-500 text-center flex items-center justify-center flicker" style={{ position: 'absolute', left: x * TILE_SIZE, top: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE }}>E</div>; return null; }))}
                {powerUps.map((p, i) => grid[p.y]?.[p.x] === TILE_TYPE.EMPTY && ( <div key={i} className="text-center font-bold text-yellow-300 bg-black/50 rounded-full w-4 h-4 flex items-center justify-center" style={{ position: 'absolute', left: p.x * TILE_SIZE + TILE_SIZE/2 - 8, top: p.y * TILE_SIZE + TILE_SIZE/2 - 8, userSelect: 'none' }}> {p.type === POWERUP_TYPE.BOMB_UP && 'B'} {p.type === POWERUP_TYPE.RANGE_UP && 'R'} {p.type === POWERUP_TYPE.SPEED_UP && 'S'} {p.type === POWERUP_TYPE.KICK_BOMB && 'K'} {p.type === POWERUP_TYPE.DETONATOR && 'D'} {p.type === POWERUP_TYPE.GHOST_POTION && 'G'} {p.type === POWERUP_TYPE.PIERCE_BOMB && 'P'} </div> ))}
                {bombs.map((b) => <div key={b.id} className="bg-gray-800 rounded-full border-2 border-black pulsing-bomb" style={{ position: 'absolute', left: b.x * TILE_SIZE + 2, top: b.y * TILE_SIZE + 2, width: TILE_SIZE - 4, height: TILE_SIZE - 4, transition: 'left 0.1s linear, top 0.1s linear' }} />)}
                {explosions.map((ex, i) => <div key={i} className="bg-orange-500 rounded-sm explosion-animation" style={{ position: 'absolute', left: ex.x * TILE_SIZE, top: ex.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, transform: `scale(${1 + (i%2)*0.1})` }} />)}
                {enemies.map((e) => <div key={e.id} className={`rounded-full ${getEnemyColor(e.type)}`} style={{ position: 'absolute', left: e.x - TILE_SIZE/2, top: e.y - TILE_SIZE/2, width: TILE_SIZE, height: TILE_SIZE, opacity: e.type === ENEMY_TYPE.GHOST ? 0.7 : 1 }} />)}
                {boss && <div className="bg-gray-900 border-4 border-red-500" style={{ position: 'absolute', left: boss.x - TILE_SIZE, top: boss.y - TILE_SIZE, width: TILE_SIZE*2, height: TILE_SIZE*2, opacity: boss.invincibleTimer > 0 ? 0.5 : 1 }}><div className="w-full h-1 bg-gray-500 absolute -top-3"><div className="h-full bg-red-500" style={{width: `${(boss.hp/boss.maxHp)*100}%`}}></div></div></div>}
                <div className="bg-lime-400 rounded-full relative" style={{ position: 'absolute', left: player.x - TILE_SIZE/2, top: player.y - TILE_SIZE/2, width: TILE_SIZE, height: TILE_SIZE, opacity: invincibleTimer % 20 < 10 ? 0.5 : (playerStats.ghostPotionTimer > 0 ? 0.6 : 1), border: '2px solid black' }}> <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full" /> <div className="absolute top-1 right-1 w-1 h-1 bg-black rounded-full" /> </div>
                {floatingTexts.map(ft => ( <div key={ft.id} className={`absolute font-bold ${ft.type === 'score' ? 'score-popup text-white' : 'floating-text text-yellow-300'}`} style={{ left: ft.x, top: ft.y, textShadow: '1px 1px #000' }}>{ft.text}</div> ))}
                {(gameOver || message) && ( <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center"> <h2 className="text-3xl text-yellow-400 flicker">{message}</h2> {gameOver && ( <> <p className="text-xl mt-2">Final Score: {score} EXP</p> <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200"> Back to Training </button> </>)} </div> )}
            </div>
            <div className="mt-2 w-full flex justify-center items-center space-x-4 text-center text-sm pixel-border p-1" style={{maxWidth: GRID_WIDTH * TILE_SIZE}}>
                <div className="flex-1">
                    <p>Bombs: <span className="font-bold text-lg">{playerStats.maxBombs}</span></p>
                </div>
                <div className="flex-1">
                    <p>Range: <span className="font-bold text-lg">{playerStats.bombRange}</span></p>
                </div>
                <div className="flex-1">
                    <p>Speed: <span className="font-bold text-lg">{player.speed.toFixed(1)}</span></p>
                </div>
                <div className="flex-1">
                    <p>Kick: <span className="font-bold text-lg">{playerStats.canKickBomb ? '✅' : '❌'}</span></p>
                </div>
                <div className="flex-1">
                    <p>Detonator: <span className="font-bold text-lg">{playerStats.hasDetonator ? '✅' : '❌'}</span></p>
                </div>
            </div>
            <p className="mt-2 text-sm">Arrows to move, Space to drop bombs{playerStats.hasDetonator && ", Shift to detonate"}</p>
        </div>
    );
};

export default BombermanGame;