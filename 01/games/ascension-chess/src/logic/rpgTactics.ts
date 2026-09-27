import { BoardType, Move, Piece, PieceColor, Position } from '../types/chess';
import { getRawMovesForPiece, getValidMovesForPiece } from './moveValidation';
import { BOARD_SIZES, getAscendantProfile, getGargoyleTerrainProfile, getTrebuchetProfile, isSummitTile } from './pyramidBoard';

export interface CombatOdds {
  hitPercent: number;
  dodgePercent: number;
  critPercent: number;
  expectedDamage: number;
  defenderMaxHp: number;
  defenderCurrentHp: number;
  isFatalExpected: boolean;
  positiveModifiers: string[];
  negativeModifiers: string[];
  heightDelta: number;
  isVerticalAmbush: boolean;
  isCliffPlunge: boolean;
  attackerDiceRollBonus: number;
}

export interface TacticalContext {
  protectedCount: number;
  threatenedCount: number;
  protectingPieceNames: string[];
  threateningPieceNames: string[];
  isPinned: boolean;
  elevationName: string;
}

/**
 * Returns descriptive name for position elevation
 */
export function getElevationName(pos: Position): string {
  if (pos.isVerticalWall) {
    return `Vertical Wall (${pos.wallDirection || 'cliff'} face, Step ${pos.wallTierStep || 1})`;
  }
  switch (pos.tier) {
    case 0:
      return 'Valley Ground (Tier 0)';
    case 1:
      return 'Low Terrace (Tier 1)';
    case 2:
      return 'High Terrace (Tier 2)';
    case 3:
      return 'Summit Apex (Tier 3)';
    default:
      return `Terrace Tier ${pos.tier}`;
  }
}

// Per-board-state WeakMap caches so repeated tactical analysis & odds queries on the same board state are O(1)
const tacticalContextCache = new WeakMap<Piece[], Map<string, TacticalContext>>();
const combatOddsCache = new WeakMap<Piece[], Map<string, CombatOdds>>();

/**
 * Fast geometric reach check before generating full raw moves for tactical context analysis
 */
function canGeometricallyReachSquare(
  piece: Piece,
  targetX: number,
  targetY: number,
  boardType: BoardType
): boolean {
  const adx = Math.abs(piece.position.x - targetX);
  const ady = Math.abs(piece.position.y - targetY);
  const isPyramid = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const onSummit =
    isPyramid &&
    !piece.position.isVerticalWall &&
    isSummitTile(boardType, piece.position.x, piece.position.y);
  if (onSummit && piece.type !== 'knight' && piece.type !== 'trebuchet') {
    return adx <= 1 && ady <= 1;
  }
  if (piece.type === 'pawn') {
    return adx <= 1 && ady <= 1;
  }
  if (piece.type === 'king') {
    if (adx > 13 || ady > 13) return false;
    if (!piece.position.isVerticalWall && !isPyramid) {
      return adx === 0 || ady === 0 || adx === ady;
    }
    return true;
  }
  if (piece.type === 'knight') {
    if (!isPyramid) return adx <= 2 && ady <= 2 && adx + ady === 3;
    return adx <= 6 && ady <= 6;
  }
  if (piece.type === 'gargoyle') {
    return adx <= 3 && ady <= 3;
  }
  if (piece.type === 'rook') {
    if (adx > 18 || ady > 18) return false;
    if (!piece.position.isVerticalWall) {
      return adx === 0 || ady === 0;
    }
    return true;
  }
  if (piece.type === 'bishop') {
    if (adx > 13 || ady > 13) return false;
    if (!piece.position.isVerticalWall && !isPyramid) {
      return adx === ady;
    }
    return true;
  }
  return true;
}

/**
 * Analyzes whole-board legal tactical relationships:
 * - Who is protecting this piece (friendly pieces whose legal moves can reach this square)?
 * - Who is threatening this piece (enemy pieces whose legal moves reach this square)?
 * - Is this piece pinned to its King (moving it would expose the King to check)?
 */
