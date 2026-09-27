import React, { useState, useEffect, useCallback, useRef } from 'react';

const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 20;
const PLAYER_STEP = 5;
const PROJECTILE_SPEED = 7;
const PLAYER_HP = 5;
const INTERMISSION_DURATION = 240; // 4 seconds at 60fps

const ENEMY_PROJECTILE_SPEED = -4;

const ENEMY_TYPES = {
    GRUNT: { speed: 2.0, hp: 2, width: 25, height: 20 },
    CHARGER: { speed: 4.0, hp: 2, width: 25, height: 20 },
    SHOOTER: { speed: 1.2, hp: 3, width: 25, height: 20, shootCooldown: 90 },
    WEAVER: { speed: 1.8, hp: 3, width: 25, height: 20, amplitude: 50, frequency: 0.05 },
    KAMIKAZE: { speed: 3.5, hp: 1, width: 25, height: 20, chargeSpeed: 14 },
    MINER: { speed: 1.5, hp: 4, width: 25, height: 20, mineDropCooldown: 130 },
    BUFFER: { speed: 1.2, hp: 5, width: 30, height: 25, buffCooldown: 180, buffRadius: 75, buffDuration: 300 },
    'Mini-Slime': { speed: 1.5, hp: 1, width: 15, height: 15 },
    'Hunter': { speed: 2.0, hp: 3, width: 20, height: 20, shootCooldown: 70 },
};
const MINE_LIFETIME = 300;
const BUFF_SPEED_MULTIPLIER = 1.5;

const BOSS_CONFIGS = {
    WAVE_5: { name: "Mini-Boss", hp: 150, speed: 1, vx: 1, attackCooldownBase: 120, evadeCooldownBase: 200, burstSalvos: 2, burstCooldownBase: 20, width: 60, height: 45 },
    WAVE_10: { name: "Slime Sentinel", hp: 300, speed: 1.2, vx: 1.2, attackCooldownBase: 100, evadeCooldownBase: 180, burstSalvos: 3, burstCooldownBase: 15, width: 80, height: 60 },
    WAVE_12: { name: "Galactic Overlord", hp: 500, speed: 1.5, vx: 1.5, attackCooldownBase: 80, evadeCooldownBase: 150, burstSalvos: 4, burstCooldownBase: 10, width: 90, height: 70 },
};

const WAVES = [
    { name: "First Contact", config: { GRUNT: 10 }, kills: 10 },
    { name: "A Little Faster", config: { GRUNT: 7, CHARGER: 3 }, kills: 20 },
    { name: "They Shoot Back!", config: { GRUNT: 5, SHOOTER: 3, WEAVER: 2 }, kills: 30 },
    { name: "Minefield Madness", config: { SHOOTER: 4, WEAVER: 3, MINER: 3 }, kills: 40 },
    { name: "BOSS: Mini-Boss", type: 'boss', config: BOSS_CONFIGS.WAVE_5, kills: 0 },
    { name: "Unstoppable Force", config: { CHARGER: 6, KAMIKAZE: 5, BUFFER: 2 }, kills: 50 },
    { name: "Weaver's Dance", config: { GRUNT: 4, WEAVER: 6, SHOOTER: 3 }, kills: 60 },
    { name: "Buffer Zone", config: { MINER: 5, BUFFER: 3, CHARGER: 4 }, kills: 70 },
    { name: "Total Chaos", config: { GRUNT: 10, CHARGER: 6, SHOOTER: 5, WEAVER: 4 }, kills: 80 },
    { name: "BOSS: Slime Sentinel", type: 'boss', config: BOSS_CONFIGS.WAVE_10, kills: 0 },
    { name: "The Final Gauntlet", config: { CHARGER: 8, SHOOTER: 5, KAMIKAZE: 7, BUFFER: 3 }, kills: 90 },
    { name: "BOSS: Galactic Overlord", type: 'boss', config: BOSS_CONFIGS.WAVE_12, kills: 0 },
];
const TOTAL_WAVES = WAVES.length;
type PowerUpType = 'gravity_gun' | 'laser_beam' | 'spread_shot' | 'shield' | 'rapid_fire';
interface GameObject { id: number; x: number; y: number; width: number; height: number; }
type EnemyType = keyof typeof ENEMY_TYPES;
interface Player extends GameObject { heldPowerUps: PowerUpType[]; selectedPowerUpIndex: number; shootCooldown: number; }
interface Projectile extends GameObject { dx: number; dy: number; damage: number; }
interface GravityBullet extends Projectile { accumulatedDamage: number; size: number; pullRadius: number; }
interface Mine extends GameObject { lifetime: number; }
interface Enemy extends GameObject { hp: number; speed: number; type: EnemyType; shootCooldown?: number; initialY?: number; isCharging?: boolean; chargeSpeed?: number; mineDropCooldown?: number; buffCooldown?: number; isBuffed?: boolean; buffTimer?: number; }
interface Boss extends GameObject { name: string; hp: number; maxHp: number; vx: number; speed: number; attackCooldownBase: number; evadeCooldownBase: number; burstSalvos: number; burstCooldownBase: number; attackCooldown: number; evadeCooldown: number; evadeTargetY?: number; isBursting?: boolean; burstsLeft?: number; burstCooldown?: number; phase: number; currentAttack: 'idle' | 'barrage' | 'spread' | 'homing' | 'summon'; subAttackTimer: number; shotsFiredInBurst: number; }
interface PowerUpIcon extends GameObject { type: PowerUpType; }
interface ActivePowerUp { type: PowerUpType; timer: number; }
interface Explosion { id: number; x: number; y: number; timer: number; size: number; }

