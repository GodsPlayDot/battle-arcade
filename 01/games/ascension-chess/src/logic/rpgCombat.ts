import { CombatResult, OngoingDuel, Piece, RPSChoice } from '../types/chess';
import { sounds } from '../audio/soundEffects';
import { getAscendantProfile, getGargoyleTerrainProfile, getTrebuchetProfile } from './pyramidBoard';

export function rollDice(sides: number = 20): number {
  return Math.floor(Math.random() * sides) + 1;
}

export const RPS_CHOICES: RPSChoice[] = ['rock', 'paper', 'scissors'];

export function rollRandomRPS(): RPSChoice {
  return RPS_CHOICES[Math.floor(Math.random() * RPS_CHOICES.length)];
}

export function getRPSOutcome(
  attackerChoice: RPSChoice,
  defenderChoice: RPSChoice
): 'attacker_win' | 'defender_win' | 'tie' {
  if (attackerChoice === defenderChoice) return 'tie';
  if (
    (attackerChoice === 'rock' && defenderChoice === 'scissors') ||
    (attackerChoice === 'paper' && defenderChoice === 'rock') ||
    (attackerChoice === 'scissors' && defenderChoice === 'paper')
  ) {
    return 'attacker_win';
  }
  return 'defender_win';
}

function awardVictoryStats(victor: Piece): void {
  victor.rpg.kills += 1;
  victor.rpg.atk += 4;
  victor.rpg.def += 2;
  victor.rpg.critChance = Math.min(80, victor.rpg.critChance + 3);
  victor.rpg.maxHp += 10;
  victor.rpg.hp = Math.min(victor.rpg.maxHp, victor.rpg.hp + 25);

  if (victor.rpg.kills % 2 === 0) {
    victor.rpg.level += 1;
    victor.rpg.maxHp += 15;
    victor.rpg.hp = Math.min(victor.rpg.maxHp, victor.rpg.hp + 20);
    victor.rpg.atk += 6;
    victor.rpg.def += 4;
    victor.rpg.evasion = Math.min(75, victor.rpg.evasion + 4);
  }
}

export function resolveRPSMirrorCombat(
  attacker: Piece,
  defender: Piece,
  attackerRPS?: RPSChoice,
  defenderRPS?: RPSChoice
): CombatResult {
  let attChoice: RPSChoice = attackerRPS || rollRandomRPS();
  let defChoice: RPSChoice = defenderRPS || rollRandomRPS();

  // Guarantee a decisive winner if a tie was passed directly to resolveRPSMirrorCombat
  while (attChoice === defChoice) {
    defChoice = rollRandomRPS();
  }

  const outcome = getRPSOutcome(attChoice, defChoice);
  const attackerEffTier = attacker.position.isVerticalWall
    ? (attacker.position.wallTierStep || 1) - 0.2
    : attacker.position.tier;
  const defenderEffTier = defender.position.isVerticalWall
    ? (defender.position.wallTierStep || 1) - 0.2
    : defender.position.tier;
  const heightDelta = Math.round(attackerEffTier - defenderEffTier);

  if (outcome === 'attacker_win') {
    const fatalDmg = defender.rpg.hp;
    defender.rpg.hp = 0;
    awardVictoryStats(attacker);
    sounds.playCrit();

    return {
      hit: true,
      dodged: false,
      crit: true,
      damage: fatalDmg,
      attackerDiceRoll: 20,
      defenderDiceRoll: 1,
      heightAdvantage: heightDelta,
      ongoingDuelStarted: false,
      targetKilled: true,
      attackerKilled: false,
      combatMode: 'rps',
      attackerRPS: attChoice,
      defenderRPS: defChoice,
      rpsOutcome: 'attacker_win',
    };
  } else {
    // Defender counters and wins the mirror battle!
    const counterDmg = attacker.rpg.hp;
    attacker.rpg.hp = 0;
    awardVictoryStats(defender);
    sounds.playCrit();

    return {
      hit: false,
      dodged: false,
      crit: true,
      damage: counterDmg,
      attackerDiceRoll: 1,
      defenderDiceRoll: 20,
      heightAdvantage: heightDelta,
      ongoingDuelStarted: false,
      targetKilled: false,
      attackerKilled: true,
      combatMode: 'rps',
      attackerRPS: attChoice,
      defenderRPS: defChoice,
      rpsOutcome: 'defender_win',
    };
  }
}

