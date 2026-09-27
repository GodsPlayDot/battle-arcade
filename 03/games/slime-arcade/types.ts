// Fix: Create types.ts to define shared interfaces and types.

export type SlimeStat = 'HP' | 'ATK' | 'DEF' | 'SPD' | 'LUK';

export interface SlimeStats {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  LUK: number;
}

export interface EvolutionStage {
  name: string;
  levelReq: number;
  art: string[];
}

export type AbilityType = 'ATTACK' | 'DEFENSE' | 'EVASION' | 'ENVIRONMENT';

export interface Ability {
  name: string;
  levelReq: number;
  description: string;
  type: AbilityType;
  chargeUpTurns: number;
  cooldownTurns: number;
  damageMultiplier?: number;
  baseDamage?: number;
  condition?: {
    type: 'HP_BELOW_PERCENT';
    value: number; // e.g., 0.5 for 50%
  };
  apCost: number;
}

export interface MiniGame {
  name: string;
  description: string;
  expBase: number;
  levelReq: number;
}

export interface Slime {
  name: string;
  level: number;
  exp: number;
  quarters: number;
  upgradeTokens: number;
  ap: number;
  stats: SlimeStats;
  currentHp: number;
  evolutionStage: EvolutionStage;
  abilities: Ability[];
  equippedAbilities: Ability[];
}

export interface BattleLogEntry {
  turn: number;
  text: string;
  commentary: string;
  styleType: 'calc-header' | 'calc-detail' | 'roll' | 'success' | 'failure' | 'player-action' | 'opponent-action' | 'info';
}

export interface StatusEffect {
  name: string;
  duration: number;
  type: 'DAMAGE_REDUCTION' | 'GUARANTEED_EVASION' | 'EVASION_BOOST' | 'STAT_MODIFICATION' | 'POISON' | 'CRIT_CHANCE_REDUCTION' | 'PROBABILISTIC_EVASION' | 'STAT_MULTIPLIER' | 'COUNTER_ATTACK';
  value?: number; // e.g., 0.5 for 50% damage reduction, -1 for a debuff
  stat?: SlimeStat;
  counterDamageMultiplier?: number;
  counterBaseDamage?: number;
}

export interface BattleAbility {
  ability: Ability;
  cooldown: number;
  charge: number;
}

export interface BattleEnvironment {
    name: string;
    description: string;
    color: string;
    effect: {
        type: 'DOT' | 'STAT_MOD';
        value: number;
        stat?: SlimeStat;
    }
}