const checkCollision = (a: GameObject, b: GameObject) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const HelpModal = ({ onClose }: { onClose: () => void }) => (
    <div className="absolute inset-0 bg-black bg-opacity-85 flex items-center justify-center z-20 p-4">
        <div className="pixel-border bg-black p-6 relative max-w-lg w-full text-green-400">
            <button onClick={onClose} className="absolute top-2 right-2 text-2xl px-2">&times;</button>
            <h3 className="text-2xl text-center mb-4 flicker text-yellow-400">Slime Impact Intel</h3>
            <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h4 className="font-bold text-lg text-green-300">Power-ups (Shoot to Collect)</h4>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>(G) Gravity Gun:</strong> For 10s, shots become orbs that pull in and destroy nearby enemies & projectiles, growing in power.</li>
                        <li><strong>(L) Laser Beam:</strong> A single-use, screen-piercing laser that destroys everything in its path.</li>
                        <li><strong>(S) Spread Shot:</strong> For 10s, your ship fires a wide 5-way spread of bullets.</li>
                        <li><strong>(H) Shield:</strong> Grants 10 seconds of complete invincibility.</li>
                        <li><strong>(R) Rapid Fire:</strong> For 10s, your ship's fire rate is massively increased.</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-green-300">Enemy Units</h4>
                     <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Grunt:</strong> Standard enemy, moves forward slowly.</li>
                        <li><strong>Charger:</strong> A faster version of the Grunt that aims for the player.</li>
                        <li><strong>Shooter:</strong> Stays at a distance and fires projectiles.</li>
                        <li><strong>Weaver:</strong> Moves in an unpredictable sine-wave pattern.</li>
                        <li><strong>Kamikaze:</strong> Charges at the player at high speed for a suicide attack.</li>
                        <li><strong>Miner:</strong> Drops stationary mines that explode after a short time.</li>
                        <li><strong>Buffer:</strong> Creates a protective aura, speeding up nearby enemies.</li>
                        <li><strong>Mini-Slime:</strong> Weak minion summoned by bosses.</li>
                        <li><strong>Hunter:</strong> More aggressive minion summoned by bosses, fires spread shots.</li>
                    </ul>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-green-300">Boss Intel</h4>
                     <ul className="list-disc list-inside space-y-1 ml-2">
                        <li><strong>Wave 5 - Mini-Boss:</strong> High HP. Fires barrages and summons Mini-Slimes.</li>
                        <li><strong>Wave 10 - Slime Sentinel:</strong> Higher HP and speed. More aggressive attacks. Summons Hunters.</li>
                        <li><strong>Wave 12 - Galactic Overlord:</strong> The final challenge. Extremely high HP and speed. Uses all previous attacks plus a deadly homing projectile.</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
);


