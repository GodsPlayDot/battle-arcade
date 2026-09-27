import type { TopDefinition } from './types';

export const TILE_SIZE = 40;
export const GRID_WIDTH = 40;
export const GRID_HEIGHT = 40;

export const ARENA_WIDTH = GRID_WIDTH * TILE_SIZE;
export const ARENA_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export const PLAYER_BASE_SPEED = 1;
export const ENEMY_BASE_SPEED = 1.5;

export const BOUNCE_TILES = 3;
export const MAX_HP = 100;

export const GRAVITY_RANGE = 120;
export const HUNT_RADIUS = 250;

export const BOOST_DURATION_SECONDS = 6;
export const BOOST_TILES_COUNT = 4;
export const BOOST_TILE_RESPAWN_SECONDS = 10;

export const BOOST_KEY_MULTIPLIER = 2;
export const BOOST_KEY_DURATION_SECONDS = 2;
export const BOOST_KEY_COOLDOWN_SECONDS = 8;

export const GRAVITY_PULL_RANGE = 200;
export const GRAVITY_PULL_STRENGTH = 1.5;
export const GRAVITY_PULL_DURATION_SECONDS = 3;
export const GRAVITY_PULL_COOLDOWN_SECONDS = 10;

export const PLAYER_RADIUS = 15;
export const ENEMY_RADIUS = 15;

export const ARENA_GRAVITY_DURATION = 20;
export const ARENA_GRAVITY_COOLDOWN = 60;
export const ARENA_GRAVITY_RADIUS = 8 * TILE_SIZE;
export const ARENA_GRAVITY_PULL_STRENGTH = 0.5;

import type { GameSettings } from './types';

export const DEFAULT_SETTINGS: GameSettings = {
  playerHp: 100,
  enemyHp: 100,
  playerBaseSpeed: 2.0,
  enemyBaseSpeed: 2.0,
  playerMaxSpeed: 3.5,
  enemyMaxSpeed: 3.5,
  movementGainPerSecond: 0.1,
  movementLossOnHit: 25,
  borderMovementLoss: 15,
  playerBaseRotation: 3.5,
  enemyBaseRotation: 3.5,
  playerMaxRotation: 15.0,
  enemyMaxRotation: 15.0,
  rotationGainPerSecond: 0.5,
  rotationLossOnHit: 25,
  damageFormulaMode: 'momentum',
  bounceDistanceMultiplier: 4,
  postCollisionMovementSlow: 2,
  borderBounceDistance: 6,
  minImpactSpeedForDamage: 1.5,
  playerSize: 1.0,
  pushRadius: 2.0,
  pushForceStrength: 0.1,
  rotationSlowInsidePush: 2,
  enemySize: 1.0,
  huntRadiusMultiplier: 4.0,
  evadeRadiusMultiplier: 3.0,
  aiStateCheckInterval: 0.2,
  maxAiAcceleration: 0.4,
  hardSpeedCapEnforcement: true,
  gravityRadius: 1.0,
  gravityStrength: 0.5,
  gravityEnemySpecialRadius: 10.0,
  gravityEnemySpecialStrength: 0.8,
  arenaGravityDuration: 20,
  arenaGravityCooldown: 60,
  arenaGravityMultiplier: 5,
  tileCount: 3,
  tileRotationMultiplier: 3.0,
  tileBoostDuration: 6,
  tileRespawnTime: 5,
  tileRandomSpawn: true,
  shieldDuration: 4,
  shieldCooldown: 10,
  shieldPreventsMomentumLoss: true,
  enemySpecialCooldown: 12,
  enemySpecialDuration: 5,
  enemySpecialRotationGrowth: 0.8,
  enemySpecialMovementGrowth: 0.3,
  telegraphDuration: 0.5,
  cloneSpawnRate: 1,
  maxCloneCount: 4,
  cloneLifetime: 10,
  cloneSlowMovement: 10,
  cloneSlowRotation: 10,
  vortexStrength: 2.5,
  shockwaveForce: 6.0,
  berserkMultiplier: 2.0,
  stealthAlpha: 0.3,
  momentumEnabled: true,
  spinGainDelay: 1,
  movementGainDelay: 1,
  momentumScalingCurve: 'linear',
  combatModel: 'layered',
  screenShakeEnabled: true,
  screenShakeIntensity: 0.5,
  screenStabilization: 50,
  maxStability: 50,
  stabilityRegenPerSecond: 5,
  aiCombatThreshold: 0,
  showRadii: true,
  showVelocityVectors: false,
  showMomentumMeters: true,
  showCollisionImpactNumbers: false,
  hudOpacity: 100,
  autoHideHud: true,
  showVibrationMonitor: true,

  // 13. Advanced AI Tuning
  aggressionBias: 50,
  decisionInterval: 0.2,
  reactionDelay: 100,
  commitDuration: 0.4,
  riskToleranceThreshold: 0.5,
  healthPanicThreshold: 30,
  rotationConfidenceThreshold: 2.0,
  specialUsageCooldownMultiplier: 1.0,
  disengageBias: 1.0,
  predictionAccuracy: 80,

  // 14. Special Ability Modules
  stealthDistortion: 0.1,
  stealthMoveBonus: 0.5,
  afterimageInterval: 0.3,
  afterimageLifetime: 1.0,
  afterimageSlow: 10,
  afterimageConfusion: 20,
  growthMultiplier: 1.5,
  growthMovePenalty: 20,
  growthRotationMultiplier: 1.5,
  growthPushMultiplier: 1.5,
  projectileSpeed: 5.0,
  projectileLifetime: 3.0,
  projectileDamageRatio: 0.6,
  projectileCooldown: 5.0,
  projectileAccuracy: 90,
  maxProjectiles: 3,
  reactiveTriggerThreshold: 30,
  reactiveDuration: 3.0,
  reactiveInternalCooldown: 10.0,

  // 15. Combat Decision Weights
  weightMomentum: 1.0,
  weightRotation: 1.0,
  weightHp: 1.0,
  weightStability: 1.0,
  weightBorderRisk: 1.0,
  attackThreshold: 10,
  pressureThreshold: 0,

  // 16. Damage Scaling Caps
  maxHeadOnMultiplier: 2.0,
  minGlancingMultiplier: 0.5,
  maxRotationBonus: 0.5,
  clashDamageRatio: 0.6,
  stabilityAbsorption: 0.7,
  damageCapRatio: 0.25,
  momentumTransferMultiplier: 1.2,
  impactEfficiencyModifier: 1.0,
  engagementLockWindow: 100,

  // 17. Global Difficulty
  enemyTierMultiplier: 1.0,
  spinWeight: 0.8,

  // 18. Arena Interaction
  borderBounceSpeedLoss: 25,
  borderBounceRotationLoss: 25,
  cornerEscapeTimer: 1.5,
  tileMinSpawnDist: 100,

  // 19. Combat Style Toggles
  enablePhysicsMomentum: true,
  enableSpinPowerScaling: true,
  enableStabilityShield: true,
  enableIntentEngagement: true,
  enableArenaControl: true,
  enableTacticalAI: true,
};