export function resolveRPGCombat(
  attacker: Piece,
  defender: Piece,
  options?: { isReinforced?: boolean; attackerRPS?: RPSChoice; defenderRPS?: RPSChoice }
): CombatResult {
  // RULE: Same Piece Types going against each other use Rock-Paper-Scissors!
  // Different Piece Types use D20 Dice Roll + RPG Positional Stats!
  if (attacker.type === defender.type) {
    return resolveRPSMirrorCombat(attacker, defender, options?.attackerRPS, options?.defenderRPS);
  }

  const attackerDiceRoll = rollDice(20);
  const defenderDiceRoll = rollDice(20);

  // Height difference calculation:
  // Consider effective tier (if on vertical wall, effective tier is wallTierStep - 0.5)
  const attackerEffTier = attacker.position.isVerticalWall
    ? (attacker.position.wallTierStep || 1) - 0.2
    : attacker.position.tier;
  const defenderEffTier = defender.position.isVerticalWall
    ? (defender.position.wallTierStep || 1) - 0.2
    : defender.position.tier;

  const heightDelta = Math.round(attackerEffTier - defenderEffTier);
  const attackerIsAscendant = attacker.type === 'ascendant';

  // Grand Pyramid RPG-Exclusive Piece Modifiers (Gargoyle, Ascendant, Trebuchet)
  const engageDist = Math.max(
    Math.abs(attacker.position.x - defender.position.x),
    Math.abs(attacker.position.y - defender.position.y)
  );

  let effectiveAttackerAtk = attacker.rpg.atk;
  let effectiveDefenderDef = defender.rpg.def;
  let effectiveDefenderEvasion = defender.rpg.evasion;
  let effectiveAttackerCrit = attacker.rpg.critChance;
  let specialMultiplier = 1.0;

  // Height & Vertical Wall Roll Bonuses / Limitations:
  // High ground attacker receives modest +1 to D20; uphill attacker receives -1 to D20 (Ascendant ignores uphill penalty)
  let attackerRollBonus = heightDelta > 0 ? 1 : heightDelta < 0 && !attackerIsAscendant ? -1 : 0;

  // A. Gargoyle — Pyramid Terrain / Defensive Specialist
  if (attacker.type === 'gargoyle') {
    const gProf = getGargoyleTerrainProfile(attacker);
    if (gProf.isOnPyramidTerrain) {
      attackerRollBonus += 1;
      specialMultiplier *= 1 + gProf.atkBonusPercent / 100;
    }
  }
  if (defender.type === 'gargoyle') {
    const gDef = getGargoyleTerrainProfile(defender);
    if (gDef.isOnPyramidTerrain) {
      effectiveDefenderDef += gDef.defBonus;
      effectiveDefenderEvasion = Math.min(75, effectiveDefenderEvasion + gDef.evasionBonus);
    } else {
      effectiveDefenderEvasion = Math.max(0, effectiveDefenderEvasion + gDef.evasionBonus);
    }
  }

  // B. Ascendant — Elevation / Advancement Specialist
  if (attacker.type === 'ascendant') {
    const aProf = getAscendantProfile(attacker, 20);
    effectiveAttackerAtk += aProf.atkBonus;
    effectiveAttackerCrit = Math.min(85, effectiveAttackerCrit + aProf.critBonus);
  }
  if (defender.type === 'ascendant') {
    const aDef = getAscendantProfile(defender, 20);
    effectiveDefenderDef += aDef.defBonus;
  }

  // C. Trebuchet — Long-Range RPG Pressure Specialist
  if (attacker.type === 'trebuchet' && engageDist >= 3) {
    const tProf = getTrebuchetProfile(attacker);
    specialMultiplier *= 1 + tProf.siegeBonusPercent / 100;
  }
  if (defender.type === 'trebuchet' && engageDist <= 2) {
    effectiveDefenderDef = Math.max(4, effectiveDefenderDef - 6);
    effectiveDefenderEvasion = 0;
  }

  const effectiveAttackerRoll = Math.max(1, Math.min(20, attackerDiceRoll + attackerRollBonus));

  // Vertical Wall Ambush Advantage (Attacking downward from a wall):
  const isVerticalAmbush = !!attacker.position.isVerticalWall && !defender.position.isVerticalWall;

  // Evasion check: Defender evasion modified by roll and height disadvantage
  // High ground attacker is slightly harder to dodge; uphill attacker is slightly easier to dodge
  const defenderCoverBonus = heightDelta < 0 && !attackerIsAscendant ? 10 : 0; // Uphill attack limitation
  const isDodged =
    !isVerticalAmbush &&
    defenderDiceRoll + (effectiveDefenderEvasion + defenderCoverBonus) / 6 > 19 + heightDelta * 1.5;

  if (isDodged && defenderDiceRoll > effectiveAttackerRoll) {
    sounds.playDodge();
    // Piece stats drop slightly when they avoid capture by choice (tactical posture cost)
    defender.rpg.evasion = Math.max(5, defender.rpg.evasion - 1);

    return {
      hit: false,
      dodged: true,
      crit: false,
      damage: 0,
      counterDamage: 0,
      attackerDiceRoll: effectiveAttackerRoll,
      defenderDiceRoll,
      heightAdvantage: heightDelta,
      ongoingDuelStarted: false,
      targetKilled: false,
      attackerKilled: false,
      attackerReturned: true,
      diceOutcome: 'defender_win',
      combatMode: 'dice',
    };
  }

  // If the Attacker LOSES the D20 dice roll (effectiveAttackerRoll < defenderDiceRoll):
  // The Defender wins the dice roll and repels/counters the Attacker!
  // If the attacking loser still has HP (> 0), it is sent back to its original tile before it attacked.
  if (effectiveAttackerRoll < defenderDiceRoll) {
    const rawCounterDamage = Math.max(
      12,
      defender.rpg.atk * 0.65 - attacker.rpg.def * 0.35 + defenderDiceRoll * 0.5
    );
    const counterDamage = Math.round(rawCounterDamage);
    attacker.rpg.hp = Math.max(0, attacker.rpg.hp - counterDamage);
    const attackerKilled = attacker.rpg.hp <= 0;

    if (attackerKilled) {
      awardVictoryStats(defender);
      sounds.playCrit();
    } else {
      sounds.playClash();
    }

    return {
      hit: false,
      dodged: false,
      crit: false,
      damage: 0,
      counterDamage,
      attackerDiceRoll: effectiveAttackerRoll,
      defenderDiceRoll,
      heightAdvantage: heightDelta,
      ongoingDuelStarted: false,
      targetKilled: false,
      attackerKilled,
      attackerReturned: !attackerKilled,
      diceOutcome: 'defender_win',
      combatMode: 'dice',
    };
  }

  // Critical strike check: Natural 19-20 or critChance check (modest +10% if vertical ambush)
  const canCrit = heightDelta >= 0 || isVerticalAmbush || attackerIsAscendant;
  const isCrit =
    canCrit &&
    (effectiveAttackerRoll >= 19 ||
      rollDice(100) <= effectiveAttackerCrit + (isVerticalAmbush ? 10 : 0));

  // Height damage multiplier (Modest, tactical advantage per Rules of Engagement #13):
  // 1 tier above: +10%, 2+ tiers: +15-20%
  // Uphill attack: -10% per tier below (Ascendant ignores uphill penalty)
  let heightMultiplier = 1.0;
  if (heightDelta > 0) {
    heightMultiplier = 1.0 + Math.min(0.20, heightDelta * 0.10);
  } else if (heightDelta < 0 && !attackerIsAscendant) {
    heightMultiplier = Math.max(0.75, 1.0 + heightDelta * 0.10);
  }

  // Vertical Wall Situational Advantage:
  const wallAmbushMultiplier = isVerticalAmbush ? 1.15 : 1.0;
  // If defender is clinging to a wall and attacked from a higher terrace above: modest plunge bonus (+15%)
  const cliffPlungeMultiplier =
    !attacker.position.isVerticalWall &&
    defender.position.isVerticalWall &&
    attacker.position.tier >= (defender.position.wallTierStep || 1)
      ? 1.15
      : 1.0;

  const critMultiplier = isCrit ? 1.4 : 1.0;

  // Support & Guard in Chess: If defended by a friendly piece in legal line of attack
  const defendedGuardReduction = options?.isReinforced ? 0.88 : 1.0;

  // Damage calculation: Piece stats (ATK & DEF) remain primary!
  const rawDamage = Math.max(
    15,
    effectiveAttackerAtk - effectiveDefenderDef * 0.4 + effectiveAttackerRoll * 0.5
  );
  const finalDamage = Math.round(
    rawDamage *
      heightMultiplier *
      wallAmbushMultiplier *
      cliffPlungeMultiplier *
      specialMultiplier *
      critMultiplier *
      defendedGuardReduction
  );

  // Apply damage
  defender.rpg.hp = Math.max(0, defender.rpg.hp - finalDamage);
  const targetKilled = defender.rpg.hp <= 0;

  if (targetKilled) {
    attacker.rpg.kills += 1;
    // Piece stats get better the more they capture:
    attacker.rpg.atk += 4;
    attacker.rpg.def += 2;
    attacker.rpg.critChance = Math.min(80, attacker.rpg.critChance + 3);
    attacker.rpg.maxHp += 10;
    attacker.rpg.hp = Math.min(attacker.rpg.maxHp, attacker.rpg.hp + 25); // Heals a portion on kill

    // Full level up bonus
    if (attacker.rpg.kills % 2 === 0) {
      attacker.rpg.level += 1;
      attacker.rpg.maxHp += 15;
      attacker.rpg.hp = Math.min(attacker.rpg.maxHp, attacker.rpg.hp + 20);
      attacker.rpg.atk += 6;
      attacker.rpg.def += 4;
      attacker.rpg.evasion = Math.min(75, attacker.rpg.evasion + 4);
    }
  }

  if (isCrit) {
    sounds.playCrit();
  } else {
    sounds.playClash();
  }

  return {
    hit: true,
    dodged: false,
    crit: isCrit,
    damage: finalDamage,
    counterDamage: 0,
    attackerDiceRoll,
    defenderDiceRoll,
    heightAdvantage: heightDelta,
    ongoingDuelStarted: false,
    targetKilled,
    attackerKilled: false,
    attackerReturned: !targetKilled,
    diceOutcome: 'attacker_win',
    combatMode: 'dice',
  };
}