const SlimeImpactGame: React.FC<{ onGameEnd: (score: number) => void }> = ({ onGameEnd }) => {
    // State is now inside a ref to ensure the game loop always has the latest version.
    const gameStateRef = useRef({
        player: { id: 0, x: 10, y: GAME_HEIGHT / 2 - PLAYER_HEIGHT / 2, width: PLAYER_WIDTH, height: PLAYER_HEIGHT, heldPowerUps: [], selectedPowerUpIndex: 0, shootCooldown: 0 },
        projectiles: [] as Projectile[],
        gravityBullets: [] as GravityBullet[],
        enemies: [] as Enemy[],
        enemyProjectiles: [] as Projectile[],
        boss: null as Boss | null,
        powerUpIcons: [] as PowerUpIcon[],
        activePowerUp: null as ActivePowerUp | null,
        laserVisual: null as {timer: number} | null,
        explosions: [] as Explosion[],
        keysPressed: {} as Record<string, boolean>,
        gameOver: '' as '' | 'win' | 'lose',
        score: 0,
        playerHp: PLAYER_HP,
        wave: 0,
        isBossFight: false,
        intermissionTimer: 0,
        killsThisWave: 0,
        killsToClearWave: 10,
        spawnTimer: 0,
        powerUpSpawnTimer: 300,
        shake: 0,
    });
    
    // UI state remains in React state to trigger re-renders.
    // Fix: Explicitly type the uiState to avoid inference issues on complex objects.
    const [uiState, setUiState] = useState<typeof gameStateRef.current>({ ...gameStateRef.current });
    const [waveMessage, setWaveMessage] = useState('');
    const [showHelp, setShowHelp] = useState(false);
    
    const startNextWave = useCallback(() => {
        const state = gameStateRef.current;
        if (state.wave >= TOTAL_WAVES) {
            state.gameOver = 'win';
            return;
        }
        const waveConfig = WAVES[state.wave];
        setWaveMessage(waveConfig.name);
        setTimeout(() => setWaveMessage(''), 2000);
        
        state.isBossFight = waveConfig.type === 'boss';
        if (state.isBossFight) {
            const bossConfig = waveConfig.config as typeof BOSS_CONFIGS.WAVE_5;
            state.boss = { id: Date.now(), x: GAME_WIDTH - bossConfig.width, y: GAME_HEIGHT/2 - bossConfig.height/2, ...bossConfig, maxHp: bossConfig.hp, attackCooldown: bossConfig.attackCooldownBase, evadeCooldown: bossConfig.evadeCooldownBase, phase: 1, currentAttack: 'idle', subAttackTimer: 0, shotsFiredInBurst: 0 };
        } else {
            state.boss = null;
            state.killsThisWave = 0;
            state.killsToClearWave = waveConfig.kills;
        }
    }, []);

    useEffect(() => {
        startNextWave();
    }, [startNextWave]);

    const gameTick = useCallback(() => {
        const state = gameStateRef.current;
        if (state.gameOver) return;
        
        const waveConfig = WAVES[state.wave];
        // This guard clause prevents crashes after the final wave.
        if (!waveConfig) {
            state.gameOver = 'win';
            return;
        }

        // --- INTERMISSION LOGIC ---
        if (state.intermissionTimer > 0) {
            state.intermissionTimer--;
            if (state.intermissionTimer <= 0) {
                state.wave++;
                startNextWave();
            } else {
                setWaveMessage(`Next Wave in ${Math.ceil(state.intermissionTimer / 60)}...`);
            }
             setUiState({ ...state }); // Update UI during intermission
            return;
        }

        // --- DECREMENT TIMERS ---
        if (state.shake > 0) state.shake--;
        if (state.player.shootCooldown > 0) state.player.shootCooldown--;
        if (state.laserVisual && state.laserVisual.timer > 0) state.laserVisual.timer--;
        if (state.activePowerUp) {
            if (state.activePowerUp.timer - 1 <= 0) state.activePowerUp = null;
            else state.activePowerUp.timer--;
        }
        state.explosions = state.explosions.map(e => ({ ...e, timer: e.timer - 1 })).filter(e => e.timer > 0);

        // --- PLAYER MOVEMENT ---
        let nextPlayerY = state.player.y;
        if (state.keysPressed['ArrowUp']) nextPlayerY -= PLAYER_STEP;
        if (state.keysPressed['ArrowDown']) nextPlayerY += PLAYER_STEP;
        state.player.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_HEIGHT, nextPlayerY));

        // --- PROJECTILE MOVEMENT ---
        state.projectiles = state.projectiles.map(p => ({ ...p, x: p.x + p.dx, y: p.y + p.dy })).filter(p => p.x < GAME_WIDTH);
        state.enemyProjectiles = state.enemyProjectiles.map(p => ({ ...p, x: p.x + p.dx, y: p.y + p.dy })).filter(p => p.x > -p.width);
        state.gravityBullets = state.gravityBullets.map(gb => ({...gb, x: gb.x + gb.dx})).filter(gb => gb.x < GAME_WIDTH);

        // --- SPAWNING ---
        state.powerUpSpawnTimer--;
        if (state.powerUpSpawnTimer <= 0 && state.powerUpIcons.length < 2) {
            const types: PowerUpType[] = ['gravity_gun', 'laser_beam', 'spread_shot', 'shield', 'rapid_fire'];
            state.powerUpIcons.push({ id: Date.now(), type: types[Math.floor(Math.random()*types.length)], x: Math.random()*(GAME_WIDTH-150)+100, y: Math.random()*(GAME_HEIGHT-20), width: 20, height: 20 });
            state.powerUpSpawnTimer = 400 + Math.random() * 200;
        }

        if (state.spawnTimer > 0) state.spawnTimer--;
        if (state.spawnTimer <= 0 && !state.isBossFight && state.enemies.length < 15) {
            const enemyPool: EnemyType[] = [];
            for (const type in waveConfig.config) {
                const weight = (waveConfig.config as any)[type];
                for (let i = 0; i < weight; i++) enemyPool.push(type as EnemyType);
            }
            if (enemyPool.length > 0) {
                const typeToSpawn = enemyPool[Math.floor(Math.random() * enemyPool.length)];
                const config = ENEMY_TYPES[typeToSpawn];
                const speedMultiplier = 1 + (state.wave * 0.0825);
                state.enemies.push({ id: Date.now() + Math.random(), x: GAME_WIDTH, y: Math.random() * (GAME_HEIGHT - config.height), ...config, speed: config.speed * speedMultiplier, hp: config.hp, type: typeToSpawn, initialY: Math.random() * GAME_HEIGHT });
                state.spawnTimer = 80;
            }
        }
        
        // --- AI & OBJECT MOVEMENT ---
        state.enemies.forEach(e => { e.x -= e.speed; });

        if (state.boss) {
            let { x, y, vx, speed, hp, maxHp, phase, attackCooldown, currentAttack, subAttackTimer, shotsFiredInBurst } = state.boss;
            if (hp < maxHp / 2 && phase === 1) { state.boss.phase = 2; state.boss.vx *= 1.5; state.shake = 30; }
            x += vx; if (x < GAME_WIDTH * 0.7 || x > GAME_WIDTH - state.boss.width) vx *= -1;
            y += speed; if (y < 0 || y > GAME_HEIGHT - state.boss.height) speed *= -1;
            state.boss.x = x; state.boss.y = y; state.boss.vx = vx; state.boss.speed = speed;
            state.boss.attackCooldown--; state.boss.subAttackTimer--;
            if (state.boss.attackCooldown <= 0) { const attacks = phase === 1 ? ['spread', 'barrage', 'summon'] : ['spread', 'barrage', 'summon']; state.boss.currentAttack = attacks[Math.floor(Math.random() * attacks.length)] as Boss['currentAttack']; state.boss.attackCooldown = (phase === 1 ? 150 : 90) + Math.random() * 60; state.boss.subAttackTimer = 0; state.boss.shotsFiredInBurst = 0; }
            if (state.boss.subAttackTimer <= 0) {
                switch(state.boss.currentAttack) { 
                    case 'barrage': if (shotsFiredInBurst < 8) { const angleToPlayer = Math.atan2(state.player.y - state.boss.y, state.player.x - state.boss.x); state.enemyProjectiles.push({id: Date.now()+Math.random(), x: state.boss.x, y: state.boss.y, dx: Math.cos(angleToPlayer)*3, dy: Math.sin(angleToPlayer)*3, width: 8, height: 8, damage:1 }); state.boss.shotsFiredInBurst++; state.boss.subAttackTimer = 8; } else { state.boss.currentAttack = 'idle'; } break; 
                    case 'spread': if (shotsFiredInBurst < 1) { for(let i = 0; i < 7; i++) { const angle = (i - 3) * 0.2 + Math.PI; state.enemyProjectiles.push({id: Date.now()+Math.random(), x: state.boss.x, y: state.boss.y, dx: Math.cos(angle)*2.5, dy: Math.sin(angle)*2.5, width: 6, height: 6, damage: 1}); } state.boss.shotsFiredInBurst++; } else { state.boss.currentAttack = 'idle'; } break; 
                    case 'summon': const minionsToSummon = state.boss.phase === 1 ? 3 : 2; const minionType: EnemyType = state.boss.phase === 1 ? 'Mini-Slime' : 'Hunter'; const config = ENEMY_TYPES[minionType]; for (let i = 0; i < minionsToSummon; i++) { state.enemies.push({ id: Date.now() + Math.random() + i, x: state.boss.x, y: state.boss.y + (i - 1) * (config.height + 5), ...config, hp: config.hp, type: minionType, initialY: state.boss.y }); } state.boss.currentAttack = 'idle'; break; 
                } 
            }
        }
        
        // --- COLLISION DETECTION & EFFECTS ---
        let scoreToAdd = 0; let killsToAdd = 0;
        const destroyedProjectileIds = new Set<number>();
        const destroyedGravityBulletIds = new Set<number>();
        const collectedPowerUpIds = new Set<number>();
        
        // Gravity bullet effects
        const absorbedEnemyIds = new Set<number>();
        const absorbedProjectileIds = new Set<number>();
        state.gravityBullets.forEach(gb => {
            const PULL_FORCE = 1.2;
            state.enemies.forEach(e => { if (absorbedEnemyIds.has(e.id)) return; const dx = gb.x - e.x; const dy = gb.y - e.y; const dist = Math.hypot(dx, dy); if (dist < gb.pullRadius) { e.x += (dx / dist) * PULL_FORCE; e.y += (dy / dist) * PULL_FORCE; if (dist < gb.size) { absorbedEnemyIds.add(e.id); gb.accumulatedDamage += e.hp * 2; gb.size += 2; gb.dx += 0.2; state.explosions.push({id: Date.now()+Math.random(), x:e.x, y:e.y, size:15, timer:10}); } } });
            state.enemyProjectiles.forEach(p => { if (absorbedProjectileIds.has(p.id)) return; const dx = gb.x - p.x; const dy = gb.y - p.y; const dist = Math.hypot(dx, dy); if (dist < gb.pullRadius) { p.x += (dx / dist) * PULL_FORCE * 2; p.y += (dy / dist) * PULL_FORCE * 2; if (dist < gb.size) { absorbedProjectileIds.add(p.id); gb.accumulatedDamage += p.damage; gb.size += 0.5; gb.dx += 0.2; } } });
        });
        
        // Player projectiles vs everything
        // Fix: Refactored collision loop to use type casting within if/else blocks to resolve TS inference errors.
        [...state.projectiles, ...state.gravityBullets].forEach(p => {
            for (const icon of state.powerUpIcons) {
                if (checkCollision(p, icon)) {
                    if (state.player.heldPowerUps.length < 3) state.player.heldPowerUps.push(icon.type);
                    if ('accumulatedDamage' in p) destroyedGravityBulletIds.add(p.id); else destroyedProjectileIds.add(p.id);
                    collectedPowerUpIds.add(icon.id);
                    return;
                }
            }
            for (const e of state.enemies) {
                if (e.hp > 0 && checkCollision(p, e)) {
                    if ('accumulatedDamage' in p) {
                        const gravityP = p as GravityBullet;
                        e.hp -= gravityP.accumulatedDamage;
                        destroyedGravityBulletIds.add(p.id);
                        state.explosions.push({ id: Date.now() + Math.random(), x: p.x, y: p.y, timer: 30, size: gravityP.size * 3 });
                    } else {
                        e.hp -= p.damage;
                        destroyedProjectileIds.add(p.id);
                    }
                    if (e.hp <= 0) { scoreToAdd += 10; killsToAdd++; state.explosions.push({ id: Date.now() + Math.random(), x: e.x, y: e.y, timer: 15, size: 20 }); }
                    return;
                }
            }
            if (state.boss && state.boss.hp > 0 && checkCollision(p, state.boss)) {
                if ('accumulatedDamage' in p) {
                    const gravityP = p as GravityBullet;
                    const damage = gravityP.accumulatedDamage;
                    state.boss.hp -= damage;
                    scoreToAdd += damage;
                    destroyedGravityBulletIds.add(p.id);
                    state.explosions.push({ id: Date.now() + Math.random(), x: p.x, y: p.y, timer: 30, size: gravityP.size * 3 });
                } else {
                    const damage = p.damage;
                    state.boss.hp -= damage;
                    scoreToAdd += damage;
                    destroyedProjectileIds.add(p.id);
                }
            }
        });
        
        // Enemy vs Player collision
        let hpLost = 0;
        const hitEnemyIds = new Set<number>();
        if (state.activePowerUp?.type !== 'shield') {
            for (const e of state.enemies) { if (checkCollision(state.player, e)) { hpLost++; hitEnemyIds.add(e.id); } }
            if (state.boss && checkCollision(state.player, state.boss)) { hpLost += 2; }
            state.enemyProjectiles = state.enemyProjectiles.filter(ep => {
                if (checkCollision(state.player, ep)) { hpLost += ep.damage; return false; }
                return true;
            });
            if (hpLost > 0) {
                state.playerHp -= hpLost;
                if (state.playerHp <= 0) state.gameOver = 'lose';
            }
        }
        
        // --- CLEANUP & STATE UPDATE ---
        state.enemies = state.enemies.filter(e => e.hp > 0 && e.x > -e.width && !absorbedEnemyIds.has(e.id) && !hitEnemyIds.has(e.id));
        state.projectiles = state.projectiles.filter(p => !destroyedProjectileIds.has(p.id));
        state.gravityBullets = state.gravityBullets.filter(gb => !destroyedGravityBulletIds.has(gb.id));
        state.enemyProjectiles = state.enemyProjectiles.filter(p => !absorbedProjectileIds.has(p.id));
        state.powerUpIcons = state.powerUpIcons.filter(i => !collectedPowerUpIds.has(i.id));

        if (state.boss && state.boss.hp <= 0) {
            scoreToAdd += (1000 * (state.wave / 5)) + (state.wave === 11 ? 2000 : 0);
            for (let i = 0; i < 15; i++) state.explosions.push({ id: Date.now() + Math.random() + i, x: state.boss.x + (Math.random() - 0.5) * state.boss.width, y: state.boss.y + (Math.random() - 0.5) * state.boss.height, timer: 15 + i * 2, size: 20 + Math.random() * 20 });
            state.boss = null;
        }

        if (scoreToAdd > 0) state.score += scoreToAdd;
        if (killsToAdd > 0) state.killsThisWave += killsToAdd;
        
        if (!state.isBossFight && state.killsThisWave >= state.killsToClearWave && state.wave < TOTAL_WAVES -1) {
            if (state.intermissionTimer <= 0) {
              state.intermissionTimer = INTERMISSION_DURATION;
              state.enemies = []; // Clear remaining enemies
              state.enemyProjectiles = [];
              setWaveMessage(`Wave ${state.wave + 1} Cleared!`);
            }
        }

        // --- FINALLY, TRIGGER RENDER ---
        setUiState({ ...state });
    }, [startNextWave]);

    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const state = gameStateRef.current;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
            state.keysPressed[e.key] = true;

             if (e.key === ' ' && !e.repeat) {
                if (state.player.shootCooldown <= 0) {
                    const ap = state.activePowerUp;
                    const fireRate = ap?.type === 'rapid_fire' ? 4 : 15;
                    state.player.shootCooldown = fireRate;
                    if (ap?.type === 'gravity_gun') { state.gravityBullets.push({ id: Date.now(), x: state.player.x + PLAYER_WIDTH, y: state.player.y + PLAYER_HEIGHT / 2, width: 10, height: 10, dx: 2, dy: 0, damage: 0, accumulatedDamage: 10, size: 10, pullRadius: 80 }); } 
                    else if (ap?.type === 'spread_shot') { for(let i=-2; i<=2; i++){ state.projectiles.push({ id: Date.now() + i, x: state.player.x + PLAYER_WIDTH, y: state.player.y + PLAYER_HEIGHT / 2 - 2, width: 10, height: 4, dx: PROJECTILE_SPEED * 0.9, dy: i * 1.5, damage: 1 }); } } 
                    else { state.projectiles.push({ id: Date.now(), x: state.player.x + PLAYER_WIDTH, y: state.player.y + PLAYER_HEIGHT / 2 - 2, width: 10, height: 4, dx: PROJECTILE_SPEED, dy: 0, damage: 1 }); }
                }
            }
             if (e.key === 'ArrowRight' && !e.repeat) { state.player.selectedPowerUpIndex = (state.player.heldPowerUps.length > 0) ? (state.player.selectedPowerUpIndex + 1) % state.player.heldPowerUps.length : 0; }
             if (e.key === 'ArrowLeft' && !e.repeat) {
                 if (state.player.heldPowerUps.length > 0) {
                     const powerUpToUse = state.player.heldPowerUps[state.player.selectedPowerUpIndex];
                     state.player.heldPowerUps.splice(state.player.selectedPowerUpIndex, 1);
                     state.player.selectedPowerUpIndex = state.player.selectedPowerUpIndex >= state.player.heldPowerUps.length ? Math.max(0, state.player.heldPowerUps.length - 1) : state.player.selectedPowerUpIndex;

                     if (powerUpToUse === 'laser_beam') {
                         state.laserVisual = { timer: 15 };
                         let laserDamage = 10; let killsToAdd = 0;
                         state.enemies = state.enemies.filter(e => { if (Math.abs(e.y - state.player.y) < 15) { state.score += 10; killsToAdd++; state.explosions.push({id:Date.now()+Math.random(), x:e.x, y:e.y, size:20, timer:15}); return false; } return true; });
                         if(killsToAdd > 0) state.killsThisWave += killsToAdd;
                         if(state.boss && Math.abs(state.boss.y - state.player.y) < 40) { state.score += 50; state.boss.hp -= laserDamage; }
                     } else {
                         const duration = (powerUpToUse === 'shield' || powerUpToUse === 'spread_shot' || powerUpToUse === 'rapid_fire' || powerUpToUse === 'gravity_gun') ? 600 : 0;
                         state.activePowerUp = { type: powerUpToUse, timer: duration };
                     }
                 }
             }
        };
        const handleKeyUp = (e: KeyboardEvent) => { gameStateRef.current.keysPressed[e.key] = false; };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        const gameInterval = setInterval(gameTick, 1000 / 60);

        return () => {
            clearInterval(gameInterval);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameTick]);

    const getPowerUpArt = (type: PowerUpType) => { switch (type) { case 'gravity_gun': return 'G'; case 'laser_beam': return 'L'; case 'spread_shot': return 'S'; case 'shield': return 'H'; case 'rapid_fire': return 'R'; } }
    const containerStyle = { transform: uiState.shake > 0 ? `translate(${Math.random() * uiState.shake - uiState.shake / 2}px, ${Math.random() * uiState.shake - uiState.shake / 2}px)` : 'none' };
    
    return (
        <div className="flex flex-col items-center">
            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
            <h4 className="text-xl mb-2">Slime Impact</h4>
            <div className="flex justify-between items-center w-full text-lg mb-2" style={{width: GAME_WIDTH}}>
                <span>Score: {uiState.score}</span>
                <span>HP: {'❤️'.repeat(uiState.playerHp)}</span>
                <span>Wave: {uiState.wave + 1}/{TOTAL_WAVES}</span>
                <span>{uiState.isBossFight ? 'BOSS' : `Kills: ${uiState.killsThisWave}/${uiState.killsToClearWave}`}</span>
                <button onClick={() => setShowHelp(true)} title="Help" className="pixel-border p-1 w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-700 transition-colors duration-200">?</button>
            </div>
            <div className="pixel-border bg-black relative overflow-hidden" style={{ width: GAME_WIDTH, height: GAME_HEIGHT, cursor: 'none', ...containerStyle }}>
                <div className="bg-green-500" style={{ position: 'absolute', left: uiState.player.x, top: uiState.player.y, width: PLAYER_WIDTH, height: PLAYER_HEIGHT }}/>
                {uiState.projectiles.map(p => <div key={p.id} className="bg-yellow-300" style={{ position: 'absolute', left: p.x, top: p.y, width: p.width, height: p.height }}/>)}
                {uiState.gravityBullets.map(gb => <div key={gb.id} className="gravity-bullet" style={{ position: 'absolute', left: gb.x - gb.size/2, top: gb.y - gb.size/2, width: gb.size, height: gb.size }}/>)}
                {uiState.enemies.map(e => <div key={e.id} className="bg-red-500" style={{ position: 'absolute', left: e.x, top: e.y, width: e.width, height: e.height }}/>)}
                {uiState.enemyProjectiles.map(p => <div key={p.id} className="bg-purple-500" style={{ position: 'absolute', left: p.x, top: p.y, width: p.width, height: p.height }}/>)}
                {uiState.boss && <div className="bg-pink-600" style={{ position: 'absolute', left: uiState.boss.x, top: uiState.boss.y, width: uiState.boss.width, height: uiState.boss.height }}><div className="w-full h-1 bg-gray-500 absolute -top-3"><div className="h-full bg-red-500" style={{width: `${(uiState.boss.hp/uiState.boss.maxHp)*100}%`}}></div></div></div>}
                {uiState.explosions.map(e => <div key={e.id} className="bg-orange-400 rounded-full explosion-animation" style={{ position: 'absolute', left: e.x - e.size/2, top: e.y - e.size/2, width: e.size, height: e.size }} />)}
                {uiState.powerUpIcons.map(icon => <div key={icon.id} className="pixel-border text-center flex items-center justify-center font-bold text-yellow-300 flicker" style={{ position: 'absolute', left: icon.x, top: icon.y, width: icon.width, height: icon.height }}>{getPowerUpArt(icon.type)}</div>)}
                {uiState.activePowerUp?.type === 'shield' && <div className="absolute rounded-full border-4 border-cyan-400 border-dashed animate-spin" style={{ left: uiState.player.x-5, top: uiState.player.y-5, width: PLAYER_WIDTH+10, height: PLAYER_HEIGHT+10, animationDuration: '3s' }}/>}
                {uiState.laserVisual && <div className="absolute bg-red-500" style={{ left: uiState.player.x + PLAYER_WIDTH, top: uiState.player.y, width: GAME_WIDTH, height: 15, opacity: uiState.laserVisual.timer / 15 }} />}
                
                {(uiState.gameOver || waveMessage || uiState.intermissionTimer > 0) && (
                    <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-center">
                        <h2 className="text-3xl text-yellow-400 flicker">{uiState.gameOver ? (uiState.gameOver === 'win' ? "YOU WIN!" : "GAME OVER") : waveMessage}</h2>
                        {uiState.gameOver && ( <> <p className="text-xl mt-2">Final Score: {uiState.score} EXP</p> <button onClick={() => onGameEnd(uiState.score)} className="pixel-border p-2 mt-4 hover:bg-green-400 hover:text-black transition-colors duration-200"> Back to Training </button> </> )}
                    </div>
                )}
            </div>
            <div className="mt-2 w-full flex flex-col items-center" style={{maxWidth: GAME_WIDTH}}>
                 <div className="flex space-x-2 pixel-border p-1">
                    <span className="my-auto">Inventory:</span>
                    {uiState.player.heldPowerUps.map((type, i) => ( <div key={i} className={`w-8 h-8 flex items-center justify-center font-bold text-xl ${uiState.player.selectedPowerUpIndex === i ? 'border-2 border-yellow-300' : 'border-2 border-gray-600'}`}>{getPowerUpArt(type)}</div> ))}
                    {uiState.player.heldPowerUps.length === 0 && <span className="text-gray-500 italic p-1">Empty</span>}
                </div>
                <p className="mt-1 text-sm">Arrows to move, Space to shoot, Left/Right Arrows for power-ups</p>
            </div>
        </div>
    );
};

export default SlimeImpactGame;