import type { Preset, Level, SpecialDefinition } from './types';

export const PLAYER_SPECIALS: SpecialDefinition[] = [
  // Movement Pool
  {
    id: 'dash_burst',
    name: 'Dash Burst',
    category: 'Movement',
    powerCost: 5,
    duration: 0.8,
    cooldown: 12,
    description: 'High speed forward burst.',
    stats: '+80% forward speed',
    risk: '-10% rotation during dash'
  },
  {
    id: 'phase_drift',
    name: 'Phase Drift',
    category: 'Movement',
    powerCost: 5,
    duration: 2,
    cooldown: 15,
    description: 'Ignore enemy push radius.',
    stats: 'Push immunity'
  },
  {
    id: 'momentum_lock',
    name: 'Momentum Lock',
    category: 'Movement',
    powerCost: 3,
    duration: 0.1,
    cooldown: 18,
    description: 'Prevent movement loss on next hit.',
    stats: 'Hit protection'
  },
  // Rotation Pool
  {
    id: 'bounce_shield',
    name: 'Bounce Shield',
    category: 'Rotation',
    powerCost: 5,
    duration: 3,
    cooldown: 15,
    description: 'Creates a kinetic barrier that reflects force.',
    stats: '100% bounce reflection',
    risk: 'Lose 5% spin on hit'
  },
  {
    id: 'overdrive_spin',
    name: 'Overdrive Spin',
    category: 'Rotation',
    powerCost: 5,
    duration: 4,
    cooldown: 16,
    description: 'Instant massive spin boost.',
    stats: '+4 rotation instantly',
    risk: 'lose 15% movement'
  },
  {
    id: 'tile_amplifier',
    name: 'Tile Amplifier',
    category: 'Rotation',
    powerCost: 3,
    duration: 0,
    cooldown: 0,
    description: 'Boost tiles are more effective.',
    stats: '+50% tile effect'
  },
  // Collision Pool
  {
    id: 'shockwave',
    name: 'Shockwave',
    category: 'Collision',
    powerCost: 5,
    duration: 0.5,
    cooldown: 14,
    description: 'Massive push on next hit.',
    stats: '+3 tiles push'
  },
  {
    id: 'armor_break',
    name: 'Armor Break',
    category: 'Collision',
    powerCost: 7,
    duration: 4,
    cooldown: 18,
    description: 'Ignore enemy stability.',
    stats: '40% stability bypass'
  },
  {
    id: 'mirror_shield',
    name: 'Mirror Shield',
    category: 'Collision',
    powerCost: 7,
    duration: 4,
    cooldown: 20,
    description: 'Reflect 50% of incoming damage.',
    stats: '50% damage reflection'
  },
  {
    id: 'counter_core',
    name: 'Counter Core',
    category: 'Collision',
    powerCost: 7,
    duration: 2,
    cooldown: 22,
    description: 'Reflect damage when hit.',
    stats: '30% damage reflection'
  },
  // Control Pool
  {
    id: 'afterimage_trail',
    name: 'Afterimage Trail',
    category: 'Control',
    powerCost: 5,
    duration: 3,
    cooldown: 15,
    description: 'Spawn decoys to confuse enemy.',
    stats: 'Decoy every 0.4s'
  },
  {
    id: 'blink',
    name: 'Blink',
    category: 'Movement',
    powerCost: 6,
    duration: 0.1,
    cooldown: 15,
    description: 'Instantly teleport behind the opponent.',
    stats: 'Instant teleport'
  },
  {
    id: 'cloak_pulse',
    name: 'Cloak Pulse',
    category: 'Control',
    powerCost: 5,
    duration: 2,
    cooldown: 18,
    description: 'Become semi-transparent.',
    stats: '50% transparency',
    risk: 'Cannot attack'
  },
  {
    id: 'magnetic_gravity',
    name: 'Magnetic Gravity',
    category: 'Control',
    powerCost: 6,
    duration: 3,
    cooldown: 18,
    description: 'Creates a magnetic field that pulls the enemy toward you.',
    stats: 'Inverse-square pull, -1% enemy spin/sec'
  },
  {
    id: 'size_shift',
    name: 'Size Shift',
    category: 'Control',
    powerCost: 7,
    duration: 5,
    cooldown: 20,
    description: 'Grow in size and power.',
    stats: '1.4x radius, +35% damage',
    risk: '-15% movement'
  }
];