export function processDuelRound(
  duel: OngoingDuel,
  pieces: Piece[]
): {
  duel: OngoingDuel;
  resolved: boolean;
  winnerPieceId?: string;
  logs: string[];
} {
  const whitePiece = pieces.find((p) => p.id === duel.whitePieceId);
  const blackPiece = pieces.find((p) => p.id === duel.blackPieceId);

  if (!whitePiece || whitePiece.rpg.hp <= 0) {
    return {
      duel,
      resolved: true,
      winnerPieceId: blackPiece?.id,
      logs: [`⚔️ Clash resolved: ${blackPiece?.color} ${blackPiece?.type} emerges victorious!`],
    };
  }

  if (!blackPiece || blackPiece.rpg.hp <= 0) {
    return {
      duel,
      resolved: true,
      winnerPieceId: whitePiece.id,
      logs: [`⚔️ Clash resolved: ${whitePiece.color} ${whitePiece.type} emerges victorious!`],
    };
  }

  // Check if allies are adjacent to grant reinforcement bonus
  const isWhiteReinforced = pieces.some(
    (p) =>
      p.color === 'white' &&
      p.id !== whitePiece.id &&
      p.rpg.hp > 0 &&
      Math.abs(p.position.x - duel.position.x) <= 1 &&
      Math.abs(p.position.y - duel.position.y) <= 1
  );

  const isBlackReinforced = pieces.some(
    (p) =>
      p.color === 'black' &&
      p.id !== blackPiece.id &&
      p.rpg.hp > 0 &&
      Math.abs(p.position.x - duel.position.x) <= 1 &&
      Math.abs(p.position.y - duel.position.y) <= 1
  );

  const roundLogs: string[] = [];

  // Round exchange: both strike simultaneously!
  const whiteRes = resolveRPGCombat(whitePiece, blackPiece, { isReinforced: isWhiteReinforced });
  roundLogs.push(
    `Round ${duel.maxRounds - duel.roundsRemaining + 1}: White ${whitePiece.type} rolls ${whiteRes.attackerDiceRoll} -> ${
      whiteRes.dodged ? 'DODGED!' : `deals ${whiteRes.damage} DMG ${whiteRes.crit ? '(CRIT!)' : ''}`
    } [Black HP: ${blackPiece.rpg.hp}/${blackPiece.rpg.maxHp}]`
  );

  if (blackPiece.rpg.hp > 0) {
    const blackRes = resolveRPGCombat(blackPiece, whitePiece, { isReinforced: isBlackReinforced });
    roundLogs.push(
      `Round ${duel.maxRounds - duel.roundsRemaining + 1}: Black ${blackPiece.type} counter-rolls ${blackRes.attackerDiceRoll} -> ${
        blackRes.dodged ? 'DODGED!' : `deals ${blackRes.damage} DMG ${blackRes.crit ? '(CRIT!)' : ''}`
      } [White HP: ${whitePiece.rpg.hp}/${whitePiece.rpg.maxHp}]`
    );
  }

  duel.roundsRemaining -= 1;
  duel.logs.push(...roundLogs);

  // Check resolution
  if (blackPiece.rpg.hp <= 0) {
    return {
      duel,
      resolved: true,
      winnerPieceId: whitePiece.id,
      logs: [...roundLogs, `🏆 White ${whitePiece.type} defeated the enemy!`],
    };
  }

  if (whitePiece.rpg.hp <= 0) {
    return {
      duel,
      resolved: true,
      winnerPieceId: blackPiece.id,
      logs: [...roundLogs, `🏆 Black ${blackPiece.type} defeated the enemy!`],
    };
  }

  // If time runs out, the piece with higher current HP% wins the contested square
  if (duel.roundsRemaining <= 0) {
    const whiteRatio = whitePiece.rpg.hp / whitePiece.rpg.maxHp;
    const blackRatio = blackPiece.rpg.hp / blackPiece.rpg.maxHp;
    const winner = whiteRatio >= blackRatio ? whitePiece : blackPiece;
    const loser = whiteRatio >= blackRatio ? blackPiece : whitePiece;
    loser.rpg.hp = 0; // Forced concession

    return {
      duel,
      resolved: true,
      winnerPieceId: winner.id,
      logs: [...roundLogs, `⏳ Standoff ended! ${winner.color} ${winner.type} broke the deadlock by endurance!`],
    };
  }

  return {
    duel,
    resolved: false,
    logs: roundLogs,
  };
}
