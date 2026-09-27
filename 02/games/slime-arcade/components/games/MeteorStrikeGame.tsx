import React, { useState, useEffect, useCallback, useRef } from 'react';

const NORMAL_WIDTH = 500;
const NORMAL_HEIGHT = 400;
const BOSS_WIDTH = 700;
const BOSS_HEIGHT = 500;
const MAX_WAVES = 12;

const SHIP_SIZE = 15;
const ENEMY_SIZE = 18;
const BOSS_SIZE = 80;

const BULLET_SPEED = 7;
const BULLET_LIFETIME = 60; // frames
const ASTEROID_SIZES = [40, 25, 15];
const INITIAL_ASTEROIDS = 4;
const INTERMISSION_DURATION = 300; // 5 seconds in frames
const POWERUP_DROP_CHANCE = 0.15; // 15%
const BOSS_POWERUP_DROP_CHANCE = 0.03; // 3% chance on hit

type PowerUpType = 'shield' | 'weapon' | 'speed' | 'traction' | 'beam' | 'green_weapon' | 'purple_weapon' | 'clone' | 'slow' | 'boss' | 'rear_gun';

interface GameObject { x: number; y: number; vx: number; vy: number; angle: number; }
interface Ship extends GameObject { isThrusting: boolean; isShielded: boolean; powerUpTimers: { [key in PowerUpType]?: number }; shootCooldown: number; }
interface Bullet extends GameObject { id: number; lifetime: number; piercing?: boolean; }
interface HomingMissile extends Bullet { targetId: number | null; }
interface EnemyHomingMissile extends Bullet { target: { x: number; y: number } }
interface Asteroid extends GameObject { id: number; size: number; radius: number; }
interface PowerUp extends GameObject { id: number; type: PowerUpType; lifetime: number; warpTimer: number; }
interface Enemy extends GameObject { id: number; type: 'Scout' | 'Hunter' | 'Mini-Slime'; shootCooldown: number; fireRate: number; speed: number; }
interface Boss extends GameObject { id: number; hp: number; maxHp: number; phase: number; attackCooldown: number; currentAttack: 'idle' | 'barrage' | 'spread' | 'homing' | 'summon'; subAttackTimer: number; shotsFiredInBurst: number; }
interface Clone extends Ship { id: number; }
interface Explosion { id: number; x: number; y: number; radius: number; maxRadius: number; lifetime: number; }

const createInitialAsteroids = (): Asteroid[] => {
    const initial: Asteroid[] = [];
    for (let i = 0; i < INITIAL_ASTEROIDS; i++) {
        const edge = Math.floor(Math.random() * 4);
        let x = 0, y = 0;
        if(edge === 0) { x = Math.random() * NORMAL_WIDTH; y = 0; }
        else if(edge === 1) { x = Math.random() * NORMAL_WIDTH; y = NORMAL_HEIGHT; }
        else if(edge === 2) { x = 0; y = Math.random() * NORMAL_HEIGHT; }
        else { x = NORMAL_WIDTH; y = Math.random() * NORMAL_HEIGHT; }

        initial.push({
            id: Date.now() + Math.random(),
            x, y,
            vx: Math.random() * 2 - 1,
            vy: Math.random() * 2 - 1,
            angle: Math.random() * 360,
            size: 0,
            radius: ASTEROID_SIZES[0] / 2,
        });
    }
    return initial;
};