export const RECOMMENDED_PRESETS: Preset[] = [
  {
    name: 'Balanced Duel',
    settings: { ...DEFAULT_SETTINGS }
  },
  {
    name: 'High Speed Chaos',
    settings: {
      ...DEFAULT_SETTINGS,
      playerBaseSpeed: 4.0,
      enemyBaseSpeed: 4.5,
      playerMaxSpeed: 12.0,
      enemyMaxSpeed: 13.0,
      movementGainPerSecond: 0.5,
      bounceDistanceMultiplier: 12,
      tileCount: 8,
      tileRotationMultiplier: 5.0,
    }
  },
  {
    name: 'Defensive Strategy',
    settings: {
      ...DEFAULT_SETTINGS,
      playerHp: 200,
      enemyHp: 200,
      pushRadius: 6.0,
      pushForceStrength: 1.5,
      shieldDuration: 6,
      shieldCooldown: 12,
    }
  },
  {
    name: 'Sudden Death',
    settings: {
      ...DEFAULT_SETTINGS,
      playerHp: 10,
      enemyHp: 10,
      playerBaseRotation: 8.0,
      enemyBaseRotation: 8.0,
      rotationLossOnHit: 90,
    }
  }
];

export const DEFAULT_TOPS: TopDefinition[] = [
  { name: 'Cyclone', baseSpeed: 2.5, hp: 80 },
  { name: 'Juggernaut', baseSpeed: 1.5, hp: 150 },
  { name: 'Stinger', baseSpeed: 3.0, hp: 60 },
];

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Training Grounds',
    description: 'A standard arena for beginners. Focus on basic movement and the Intent Bonus.',
    arenaColor: '#0f172a',
    unlocked: true,
    tileCount: 4,
    arenaGravityEnabled: false,
    boostTileTypes: ['base'],
    combatModel: 'simple',
    enemy: {
      name: 'The Phantom',
      special: 'phantom',
      aiStyle: 'balanced',
      baseHp: 100,
      baseSpeed: 2.0,
      baseRotation: 3.5,
      huntRadiusMultiplier: 4.0,
      evadeRadiusMultiplier: 3.0,
      color: '#ef4444',
      passiveDesc: 'After Image Trails: Leaves faint ghost copies every 0.3s.',
      activeDesc: 'Invisibility: Becomes nearly invisible for 2 seconds.',
      reactiveDesc: 'None (Level 1-3)'
    }
  },
  {
    id: 2,
    name: 'Gravity Well',
    description: 'The enemy uses powerful gravity to trap you. Master Arena Control.',
    arenaColor: '#1e1b4b',
    unlocked: true,
    tileCount: 5,
    arenaGravityEnabled: false,
    boostTileTypes: ['base', 'speed'],
    combatModel: 'layered',
    enemy: {
      name: 'Void Puller',
      special: 'gravity',
      aiStyle: 'aggressive',
      baseHp: 110,
      baseSpeed: 2.2,
      baseRotation: 3.8,
      huntRadiusMultiplier: 4.5,
      evadeRadiusMultiplier: 3.5,
      color: '#a855f7',
      passiveDesc: 'Heavy Mass: Pulls nearby objects slightly at all times.',
      activeDesc: 'Gravity Well: Creates a powerful localized pull for 5s.',
      reactiveDesc: 'None (Level 1-3)'
    }
  },
  {
    id: 3,
    name: 'Speed Demon',
    description: 'Extremely fast enemy. Watch for high-momentum Physics Combat.',
    arenaColor: '#450a0a',
    unlocked: true,
    tileCount: 6,
    arenaGravityEnabled: false,
    boostTileTypes: ['base', 'speed', 'efficiency'],
    combatModel: 'experimental',
    enemy: {
      name: 'The Predator',
      special: 'predator',
      aiStyle: 'aggressive',
      baseHp: 130,
      baseSpeed: 2.5,
      baseRotation: 4.2,
      huntRadiusMultiplier: 5.0,
      evadeRadiusMultiplier: 4.0,
      color: '#f97316',
      passiveDesc: 'Keen Senses: Faster Hunt Radius detection.',
      activeDesc: 'Blood Sense: If player HP < 40%, +50% forward momentum bonus.',
      reactiveDesc: 'None (Level 1-3)'
    }
  },
  {
    id: 4,
    name: 'Ghost Arena',
    description: 'The enemy can fire projectiles. Stability Shield System is vital here.',
    arenaColor: '#064e3b',
    unlocked: true,
    tileCount: 6,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'stability'],
    combatModel: 'layered',
    enemy: {
      name: 'The Sniper',
      special: 'sniper',
      aiStyle: 'opportunistic',
      baseHp: 140,
      baseSpeed: 2.8,
      baseRotation: 4.5,
      huntRadiusMultiplier: 5.5,
      evadeRadiusMultiplier: 4.5,
      color: '#10b981',
      passiveDesc: 'Projectile Burst: Fires a spin-based projectile every 5s.',
      activeDesc: 'Lock-On Dash: Short fast linear burst toward predicted position.',
      reactiveDesc: 'Split Shot: If rotation > 8, projectiles split into 2.'
    }
  },
  {
    id: 5,
    name: 'The Maelstrom',
    description: 'Creates a vortex. High-level Arena Control required.',
    arenaColor: '#1c1917',
    unlocked: true,
    tileCount: 7,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'stability', 'efficiency'],
    combatModel: 'experimental',
    enemy: {
      name: 'Vortex Lord',
      special: 'vortex',
      aiStyle: 'balanced',
      baseHp: 150,
      baseSpeed: 3.0,
      baseRotation: 4.8,
      huntRadiusMultiplier: 6.0,
      evadeRadiusMultiplier: 5.0,
      color: '#fbbf24',
      passiveDesc: 'Swirl: Constant minor rotation pull on player.',
      activeDesc: 'Maelstrom: Massive vortex pull for 5s.',
      reactiveDesc: 'Eye of Storm: Gains stability while in center of arena.'
    }
  },
  {
    id: 6,
    name: 'Seismic Zone',
    description: 'Emits shockwaves. Test the Spin-Power Scaling advantage.',
    arenaColor: '#2e1065',
    unlocked: true,
    tileCount: 8,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'stability', 'efficiency', 'overcharge'],
    combatModel: 'hardcore',
    enemy: {
      name: 'The Juggernaut',
      special: 'juggernaut',
      aiStyle: 'defensive',
      baseHp: 180,
      baseSpeed: 3.2,
      baseRotation: 5.2,
      huntRadiusMultiplier: 6.5,
      evadeRadiusMultiplier: 5.5,
      color: '#d946ef',
      passiveDesc: 'Colossus: Larger Push Radius.',
      activeDesc: 'Growth Mode: Radius increases, Damage +50%, Speed -20%.',
      reactiveDesc: 'Kinetic Feedback: When hit, gains +1 spin instantly.'
    }
  },
  {
    id: 7,
    name: 'Berserker Forge',
    description: 'Relentless warrior. Tactical AI State-Machine will challenge you.',
    arenaColor: '#7f1d1d',
    unlocked: true,
    tileCount: 8,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'stability', 'vampiric'],
    combatModel: 'hardcore',
    enemy: {
      name: 'Iron Berserker',
      special: 'berserker',
      aiStyle: 'aggressive',
      baseHp: 200,
      baseSpeed: 3.5,
      baseRotation: 5.5,
      huntRadiusMultiplier: 7.0,
      evadeRadiusMultiplier: 6.0,
      color: '#ef4444',
      passiveDesc: 'Rage: Damage increases by 1% for every 2% HP lost.',
      activeDesc: 'Berserk: +50% rotation speed but -30% stability for 6s.',
      reactiveDesc: 'Unstoppable: If HP < 20%, gains immunity to push forces.'
    }
  },
  {
    id: 8,
    name: 'Mirror Chamber',
    description: 'The enemy reflects your power. Use Spin-Power Scaling carefully.',
    arenaColor: '#1e293b',
    unlocked: true,
    tileCount: 9,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'stability', 'mirror'],
    combatModel: 'experimental',
    enemy: {
      name: 'Glass Weaver',
      special: 'mirror',
      aiStyle: 'defensive',
      baseHp: 160,
      baseSpeed: 3.0,
      baseRotation: 4.5,
      huntRadiusMultiplier: 6.0,
      evadeRadiusMultiplier: 5.0,
      color: '#94a3b8',
      passiveDesc: 'Reflective Surface: 10% chance to reflect projectiles.',
      activeDesc: 'Mirror Image: Reflects 50% of incoming damage for 4s.',
      reactiveDesc: 'Shatter: On death, releases a burst of projectiles.'
    }
  },
  {
    id: 9,
    name: 'Teleport Nexus',
    description: 'The enemy blinks instantly. High-speed Tactical AI combat.',
    arenaColor: '#1e1b4b',
    unlocked: true,
    tileCount: 10,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'gravity_surge'],
    combatModel: 'hardcore',
    enemy: {
      name: 'Blink Stalker',
      special: 'teleporter',
      aiStyle: 'opportunistic',
      baseHp: 140,
      baseSpeed: 3.8,
      baseRotation: 5.0,
      huntRadiusMultiplier: 8.0,
      evadeRadiusMultiplier: 6.5,
      color: '#818cf8',
      passiveDesc: 'Phase Shift: 5% chance to dodge any hit.',
      activeDesc: 'Blink: Instantly teleports behind the player.',
      reactiveDesc: 'Warp Burst: Teleports to a random location if HP < 25%.'
    }
  },
  {
    id: 10,
    name: 'The Abyss',
    description: 'Relentless aggression. All six combat styles fully active.',
    arenaColor: '#000000',
    unlocked: true,
    tileCount: 12,
    arenaGravityEnabled: true,
    boostTileTypes: ['base', 'speed', 'stability', 'efficiency', 'overcharge', 'vampiric', 'gravity_surge', 'shield_recharge'],
    combatModel: 'hardcore',
    enemy: {
      name: 'Abyssal Overlord',
      special: 'vortex',
      aiStyle: 'aggressive',
      baseHp: 250,
      baseSpeed: 4.0,
      baseRotation: 6.5,
      huntRadiusMultiplier: 10.0,
      evadeRadiusMultiplier: 8.0,
      color: '#ffffff',
      passiveDesc: 'Void Presence: Drains player spin when nearby.',
      activeDesc: 'Abyssal Pull: Global gravity field for 8s.',
      reactiveDesc: 'Final Stand: If HP < 10%, gains +100% rotation speed.'
    }
  }
];
