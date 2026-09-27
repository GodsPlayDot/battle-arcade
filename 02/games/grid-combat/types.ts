import React from 'react';

export interface Position {
  x: number;
  y: number;
}

export enum SkillType {
  ATTACK = 'Attack',
  MOVE = 'Move',
  BUFF = 'Buff',
  SPECIAL = 'Special',
  DEBUFF = 'Debuff',
}

export enum CostType {
  MP = 'MP',
  STAMINA = 'Stamina',
  HP = 'HP',
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number;
  costType: CostType;
  range: number;
  damage?: number;
  type: SkillType;
  icon: React.ComponentType<{ className?: string }>;
  cooldown?: number; // Turns
  aoe?: number; // Area of Effect radius
}

export interface PlayerStats {
  strength: number;
  dexterity: number;
  intelligence: number;
  speed: number;
  defense: number;
  endurance: number;
  luck: number;
}

export enum StatusEffectType {
    VANISHED = 'VANISHED',
    STRENGTH_BUFF = 'STRENGTH_BUFF',
    DEFENSE_BUFF = 'DEFENSE_BUFF', 
    AEGIS_SHIELD = 'AEGIS_SHIELD',
    RAMPAGE_BUFF = 'RAMPAGE_BUFF',
    BLOOD_PACT_BUFF = 'BLOOD_PACT_BUFF',
    RETRIBUTION_AURA = 'RETRIBUTION_AURA',
    CONSTRICTED_DEBUFF = 'CONSTRICTED_DEBUFF',
    TWIN_ECHO_BUFF = 'TWIN_ECHO_BUFF',
    VULNERABLE_DEBUFF = 'VULNERABLE_DEBUFF',
    FROZEN_DEBUFF = 'FROZEN_DEBUFF',
    BURNING_DEBUFF = 'BURNING_DEBUFF',
    POISONED_DEBUFF = 'POISONED_DEBUFF',
    TAUNTED_DEBUFF = 'TAUNTED_DEBUFF',
    SLOW_DEBUFF = 'SLOW_DEBUFF',
    IMMOBILIZED_DEBUFF = 'IMMOBILIZED_DEBUFF',
    STAT_DEBUFF = 'STAT_DEBUFF',
    UNSTOPPABLE_BUFF = 'UNSTOPPABLE_BUFF',
    CHARGING_ATTACK = 'CHARGING_ATTACK',
    HASTE_BUFF = 'HASTE_BUFF',
    SILENCE_DEBUFF = 'SILENCE_DEBUFF',
    DISARM_DEBUFF = 'DISARM_DEBUFF',
    PARRY_STANCE = 'PARRY_STANCE',
    LAST_STAND_BUFF = 'LAST_STAND_BUFF',
}
export interface StatusEffect {
    type: StatusEffectType;
    duration: number; // in turns
    potency?: number; // e.g. damage multiplier, shield HP, DoT damage
    sourceId?: number; // For effects like Taunt
}

export interface Player {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stamina: number;
  maxStamina: number;
  position: Position;
  stats: PlayerStats;
  skills: Skill[];
  color: string;
  isAi: boolean;
  statusEffects: StatusEffect[];
}

export interface SelectedMove {
  skill: Skill | null;
  target: Position | null;
}

export interface PlayerActions {
  primary: SelectedMove;
  followup: SelectedMove;
  confirmed: boolean;
}

export enum GamePhase {
  SELECTING_MOVES = 'SELECTING_MOVES',
  RESOLVING_COMBAT = 'RESOLVING_COMBAT',
  GAME_OVER = 'GAME_OVER',
  UPGRADE_PHASE = 'UPGRADE_PHASE',
  BATTLE_ROYALE_IN_PROGRESS = 'BATTLE_ROYALE_IN_PROGRESS',
}

export interface FloatingText {
  id: number;
  text: string;
  color: string;
  position: Position;
}

export interface Decoy {
    id: number;
    playerId: number;
    hp: number;
    maxHp: number;
    position: Position;
    turnsRemaining: number;
    color: string;
}

export interface Skeleton {
    id: number;
    playerId: number;
    hp: number;
    maxHp: number;
    position: Position;
    turnsRemaining: number;
}

export interface SkillAnimation {
  key: number;
  skill: Skill;
  source: Position;
  target: Position;
}

export interface Obstacle {
    position: Position;
    duration: number; // in turns
    playerId?: number;
}

export interface Trap {
    position: Position;
    playerId: number;
    duration: number;
    damage: number;
}
export interface DamagingTile {
    position: Position;
    playerId: number;
    duration: number;
    damage: number;
    color: string;
}
export enum EffectZoneType {
    GRAVITY_WELL = 'GRAVITY_WELL',
    CONSECRATED_GROUND = 'CONSECRATED_GROUND',
    CORROSIVE_MIRE = 'CORROSIVE_MIRE',
    SMOKE_CLOUD = 'SMOKE_CLOUD',
}

export interface EffectZone {
    id: number;
    playerId: number;
    position: Position;
    radius: number;
    duration: number;
    type: EffectZoneType;
}

export interface AdminSettings {
  hideUnownedSkills: boolean;
  singleOpponentMode: boolean;
  player1IsAi: boolean;
}

export type AiArchetype = 'Aggressor' | 'Stalker' | 'Breaker' | 'Zoner';

export interface AiLearningProfile {
  battles: number;
  wins: number;
  losses: number;
  archetypeScores: Record<AiArchetype, number>;
  skillScores: Record<string, number>;
}

export interface BattleReplayFrame {
  turn: number;
  headline: string;
  events: string[];
  players: Array<{ id: number; name: string; hp: number; maxHp: number; position: Position; color: string }>;
}

export interface Projectile {
    id: number;
    skill: Skill;
    source: Position;
    target: Position;
}

export interface Rift {
    id: number;
    playerId: number;
    position: Position;
    duration: number;
    spawnCounter: number;
}

export interface GameState {
  players: Player[];
  challengers: Player[];
  decoys: Decoy[];
  skeletons: Skeleton[];
  obstacles: Obstacle[];
  traps: Trap[];
  damagingTiles: DamagingTile[];
  effectZones: EffectZone[];
  rifts: Rift[];
  projectiles: Projectile[];
  turn: number;
  phase: GamePhase;
  playerActions: { [playerId: number]: PlayerActions };
  skillCooldowns: { [playerId: number]: { [skillId: string]: number } };
  log: string[];
  winner: number | null;
  activePlayerId: number;
  activeMoveSlot: 'primary' | 'followup';
  floatingTexts: FloatingText[];
  countdown: number | null;
  currentOpponentIndex: number;
  skillAnimation: SkillAnimation | null;
  extraLives: number;
  adminSettings: AdminSettings;
  aiBattleReport: string[];
  aiLearning: Record<number, AiLearningProfile>;
  aiArchetypes: Record<number, AiArchetype>;
  aiMatchSkills: Record<number, string[]>;
  battleReplay: BattleReplayFrame[];
  p1AiStatBuffs: { str: number; int: number; end: number; };
  gridSize: number;
  inactivityCounter: number;
  generatedChallenger: Player | null;
  shrinkLevel: number;
}
