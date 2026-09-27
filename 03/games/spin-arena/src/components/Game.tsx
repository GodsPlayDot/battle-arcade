import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Line, Group, Text } from 'react-konva';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import * as C from '../constants';

import type { TopState, TopDefinition, GameSettings, DiagnosticResult, Level } from '../types';
import Spark, { SparkState } from './Spark';
import Aura from './Aura';

interface BoostTile {
  x: number;
  y: number;
  multiplier: number;
  isActive: boolean;
  respawnTime: number;
  type: import('../types').BoostTileType;
}

interface CloneState extends TopState {
  id: string;
  spawnTime: number;
}

interface FlightSnapshot {
  timestamp: number;
  player: { x: number; y: number; hp: number; speed: number; rotation: number; mode: string; stuckTime: number };
  enemy: { x: number; y: number; hp: number; speed: number; rotation: number; mode: string; stuckTime: number };
  clonesCount: number;
  activeSparks: number;
  activeTiles: number;
}

interface GameProps {
  playerTop: TopDefinition;
  level: Level;
  allTops: TopDefinition[];
  settings: GameSettings;
  progression: import('../types').PlayerProgression;
  onBack: () => void;
  onWin: (levelId: number) => void;
  systemLogs: string[];
  setSystemLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
}

interface BattleEvent {
  id: string;
  time: number;
  kind: 'hit' | 'clash' | 'special' | 'projectile';
  label: string;
}

interface GhostCopy {
  id: string;
  x: number;
  y: number;
  angle: number;
  opacity: number;
  spawnTime: number;
}

const CombatRules = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl relative max-h-[95vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 text-white/50 hover:text-white transition-colors z-10 bg-slate-800 p-2 rounded-full">
          <X size={24} />
        </button>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-6 uppercase tracking-tighter italic pr-12">Combat Settings & Rules Guide <span className="text-emerald-500">(Master Version)</span></h2>
        <div className="space-y-6 text-slate-300 font-medium leading-relaxed overflow-y-auto pr-4 custom-scrollbar flex-1">
          <section>
            <h3 className="text-emerald-400 font-bold uppercase text-sm tracking-widest mb-2">🔵 Section 1 — The Six Combat Styles</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">1. Physics-Based Momentum</h4>
                <p className="text-[10px] opacity-70">Combat is decided by vector math, velocity, and impact angle. Only forward momentum directed toward the opponent counts toward your Attack Score.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">2. Spin-Power Scaling</h4>
                <p className="text-[10px] opacity-70">Rotation speed is your primary power source. It scales damage output and provides a defensive buffer. Faster spin makes you harder to knock back.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">3. Stability Shield System</h4>
                <p className="text-[10px] opacity-70">Stability acts as a primary damage absorption layer (70%). It regenerates after a period of safety, allowing for tactical retreats and sustained combat.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">4. Intent-Based Engagement</h4>
                <p className="text-[10px] opacity-70">The 'Intent Bonus' rewards aggressive play. Moving directly toward an enemy grants a +5% score bonus. If scores are within 5%, a Clash occurs: both tops lose stability, but neither takes HP damage.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">5. Arena Control Combat</h4>
                <p className="text-[10px] opacity-70">The arena is a participant. Use boost tiles to gain spin and movement, and utilize environmental gravity events like 'The Maelstrom' to force engagements.</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-bold text-xs uppercase mb-1">6. Tactical AI State-Machine</h4>
                <p className="text-[10px] opacity-70">The AI evaluates combat scenarios using a complex decision tree. It chooses between Hunting, Evading, and Idling based on its calculated win probability.</p>
              </div>
            </div>
          </section>
          <section>
            <h3 className="text-emerald-400 font-bold uppercase text-sm tracking-widest mb-2">🔵 Section 2 — Core Combat Laws</h3>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><span className="text-white">Law 1: Solid Body Law</span> — Tops cannot pass through each other.</li>
              <li><span className="text-white">Law 2: Single Attacker Law</span> — Most collisions produce ONE attacker. No mutual trades.</li>
              <li><span className="text-white">Law 3: Clash Parity (5%)</span> — If scores are within 5%, a <span className="text-yellow-400 font-bold italic">CLASH</span> occurs. Both lose stability only.</li>
              <li><span className="text-white">Law 4: Defender-Only Damage</span> — Only the defender loses HP in standard hits.</li>
              <li><span className="text-white">Law 5: Bounce Guarantee</span> — Every hit results in physical separation.</li>
              <li><span className="text-white">Law 6: Intent Bonus (5%)</span> — Attacking intent grants a <span className="text-emerald-400 font-bold">+5% score bonus</span>.</li>
            </ul>
          </section>
          <section>
            <h3 className="text-emerald-400 font-bold uppercase text-sm tracking-widest mb-2">🔵 Section 3 — Core Formulas</h3>
            <div className="bg-black/30 p-4 rounded-xl space-y-2 font-mono text-xs">
              <p><span className="text-emerald-500">Forward Momentum:</span> FM = Dot(Velocity, DirectionToOpponent)</p>
              <p><span className="text-emerald-500">Attack Score:</span> (FM × MW) + (Rot × RW) + (Stab × SW)</p>
              <p><span className="text-emerald-500">Final Damage:</span> BaseDamage × ImpactMod × GravityMod × EfficiencyMod</p>
              <p><span className="text-emerald-500">Stability:</span> Absorbs 70% of incoming damage.</p>
            </div>
          </section>
          <section>
            <h3 className="text-emerald-400 font-bold uppercase text-sm tracking-widest mb-2">🔵 Section 10 — Global Safety Limits</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Damage per hit ≤ 25% MaxHP</li>
              <li>PushRadius ≤ 2.2× PhysicalRadius</li>
              <li>Gravity uses sqrt scaling (Max x30)</li>
              <li>One Active Collision per 100ms</li>
            </ul>
          </section>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-widest text-white/30">
          <span>Combat Engine v1.6.0 (Experimental & Hardcore Models Active)</span>
          <span>Modified: March 2026</span>
        </div>
      </div>
    </div>
  );
};

