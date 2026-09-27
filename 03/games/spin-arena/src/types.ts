

export interface TopDefinition {
  name: string;
  baseSpeed: number;
  hp: number;
}



export type SpecialCategory = 'Movement' | 'Rotation' | 'Collision' | 'Control';

export interface SpecialDefinition {
  id: string;
  name: string;
  category: SpecialCategory;
  powerCost: number; // 3, 5, 7
  duration: number;
  cooldown: number;
  description: string;
  stats: string;
  risk?: string;
  scalingVariable?: string;
}

export interface PlayerProgression {
  totalWins: number;
  unlockedSpecialIds: string[];
  equippedSpecialIds: [string | null, string | null];
  passiveSpecialId: string | null;
}

export interface GameSettings {
  // 1. Health
  playerHp: number;
  enemyHp: number;

  // 2. Movement
  playerBaseSpeed: number;
  enemyBaseSpeed: number;
  playerMaxSpeed: number;
  enemyMaxSpeed: number;
  movementGainPerSecond: number;
  movementLossOnHit: number;
  borderMovementLoss: number;

  // 3. Rotation
  playerBaseRotation: number;
  enemyBaseRotation: number;
  playerMaxRotation: number;
  enemyMaxRotation: number;
  rotationGainPerSecond: number;
  rotationLossOnHit: number;
  damageFormulaMode: 'floor' | 'rounded' | 'momentum';

  // 4. Collision & Bounce
  bounceDistanceMultiplier: number;
  postCollisionMovementSlow: number;
  borderBounceDistance: number;
  minImpactSpeedForDamage: number;

  // 5. Player Radius
  playerSize: number;
  pushRadius: number;
  pushForceStrength: number;
  rotationSlowInsidePush: number;

  // 6. Enemy AI Radius
  enemySize: number;
  huntRadiusMultiplier: number;
  evadeRadiusMultiplier: number;
  aiStateCheckInterval: number;
  maxAiAcceleration: number;
  hardSpeedCapEnforcement: boolean;

  // 7. Gravity
  gravityRadius: number;
  gravityStrength: number;
  gravityEnemySpecialRadius: number;
  gravityEnemySpecialStrength: number;
  arenaGravityDuration: number;
  arenaGravityCooldown: number;
  arenaGravityMultiplier: number;

  // 8. Boost Tile
  tileCount: number;
  tileRotationMultiplier: number;
  tileBoostDuration: number;
  tileRespawnTime: number;
  tileRandomSpawn: boolean;

  // 9. Player Special
  shieldDuration: number;
  shieldCooldown: number;
  shieldPreventsMomentumLoss: boolean;

  // 10. Enemy Special
  enemySpecialCooldown: number;
  enemySpecialDuration: number;
  enemySpecialRotationGrowth: number;
  enemySpecialMovementGrowth: number;
  telegraphDuration: number;
  cloneSpawnRate: number;
  maxCloneCount: number;
  cloneLifetime: number;
  cloneSlowMovement: number;
  cloneSlowRotation: number;
  vortexStrength: number;
  shockwaveForce: number;
  berserkMultiplier: number;
  stealthAlpha: number;

  // 11. Momentum System
  momentumEnabled: boolean;
  spinGainDelay: number;
  movementGainDelay: number;
  momentumScalingCurve: 'linear' | 'exponential' | 'flat';
  combatModel: 'simple' | 'layered' | 'experimental' | 'hardcore';
  screenShakeEnabled: boolean;
  screenShakeIntensity: number;
  screenStabilization: number;
  maxStability: number;
  stabilityRegenPerSecond: number;
  aiCombatThreshold: number;

  // 12. Visual Debug
  showRadii: boolean;
  showVelocityVectors: boolean;
  showMomentumMeters: boolean;
  showCollisionImpactNumbers: boolean;
  hudOpacity: number;
  autoHideHud: boolean;
  showVibrationMonitor: boolean;

  // 13. Advanced AI Tuning
  aggressionBias: number;
  decisionInterval: number;
  reactionDelay: number;
  commitDuration: number;
  riskToleranceThreshold: number;
  healthPanicThreshold: number;
  rotationConfidenceThreshold: number;
  specialUsageCooldownMultiplier: number;
  disengageBias: number;
  predictionAccuracy: number;