export function analyzeTacticalContext(
  piece: Piece,
  allPieces: Piece[],
  boardType: BoardType
): TacticalContext {
  let boardMap = tacticalContextCache.get(allPieces);
  if (!boardMap) {
    boardMap = new Map<string, TacticalContext>();
    tacticalContextCache.set(allPieces, boardMap);
  }
  const cacheKey = `${piece.id}_${piece.position.x}_${piece.position.y}_${piece.rpg.hp}_${boardType}`;
  const cached = boardMap.get(cacheKey);
  if (cached) {
    return cached;
  }

  const activePieces = allPieces.filter((p) => p.rpg.hp > 0);
  const friendlyColor = piece.color;
  const enemyColor: PieceColor = friendlyColor === 'white' ? 'black' : 'white';

  const protectingPieceNames: string[] = [];
  const threateningPieceNames: string[] = [];

  // Allocate virtual enemy target board once outside the friendly loop
  const testEnemyAtPos: Piece = {
    ...piece,
    id: 'virtual_enemy_target',
    color: enemyColor,
  };
  const boardWithEnemyAtPos = activePieces.map((p) => (p.id === piece.id ? testEnemyAtPos : p));

  // Check protection: friendly pieces whose raw attacks cover this piece's square
  for (let i = 0; i < activePieces.length; i++) {
    const friendly = activePieces[i];
    if (friendly.color !== friendlyColor || friendly.id === piece.id) continue;
    if (!canGeometricallyReachSquare(friendly, piece.position.x, piece.position.y, boardType)) {
      continue;
    }

    const moves = getRawMovesForPiece(friendly, boardWithEnemyAtPos, boardType);
    const protects = moves.some(
      (m) =>
        m.isCapture &&
        m.to.x === piece.position.x &&
        m.to.y === piece.position.y &&
        (piece.position.isVerticalWall ? !!m.to.isVerticalWall : !m.to.isVerticalWall)
    );
    if (protects) {
      protectingPieceNames.push(friendly.type);
    }
  }

  // Check threats: enemy pieces whose moves attack this piece
  for (let i = 0; i < activePieces.length; i++) {
    const enemy = activePieces[i];
    if (enemy.color !== enemyColor) continue;
    if (!canGeometricallyReachSquare(enemy, piece.position.x, piece.position.y, boardType)) {
      continue;
    }

    const moves = getRawMovesForPiece(enemy, activePieces, boardType);
    const threatens = moves.some(
      (m) =>
        m.isCapture &&
        m.to.x === piece.position.x &&
        m.to.y === piece.position.y &&
        (piece.position.isVerticalWall ? !!m.to.isVerticalWall : !m.to.isVerticalWall)
    );
    if (threatens) {
      threateningPieceNames.push(enemy.type);
    }
  }

  // Pin check: if moving this piece anywhere is illegal because it exposes the King to check
  const rawMoves = getRawMovesForPiece(piece, activePieces, boardType);
  const validMoves = rawMoves.length > 0 ? getValidMovesForPiece(piece, activePieces, boardType) : [];
  const isPinned = rawMoves.length > 0 && validMoves.length === 0;

  const result: TacticalContext = {
    protectedCount: protectingPieceNames.length,
    threatenedCount: threateningPieceNames.length,
    protectingPieceNames,
    threateningPieceNames,
    isPinned,
    elevationName: getElevationName(piece.position),
  };

  boardMap.set(cacheKey, result);
  return result;
}

/**
 * Calculates live RPG dice-roll odds and positional modifiers for a specific legal engagement.
 * Based on base stats, current position, pyramid terrain, and whole-board supporting/threatening lines.
 *
 * Simulates the exact d20 distribution (20 x 20 = 400 permutations) to get precise mathematical odds!
 */