const Game: React.FC<GameProps> = ({ playerTop, level, allTops, settings, progression, onBack, onWin, systemLogs, setSystemLogs }) => {
  const [player, setPlayer] = useState<TopState>({
    name: playerTop.name,
    x: C.ARENA_WIDTH / 4,
    y: C.ARENA_HEIGHT / 2,
    baseSpeed: settings.playerBaseSpeed,
    speed: settings.playerBaseSpeed,
    baseRotation: settings.playerBaseRotation,
    rotationSpeed: settings.playerBaseRotation,
    hp: settings.playerHp,
    angle: 0,
    boostTimer: 0,
    speedBoostTimer: 0,
    efficiencyBoostTimer: 0,
    mode: 'hunt',
    modeTimer: 0,
    boostKeyTimer: 0,
    boostKeyCooldown: 0,
    gravityPullTimer: 0,
    gravityPullCooldown: 0,
    slowTimer: 0,
    lastDamageTime: 0,
    lastAfterimageTime: 0,
    recentHits: [],
    borderHits: [],
    borderPushTimer: 0,
    idleTarget: null,
    stuckTime: 0,
    stability: settings.maxStability,
    lastX: (C.ARENA_WIDTH * 1) / 4,
    lastY: C.ARENA_HEIGHT / 2,
    combatScore: 0,
    intent: 'disengage',
    intentTimer: 0,
    engagementPriority: 'none',
    engagementLockTimer: 0,
    commitTimer: 0,
    lockedForwardMomentum: 0,
    lastVelocity: { x: 0, y: 0 },
    commitTarget: null,
    history: [],
    lowHpTriggered: false,
    shieldTimer: 0,
    telegraphTimer: 0,
    isTelegraphing: false,
    // Dual Special Support
    specialTimers: [0, 0],
    specialCooldowns: [0, 0],
    activeSpecialIds: progression.equippedSpecialIds,
  });

  const [enemy, setEnemy] = useState<TopState>({
    name: level.enemy.name,
    x: (C.ARENA_WIDTH * 3) / 4,
    y: (C.ARENA_HEIGHT / 2),
    baseSpeed: level.enemy.baseSpeed,
    speed: level.enemy.baseSpeed,
    baseRotation: level.enemy.baseRotation,
    rotationSpeed: level.enemy.baseRotation,
    hp: level.enemy.baseHp,
    angle: 0,
    boostTimer: 0,
    speedBoostTimer: 0,
    efficiencyBoostTimer: 0,
    mode: 'idle',
    modeTimer: 0,
    boostKeyTimer: 0,
    boostKeyCooldown: 0,
    gravityPullTimer: 0,
    gravityPullCooldown: 0,
    slowTimer: 0,
    lastDamageTime: 0,
    lastAfterimageTime: 0,
    recentHits: [],
    borderHits: [],
    borderPushTimer: 0,
    idleTarget: null,
    stuckTime: 0,
    stability: settings.maxStability,
    lastX: (C.ARENA_WIDTH * 3) / 4,
    lastY: C.ARENA_HEIGHT / 2,
    combatScore: 0,
    intent: 'disengage',
    intentTimer: 0,
    engagementPriority: 'none',
    engagementLockTimer: 0,
    commitTimer: 0,
    lockedForwardMomentum: 0,
    lastVelocity: { x: 0, y: 0 },
    commitTarget: null,
    history: [],
    lowHpTriggered: false,
    shieldTimer: 0,
    telegraphTimer: 0,
    isTelegraphing: false,
    specialTimers: [0, 0],
    specialCooldowns: [0, 0],
    activeSpecialIds: ['', ''],
  });

  const [boostTiles, setBoostTiles] = useState<BoostTile[]>([]);
  const [clones, setClones] = useState<CloneState[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [enemyGhosts, setEnemyGhosts] = useState<GhostCopy[]>([]);
  const [playerAfterimages, setPlayerAfterimages] = useState<GhostCopy[]>([]);
  const lastPlayerAfterimageRef = useRef(0);
  const [timeScale, setTimeScale] = useState(1);
  const [winner, setWinner] = useState<string | null>(null);
  const [battleEvents, setBattleEvents] = useState<BattleEvent[]>([]);
  const battleEventsRef = useRef<BattleEvent[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const [time, setTime] = useState(Date.now());
  const [sparks, setSparks] = useState<SparkState[]>([]);
  const lastAiCheckRef = useRef(0);
  const [showRadii, setShowRadii] = useState(settings.showRadii);
  const gameEndedRef = useRef(false);
  const [arenaGravityActive, setArenaGravityActive] = useState(false);
  const [manualGravitySurgeTimer, setManualGravitySurgeTimer] = useState(0);
  const [respawnMessage, setRespawnMessage] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const gameTimeRef = useRef(0);
  const [showRules, setShowRules] = useState(false);
  const [systemCheckStep, setSystemCheckStep] = useState(0);
  const [isSystemCheckComplete, setIsSystemCheckComplete] = useState(false);
  const [screenShake, setScreenShake] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<{ inHunt: boolean; inEvade: boolean }>({ inHunt: false, inEvade: false });
  const flightLogRef = useRef<FlightSnapshot[]>([]);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.5 });
  const recordBattleEvent = (kind: BattleEvent['kind'], label: string, eventTime = gameTimeRef.current) => {
    const entry: BattleEvent = { id: `${eventTime}-${Math.random()}`, time: eventTime, kind, label };
    battleEventsRef.current = [...battleEventsRef.current, entry].slice(-8);
    setBattleEvents(battleEventsRef.current);
  };
  // Sync stats when settings change
  useEffect(() => {
    setPlayer(prev => ({
      ...prev,
      hp: Math.min(prev.hp, settings.playerHp),
      stability: Math.min(prev.stability, settings.maxStability),
      baseSpeed: settings.playerBaseSpeed,
      baseRotation: settings.playerBaseRotation
    }));
    setEnemy(prev => ({
      ...prev,
      hp: Math.min(prev.hp, settings.enemyHp),
      stability: Math.min(prev.stability, settings.maxStability),
      baseSpeed: settings.enemyBaseSpeed,
      baseRotation: settings.enemyBaseRotation
    }));
  }, [settings.playerHp, settings.enemyHp, settings.maxStability, settings.playerBaseSpeed, settings.enemyBaseSpeed, settings.playerBaseRotation, settings.enemyBaseRotation]);
  const [playerHudOpacity, setPlayerHudOpacity] = useState((settings.hudOpacity ?? 100) / 100);
  const [enemyHudOpacity, setEnemyHudOpacity] = useState((settings.hudOpacity ?? 100) / 100);
  const cameraRef = useRef(camera);
  
  // Audio context for hum sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const playCollisionSound = (intensity: number) => {
    if (!audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(150 + intensity * 10, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(Math.min(0.3, intensity * 0.05), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore audio errors
    }
  };

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        try {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          oscillatorRef.current = audioCtxRef.current.createOscillator();
          gainNodeRef.current = audioCtxRef.current.createGain();
          
          oscillatorRef.current.type = 'sine';
          oscillatorRef.current.frequency.setValueAtTime(60, audioCtxRef.current.currentTime);
          gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
          
          oscillatorRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioCtxRef.current.destination);
          oscillatorRef.current.start();
        } catch (e) {
          console.warn("Web Audio API not supported or blocked", e);
        }
      }
    };

    window.addEventListener('mousedown', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });

    return () => {
      if (oscillatorRef.current) {
        try { oscillatorRef.current.stop(); } catch(e) {}
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch(e) {}
      }
    };
  }, []);

  // Update hum volume based on proximity
  useEffect(() => {
    if (!gainNodeRef.current || !audioCtxRef.current || isPaused || winner) {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
      }
      return;
    }

    let minDistance = Infinity;
    boostTiles.forEach(tile => {
      if (tile.isActive) {
        const dx = player.x - (tile.x * C.TILE_SIZE + C.TILE_SIZE / 2);
        const dy = player.y - (tile.y * C.TILE_SIZE + C.TILE_SIZE / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) minDistance = dist;
      }
    });

    const maxRange = 200;
    const volume = Math.max(0, 1 - minDistance / maxRange) * 0.05;
    gainNodeRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.1);
  }, [player.x, player.y, boostTiles, isPaused, winner]);

  useEffect(() => { cameraRef.current = camera; }, [camera]);

  const VIEWPORT_WIDTH = 800;
  const VIEWPORT_HEIGHT = 600;

  useEffect(() => {
    // Game initialization
  }, []);

  useEffect(() => {
    // Pre-match system check sequence
    const steps = 5;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setSystemCheckStep(current);
      if (current >= steps) {
        clearInterval(interval);
        setTimeout(() => setIsSystemCheckComplete(true), 500);
      }
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const playerRef = useRef(player);
  useEffect(() => { playerRef.current = player; }, [player]);
  const enemyRef = useRef(enemy);
  useEffect(() => { enemyRef.current = enemy; }, [enemy]);
  const boostTilesRef = useRef(boostTiles);
  useEffect(() => { boostTilesRef.current = boostTiles; }, [boostTiles]);
  const sparksRef = useRef(sparks);
  useEffect(() => { sparksRef.current = sparks; }, [sparks]);
  const clonesRef = useRef(clones);
  useEffect(() => { clonesRef.current = clones; }, [clones]);

  // Initialize boost tiles based on settings and level
  useEffect(() => {
    const tiles: BoostTile[] = [];
    const usedPositions = new Set<string>();
    const count = level.tileCount || settings.tileCount;
    const availableTypes = level.boostTileTypes || ['base'];
    
    for (let i = 0; i < count; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = Math.floor(Math.random() * (C.GRID_WIDTH - 2)) + 1;
        y = Math.floor(Math.random() * (C.GRID_HEIGHT - 2)) + 1;
        attempts++;
      } while (usedPositions.has(`${x},${y}`) && attempts < 10);
      
      usedPositions.add(`${x},${y}`);
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      tiles.push({
        x,
        y,
        multiplier: settings.tileRotationMultiplier,
        isActive: true,
        respawnTime: 0,
        type,
      });
    }
    setBoostTiles(tiles);
  }, [settings.tileCount, settings.tileRotationMultiplier, level.id, level.tileCount, level.boostTileTypes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
      // Also map ' ' to 'space' for convenience
      if (key === ' ') keysPressed.current['space'] = true;
      // Keep keyboard movement accessible for players who prefer arrow keys.
      if (key === 'arrowup') keysPressed.current['w'] = true;
      if (key === 'arrowdown') keysPressed.current['s'] = true;
      if (key === 'arrowleft') keysPressed.current['a'] = true;
      if (key === 'arrowright') keysPressed.current['d'] = true;

      // Special Activation
      if (key === ' ' || key === 'space') {
        activateSpecial(0);
      } else if (key === 'shift') {
        activateSpecial(1);
      } else if (key === 'p') {
        setIsPaused(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { 
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (key === ' ') keysPressed.current['space'] = false;
      if (key === 'arrowup') keysPressed.current['w'] = false;
      if (key === 'arrowdown') keysPressed.current['s'] = false;
      if (key === 'arrowleft') keysPressed.current['a'] = false;
      if (key === 'arrowright') keysPressed.current['d'] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const gameLoop = () => {
      const nowMs = Date.now();
      if (winner || isPaused) {
        // Screen Shake Decay even when paused/won
        if (screenShake > 0) {
          setScreenShake(prev => Math.max(0, prev * 0.9));
        }
        requestAnimationFrame(gameLoop);
        return;
      }

      const dt = (1 / 60) * timeScale;
      gameTimeRef.current += dt;
      const now = gameTimeRef.current;
      setTime(now * 1000);
      setGameTime(now);

      // Screen Shake Decay
      if (screenShake > 0) {
        setScreenShake(prev => Math.max(0, prev * 0.8)); // Faster decay
      }

      // PART 3 — Dynamic Gravity Field Scaling
      // EffectiveGravity = BaseGravity × sqrt(GravityLevel)
      const effectiveGravity = settings.arenaGravityMultiplier * Math.sqrt(settings.arenaGravityMultiplier / 5); 
      // Note: settings.arenaGravityMultiplier is the "GravityLevel" here. 
      // If it's 10, sqrt(10/5) = sqrt(2) ≈ 1.41. 
      // Actually the user said x10 -> sqrt(10) ≈ 3.16. 
      // So I'll use:
      const gravityScaleFactor = Math.sqrt(settings.arenaGravityMultiplier);

      // Arena Gravity Logic
      const arenaCycle = settings.arenaGravityDuration + settings.arenaGravityCooldown;
      const arenaTime = now % arenaCycle; 
      const isGravityActive = settings.enableArenaControl && (((level.arenaGravityEnabled ?? true) && arenaTime < settings.arenaGravityDuration) || (manualGravitySurgeTimer > 0 && now - manualGravitySurgeTimer < 3));
      if (isGravityActive !== arenaGravityActive) setArenaGravityActive(isGravityActive);

      let p = { ...playerRef.current };
      let e = { ...enemyRef.current };

      // Apply temporary gravity boost for this frame's calculations (Non-cumulative)
      const gravityMult = isGravityActive ? settings.arenaGravityMultiplier : 1;
      
      const originalPSpeed = p.speed;
      const originalPRot = p.rotationSpeed;
      const originalESpeed = e.speed;
      const originalERot = e.rotationSpeed;

      if (isGravityActive) {
        p.speed *= gravityMult;
        p.rotationSpeed *= gravityMult;
        e.speed *= gravityMult;
        e.rotationSpeed *= gravityMult;
      }

      // Prevent perfect overlap which causes NaN in physics calculations
      if (p.x === e.x && p.y === e.y) {
        p.x += 0.1;
        p.y += 0.1;
      }

      // STEP 10 — Apply Push Radius Effects (After Bounce Only)
      // Push effects do NOT apply during collision frame.
      const dx_push = e.x - p.x;
      const dy_push = e.y - p.y;
      const dist_push = Math.hypot(dx_push, dy_push);
      const playerSize = (isSpecialActive(p, 'size_shift', now) ? settings.playerSize * settings.growthMultiplier : settings.playerSize);
      const enemySize = (level.enemy.special === 'juggernaut' && now - e.boostKeyTimer < settings.enemySpecialDuration ? settings.enemySize * settings.growthMultiplier : settings.enemySize);
      const combinedRadius = (playerSize + enemySize) * C.TILE_SIZE / 2;
      const pushRadius = settings.pushRadius * C.TILE_SIZE;

      // Check if they collided this frame (we'll run checkCollisions first)
      let tiles = JSON.parse(JSON.stringify(boostTilesRef.current));
      let s = JSON.parse(JSON.stringify(sparksRef.current));
      let c = [...clonesRef.current];

      checkCollisions(p, e, s, now);
      const justCollided = p.engagementLockTimer === now * 1000;

      if (!justCollided && dist_push < pushRadius && dist_push > combinedRadius) {
          // LAW 7 — Player can have Push Immunity
          if (isSpecialActive(p, 'push_immunity', now)) {
              // Ignore push
          } else {
              const overlap = 1 - (dist_push / pushRadius);
              const pushForce = overlap * settings.pushForceStrength;
              
              // Rotation difference modifier in push
              const rotDiff = Math.abs(p.rotationSpeed - e.rotationSpeed);
              const rotMod = 1 + (rotDiff * 0.1);
              
              const pushX = (dx_push / (dist_push || 0.001)) * pushForce * rotMod;
              const pushY = (dy_push / (dist_push || 0.001)) * pushForce * rotMod;
              
              p.x -= pushX;
              p.y -= pushY;
              e.x += pushX;
              e.y += pushY;

              // Rotation Slow Inside Push
              const slowFactor = 1 - (settings.rotationSlowInsidePush / 100) * (1 / 60);
              p.rotationSpeed *= slowFactor;
              e.rotationSpeed *= slowFactor;
          }
      }

      if (isGravityActive) {
        const centerX = C.ARENA_WIDTH / 2;
        const centerY = C.ARENA_HEIGHT / 2;
        
        // Pull Player
        const pdx = centerX - p.x;
        const pdy = centerY - p.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist > 0) {
          p.x += (pdx / (pdist || 0.001)) * C.ARENA_GRAVITY_PULL_STRENGTH * gravityMult;
          p.y += (pdy / (pdist || 0.001)) * C.ARENA_GRAVITY_PULL_STRENGTH * gravityMult;
        }
        
        // Pull Enemy
        const edx = centerX - e.x;
        const edy = centerY - e.y;
        const edist = Math.hypot(edx, edy);
        if (edist > 0) {
          e.x += (edx / (edist || 0.001)) * C.ARENA_GRAVITY_PULL_STRENGTH * gravityMult;
          e.y += (edy / (edist || 0.001)) * C.ARENA_GRAVITY_PULL_STRENGTH * gravityMult;
        }
      }

      // Handle tile respawning (Only if Arena Control is enabled)
      if (settings.enableArenaControl) {
        tiles.forEach((tile: BoostTile) => {
          if (!tile.isActive && now > tile.respawnTime) {
            tile.isActive = true;
            if (settings.tileRandomSpawn) {
              tile.x = Math.floor(Math.random() * (C.GRID_WIDTH - 2)) + 1;
              tile.y = Math.floor(Math.random() * (C.GRID_HEIGHT - 2)) + 1;
            }
          }
        });
      }

      // Momentum Gain: +0.1 speed, +0.5 rotation per second
      if (settings.momentumEnabled) {
        let pGainMult = 1;
        let eGainMult = 1;
        
        if (settings.momentumScalingCurve === 'exponential') {
          pGainMult = 1 + (p.speed / settings.playerMaxSpeed) * 0.5;
          eGainMult = 1 + (e.speed / settings.enemyMaxSpeed) * 0.5;
        } else if (settings.momentumScalingCurve === 'flat') {
          pGainMult = 0.5;
          eGainMult = 0.5;
        }

        p.speed = Math.min(settings.playerMaxSpeed, p.speed + settings.movementGainPerSecond * dt * pGainMult);
        e.speed = Math.min(settings.enemyMaxSpeed, e.speed + settings.movementGainPerSecond * dt * eGainMult);
        
        const isPhantom = level.enemy.special === 'phantom';
        const isEnemyActive = now - e.boostKeyTimer < settings.enemySpecialDuration;
        const eRotationGainMult = (isPhantom && isEnemyActive) ? 0.8 : 1.0;
        
        p.rotationSpeed = Math.min(settings.playerMaxRotation, p.rotationSpeed + settings.rotationGainPerSecond * dt * pGainMult);
        e.rotationSpeed = Math.min(settings.enemyMaxRotation, e.rotationSpeed + settings.rotationGainPerSecond * dt * eRotationGainMult * eGainMult);
      }

      // High Rotation Sparks (> 10)
      if (p.rotationSpeed > 10 && Math.random() < 0.2) {
        s.push({
          x: p.x + (Math.random() - 0.5) * 20,
          y: p.y + (Math.random() - 0.5) * 20,
          radius: Math.random() * 3 + 1,
          life: 8,
        });
      }
      if (e.rotationSpeed > 10 && Math.random() < 0.2) {
        s.push({
          x: e.x + (Math.random() - 0.5) * 20,
          y: e.y + (Math.random() - 0.5) * 20,
          radius: Math.random() * 3 + 1,
          life: 8,
        });
      }

      // Enemy Special Growth
      const isEnemySpecial = now - e.boostKeyTimer < settings.enemySpecialDuration;
      if (isEnemySpecial) {
        let rotGrowth = settings.enemySpecialRotationGrowth;
        let moveGrowth = settings.enemySpecialMovementGrowth;
        
        const isJuggernaut = level.enemy.special === 'juggernaut';
        const isPredator = level.enemy.special === 'predator';
        const isBerserker = level.enemy.special === 'berserker';

        if (isJuggernaut) {
          rotGrowth *= 6; // Aggressive growth for juggernaut
          moveGrowth *= 2;
        }
        if (isPredator) {
          moveGrowth *= 5;
        }
        if (isBerserker) {
          rotGrowth *= 8; // Extreme spin growth
          moveGrowth *= 3;
          e.stability *= 0.95; // Risk: Lose stability while active
        }
        
        const maxRotMult = isJuggernaut ? settings.growthRotationMultiplier : (isBerserker ? 2.5 : 1.5);
        const maxMoveMult = isJuggernaut ? settings.growthMultiplier : (isBerserker ? 2.0 : 1.5);

        e.rotationSpeed = Math.min(settings.enemyMaxRotation * maxRotMult, e.rotationSpeed + rotGrowth * dt);
        e.speed = Math.min(settings.enemyMaxSpeed * maxMoveMult, e.speed + moveGrowth * dt);
      }

      // Stability Regeneration
      if (now - p.lastDamageTime > 2) {
        p.stability = Math.min(settings.maxStability, p.stability + settings.stabilityRegenPerSecond * dt);
      }
      if (now - e.lastDamageTime > 2) {
        e.stability = Math.min(settings.maxStability, e.stability + settings.stabilityRegenPerSecond * dt);
      }

      // Player Intent Logic
      const pdx = e.x - p.x;
      const pdy = e.y - p.y;
      const pDist = Math.hypot(pdx, pdy);
      const pvx = p.lastVelocity.x;
      const pvy = p.lastVelocity.y;
      const pForward = (pvx * pdx + pvy * pdy) / (pDist || 1);
      
      const oldPIntent = p.intent;
      p.intent = pForward > 1.0 ? 'attack' : 'disengage';
      if (p.intent === 'attack' && oldPIntent !== 'attack') {
        p.commitTimer = now;
      }

      // Handle enemy special telegraphing and activation
      if (e.isTelegraphing && now - e.telegraphTimer > settings.telegraphDuration) {
        e.isTelegraphing = false;
        e.boostKeyTimer = now;
        e.boostKeyCooldown = now + settings.enemySpecialCooldown;
        
        // Audio cue for activation
        if (audioCtxRef.current) {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(440, audioCtxRef.current.currentTime);
          osc.frequency.exponentialRampToValueAtTime(880, audioCtxRef.current.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, audioCtxRef.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + 0.2);
        }

        // Instant effect for sniper active: Lock-On Dash
        if (level.enemy.special === 'sniper') {
          const pvx = (p.x - p.lastX) * 60;
          const pvy = (p.y - p.lastY) * 60;
          const predictX = p.x + pvx * 0.5;
          const predictY = p.y + pvy * 0.5;
          const angle = Math.atan2(predictY - e.y, predictX - e.x);
          e.x += Math.cos(angle) * 100;
          e.y += Math.sin(angle) * 100;
          e.speed = Math.min(e.speed + 5, settings.enemyMaxSpeed * 1.5);
        }

        // Special: Teleporter (Blink)
        if (level.enemy.special === 'teleporter') {
          const angle = Math.atan2(p.y - e.y, p.x - e.x);
          const blinkDist = 150;
          // Teleport behind player
          e.x = p.x - Math.cos(angle) * blinkDist;
          e.y = p.y - Math.sin(angle) * blinkDist;
          // Add some sparks at new location
          for (let i = 0; i < 10; i++) {
            s.push({
              x: e.x,
              y: e.y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 1.0,
              color: '#818cf8',
              size: 3
            });
          }
        }
      }

      // Player Afterimage Logic
      if (isSpecialActive(p, 'afterimage_trail', now)) {
        if (now - p.lastAfterimageTime > settings.afterimageInterval) {
          p.lastAfterimageTime = now;
          const newAfterimage: GhostCopy = {
            id: Math.random().toString(36).substr(2, 9),
            x: p.x,
            y: p.y,
            angle: p.angle,
            opacity: 1.0,
            spawnTime: now
          };
          setPlayerAfterimages(prev => [...prev, newAfterimage]);
        }
      }

      // Handle player afterimage decay
      setPlayerAfterimages(prev => prev.map(ghost => ({
        ...ghost,
        opacity: ghost.opacity - (1 / (settings.afterimageLifetime * 60))
      })).filter(ghost => now - ghost.spawnTime < settings.afterimageLifetime));

      handlePlayerMovement(p, keysPressed.current, now);
      handleGravityPull(p, e, now);
      gravityEffect(p, e, now);

      // AI Logic with Interval
      if (now - lastAiCheckRef.current > settings.aiStateCheckInterval) {
        if (settings.enableTacticalAI) {
          // Preserve the arena's authored AI style for the whole match. Changing
          // it mid-fight made enemy intent look arbitrary and impossible to learn.
          updateEnemyAIState(p, e, tiles, now, s);
        } else {
          // Simple AI: Always hunt
          e.mode = 'hunt';
          e.intent = 'attack';
        }
        lastAiCheckRef.current = now;
      }

      handleEnemyAI(p, e, now, tiles);

      // Radii Detection for Visual Feedback
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const huntRadius = level.enemy.huntRadiusMultiplier * settings.enemySize * C.TILE_SIZE;
      const evadeRadius = level.enemy.evadeRadiusMultiplier * settings.enemySize * C.TILE_SIZE;
      
      setPlayerStatus({
        inHunt: dist < huntRadius,
        inEvade: dist < evadeRadius
      });

      if (settings.enableArenaControl) {
        checkBoost(p, tiles, now);
        checkBoost(e, tiles, now);
      }

      checkCollisions(p, e, s, now);

      // Clone Logic
      handleClones(p, e, c, s, now);

      borderBounce(p);
      borderBounce(e);

      updateSpin(p);
      updateSpin(e);

      // Update sparks
      const updatedSparks = s.map(spark => ({
        ...spark,
        life: spark.life - 1,
        radius: spark.radius * 0.95,
      })).filter(spark => spark.life > 0);

      if (p.hp <= 0 && !gameEndedRef.current) {
        gameEndedRef.current = true;
        recordBattleEvent('hit', 'MATCH END · enemy victory', now);
        setWinner("Enemy Wins");
      }
      if (e.hp <= 0 && !gameEndedRef.current) {
        gameEndedRef.current = true;
        recordBattleEvent('hit', 'MATCH END · player victory', now);
        setWinner("Player Wins");
      }

      // Restore original values before saving state to prevent compounding
      if (isGravityActive) {
        p.speed = originalPSpeed;
        p.rotationSpeed = originalPRot;
        e.speed = originalESpeed;
        e.rotationSpeed = originalERot;
      }

      // 10s Auto-Respawn
      if (p.stuckTime > 10 && !gameEndedRef.current) {
        let reason = "Auto-Respawn: ";
        const radius = settings.playerSize * C.TILE_SIZE / 2;
        const isBeyond = p.x < -50 || p.x > C.ARENA_WIDTH + 50 || p.y < -50 || p.y > C.ARENA_HEIGHT + 50;
        const isOnBorder = p.x < radius || p.x > C.ARENA_WIDTH - radius || p.y < radius || p.y > C.ARENA_HEIGHT - radius;
        const velocity = Math.hypot(p.lastVelocity.x, p.lastVelocity.y);
        const isImmobile = velocity < 0.05;
        
        if (isBeyond) reason += `CRITICAL: Beyond Arena at (${Math.round(p.x)}, ${Math.round(p.y)}). `;
        else if (isOnBorder) reason += `STUCK: Border Collision at (${Math.round(p.x)}, ${Math.round(p.y)}). `;
        else if (isImmobile) reason += `IMMOBILE: No movement detected at (${Math.round(p.x)}, ${Math.round(p.y)}). `;
        
        reason += "Cause: Physics engine clipping or high-speed impact glitch.";
        handleRespawn(reason, false);
      }

      // Nudge logic for immobile tops
      if (p.stuckTime > 3 && Math.hypot(p.lastVelocity.x, p.lastVelocity.y) < 0.1) {
        p.x += (Math.random() - 0.5) * 5;
        p.y += (Math.random() - 0.5) * 5;
      }
      if (e.stuckTime > 3 && Math.hypot(e.lastVelocity.x, e.lastVelocity.y) < 0.1) {
        e.x += (Math.random() - 0.5) * 5;
        e.y += (Math.random() - 0.5) * 5;
      }

      // Update history for trails
      p.history = [{ x: p.x, y: p.y }, ...p.history.slice(0, 10)];
      e.history = [{ x: e.x, y: e.y }, ...e.history.slice(0, 10)];

      // Flight Recorder Snapshot
      const snapshot: FlightSnapshot = {
        timestamp: now,
        player: { 
          x: isNaN(p.x) ? 0 : Math.round(p.x), 
          y: isNaN(p.y) ? 0 : Math.round(p.y), 
          hp: isNaN(p.hp) ? 0 : Math.round(p.hp), 
          speed: isNaN(p.speed) ? 0 : Number(p.speed.toFixed(2)), 
          rotation: isNaN(p.rotationSpeed) ? 0 : Number(p.rotationSpeed.toFixed(2)),
          mode: p.mode,
          stuckTime: isNaN(p.stuckTime) ? 0 : Number(p.stuckTime.toFixed(1))
        },
        enemy: { 
          x: isNaN(e.x) ? 0 : Math.round(e.x), 
          y: isNaN(e.y) ? 0 : Math.round(e.y), 
          hp: isNaN(e.hp) ? 0 : Math.round(e.hp), 
          speed: isNaN(e.speed) ? 0 : Number(e.speed.toFixed(2)), 
          rotation: isNaN(e.rotationSpeed) ? 0 : Number(e.rotationSpeed.toFixed(2)),
          mode: e.mode,
          stuckTime: isNaN(e.stuckTime) ? 0 : Number(e.stuckTime.toFixed(1))
        },
        clonesCount: c.length,
        activeSparks: updatedSparks.length,
        activeTiles: tiles.filter((t: BoostTile) => t.isActive).length
      };

      // NaN Recovery
      if (isNaN(p.x) || isNaN(p.y) || isNaN(e.x) || isNaN(e.y)) {
        const timestamp = new Date().toLocaleTimeString();
        setSystemLogs(prev => [`[${timestamp}] CRITICAL: NaN detected. Auto-respawning.`, ...prev].slice(0, 5));
        
        // Determine focus point before resetting to show the problem area
        let focusX = C.ARENA_WIDTH / 2;
        let focusY = C.ARENA_HEIGHT / 2;
        
        if (isNaN(p.x) || isNaN(p.y)) {
          // Focus on player's last known good position
          focusX = playerRef.current.x;
          focusY = playerRef.current.y;
          p.x = C.ARENA_WIDTH / 4;
          p.y = C.ARENA_HEIGHT / 2;
        } else if (isNaN(e.x) || isNaN(e.y)) {
          // Focus on enemy's last known good position
          focusX = enemyRef.current.x;
          focusY = enemyRef.current.y;
          e.x = (C.ARENA_WIDTH * 3) / 4;
          e.y = (C.ARENA_HEIGHT / 2);
        }

        // Move camera to the problem area immediately
        const zoomScale = 1.2;
        setCamera({
          x: VIEWPORT_WIDTH / 2 - focusX * zoomScale,
          y: VIEWPORT_HEIGHT / 2 - focusY * zoomScale,
          scale: zoomScale
        });

        handleRespawn("CRITICAL: NaN Coordinate Failure detected in physics engine.", false);
      }
      
      flightLogRef.current = [...flightLogRef.current, snapshot].slice(-300); // Keep last 5 seconds

      // Enemy Boss System: Passives & Actives
      const isPhantom = level.enemy.special === 'phantom';
      const isJuggernaut = level.enemy.special === 'juggernaut';
      const isSniper = level.enemy.special === 'sniper';
      const isPredator = level.enemy.special === 'predator';
      const isEnemyActive = now - e.boostKeyTimer < settings.enemySpecialDuration;

      // Phantom Passive: After Image Trails
      const afterimageInterval = settings.afterimageInterval / settings.enemyTierMultiplier;
      if (isPhantom && now % afterimageInterval < 0.02) {
        setEnemyGhosts(prev => [...prev, {
          id: Math.random().toString(),
          x: e.x,
          y: e.y,
          angle: e.angle,
          opacity: 0.5,
          spawnTime: now
        }].slice(-20));
      }

      // Sniper Passive: Projectile Burst
      const projectileCooldown = settings.projectileCooldown / settings.enemyTierMultiplier;
      if (isSniper && now % projectileCooldown < 0.02) {
        const angle = Math.atan2(p.y - e.y, p.x - e.x);
        const speed = settings.projectileSpeed * settings.enemyTierMultiplier;
        const isSplit = e.rotationSpeed > 8;
        const count = isSplit ? 2 : 1;
        
        const newProjs: Projectile[] = [];
        for(let i=0; i<count; i++) {
          const spread = isSplit ? (i === 0 ? 0.2 : -0.2) : 0;
          // Step 3.4: Projectile Accuracy
          const accuracyOffset = (1 - settings.projectileAccuracy / 100) * (Math.random() - 0.5);
          newProjs.push({
            id: Math.random().toString(),
            x: e.x,
            y: e.y,
            vx: Math.cos(angle + spread + accuracyOffset) * speed,
            vy: Math.sin(angle + spread + accuracyOffset) * speed,
            damage: e.rotationSpeed * settings.projectileDamageRatio,
            life: settings.projectileLifetime
          });
        }
        setProjectiles(prev => [...prev, ...newProjs].slice(-settings.maxProjectiles * 2));
      }

      // Update Projectiles
      setProjectiles(prev => prev.map(proj => ({
        ...proj,
        x: proj.x + proj.vx,
        y: proj.y + proj.vy,
        life: proj.life - 1/60
      })).filter(proj => proj.life > 0));

      // Update Ghosts (Afterimages)
      setEnemyGhosts(prev => prev.map(ghost => ({
        ...ghost,
        opacity: ghost.opacity - (1 / (settings.afterimageLifetime * 60))
      })).filter(ghost => ghost.opacity > 0));

      // Projectile Collision
      projectiles.forEach(proj => {
        const distToPlayer = Math.hypot(proj.x - p.x, proj.y - p.y);
        if (distToPlayer < settings.playerSize * C.TILE_SIZE / 2) {
          // Each sniper contact must matter: it drains stability and guarantees
          // one HP damage, so a projectile cannot silently do nothing.
          const stabilityDamage = Math.max(1, Math.round(proj.damage));
          if (p.stability > 0) {
            p.stability = Math.max(0, p.stability - stabilityDamage);
          }
          p.hp = Math.max(0, p.hp - 1);
          p.lastDamageTime = now;
          recordBattleEvent('projectile', `SNIPER SHOT · -1 HP · -${stabilityDamage} stability`, now);
          setSystemLogs(prev => [`SNIPER SHOT · -1 HP · stability hit ${stabilityDamage}`, ...prev].slice(0, 5));
          
          proj.life = 0; // Destroy projectile
          // Add sparks
          for (let i = 0; i < 5; i++) {
            s.push({
              x: proj.x,
              y: proj.y,
              radius: Math.random() * 2 + 1,
              life: 3,
            });
          }
        }
      });

      // Step 3.5: Health-Based Reactions (Global Reactive System)
      const reactiveThreshold = (settings.reactiveTriggerThreshold / 100) * level.enemy.baseHp;
      const isLowHp = e.hp < reactiveThreshold;

      // Low HP Threshold Triggers (One-time burst)
      if (isLowHp && !e.lowHpTriggered) {
        e.lowHpTriggered = true;
        e.rotationSpeed = Math.min(e.rotationSpeed + 5, settings.enemyMaxRotation); 
        e.shieldTimer = now; 
        // Apply reactive duration effects
        e.speed += settings.stealthMoveBonus;
        setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] BOSS PANIC: Defensive Shield & Spin Burst!`, ...prev].slice(0, 5));
      }

      // Balance Rule: While invisible (phantom active)
      if (isPhantom && isEnemyActive) {
        // Rotation gain reduced by 20% (handled in rotation logic)
        // Forward momentum reduced by 10% (handled in AI logic)
        // Cannot deal bonus damage (handled in collision logic)
      }

      setPlayer({ ...p, lastX: p.x, lastY: p.y, lastVelocity: { x: (p.x - p.lastX) * 60, y: (p.y - p.lastY) * 60 } });
      setEnemy({ ...e, lastX: e.x, lastY: e.y, lastVelocity: { x: (e.x - e.lastX) * 60, y: (e.y - e.lastY) * 60 } });
      setBoostTiles(tiles);
      setSparks(updatedSparks);
      setClones(c);

      // Camera Logic
      let midX = (p.x + e.x) / 2;
      let midY = (p.y + e.y) / 2;
      
      // Final safety check for camera targets
      if (isNaN(midX) || isNaN(midY)) {
        midX = !isNaN(p.x) ? p.x : (!isNaN(e.x) ? e.x : C.ARENA_WIDTH / 2);
        midY = !isNaN(p.y) ? p.y : (!isNaN(e.y) ? e.y : C.ARENA_HEIGHT / 2);
      }

      // We want to fit both players with some padding
      const padding = 300;
      const safeDist = isNaN(dist) ? 1000 : dist;
      const requiredW = safeDist + padding;
      const requiredH = safeDist + padding;
      
      let targetScale = Math.min(VIEWPORT_WIDTH / requiredW, VIEWPORT_HEIGHT / requiredH);
      if (isNaN(targetScale)) targetScale = 0.5;

      // Min scale 0.5 (see whole arena), Max scale 1.2 (zoom in)
      targetScale = Math.max(0.5, Math.min(1.2, targetScale));
      
      // Slight zoom out during slow motion (major impact)
      if (timeScale < 1) {
        targetScale *= 0.8;
      }
      
      const lerp = 0.05; // Smooth camera
      let newScale = cameraRef.current.scale + (targetScale - cameraRef.current.scale) * lerp;
      if (isNaN(newScale)) newScale = 0.5;
      
      // Keep camera centered on players
      let newX = VIEWPORT_WIDTH / 2 - midX * newScale;
      let newY = VIEWPORT_HEIGHT / 2 - midY * newScale;

      if (isNaN(newX)) newX = 0;
      if (isNaN(newY)) newY = 0;
      
      setCamera({ x: newX, y: newY, scale: newScale });

      // HUD Auto-Hide Logic
      const baseOpacity = (settings.hudOpacity ?? 100) / 100;
      let targetPlayerHudOpacity = baseOpacity;
      let targetEnemyHudOpacity = baseOpacity;

      if (settings.autoHideHud) {
        const checkHudOcclusion = (worldX: number, worldY: number) => {
          const sx = worldX * newScale + newX;
          const sy = worldY * newScale + newY;
          
          // Left HUD area (Player)
          const leftHud = { x: 24, y: 16, w: 256, h: 380 };
          // Right HUD area (Enemy)
          const rightHud = { x: VIEWPORT_WIDTH - 24 - 256, y: 16, w: 256, h: 380 };

          const inLeft = sx > leftHud.x - 20 && sx < leftHud.x + leftHud.w + 20 && sy > leftHud.y - 20 && sy < leftHud.y + leftHud.h + 20;
          const inRight = sx > rightHud.x - 20 && sx < rightHud.x + rightHud.w + 20 && sy > rightHud.y - 20 && sy < rightHud.y + rightHud.h + 20;
          
          return { inLeft, inRight };
        };

        const pOcc = checkHudOcclusion(p.x, p.y);
        const eOcc = checkHudOcclusion(e.x, e.y);

        if (pOcc.inLeft || eOcc.inLeft) targetPlayerHudOpacity = Math.min(baseOpacity, 0.2);
        if (pOcc.inRight || eOcc.inRight) targetEnemyHudOpacity = Math.min(baseOpacity, 0.2);
      }

      setPlayerHudOpacity(prev => {
        const next = prev + (targetPlayerHudOpacity - prev) * 0.1;
        return isNaN(next) ? baseOpacity : next;
      });
      setEnemyHudOpacity(prev => {
        const next = prev + (targetEnemyHudOpacity - prev) * 0.1;
        return isNaN(next) ? baseOpacity : next;
      });

      requestAnimationFrame(gameLoop);
    };

    const animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, [winner, settings]);

  const handleClones = (p: TopState, e: TopState, c: CloneState[], s: SparkState[], now: number) => {
    // Spawn clones if enemy special is active and special is 'clones'
    const isEnemySpecial = now - e.boostKeyTimer < settings.enemySpecialDuration;
    if (isEnemySpecial && level.enemy.special === 'clones' && c.length < settings.maxCloneCount) {
      // Spawn at rate
      const lastSpawn = c.length > 0 ? Math.max(...c.map(cl => cl.spawnTime)) : 0;
      if (now - lastSpawn > 1 / settings.cloneSpawnRate) {
        c.push({
          ...e,
          id: Math.random().toString(36).substr(2, 9),
          spawnTime: now,
          hp: 1, // Clones are fragile
          speed: e.speed * 0.1,
          rotationSpeed: e.rotationSpeed * 0.1,
        });
      }
    }

    // Update and check clone collisions
    for (let i = c.length - 1; i >= 0; i--) {
      const clone = c[i];
      if (now - clone.spawnTime > settings.cloneLifetime) {
        c.splice(i, 1);
        continue;
      }

      // Simple AI for clones: move towards player
      const dx = p.x - clone.x;
      const dy = p.y - clone.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        clone.x += (dx / (dist || 0.001)) * clone.speed;
        clone.y += (dy / (dist || 0.001)) * clone.speed;
      }

      // Collision with player
      if (dist < (settings.playerSize + settings.enemySize) * C.TILE_SIZE / 2) {
        const isShieldActive = now - p.boostKeyTimer < settings.shieldDuration;
        if (!isShieldActive) {
          p.hp -= 2; // Small damage
          // Apply temporary slow (3 seconds)
          p.slowTimer = now;
        }
        c.splice(i, 1); // Clone dies on impact
        
        // Spark
        for (let j = 0; j < 5; j++) {
          s.push({
            x: clone.x,
            y: clone.y,
            radius: Math.random() * 3 + 1,
            life: 5,
          });
        }
      }
    }
  };

  const isSpecialActive = (p: TopState, specialId: string, now: number) => {
    for (let i = 0; i < 2; i++) {
      if (p.activeSpecialIds[i] === specialId) {
        const spec = C.PLAYER_SPECIALS.find(s => s.id === specialId);
        if (spec && now - p.specialTimers[i] < spec.duration) return true;
      }
    }
    return false;
  };

  const handlePlayerMovement = (p: TopState, keys: Record<string, boolean>, now: number) => {
    let speedMult = 1;
    let rotationMult = 1;

    // Check active specials for movement modifiers
    if (isSpecialActive(p, 'cloak_pulse', now)) {
        speedMult *= 0.8; // Slower while cloaked
    }
    if (isSpecialActive(p, 'size_shift', now)) {
        speedMult *= 0.85; // Slower while huge
    }

    for (let i = 0; i < 2; i++) {
      const specId = p.activeSpecialIds[i];
      if (!specId) continue;
      const spec = C.PLAYER_SPECIALS.find(s => s.id === specId);
      if (!spec) continue;

      if (now - p.specialTimers[i] < spec.duration) {
        if (specId === 'dash_burst') speedMult *= 1.8;
        if (specId === 'overdrive_spin') speedMult *= 0.85;
        if (specId === 'size_shift') speedMult *= 0.85;
        if (specId === 'cloak_pulse') speedMult *= 0.0; // Cannot move/attack? User said "Cannot attack", I'll assume movement is okay but maybe slow
        
        if (specId === 'dash_burst') rotationMult *= 0.9;
      }
    }

    let currentSpeed = Math.max(0.5, p.speed * speedMult); 
    if (now - p.slowTimer < 3) {
      currentSpeed *= (1 - settings.cloneSlowMovement / 100);
    }
    if (now - p.speedBoostTimer < 4) {
      currentSpeed *= 1.4;
    }

    let moveX = 0;
    let moveY = 0;
    if (keys['w']) moveY -= 1;
    if (keys['s']) moveY += 1;
    if (keys['a']) moveX -= 1;
    if (keys['d']) moveX += 1;

    if (moveX !== 0 || moveY !== 0) {
        const length = Math.hypot(moveX, moveY) || 1;
        p.x += (moveX / length) * currentSpeed;
        p.y += (moveY / length) * currentSpeed;
    }
  };

  const gravityEffect = (p: TopState, e: TopState, now: number) => {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    const gravityRadius = settings.gravityRadius * C.TILE_SIZE;
    const isEnemySpecial = now - e.boostKeyTimer < settings.enemySpecialDuration;
    
    if (dist > 0 && dist < gravityRadius) {
      e.x += (dx / (dist || 0.001)) * settings.gravityStrength;
      e.y += (dy / (dist || 0.001)) * settings.gravityStrength;
    }

    // Enemy Special Gravity
    if (isEnemySpecial && level.enemy.special === 'gravity') {
      const specialRadius = settings.gravityEnemySpecialRadius * C.TILE_SIZE;
      if (dist > 0 && dist < specialRadius) {
        // Pull player toward enemy (or push if negative)
        p.x -= (dx / (dist || 0.001)) * settings.gravityEnemySpecialStrength;
        p.y -= (dy / (dist || 0.001)) * settings.gravityEnemySpecialStrength;
      }
    }

    // Vortex Special
    if (isEnemySpecial && level.enemy.special === 'vortex') {
      const specialRadius = settings.gravityEnemySpecialRadius * C.TILE_SIZE * 1.5;
      if (dist > 0 && dist < specialRadius) {
        // Pull in
        p.x -= (dx / (dist || 0.001)) * settings.vortexStrength;
        p.y -= (dy / (dist || 0.001)) * settings.vortexStrength;
        // Tangential force (spin around)
        const angle = Math.atan2(dy, dx);
        const tangentialAngle = angle + Math.PI / 2;
        p.x += Math.cos(tangentialAngle) * (settings.vortexStrength * 1.5);
        p.y += Math.sin(tangentialAngle) * (settings.vortexStrength * 1.5);
      }
    }

    // Shockwave Special
    if (isEnemySpecial && level.enemy.special === 'shockwave') {
      const specialRadius = settings.gravityEnemySpecialRadius * C.TILE_SIZE * 1.2;
      if (dist > 0 && dist < specialRadius) {
        // Push away strongly
        p.x += (dx / (dist || 0.001)) * settings.shockwaveForce;
        p.y += (dy / (dist || 0.001)) * settings.shockwaveForce;
        // Quake effect: also slow the player
        p.slowTimer = now;
      }
    }
  };

  const updateEnemyAIState = (p: TopState, e: TopState, tiles: BoostTile[], now: number, s: SparkState[]) => {
    // Clean up old hits
    e.recentHits = e.recentHits.filter(t => now - t < 2);

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);

    // Enemy Special Activation Condition
    const huntRadius = level.enemy.huntRadiusMultiplier * settings.enemySize * C.TILE_SIZE;
    if (dist < huntRadius && now > e.boostKeyCooldown) {
      // Different activation conditions based on special AND AI Style
      let shouldActivate = false;
      
      const isAggressive = level.enemy.aiStyle === 'aggressive';
      const isDefensive = level.enemy.aiStyle === 'defensive';
      const isOpportunistic = level.enemy.aiStyle === 'opportunistic';

      if (level.enemy.special === 'phantom') {
        shouldActivate = e.hp < level.enemy.baseHp * 0.95 || isOpportunistic;
      }
      if (level.enemy.special === 'juggernaut') {
        shouldActivate = dist < huntRadius * (isDefensive ? 0.6 : 0.4) || e.recentHits.length > 2;
      }
      if (level.enemy.special === 'sniper') {
        shouldActivate = dist < huntRadius * 1.5 && dist > huntRadius * 0.5;
      }
      if (level.enemy.special === 'predator') {
        shouldActivate = p.hp < settings.playerHp * 0.4 || (isAggressive && dist < huntRadius);
      }
      if (level.enemy.special === 'gravity') {
        shouldActivate = dist < huntRadius * (isAggressive ? 0.9 : 0.7);
      }
      if (level.enemy.special === 'vortex') {
        shouldActivate = dist < huntRadius * 0.8;
      }
      if (level.enemy.special === 'shockwave') {
        shouldActivate = dist < huntRadius * (isDefensive ? 0.6 : 0.4) || e.recentHits.length > 2;
      }
      if (level.enemy.special === 'clones') {
        shouldActivate = e.hp < level.enemy.baseHp * 0.7 || (isOpportunistic && p.rotationSpeed > 10);
      }
      if (level.enemy.special === 'berserker') {
        shouldActivate = e.hp < settings.enemyHp * 0.5 || isAggressive;
      }
      if (level.enemy.special === 'teleporter') {
        shouldActivate = dist > huntRadius * 1.5 || (isOpportunistic && dist < huntRadius * 0.5);
      }
      if (level.enemy.special === 'mirror') {
        shouldActivate = p.rotationSpeed > e.rotationSpeed + 2 || e.hp < level.enemy.baseHp * 0.5;
      }

      if (shouldActivate) {
        e.isTelegraphing = true;
        e.telegraphTimer = now;
        e.boostKeyCooldown = now + settings.enemySpecialCooldown + settings.telegraphDuration;
        
        // Audio cue for telegraphing
        if (audioCtxRef.current) {
          const osc = audioCtxRef.current.createOscillator();
          const gain = audioCtxRef.current.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, audioCtxRef.current.currentTime);
          osc.frequency.linearRampToValueAtTime(440, audioCtxRef.current.currentTime + settings.telegraphDuration);
          gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime);
          gain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + settings.telegraphDuration);
          osc.connect(gain);
          gain.connect(audioCtxRef.current.destination);
          osc.start();
          osc.stop(audioCtxRef.current.currentTime + settings.telegraphDuration);
        }
      }
    }

    // State Evaluation Logic based on AI Style
    const rotationDiff = p.rotationSpeed - e.rotationSpeed;
    const tooManyHits = e.recentHits.length >= 3;
    
    let evadeThreshold = 60;
    let rotationThreshold = 3;
    
    if (level.enemy.aiStyle === 'aggressive') {
      evadeThreshold = 30;
      rotationThreshold = 5;
    } else if (level.enemy.aiStyle === 'defensive') {
      evadeThreshold = 80;
      rotationThreshold = 1.5;
    } else if (level.enemy.aiStyle === 'opportunistic') {
      evadeThreshold = 50;
      rotationThreshold = 4;
    }

    // PART 5 — AI Rebalance With Radii Awareness
    // Zone 1: Outside Hunt Radius → Idle
    // Zone 2: Inside Hunt → Evaluate
    // Zone 3: Inside Push → Pressure
    // Zone 4: Inside Physical → Commit
    
    const pPhysR = (settings.playerSize * C.TILE_SIZE) / 2;
    const ePhysR = (settings.enemySize * C.TILE_SIZE) / 2;
    const combinedPhysR = pPhysR + ePhysR;
    const combinedPushR = combinedPhysR * 2.0;

    if (dist < combinedPhysR * 1.2) {
      e.mode = 'hunt'; // Commit zone
    } else if (dist < combinedPushR) {
      e.mode = 'hunt'; // Pressure zone
    } else if (dist < huntRadius) {
      e.mode = 'hunt'; // Evaluate zone
    } else {
      e.mode = 'idle';
      // Pick a random target in the arena if none exists
      if (!e.idleTarget) {
        e.idleTarget = {
          x: Math.random() * C.ARENA_WIDTH,
          y: Math.random() * C.ARENA_HEIGHT
        };
      }
    }
  };

  const evaluateCombatIntent = (e: TopState, p: TopState, tiles: BoostTile[], now: number) => {
    // Step 2: Decision Interval & Global Scaling
    const decisionInterval = settings.decisionInterval / settings.enemyTierMultiplier;
    if (now - e.intentTimer < decisionInterval) return;
    
    // Layer 1 — Evaluate Advantage
    // Combat Score = (Forward Momentum × Weight) + (Rotation Advantage × Weight) + (HP Ratio × Weight) + (Stability Ratio × Weight) – (Border Risk × Weight)
    
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    const evx = (e.x - e.lastX) * 60;
    const evy = (e.y - e.lastY) * 60;
    const forwardMomentum = Math.max(0, evx * dirX + evy * dirY);
    
    const rotAdvantage = e.rotationSpeed - p.rotationSpeed;
    
    // PART 6 — Effective Health Evaluation
    const eEffHp = e.hp + (e.stability * settings.stabilityAbsorption);
    const pEffHp = p.hp + (p.stability * settings.stabilityAbsorption);
    const hpRatio = eEffHp / (pEffHp || 1);
    
    // LAW 7 — AI uses same AttackScore formula as player
    // AttackScore = (FM * MW) + (Rot * RW) + (Stab * SW)
    const pvx = (p.x - p.lastX) * 60;
    const pvy = (p.y - p.lastY) * 60;
    const pForwardMomentum = Math.max(0, pvx * (-dirX) + pvy * (-dirY));
    
    const eScore = (forwardMomentum * settings.weightMomentum) + (e.rotationSpeed * settings.weightRotation) + (e.stability * settings.weightStability);
    const pScore = (pForwardMomentum * settings.weightMomentum) + (p.rotationSpeed * settings.weightRotation) + (p.stability * settings.weightStability);
    
    // AI Awareness of Intent Bonus
    let finalEScore = eScore;
    let finalPScore = pScore;
    if (e.intent === 'attack') finalEScore *= 1.05;
    if (p.intent === 'attack') finalPScore *= 1.05;

    const distToBorder = Math.min(e.x, C.ARENA_WIDTH - e.x, e.y, C.ARENA_HEIGHT - e.y);
    const borderRisk = distToBorder < 100 ? (100 - distToBorder) / 100 : 0;
    
    const huntRadius = level.enemy.huntRadiusMultiplier * settings.enemySize * C.TILE_SIZE;
    const evadeRadius = level.enemy.evadeRadiusMultiplier * settings.enemySize * C.TILE_SIZE;
    
    // AI Decision Score (Decision Score = AttackScore Advantage + HP Advantage - Risk)
    let score = (finalEScore - finalPScore) + (hpRatio * 10) - (borderRisk * 50);
    
    // Radius Bias
    if (dist < huntRadius) score += 15;
    if (dist > evadeRadius) score -= 10;
    
    // LAW 7 — AI Awareness of Player Specials
    if (isSpecialActive(p, 'mirror_shield', now) || isSpecialActive(p, 'counter_core', now)) {
        score -= 40; // High risk of reflected damage
    }
    if (isSpecialActive(p, 'bounce_shield', now)) {
        score -= 20; // Risk of being pushed back
    }
    if (isSpecialActive(p, 'cloak_pulse', now)) {
        score -= 10; // Harder to track
    }
    if (isSpecialActive(p, 'armor_break', now)) {
        score -= 15; // High damage risk
    }
                
    // Aggression Bias
    score += (settings.aggressionBias - 50) * 0.5;
    
    // Level AI Style modifiers
    if (level.enemy.aiStyle === 'aggressive') score += 10;
    if (level.enemy.aiStyle === 'defensive') score -= 10;
    
    // Corner Mercy
    const playerDistToBorder = Math.min(p.x, C.ARENA_WIDTH - p.x, p.y, C.ARENA_HEIGHT - p.y);
    if (playerDistToBorder < 150) {
      score -= 25;
    }
    
    e.combatScore = score;
    
    // Layer 2 — Decide Mode
    let newIntent: 'attack' | 'disengage' = 'disengage';
    if (score > settings.attackThreshold) {
      newIntent = 'attack';
    } else if (score > settings.pressureThreshold) {
      newIntent = 'attack'; 
    } else {
      newIntent = 'disengage';
    }
    
    // Layer 3 — Commit Rules
    const commitDuration = settings.commitDuration / settings.enemyTierMultiplier;
    const inCommitWindow = now - e.commitTimer < commitDuration;
    
    if (inCommitWindow && e.intent === 'attack') {
      // Ignore small score drops
      if (score > settings.attackThreshold - 15) {
        // Keep attacking
      } else {
        e.intent = newIntent;
        if (newIntent === 'attack') e.commitTimer = now;
      }
    } else {
      if (e.intent !== newIntent && newIntent === 'attack') {
        e.commitTimer = now;
        // Lock target direction (Prediction)
        const pvx = (p.x - p.lastX) * 60;
        const pvy = (p.y - p.lastY) * 60;
        const predFactor = (settings.predictionAccuracy / 100) * settings.enemyTierMultiplier;
        e.commitTarget = {
          x: p.x + pvx * 0.3 * predFactor,
          y: p.y + pvy * 0.3 * predFactor
        };
      }
      e.intent = newIntent;
    }
    
    e.intentTimer = now;
  };

  const playAudio = (type: 'boost' | 'hit' | 'win' | 'lose') => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'boost') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else if (type === 'hit') {
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const activateSpecial = (slotIndex: number) => {
    // Cooldowns are compared against simulation time throughout the match.
    // Using wall-clock time here made a single activation appear to recharge
    // for decades when the HUD read the match timer.
    const now = gameTimeRef.current;
    const p = playerRef.current;
    const e = enemyRef.current;
    const specId = p.activeSpecialIds[slotIndex];
    if (!specId) return;

    const spec = C.PLAYER_SPECIALS.find(s => s.id === specId);
    if (!spec) return;

    if (now < p.specialCooldowns[slotIndex]) return;

    // Activate
    const newTimers = [...p.specialTimers] as [number, number];
    const newCooldowns = [...p.specialCooldowns] as [number, number];
    
    newTimers[slotIndex] = now;
    newCooldowns[slotIndex] = now + spec.cooldown;

    // Instant effects
    if (specId === 'overdrive_spin') {
      p.rotationSpeed = Math.min(settings.playerMaxRotation, p.rotationSpeed + 4);
    }
    if (specId === 'blink') {
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
          const nx = dx / dist;
          const ny = dy / dist;
          // Teleport behind enemy
          p.x = e.x + nx * 80;
          p.y = e.y + ny * 80;
          // Add sparks
          setSparks(prev => {
              const newSparks = [...prev];
              for (let i = 0; i < 15; i++) {
                  newSparks.push({ 
                      x: p.x + (Math.random() - 0.5) * 20, 
                      y: p.y + (Math.random() - 0.5) * 20, 
                      radius: 4, 
                      life: 10, 
                      color: '#06b6d4' 
                  });
              }
              return newSparks;
          });
      }
    }
    if (specId === 'momentum_lock') {
      // Handled in collision logic
    }
    if (specId === 'magnetic_gravity') {
      p.gravityPullTimer = now;
    }

    p.specialTimers = newTimers;
    p.specialCooldowns = newCooldowns;
    recordBattleEvent('special', `SPECIAL · ${spec.name} activated`, gameTimeRef.current);
    setSystemLogs(prev => [`SPECIAL · ${spec.name} activated`, ...prev].slice(0, 5));

    playAudio('boost');
  };

  const handleEnemyAI = (p: TopState, e: TopState, now: number, tiles: BoostTile[]) => {
    evaluateCombatIntent(e, p, tiles, now);
    
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.hypot(dx, dy);
    
    // Stuck recovery
    const margin = 100;
    if (e.x < margin) e.x += 1.5;
    if (e.x > C.ARENA_WIDTH - margin) e.x -= 1.5;
    if (e.y < margin) e.y += 1.5;
    if (e.y > C.ARENA_HEIGHT - margin) e.y -= 1.5;

    let currentSpeed = e.speed;
    if (now - e.slowTimer < 3) currentSpeed *= (1 - settings.cloneSlowMovement / 100);
    if (now - e.speedBoostTimer < 4) currentSpeed *= 1.4; 
    
    const isEnemySpecial = now - e.boostKeyTimer < settings.enemySpecialDuration;
    if (isEnemySpecial && level.enemy.special === 'juggernaut') currentSpeed *= (1 - settings.growthMovePenalty / 100);
    
    // Step 6: Global Scaling (Movement)
    const tierSpeedMult = settings.enemyTierMultiplier;
    currentSpeed *= tierSpeedMult;

    currentSpeed = Math.min(currentSpeed, settings.enemyMaxSpeed * (isEnemySpecial ? 1.5 : 1) * tierSpeedMult);

    const commitDuration = settings.commitDuration / settings.enemyTierMultiplier;
    const inCommitWindow = now - e.commitTimer < commitDuration;

    if (e.intent === 'attack') {
      // Attack Commit: Increase forward acceleration only, lock direction if in window
      let targetX = p.x;
      let targetY = p.y;

      if (inCommitWindow && e.commitTarget) {
        targetX = e.commitTarget.x;
        targetY = e.commitTarget.y;
      } else {
        const pvx = (p.x - p.lastX) * 60;
        const pvy = (p.y - p.lastY) * 60;
        const predFactor = (settings.predictionAccuracy / 100) * settings.enemyTierMultiplier;
        targetX = p.x + pvx * 0.2 * predFactor;
        targetY = p.y + pvy * 0.2 * predFactor;
      }

      const adx = targetX - e.x;
      const ady = targetY - e.y;
      const adist = Math.hypot(adx, ady);
      
      if (adist > 0) {
        // Increase forward acceleration only
        let accel = 1.2;
        if (isEnemySpecial && level.enemy.special === 'predator' && p.hp < settings.playerHp * 0.4) {
          accel = 1.8; 
        }
        
        // Disable lateral corrections if in commit window
        const momentumMult = (isEnemySpecial && level.enemy.special === 'phantom') ? 0.9 : 1.0;
        if (inCommitWindow) {
          e.x += (adx / adist) * (currentSpeed * accel * momentumMult);
          e.y += (ady / adist) * (currentSpeed * accel * momentumMult);
        } else {
          // Normal tracking
          e.x += (adx / adist) * (currentSpeed * momentumMult);
          e.y += (ady / adist) * (currentSpeed * momentumMult);
        }
      }
    } else {
      // Disengage logic: Move toward nearest safe vector
      let bestTarget = { x: C.ARENA_WIDTH / 2, y: C.ARENA_HEIGHT / 2 };
      let bestScore = -Infinity;

      const samples = [
        { x: C.ARENA_WIDTH / 2, y: C.ARENA_HEIGHT / 2 },
        { x: 200, y: 200 },
        { x: C.ARENA_WIDTH - 200, y: 200 },
        { x: 200, y: C.ARENA_HEIGHT - 200 },
        { x: C.ARENA_WIDTH - 200, y: C.ARENA_HEIGHT - 200 },
      ];

      for (const tile of tiles) {
        if (tile.isActive) {
          const enemyTimeToTile = Math.hypot(e.x - tile.x * C.TILE_SIZE, e.y - tile.y * C.TILE_SIZE) / (currentSpeed * 60);
          const playerTimeToTile = Math.hypot(p.x - tile.x * C.TILE_SIZE, p.y - tile.y * C.TILE_SIZE) / (p.speed * 60);
          if (enemyTimeToTile < playerTimeToTile - 0.5) {
            samples.push({ x: tile.x * C.TILE_SIZE, y: tile.y * C.TILE_SIZE });
          }
        }
      }

      for (const sample of samples) {
        let score = 0;
        const distToSample = Math.hypot(sample.x - e.x, sample.y - e.y);
        const distToPlayer = Math.hypot(sample.x - p.x, sample.y - p.y);
        
        score += distToPlayer;
        
        const distToBorder = Math.min(sample.x, C.ARENA_WIDTH - sample.x, sample.y, C.ARENA_HEIGHT - sample.y);
        if (distToBorder < currentSpeed * 60 * 1.5) {
          score -= 1000;
        }

        if (p.rotationSpeed - e.rotationSpeed > settings.rotationConfidenceThreshold) {
          if (distToPlayer < 300) score -= 500;
        }

        if (score > bestScore) {
          bestScore = score;
          bestTarget = sample;
        }
      }

      const tdx = bestTarget.x - e.x;
      const tdy = bestTarget.y - e.y;
      const tdist = Math.hypot(tdx, tdy);
      if (tdist > 0) {
        e.x += (tdx / tdist) * currentSpeed;
        e.y += (tdy / tdist) * currentSpeed;
      }
    }
  };

  const checkBoost = (top: TopState, tiles: BoostTile[], now: number) => {
    const tileX = Math.floor(top.x / C.TILE_SIZE);
    const tileY = Math.floor(top.y / C.TILE_SIZE);

    for (const tile of tiles) {
      if (tile.isActive && tile.x === tileX && tile.y === tileY) {
        let ampMult = 1;
        if (top.name === playerTop.name && (top.activeSpecialIds.includes('tile_amplifier'))) {
          ampMult = 1.5;
        }

        // Apply effect based on type
        switch (tile.type) {
          case 'base':
            // PART 2 — Boost Tiles (Stacking Rule: Refresh duration only)
            if (now - top.boostTimer > settings.tileBoostDuration) {
              top.rotationSpeed = Math.min(top.name === player.name ? settings.playerMaxRotation : settings.enemyMaxRotation, top.rotationSpeed + tile.multiplier * ampMult); 
            }
            top.boostTimer = now;
            // Hum sound for base boost
            if (audioCtxRef.current) {
              const osc = audioCtxRef.current.createOscillator();
              const gain = audioCtxRef.current.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(110, audioCtxRef.current.currentTime);
              gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);
              osc.connect(gain);
              gain.connect(audioCtxRef.current.destination);
              osc.start();
              osc.stop(audioCtxRef.current.currentTime + 0.5);
            }
            break;
          case 'speed':
            top.speedBoostTimer = now; // +40% movement for 4s
            break;
          case 'stability':
            top.stability = Math.min(top.stability + settings.maxStability * 0.3 * ampMult, settings.maxStability); // Instant +30% stability
            break;
          case 'efficiency':
            top.efficiencyBoostTimer = now; // +25% damage conversion
            break;
          case 'overcharge':
            // PART 2 — Boost Tiles (Impact Cap: FinalRotation ≤ MaxRotationCap)
            top.rotationSpeed = Math.min(top.name === player.name ? settings.playerMaxRotation : settings.enemyMaxRotation, top.rotationSpeed + 5 * ampMult); 
            top.hp = Math.max(0, top.hp - (top.name === player.name ? settings.playerHp : settings.enemyHp) * 0.1); // Lose 10% HP
            break;
          case 'vampiric':
            // Heal 5% HP on next hit (handled in collisions, but mark here)
            top.boostTimer = now; // Reuse boostTimer for duration
            break;
          case 'gravity_surge':
            // Global gravity pull for 3s
            setManualGravitySurgeTimer(now);
            break;
          case 'shield_recharge':
            // Instantly reset shield cooldown
            top.specialCooldowns[0] = 0;
            break;
        }

        tile.isActive = false;
        tile.respawnTime = now + settings.tileRespawnTime; 
      }
    }

    // Check for expiration of temporary boosts
    if (now - top.boostTimer > settings.tileBoostDuration) { 
      if (!settings.momentumEnabled) {
        top.rotationSpeed = top.baseRotation;
      }
    }
  };

  const checkCollisions = (p: TopState, e: TopState, sparks: SparkState[], now: number) => {
    const isEnemySpecial = now - e.boostKeyTimer < settings.enemySpecialDuration;
    // STEP 1 — Collision Detection
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const dist = Math.hypot(dx, dy);
    
    const enemySize = (level.enemy.special === 'juggernaut' && isEnemySpecial ? settings.enemySize * settings.growthMultiplier : settings.enemySize);
    const playerSize = (isSpecialActive(p, 'size_shift', now) ? settings.playerSize * settings.growthMultiplier : settings.playerSize);

    const combinedRadius = (playerSize + enemySize) * C.TILE_SIZE / 2;

    if (dist <= combinedRadius) {
      // STEP 3 — Engagement Lock Window
      if (now * 1000 - p.engagementLockTimer < settings.engagementLockWindow) {
        return;
      }
      p.engagementLockTimer = now * 1000;
      e.engagementLockTimer = now * 1000;

      // STEP 1 (cont) — Freeze states
      const pvx = (p.x - p.lastX) * 60;
      const pvy = (p.y - p.lastY) * 60;
      const evx = (e.x - e.lastX) * 60;
      const evy = (e.y - e.lastY) * 60;
      const pRot = p.rotationSpeed;
      const eRot = e.rotationSpeed;
      const gravityMult = settings.arenaGravityMultiplier;

      // STEP 2 — Forward Momentum Calculation
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      
      // ForwardMomentum = Dot(Velocity, DirectionToOpponent)
      let pFM = pvx * nx + pvy * ny;
      let eFM = evx * (-nx) + evy * (-ny);

      // Global Safety Limits — Forward Momentum Cap
      const pMaxSpeed = settings.playerMaxSpeed * (isSpecialActive(p, 'size_shift', now) ? 0.85 : 1);
      const eMaxSpeed = settings.enemyMaxSpeed * (isEnemySpecial && level.enemy.special === 'juggernaut' ? settings.growthMultiplier : 1.5);
      pFM = Math.min(pMaxSpeed, pFM);
      eFM = Math.min(eMaxSpeed, eFM);

      // Cloak Pulse: Cannot attack
      if (isSpecialActive(p, 'cloak_pulse', now)) {
          pFM = -100; // Force defender state
      }

      // STEP 4 — Determine priority from committed forward momentum first.
      // Spin and stability break close calls, but a top drifting into contact
      // should never beat a deliberate charge simply because it has more HP.
      let pScore = (Math.max(0, pFM) * settings.weightMomentum * 2) + (pRot * settings.weightRotation * 0.35) + (p.stability * settings.weightStability * 0.15);
      let eScore = (Math.max(0, eFM) * settings.weightMomentum * 2) + (eRot * settings.weightRotation * 0.35) + (e.stability * settings.weightStability * 0.15);

      // Combat Model Overrides
      if (settings.combatModel === 'simple') {
          pScore = Math.max(0, pFM);
          eScore = Math.max(0, eFM);
      } else if (settings.combatModel === 'experimental') {
          // Experimental: High variance, rotation is king
          pScore = (Math.max(0, pFM) * 0.5) + (pRot * 2.0) + (p.stability * 0.5);
          eScore = (Math.max(0, eFM) * 0.5) + (eRot * 2.0) + (e.stability * 0.5);
          // Add some randomness
          pScore *= (0.9 + Math.random() * 0.2);
          eScore *= (0.9 + Math.random() * 0.2);
      } else if (settings.combatModel === 'hardcore') {
          // Hardcore: Momentum and HP risk
          pScore = (Math.max(0, pFM) * 2.0) + (pRot * 1.0) + (p.hp / 100);
          eScore = (Math.max(0, eFM) * 2.0) + (eRot * 1.0) + (e.hp / 100);
      }

      // 1. Physics Momentum Toggle
      if (!settings.enablePhysicsMomentum && settings.combatModel !== 'simple') {
          pScore = (pRot * settings.weightRotation) + (p.stability * settings.weightStability);
          eScore = (eRot * settings.weightRotation) + (e.stability * settings.weightStability);
      }

      // 2. Spin-Power Scaling Toggle
      if (!settings.enableSpinPowerScaling) {
          pScore = (Math.max(0, pFM) * settings.weightMomentum) + (p.stability * settings.weightStability);
          eScore = (Math.max(0, eFM) * settings.weightMomentum) + (e.stability * settings.weightStability);
      }

      // 4. Intent Bonus (5%) Toggle
      if (settings.enableIntentEngagement) {
          if (p.intent === 'attack') pScore *= 1.05;
          if (e.intent === 'attack') eScore *= 1.05;
      }

      let attacker: TopState;
      let defender: TopState;
      let isPlayerAttacker: boolean;
      let isClash = false;

      // Clash State at 5% momentum parity (Only if Intent Engagement is enabled)
      const scoreDiff = Math.abs(pScore - eScore);
      const maxScore = Math.max(pScore, eScore, 1);
      
      if (settings.enableIntentEngagement && scoreDiff / maxScore < 0.05) {
          isClash = true;
          p.engagementPriority = 'clash';
          e.engagementPriority = 'clash';
      } else if (pScore > eScore) {
          attacker = p;
          defender = e;
          isPlayerAttacker = true;
          p.engagementPriority = 'attacker';
          e.engagementPriority = 'defender';
      } else {
          attacker = e;
          defender = p;
          isPlayerAttacker = false;
          e.engagementPriority = 'attacker';
          p.engagementPriority = 'defender';
      }

      // STEP 5 — Calculate Impact Angle (Only if Physics Momentum is enabled)
      const pSpeed = Math.hypot(pvx, pvy) || 0.001;
      const eSpeed = Math.hypot(evx, evy) || 0.001;
      const pnvx = pvx / pSpeed;
      const pnvy = pvy / pSpeed;
      const envx = evx / eSpeed;
      const envy = evy / eSpeed;
      
      // ImpactDot = Dot(NormalizedV1, -NormalizedV2)
      const impactDot = (pnvx * -envx) + (pnvy * -envy);
      
      let impactModifier = 1.1; // Side
      if (settings.enablePhysicsMomentum) {
          if (impactDot > 0.8) impactModifier = 1.8; // Head-on
          else if (impactDot < 0) impactModifier = 0.6; // Glancing
      }
      impactModifier = Math.min(2.0, Math.max(0.5, impactModifier));

      // STEP 6 — Damage Calculation
      const gravityModifier = 1 + (Math.sqrt(gravityMult) * 0.05);
      
      // STEP 7 — Stability Absorption (70%) Toggle
      const applyDamage = (target: TopState, damage: number, attackerHasArmorBreak: boolean) => {
          let absorption = settings.stabilityAbsorption / 100;
          if (!settings.enableStabilityShield) absorption = 0;
          if (attackerHasArmorBreak) absorption *= 0.6; // 40% bypass
          
          const absorbedAmount = damage * absorption;
          const toHP = damage - absorbedAmount;
          
          if (settings.enableStabilityShield && target.stability >= absorbedAmount) {
              target.stability -= absorbedAmount;
              target.hp -= toHP;
          } else {
              const spillover = absorbedAmount - target.stability;
              if (settings.enableStabilityShield) target.stability = 0;
              target.hp -= (toHP + spillover);
          }
      };

      if (isClash) {
          // An even collision is a stalemate, not a hidden mutual-damage tax.
          // Both tops lose stability only; neither HP bar is damaged.
          const clashDmg = (pRot + eRot) * settings.spinWeight * settings.clashDamageRatio;
          p.stability = Math.max(0, p.stability - clashDmg);
          e.stability = Math.max(0, e.stability - clashDmg);
          setSystemLogs(prev => [
            `CLASH · equal commitment · -${Math.round(clashDmg)} stability each · HP safe`,
            ...prev
          ].slice(0, 5));
          recordBattleEvent('clash', `CLASH · both lose ${Math.round(clashDmg)} stability · HP safe`, now);
      } else {
          // Base Damage = Attacker Rotation * SpinWeight (Spin-Power Scaling Toggle)
          let baseDamage = settings.enableSpinPowerScaling ? (attacker!.rotationSpeed * settings.spinWeight) : 10;
          
          // Size Shift Damage Bonus
          if (isPlayerAttacker! && isSpecialActive(p, 'size_shift', now)) {
              baseDamage *= 1.35; // +35% damage
          }

          let rawDamage = baseDamage * impactModifier * gravityModifier * settings.impactEfficiencyModifier;

          // Combat Model Damage Scaling
          if (settings.combatModel === 'experimental') {
              // Keep experimental matches expressive without turning a similar
              // collision into a wildly different health swing.
              rawDamage *= (0.9 + Math.random() * 0.2);
          } else if (settings.combatModel === 'hardcore') {
              rawDamage *= 1.5; // Punishing damage
          }

          // Apply Damage Formula Mode (Only if Spin-Power Scaling is enabled)
          if (settings.enableSpinPowerScaling) {
              if (settings.damageFormulaMode === 'floor') {
                  rawDamage = Math.floor(rawDamage);
              } else if (settings.damageFormulaMode === 'rounded') {
                  rawDamage = Math.round(rawDamage);
              } else if (settings.damageFormulaMode === 'momentum') {
                  // Momentum mode: Damage scales with relative velocity
                  const relVelMag = Math.hypot(pvx - evx, pvy - evy);
                  rawDamage *= (1 + (relVelMag / 100));
              }
          }

          // STEP 11 — Special Overrides
          let reflectDamage = 0;
          if (isPlayerAttacker!) {
              if (level.enemy.special === 'mirror' && now - e.boostKeyTimer < settings.enemySpecialDuration) {
                  reflectDamage = rawDamage * 0.5;
              }
          } else {
              if (isSpecialActive(p, 'counter_core', now)) reflectDamage = rawDamage * 0.3;
              if (isSpecialActive(p, 'mirror_shield', now)) reflectDamage = rawDamage * 0.5;
          }

          const maxDmg = (isPlayerAttacker! ? settings.enemyHp : settings.playerHp) * settings.damageCapRatio;
          const finalDamage = Math.max(1, Math.min(maxDmg, rawDamage)); // Ensure at least 1 damage
          
          // LAW 3 — Defender-Only Damage
          applyDamage(defender!, finalDamage, isPlayerAttacker! && isSpecialActive(p, 'armor_break', now));

          const impactKind = impactModifier >= 1.7 ? 'head-on' : impactModifier <= 0.7 ? 'glancing' : 'side';
          setSystemLogs(prev => [
            `${isPlayerAttacker ? 'YOU HIT' : 'FOE HIT'} · ${impactKind} · ${Math.round(finalDamage)} impact · ${isPlayerAttacker ? 'foe' : 'you'} defended with stability`,
            ...prev
          ].slice(0, 5));
          recordBattleEvent('hit', `${isPlayerAttacker ? 'YOU HIT' : 'FOE HIT'} · ${impactKind} · ${Math.round(finalDamage)} impact`, now);

          // Apply Reflection (LAW 7 — Reflection must also use Stability absorption)
          if (reflectDamage > 0) {
              // Reflection mirrors the resolved hit, never an uncapped raw
              // multiplier. This keeps mirror/counter specials threatening but
              // prevents them from out-damaging the impact they reflect.
              applyDamage(attacker!, Math.min(finalDamage, reflectDamage), false);
          }
      }

      // STEP 8 — Bounce Force Calculation
      const relVelX = pvx - evx;
      const relVelY = pvy - evy;
      const relVelMag = Math.hypot(relVelX, relVelY);
      
      let bounceForce = relVelMag * settings.bounceDistanceMultiplier * impactModifier * 0.1;
      if (isClash) bounceForce *= 1.2; // Extra separation on clash

      if (settings.combatModel === 'experimental') {
          bounceForce *= (1.5 + Math.random() * 1.0); // Chaotic bounces
      } else if (settings.combatModel === 'hardcore') {
          bounceForce *= 0.8; // Tighter, more dangerous combat
      }

      // Bounce Shield: 100% bounce reflection (attacker gets pushed back more)
      if (!isClash && !isPlayerAttacker! && isSpecialActive(p, 'bounce_shield', now)) {
          bounceForce *= 2.0;
          p.rotationSpeed *= 0.95; // Risk: Lose 5% spin
      }

      // Shockwave: Massive push on next hit
      if (!isClash && isPlayerAttacker! && isSpecialActive(p, 'shockwave', now)) {
          bounceForce += settings.shockwaveForce * C.TILE_SIZE;
      }
      
      p.x -= nx * bounceForce;
      p.y -= ny * bounceForce;
      e.x += nx * bounceForce;
      e.y += ny * bounceForce;

      // STEP 9 — Post-Collision Momentum Loss
      if (isClash) {
          p.speed *= 0.75;
          p.rotationSpeed *= 0.8;
          e.speed *= 0.75;
          e.rotationSpeed *= 0.8;
      } else if (isPlayerAttacker!) {
          if (!isSpecialActive(p, 'momentum_lock', now)) p.speed *= 0.8;
          p.rotationSpeed *= 0.85;
          e.speed *= 0.7;
          e.rotationSpeed *= 0.75;
      } else {
          p.speed *= 0.7;
          p.rotationSpeed *= 0.75;
          e.speed *= 0.8;
          e.rotationSpeed *= 0.85;
      }

      // Visuals
      if (relVelMag > 10 && settings.screenShakeEnabled) {
        // Camera feedback is a punctuation mark, not a second source of motion.
        // The previous cap allowed repeated collisions to make the arena unreadable.
        const rawShake = Math.min(8, relVelMag * 0.18 * settings.screenShakeIntensity);
        const stabilizedShake = rawShake * (1 - settings.screenStabilization / 100);
        setScreenShake(prev => Math.max(prev, stabilizedShake));
        if (relVelMag > 25) {
          setTimeScale(0.3);
          setTimeout(() => setTimeScale(1.0), 200); 
        }
      }
      playCollisionSound(relVelMag);

      // Sparks
      for (let i = 0; i < 12; i++) {
        sparks.push({ 
          x: (p.x + e.x) / 2, 
          y: (p.y + e.y) / 2, 
          radius: isClash ? 4 : 3, 
          life: isClash ? 15 : 10, 
          color: isClash ? '#fbbf24' : (Math.random() > 0.5 ? '#06b6d4' : level.enemy.color) 
        });
      }
    }
  };

  const bounceFrom = (bouncer: TopState, target: TopState) => {
    const dx = bouncer.x - target.x;
    const dy = bouncer.y - target.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0) {
      // Bounce distance = multiplier * top size (in tiles) * TILE_SIZE
      const size = (bouncer.name === player.name ? settings.playerSize : settings.enemySize);
      const bounceDist = settings.bounceDistanceMultiplier * size * C.TILE_SIZE;
      
      bouncer.x += (dx / (dist || 0.001)) * bounceDist;
      bouncer.y += (dy / (dist || 0.001)) * bounceDist;
      
      // Additional instant slowdown from bounce (prevented by shield)
      const now = time / 1000;
      const isShieldActive = bouncer.name === player.name && now - bouncer.boostKeyTimer < settings.shieldDuration;
      if (!isShieldActive) {
        bouncer.speed *= (1 - settings.postCollisionMovementSlow / 100);
      }
    }
  };

  const handleGravityPull = (p: TopState, e: TopState, now: number) => {
    if (now - p.gravityPullTimer < C.GRAVITY_PULL_DURATION_SECONDS) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.hypot(dx, dy);
        const pullRange = C.GRAVITY_PULL_RANGE;
        if (dist > 0 && dist < pullRange) {
            // Magnetic Gravity: Stronger pull when closer (inverse square-ish)
            const proximityFactor = Math.max(0.5, 1 - (dist / pullRange));
            const strength = (Math.abs(settings.gravityStrength) > 0.1 ? settings.gravityStrength * 4 : C.GRAVITY_PULL_STRENGTH * 2) * proximityFactor;
            
            e.x += (dx / dist) * strength;
            e.y += (dy / dist) * strength;
            
            // Magnetic distortion: slight rotation pull
            e.rotationSpeed *= (1 - 0.01 * proximityFactor);
        }
    }
  };

  const borderBounce = (top: TopState) => {
    const bounceDistance = settings.borderBounceDistance * (C.TILE_SIZE / 4);
    const speedReduction = 1 - (settings.borderMovementLoss / 100);
    const radius = (top.name === player.name ? settings.playerSize : settings.enemySize) * C.TILE_SIZE / 2;
    const now = time / 1000;
    const isShieldActive = top.name === player.name && now - top.boostKeyTimer < settings.shieldDuration;

    let hit = false;
    const isBeyond = top.x < 0 || top.x > C.ARENA_WIDTH || top.y < 0 || top.y > C.ARENA_HEIGHT;
    
    if (top.x < radius) {
      top.x = radius + bounceDistance;
      hit = true;
    } else if (top.x > C.ARENA_WIDTH - radius) {
      top.x = C.ARENA_WIDTH - radius - bounceDistance;
      hit = true;
    }

    if (top.y < radius) {
      top.y = radius + bounceDistance;
      hit = true;
    } else if (top.y > C.ARENA_HEIGHT - radius) {
      top.y = C.ARENA_HEIGHT - radius - bounceDistance;
      hit = true;
    }

    const margin = 5; // Small margin to detect being near border
    const isNearBorder = (
      top.x < radius + margin || 
      top.x > C.ARENA_WIDTH - radius - margin || 
      top.y < radius + margin || 
      top.y > C.ARENA_HEIGHT - radius - margin
    );

    const velocity = Math.hypot(top.lastVelocity.x, top.lastVelocity.y);
    const isImmobile = velocity < 0.1;

    if (hit || isNearBorder || isBeyond || isImmobile) {
      top.stuckTime += 1 / 60;
      if (hit && !isShieldActive) {
        top.speed *= speedReduction;
        top.rotationSpeed *= speedReduction;
      }
      // Track border hits for enemy
      if (top.name === level.enemy.name && hit) {
        top.borderHits.push(now);
        top.borderHits = top.borderHits.filter(t => now - t < 2);
        if (top.borderHits.length > 3) {
          top.borderPushTimer = now + 10; // 10 seconds of increased push
        }
      }
    } else {
      top.stuckTime = Math.max(0, top.stuckTime - 1 / 60);
    }
  };

    

  const updateSpin = (top: TopState) => {
    const now = time / 1000;
    let rotation = top.rotationSpeed;
    if (now - top.slowTimer < 3) {
      rotation *= (1 - settings.cloneSlowRotation / 100);
    }
    top.angle = (top.angle + rotation * 8) % 360;
  };

  const now = time / 1000;
  const shieldReady = Math.max(0, player.boostKeyCooldown - now);
  const shieldReadiness = 1 - (shieldReady / settings.shieldCooldown);
  const shieldPercentage = shieldReadiness * 100;
  const isShieldActive = (now - player.boostKeyTimer < settings.shieldDuration) || (now - player.shieldTimer < 3);

  const gravityTimeUntilReady = Math.max(0, player.gravityPullCooldown - now);
  const gravityReadiness = 1 - (gravityTimeUntilReady / C.GRAVITY_PULL_COOLDOWN_SECONDS);
  const gravityCooldownPercentage = gravityReadiness * 100;
  const isGravityPullActive = now - player.gravityPullTimer < C.GRAVITY_PULL_DURATION_SECONDS;

  const isClash = false; // Removed per Single Attacker Law
  const isPlayerAttacker = player.engagementPriority === 'attacker';
  const isEnemyAttacker = enemy.engagementPriority === 'attacker';

  const handleRespawn = (reason?: string, showReport: boolean = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = reason ? `[${timestamp}] ${reason}` : `[${timestamp}] Manual Emergency Respawn triggered.`;
    setSystemLogs(prev => [logEntry, ...prev].slice(0, 5));

    // Generate detailed diagnostic report from flight log
    const history = flightLogRef.current;
    if (history.length > 0 && showReport) {
      const start = history[0];
      const mid = history[Math.floor(history.length / 2)];
      const end = history[history.length - 1];
      
      const report = `
--- FLIGHT RECORDER DIAGNOSTIC ---
TIME: ${timestamp}
REASON: ${reason || 'Manual Trigger'}

[5s AGO]
Player: (${start.player.x}, ${start.player.y}) HP:${start.player.hp} SPD:${start.player.speed}
Enemy: (${start.enemy.x}, ${start.enemy.y}) HP:${start.enemy.hp} SPD:${start.enemy.speed}

[2.5s AGO]
Player: (${mid.player.x}, ${mid.player.y}) HP:${mid.player.hp} SPD:${mid.player.speed}
Enemy: (${mid.enemy.x}, ${mid.enemy.y}) HP:${mid.enemy.hp} SPD:${mid.enemy.speed}

[AT MOMENT OF ERROR]
Player: (${end.player.x}, ${end.player.y}) HP:${end.player.hp} SPD:${end.player.speed} STUCK:${end.player.stuckTime}s
Enemy: (${end.enemy.x}, ${end.enemy.y}) HP:${end.enemy.hp} SPD:${end.enemy.speed} STUCK:${end.enemy.stuckTime}s
World: Clones:${end.clonesCount} Sparks:${end.activeSparks} Tiles:${end.activeTiles}

--- ANALYSIS ---
WHY IT HAPPENED: 
This error usually occurs due to "Division by Zero" in the physics engine. When two objects occupy the exact same coordinate (0 distance), the math used to calculate their push-away force fails, resulting in NaN (Not a Number).

HOW TO PREVENT IT:
1. Avoid high-speed head-on collisions at the exact center of the arena.
2. Use the 'Emergency Respawn' if you feel your top is clipping into the border.
3. The system has now been upgraded with 'Safety Nudges' and 'Zero-Guard Divisors' to automatically push overlapping entities apart.
      `.trim();
      
      console.log(report);
      setDiagnosticReport(report);
      setIsPaused(true);
    }

    setPlayer(p => ({ 
      ...p, 
      x: C.ARENA_WIDTH / 4, 
      y: C.ARENA_HEIGHT / 2, 
      stuckTime: 0,
      speed: settings.playerBaseSpeed,
      rotationSpeed: settings.playerBaseRotation
    }));
    setEnemy(e => ({ 
      ...e, 
      x: (C.ARENA_WIDTH / 4) * 3, 
      y: C.ARENA_HEIGHT / 2, 
      stuckTime: 0,
      speed: level.enemy.baseSpeed,
      rotationSpeed: level.enemy.baseRotation
    }));
    if (reason) {
      setRespawnMessage(reason);
      setTimeout(() => setRespawnMessage(null), 6000);
    }
  };

  const getOutlineColor = (top: TopState) => {
    const now = time / 1000;
    const inCommit = now - top.commitTimer < 0.4;
    if (top.engagementPriority === 'attacker') return '#ef4444'; // Red
    if (top.engagementPriority === 'defender') return '#3b82f6'; // Blue
    if (top.intent === 'attack' || inCommit) return '#ef4444'; // Red
    return '#3b82f6'; // Blue (Defensive)
  };

  const enemyAuraColor = {
    hunt: '#FF5050',
    evade: '#00C8FF',
    boost_hunt: '#FFFF00',
    idle: '#94a3b8',
  }[enemy.mode];

  // Combat Analysis Calculations
  const dx = enemy.x - player.x;
  const dy = enemy.y - player.y;
  const dist = Math.hypot(dx, dy);
  const pToE = { x: dx / (dist || 1), y: dy / (dist || 1) };
  const eToP = { x: -dx / (dist || 1), y: -dy / (dist || 1) };

  const pInCommit = now - player.commitTimer < 0.4;
  const eInCommit = now - enemy.commitTimer < 0.4;
  const pIntentBonus = (player.intent === 'attack' || pInCommit) ? 1.05 : 1.0;
  const eIntentBonus = (enemy.intent === 'attack' || eInCommit) ? 1.05 : 1.0;

  const gravityModifier = 1 + (Math.sqrt(settings.arenaGravityMultiplier) * 0.05);
  const pBaseSpinDmg = player.rotationSpeed * settings.spinWeight;
  const eBaseSpinDmg = enemy.rotationSpeed * settings.spinWeight;
  
  const pStabilityEff = 1 - (player.stability / settings.maxStability) * settings.stabilityAbsorption;
  const eStabilityEff = 1 - (enemy.stability / settings.maxStability) * settings.stabilityAbsorption;

  // Potential damage assumes a strong head-on hit (1.75x modifier)
  const pPotentialDmg = pBaseSpinDmg * 1.75 * gravityModifier * eStabilityEff;
  const ePotentialDmg = eBaseSpinDmg * 1.75 * gravityModifier * pStabilityEff;

  const pForward = Math.max(0, (player.lastVelocity.x * pToE.x + player.lastVelocity.y * pToE.y)) * pIntentBonus;
  const eForward = Math.max(0, (enemy.lastVelocity.x * eToP.x + enemy.lastVelocity.y * eToP.y)) * eIntentBonus;

  const totalForward = pForward + eForward;
  const pWinProb = totalForward > 0.1 ? (pForward / totalForward) * 100 : 50;
  const eWinProb = totalForward > 0.1 ? (eForward / totalForward) * 100 : 50;

  return (
    <div 
      className="relative border-4 border-slate-700 rounded-2xl overflow-hidden shadow-2xl" 
      style={{ 
        backgroundColor: level.arenaColor,
        transform: screenShake > 0 ? `translate(${(Math.random() - 0.5) * screenShake}px, ${(Math.random() - 0.5) * screenShake}px)` : 'none'
      }}
    >
      {/* Respawn Message */}
      {respawnMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-2xl border border-red-400 animate-in fade-in slide-in-from-top-4">
          {respawnMessage}
        </div>
      )}

      {/* Diagnostic Report Overlay */}
      {diagnosticReport && (
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/95 border-2 border-cyan-500 p-6 rounded-2xl font-mono text-xs max-w-xl shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-cyan-500/30 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                <span className="text-cyan-400 font-black uppercase tracking-widest text-sm">Black Box Data Recovery</span>
              </div>
              <button 
                onClick={() => {
                  setDiagnosticReport(null);
                  setIsPaused(false);
                }}
                className="text-slate-400 hover:text-white px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors font-bold text-[10px]"
              >
                RESUME BATTLE
              </button>
            </div>
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <pre className="whitespace-pre-wrap text-emerald-400 leading-relaxed font-medium">
                {diagnosticReport}
              </pre>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-[10px] text-slate-500 italic">
                * Capturing 5s window leading to incident
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(diagnosticReport);
                  setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] Diagnostic report copied to clipboard.`, ...prev].slice(0, 5));
                }}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Check Overlay */}
      {!isSystemCheckComplete && (
        <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full space-y-8 text-center"
          >
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">System Readiness</h2>
              <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Initializing Combat Engine v1.5.0</p>
            </div>

            <div className="space-y-4">
              {[
                "Calibrating Physics Engine...",
                "Validating Combat Laws...",
                "Initializing Radii System...",
                "Syncing AI Combat Logic...",
                "Engine Ready for Battle!"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4 text-left">
                  <div className={`w-2 h-2 rounded-full ${systemCheckStep > i ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : systemCheckStep === i ? 'bg-emerald-500 animate-pulse' : 'bg-slate-800'}`} />
                  <span className={`text-sm font-bold uppercase tracking-wide transition-colors ${systemCheckStep >= i ? 'text-white' : 'text-slate-700'}`}>
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(systemCheckStep / 5) * 100}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Combat Rules Modal */}
      <CombatRules isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Pause & Emergency Respawn Option */}
      {!winner && !diagnosticReport && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 z-40 flex flex-col gap-2">
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={onBack}
            className="p-4 rounded-xl bg-slate-900 text-red-400 hover:text-red-300 font-black uppercase tracking-widest shadow-2xl transition-all border border-red-500/30"
          >
            Hangar
          </motion.button>
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setShowRules(true)}
            className="p-4 rounded-xl bg-slate-800 text-slate-400 hover:text-white font-black uppercase tracking-widest shadow-2xl transition-all"
          >
            Rules
          </motion.button>
          <motion.button
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setIsPaused(prev => !prev)}
            className={`p-4 rounded-xl font-black uppercase tracking-widest shadow-2xl transition-all ${isPaused ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </motion.button>
          {(player.stuckTime > 1.5 || enemy.stuckTime > 1.5 || isPaused) && (
            <motion.button
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              onClick={() => handleRespawn()}
              className="p-4 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl shadow-2xl uppercase tracking-widest flex flex-col items-center gap-1"
            >
              <span className="text-xs">Respawn</span>
              <span className="text-[8px] opacity-70">Emergency</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Imported action bar: makes each equipped special obvious and clickable,
          while retaining Space and Shift shortcuts for keyboard play. */}
      {isSystemCheckComplete && !winner && !diagnosticReport && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-slate-950/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto">
          {[0, 1].map(i => {
            const specId = player.activeSpecialIds[i];
            const spec = C.PLAYER_SPECIALS.find(s => s.id === specId);
            const cooldownRemaining = Math.max(0, (player.specialCooldowns[i] || 0) - now);
            const cooldownPercent = spec ? Math.min(100, (cooldownRemaining / spec.cooldown) * 100) : 0;
            const hotkey = i === 0 ? 'SPACE' : 'SHIFT';
            const isReady = Boolean(spec) && cooldownRemaining <= 0.05;

            return (
              <button
                key={i}
                type="button"
                onClick={() => activateSpecial(i)}
                disabled={!isReady}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all text-left ${
                  isReady
                    ? 'bg-gradient-to-r from-cyan-950/90 to-slate-900 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.45)] hover:scale-105 active:scale-95'
                    : 'bg-slate-900/60 border-slate-800 opacity-70 cursor-not-allowed'
                }`}
              >
                <span className={`min-w-[52px] px-2 py-1 rounded-lg border font-mono font-black text-center ${isReady ? 'bg-cyan-400 text-slate-950 border-cyan-200' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  <span className="block text-[11px] leading-none">[{hotkey}]</span>
                  <span className="block text-[7px] mt-1">{isReady ? 'READY' : `${cooldownRemaining.toFixed(1)}s`}</span>
                </span>
                <span className="flex flex-col pr-1">
                  <span className="text-xs font-black uppercase text-white">{spec?.name ?? `Slot ${i + 1}`}</span>
                  <span className="text-[9px] font-bold text-slate-400">{isReady ? 'Click or press key' : (spec?.category ?? 'No special equipped')}</span>
                  <span className="mt-1 w-28 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <span className={`block h-full ${isReady ? 'bg-cyan-400' : 'bg-slate-600'}`} style={{ width: `${100 - cooldownPercent}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* HUD */}
      <div 
        className="absolute top-4 left-6 right-6 flex justify-between z-10 pointer-events-none transition-opacity duration-300"
        style={{ opacity: 1 }} // The individual parts will have their own opacity
      >
        <div className="w-64 space-y-2" style={{ opacity: isNaN(playerHudOpacity) ? 1 : playerHudOpacity }}>
          <div className="flex justify-between items-end mb-1">
            <div className="flex flex-col">
              <span className="text-xs font-black text-cyan-400 uppercase tracking-tighter">Player System</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                Eff. HP: {Math.ceil(player.hp + player.stability * settings.stabilityAbsorption)}
              </span>
            </div>
            <span className="text-xl font-black text-white">{Math.ceil(player.hp)}</span>
          </div>
          {player.stuckTime > 0.5 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-black text-red-500 animate-pulse mb-1"
            >
              ⚠️ SYSTEM STUCK - CLEAR BORDER
            </motion.div>
          )}
          <div className="h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" 
              initial={{ width: '100%' }}
              animate={{ width: `${(player.hp / settings.playerHp) * 100}%` }}
            />
          </div>
          
          {/* Combat Calculator - Player */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-2 mt-2 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Combat Analysis</span>
              <span className={`text-[10px] font-black ${pWinProb > 60 ? 'text-emerald-400' : pWinProb < 40 ? 'text-red-400' : 'text-yellow-400'}`}>
                {pWinProb.toFixed(0)}% WIN CHANCE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col">
                <span className="text-[8px] text-slate-600 uppercase font-bold">Potential DMG</span>
                <span className="text-sm font-black text-cyan-400">{pPotentialDmg.toFixed(1)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] text-slate-600 uppercase font-bold">Stability (DEF)</span>
                <span className="text-sm font-black text-slate-300">{player.stability.toFixed(0)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {[0, 1].map(i => {
              const specId = player.activeSpecialIds[i];
              const spec = C.PLAYER_SPECIALS.find(s => s.id === specId);
              const cooldownRemaining = Math.max(0, player.specialCooldowns[i] - now);
              const cooldownPercent = spec ? (cooldownRemaining / spec.cooldown) * 100 : 0;

              return (
                <div key={i} className="flex-1 space-y-1">
                  <div className="flex justify-between text-[8px] font-bold text-slate-600 uppercase">
                    <span>{spec ? spec.name : `Slot ${i+1}`}</span>
                    <span className={cooldownRemaining > 0 ? "text-slate-500" : "text-cyan-400 animate-pulse"}>
                      {cooldownRemaining > 0 ? `${cooldownRemaining.toFixed(1)}s` : "READY"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${cooldownRemaining > 0 ? 'bg-slate-700' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`} 
                      style={{ width: `${100 - cooldownPercent}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Momentum Meters */}
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Movement</span>
              <span className="text-emerald-400">{player.speed.toFixed(1)}</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(player.speed / settings.playerMaxSpeed) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span>Rotation</span>
              <span className="text-orange-400">{player.rotationSpeed.toFixed(1)}</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(player.rotationSpeed / settings.playerMaxRotation) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Center Controls */}
          <div className="flex flex-col items-center gap-2" style={{ opacity: isNaN(Math.max(playerHudOpacity, enemyHudOpacity)) ? 1 : Math.max(playerHudOpacity, enemyHudOpacity) }}>
            <button 
              onClick={() => setShowRadii(!showRadii)}
              className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all border ${
                showRadii ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              Radii: {showRadii ? 'ON' : 'OFF'}
            </button>

            {/* Vibration Monitor */}
            {settings.showVibrationMonitor && (
              <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800 rounded-lg p-2 w-48 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Vibration Monitor</span>
                  <span className={`text-[10px] font-black ${screenShake > 6 ? 'text-red-400' : screenShake > 3 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                    {screenShake.toFixed(2)} PX
                  </span>
                </div>
                <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${screenShake > 6 ? 'bg-red-500' : screenShake > 3 ? 'bg-yellow-500' : 'bg-cyan-500'}`}
                    animate={{ width: `${Math.min(100, (screenShake / 8) * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                </div>
                <div className="flex justify-between text-[6px] text-slate-600 font-bold uppercase">
                  <span>Stable</span>
                  <span>Critical</span>
                </div>
              </div>
            )}
            
            {/* System Logs */}
            {(systemLogs.length > 0 || diagnosticReport) && (
              <div className="bg-slate-950/60 backdrop-blur-md border border-slate-800 rounded-lg p-2 w-48 max-h-32 overflow-y-auto pointer-events-auto">
                <div className="flex justify-between items-center mb-1 border-b border-slate-800 pb-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase">Impact Feed</span>
                  {diagnosticReport && (
                    <button 
                      onClick={() => setDiagnosticReport(diagnosticReport)}
                      className="text-[7px] font-bold text-cyan-500 hover:text-cyan-400 uppercase flex items-center gap-1"
                    >
                      <div className="w-1 h-1 bg-cyan-500 rounded-full animate-pulse" />
                      View Box
                    </button>
                  )}
                </div>
                {systemLogs.length > 0 ? (
                  systemLogs.map((log, i) => (
                    <div key={i} className={`text-[7px] font-mono leading-tight mb-1 last:mb-0 ${log.includes('CRITICAL') ? 'text-red-400' : log.includes('STUCK') ? 'text-yellow-400' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-[7px] text-slate-600 italic">Standby...</div>
                )}
              </div>
            )}
          </div>

        <div className="w-64 space-y-2 text-right" style={{ opacity: isNaN(enemyHudOpacity) ? 1 : enemyHudOpacity }}>
          <div className="flex justify-between items-end mb-1 flex-row-reverse">
            <div className="flex flex-col text-right">
              <span className="text-xs font-black text-red-500 uppercase tracking-tighter">Enemy System</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                Eff. HP: {Math.ceil(enemy.hp + enemy.stability * settings.stabilityAbsorption)}
              </span>
            </div>
            <span className="text-xl font-black text-white">{Math.ceil(enemy.hp)}</span>
          </div>
          <div className="h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-l from-red-600 to-red-400" 
              initial={{ width: '100%' }}
              animate={{ width: `${(enemy.hp / settings.enemyHp) * 100}%` }}
            />
          </div>

          {/* Combat Calculator - Enemy */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-2 mt-2 flex flex-col gap-1">
            <div className="flex justify-between items-center flex-row-reverse">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Combat Analysis</span>
              <span className={`text-[10px] font-black ${eWinProb > 60 ? 'text-emerald-400' : eWinProb < 40 ? 'text-red-400' : 'text-yellow-400'}`}>
                {eWinProb.toFixed(0)}% WIN CHANCE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col text-left">
                <span className="text-[8px] text-slate-600 uppercase font-bold">Stability (DEF)</span>
                <span className="text-sm font-black text-slate-300">{enemy.stability.toFixed(0)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] text-slate-600 uppercase font-bold">Potential DMG</span>
                <span className="text-sm font-black text-red-400">{ePotentialDmg.toFixed(1)}</span>
              </div>
            </div>
          </div>
          
          {/* Boss Intel */}
          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-lg p-2 mt-2 flex flex-col gap-1 text-right">
            <div className="text-[9px] font-bold text-red-500 uppercase mb-1">Boss Intel: {level.enemy.name}</div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Passive</span>
                <span className="text-[9px] text-slate-300 leading-tight">{level.enemy.passiveDesc}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Active</span>
                <span className="text-[9px] text-slate-300 leading-tight">{level.enemy.activeDesc}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-500 uppercase font-black">Reactive</span>
                <span className="text-[9px] text-slate-300 leading-tight">{level.enemy.reactiveDesc}</span>
              </div>
            </div>
          </div>
          
          {/* Momentum Meters */}
          <div className="space-y-1 mt-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase flex-row-reverse">
              <span>Movement</span>
              <span className="text-emerald-400">{enemy.speed.toFixed(1)}</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 float-right" style={{ width: `${(enemy.speed / settings.enemyMaxSpeed) * 100}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase flex-row-reverse">
              <span>Rotation</span>
              <span className="text-orange-400">{enemy.rotationSpeed.toFixed(1)}</span>
            </div>
            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 float-right" style={{ width: `${(enemy.rotationSpeed / settings.enemyMaxRotation) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center z-30 animate-in fade-in duration-500">
          <motion.h2 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black mb-2 text-white italic tracking-tighter"
          >
            {winner}
          </motion.h2>
          
          {winner === "Player Wins" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-cyan-400 font-bold mb-8 flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              BATTLE COMPLETE
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mb-6 rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4"
          >
            <div className="mb-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-cyan-300">
              <span>Last Battle Playback</span><span>{battleEvents.length} key moments</span>
            </div>
            <div className="space-y-2">
              {battleEvents.length ? battleEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.16 }}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold ${event.kind === 'special' ? 'bg-cyan-500/15 text-cyan-200' : event.kind === 'projectile' ? 'bg-violet-500/15 text-violet-200' : event.kind === 'clash' ? 'bg-amber-500/15 text-amber-200' : 'bg-white/5 text-slate-200'}`}
                >
                  <span>{event.label}</span><span className="ml-3 shrink-0 text-[10px] text-slate-500">{event.time.toFixed(1)}s</span>
                </motion.div>
              )) : <p className="text-xs text-slate-500">No major events were recorded.</p>}
            </div>
          </motion.div>

          <div className="flex gap-4">
            <button 
              onClick={onBack}
              className="px-8 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-widest"
            >
              Hangar
            </button>
            {winner === "Player Wins" && (
              <button 
                onClick={() => onWin(level.id)}
                className="px-12 py-4 bg-cyan-500 text-white font-black rounded-2xl hover:bg-cyan-400 transition-all shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 uppercase tracking-widest"
              >
                Next Level
              </button>
            )}
          </div>
        </div>
      )}

      <Stage width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT}>
        <Layer x={camera.x} y={camera.y} scaleX={camera.scale} scaleY={camera.scale}>
          {/* Arena Floor */}
          <Rect 
            x={0} 
            y={0} 
            width={C.ARENA_WIDTH} 
            height={C.ARENA_HEIGHT} 
            fill="#020617" 
            listening={false}
          />

          {/* Grid Lines (30x30) */}
          {(() => {
            const gridLines = [];
            for (let x = 0; x <= C.ARENA_WIDTH; x += 30) {
              gridLines.push(
                <Line 
                  key={`v${x}`} 
                  points={[x, 0, x, C.ARENA_HEIGHT]} 
                  stroke="#1e293b" 
                  strokeWidth={1} 
                  opacity={0.1} 
                />
              );
            }
            for (let y = 0; y <= C.ARENA_HEIGHT; y += 30) {
              gridLines.push(
                <Line 
                  key={`h${y}`} 
                  points={[0, y, C.ARENA_WIDTH, y]} 
                  stroke="#1e293b" 
                  strokeWidth={1} 
                  opacity={0.1} 
                />
              );
            }
            return gridLines;
          })()}

          {/* Arena Edge Glow */}
          <Rect 
            x={0} 
            y={0} 
            width={C.ARENA_WIDTH} 
            height={C.ARENA_HEIGHT} 
            stroke="#1e293b" 
            strokeWidth={4} 
            listening={false}
            opacity={0.8}
          />
          
          {/* Dynamic Edge Glow (Brighter when tops are near) */}
          {(() => {
            const getEdgeDist = (x: number, y: number) => {
              return Math.min(x, C.ARENA_WIDTH - x, y, C.ARENA_HEIGHT - y);
            };
            const pDist = getEdgeDist(player.x, player.y);
            const eDist = getEdgeDist(enemy.x, enemy.y);
            const minDist = Math.min(pDist, eDist);
            
            if (minDist < 150) {
              const intensity = Math.max(0, 1 - minDist / 150);
              return (
                <Rect 
                  x={0} 
                  y={0} 
                  width={C.ARENA_WIDTH} 
                  height={C.ARENA_HEIGHT} 
                  stroke={minDist === pDist ? "#06b6d4" : level.enemy.color} 
                  strokeWidth={10 * intensity} 
                  listening={false}
                  shadowColor={minDist === pDist ? "#06b6d4" : level.enemy.color}
                  shadowBlur={30 * intensity}
                  opacity={0.6 * intensity}
                />
              );
            }
            return null;
          })()}

          {/* Arena Gravity Field */}
          {arenaGravityActive && (
            <Group x={C.ARENA_WIDTH / 2} y={C.ARENA_HEIGHT / 2}>
              <Circle 
                radius={C.ARENA_GRAVITY_RADIUS} 
                stroke="#a855f7" 
                strokeWidth={2} 
                dash={[10, 10]} 
                opacity={0.3}
              />
              <Circle 
                radius={C.ARENA_GRAVITY_RADIUS} 
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndRadius={C.ARENA_GRAVITY_RADIUS}
                fillRadialGradientColorStops={[0, 'transparent', 1, '#a855f7']}
                opacity={0.1}
              />
              <Text 
                text={`GRAVITY FIELD ACTIVE - X${settings.arenaGravityMultiplier} POWER`} 
                fontSize={10} 
                fontStyle="900" 
                fill="#a855f7" 
                y={-C.ARENA_GRAVITY_RADIUS - 15} 
                x={-80}
                align="center"
              />
            </Group>
          )}

          {/* Boost Tiles */}
          {boostTiles.map((tile, i) => {
            if (!tile.isActive) return null;
            
            const getTileColor = (type: import('../types').BoostTileType) => {
              switch (type) {
                case 'base': return '#06b6d4'; // Cyan
                case 'speed': return '#22c55e'; // Green
                case 'stability': return '#eab308'; // Gold
                case 'efficiency': return '#a855f7'; // Purple
                case 'overcharge': return '#ef4444'; // Red
                case 'vampiric': return '#f43f5e'; // Rose
                case 'gravity_surge': return '#6366f1'; // Indigo
                case 'shield_recharge': return '#10b981'; // Emerald
                default: return '#fbbf24';
              }
            };
            
            const color = getTileColor(tile.type);
            const pulseScale = 1 + Math.sin(time / 200) * 0.15;
            
            return (
              <Group key={i} x={tile.x * C.TILE_SIZE} y={tile.y * C.TILE_SIZE}>
                {/* Glow effect */}
                <Circle 
                  x={C.TILE_SIZE/2} 
                  y={C.TILE_SIZE/2} 
                  radius={C.TILE_SIZE/2 * pulseScale} 
                  fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                  fillRadialGradientEndRadius={C.TILE_SIZE/2 * pulseScale}
                  fillRadialGradientColorStops={[0, color, 1, 'transparent']}
                  opacity={0.3}
                />
                {/* Base background */}
                <Rect 
                  width={C.TILE_SIZE} 
                  height={C.TILE_SIZE} 
                  fill={color} 
                  opacity={0.15} 
                  cornerRadius={4} 
                />
                {/* Core pulse */}
                <Circle 
                  x={C.TILE_SIZE/2} 
                  y={C.TILE_SIZE/2} 
                  radius={C.TILE_SIZE/4 * pulseScale} 
                  fill={color} 
                  shadowBlur={15} 
                  shadowColor={color} 
                />
                {/* Type indicator (small dot) */}
                <Circle 
                  x={C.TILE_SIZE/2} 
                  y={C.TILE_SIZE/2} 
                  radius={2} 
                  fill="white" 
                  opacity={0.8}
                />
              </Group>
            );
          })}

          {/* Debug Radii */}
          {showRadii && (
            <>
              <Circle x={player.x} y={player.y} radius={settings.pushRadius * C.TILE_SIZE} stroke="#06b6d4" strokeWidth={1} dash={[5, 5]} opacity={0.3} />
              <Circle x={enemy.x} y={enemy.y} radius={level.enemy.huntRadiusMultiplier * settings.enemySize * C.TILE_SIZE} stroke={level.enemy.color} strokeWidth={1} dash={[5, 5]} opacity={0.2} />
              <Circle x={enemy.x} y={enemy.y} radius={level.enemy.evadeRadiusMultiplier * settings.enemySize * C.TILE_SIZE} stroke="#00C8FF" strokeWidth={1} dash={[5, 5]} opacity={0.1} />
              <Circle x={player.x} y={player.y} radius={settings.gravityRadius * C.TILE_SIZE} stroke="#a855f7" strokeWidth={1} dash={[5, 5]} opacity={0.2} />
            </>
          )}

          {/* Clones */}
          {clones.map(clone => (
            <Group key={clone.id} x={clone.x} y={clone.y} opacity={0.6}>
              <Circle radius={settings.enemySize * C.TILE_SIZE / 2} fill={level.enemy.color} stroke="#7f1d1d" strokeWidth={2} />
              <Line points={[0, 0, 10, 0]} stroke="white" strokeWidth={2} rotation={clone.angle} />
            </Group>
          ))}

          {/* Player Afterimages */}
          {playerAfterimages.map(ghost => (
            <Group key={ghost.id} x={ghost.x} y={ghost.y} rotation={ghost.angle}>
              <Circle radius={settings.playerSize * C.TILE_SIZE / 2} fill="#06b6d4" opacity={ghost.opacity * 0.5} />
            </Group>
          ))}

          {/* Enemy Ghosts (Phantom Passive) */}
          {enemyGhosts.map(ghost => (
            <Group key={ghost.id} x={ghost.x} y={ghost.y} opacity={ghost.opacity}>
              <Circle radius={settings.enemySize * C.TILE_SIZE / 2} fill={level.enemy.color} opacity={0.3} />
              <Line points={[0, 0, 10, 0]} stroke="white" strokeWidth={2} rotation={ghost.angle} opacity={0.3} />
            </Group>
          ))}

          {/* Projectiles (Sniper Passive) */}
          {projectiles.map(proj => (
            <Circle 
              key={proj.id} 
              x={proj.x} 
              y={proj.y} 
              radius={4} 
              fill={level.enemy.color} 
              shadowBlur={10} 
              shadowColor={level.enemy.color} 
            />
          ))}

          {/* Player */}
          <Group x={player.x} y={player.y} opacity={isSpecialActive(player, 'cloak_pulse', now) ? 0.3 : 1}>
            {/* Soft Shadow */}
            <Circle 
              radius={settings.playerSize * C.TILE_SIZE / 2 + 5} 
              fill="black" 
              opacity={0.4} 
              y={12} 
              scaleY={0.4}
              listening={false}
            />

            {/* Trail */}
            {player.history.map((pos, i) => (
              <Circle 
                key={i} 
                x={pos.x - player.x} 
                y={pos.y - player.y} 
                radius={(settings.playerSize * C.TILE_SIZE / 2) * (1 - i / 10)} 
                fill="#06b6d4" 
                opacity={0.15 * (1 - i / 10)} 
                listening={false}
              />
            ))}

            {/* Directional Motion Streaks */}
            {(() => {
              const speed = Math.hypot(player.lastVelocity.x, player.lastVelocity.y);
              if (speed > 40) {
                const streakLength = speed * 0.8;
                const angle = Math.atan2(player.lastVelocity.y, player.lastVelocity.x);
                return (
                  <Line 
                    points={[0, 0, -Math.cos(angle) * streakLength, -Math.sin(angle) * streakLength]}
                    stroke="#06b6d4"
                    strokeWidth={8}
                    opacity={0.4}
                    lineCap="round"
                    listening={false}
                  />
                );
              }
              return null;
            })()}

            {/* Forward Arrow Indicator */}
            {(() => {
              const speed = Math.hypot(player.lastVelocity.x, player.lastVelocity.y);
              const angle = Math.atan2(player.lastVelocity.y, player.lastVelocity.x) * (180 / Math.PI);
              return (
                <Group rotation={angle} x={settings.playerSize * C.TILE_SIZE / 2 + 15} opacity={Math.min(0.8, speed / 100)}>
                  <Line 
                    points={[0, -6, 12, 0, 0, 6]}
                    fill="#06b6d4"
                    closed
                    shadowColor="#06b6d4"
                    shadowBlur={5}
                  />
                </Group>
              );
            })()}

            {/* Rotation Ring Animation */}
            <Circle 
              radius={settings.playerSize * C.TILE_SIZE / 2 + 10} 
              stroke="#06b6d4" 
              strokeWidth={3} 
              dash={[15, 10]} 
              rotation={time * player.rotationSpeed * 3} 
              opacity={0.5}
              listening={false}
            />

            {/* Player Aura */}
            <Circle 
              radius={settings.playerSize * C.TILE_SIZE / 2 + 20} 
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={settings.playerSize * C.TILE_SIZE / 2 + 20}
              fillRadialGradientColorStops={[0, 'transparent', 0.7, 'transparent', 1, '#06b6d4']}
              opacity={0.4}
              listening={false}
            />

            <Circle 
              radius={settings.playerSize * C.TILE_SIZE / 2 + 5} 
              stroke={getOutlineColor(player)} 
              strokeWidth={3} 
              opacity={0.8}
              shadowColor={now - player.commitTimer < 0.4 ? "#06b6d4" : "transparent"}
              shadowBlur={now - player.commitTimer < 0.4 ? 20 : 0}
            />
            {isGravityPullActive && <Aura radius={settings.gravityRadius * C.TILE_SIZE} color="#a855f7" />}
            {isShieldActive && <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 10} stroke="#06b6d4" strokeWidth={4} opacity={0.5} shadowBlur={20} shadowColor="#06b6d4" />}
            
            {/* Attacker Status */}
            {isPlayerAttacker && (
              <Group>
                <Text 
                  text="ATTACKER"
                  fontSize={12}
                  fontStyle="900"
                  fill="#06b6d4"
                  x={-30}
                  y={-settings.playerSize * C.TILE_SIZE / 2 - 25}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                  opacity={0.8 + Math.sin(time / 100) * 0.2}
                />
              </Group>
            )}
            {isClash && (
              <Text 
                text="CLASH"
                fontSize={12}
                fontStyle="900"
                fill="#ffffff"
                x={-20}
                y={-settings.playerSize * C.TILE_SIZE / 2 - 25}
                align="center"
                shadowColor="black"
                shadowBlur={4}
              />
            )}

            {/* Player Special Indicators */}
            {isShieldActive && (
              <Group>
                <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 10} stroke="#22d3ee" strokeWidth={3} opacity={0.6} />
                <Text 
                  text="SHIELD ACTIVE"
                  fontSize={10}
                  fontStyle="900"
                  fill="#22d3ee"
                  x={-35}
                  y={-settings.playerSize * C.TILE_SIZE / 2 - 45}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                />
              </Group>
            )}
            {isGravityPullActive && (
              <Group>
                <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 15} stroke="#a855f7" strokeWidth={2} opacity={0.4} dash={[5, 5]} />
                <Text 
                  text="GRAVITY PULL"
                  fontSize={10}
                  fontStyle="900"
                  fill="#a855f7"
                  x={-35}
                  y={-settings.playerSize * C.TILE_SIZE / 2 - 55}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                />
              </Group>
            )}

            {/* Radii Warning Effects */}
            {playerStatus.inHunt && !isShieldActive && (
              <Group>
                <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 15} stroke={level.enemy.color} strokeWidth={2} opacity={0.4} />
                <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 18} stroke={level.enemy.color} strokeWidth={1} opacity={0.2} dash={[2, 2]} />
                <Text 
                  text={`HUNTED: ${level.enemy.special.replace('_', ' ').toUpperCase()}`}
                  fontSize={10}
                  fontStyle="900"
                  fill="#ffffff"
                  x={-40}
                  y={-settings.playerSize * C.TILE_SIZE / 2 - 30}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                />
              </Group>
            )}
            {playerStatus.inEvade && (
              <Group>
                <Circle radius={settings.playerSize * C.TILE_SIZE / 2 + 20} stroke="#00C8FF" strokeWidth={1} opacity={0.2} dash={[2, 2]} />
                {!playerStatus.inHunt && (
                  <Text 
                    text="EVADING"
                    fontSize={10}
                    fontStyle="900"
                    fill="#00C8FF"
                    x={-20}
                    y={-settings.playerSize * C.TILE_SIZE / 2 - 30}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
              </Group>
            )}
            
            {/* Spin Blur Effect */}
            <Circle 
              radius={settings.playerSize * C.TILE_SIZE / 2 + 5} 
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={settings.playerSize * C.TILE_SIZE / 2 + 5}
              fillRadialGradientColorStops={[0, 'transparent', 1, '#06b6d4']}
              opacity={Math.min(0.5, player.rotationSpeed / 20)}
            />

            <Circle radius={settings.playerSize * C.TILE_SIZE / 2} fill="#06b6d4" stroke="#083344" strokeWidth={3} shadowBlur={15} shadowColor="#06b6d4" />
            <Line points={[0, 0, settings.playerSize * C.TILE_SIZE / 2, 0]} stroke="white" strokeWidth={3} rotation={player.angle} lineCap="round" />
          </Group>

          {/* Enemy */}
          <Group x={enemy.x} y={enemy.y} opacity={now - enemy.boostKeyTimer < settings.enemySpecialDuration && level.enemy.special === 'phantom' ? 0.1 : 1}>
            {/* Telegraphing Indicator */}
            {enemy.isTelegraphing && (
              <Group>
                <Circle 
                  radius={settings.enemySize * C.TILE_SIZE / 2 + 30} 
                  stroke={level.enemy.color} 
                  strokeWidth={2} 
                  opacity={0.5 + Math.sin(time * 20) * 0.5} 
                  dash={[5, 5]} 
                  rotation={time * 500}
                />
                <Text 
                  text="!"
                  fontSize={40}
                  fontStyle="900"
                  fill={level.enemy.color}
                  x={-10}
                  y={-settings.enemySize * C.TILE_SIZE / 2 - 60}
                  shadowColor="black"
                  shadowBlur={10}
                  opacity={0.8 + Math.sin(time * 30) * 0.2}
                />
              </Group>
            )}
            {/* Soft Shadow */}
            <Circle 
              radius={settings.enemySize * C.TILE_SIZE / 2 + 5} 
              fill="black" 
              opacity={0.4} 
              y={12} 
              scaleY={0.4}
              listening={false}
            />

            {/* Distortion Ripple for Phantom Invisibility */}
            {now - enemy.boostKeyTimer < settings.enemySpecialDuration && level.enemy.special === 'phantom' && (
              <Circle 
                radius={settings.enemySize * C.TILE_SIZE / 2 + 5} 
                stroke="white" 
                strokeWidth={1} 
                opacity={0.3} 
                dash={[2, 2]} 
                rotation={time * 0.1}
                listening={false}
              />
            )}
            
            {/* Growth Mode for Juggernaut */}
            {now - enemy.boostKeyTimer < settings.enemySpecialDuration && level.enemy.special === 'juggernaut' && (
              <Circle 
                radius={1.5 * C.TILE_SIZE / 2 + 5} 
                stroke={level.enemy.color} 
                strokeWidth={4} 
                opacity={0.6} 
                shadowBlur={20} 
                shadowColor={level.enemy.color} 
                listening={false}
              />
            )}
            
            {/* Trail */}
            {enemy.history.map((pos, i) => (
              <Circle 
                key={i} 
                x={pos.x - enemy.x} 
                y={pos.y - enemy.y} 
                radius={(settings.enemySize * C.TILE_SIZE / 2) * (1 - i / 10)} 
                fill={level.enemy.color} 
                opacity={0.15 * (1 - i / 10)} 
                listening={false}
              />
            ))}

            {/* Directional Motion Streaks */}
            {(() => {
              const speed = Math.hypot(enemy.lastVelocity.x, enemy.lastVelocity.y);
              if (speed > 40) {
                const streakLength = speed * 0.8;
                const angle = Math.atan2(enemy.lastVelocity.y, enemy.lastVelocity.x);
                return (
                  <Line 
                    points={[0, 0, -Math.cos(angle) * streakLength, -Math.sin(angle) * streakLength]}
                    stroke={level.enemy.color}
                    strokeWidth={8}
                    opacity={0.4}
                    lineCap="round"
                    listening={false}
                  />
                );
              }
              return null;
            })()}

            {/* Forward Arrow Indicator */}
            {(() => {
              const speed = Math.hypot(enemy.lastVelocity.x, enemy.lastVelocity.y);
              const angle = Math.atan2(enemy.lastVelocity.y, enemy.lastVelocity.x) * (180 / Math.PI);
              return (
                <Group rotation={angle} x={settings.enemySize * C.TILE_SIZE / 2 + 15} opacity={Math.min(0.8, speed / 100)}>
                  <Line 
                    points={[0, -6, 12, 0, 0, 6]}
                    fill={level.enemy.color}
                    closed
                    shadowColor={level.enemy.color}
                    shadowBlur={5}
                  />
                </Group>
              );
            })()}

            {/* Rotation Ring Animation */}
            <Circle 
              radius={settings.enemySize * C.TILE_SIZE / 2 + 10} 
              stroke={level.enemy.color} 
              strokeWidth={3} 
              dash={[15, 10]} 
              rotation={-time * enemy.rotationSpeed * 3} 
              opacity={0.5}
              listening={false}
            />

            {/* Enemy Aura */}
            <Circle 
              radius={settings.enemySize * C.TILE_SIZE / 2 + 20} 
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={settings.enemySize * C.TILE_SIZE / 2 + 20}
              fillRadialGradientColorStops={[0, 'transparent', 0.7, 'transparent', 1, level.enemy.color]}
              opacity={0.4}
              listening={false}
            />

            <Circle 
              radius={settings.enemySize * C.TILE_SIZE / 2 + 5} 
              stroke={getOutlineColor(enemy)} 
              strokeWidth={3} 
              opacity={0.8}
              shadowColor={now - enemy.commitTimer < 0.4 ? "#ef4444" : "transparent"}
              shadowBlur={now - enemy.commitTimer < 0.4 ? 20 : 0}
            />
            <Aura radius={settings.enemySize * C.TILE_SIZE / 2 + 15} color={enemyAuraColor} />
            
            {/* Attacker Status */}
            {isEnemyAttacker && (
              <Group>
                <Text 
                  text="ATTACKER"
                  fontSize={12}
                  fontStyle="900"
                  fill={level.enemy.color}
                  x={-30}
                  y={-settings.enemySize * C.TILE_SIZE / 2 - 25}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                  opacity={0.8 + Math.sin(time / 100) * 0.2}
                />
              </Group>
            )}
            {isClash && (
              <Text 
                text="CLASH"
                fontSize={12}
                fontStyle="900"
                fill="#ffffff"
                x={-20}
                y={-settings.enemySize * C.TILE_SIZE / 2 - 25}
                align="center"
                shadowColor="black"
                shadowBlur={4}
              />
            )}

            {/* Spin Blur Effect */}
            <Circle 
              radius={settings.enemySize * C.TILE_SIZE / 2 + 5} 
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={settings.enemySize * C.TILE_SIZE / 2 + 5}
              fillRadialGradientColorStops={[0, 'transparent', 1, level.enemy.color]}
              opacity={Math.min(0.5, enemy.rotationSpeed / 20)}
            />

            <Circle radius={settings.enemySize * C.TILE_SIZE / 2} fill={level.enemy.color} stroke="#7f1d1d" strokeWidth={3} shadowBlur={15} shadowColor={level.enemy.color} />
            <Line points={[0, 0, settings.enemySize * C.TILE_SIZE / 2, 0]} stroke="white" strokeWidth={3} rotation={enemy.angle} lineCap="round" />

            {/* Enemy Special Move Indicators */}
            {enemy.rotationSpeed > 12 && (
              <Group>
                <Circle 
                  radius={settings.enemySize * C.TILE_SIZE / 2 + 15} 
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  opacity={0.4} 
                  dash={[5, 5]} 
                  rotation={time * 300}
                />
                <Circle 
                  radius={settings.enemySize * C.TILE_SIZE / 2 + 10} 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  opacity={0.6} 
                  shadowBlur={20} 
                  shadowColor="#ef4444"
                />
              </Group>
            )}

            {now - enemy.shieldTimer < 3 && (
              <Group>
                <Circle radius={settings.enemySize * C.TILE_SIZE / 2 + 12} stroke="#3b82f6" strokeWidth={4} opacity={0.6} shadowBlur={15} shadowColor="#3b82f6" />
                <Text 
                  text="DEFENSIVE SHIELD"
                  fontSize={8}
                  fontStyle="900"
                  fill="#3b82f6"
                  x={-35}
                  y={-settings.enemySize * C.TILE_SIZE / 2 - 55}
                  align="center"
                  shadowColor="black"
                  shadowBlur={4}
                />
              </Group>
            )}

            {now - enemy.boostKeyTimer < settings.enemySpecialDuration && (
              <Group>
                {level.enemy.special === 'vortex' && (
                  <>
                    <Circle 
                      radius={8 * C.TILE_SIZE} 
                      stroke="#fbbf24" 
                      strokeWidth={2} 
                      opacity={0.2} 
                      dash={[20, 10]} 
                      rotation={time * 200}
                    />
                    <Circle 
                      radius={4 * C.TILE_SIZE} 
                      stroke="#fbbf24" 
                      strokeWidth={1} 
                      opacity={0.1} 
                      dash={[10, 5]} 
                      rotation={-time * 150}
                    />
                    <Text 
                      text="VORTEX"
                      fontSize={10}
                      fontStyle="900"
                      fill="#fbbf24"
                      x={-20}
                      y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                      align="center"
                      shadowColor="black"
                      shadowBlur={4}
                    />
                  </>
                )}
                {level.enemy.special === 'shockwave' && (
                  <>
                    <Circle 
                      radius={((time * 200) % (6 * C.TILE_SIZE))} 
                      stroke="#d946ef" 
                      strokeWidth={2} 
                      opacity={1 - ((time * 200) % (6 * C.TILE_SIZE)) / (6 * C.TILE_SIZE)} 
                    />
                    <Text 
                      text="SHOCKWAVE"
                      fontSize={10}
                      fontStyle="900"
                      fill="#d946ef"
                      x={-30}
                      y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                      align="center"
                      shadowColor="black"
                      shadowBlur={4}
                    />
                  </>
                )}
                {level.enemy.special === 'phantom' && (
                  <Text 
                    text="PHANTOM"
                    fontSize={10}
                    fontStyle="900"
                    fill="#f43f5e"
                    x={-20}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'juggernaut' && (
                  <Text 
                    text="GROWTH"
                    fontSize={10}
                    fontStyle="900"
                    fill="#d946ef"
                    x={-20}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'sniper' && (
                  <Text 
                    text="LOCK-ON"
                    fontSize={10}
                    fontStyle="900"
                    fill="#10b981"
                    x={-20}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'predator' && (
                  <Text 
                    text="BLOOD SENSE"
                    fontSize={10}
                    fontStyle="900"
                    fill="#f97316"
                    x={-30}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'clones' && (
                  <Text 
                    text="CLONING"
                    fontSize={10}
                    fontStyle="900"
                    fill="#ef4444"
                    x={-20}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'gravity' && (
                  <>
                    <Circle 
                      radius={settings.gravityRadius * C.TILE_SIZE + Math.sin(time * 5) * 10} 
                      stroke="#a855f7" 
                      strokeWidth={2} 
                      opacity={0.3} 
                    />
                    <Text 
                      text="GRAVITY"
                      fontSize={10}
                      fontStyle="900"
                      fill="#a855f7"
                      x={-20}
                      y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                      align="center"
                      shadowColor="black"
                      shadowBlur={4}
                    />
                  </>
                )}
                {level.enemy.special === 'vortex' && (
                  <Text 
                    text="VORTEX"
                    fontSize={10}
                    fontStyle="900"
                    fill="#fbbf24"
                    x={-15}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
                {level.enemy.special === 'shockwave' && (
                  <Text 
                    text="SHOCKWAVE"
                    fontSize={10}
                    fontStyle="900"
                    fill="#d946ef"
                    x={-30}
                    y={-settings.enemySize * C.TILE_SIZE / 2 - 45}
                    align="center"
                    shadowColor="black"
                    shadowBlur={4}
                  />
                )}
              </Group>
            )}
          </Group>

          {/* Sparks */}
          {sparks.map((spark, i) => (
            <Spark key={i} spark={spark} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default Game;