  // 14. Special Ability Modules
  stealthDistortion: number;
  stealthMoveBonus: number;
  afterimageInterval: number;
  afterimageLifetime: number;
  afterimageSlow: number;
  afterimageConfusion: number;
  growthMultiplier: number;
  growthMovePenalty: number;
  growthRotationMultiplier: number;
  growthPushMultiplier: number;
  projectileSpeed: number;
  projectileLifetime: number;
  projectileDamageRatio: number;
  projectileCooldown: number;
  projectileAccuracy: number;
  maxProjectiles: number;
  reactiveTriggerThreshold: number;
  reactiveDuration: number;
  reactiveInternalCooldown: number;

  // 15. Combat Decision Weights
  weightMomentum: number;
  weightRotation: number;
  weightHp: number;
  weightStability: number;
  weightBorderRisk: number;
  attackThreshold: number;
  pressureThreshold: number;

  // 16. Damage Scaling Caps
  maxHeadOnMultiplier: number;
  minGlancingMultiplier: number;
  maxRotationBonus: number;
  clashDamageRatio: number;
  stabilityAbsorption: number;
  damageCapRatio: number; // New: 0.25 for 25%
  momentumTransferMultiplier: number;
  impactEfficiencyModifier: number;
  engagementLockWindow: number;

  // 17. Global Difficulty
  enemyTierMultiplier: number;
  spinWeight: number; // New: 0.8

  // 18. Arena Interaction
  borderBounceSpeedLoss: number;
  borderBounceRotationLoss: number;
  cornerEscapeTimer: number;
  tileMinSpawnDist: number;

  // 19. Combat Style Toggles
  enablePhysicsMomentum: boolean;
  enableSpinPowerScaling: boolean;
  enableStabilityShield: boolean;
  enableIntentEngagement: boolean;
  enableArenaControl: boolean;
  enableTacticalAI: boolean;
}

export interface Preset {
  name: string;
  settings: GameSettings;
}

export interface DiagnosticResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

export type EnemySpecialType = 'phantom' | 'juggernaut' | 'sniper' | 'predator' | 'gravity' | 'vortex' | 'shockwave' | 'clones' | 'berserker' | 'teleporter' | 'mirror';

export type AIStyle = 'aggressive' | 'defensive' | 'opportunistic' | 'balanced';

export interface EnemyDefinition {
  name: string;
  special: EnemySpecialType;
  aiStyle: AIStyle;
  baseHp: number;
  baseSpeed: number;
  baseRotation: number;
  huntRadiusMultiplier: number;
  evadeRadiusMultiplier: number;
  color: string;
  passiveDesc: string;
  activeDesc: string;
  reactiveDesc: string;
}

export type BoostTileType = 'base' | 'speed' | 'stability' | 'efficiency' | 'overcharge' | 'vampiric' | 'gravity_surge' | 'shield_recharge' | 'mirror';

export interface Level {
  id: number;
  name: string;
  description: string;
  enemy: EnemyDefinition;
  arenaColor: string;
  unlocked: boolean;
  tileCount?: number;
  arenaGravityEnabled?: boolean;
  boostTileTypes?: BoostTileType[];
  combatModel?: 'simple' | 'layered' | 'experimental' | 'hardcore';
}

export interface TopState {
  name: string;
  x: number;
  y: number;
  baseSpeed: number;
  speed: number;
  baseRotation: number;
  rotationSpeed: number;
  hp: number;
  angle: number;
  boostTimer: number; // Will store the timestamp when boost was activated
  speedBoostTimer: number;
  efficiencyBoostTimer: number;
  mode: 'hunt' | 'evade' | 'boost_hunt' | 'idle';
  modeTimer: number; // Will store the timestamp for mode switching
  boostKeyTimer: number;
    boostKeyCooldown: number;
  gravityPullTimer: number;
  gravityPullCooldown: number;
  slowTimer: number;
  lastDamageTime: number;
  lastAfterimageTime: number;
  recentHits: number[];
  borderHits: number[];
  borderPushTimer: number;
  idleTarget: { x: number; y: number } | null;
  stuckTime: number;
  stability: number;
  lastX: number;
  lastY: number;
  combatScore: number;
  intent: 'attack' | 'disengage';
  intentTimer: number;
  engagementPriority: 'attacker' | 'defender' | 'clash' | 'none';
  engagementLockTimer: number;
  commitTimer: number;
  lockedForwardMomentum: number;
  lastVelocity: { x: number; y: number };
  commitTarget: { x: number; y: number } | null;
  history: { x: number; y: number }[];
  lowHpTriggered: boolean;
  shieldTimer: number;
  telegraphTimer: number;
  isTelegraphing: boolean;
  // Dual Special Support
  specialTimers: [number, number];
  specialCooldowns: [number, number];
  activeSpecialIds: [string | null, string | null];
}
