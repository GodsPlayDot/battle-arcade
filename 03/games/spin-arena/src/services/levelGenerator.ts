import type { Level, EnemyDefinition, EnemySpecialType, AIStyle } from '../types';

const ENEMY_NAMES = [
  'Shadow', 'Void', 'Blitz', 'Phantasm', 'Vortex', 'Quake', 'Ghost', 'Berserker',
  'Titan', 'Specter', 'Rogue', 'Warden', 'Slayer', 'Wraith', 'Nova', 'Pulsar',
  'Eclipse', 'Nebula', 'Comet', 'Meteor', 'Zenith', 'Apex', 'Vanguard', 'Sentinel'
];

const ENEMY_PREFIXES = [
  'Dark', 'Ancient', 'Cyber', 'Neon', 'Spectral', 'Cursed', 'Elite', 'Master',
  'Grand', 'Ultimate', 'Primal', 'Eternal', 'Infernal', 'Celestial', 'Void'
];

const SPECIAL_MOVES: EnemySpecialType[] = [
  'phantom', 'juggernaut', 'sniper', 'predator', 'gravity', 'vortex', 'shockwave', 'clones'
];

const AI_STYLES: AIStyle[] = [
  'aggressive', 'defensive', 'opportunistic', 'balanced'
];

const ARENA_COLORS = [
  '#0f172a', '#1e1b4b', '#450a0a', '#064e3b', '#1c1917', '#2e1065', '#7f1d1d', '#000000',
  '#111827', '#312e81', '#4c1d95', '#581c87', '#701a75', '#831843', '#881337', '#7c2d12'
];

const ENEMY_COLORS = [
  '#ef4444', '#a855f7', '#f97316', '#10b981', '#fbbf24', '#d946ef', '#f43f5e', '#ffffff',
  '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#facc15', '#22c55e', '#6366f1'
];

export function generateLevel(id: number): Level {
  const seed = id * 12345;
  const rng = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };

  const nameIndex = Math.floor(rng(1) * ENEMY_NAMES.length);
  const prefixIndex = Math.floor(rng(2) * ENEMY_PREFIXES.length);
  const specialIndex = Math.floor(rng(3) * SPECIAL_MOVES.length);
  const aiStyleIndex = Math.floor(rng(4) * AI_STYLES.length);
  const arenaColorIndex = Math.floor(rng(5) * ARENA_COLORS.length);
  const enemyColorIndex = Math.floor(rng(6) * ENEMY_COLORS.length);

  const enemyName = `${ENEMY_PREFIXES[prefixIndex]} ${ENEMY_NAMES[nameIndex]}`;
  const special = SPECIAL_MOVES[specialIndex];
  const aiStyle = AI_STYLES[aiStyleIndex];

  const getBossInfo = (type: EnemySpecialType) => {
    switch (type) {
      case 'phantom': return { p: 'After Image Trails: Leaves ghost copies.', a: 'Invisibility: Becomes nearly invisible.', r: 'Desperation: Speed boost at low HP.' };
      case 'juggernaut': return { p: 'Colossus: Larger Push Radius.', a: 'Growth Mode: Radius and Damage increase.', r: 'Kinetic Feedback: Gains spin when hit.' };
      case 'sniper': return { p: 'Projectile Burst: Fires projectiles every 5s.', a: 'Lock-On Dash: Fast burst toward player.', r: 'Split Shot: Projectiles split at high spin.' };
      case 'predator': return { p: 'Keen Senses: Faster detection.', a: 'Blood Sense: Momentum bonus at low player HP.', r: 'Tactical Retreat: Disengages if outspun.' };
      case 'gravity': return { p: 'Heavy Mass: Constant slight pull.', a: 'Gravity Well: Powerful localized pull.', r: 'Event Horizon: Pull doubles at close range.' };
      case 'vortex': return { p: 'Swirl: Minor rotation pull.', a: 'Maelstrom: Massive vortex pull.', r: 'Eye of Storm: Stability gain in center.' };
      case 'shockwave': return { p: 'Seismic: Minor constant push.', a: 'Shockwave: Massive push blast.', r: 'Aftershock: Small pulses after main blast.' };
      case 'clones': return { p: 'Mirror: Small chance to ignore damage.', a: 'Cloning: Creates temporary decoys.', r: 'Shatter: Explodes into sparks on death.' };
      default: return { p: 'None', a: 'None', r: 'None' };
    }
  };

  const info = getBossInfo(special);
  
  // Scaling stats
  // Level 1: HP 100, Speed 2.0, Rotation 3.5
  // Every level adds a bit of difficulty
  const difficultyFactor = 1 + (id - 1) * 0.1;
  const baseHp = Math.floor(100 * difficultyFactor * (0.9 + rng(7) * 0.2));
  const baseSpeed = Number((2.0 * Math.pow(difficultyFactor, 0.4) * (0.95 + rng(8) * 0.1)).toFixed(2));
  const baseRotation = Number((3.5 * Math.pow(difficultyFactor, 0.3) * (0.95 + rng(9) * 0.1)).toFixed(2));
  
  const huntRadiusMultiplier = Number((4.0 + (id * 0.1) + rng(10) * 2).toFixed(1));
  const evadeRadiusMultiplier = Number((3.0 + (id * 0.1) + rng(11) * 2).toFixed(1));

  const enemy: EnemyDefinition = {
    name: enemyName,
    special,
    aiStyle,
    baseHp,
    baseSpeed,
    baseRotation,
    huntRadiusMultiplier,
    evadeRadiusMultiplier,
    color: ENEMY_COLORS[enemyColorIndex],
    passiveDesc: info.p,
    activeDesc: info.a,
    reactiveDesc: info.r
  };

  return {
    id,
    name: `Level ${id}: ${enemyName}'s Realm`,
    description: `Face off against ${enemyName} in a ${aiStyle} battle. Watch out for its ${special} special move!`,
    enemy,
    arenaColor: ARENA_COLORS[arenaColorIndex],
    unlocked: true,
    tileCount: Math.min(12, 4 + Math.floor(id / 2)),
    arenaGravityEnabled: true
  };
}