export function calculateLiveRPGOdds(
  attacker: Piece,
  defender: Piece,
  allPieces: Piece[],
  boardType: BoardType
): CombatOdds {
  let oddsMap = combatOddsCache.get(allPieces);
  if (!oddsMap) {
    oddsMap = new Map<string, CombatOdds>();
    combatOddsCache.set(allPieces, oddsMap);
  }
  const oddsKey = `${attacker.id}_${defender.id}_${attacker.rpg.hp}_${defender.rpg.hp}_${boardType}`;
  const cachedOdds = oddsMap.get(oddsKey);
  if (cachedOdds) {
    return cachedOdds;
  }
  const positiveModifiers: string[] = [];
  const negativeModifiers: string[] = [];

  // 1. Terrain & Elevation calculation
  const attackerEffTier = attacker.position.isVerticalWall
    ? (attacker.position.wallTierStep || 1) - 0.2
    : attacker.position.tier;
  const defenderEffTier = defender.position.isVerticalWall
    ? (defender.position.wallTierStep || 1) - 0.2
    : defender.position.tier;

  const heightDelta = Math.round(attackerEffTier - defenderEffTier);

  // Vertical wall ambush & cliff plunge
  const isVerticalAmbush = !!attacker.position.isVerticalWall && !defender.position.isVerticalWall;
  const isCliffPlunge =
    !attacker.position.isVerticalWall &&
    !!defender.position.isVerticalWall &&
    attacker.position.tier >= (defender.position.wallTierStep || 1);

  let attackerRollBonus = 0;
  const attackerIsAscendant = attacker.type === 'ascendant';

  if (heightDelta > 0) {
    attackerRollBonus = 1;
    positiveModifiers.push(`High ground advantage (+${heightDelta} tier): +1 to D20 attack roll`);
  } else if (heightDelta < 0) {
    if (attackerIsAscendant) {
      positiveModifiers.push('Ascendant Climbing Mastery: Ignores uphill attack penalty');
    } else {
      attackerRollBonus = -1;
      negativeModifiers.push(`Uphill attack penalty (${heightDelta} tier): -1 to D20 attack roll`);
    }
  }

  if (isVerticalAmbush) {
    positiveModifiers.push('Vertical Wall Ambush: +15% damage & ignores defender evasion');
  }
  if (isCliffPlunge) {
    positiveModifiers.push('Terrace Cliff Plunge: +15% downward plunge bonus');
  }

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

  // A. Gargoyle — Pyramid Terrain / Defensive Specialist
  if (attacker.type === 'gargoyle') {
    const gProf = getGargoyleTerrainProfile(attacker);
    if (gProf.isOnPyramidTerrain) {
      attackerRollBonus += 1;
      specialMultiplier *= 1 + gProf.atkBonusPercent / 100;
      positiveModifiers.push(`Gargoyle Pyramid Specialist: +${gProf.atkBonusPercent}% DMG & +1 D20 from Pyramid terrain`);
    }
  }
  if (defender.type === 'gargoyle') {
    const gDef = getGargoyleTerrainProfile(defender);
    if (gDef.isOnPyramidTerrain) {
      effectiveDefenderDef += gDef.defBonus;
      effectiveDefenderEvasion = Math.min(75, effectiveDefenderEvasion + gDef.evasionBonus);
      negativeModifiers.push(`Defender Gargoyle Stone Bulwark: +${gDef.defBonus} DEF & +${gDef.evasionBonus}% Evasion on Pyramid`);
    } else {
      effectiveDefenderEvasion = Math.max(0, effectiveDefenderEvasion + gDef.evasionBonus);
      positiveModifiers.push('Gargoyle caught on flat valley ground (-5% Evasion)');
    }
  }

  // B. Ascendant — Elevation / Advancement Specialist
  const boardSize = BOARD_SIZES[boardType] || 20;
  if (attacker.type === 'ascendant') {
    const aProf = getAscendantProfile(attacker, boardSize);
    if (aProf.atkBonus > 0) {
      effectiveAttackerAtk += aProf.atkBonus;
      effectiveAttackerCrit = Math.min(85, effectiveAttackerCrit + aProf.critBonus);
      positiveModifiers.push(`Ascendant Resonance (${aProf.stageLabel.split('·')[0].trim()}): +${aProf.atkBonus} ATK, +${aProf.critBonus}% Crit`);
    }
  }
  if (defender.type === 'ascendant') {
    const aDef = getAscendantProfile(defender, boardSize);
    if (aDef.defBonus > 0) {
      effectiveDefenderDef += aDef.defBonus;
      negativeModifiers.push(`Defender Ascendant Elevation Ward: +${aDef.defBonus} DEF`);
    }
  }

  // C. Trebuchet — Long-Range RPG Pressure Specialist
  if (attacker.type === 'trebuchet' && engageDist >= 3) {
    const tProf = getTrebuchetProfile(attacker);
    specialMultiplier *= 1 + tProf.siegeBonusPercent / 100;
    positiveModifiers.push(`Trebuchet Siege Barrage (${engageDist} tiles): +${tProf.siegeBonusPercent}% ranged impact (no counter-duel)`);
  }
  if (defender.type === 'trebuchet' && engageDist <= 2) {
    effectiveDefenderDef = Math.max(4, effectiveDefenderDef - 6);
    effectiveDefenderEvasion = 0;
    positiveModifiers.push('Trebuchet Close-Range Blind Spot (≤2 tiles): -6 DEF & 0% Evasion');
  }

  // 2. Whole-board tactical support & threats
  const attackerTactics = analyzeTacticalContext(attacker, allPieces, boardType);
  const defenderTactics = analyzeTacticalContext(defender, allPieces, boardType);

  // Friendly pieces legally supporting the target square
  if (defenderTactics.threatenedCount > 1) {
    const allySupports = defenderTactics.threatenedCount - 1;
    positiveModifiers.push(`Target square pressured by ${allySupports} other friendly attacker(s)`);
  }

  // Friendly piece guarding the defender
  let defenderGuardMultiplier = 1.0;
  if (defenderTactics.protectedCount > 0) {
    const guardedByGargoyle = defenderTactics.protectingPieceNames.includes('gargoyle');
    defenderGuardMultiplier = guardedByGargoyle ? 0.80 : 0.88;
    const protectorNames = defenderTactics.protectingPieceNames.slice(0, 2).join(', ');
    negativeModifiers.push(
      `Defender guarded by friendly ${protectorNames} (-${guardedByGargoyle ? 20 : 12}% damage taken)`
    );
  }

  // Pin status
  if (defenderTactics.isPinned) {
    positiveModifiers.push('Defender is pinned to King: severely restricted escape geometry');
  }

  // Attacker threatened status
  if (attackerTactics.threatenedCount > 0) {
    const threatNames = attackerTactics.threateningPieceNames.slice(0, 2).join(', ');
    negativeModifiers.push(`Attacker threatened by enemy ${threatNames} (pressured approach)`);
  }

  // Stat comparison notes
  if (attacker.rpg.atk > defender.rpg.def * 1.5) {
    positiveModifiers.push(`Superior ATK power (${attacker.rpg.atk} vs DEF ${defender.rpg.def})`);
  } else if (defender.rpg.def > attacker.rpg.atk * 0.9) {
    negativeModifiers.push(`Heavy armor plating (DEF ${defender.rpg.def} absorbs impact)`);
  }

  if (defender.rpg.evasion >= 25 && !isVerticalAmbush) {
    negativeModifiers.push(`High defender agility (${defender.rpg.evasion}% base evasion)`);
  }

  // 3. Exact Mathematical Permutation Simulation (20 Attacker Rolls x 20 Defender Rolls = 400 outcomes)
  let hits = 0;
  let dodges = 0;
  let crits = 0;
  let totalDamage = 0;

  let heightMultiplier = 1.0;
  if (heightDelta > 0) {
    heightMultiplier = 1.0 + Math.min(0.2, heightDelta * 0.1);
  } else if (heightDelta < 0 && !attackerIsAscendant) {
    heightMultiplier = Math.max(0.75, 1.0 + heightDelta * 0.1);
  }

  const wallAmbushMultiplier = isVerticalAmbush ? 1.15 : 1.0;
  const cliffPlungeMultiplier = isCliffPlunge ? 1.15 : 1.0;
  const defenderCoverBonus = heightDelta < 0 && !attackerIsAscendant ? 10 : 0;
  const canCrit = heightDelta >= 0 || isVerticalAmbush || attackerIsAscendant;
  const baseCritRate = (effectiveAttackerCrit + (isVerticalAmbush ? 10 : 0)) / 100;

  for (let aRoll = 1; aRoll <= 20; aRoll++) {
    const effectiveAttackerRoll = Math.max(1, Math.min(20, aRoll + attackerRollBonus));

    for (let dRoll = 1; dRoll <= 20; dRoll++) {
      const isDodged =
        !isVerticalAmbush &&
        dRoll + (effectiveDefenderEvasion + defenderCoverBonus) / 6 > 19 + heightDelta * 1.5 &&
        dRoll > effectiveAttackerRoll;

      if (isDodged) {
        dodges++;
      } else {
        hits++;
        // Crit probability for this roll
        const isCritRoll = canCrit && (effectiveAttackerRoll >= 19 || baseCritRate >= 0.5);
        if (isCritRoll) crits++;

        const critMult = isCritRoll ? 1.4 : 1.0;
        const rawDamage = Math.max(
          15,
          effectiveAttackerAtk - effectiveDefenderDef * 0.4 + effectiveAttackerRoll * 0.5
        );
        const dmg = Math.round(
          rawDamage *
            heightMultiplier *
            wallAmbushMultiplier *
            cliffPlungeMultiplier *
            specialMultiplier *
            critMult *
            defenderGuardMultiplier
        );
        totalDamage += dmg;
      }
    }
  }

  const totalPermutations = 400;
  const hitPercent = Math.round((hits / totalPermutations) * 100);
  const dodgePercent = Math.round((dodges / totalPermutations) * 100);
  const critPercent = Math.round((crits / totalPermutations) * 100);
  const expectedDamage = hits > 0 ? Math.round(totalDamage / hits) : 0;
  const isFatalExpected = expectedDamage >= defender.rpg.hp;

  const result: CombatOdds = {
    hitPercent,
    dodgePercent,
    critPercent,
    expectedDamage,
    defenderMaxHp: defender.rpg.maxHp,
    defenderCurrentHp: defender.rpg.hp,
    isFatalExpected,
    positiveModifiers,
    negativeModifiers,
    heightDelta,
    isVerticalAmbush,
    isCliffPlunge,
    attackerDiceRollBonus: attackerRollBonus,
  };

  oddsMap.set(oddsKey, result);
  return result;
}