const hasClearLineOfSight = (start: {x:number, y:number}, end: {x:number, y:number}, obstacles: Asteroid[]) => {
    const dx = end.x - start.x; const dy = end.y - start.y; const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return true;
    for (const obs of obstacles) {
        let t = ((obs.x - start.x) * dx + (obs.y - start.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const closestX = start.x + t * dx; const closestY = start.y + t * dy;
        const distSq = Math.pow(obs.x - closestX, 2) + Math.pow(obs.y - closestY, 2);
        if (distSq < obs.radius * obs.radius) return false;
    }
    return true;
};

const MeteorStrikeGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    const [isBossFight, setIsBossFight] = useState(false);
    const WIDTH = isBossFight ? BOSS_WIDTH : NORMAL_WIDTH;
    const HEIGHT = isBossFight ? BOSS_HEIGHT : NORMAL_HEIGHT;
    const [shake, setShake] = useState(0);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const [beamVisual, setBeamVisual] = useState<{ angle: number; lifetime: number } | null>(null);
    const [ship, setShip] = useState<Ship>({ x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0, angle: 0, isThrusting: false, isShielded: false, powerUpTimers: { shield: 0, weapon: 0, speed: 0, traction: 0, beam: 0, green_weapon: 0, purple_weapon: 0, clone: 0, slow: 0, boss: 0, rear_gun: 0 }, shootCooldown: 0, });
    const [asteroids, setAsteroids] = useState<Asteroid[]>(createInitialAsteroids());
    const [bullets, setBullets] = useState<Bullet[]>([]);
    const [homingMissiles, setHomingMissiles] = useState<HomingMissile[]>([]);
    const [enemyHomingMissiles, setEnemyHomingMissiles] = useState<EnemyHomingMissile[]>([]);
    const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
    const [enemies, setEnemies] = useState<Enemy[]>([]);
    const [enemyBullets, setEnemyBullets] = useState<Bullet[]>([]);
    const [boss, setBoss] = useState<Boss | null>(null);
    const [clone, setClone] = useState<Clone | null>(null);
    const [keys, setKeys] = useState<Record<string, boolean>>({});
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [lives, setLives] = useState(5);
    const [shipInvincibleTimer, setShipInvincibleTimer] = useState(0);
    const [wave, setWave] = useState(0);
    const [waveMessage, setWaveMessage] = useState('');
    const [intermissionTimer, setIntermissionTimer] = useState(0);
    const [spawnDelayTimer, setSpawnDelayTimer] = useState(0);
    const [enemiesSpawnedThisWave, setEnemiesSpawnedThisWave] = useState(false);

    const gameLoopRef = useRef<number | null>(null);
    const asteroidsRef = useRef(asteroids); asteroidsRef.current = asteroids;
    const shipRef = useRef(ship); shipRef.current = ship;
    const bossRef = useRef(boss); bossRef.current = boss;
    const enemiesRef = useRef(enemies); enemiesRef.current = enemies;
    const bossPowerUpCycle: PowerUpType[] = ['shield', 'weapon', 'speed', 'traction', 'beam', 'green_weapon', 'purple_weapon', 'clone', 'slow'];
    const bossPowerUpCycleIndexRef = useRef(0);

    const createAsteroid = useCallback((x: number, y: number, size: number): Asteroid => ({ id: Date.now() + Math.random(), x, y, vx: Math.random() * 2 - 1, vy: Math.random() * 2 - 1, angle: Math.random() * 360, size, radius: ASTEROID_SIZES[size] / 2, }), []);

    const createEnemiesForWave = useCallback((w: number, typeOverride?: Enemy['type'], countOverride?: number, speedMultiplier: number = 1) => {
        const newEnemies: Enemy[] = [];
        let totalEnemies = countOverride ?? Math.min(12, 1 + w); 
        let hunterCount = 0; let scoutCount = totalEnemies;

        if (!typeOverride) {
            if (w >= 3 && w < 7) hunterCount = Math.floor(totalEnemies * 0.25);
            if (w >= 7) hunterCount = Math.floor(totalEnemies * 0.5);
            scoutCount = totalEnemies - hunterCount;
        }

        const createEnemy = (type: Enemy['type']): Enemy => {
            const speed = ((type === 'Scout' || type === 'Mini-Slime') ? 1 : 1.2) * speedMultiplier + (w * 0.1);
            const fireRate = Math.max(type === 'Scout' ? 50 : 40, (type === 'Scout' ? 120 : 100) - w * 5);
            let spawnX, spawnY, validSpawn; let retries = 20;
            do {
                const edge = Math.floor(Math.random() * 4);
                if (edge === 0) { spawnX = Math.random() * WIDTH; spawnY = -ENEMY_SIZE; }
                else if (edge === 1) { spawnX = Math.random() * WIDTH; spawnY = HEIGHT + ENEMY_SIZE; }
                else if (edge === 2) { spawnX = -ENEMY_SIZE; spawnY = Math.random() * HEIGHT; }
                else { spawnX = WIDTH + ENEMY_SIZE; spawnY = Math.random() * HEIGHT; }
                validSpawn = !asteroidsRef.current.some(a => Math.hypot(spawnX - a.x, spawnY - a.y) < a.radius + ENEMY_SIZE * 2);
                retries--;
            } while (!validSpawn && retries > 0);
            return { id: Date.now() + Math.random(), x: spawnX, y: spawnY, angle: 0, vx: 0, vy: 0, type, shootCooldown: Math.random() * fireRate, fireRate, speed };
        };
        
        if(typeOverride) { for (let i = 0; i < totalEnemies; i++) newEnemies.push(createEnemy(typeOverride)); } 
        else { for (let i = 0; i < scoutCount; i++) newEnemies.push(createEnemy('Scout')); for (let i = 0; i < hunterCount; i++) newEnemies.push(createEnemy('Hunter')); }

        if (newEnemies.length > 0) { if(!countOverride) setEnemiesSpawnedThisWave(true); setEnemies(prev => [...prev, ...newEnemies]); }
    }, [WIDTH, HEIGHT]);

    useEffect(() => {
        let powerUpInterval: number | undefined;
        if (isBossFight && !gameOver) {
            bossPowerUpCycleIndexRef.current = 0;
            powerUpInterval = window.setInterval(() => {
                const powerUpToGrant = bossPowerUpCycle[bossPowerUpCycleIndexRef.current];
                setShip(s => {
                    const newShipState = { ...s }; const timers = { ...s.powerUpTimers };
                    if (powerUpToGrant === 'shield') newShipState.isShielded = true;
                    else if (powerUpToGrant === 'clone') timers.clone = 1200;
                    else if (['green_weapon', 'purple_weapon', 'slow'].includes(powerUpToGrant)) timers[powerUpToGrant] = 600;
                    else if (['weapon', 'speed', 'traction', 'beam'].includes(powerUpToGrant)) timers[powerUpToGrant] = 300;
                    newShipState.powerUpTimers = timers; return newShipState;
                });
                if (powerUpToGrant === 'clone') { setClone(c => c ? c : { ...shipRef.current, id: Date.now(), shootCooldown: 60 }); }
                bossPowerUpCycleIndexRef.current = (bossPowerUpCycleIndexRef.current + 1) % bossPowerUpCycle.length;
            }, 7000);
        }
        return () => { if (powerUpInterval) window.clearInterval(powerUpInterval); };
    }, [isBossFight, gameOver]);

    useEffect(() => {
        if (isBossFight && !boss) {
            setTimeout(() => {
                setWaveMessage('');
                setShip(s => ({...s, x: BOSS_WIDTH / 2, y: BOSS_HEIGHT * 0.8 }));
                const bossHp = wave === 5 ? 1000 : wave === 10 ? 2500 : 4000;
                setBoss({
                    id: Date.now() + Math.random(),
                    x: BOSS_WIDTH / 2, y: BOSS_HEIGHT * 0.2,
                    vx: 0.5 + (wave / 10), vy: 0, angle: 0,
                    hp: bossHp, maxHp: bossHp,
                    phase: 1, attackCooldown: 120 - (wave*2),
                    currentAttack: 'idle', subAttackTimer: 0, shotsFiredInBurst: 0,
                });
            }, 2000);
        }
    }, [isBossFight, boss, wave]);

    useEffect(() => { if (wave === 0 && !gameOver) setIntermissionTimer(90); }, [wave, gameOver]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        e.preventDefault(); setKeys(prev => ({ ...prev, [e.key]: true }));
        if (e.key === ' ' && !e.repeat && shipRef.current.shootCooldown <= 0) {
            const ship = shipRef.current; const hasWeaponPowerup = (ship.powerUpTimers.weapon ?? 0) > 0; const hasBeamPowerup = (ship.powerUpTimers.beam ?? 0) > 0; const hasGreenWeaponPowerup = (ship.powerUpTimers.green_weapon ?? 0) > 0; const hasPurpleWeaponPowerup = (ship.powerUpTimers.purple_weapon ?? 0) > 0; const hasRearGun = (ship.powerUpTimers.rear_gun ?? 0) > 0;
            if (hasRearGun) { const rearAngle = ship.angle + Math.PI; setBullets(prev => [...prev, { id: Date.now() + Math.random(), x: ship.x + Math.cos(rearAngle) * SHIP_SIZE, y: ship.y + Math.sin(rearAngle) * SHIP_SIZE, vx: Math.cos(rearAngle) * BULLET_SPEED + ship.vx, vy: Math.sin(rearAngle) * BULLET_SPEED + ship.vy, angle: 0, lifetime: BULLET_LIFETIME, }]); }
            if (hasBeamPowerup) { setShip(s => ({ ...s, shootCooldown: 40, powerUpTimers: { ...s.powerUpTimers, beam: 0 } })); setBeamVisual({ angle: ship.angle, lifetime: 10 });
            } else if (hasGreenWeaponPowerup) { setShip(s => ({ ...s, shootCooldown: 10 })); const newBullets = [-0.1, 0, 0.1].map(offset => { const finalAngle = ship.angle + offset; return { id: Date.now() + Math.random(), x: ship.x + Math.cos(finalAngle) * SHIP_SIZE, y: ship.y + Math.sin(finalAngle) * SHIP_SIZE, vx: Math.cos(finalAngle) * BULLET_SPEED + ship.vx, vy: Math.sin(finalAngle) * BULLET_SPEED + ship.vy, angle: finalAngle, lifetime: BULLET_LIFETIME, piercing: true, }; }); setBullets(prev => [...prev, ...newBullets]);
            } else if (hasPurpleWeaponPowerup) { setShip(s => ({ ...s, shootCooldown: 20 })); const newMissiles = Array(3).fill(0).map((_, i) => { const angle = ship.angle + (i - 1) * 0.2; return { id: Date.now() + Math.random(), x: ship.x + Math.cos(angle) * SHIP_SIZE, y: ship.y + Math.sin(angle) * SHIP_SIZE, vx: Math.cos(angle) * BULLET_SPEED * 0.5 + ship.vx, vy: Math.sin(angle) * BULLET_SPEED * 0.5 + ship.vy, angle: 0, lifetime: 180, targetId: null, }; }); setHomingMissiles(prev => [...prev, ...newMissiles]);
            } else if (hasWeaponPowerup) { setShip(s => ({ ...s, shootCooldown: 8 })); const newBullets = [-0.2, 0, 0.2].map(offset => { const finalAngle = ship.angle + offset; return { id: Date.now() + Math.random(), x: ship.x + Math.cos(finalAngle) * SHIP_SIZE, y: ship.y + Math.sin(finalAngle) * SHIP_SIZE, vx: Math.cos(finalAngle) * BULLET_SPEED + ship.vx, vy: Math.sin(finalAngle) * BULLET_SPEED + ship.vy, angle: 0, lifetime: BULLET_LIFETIME, }; }); setBullets(prev => [...prev, ...newBullets]);
            } else { setShip(s => ({ ...s, shootCooldown: 15 })); setBullets(prev => [...prev, { id: Date.now() + Math.random(), x: ship.x + Math.cos(ship.angle) * SHIP_SIZE, y: ship.y + Math.sin(ship.angle) * SHIP_SIZE, vx: Math.cos(ship.angle) * BULLET_SPEED + ship.vx, vy: Math.sin(ship.angle) * BULLET_SPEED + ship.vy, angle: 0, lifetime: BULLET_LIFETIME, }]); }
        }
    }, []);
    const handleKeyUp = useCallback((e: KeyboardEvent) => setKeys(prev => ({ ...prev, [e.key]: false })), []);
    useEffect(() => { window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); }; }, [handleKeyDown, handleKeyUp]);

    const gameLoop = useCallback(() => {
        if (gameOver) return;
        const isSlowMo = (shipRef.current.powerUpTimers.slow ?? 0) > 0; const timeScale = isSlowMo ? 0.5 : 1.0;
        if (shipInvincibleTimer > 0) setShipInvincibleTimer(t => t - 1); if (beamVisual) setBeamVisual(bv => (bv && bv.lifetime > 1 ? { ...bv, lifetime: bv.lifetime - 1 } : null)); if (shake > 0) setShake(s => s - 1); setExplosions(exps => exps.map(e => ({...e, radius: e.radius + 1, lifetime: e.lifetime -1})).filter(e => e.lifetime > 0));
        
        if (intermissionTimer > 0) {
            setIntermissionTimer(t => { const newTime = t - 1;
                if (newTime <= 0) { const nextWave = wave + 1; setWave(nextWave);
                    if (nextWave === 5 || nextWave === 10 || nextWave === 12) { setIsBossFight(true); setEnemies([]); setEnemiesSpawnedThisWave(true); setWaveMessage(`BOSS INCOMING: Wave ${nextWave}`); } 
                    else if (nextWave > MAX_WAVES) { setGameOver(true); }
                    else { setWaveMessage(`Wave ${nextWave}`); setSpawnDelayTimer(3 * 60); }
                } return newTime;
            });
        } else if (spawnDelayTimer > 0) {
             setSpawnDelayTimer(t => { const newTime = t - 1; if (newTime === 1.5 * 60) setWaveMessage("Enemies approaching..."); if (newTime <= 0) { setWaveMessage(''); createEnemiesForWave(wave); } return newTime; });
        } else if (enemies.length === 0 && !boss && wave > 0 && enemiesSpawnedThisWave) { setEnemiesSpawnedThisWave(false); setIntermissionTimer(INTERMISSION_DURATION); }
        
        setShip(s => { let { x, y, vx, vy, angle, isThrusting, powerUpTimers, shootCooldown } = s; if (keys['ArrowLeft']) angle -= 0.1; if (keys['ArrowRight']) angle += 0.1; isThrusting = !!keys['ArrowUp']; const thrustMultiplier = (powerUpTimers.speed ?? 0) > 0 ? 1.5 : 1.0; const friction = (powerUpTimers.traction ?? 0) > 0 ? 0.97 : 0.99; if (isThrusting) { vx += Math.cos(angle) * 0.1 * thrustMultiplier; vy += Math.sin(angle) * 0.1 * thrustMultiplier; } vx *= friction; vy *= friction; x += vx; y += vy; if (x < 0) x = WIDTH; if (x > WIDTH) x = 0; if (y < 0) y = HEIGHT; if (y > HEIGHT) y = 0; const newTimers: { [key in PowerUpType]?: number } = { ...powerUpTimers }; (Object.keys(newTimers) as PowerUpType[]).forEach(k => newTimers[k] = Math.max(0, (newTimers[k] ?? 0) - 1)); return { ...s, x, y, vx, vy, angle, isThrusting, powerUpTimers: newTimers, shootCooldown: Math.max(0, shootCooldown - 1) }; });
        setBullets(bs => bs.map(b => ({ ...b, x: b.x + b.vx, y: b.y + b.vy, lifetime: b.lifetime - 1 })).filter(b => b.lifetime > 0)); setEnemyBullets(bs => bs.map(b => ({ ...b, x: b.x + b.vx * timeScale, y: b.y + b.vy * timeScale, lifetime: b.lifetime - 1 })).filter(b => b.lifetime > 0));
        setEnemyHomingMissiles(ms => ms.map(m => { m.x += m.vx * timeScale; m.y += m.vy * timeScale; const angleToTarget = Math.atan2(shipRef.current.y - m.y, shipRef.current.x - m.x); const currentAngle = Math.atan2(m.vy, m.vx); let angleDiff = angleToTarget - currentAngle; while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI; const finalAngle = currentAngle + Math.max(-0.03, Math.min(0.03, angleDiff)); const speed = 2.5; m.vx = Math.cos(finalAngle) * speed; m.vy = Math.sin(finalAngle) * speed; m.lifetime--; return m; }).filter(m => m.lifetime > 0));
        setPowerUps(currentPowerUps => currentPowerUps.map(p => { let { x, y, lifetime, warpTimer } = p; lifetime--; warpTimer--; if (warpTimer <= 0) { const warpRadius = 50; x += (Math.random() - 0.5) * 2 * warpRadius; y += (Math.random() - 0.5) * 2 * warpRadius; x = Math.max(10, Math.min(WIDTH - 10, x)); y = Math.max(10, Math.min(HEIGHT - 10, y)); warpTimer = 90; } return { ...p, x, y, lifetime, warpTimer }; }).filter(p => p.lifetime > 0));
        setHomingMissiles(currentMissiles => currentMissiles.map(m => { let { x, y, vx, vy, lifetime, targetId } = m; let target: Enemy | Boss | undefined = enemiesRef.current.find(e => e.id === targetId); if (!target) { let closestDist = Infinity; [...enemiesRef.current, bossRef.current].filter(Boolean).forEach(enemy => { const dist = Math.hypot(enemy!.x - x, enemy!.y - y); if (dist < closestDist) { closestDist = dist; target = enemy!; } }); if (target) m.targetId = target.id; } if (target) { const angleToTarget = Math.atan2(target.y - y, target.x - x); const turnSpeed = 0.1; const currentAngle = Math.atan2(vy, vx); let angleDiff = angleToTarget - currentAngle; while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI; while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI; const finalAngle = currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, angleDiff)); const speed = 4; vx = Math.cos(finalAngle) * speed; vy = Math.sin(finalAngle) * speed; } x += vx; y += vy; lifetime--; return { ...m, x, y, vx, vy, lifetime }; }).filter(m => m.lifetime > 0));
        if (clone) setClone(c => { if (!c) return null; let { x, y, vx, vy, angle, shootCooldown } = c; let closestThreat = null; let minThreatDist = 100; [...enemyBullets, ...asteroidsRef.current].forEach((t: any) => { const dist = Math.hypot(t.x - x, t.y - y); if (dist < minThreatDist) { minThreatDist = dist; closestThreat = t; } }); if (closestThreat) { const angleFromThreat = Math.atan2(y - closestThreat.y, x - closestThreat.x); vx += Math.cos(angleFromThreat) * 0.2; vy += Math.sin(angleFromThreat) * 0.2; } let closestEnemy = null; let minEnemyDist = Infinity; [...enemiesRef.current, bossRef.current].filter(Boolean).forEach(e => { const dist = Math.hypot(e!.x - x, e!.y - y); if (dist < minEnemyDist) { minEnemyDist = dist; closestEnemy = e!; } }); if (closestEnemy) { angle = Math.atan2(closestEnemy.y - y, closestEnemy.x - x); if (shootCooldown <= 0) { shootCooldown = 40; const newCloneBullets = [-0.3, -0.15, 0, 0.15, 0.3].map(offset => { const finalAngle = angle + offset; return { id: Date.now() + Math.random(), x: x + Math.cos(finalAngle) * SHIP_SIZE, y: y + Math.sin(finalAngle) * SHIP_SIZE, vx: Math.cos(finalAngle) * BULLET_SPEED, vy: Math.sin(finalAngle) * BULLET_SPEED, angle: 0, lifetime: BULLET_LIFETIME, }; }); setBullets(prev => [...prev, ...newCloneBullets]); } } shootCooldown--; vx *= 0.98; vy *= 0.98; x += vx; y += vy; if (x < 0) x = WIDTH; if (x > WIDTH) x = 0; if (y < 0) y = HEIGHT; if (y > HEIGHT) y = 0; return { ...c, x, y, vx, vy, angle, shootCooldown }; });
        if ((shipRef.current.powerUpTimers.clone ?? 0) <= 1 && clone) setClone(null);
        setEnemies(currentEnemies => currentEnemies.map(e => { let { x, y, angle, shootCooldown } = e; const shipPos = shipRef.current; const dx = shipPos.x - x; const dy = shipPos.y - y; angle = Math.atan2(dy, dx); x += Math.cos(angle) * e.speed * timeScale; y += Math.sin(angle) * e.speed * timeScale; if (x < 0) x = WIDTH; if (x > WIDTH) x = 0; if (y < 0) y = HEIGHT; if (y > HEIGHT) y = 0; shootCooldown--; if (shootCooldown <= 0) { shootCooldown = e.fireRate; if (hasClearLineOfSight({x,y}, shipPos, asteroidsRef.current)) { if (e.type === 'Scout' || e.type === 'Mini-Slime') { setEnemyBullets(prev => [...prev, { id: Date.now() + Math.random(), x, y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, angle: 0, lifetime: 90 }]); } else { [-0.2, 0, 0.2].forEach(offset => setEnemyBullets(prev => [...prev, { id: Date.now() + Math.random(), x, y, vx: Math.cos(angle + offset) * 4, vy: Math.sin(angle + offset) * 4, angle: 0, lifetime: 90 }])); } } } return { ...e, x, y, angle, shootCooldown }; }));
        setAsteroids(currentAsteroids => currentAsteroids.map(a => { let { x, y } = a; x += a.vx * timeScale; y += a.vy * timeScale; if (x < -a.radius) x = WIDTH + a.radius; if (x > WIDTH + a.radius) x = -a.radius; if (y < -a.radius) y = HEIGHT + a.radius; if (y > HEIGHT + a.radius) y = -a.radius; return { ...a, x, y }; }));
        
        if (boss) { setBoss(b => { if(!b) return null; let { x, y, vx, hp, maxHp, phase, attackCooldown, currentAttack, subAttackTimer, shotsFiredInBurst } = b; if (hp < maxHp / 2 && phase === 1) { phase = 2; vx *= 1.5; setShake(30); } x += vx * timeScale; if (x < BOSS_SIZE/2 || x > WIDTH - BOSS_SIZE/2) vx *= -1; attackCooldown--; subAttackTimer--; if (attackCooldown <= 0) { const attacks = phase === 1 ? ['spread', 'barrage', 'summon'] : ['spread', 'barrage', 'summon', 'homing']; currentAttack = attacks[Math.floor(Math.random() * attacks.length)] as Boss['currentAttack']; attackCooldown = (phase === 1 ? 150 : 90) + Math.random() * 60; subAttackTimer = 0; shotsFiredInBurst = 0; } if (subAttackTimer <= 0) { switch(currentAttack) { case 'barrage': if (shotsFiredInBurst < 8) { const angleToPlayer = Math.atan2(shipRef.current.y - y, shipRef.current.x - x); setEnemyBullets(prev => [...prev, { id: Date.now()+Math.random(), x, y, vx: Math.cos(angleToPlayer)*5, vy: Math.sin(angleToPlayer)*5, angle: 0, lifetime: 120 }]); shotsFiredInBurst++; subAttackTimer = 8; } else { currentAttack = 'idle'; } break; case 'spread': if (shotsFiredInBurst < 1) { for(let i = 0; i < 7; i++) { const angle = (i - 3) * 0.2 + Math.PI / 2; setEnemyBullets(prev => [...prev, { id: Date.now()+Math.random(), x, y, vx: Math.cos(angle)*4, vy: Math.sin(angle)*4, angle: 0, lifetime: 120 }]); } shotsFiredInBurst++; } else { currentAttack = 'idle'; } break; case 'homing': setEnemyHomingMissiles(prev => [...prev, { id: Date.now()+Math.random(), x, y, vx: 0, vy: 2, angle: 0, lifetime: 240, target: {x: shipRef.current.x, y: shipRef.current.y} }]); currentAttack = 'idle'; break; case 'summon': createEnemiesForWave(5, phase === 1 ? 'Mini-Slime' : 'Hunter', phase === 1 ? 3 : 2, phase === 1 ? 0.8 : 1.2); currentAttack = 'idle'; break; } } return {...b, x, y, vx, phase, attackCooldown, currentAttack, subAttackTimer, shotsFiredInBurst}; }); }

        let scoreToAdd = 0; let newShipState = { ...shipRef.current }; let shipIsDestroyed = false; const destroyedPlayerBulletIds = new Set<number>(); const destroyedEnemyBulletIds = new Set<number>(); const destroyedAsteroidIds = new Set<number>(); const destroyedEnemyIds = new Set<number>(); const collectedPowerUpIds = new Set<number>(); const destroyedMissileIds = new Set<number>(); const newAsteroids: Asteroid[] = []; const newPowerUps: PowerUp[] = [];
        if (beamVisual && beamVisual.lifetime === 10) { /* ... */ } const allBullets = [...bullets, ...homingMissiles];
        allBullets.forEach(bullet => { if (destroyedPlayerBulletIds.has(bullet.id) || destroyedMissileIds.has(bullet.id)) return; enemyBullets.forEach(enemyBullet => { if (destroyedEnemyBulletIds.has(enemyBullet.id)) return; if (Math.hypot(bullet.x - enemyBullet.x, bullet.y - enemyBullet.y) < 5) { ('targetId' in bullet) ? destroyedMissileIds.add(bullet.id) : destroyedPlayerBulletIds.add(bullet.id); destroyedEnemyBulletIds.add(enemyBullet.id); scoreToAdd += 1; return; } }); for (const enemy of enemies) { if (destroyedEnemyIds.has(enemy.id)) continue; if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < ENEMY_SIZE) { scoreToAdd += enemy.type === 'Hunter' ? 15 : 10; setExplosions(prev => [...prev, { id: Date.now()+Math.random(), x: enemy.x, y: enemy.y, radius: 0, maxRadius: ENEMY_SIZE, lifetime: 15 }]); destroyedEnemyIds.add(enemy.id); if (!bullet.piercing) ('targetId' in bullet) ? destroyedMissileIds.add(bullet.id) : destroyedPlayerBulletIds.add(bullet.id); return; } } for (const asteroid of asteroids) { if (destroyedAsteroidIds.has(asteroid.id)) continue; if (Math.hypot(asteroid.x - bullet.x, asteroid.y - bullet.y) < asteroid.radius) { if (asteroid.size < ASTEROID_SIZES.length - 1) { newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, asteroid.size + 1)); newAsteroids.push(createAsteroid(asteroid.x, asteroid.y, asteroid.size + 1)); if (Math.random() < POWERUP_DROP_CHANCE) { const powerUpTypes: PowerUpType[] = ['shield', 'weapon', 'speed', 'traction', 'beam', 'green_weapon', 'purple_weapon', 'clone', 'slow', 'boss']; const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]; newPowerUps.push({ id: Date.now() + Math.random(), x: asteroid.x, y: asteroid.y, vx: 0, vy: 0.5, angle: 0, type: randomType, lifetime: 600, warpTimer: 90 }); } } setExplosions(prev => [...prev, { id: Date.now()+Math.random(), x: asteroid.x, y: asteroid.y, radius: 0, maxRadius: asteroid.radius, lifetime: 15 }]); destroyedAsteroidIds.add(asteroid.id); if (!bullet.piercing) ('targetId' in bullet) ? destroyedMissileIds.add(bullet.id) : destroyedPlayerBulletIds.add(bullet.id); return; } } if (bossRef.current && bossRef.current.hp > 0 && Math.hypot(bullet.x - bossRef.current.x, bullet.y - bossRef.current.y) < BOSS_SIZE/2) { if (!bullet.piercing) ('targetId' in bullet) ? destroyedMissileIds.add(bullet.id) : destroyedPlayerBulletIds.add(bullet.id); if (Math.random() < BOSS_POWERUP_DROP_CHANCE) { const powerUpTypes: PowerUpType[] = ['shield', 'weapon', 'speed', 'traction']; const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]; newPowerUps.push({ id: Date.now() + Math.random(), x: bossRef.current.x, y: bossRef.current.y, vx: 0, vy: 0.5, angle: 0, type: randomType, lifetime: 600, warpTimer: 90 }); } setBoss(b => b ? ({...b, hp: b.hp - 1}) : null); scoreToAdd += 2; } });
        [...enemyBullets, ...enemyHomingMissiles].forEach(bullet => { if (Math.hypot(bullet.x - newShipState.x, bullet.y - newShipState.y) < SHIP_SIZE) shipIsDestroyed = true; });
        if (!shipIsDestroyed) { asteroids.forEach(a => { if (Math.hypot(a.x - newShipState.x, a.y - newShipState.y) < SHIP_SIZE + a.radius) shipIsDestroyed = true; }); enemies.forEach(e => { if (Math.hypot(e.x - newShipState.x, e.y - newShipState.y) < SHIP_SIZE + ENEMY_SIZE) shipIsDestroyed = true; }); if (boss && Math.hypot(boss.x - newShipState.x, boss.y - newShipState.y) < SHIP_SIZE + BOSS_SIZE/2) shipIsDestroyed = true; }
        powerUps.forEach(p => { if (Math.hypot(p.x - newShipState.x, p.y - newShipState.y) < SHIP_SIZE + 10) { collectedPowerUpIds.add(p.id); if (p.type === 'shield') { newShipState.isShielded = true; } else if (p.type === 'boss') { if (!isBossFight) { setIsBossFight(true); setWave(12); setEnemies([]); setIntermissionTimer(0); setSpawnDelayTimer(0); setWaveMessage("WARNING: BOSS INCOMING"); setEnemiesSpawnedThisWave(true); } newShipState.powerUpTimers.rear_gun = 99999; } else if (p.type === 'clone') { newShipState.powerUpTimers.clone = 1200; if (!clone) setClone({ ...newShipState, id: Date.now(), shootCooldown: 60 }); } else if (['green_weapon', 'purple_weapon', 'slow'].includes(p.type)) { newShipState.powerUpTimers[p.type] = 600; } else if (['weapon', 'speed', 'traction', 'beam'].includes(p.type)) { newShipState.powerUpTimers[p.type] = 300; } } });
        if (scoreToAdd > 0) setScore(s => s + scoreToAdd); if (destroyedPlayerBulletIds.size > 0) setBullets(bs => bs.filter(b => !destroyedPlayerBulletIds.has(b.id))); if (destroyedMissileIds.size > 0) setHomingMissiles(ms => ms.filter(m => !destroyedMissileIds.has(m.id))); if (destroyedEnemyBulletIds.size > 0) setEnemyBullets(bs => bs.filter(b => !destroyedEnemyBulletIds.has(b.id))); if (destroyedEnemyIds.size > 0) setEnemies(es => es.filter(e => !destroyedEnemyIds.has(e.id))); if (destroyedAsteroidIds.size > 0 || newAsteroids.length > 0) setAsteroids(as => [...as.filter(a => !destroyedAsteroidIds.has(a.id)), ...newAsteroids]); if (collectedPowerUpIds.size > 0) setPowerUps(ps => ps.filter(p => !collectedPowerUpIds.has(p.id))); if (newPowerUps.length > 0) setPowerUps(ps => [...ps, ...newPowerUps]); setShip(s => ({ ...s, isShielded: newShipState.isShielded, powerUpTimers: newShipState.powerUpTimers }));
        if (shipIsDestroyed && shipInvincibleTimer <= 0) { if (newShipState.isShielded) { setShip(s => ({ ...s, isShielded: false })); setShipInvincibleTimer(120); } else { setLives(l => { const newLives = l - 1; if (newLives <= 0) setGameOver(true); else { setShip(s => ({...s, x: WIDTH/2, y: HEIGHT/2, vx: 0, vy: 0})); setShipInvincibleTimer(180); } return newLives; }); } }
        if (boss && boss.hp <= 0) {
            const bossKillScore = (1000 * (wave/5)) + (wave === 12 ? 2000 : 0);
            setScore(s => s + bossKillScore);
            for(let i=0; i<15; i++) { setTimeout(() => { setExplosions(prev => [...prev, { id: Date.now()+Math.random(), x: boss.x + (Math.random() - 0.5) * BOSS_SIZE, y: boss.y + (Math.random() - 0.5) * BOSS_SIZE, radius: 0, maxRadius: 40, lifetime: 30 }]); }, i * 100); }
            setTimeout(() => { setBoss(null); setIsBossFight(false); setEnemiesSpawnedThisWave(true); }, 15 * 100 + 500);
        }
    }, [keys, isBossFight, enemies, boss, wave, bullets, enemyBullets, asteroids, powerUps, homingMissiles, clone, intermissionTimer, spawnDelayTimer, gameOver, createAsteroid, createEnemiesForWave, WIDTH, HEIGHT, enemiesSpawnedThisWave, beamVisual, shipInvincibleTimer, shake, enemyHomingMissiles]);
    
    useEffect(() => { gameLoopRef.current = window.setInterval(gameLoop, 1000 / 60); return () => { if (gameLoopRef.current) window.clearInterval(gameLoopRef.current); }; }, [gameLoop]);

    const getPowerUpColor = (type: PowerUpType) => { switch(type) { case 'shield': return 'deepskyblue'; case 'weapon': return 'yellow'; case 'speed': return 'red'; case 'traction': return 'white'; case 'beam': return 'orange'; case 'green_weapon': return 'lime'; case 'purple_weapon': return 'purple'; case 'clone': return 'pink'; case 'slow': return '#333'; case 'boss': return 'orangered'; } };
    const containerStyle = { transform: shake > 0 ? `translate(${Math.random() * shake - shake/2}px, ${Math.random() * shake - shake/2}px)` : 'none', };

    return (
        <div className="flex flex-col items-center">
            <h4 className="text-xl mb-2">Meteor Strike</h4>
             <div className="pixel-border bg-black relative text-white" style={containerStyle}>
                 <div className="absolute top-0 left-0 right-0 p-2 flex justify-between text-lg z-10 bg-black/30"> <span>EXP: {score}</span> <span>Lives: {lives}</span> <span>Wave: {wave > 0 ? `${wave}/${MAX_WAVES}` : '-'}</span> <span>Enemies: {enemies.length + (boss ? 1 : 0)}</span> </div>
                 <svg width={WIDTH} height={HEIGHT} className="bg-gray-900">
                    {(!shipInvincibleTimer || shipInvincibleTimer % 10 < 5) && <polygon transform={`translate(${ship.x}, ${ship.y}) rotate(${ship.angle * 180 / Math.PI})`} points={`${SHIP_SIZE},0 -${SHIP_SIZE/2},-${SHIP_SIZE/2} -${SHIP_SIZE/2},${SHIP_SIZE/2}`} fill="none" stroke="cyan" strokeWidth="2"/>}
                    {clone && <polygon transform={`translate(${clone.x}, ${clone.y}) rotate(${clone.angle * 180 / Math.PI})`} points={`${SHIP_SIZE},0 -${SHIP_SIZE/2},-${SHIP_SIZE/2} -${SHIP_SIZE/2},${SHIP_SIZE/2}`} fill="none" stroke="pink" strokeWidth="2" opacity="0.7"/>}
                    {ship.isThrusting && <polygon transform={`translate(${ship.x}, ${ship.y}) rotate(${ship.angle * 180 / Math.PI})`} points={`-${SHIP_SIZE/2},0 -${SHIP_SIZE},0`} fill="none" stroke="orange" strokeWidth="3"/>}
                    {ship.isShielded && <circle cx={ship.x} cy={ship.y} r={SHIP_SIZE * 1.2} fill="none" stroke="deepskyblue" strokeWidth="2" strokeDasharray="4" />}
                    {asteroids.map((a) => <circle key={a.id} cx={a.x} cy={a.y} r={a.radius} fill="none" stroke="gray" strokeWidth="2" />)}
                    {powerUps.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r={8} fill={getPowerUpColor(p.type)} stroke="white" strokeWidth="1" />)}
                    {enemies.map((e) => <polygon key={e.id} transform={`translate(${e.x}, ${e.y}) rotate(${(e.angle * 180 / Math.PI) + 90})`} points={`0,-${ENEMY_SIZE*0.8} ${ENEMY_SIZE/2},${ENEMY_SIZE/2} -${ENEMY_SIZE/2},${ENEMY_SIZE/2}`} fill={e.type === 'Hunter' ? 'purple' : (e.type === 'Mini-Slime' ? '#ff8c00' : 'red')} />)}
                    {boss && <> <circle cx={boss.x} cy={boss.y} r={BOSS_SIZE/2} fill="#222" stroke="magenta" strokeWidth="3" /> <circle cx={boss.x} cy={boss.y} r={BOSS_SIZE/3} fill={boss.phase === 1 ? "darkred" : "red"} stroke="magenta" strokeWidth="1" /> <circle cx={boss.x} cy={boss.y} r={BOSS_SIZE/5} fill={boss.phase === 1 ? "red" : "orange"} className="flicker" /> </>}
                    {bullets.map((b) => <rect key={b.id} x={b.x- (b.piercing ? 6:2)} y={b.y- (b.piercing ? 1:2)} width={b.piercing ? 12:4} height={b.piercing ? 2:4} fill={b.piercing ? 'lime' : 'yellow'} transform={`rotate(${b.angle * 180 / Math.PI} ${b.x} ${b.y})`}/>)}
                    {homingMissiles.map((m) => <polygon key={m.id} points="0,-5 3,5 -3,5" fill="violet" transform={`translate(${m.x} ${m.y}) rotate(${Math.atan2(m.vy, m.vx) * 180 / Math.PI + 90})`}/>)}
                    {enemyBullets.map((b) => <circle key={b.id} cx={b.x} cy={b.y} r="3" fill="magenta" />)}
                    {enemyHomingMissiles.map((m) => <circle key={m.id} cx={m.x} cy={m.y} r="5" fill="none" stroke="orange" strokeWidth="2" />)}
                    {beamVisual && <line x1={ship.x} y1={ship.y} x2={ship.x + Math.cos(beamVisual.angle) * (WIDTH + HEIGHT)} y2={ship.y + Math.sin(beamVisual.angle) * (WIDTH + HEIGHT)} stroke="orange" strokeWidth={beamVisual.lifetime} strokeLinecap="round" strokeOpacity={beamVisual.lifetime / 10} />}
                    {explosions.map(e => <circle key={e.id} cx={e.x} cy={e.y} r={e.radius} fill="orange" opacity={e.lifetime / 15} />)}
                 </svg>
                 {boss && ( <div className="absolute top-12 left-1/2 -translate-x-1/2 w-3/4"> <div className="w-full bg-gray-700 border-2 border-magenta"><div className="h-3 bg-red-500" style={{width: `${Math.max(0, boss.hp/boss.maxHp * 100)}%`}}></div></div> </div> )}
                {(gameOver || waveMessage || (intermissionTimer > 0 && enemies.length === 0)) && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-center">
                        {gameOver ? <> <h2 className="text-3xl text-red-500">{ (wave > MAX_WAVES) ? "VICTORY!" : "GAME OVER"}</h2> <p className="text-xl mt-2">Final EXP: {score}</p> <button onClick={() => onGameEnd(score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200"> Back to Training </button> </> : <> {waveMessage && <h2 className="text-4xl text-yellow-300 flicker">{waveMessage}</h2>} {intermissionTimer > 0 && !waveMessage && enemies.length === 0 && <h2 className="text-2xl">Next wave in {Math.ceil(intermissionTimer/60)}...</h2>} </>}
                    </div>
                )}
            </div>
            <p className="mt-2 text-sm">Arrows to turn/thrust, Space to shoot</p>
        </div>
    );
};

export default MeteorStrikeGame;