import {
  AIDifficulty,
  AIPlaybookEntry,
  AIPlaybookLogItem,
  ArmyDeployment,
  BoardType,
  GameLearningData,
  GameMode,
  LearnedAIWeights,
  Move,
  Piece,
  PieceColor,
  PieceType,
} from '../types/chess';
import {
  getActivePlayStyle,
  getAllValidMovesForColor,
  getCaptureThreatSquaresForPiece,
  getPieceAtPosition,
  getRawMovesForPiece,
  getValidMovesForPiece,
  hasAnyValidMoveForColor,
  isKingInCheck,
  simulateMove,
} from './moveValidation';
import { BOARD_SIZES, getVanguardMovementProfile, isSummitTile } from './pyramidBoard';
import { calculateLiveRPGOdds } from './rpgTactics';

// ==========================================
// 0. DIFFICULTY PROFILES, STRATEGIC OBJECTIVES & WHOLE-ARMY COORDINATION
// ==========================================

export type CanonicalAIDifficulty =
  | 'Beginner'
  | 'Developing'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert';

export interface AIDifficultyProfile {
  level: CanonicalAIDifficulty;
  baseSearchDepth: number;
  endgameSearchDepth: number;
  maxRootCandidates: number;
  tacticalAccuracy: number; // 0..1 scale for deeper pins/traps/counterplay
  strategicPersistence: number; // turns to maintain a productive strategic plan
  evaluationAccuracy: number; // 0..1 scale for positional/terrain nuances
  controlledVariationWindow: number; // score margin within which sound top candidates may vary
}

export function normalizeAIDifficulty(difficulty?: AIDifficulty): CanonicalAIDifficulty {
  switch (difficulty) {
    case 'Beginner':
    case 'Apprentice':
      return 'Beginner';
    case 'Developing':
    case 'Tactician':
      return 'Developing';
    case 'Intermediate':
    case 'Balanced':
      return 'Intermediate';
    case 'Advanced':
    case 'Grandmaster':
      return 'Advanced';
    case 'Expert':
    case 'Master':
    default:
      return 'Expert';
  }
}

export const AI_DIFFICULTY_PROFILES: Record<CanonicalAIDifficulty, AIDifficultyProfile> = {
  Beginner: {
    level: 'Beginner',
    baseSearchDepth: 1,
    endgameSearchDepth: 1,
    maxRootCandidates: 14,
    tacticalAccuracy: 0.45,
    strategicPersistence: 3,
    evaluationAccuracy: 0.65,
    controlledVariationWindow: 38,
  },
  Developing: {
    level: 'Developing',
    baseSearchDepth: 1,
    endgameSearchDepth: 2,
    maxRootCandidates: 18,
    tacticalAccuracy: 0.68,
    strategicPersistence: 4,
    evaluationAccuracy: 0.78,
    controlledVariationWindow: 24,
  },
  Intermediate: {
    level: 'Intermediate',
    baseSearchDepth: 2,
    endgameSearchDepth: 2,
    maxRootCandidates: 22,
    tacticalAccuracy: 0.82,
    strategicPersistence: 5,
    evaluationAccuracy: 0.88,
    controlledVariationWindow: 15,
  },
  Advanced: {
    level: 'Advanced',
    baseSearchDepth: 2,
    endgameSearchDepth: 3,
    maxRootCandidates: 26,
    tacticalAccuracy: 0.94,
    strategicPersistence: 6,
    evaluationAccuracy: 0.96,
    controlledVariationWindow: 8,
  },
  Expert: {
    level: 'Expert',
    baseSearchDepth: 2,
    endgameSearchDepth: 3,
    maxRootCandidates: 32,
    tacticalAccuracy: 1.0,
    strategicPersistence: 8,
    evaluationAccuracy: 1.0,
    controlledVariationWindow: 4,
  },
};

export type StrategicObjectiveType =
  | 'protect_king'
  | 'develop_pieces'
  | 'control_region'
  | 'secure_pyramid_route'
  | 'trap_enemy_piece'
  | 'remove_critical_defender'
  | 'coordinate_attackers'
  | 'restrict_king_escapes'
  | 'advance_pawn_promotion'
  | 'construct_mating_net';

export interface ActiveStrategicObjective {
  color: PieceColor;
  objective: StrategicObjectiveType;
  label: string;
  turnsActive: number;
  lastEvalScore: number;
  stagnantTurns: number;
}

const activeObjectivesByColor: Record<PieceColor, ActiveStrategicObjective | null> = {
  white: null,
  black: null,
};

export function getActiveStrategicObjective(color: PieceColor): ActiveStrategicObjective | null {
  return activeObjectivesByColor[color];
}

export const DEFAULT_LEARNED_WEIGHTS: LearnedAIWeights = {
  kingSafety: 1.0,
  coordination: 1.0,
  containment: 1.0,
  antiLoop: 1.0,
  terrainControl: 1.0,
  tacticalDefense: 1.0,
};

/**
 * Validates candidate learned weights before committing them to storage.
 * Prevents experimental or extreme post-game updates from corrupting the active AI.
 */
export function validateLearnedWeights(candidate?: Partial<LearnedAIWeights>): LearnedAIWeights {
  const clamp = (val: number | undefined, fallback: number) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
    return Math.max(0.85, Math.min(1.45, Number(val.toFixed(3))));
  };
  return {
    kingSafety: clamp(candidate?.kingSafety, 1.0),
    coordination: clamp(candidate?.coordination, 1.0),
    containment: clamp(candidate?.containment, 1.0),
    antiLoop: clamp(candidate?.antiLoop, 1.0),
    terrainControl: clamp(candidate?.terrainControl, 1.0),
    tacticalDefense: clamp(candidate?.tacticalDefense, 1.0),
  };
}

export interface AdvantageConversionAnalysis {
  isConversionState: boolean;
  phaseLabel: string;
  enemyNonKingCount: number;
  friendlyNonKingCount: number;
  coordinatedNetCount: number;
  kingEscapeSquares: number;
  kingEdgeDistance: number;
  cutoffDirections: string[];
  surfaceEntrancesControlled: number;
}

// Per-board-state WeakMap & Transposition caches for O(1) repeated evaluations
const conversionStateCache = new WeakMap<Piece[], Map<string, AdvantageConversionAnalysis>>();
const boardEvaluationWeakCache = new WeakMap<Piece[], Map<string, number>>();
const boardEvaluationTranspositionTable = new Map<string, number>();
const MAX_TRANSPOSITION_ENTRIES = 6000;

function computeBoardStateHash(
  pieces: Piece[],
  color: PieceColor,
  boardType: BoardType,
  mode: GameMode
): string {
  let hash = `${color}_${boardType}_${mode}|`;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.rpg.hp <= 0) continue;
    hash += `${p.id}:${p.type[0]}${p.position.x},${p.position.y},${p.position.tier || 0}${p.position.isVerticalWall ? 'W' : ''}${mode === 'rpg' ? p.rpg.hp : ''};`;
  }
  return hash;
}

/**
 * Explicit Pyramid Chess AI Doctrine — Advantage Conversion State Detection:
 * "When the opponent has few pieces remaining (or when the AI has overwhelming force),
 * stop treating every surviving enemy piece as the primary objective.
 * Coordinate the army to restrict, trap, and checkmate the King:
 * Normal game: develop -> defend -> gain position -> attack.
 * Winning conversion: contain -> coordinate -> compress -> force -> mate."
 */
export function analyzeConversionState(
  pieces: Piece[],
  aiColor: PieceColor,
  boardType: BoardType,
  computeExactEscapesWhenNormal: boolean = false
): AdvantageConversionAnalysis {
  let boardMap = conversionStateCache.get(pieces);
  if (!boardMap) {
    boardMap = new Map<string, AdvantageConversionAnalysis>();
    conversionStateCache.set(pieces, boardMap);
  }
  const cacheKey = `${aiColor}_${boardType}_${computeExactEscapesWhenNormal ? '1' : '0'}`;
  const cached = boardMap.get(cacheKey);
  if (cached) return cached;

  const oppColor: PieceColor = aiColor === 'white' ? 'black' : 'white';
  const size = BOARD_SIZES[boardType] || 20;
  const isPyramid = boardType === 'pyramid' || boardType === 'quick_pyramid';

  let myNonKingMat = 0;
  let opNonKingMat = 0;
  let friendlyNonKingCount = 0;
  let enemyNonKingCount = 0;
  let opKing: Piece | undefined;

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.rpg.hp <= 0) continue;
    if (p.type === 'king') {
      if (p.color === oppColor) opKing = p;
      continue;
    }
    const val = PIECE_VALUES[p.type] || 100;
    if (p.color === aiColor) {
      myNonKingMat += val;
      friendlyNonKingCount++;
    } else {
      opNonKingMat += val;
      enemyNonKingCount++;
    }
  }

  // Enter Advantage Conversion State when opponent is down to <= 6 non-King pieces (and AI has material parity/lead)
  // OR when AI has strong material superiority (+350 material lead or >= 1.45x enemy material)
  const isConversionState =
    friendlyNonKingCount >= 1 &&
    ((enemyNonKingCount <= 6 && myNonKingMat >= opNonKingMat) ||
      myNonKingMat >= opNonKingMat + 350 ||
      (enemyNonKingCount <= 9 && myNonKingMat >= Math.max(500, opNonKingMat * 1.45)));

  let kingEscapeSquares = 4;
  let kingEdgeDistance = 0;
  let coordinatedNetCount = 0;
  const cutoffDirections: string[] = [];
  let surfaceEntrancesControlled = 0;

  if (opKing) {
    const kx = opKing.position.x;
    const ky = opKing.position.y;

    const edgeDistX = Math.min(kx, size - 1 - kx);
    const edgeDistY = Math.min(ky, size - 1 - ky);
    kingEdgeDistance = edgeDistX + edgeDistY;

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (p.color !== aiColor || p.rpg.hp <= 0) continue;
      const dx = p.position.x - kx;
      const dy = p.position.y - ky;
      const manhattan = Math.abs(dx) + Math.abs(dy);
      const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));

      // Friendly piece in the 2..5 tile containment cordon around the enemy King
      if (chebyshev <= 5 && manhattan >= 1) {
        coordinatedNetCount++;
      }

      // Rank/File Cutoff Lines (Rook, Queen, Vanguard, Bishop, Ascendant slicing escape axes)
      // CRITICAL SUMMIT RULE: A non-Knight piece occupying the 4x4 Summit has 1-tile ordinary movement
      // and CANNOT project a multi-tile rank/file cutoff ray from the summit (chebyshev > 1).
      const pOnSummit =
        isPyramid &&
        !p.position.isVerticalWall &&
        isSummitTile(boardType, p.position.x, p.position.y);
      const vanguardMaxRange =
        p.type === 'vanguard' ? getVanguardMovementProfile(p).maxTiles : 18;
      const isLineCutter =
        !pOnSummit &&
        (p.type === 'rook' ||
          p.type === 'queen' ||
          (p.type === 'vanguard' && chebyshev <= vanguardMaxRange) ||
          (p.type === 'ascendant' && chebyshev <= 4) ||
          p.type === 'solar_queen');

      if (isLineCutter || (pOnSummit && chebyshev <= 1)) {
        if (dx === -1 && !cutoffDirections.includes('west')) cutoffDirections.push('west');
        if (dx === 1 && !cutoffDirections.includes('east')) cutoffDirections.push('east');
        if (dy === -1 && !cutoffDirections.includes('south')) cutoffDirections.push('south');
        if (dy === 1 && !cutoffDirections.includes('north')) cutoffDirections.push('north');
      }

      // Surface, Summit Exit & Route Trapping on Pyramid boards (controlling adjacent tier transitions, vertical walls, or 1-tile summit exits near King)
      if (isPyramid && chebyshev <= 3) {
        const kingOnOrNearSummit =
          !opKing.position.isVerticalWall &&
          (isSummitTile(boardType, kx, ky) || opKing.position.tier >= 2);
        if (
          p.position.isVerticalWall ||
          p.position.tier !== opKing.position.tier ||
          (kingOnOrNearSummit && chebyshev <= 2)
        ) {
          surfaceEntrancesControlled++;
        }
      }
    }

    // Only run full legal King-move simulation when in Conversion State, when friendly cordon pieces are nearby, or when explicitly requested
    if (isConversionState || computeExactEscapesWhenNormal || coordinatedNetCount >= 1) {
      kingEscapeSquares = getValidMovesForPiece(opKing, pieces, boardType, undefined, getActivePlayStyle()).length;
    }
  }

  const result: AdvantageConversionAnalysis = {
    isConversionState,
    phaseLabel: isConversionState
      ? 'Advantage Conversion: Contain → Coordinate → Compress → Force → Mate'
      : 'Normal Play: Develop → Defend → Position → Attack',
    enemyNonKingCount,
    friendlyNonKingCount,
    coordinatedNetCount,
    kingEscapeSquares,
    kingEdgeDistance,
    cutoffDirections,
    surfaceEntrancesControlled,
  };

  boardMap.set(cacheKey, result);
  return result;
}

// Dynamic piece values calibrated for standard and large-scale battlefields
const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 920,
  king: 20000,
  // Grand Pyramid 20x20 Exclusive Piece
  vanguard: 430,
  // Special pieces (if unlocked)
  gargoyle: 390,
  trebuchet: 460,
  ascendant: 410,
  // Summit Apex Ascended Pieces
  solar_queen: 1400,
  archon_templar: 1050,
  chrono_mage: 980,
  titan_golem: 1100,
};

// ==========================================
// 1. GAME LEARNING & AI CHALLENGE NOVELTY ENGINE (Memory Between Games)
// ==========================================
const LEARNING_STORAGE_KEY_PREFIX = 'ascension_ai_learning_v1_';
const STAGING_MATCH_PLAYS_KEY = 'ascension_ai_staging_plays_v1_';

export interface StagedMatchPlay {
  color: PieceColor;
  colorMoveIndex: number;
  typeMoveSig: string;
  coordMoveSig: string;
  doctrineId: string;
}

export interface StagedMatchData {
  gameKey: string;
  totalMovesRecorded: number;
  whiteDoctrineId: string;
  blackDoctrineId: string;
  plays: StagedMatchPlay[];
}

export interface StrategicChallengeDoctrine {
  id: string;
  name: string;
  shortDesc: string;
  favoredTypes: PieceType[];
  favorsClimb: boolean;
  favorsWalls: boolean;
  favorsCenter: boolean;
  favorsFlanks: boolean;
}

export const STRATEGIC_CHALLENGE_DOCTRINES: StrategicChallengeDoctrine[] = [
  {
    id: 'terrace_vanguard_blitz',
    name: 'Terrace Vanguard Blitz',
    shortDesc: 'Rapid Vanguard & Knight surges up terrace steps with Rook Exchanges.',
    favoredTypes: ['vanguard', 'knight', 'rook'],
    favorsClimb: true,
    favorsWalls: false,
    favorsCenter: true,
    favorsFlanks: false,
  },
  {
    id: 'dragon_cliff_ambush',
    name: 'Dragon Cliff Ambush',
    shortDesc: 'Gargoyles, Bishops & Ascendants perching on vertical cliff walls for flank strikes.',
    favoredTypes: ['gargoyle', 'bishop', 'ascendant'],
    favorsClimb: true,
    favorsWalls: true,
    favorsCenter: false,
    favorsFlanks: true,
  },
  {
    id: 'heavy_artillery_siege',
    name: 'Heavy File & Artillery Siege',
    shortDesc: 'Rooks, Queens & Trebuchets raking open files and bombarding enemy formations.',
    favoredTypes: ['rook', 'queen', 'trebuchet', 'solar_queen'],
    favorsClimb: false,
    favorsWalls: false,
    favorsCenter: true,
    favorsFlanks: false,
  },
  {
    id: 'summit_crown_crusade',
    name: 'Summit Crown Crusade',
    shortDesc: 'Exploits Knight summit jump supremacy and 1-tile summit exit blockades to trap high-ground foes.',
    favoredTypes: ['knight', 'gargoyle', 'ascendant', 'pawn'],
    favorsClimb: true,
    favorsWalls: false,
    favorsCenter: true,
    favorsFlanks: false,
  },
  {
    id: 'divergence_hunter_pack',
    name: 'Divergence Hunter Pack',
    shortDesc: 'Asymmetric Knight, Ascendant & Bishop double-attack forks hunting isolated targets.',
    favoredTypes: ['knight', 'ascendant', 'bishop', 'archon_templar'],
    favorsClimb: true,
    favorsWalls: true,
    favorsCenter: false,
    favorsFlanks: true,
  },
  {
    id: 'total_annihilation_phalanx',
    name: 'Total Annihilation Phalanx',
    shortDesc: 'Relentless multi-wave elimination sweep targeting wounded and high-value units.',
    favoredTypes: ['queen', 'vanguard', 'rook', 'titan_golem'],
    favorsClimb: false,
    favorsWalls: false,
    favorsCenter: true,
    favorsFlanks: true,
  },
];

let latestAIChallengeTelemetry: {
  matchGeneration: number;
  whiteDoctrineName: string;
  blackDoctrineName: string;
  pastGamePlaysBlocked: number;
  mimicMovesBlocked: number;
  whiteSurvivors: number;
  blackSurvivors: number;
  isNovelPlay: boolean;
} | null = null;

export function getLatestAIChallengeTelemetry() {
  return latestAIChallengeTelemetry;
}

export function getGameKey(boardType: BoardType, army: ArmyDeployment, mode: GameMode): string {
  return `${boardType}_${army}_${mode}`;
}

export function loadGameLearning(gameKey: string): GameLearningData {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY_PREFIX + gameKey);
    if (raw) {
      const parsed = JSON.parse(raw) as GameLearningData;
      return {
        ...parsed,
        pastGameMovesByTurn: parsed.pastGameMovesByTurn || {},
        pastOpeningSignatures: parsed.pastOpeningSignatures || [],
        lastUsedDoctrines: parsed.lastUsedDoctrines || { white: [], black: [] },
        learnedWeights: validateLearnedWeights(parsed.learnedWeights),
      };
    }
  } catch (e) {
    console.warn('Could not load AI learning data', e);
  }
  return {
    gameKey,
    gamesPlayed: 0,
    aiWins: 0,
    aiLosses: 0,
    draws: 0,
    successfulCheckmatePositions: {},
    blunderMoveKeys: {},
    highValueCaptures: {},
    summitAscensions: 0,
    pastGameMovesByTurn: {},
    pastOpeningSignatures: [],
    lastUsedDoctrines: { white: [], black: [] },
    loopOccurrences: 0,
    missedTacticsCount: 0,
    undefendedLossesCount: 0,
    loneChasingCount: 0,
    pyramidStallsCount: 0,
    stalemateDrawsCount: 0,
    unconvertedAdvantagesCount: 0,
    learnedWeights: { ...DEFAULT_LEARNED_WEIGHTS },
  };
}

export function saveGameLearning(data: GameLearningData): void {
  try {
    boardEvaluationTranspositionTable.clear();
    localStorage.setItem(LEARNING_STORAGE_KEY_PREFIX + data.gameKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save AI learning data', e);
  }
}

function loadStagedMatchData(gameKey: string): StagedMatchData | null {
  try {
    const raw = localStorage.getItem(STAGING_MATCH_PLAYS_KEY + gameKey);
    if (raw) return JSON.parse(raw) as StagedMatchData;
  } catch (e) {
    console.warn('Could not load staged match plays', e);
  }
  return null;
}

function saveStagedMatchData(data: StagedMatchData): void {
  try {
    localStorage.setItem(STAGING_MATCH_PLAYS_KEY + data.gameKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save staged match plays', e);
  }
}

/**
 * Selects distinct, non-repeating doctrines for White AI and Black AI:
 * - Neither AI can repeat the doctrine it used in the immediately preceding game.
 * - Black AI and White AI can NEVER share or copy the same doctrine in the same game.
 */
export function getActiveMatchDoctrines(learningData: GameLearningData): {
  whiteDoctrine: StrategicChallengeDoctrine;
  blackDoctrine: StrategicChallengeDoctrine;
} {
  const recentWhite = learningData.lastUsedDoctrines?.white || [];
  const recentBlack = learningData.lastUsedDoctrines?.black || [];
  const gen = learningData.gamesPlayed || 0;

  // Pick White doctrine not used by White in the last 2 games
  const whiteCandidates = STRATEGIC_CHALLENGE_DOCTRINES.filter(
    (d) => !recentWhite.slice(-2).includes(d.id)
  );
  const whitePool = whiteCandidates.length > 0 ? whiteCandidates : STRATEGIC_CHALLENGE_DOCTRINES;
  const whiteDoctrine = whitePool[gen % whitePool.length];

  // Pick Black doctrine that is NEVER the same as White's current doctrine AND not used by Black in the last 2 games
  const blackCandidates = STRATEGIC_CHALLENGE_DOCTRINES.filter(
    (d) => d.id !== whiteDoctrine.id && !recentBlack.slice(-2).includes(d.id)
  );
  const blackFallback = STRATEGIC_CHALLENGE_DOCTRINES.filter((d) => d.id !== whiteDoctrine.id);
  const blackPool = blackCandidates.length > 0 ? blackCandidates : blackFallback;
  const blackDoctrine = blackPool[(gen + 2) % blackPool.length];

  return { whiteDoctrine, blackDoctrine };
}

/**
 * Archives staged plays from a previous match into permanent GameLearningData so future matches
 * cannot repeat the same opening or turn-by-turn plays.
 */
function flushStagedMatchToHistory(gameKey: string, data: GameLearningData): GameLearningData {
  const staged = loadStagedMatchData(gameKey);
  if (!staged || staged.plays.length === 0) return data;

  const pastByTurn = { ...(data.pastGameMovesByTurn || {}) };
  for (const play of staged.plays) {
    const turnKey = `${play.color}_${play.colorMoveIndex}`;
    const existing = pastByTurn[turnKey] || [];
    if (!existing.includes(play.typeMoveSig)) {
      pastByTurn[turnKey] = [...existing, play.typeMoveSig].slice(-18);
    }
    if (!existing.includes(play.coordMoveSig)) {
      pastByTurn[turnKey] = [...pastByTurn[turnKey], play.coordMoveSig].slice(-18);
    }
  }

  const whiteOpening = staged.plays
    .filter((p) => p.color === 'white' && p.colorMoveIndex <= 4)
    .map((p) => p.typeMoveSig)
    .join('|');
  const blackOpening = staged.plays
    .filter((p) => p.color === 'black' && p.colorMoveIndex <= 4)
    .map((p) => p.typeMoveSig)
    .join('|');

  const pastOpenings = [...(data.pastOpeningSignatures || [])];
  if (whiteOpening && !pastOpenings.includes(`W:${whiteOpening}`)) {
    pastOpenings.push(`W:${whiteOpening}`);
  }
  if (blackOpening && !pastOpenings.includes(`B:${blackOpening}`)) {
    pastOpenings.push(`B:${blackOpening}`);
  }

  const prevWhiteDocs = data.lastUsedDoctrines?.white || [];
  const prevBlackDocs = data.lastUsedDoctrines?.black || [];

  const updated: GameLearningData = {
    ...data,
    gamesPlayed: data.gamesPlayed + 1,
    pastGameMovesByTurn: pastByTurn,
    pastOpeningSignatures: pastOpenings.slice(-30),
    lastUsedDoctrines: {
      white: [...prevWhiteDocs, staged.whiteDoctrineId].slice(-5),
      black: [...prevBlackDocs, staged.blackDoctrineId].slice(-5),
    },
  };

  saveGameLearning(updated);
  try {
    localStorage.removeItem(STAGING_MATCH_PLAYS_KEY + gameKey);
  } catch {
    // ignore
  }
  return updated;
}

export function recordMatchOutcome(
  boardType: BoardType,
  army: ArmyDeployment,
  mode: GameMode,
  winner: PieceColor | 'draw' | null,
  aiColor: PieceColor,
  finalMoveHistory: Move[]
): void {
  const gameKey = getGameKey(boardType, army, mode);
  let data = loadGameLearning(gameKey);

  // Flush staged match plays from this match into permanent past-game history
  data = flushStagedMatchToHistory(gameKey, data);

  // Analyze recurring weaknesses from the completed match (Directive Section 12):
  // - Repeated-position loops
  // - Failure to defend against threats (rapid consecutive captures against one side)
  // - Poor coordination / lone-piece chasing (same piece moving >= 3 times in a row without capture)
  // - Ineffective Pyramid navigation (lack of tier/summit progress on Pyramid boards)
  // - Accidental stalemates / unconverted advantages
  const moveSigs = new Map<string, number>();
  let loopMovesInGame = 0;
  let loneChasesInGame = 0;
  let consecutiveSamePiece = 0;
  let lastPieceByColor: Record<PieceColor, string> = { white: '', black: '' };
  let pyramidClimbMoves = 0;
  let undefendedRapidLosses = 0;

  for (let i = 0; i < finalMoveHistory.length; i++) {
    const mv = finalMoveHistory[i];
    if (mv.isCapture) {
      data.highValueCaptures['capture'] = (data.highValueCaptures['capture'] || 0) + 1;
      if (i >= 1 && finalMoveHistory[i - 1].isCapture) {
        undefendedRapidLosses++;
      }
    }
    if (mv.isSummitAscension || mv.to.tier >= 2 || mv.tierDelta > 0) {
      data.summitAscensions = (data.summitAscensions || 0) + 1;
      pyramidClimbMoves++;
    }

    const sig = `${mv.pieceId}:${mv.from.x},${mv.from.y}->${mv.to.x},${mv.to.y}`;
    const revSig = `${mv.pieceId}:${mv.to.x},${mv.to.y}->${mv.from.x},${mv.from.y}`;
    const prevCount = (moveSigs.get(sig) || 0) + (moveSigs.get(revSig) || 0);
    if (!mv.isCapture && prevCount >= 1) {
      loopMovesInGame++;
    }
    moveSigs.set(sig, (moveSigs.get(sig) || 0) + 1);

    const side: PieceColor = mv.pieceId.includes('white') ? 'white' : 'black';
    if (!mv.isCapture && lastPieceByColor[side] === mv.pieceId) {
      consecutiveSamePiece++;
      if (consecutiveSamePiece >= 2) {
        loneChasesInGame++;
      }
    } else {
      consecutiveSamePiece = 0;
    }
    lastPieceByColor[side] = mv.pieceId;
  }

  const currentWeights = validateLearnedWeights(data.learnedWeights);
  const candidateWeights: LearnedAIWeights = { ...currentWeights };

  if (loopMovesInGame > 0) {
    data.loopOccurrences = (data.loopOccurrences || 0) + loopMovesInGame;
    candidateWeights.antiLoop += 0.04;
    candidateWeights.coordination += 0.02;
  }
  if (loneChasesInGame > 0) {
    data.loneChasingCount = (data.loneChasingCount || 0) + loneChasesInGame;
    candidateWeights.coordination += 0.04;
    candidateWeights.containment += 0.03;
  }
  if (undefendedRapidLosses > 2) {
    data.undefendedLossesCount = (data.undefendedLossesCount || 0) + 1;
    candidateWeights.tacticalDefense += 0.03;
  }
  if (
    (boardType === 'pyramid' || boardType === 'quick_pyramid') &&
    finalMoveHistory.length >= 16 &&
    pyramidClimbMoves < 2
  ) {
    data.pyramidStallsCount = (data.pyramidStallsCount || 0) + 1;
    candidateWeights.terrainControl += 0.04;
  }

  if (winner === 'draw') {
    data.draws += 1;
    data.stalemateDrawsCount = (data.stalemateDrawsCount || 0) + 1;
    data.unconvertedAdvantagesCount = (data.unconvertedAdvantagesCount || 0) + 1;
    candidateWeights.containment += 0.05;
    candidateWeights.antiLoop += 0.04;

    // Penalize the final repeating/stalling moves of both sides so neither repeats a draw line
    const lastWhite = [...finalMoveHistory].reverse().find((m) => m.pieceId.includes('white'));
    const lastBlack = [...finalMoveHistory].reverse().find((m) => m.pieceId.includes('black'));
    if (lastWhite) {
      const bKeyW = `${lastWhite.from.x},${lastWhite.from.y}->${lastWhite.to.x},${lastWhite.to.y}`;
      data.blunderMoveKeys[bKeyW] = (data.blunderMoveKeys[bKeyW] || 0) + 1;
    }
    if (lastBlack) {
      const bKeyB = `${lastBlack.from.x},${lastBlack.from.y}->${lastBlack.to.x},${lastBlack.to.y}`;
      data.blunderMoveKeys[bKeyB] = (data.blunderMoveKeys[bKeyB] || 0) + 1;
    }
  } else if (winner === 'white' || winner === 'black') {
    if (winner === aiColor) {
      data.aiWins += 1;
    } else {
      data.aiLosses += 1;
      candidateWeights.kingSafety += 0.03;
      candidateWeights.tacticalDefense += 0.03;
    }

    // 1. Reward the winning side's decisive final checkmate / elimination move
    const winningMoves = finalMoveHistory.filter((m) => m.pieceId.includes(winner));
    const decisiveMove = winningMoves[winningMoves.length - 1] || finalMoveHistory[finalMoveHistory.length - 1];
    if (decisiveMove) {
      const posKey = `${decisiveMove.to.x}_${decisiveMove.to.y}`;
      data.successfulCheckmatePositions[posKey] = (data.successfulCheckmatePositions[posKey] || 0) + 1;
    }

    // 2. Teach the defeated side to avoid the final blunder sequence that led to its loss
    const defeatedColor: PieceColor = winner === 'white' ? 'black' : 'white';
    const defeatedMoves = finalMoveHistory.filter((m) => m.pieceId.includes(defeatedColor));
    const lastDefeatedMoves = defeatedMoves.slice(-2);
    for (const badMove of lastDefeatedMoves) {
      const blunderKey = `${badMove.from.x},${badMove.from.y}->${badMove.to.x},${badMove.to.y}`;
      data.blunderMoveKeys[blunderKey] = (data.blunderMoveKeys[blunderKey] || 0) + 1;
    }
  }

  // Validate learned weights before saving so invalid/unbounded parameters never corrupt active play
  data.learnedWeights = validateLearnedWeights(candidateWeights);
  saveGameLearning(data);

  // Also credit the AI Playbook maneuvers used in winning matches
  if (winner && winner !== 'draw') {
    creditPlaybookForWin(winner, boardType);
  }
}

// ==========================================
// 1B. AI STRATEGIC PLAYBOOK & WINNING LOG
//     (Builds on Classical Chess & Expands to All 4 Fields)
// ==========================================
const PLAYBOOK_STORAGE_KEY = 'ascension_ai_playbook_v2';
const PLAYBOOK_LOG_STORAGE_KEY = 'ascension_ai_playbook_log_v2';

export const DEFAULT_AI_PLAYBOOK: AIPlaybookEntry[] = [
  {
    id: 'italian_ziggurat',
    name: 'Italian Terrace Surge (Giuoco Piano 3D)',
    field: 'all',
    phase: 'opening',
    chessFoundation: 'Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4)',
    sequenceDescription:
      'Mobilizes Knights and Bishops into central files and Tier-1 terraces to target weak f2/f7 kingside squares across 8×8, 12×12, and 20×20 fields.',
    timesExecuted: 14,
    winsGenerated: 11,
    winRateBonus: 65,
  },
  {
    id: 'sicilian_dragon_perch',
    name: 'Sicilian Dragon Cliff Fianchetto',
    field: 'all',
    phase: 'opening',
    chessFoundation: 'Sicilian Dragon (1.e4 c5 2.Nf3 d6 3.g6 Bg7)',
    sequenceDescription:
      'Fianchettos Bishops, Gargoyles, and Ascendants onto high terraces or vertical cliff walls to rake the longest diagonal toward the enemy camp.',
    timesExecuted: 12,
    winsGenerated: 9,
    winRateBonus: 70,
  },
  {
    id: 'ruy_lopez_siege',
    name: 'Ruy Lopez Pin & Open-File Siege',
    field: 'all',
    phase: 'opening',
    chessFoundation: 'Ruy Lopez / Spanish Torture (Bb5 pinning Knight)',
    sequenceDescription:
      'Pins enemy Knights and Vanguards along extended diagonal rays while Rooks double up to strip defenders off the central corridors.',
    timesExecuted: 10,
    winsGenerated: 8,
    winRateBonus: 60,
  },
  {
    id: 'queens_gambit_summit',
    name: "Queen's Gambit Summit Domination",
    field: 'quick_pyramid',
    phase: 'opening',
    chessFoundation: "Queen's Gambit (1.d4 d5 2.c4 central tempo break)",
    sequenceDescription:
      'Trades flank pawns to pry open central approaches and ascend the 4×4 Summit Apex for +30% high-ground strike supremacy.',
    timesExecuted: 16,
    winsGenerated: 13,
    winRateBonus: 85,
  },
  {
    id: 'kings_indian_vanguard',
    name: "King's Indian Vanguard-Rook Swap Blitz",
    field: 'pyramid',
    phase: 'special_3d',
    chessFoundation: "King's Indian Attack + Hypermodern Rook Lift",
    sequenceDescription:
      'Advances Vanguards past the midline on 20×20 battlefields, then executes the Vanguard ⇄ Rook Exchange to teleport heavy Rooks straight into the enemy flank.',
    timesExecuted: 9,
    winsGenerated: 8,
    winRateBonus: 95,
  },
  {
    id: 'royal_knight_fork',
    name: 'Multi-Tier Royal Fork & Divergence',
    field: 'all',
    phase: 'middlegame',
    chessFoundation: 'Classical Knight Fork & Double Attack',
    sequenceDescription:
      'Leaps Knights, Queens, or Ascendants onto elevated pivot squares that simultaneously threaten two enemy pieces, forcing guaranteed material elimination.',
    timesExecuted: 19,
    winsGenerated: 16,
    winRateBonus: 90,
  },
  {
    id: 'alekhine_battery_bombard',
    name: "Alekhine's Gun & Artillery Bombardment",
    field: 'all',
    phase: 'middlegame',
    chessFoundation: "Alekhine's Gun (Stacked Rooks + Queen Battery)",
    sequenceDescription:
      'Aligns Queens, Rooks, Bishops, and Trebuchets along open files and terrace ridges to systematically annihilate enemy blockers.',
    timesExecuted: 15,
    winsGenerated: 12,
    winRateBonus: 80,
  },
  {
    id: 'relentless_attrition_sweep',
    name: "Capablanca's Total Board-Clearance Sweep",
    field: 'all',
    phase: 'endgame',
    chessFoundation: 'Capablanca Simplification & Piece Liquidation Doctrine',
    sequenceDescription:
      'Hunts down and eliminates every remaining enemy piece off the board using numerical superiority, refusing passive shuffles or repetition ties.',
    timesExecuted: 24,
    winsGenerated: 22,
    winRateBonus: 125,
  },
  {
    id: 'staircase_ladder_mate',
    name: 'Staircase Cordon & No-Stalemate Mate Net',
    field: 'all',
    phase: 'endgame',
    chessFoundation: 'Classical Two-Rook Ladder Mate & King Opposition',
    sequenceDescription:
      'Constricts the enemy King rank-by-rank and tier-by-tier while preserving checkmate geometry and avoiding stalemate traps.',
    timesExecuted: 18,
    winsGenerated: 17,
    winRateBonus: 140,
  },
  {
    id: 'coordinated_containment_herding',
    name: 'Coordinated Containment & Territory Compression (Herding Over Chasing)',
    field: 'all',
    phase: 'endgame',
    chessFoundation: 'Box-Compression Mating Net & Cutoff Barriers',
    sequenceDescription:
      'Refuses pointless one-piece checks that let the King run; instead coordinates multiple pieces to cut off files, ranks, and Pyramid surface routes before delivering checkmate.',
    timesExecuted: 21,
    winsGenerated: 20,
    winRateBonus: 155,
  },
  {
    id: 'surface_bound_transition_mastery',
    name: 'Surface-Bound Plane Transition & Summit Color Release',
    field: 'pyramid',
    phase: 'special_3d',
    chessFoundation: 'Outpost Infiltration + Color-Complex Liberation',
    sequenceDescription:
      'In Surface Bound mode, transitions sliding units into the enemy surface plane before striking, and drives Knights to the 4×4 Summit to permanently unlock both checker colors.',
    timesExecuted: 11,
    winsGenerated: 10,
    winRateBonus: 115,
  },
];

let cachedPlaybookMemory: AIPlaybookEntry[] | null = null;

export function loadAIPlaybook(): AIPlaybookEntry[] {
  if (cachedPlaybookMemory) return cachedPlaybookMemory;
  try {
    const raw = localStorage.getItem(PLAYBOOK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AIPlaybookEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedPlaybookMemory = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load AI playbook', e);
  }
  cachedPlaybookMemory = DEFAULT_AI_PLAYBOOK.map((entry) => ({ ...entry }));
  return cachedPlaybookMemory;
}

export function saveAIPlaybook(entries: AIPlaybookEntry[]): void {
  cachedPlaybookMemory = entries;
  try {
    localStorage.setItem(PLAYBOOK_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save AI playbook', e);
  }
}

export function loadAIPlaybookLogs(): AIPlaybookLogItem[] {
  try {
    const raw = localStorage.getItem(PLAYBOOK_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AIPlaybookLogItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load AI playbook logs', e);
  }
  return [];
}

export function classifyMovePlaybook(
  move: Move,
  pieces: Piece[],
  boardType: BoardType,
  turnCount: number = 1
): AIPlaybookEntry {
  const playbook = loadAIPlaybook();
  const byId = (id: string) => playbook.find((p) => p.id === id) || playbook[0];

  const mover = pieces.find((p) => p.id === move.pieceId);
  const oppColor: PieceColor = mover?.color === 'white' ? 'black' : 'white';
  const enemyPieces = pieces.filter((p) => p.color === oppColor && p.rpg.hp > 0);

  if (move.isRookExchange) {
    return byId('kings_indian_vanguard');
  }

  if (move.isBombard) {
    return byId('alekhine_battery_bombard');
  }

  // Endgame / Advantage Conversion State -> Coordinated Containment, Attrition Sweep, or Staircase Mate Net
  const conv = analyzeConversionState(pieces, mover?.color || 'black', boardType);
  if (conv.isConversionState || enemyPieces.length <= 7) {
    if (move.isCapture) {
      return byId('relentless_attrition_sweep');
    }
    if (conv.coordinatedNetCount >= 2 || conv.cutoffDirections.length >= 1) {
      return byId('coordinated_containment_herding');
    }
    return byId('staircase_ladder_mate');
  }

  // Direct capture -> Total Board-Clearance Sweep or Royal Fork
  if (move.isCapture) {
    if (mover?.type === 'knight' || mover?.type === 'ascendant' || mover?.type === 'queen') {
      return byId('royal_knight_fork');
    }
    return byId('relentless_attrition_sweep');
  }

  // Summit or high-tier ascent
  if (isSummitTile(boardType, move.to.x, move.to.y) || move.tierDelta > 0) {
    if (mover?.type === 'bishop' || mover?.type === 'gargoyle' || move.to.isVerticalWall) {
      return byId('sicilian_dragon_perch');
    }
    return byId('queens_gambit_summit');
  }

  if (move.to.isVerticalWall) {
    if (getActivePlayStyle() === 'surface_bound') {
      return byId('surface_bound_transition_mastery');
    }
    return byId('sicilian_dragon_perch');
  }

  if (getActivePlayStyle() === 'surface_bound' && mover?.type === 'knight' && isSummitTile(boardType, move.to.x, move.to.y)) {
    return byId('surface_bound_transition_mastery');
  }

  // Opening phase (first 14 turns)
  if (turnCount <= 14) {
    if (mover?.type === 'knight' || mover?.type === 'bishop') {
      return byId('italian_ziggurat');
    }
    if (mover?.type === 'rook' || mover?.type === 'vanguard') {
      return byId('ruy_lopez_siege');
    }
    return byId('queens_gambit_summit');
  }

  if (mover?.type === 'rook' || mover?.type === 'queen' || mover?.type === 'trebuchet') {
    return byId('alekhine_battery_bombard');
  }

  return byId('royal_knight_fork');
}

export function recordPlaybookExecution(
  move: Move,
  pieces: Piece[],
  boardType: BoardType,
  turnCount: number,
  actionSummary: string
): AIPlaybookEntry {
  const playbook = loadAIPlaybook();
  const matched = classifyMovePlaybook(move, pieces, boardType, turnCount);
  const mover = pieces.find((p) => p.id === move.pieceId);
  const aiColor: PieceColor = mover?.color || 'black';
  const oppColor: PieceColor = aiColor === 'white' ? 'black' : 'white';
  const remainingEnemies = pieces.filter((p) => p.color === oppColor && p.rpg.hp > 0).length - (move.isCapture ? 1 : 0);

  const updated = playbook.map((entry) => {
    if (entry.id === matched.id) {
      const nextExec = entry.timesExecuted + 1;
      const nextWins = move.isCapture ? entry.winsGenerated + 1 : entry.winsGenerated;
      return {
        ...entry,
        timesExecuted: nextExec,
        winsGenerated: nextWins,
        winRateBonus: Math.min(220, entry.winRateBonus + (move.isCapture ? 4 : 2)),
        lastUsedTurn: turnCount,
      };
    }
    return entry;
  });
  saveAIPlaybook(updated);

  const updatedEntry = updated.find((e) => e.id === matched.id) || matched;

  try {
    const logs = loadAIPlaybookLogs();
    const newLog: AIPlaybookLogItem = {
      id: `pblog_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      turn: turnCount,
      aiColor,
      boardType,
      maneuverId: updatedEntry.id,
      maneuverName: updatedEntry.name,
      chessFoundation: updatedEntry.chessFoundation,
      actionSummary,
      remainingEnemyPieces: Math.max(0, remainingEnemies),
      timestamp: Date.now(),
    };
    const nextLogs = [newLog, ...logs].slice(0, 30);
    localStorage.setItem(PLAYBOOK_LOG_STORAGE_KEY, JSON.stringify(nextLogs));
  } catch (e) {
    console.warn('Could not save AI playbook log item', e);
  }

  return updatedEntry;
}

function creditPlaybookForWin(winnerColor: PieceColor, boardType: BoardType): void {
  const playbook = loadAIPlaybook();
  const updated = playbook.map((entry) => {
    if (entry.field === 'all' || entry.field === boardType) {
      return {
        ...entry,
        winsGenerated: entry.winsGenerated + 1,
        winRateBonus: Math.min(250, entry.winRateBonus + 6),
      };
    }
    return entry;
  });
  saveAIPlaybook(updated);
}

// ==========================================
// 2. CHESS POSITION EVALUATION
// ==========================================

export function evaluateBoard(
  pieces: Piece[],
  color: PieceColor,
  boardType: BoardType,
  mode: GameMode,
  learningData?: GameLearningData
): number {
  let weakMap = boardEvaluationWeakCache.get(pieces);
  if (!weakMap) {
    weakMap = new Map<string, number>();
    boardEvaluationWeakCache.set(pieces, weakMap);
  }
  const lwSig = learningData?.learnedWeights
    ? `_${learningData.learnedWeights.containment}_${learningData.learnedWeights.coordination}`
    : '';
  const weakKey = `${color}_${boardType}_${mode}${lwSig}`;
  const weakCached = weakMap.get(weakKey);
  if (weakCached !== undefined) {
    return weakCached;
  }

  const stateHash = computeBoardStateHash(pieces, color, boardType, mode) + lwSig;
  const transCached = boardEvaluationTranspositionTable.get(stateHash);
  if (transCached !== undefined) {
    weakMap.set(weakKey, transCached);
    return transCached;
  }

  const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';

  let myScore = 0;
  let opScore = 0;

  const myKing = pieces.find((p) => p.color === color && p.type === 'king' && p.rpg.hp > 0);
  const opKing = pieces.find((p) => p.color === opponentColor && p.type === 'king' && p.rpg.hp > 0);

  // If enemy king is dead (RPG mode victory), massive reward
  if (!opKing) return 99999;
  if (!myKing) return -99999;

  // Immediate check evaluation (Hierarchy #2: Prevent own checkmate, Hierarchy #8: Productive vs. Chasing Checks)
  if (isKingInCheck(color, pieces, boardType)) {
    myScore -= 320; // Urgently defend own king!
  }

  const isPyramid = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const convState = analyzeConversionState(pieces, color, boardType);

  if (isKingInCheck(opponentColor, pieces, boardType)) {
    if (convState.isConversionState) {
      if (convState.kingEscapeSquares === 0) {
        myScore += 50000; // Checkmate!
      } else if (convState.kingEscapeSquares === 1) {
        myScore += 360; // Productive forcing check (only 1 forced reply)
      } else if (convState.kingEscapeSquares <= 3 && convState.coordinatedNetCount >= 2) {
        myScore += 180; // Coordinated tightening check
      } else {
        myScore += 45; // Check still applies pressure
      }
    } else {
      myScore += 110;
    }
  }

  for (const piece of pieces) {
    if (piece.rpg.hp <= 0) continue;

    const isMine = piece.color === color;
    let pieceVal = PIECE_VALUES[piece.type] || 100;

    // In RPG mode, scale value with remaining health
    if (mode === 'rpg') {
      const hpRatio = piece.rpg.hp / piece.rpg.maxHp;
      pieceVal = pieceVal * (0.35 + 0.65 * hpRatio);
    }

    let posBonus = 0;

    // A. Center & Terrace Influence
    if (boardType === 'classic') {
      // 8x8 classic center tiles (x: 3, 4; y: 3, 4)
      const distFromCenter = Math.abs(piece.position.x - 3.5) + Math.abs(piece.position.y - 3.5);
      posBonus += (7 - distFromCenter) * 6;
    } else if (isPyramid) {
      // Tier bonus: Each step up the ziggurat yields line-of-sight & height superiority
      posBonus += piece.position.tier * 45;

      // 4x4 Summit Tactical Region Evaluation:
      // - Every non-Knight piece occupying the summit has 1-tile ordinary movement in 8 directions.
      // - The Knight retains its distinct multi-tile summit jump advantage (and unlocks Color Release in Surface Bound).
      // - Pawns do NOT promote on the summit, but serve as 8-direction blockers and forward-diagonal sentinels.
      // - Long-range sliders (Queen, Rook, Bishop, uncontracted Vanguard) self-throttle to 1 tile if parked on an uncontested summit!
      if (!piece.position.isVerticalWall && isSummitTile(boardType, piece.position.x, piece.position.y)) {
        if (piece.type === 'knight') {
          posBonus += 165; // Distinct Knight summit mobility advantage!
        } else {
          // Check if this summit piece is actively blocking/trapping an enemy or defending an ally near the summit
          let nearbyEnemyCount = 0;
          let nearbyFriendlyOnSummit = 0;
          for (let j = 0; j < pieces.length; j++) {
            const other = pieces[j];
            if (other.id === piece.id || other.rpg.hp <= 0) continue;
            const cheb = Math.max(
              Math.abs(other.position.x - piece.position.x),
              Math.abs(other.position.y - piece.position.y)
            );
            if (other.color !== piece.color && cheb <= 2) {
              nearbyEnemyCount++;
            } else if (
              other.color === piece.color &&
              !other.position.isVerticalWall &&
              isSummitTile(boardType, other.position.x, other.position.y) &&
              cheb <= 1
            ) {
              nearbyFriendlyOnSummit++;
            }
          }

          if (nearbyEnemyCount > 0) {
            // Controlling summit exits, blocking enemy path, or trapping an enemy on the summit
            posBonus += 95 + Math.min(2, nearbyEnemyCount) * 30;
          }
          if (nearbyFriendlyOnSummit > 0) {
            // Mutual 1-tile summit defense formation
            posBonus += 45;
          }

          if (piece.type === 'pawn') {
            // Pawn gains 8-direction non-capture maneuverability on the summit while guarding 2 forward diagonals
            posBonus += 65;
          } else if (piece.type === 'vanguard') {
            const vProf = getVanguardMovementProfile(piece);
            if (vProf.maxTiles === 1) {
              // Contracted 1-tile Vanguard upgrades from 1-dir forward-only to all 8 directions on the summit!
              posBonus += 75;
            } else if (nearbyEnemyCount === 0) {
              posBonus -= 45;
            }
          } else if (
            (piece.type === 'queen' || piece.type === 'rook' || piece.type === 'bishop') &&
            nearbyEnemyCount === 0
          ) {
            // Long-range slider sitting on an uncontested summit has its 13-25 tile ray disabled down to 1 tile
            posBonus -= 55;
          } else {
            posBonus += 50;
          }
        }
      }

      // Vertical wall perch ambush potential
      if (piece.position.isVerticalWall) {
        posBonus += 25;
      }
    } else {
      // 20x20 Battlefield: reward mobile pieces controlling central ranks
      const distFromCenter = Math.abs(piece.position.x - 9.5) + Math.abs(piece.position.y - 9.5);
      posBonus += (19 - distFromCenter) * 3;
    }

    // B. King Hunter / King Pressure:
    // Reward pieces advancing closer to the enemy king ring
    const enemyKingTarget = isMine ? opKing : myKing;
    if (enemyKingTarget) {
      const distToEnemyKing =
        Math.abs(piece.position.x - enemyKingTarget.position.x) +
        Math.abs(piece.position.y - enemyKingTarget.position.y);

      if (piece.type === 'queen' || piece.type === 'rook' || piece.type === 'bishop' || piece.type === 'knight' || piece.type === 'vanguard') {
        posBonus += Math.max(0, 16 - distToEnemyKing) * 8;
      }
    }

    // B2. Vanguard Rapid Deployment Bonus (reward advancing Vanguard toward terraces to set up Rook Exchange)
    if (piece.type === 'vanguard') {
      const forwardProgress =
        piece.color === 'white'
          ? piece.position.y
          : 19 - piece.position.y;
      posBonus += forwardProgress * 12;
      if (piece.position.isVerticalWall) {
        posBonus += 35; // Lateral wall maneuverability bonus
      }
    }

    // B3. Grand Pyramid RPG-Exclusive Specialists (Gargoyle, Ascendant, Trebuchet)
    if (piece.type === 'gargoyle') {
      if (piece.position.isVerticalWall) {
        posBonus += 65; // Wall & cliff perching specialist
      } else if (piece.position.tier >= 1) {
        posBonus += piece.position.tier * 35; // Elevated terrace defender
      }
    } else if (piece.type === 'ascendant') {
      const forwardProgress =
        piece.color === 'white' ? piece.position.y : 19 - piece.position.y;
      posBonus += piece.position.tier * 40 + forwardProgress * 10;
    } else if (piece.type === 'trebuchet') {
      posBonus += piece.position.tier * 30; // Elevated artillery firing platform
    }

    // C. Own King Guard / Safety:
    // Reward friendly knights, rooks, bishops staying close enough to protect own king
    const ownKingTarget = isMine ? myKing : opKing;
    if (ownKingTarget && piece.id !== ownKingTarget.id) {
      const distToOwnKing =
        Math.abs(piece.position.x - ownKingTarget.position.x) +
        Math.abs(piece.position.y - ownKingTarget.position.y);
      if (distToOwnKing <= 3) {
        posBonus += 20; // Guarding king
      }
    }

    // D. Pawn Advancement & Opposite Back-Rank Promotion Threat
    // Rule: Pawns promote ONLY on the opposite back rank — NEVER merely by reaching the 4x4 Summit.
    if (piece.type === 'pawn') {
      const maxCoord = boardType === 'classic' ? 7 : boardType === 'quick_pyramid' ? 11 : 19;
      const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
      const forwardProgress =
        facing === 'north'
          ? piece.position.y
          : facing === 'south'
          ? maxCoord - piece.position.y
          : facing === 'east'
          ? piece.position.x
          : maxCoord - piece.position.x;
      posBonus += forwardProgress * 14;
      if (forwardProgress >= maxCoord - 2) {
        posBonus += (forwardProgress - (maxCoord - 3)) * 55; // Approaching true back-rank promotion
      }
    }

    // D2. Surface Bound Play Style Heuristics (Summit Color Release & Same-Surface Alignment)
    if (getActivePlayStyle() === 'surface_bound' && (boardType === 'pyramid' || boardType === 'quick_pyramid')) {
      if (piece.type === 'knight') {
        if (piece.colorReleased) {
          posBonus += 95; // Permanent dual-color jumper freedom unlocked!
        } else {
          // Encourage climbing toward the 4x4 Summit to unlock Color Release
          posBonus += piece.position.tier * 28;
        }
      }
      if (enemyKingTarget && Boolean(piece.position.isVerticalWall) === Boolean(enemyKingTarget.position.isVerticalWall)) {
        posBonus += 30; // Same combat surface plane as enemy King
      }
    }

    if (isMine) {
      myScore += pieceVal + posBonus;
    } else {
      opScore += pieceVal + posBonus;
    }
  }

  // E0. SUMMIT MOBILITY TRAP & EXIT-CONTROL EVALUATION (Pyramid Boards)
  // Because every non-Knight piece on the 4x4 Summit is limited to 1-tile ordinary movement,
  // surrounding or blocking the 1-tile exits of an enemy piece on the summit traps it!
  if (isPyramid) {
    for (let i = 0; i < pieces.length; i++) {
      const ep = pieces[i];
      if (ep.color !== opponentColor || ep.rpg.hp <= 0 || ep.type === 'knight') continue;
      if (ep.position.isVerticalWall || !isSummitTile(boardType, ep.position.x, ep.position.y)) {
        continue;
      }
      // Count how many friendly pieces are within 1-2 tiles sealing this summit piece's 1-tile exits
      let exitControllers = 0;
      for (let j = 0; j < pieces.length; j++) {
        const fp = pieces[j];
        if (fp.color !== color || fp.rpg.hp <= 0) continue;
        const cheb = Math.max(
          Math.abs(fp.position.x - ep.position.x),
          Math.abs(fp.position.y - ep.position.y)
        );
        if (cheb <= 2) {
          exitControllers++;
        }
      }
      if (exitControllers > 0) {
        const trapBonus =
          ep.type === 'king'
            ? exitControllers * 110 + (exitControllers >= 2 ? 180 : 0)
            : exitControllers * 55 + (exitControllers >= 2 ? 95 : 0);
        myScore += trapBonus;
      }
    }
  }
  // 1. Forced checkmate | 2. Prevent own forced checkmate | 3. Build/maintain a mating net
  // 4. Restrict enemy King mobility | 5. Prevent escape from containment | 6. Coordinate additional attackers
  // 7. Remove critical defenders | 8. Give productive checks | 9. Improve attack position | 10. Gain material
  const aliveFriendly = pieces.filter((p) => p.color === color && p.rpg.hp > 0);
  const aliveEnemies = pieces.filter((p) => p.color === opponentColor && p.rpg.hp > 0);
  // Strong board-clearance drive (+320 per enemy eliminated) paired with friendly survival (+140)
  myScore += (24 - aliveEnemies.length) * 320 + aliveFriendly.length * 140;

  if (convState.isConversionState && opKing) {
    // Hierarchy #3 & #6: Build/Maintain a Mating Net & Coordinate Additional Attackers
    // Strongly reward bringing 2nd, 3rd, and 4th friendly pieces into the 2..5 tile containment cordon!
    myScore += convState.coordinatedNetCount * 175;
    if (convState.coordinatedNetCount >= 3) {
      myScore += 290; // Multi-piece mating net established
    }

    // Hierarchy #4: Restrict Enemy King Mobility (Directly reward fewer legal escape moves!)
    const restrictedSquares = Math.max(0, 8 - convState.kingEscapeSquares);
    myScore += restrictedSquares * 165;
    if (convState.kingEscapeSquares === 1) {
      myScore += 340; // Enemy King reduced to a single legal square!
    } else if (convState.kingEscapeSquares === 2) {
      myScore += 190;
    }

    // Hierarchy #5: Prevent Escape from Containment (Rank/File Cutoffs, Territory Box Compression & Surface Trapping)
    // Reward pushing the enemy King toward board edges/corners (shrinking its territory box)
    const boardSize = BOARD_SIZES[boardType] || 20;
    const maxEdgeDist = boardSize - 2;
    myScore += Math.max(0, maxEdgeDist - convState.kingEdgeDistance) * 60;

    // Reward Rook/Queen/Vanguard/Bishop rank & file cutoff barriers slicing escape directions
    myScore += convState.cutoffDirections.length * 150;

    // Pyramid Surface & Route Trapping: controlling horizontal <-> vertical transitions near the enemy King
    if (isPyramid) {
      myScore += convState.surfaceEntrancesControlled * 105;
    }

    // Hierarchy #9: Approach — Pull lagging friendly pieces (and friendly King when safe) toward the enemy King's sector
    for (const friend of aliveFriendly) {
      const distToOpKing =
        Math.abs(friend.position.x - opKing.position.x) +
        Math.abs(friend.position.y - opKing.position.y);
      if (friend.type === 'king') {
        // In low-piece endgames, bring own King to opposition distance (2..4 tiles) to seal escape squares
        if (convState.enemyNonKingCount <= 2) {
          myScore += Math.max(0, 18 - distToOpKing) * 24;
        }
      } else {
        // Pull every non-King piece into the coordinated net so lagging units don't sit idle while one piece chases!
        myScore += Math.max(0, 24 - distToOpKing) * 28;
      }
    }
  } else if (aliveEnemies.length > 0) {
    // Normal Game Aggressive Engagement & Convergence
    for (const friend of aliveFriendly) {
      if (friend.type === 'king' && aliveEnemies.length > 5) continue;
      let minEnemyDist = 999;
      for (const enemy of aliveEnemies) {
        const d =
          Math.abs(friend.position.x - enemy.position.x) +
          Math.abs(friend.position.y - enemy.position.y);
        if (d < minEnemyDist) minEnemyDist = d;
      }
      myScore += Math.max(0, 26 - minEnemyDist) * (aliveEnemies.length <= 8 ? 18 : 10);
    }
  }

  // G. Learned Experience & Validated Adaptive Weights adjustment
  if (learningData) {
    const lw = validateLearnedWeights(learningData.learnedWeights);
    if (opKing) {
      const targetKey = `${opKing.position.x}_${opKing.position.y}`;
      if (learningData.successfulCheckmatePositions[targetKey]) {
        myScore += Math.min(80, learningData.successfulCheckmatePositions[targetKey] * 15);
      }
    }
    if (convState.isConversionState) {
      myScore += Math.round((lw.containment - 1.0) * 280 + (lw.coordination - 1.0) * 220);
    }
  }

  const finalScore = myScore - opScore;
  weakMap.set(weakKey, finalScore);
  if (boardEvaluationTranspositionTable.size >= MAX_TRANSPOSITION_ENTRIES) {
    boardEvaluationTranspositionTable.clear();
  }
  boardEvaluationTranspositionTable.set(stateHash, finalScore);
  return finalScore;
}

// ==========================================
// 3. MOVE SIMULATION (Re-exported from moveValidation for single source of truth)
// ==========================================

export { simulateMove };

// ==========================================
// 4. MOVE ORDERING (For High-Performance Alpha-Beta)
// ==========================================

function scoreMoveForOrdering(
  move: Move,
  pieces: Piece[],
  moverColor: PieceColor,
  boardType: BoardType = 'pyramid'
): number {
  let score = 0;
  const attacker = pieces.find((p) => p.id === move.pieceId);
  const attackerVal = attacker ? PIECE_VALUES[attacker.type] || 100 : 100;
  const oppColor: PieceColor = moverColor === 'white' ? 'black' : 'white';
  const enemyKing = pieces.find((p) => p.color === oppColor && p.type === 'king' && p.rpg.hp > 0);
  const size = BOARD_SIZES[boardType] || 20;
  const center = (size - 1) / 2;

  // 1. Captures (MVV-LVA: Most Valuable Victim - Least Valuable Attacker) & Bombardment Knockbacks
  if (move.isBombard) {
    let victimVal = 150;
    if (move.capturedPieceId) {
      const victim = pieces.find((p) => p.id === move.capturedPieceId);
      if (victim) victimVal = PIECE_VALUES[victim.type] || 150;
    }
    score += 380 + Math.min(400, victimVal);
  } else if (move.isCapture) {
    let victimVal = 100;
    if (move.capturedPieceId) {
      const victim = pieces.find((p) => p.id === move.capturedPieceId);
      if (victim) victimVal = PIECE_VALUES[victim.type] || 100;
    } else {
      const victim = getPieceAtPosition(pieces, move.to);
      if (victim) victimVal = PIECE_VALUES[victim.type] || 100;
    }

    score += 1200 + (victimVal * 10 - attackerVal);
  }

  // 2. Back-Rank Pawn Promotion moves (Pawns do NOT promote on the 4x4 Summit)
  if (move.promotionType) {
    score += 900;
  }

  // 3. High ground & Summit tactical evaluation
  if (move.tierDelta > 0) {
    score += move.tierDelta * 75;
  }
  const destOnSummit = !move.to.isVerticalWall && isSummitTile(boardType, move.to.x, move.to.y);
  const origOnSummit = !move.from.isVerticalWall && isSummitTile(boardType, move.from.x, move.from.y);
  if (destOnSummit) {
    if (attacker?.type === 'knight') {
      // Knight retains full jump mobility on the summit (and unlocks Color Release in Surface Bound)
      score += getActivePlayStyle() === 'surface_bound' && !attacker.colorReleased ? 300 : 220;
    } else if (
      attacker &&
      (attacker.type === 'queen' || attacker.type === 'rook' || attacker.type === 'bishop') &&
      !move.isCapture
    ) {
      // Long-range slider stepping onto the summit loses multi-tile ray range unless contesting a nearby enemy
      const nearEnemyKing =
        enemyKing &&
        Math.max(Math.abs(move.to.x - enemyKing.position.x), Math.abs(move.to.y - enemyKing.position.y)) <= 2;
      score += nearEnemyKing ? 90 : -80;
    } else {
      score += 85;
    }
  } else if (
    origOnSummit &&
    attacker &&
    (attacker.type === 'queen' || attacker.type === 'rook' || attacker.type === 'bishop')
  ) {
    // Stepping off the summit onto Tier 2 restores a slider's 13-25 tile ray mobility on the next turn
    score += 110;
  }

  // 4. Prioritize Tactical & Major/Minor Piece Development over random flank pawn pushes
  if (attacker) {
    if (
      attacker.type === 'knight' ||
      attacker.type === 'bishop' ||
      attacker.type === 'vanguard' ||
      attacker.type === 'ascendant' ||
      attacker.type === 'gargoyle'
    ) {
      score += !attacker.hasMoved ? 95 : 55;
    } else if (
      attacker.type === 'queen' ||
      attacker.type === 'rook' ||
      attacker.type === 'trebuchet' ||
      attacker.type === 'solar_queen' ||
      attacker.type === 'archon_templar' ||
      attacker.type === 'chrono_mage' ||
      attacker.type === 'titan_golem'
    ) {
      score += 70;
    } else if (attacker.type === 'pawn') {
      // Central pawns are much stronger than edge pawns
      const fileCenterDist = Math.abs(move.to.x - center);
      score += Math.max(0, 35 - fileCenterDist * 6);
    }

    // Reward closing distance to the enemy King or central high ground
    if (enemyKing && attacker.type !== 'king') {
      const distBefore =
        Math.abs(move.from.x - enemyKing.position.x) + Math.abs(move.from.y - enemyKing.position.y);
      const distAfter =
        Math.abs(move.to.x - enemyKing.position.x) + Math.abs(move.to.y - enemyKing.position.y);
      if (distAfter < distBefore) {
        score += (distBefore - distAfter) * 18;
      }
    }
  }

  // 5. Strategic Rook Exchange (when Vanguard is advanced and transports a back-rank Rook forward)
  if (move.isRookExchange) {
    const vanguardForward = moverColor === 'white' ? move.from.y : size - 1 - move.from.y;
    const rookForward = moverColor === 'white' ? move.to.y : size - 1 - move.to.y;
    if (vanguardForward > rookForward + 3) {
      score += (vanguardForward - rookForward) * 40;
    } else {
      score -= 120; // Discourage pointless back-rank exchanges
    }
  }

  return score;
}

// ==========================================
// 5. MINIMAX ENGINE WITH ALPHA-BETA PRUNING & LAZY MOVE VALIDATION
// ==========================================

/**
 * Order-Then-Validate move selector for inner Minimax plies:
 * On a 20x20 board with 32 pieces per side, generating all raw moves and running isKingInCheck
 * on all ~110 moves only to slice the top 12 wastes 90% of check simulations.
 * Instead, we gather raw moves, sort them by tactical priority first, and lazily validate
 * isKingInCheck only until we have collected `limit` legal moves.
 */
function getTopOrderedLegalMoves(
  color: PieceColor,
  pieces: Piece[],
  boardType: BoardType,
  limit: number
): Move[] {
  const rawPool: Move[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.color !== color || p.rpg.hp <= 0) continue;
    const raw = getRawMovesForPiece(p, pieces, boardType);
    for (let j = 0; j < raw.length; j++) {
      rawPool.push(raw[j]);
    }
  }

  if (rawPool.length === 0) return [];

  rawPool.sort(
    (a, b) =>
      scoreMoveForOrdering(b, pieces, color, boardType) -
      scoreMoveForOrdering(a, pieces, color, boardType)
  );

  const validTopMoves: Move[] = [];
  for (let i = 0; i < rawPool.length; i++) {
    const move = rawPool[i];
    if (move.isCastling) continue;
    const simulated = simulateMove(pieces, move, boardType);
    if (!isKingInCheck(color, simulated, boardType)) {
      validTopMoves.push(move);
      if (validTopMoves.length >= limit) {
        break;
      }
    }
  }

  return validTopMoves;
}

function minimax(
  pieces: Piece[],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor,
  boardType: BoardType,
  mode: GameMode,
  learningData?: GameLearningData
): number {
  if (depth <= 0) {
    return evaluateBoard(pieces, aiColor, boardType, mode, learningData);
  }

  const boardSize = BOARD_SIZES[boardType] || 20;
  const maxInnerBranching = boardSize >= 20 ? 12 : boardSize >= 12 ? 16 : 20;
  const currentColor = isMaximizing ? aiColor : (aiColor === 'white' ? 'black' : 'white');
  const movesToExplore = getTopOrderedLegalMoves(currentColor, pieces, boardType, maxInnerBranching);

  if (movesToExplore.length === 0) {
    // Distinguish Checkmate from Stalemate without double-generating moves!
    if (isKingInCheck(currentColor, pieces, boardType)) {
      return isMaximizing ? -90000 - depth : 90000 + depth;
    }
    // Stalemate Avoidance: If the maximizing AI is ahead, stalemate is a terrible outcome (-65000)
    // so the AI never traps itself in a draw/tie while clearing the board!
    return isMaximizing ? 45000 : -65000;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < movesToExplore.length; i++) {
      const move = movesToExplore[i];
      const nextPieces = simulateMove(pieces, move, boardType);
      const evalScore = minimax(
        nextPieces,
        depth - 1,
        alpha,
        beta,
        false,
        aiColor,
        boardType,
        mode,
        learningData
      );
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) {
        break; // Beta cutoff
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < movesToExplore.length; i++) {
      const move = movesToExplore[i];
      const nextPieces = simulateMove(pieces, move, boardType);
      const evalScore = minimax(
        nextPieces,
        depth - 1,
        alpha,
        beta,
        true,
        aiColor,
        boardType,
        mode,
        learningData
      );
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) {
        break; // Alpha cutoff
      }
    }
    return minEval;
  }
}

// ==========================================
// 6. MAIN AI DECISION FUNCTION & DIAGNOSTIC TELEMETRY
// ==========================================

export interface MoveWeightBreakdown {
  moveNotation: string;
  pieceId: string;
  isCapture: boolean;
  minimaxBase: number;
  kingContainmentWeight: number;
  territoryCompressionWeight: number;
  containmentAndCompressionTotal: number;
  materialCaptureWeight: number;
  lastOneStandingWeight: number;
  tacticalForkAndRescueWeight: number;
  playbookWeight: number;
  asymmetricDoctrineWeight: number;
  pastGameNoveltyPenalty: number;
  antiMimicPenalty: number;
  antiLoopPenalty: number;
  learnedMemoryWeight: number;
  totalScore: number;
}

export function findBestMoveAI(
  pieces: Piece[],
  aiColor: PieceColor,
  boardType: BoardType,
  mode: GameMode,
  difficulty: AIDifficulty = 'Master',
  armyDeployment: ArmyDeployment = 'standard',
  recentMoves: Move[] = []
): Move | null {
  // CRITICAL LAW: Query the EXACT same authoritative legal move engine as the player!
  const validMoves = getAllValidMovesForColor(aiColor, pieces, boardType);
  if (validMoves.length === 0) return null;

  const opponentColor: PieceColor = aiColor === 'white' ? 'black' : 'white';
  const boardSize = BOARD_SIZES[boardType] || 20;
  const gameKey = getGameKey(boardType, armyDeployment, mode);
  let learningData = loadGameLearning(gameKey);

  // If a new match just began (<= 1 moves in history) and staged data exists from a previous match,
  // flush the previous match's plays into pastGameMovesByTurn so the AI never repeats past-game plays!
  const existingStaged = loadStagedMatchData(gameKey);
  if (recentMoves.length <= 1 && existingStaged && existingStaged.totalMovesRecorded > recentMoves.length + 1) {
    learningData = flushStagedMatchToHistory(gameKey, learningData);
  }

  const { whiteDoctrine, blackDoctrine } = getActiveMatchDoctrines(learningData);
  const myDoctrine = aiColor === 'white' ? whiteDoctrine : blackDoctrine;
  const oppDoctrine = aiColor === 'white' ? blackDoctrine : whiteDoctrine;

  const aliveWhiteCount = pieces.filter((p) => p.color === 'white' && p.rpg.hp > 0).length;
  const aliveBlackCount = pieces.filter((p) => p.color === 'black' && p.rpg.hp > 0).length;
  const totalAlivePieces = aliveWhiteCount + aliveBlackCount;
  const enemySurvivorsBefore = aiColor === 'white' ? aliveBlackCount : aliveWhiteCount;
  const opKingBefore = pieces.find((p) => p.color === opponentColor && p.type === 'king' && p.rpg.hp > 0);

  // 1. Fast O(1) Direct Royal Capture Check before full candidate search
  if (opKingBefore) {
    for (let i = 0; i < validMoves.length; i++) {
      const move = validMoves[i];
      if (!move.isCapture) continue;
      const capturesKingDirectly =
        move.capturedPieceId === opKingBefore.id ||
        (move.to.x === opKingBefore.position.x &&
          move.to.y === opKingBefore.position.y &&
          Boolean(move.to.isVerticalWall) === Boolean(opKingBefore.position.isVerticalWall));
      if (capturesKingDirectly) {
        latestAIChallengeTelemetry = {
          matchGeneration: learningData.gamesPlayed + 1,
          whiteDoctrineName: whiteDoctrine.name,
          blackDoctrineName: blackDoctrine.name,
          pastGamePlaysBlocked: 0,
          mimicMovesBlocked: 0,
          whiteSurvivors: aiColor === 'white' ? aliveWhiteCount : Math.max(0, aliveWhiteCount - 1),
          blackSurvivors: aiColor === 'black' ? aliveBlackCount : Math.max(0, aliveBlackCount - 1),
          isNovelPlay: true,
        };
        console.log('[AI Tactical Weight Diagnostic]', {
          phase: 'LAST_ONE_STANDING_FINISHER',
          aiColor,
          boardType,
          selectedMove: `${move.pieceId} (${move.from.x},${move.from.y}) -> (${move.to.x},${move.to.y})`,
          totalScore: 999999,
        });
        return move;
      }
    }
  }

  // Authoritative enemy capture-threat map (strictly distinguishes capture permissions from movement permissions:
  // - Pawns only threaten 1-step forward-diagonal squares, never orthogonal or 8-dir summit non-capture squares;
  // - Non-Knight pieces on the 4x4 Summit only threaten 1 connected tile;
  // - Knights on the 4x4 Summit threaten their full jump landing squares;
  // - Trebuchets only threaten 1-2 tile jump-capture squares, never ranged bombardment squares;
  // - Surface Bound non-Pawn pieces only threaten captures on their own surface class).
  const threatenedFriendlySquareSet = new Set<string>();
  const enemyAttackTargetPieces = new Map<string, number>();
  const activePlayStyle = getActivePlayStyle();
  for (let i = 0; i < pieces.length; i++) {
    const ep = pieces[i];
    if (ep.color !== opponentColor || ep.rpg.hp <= 0) continue;
    const captureThreatSquares = getCaptureThreatSquaresForPiece(ep, pieces, boardType, activePlayStyle);
    const epVal = PIECE_VALUES[ep.type] || 100;
    for (let j = 0; j < captureThreatSquares.length; j++) {
      const sq = captureThreatSquares[j];
      const sqKey = `${sq.x},${sq.y},${Boolean(sq.isVerticalWall)}`;
      threatenedFriendlySquareSet.add(sqKey);
      const prevMin = enemyAttackTargetPieces.get(sqKey);
      if (prevMin === undefined || epVal < prevMin) {
        enemyAttackTargetPieces.set(sqKey, epVal);
      }
    }
  }

  // Separate own recent moves and opponent recent moves for Anti-Loop, Past-Game Novelty, and Anti-Mimicry
  const myRecentMoves = recentMoves.filter((m) => {
    const p = pieces.find((piece) => piece.id === m.pieceId);
    return p ? p.color === aiColor : m.pieceId.includes(aiColor);
  });
  const oppRecentMoves = recentMoves.filter((m) => {
    const p = pieces.find((piece) => piece.id === m.pieceId);
    return p ? p.color === opponentColor : m.pieceId.includes(opponentColor);
  });

  const myMoveIndex = myRecentMoves.length + 1;
  const lastMyMove = myRecentMoves[myRecentMoves.length - 1];
  const lastOppMove = oppRecentMoves[oppRecentMoves.length - 1];
  const recentOppSlice = oppRecentMoves.slice(-4);

  // Past-game plays banned at this turn index (and adjacent turn window in the opening)
  const bannedPastTurnMoves = new Set<string>();
  const pastByTurn = learningData.pastGameMovesByTurn || {};
  for (const idx of [myMoveIndex, Math.max(1, myMoveIndex - 1), myMoveIndex + 1]) {
    const list = pastByTurn[`${aiColor}_${idx}`] || [];
    for (const sig of list) {
      bannedPastTurnMoves.add(sig);
    }
  }
  const pastOpeningsSet = new Set<string>(learningData.pastOpeningSignatures || []);
  const myCurrentOpeningPrefix = myRecentMoves
    .slice(0, 3)
    .map((m) => {
      const mp = pieces.find((p) => p.id === m.pieceId);
      return `${mp?.type || 'piece'}:${m.from.x},${m.from.y}->${m.to.x},${m.to.y}`;
    })
    .join('|');

  const recentMoveSignatures = new Map<string, number>();
  const recentPieceSquareVisits = new Map<string, number>();

  for (const rm of recentMoves.slice(-16)) {
    const sig = `${rm.pieceId}:${rm.from.x},${rm.from.y}->${rm.to.x},${rm.to.y}`;
    recentMoveSignatures.set(sig, (recentMoveSignatures.get(sig) || 0) + 1);
    const revSig = `${rm.pieceId}:${rm.to.x},${rm.to.y}->${rm.from.x},${rm.from.y}`;
    recentMoveSignatures.set(revSig, (recentMoveSignatures.get(revSig) || 0) + 1);
    const sqKey = `${rm.pieceId}@${rm.to.x},${rm.to.y}`;
    recentPieceSquareVisits.set(sqKey, (recentPieceSquareVisits.get(sqKey) || 0) + 1);
  }

  // 2. Difficulty Profile, Learned Weights, Whole-Army Coordination & Multi-Turn Strategic Objectives
  const difficultyProfile = AI_DIFFICULTY_PROFILES[normalizeAIDifficulty(difficulty)];
  const learnedWeights = validateLearnedWeights(learningData.learnedWeights);

  const tacticalScale = difficultyProfile.tacticalAccuracy * learnedWeights.tacticalDefense;
  const containmentScale = difficultyProfile.evaluationAccuracy * learnedWeights.containment;
  const coordinationScale = difficultyProfile.evaluationAccuracy * learnedWeights.coordination;
  const terrainScale = difficultyProfile.evaluationAccuracy * learnedWeights.terrainControl;
  const developmentScale = difficultyProfile.evaluationAccuracy;
  const repetitionScale = learnedWeights.antiLoop;
  const stalemateScale = difficultyProfile.tacticalAccuracy >= 0.65 ? 1.0 : 0.85;

  // Fast O(N) whole-army role & underdeveloped reserve identification (Directive Section 4):
  // An unmoved piece is NOT marked idle if it actively guards its own King (within 2 tiles) or controls central high ground.
  const myKingBefore = pieces.find((p) => p.color === aiColor && p.type === 'king' && p.rpg.hp > 0);
  const myKingInCheckNow = isKingInCheck(aiColor, pieces, boardType);
  const underdevelopedPieceIds = new Set<string>();
  const homeRankY = aiColor === 'white' ? 0 : boardSize - 1;
  const secondRankY = aiColor === 'white' ? 1 : boardSize - 2;

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.color !== aiColor || p.rpg.hp <= 0 || p.type === 'king' || p.type === 'pawn') continue;
    const onBackRanks = p.position.y === homeRankY || p.position.y === secondRankY;
    if (!p.hasMoved && onBackRanks) {
      const guardsKing =
        myKingBefore &&
        Math.max(
          Math.abs(p.position.x - myKingBefore.position.x),
          Math.abs(p.position.y - myKingBefore.position.y)
        ) <= 2;
      if (!guardsKing) {
        underdevelopedPieceIds.add(p.id);
      }
    }
  }

  // Fast O(1) Pyramid Enemy King Vertical-Wall Escape Check (Directive Section 5)
  const enemyKingCanEscapeToVerticalWall = Boolean(
    opKingBefore &&
      (boardType === 'pyramid' || boardType === 'quick_pyramid') &&
      !opKingBefore.position.isVerticalWall &&
      opKingBefore.position.tier >= 1
  );

  // Opponent Adaptation Analysis (Directive Section 9):
  // Detect opponent flank concentration, aggressive exposure, or defensive consolidation
  let oppEastFlankCount = 0;
  let oppWestFlankCount = 0;
  let oppExposedPieceCount = 0;
  for (let i = 0; i < pieces.length; i++) {
    const ep = pieces[i];
    if (ep.color !== opponentColor || ep.rpg.hp <= 0 || ep.type === 'king') continue;
    if (ep.position.x >= boardSize * 0.6) oppEastFlankCount++;
    else if (ep.position.x <= boardSize * 0.4) oppWestFlankCount++;
  }

  const turnEstimate = Math.floor(recentMoves.length / 2) + 1;
  const convBefore = analyzeConversionState(pieces, aiColor, boardType, true);
  const currentBoardEval = evaluateBoard(pieces, aiColor, boardType, mode, learningData);

  // Select or Reassess Multi-Turn Strategic Objective (Directive Section 3)
  const prevObj = activeObjectivesByColor[aiColor];
  let chosenObjectiveType: StrategicObjectiveType = 'develop_pieces';
  let chosenObjectiveLabel = 'Develop inactive pieces & contest central lanes';

  if (myKingInCheckNow) {
    chosenObjectiveType = 'protect_king';
    chosenObjectiveLabel = 'Protect the King & neutralize immediate royal threats';
  } else if (convBefore.isConversionState) {
    if (convBefore.kingEscapeSquares <= 2 && convBefore.coordinatedNetCount >= 2) {
      chosenObjectiveType = 'construct_mating_net';
      chosenObjectiveLabel = 'Construct mating net (Contain → Coordinate → Compress → Force → Mate)';
    } else if (convBefore.coordinatedNetCount < 2) {
      chosenObjectiveType = 'coordinate_attackers';
      chosenObjectiveLabel = 'Coordinate multiple attackers into the enemy King containment cordon';
    } else {
      chosenObjectiveType = 'restrict_king_escapes';
      chosenObjectiveLabel = 'Restrict enemy King escape routes & compress safe territory';
    }
  } else if (
    prevObj &&
    prevObj.turnsActive < difficultyProfile.strategicPersistence &&
    prevObj.stagnantTurns < 2 &&
    prevObj.objective !== 'protect_king'
  ) {
    // Maintain productive multi-turn strategic plan unless stagnant
    chosenObjectiveType = prevObj.objective;
    chosenObjectiveLabel = prevObj.label;
  } else if (underdevelopedPieceIds.size >= 3 && turnEstimate <= 12) {
    chosenObjectiveType = 'develop_pieces';
    chosenObjectiveLabel = 'Develop reserve pieces into active tactical lanes';
  } else if (boardType === 'pyramid' || boardType === 'quick_pyramid') {
    if (myDoctrine.favorsClimb || getActivePlayStyle() === 'surface_bound') {
      chosenObjectiveType = 'secure_pyramid_route';
      chosenObjectiveLabel = 'Secure Pyramid terrace routes, wall access & Summit exits';
    } else {
      chosenObjectiveType = 'trap_enemy_piece';
      chosenObjectiveLabel = 'Exploit 1-tile Summit restriction & chokepoints to trap enemy pieces';
    }
  } else {
    chosenObjectiveType = 'control_region';
    chosenObjectiveLabel = 'Control central corridors & coordinate double-attack pressure';
  }

  const evalImproved = prevObj ? currentBoardEval > prevObj.lastEvalScore + 15 : true;
  activeObjectivesByColor[aiColor] = {
    color: aiColor,
    objective: chosenObjectiveType,
    label: chosenObjectiveLabel,
    turnsActive: prevObj && prevObj.objective === chosenObjectiveType ? prevObj.turnsActive + 1 : 1,
    lastEvalScore: currentBoardEval,
    stagnantTurns:
      prevObj && prevObj.objective === chosenObjectiveType
        ? evalImproved
          ? 0
          : prevObj.stagnantTurns + 1
        : 0,
  };

  // Determine search depth from the 5-level Difficulty Profile (Directive Section 10)
  let searchDepth =
    convBefore.isConversionState || totalAlivePieces <= 14
      ? difficultyProfile.endgameSearchDepth
      : difficultyProfile.baseSearchDepth;
  if (boardSize >= 20 && totalAlivePieces > 26 && searchDepth > 1) {
    searchDepth = 1;
  }

  // Order root moves across the entire army
  validMoves.sort(
    (a, b) =>
      scoreMoveForOrdering(b, pieces, aiColor, boardType) -
      scoreMoveForOrdering(a, pieces, aiColor, boardType)
  );

  // Calibrated root candidate breadth per difficulty level & board geometry
  const maxRootCandidates = Math.min(
    difficultyProfile.maxRootCandidates,
    boardSize >= 20
      ? totalAlivePieces <= 18
        ? 28
        : 22
      : boardSize >= 12
      ? 28
      : 34
  );

  const candidateMoves =
    validMoves.length > maxRootCandidates
      ? validMoves.slice(0, maxRootCandidates)
      : validMoves;

  let bestMove: Move = candidateMoves[0];
  let bestScore = -Infinity;
  let bestMinimaxBase = -Infinity;

  // Determine the opponent's last Playbook maneuver so this AI refuses to copy it
  const lastOppPlaybookId = lastOppMove
    ? classifyMovePlaybook(lastOppMove, pieces, boardType, Math.max(1, turnEstimate - 1)).id
    : null;

  let pastGamePlaysBlockedCount = 0;
  let mimicMovesBlockedCount = 0;
  const diagnosticBreakdowns: MoveWeightBreakdown[] = [];

  for (const move of candidateMoves) {
    const nextPieces = simulateMove(pieces, move, boardType);
    const mover = pieces.find((p) => p.id === move.pieceId);
    const moverVal = mover ? PIECE_VALUES[mover.type] || 100 : 100;
    const moveNotation = `${move.pieceId}:${move.from.x},${move.from.y}${move.isCapture ? 'x' : '->'}${move.to.x},${move.to.y}`;
    const typeMoveSig = `${mover?.type || 'piece'}:${move.from.x},${move.from.y}->${move.to.x},${move.to.y}`;
    const coordMoveSig = `${move.from.x},${move.from.y}->${move.to.x},${move.to.y}`;

    const givesCheck = isKingInCheck(opponentColor, nextPieces, boardType);

    // Check for immediate Checkmate or Stalemate (only run hasAnyValidMoveForColor when giving check or in low-piece endgame!)
    if (givesCheck || enemySurvivorsBefore <= 5) {
      const oppHasMove = hasAnyValidMoveForColor(opponentColor, nextPieces, boardType);
      if (!oppHasMove) {
        if (givesCheck) {
          // Immediate Checkmate! Deliver finisher immediately!
          latestAIChallengeTelemetry = {
            matchGeneration: learningData.gamesPlayed + 1,
            whiteDoctrineName: whiteDoctrine.name,
            blackDoctrineName: blackDoctrine.name,
            pastGamePlaysBlocked: pastGamePlaysBlockedCount,
            mimicMovesBlocked: mimicMovesBlockedCount,
            whiteSurvivors: aiColor === 'white' ? aliveWhiteCount : Math.max(0, aliveWhiteCount - 1),
            blackSurvivors: aiColor === 'black' ? aliveBlackCount : Math.max(0, aliveBlackCount - 1),
            isNovelPlay: true,
          };
          console.log('[AI Tactical Weight Diagnostic]', {
            phase: 'LAST_ONE_STANDING_CHECKMATE_FINISHER',
            aiColor,
            boardType,
            selectedMove: moveNotation,
            totalScore: 999999,
          });
          return move;
        } else {
          // Canonical Codex Stalemate Penalty (-95,000 scaled by Stalemate Awareness)
          const staleScore = Math.round(-95000 * stalemateScale);
          if (staleScore > bestScore) {
            bestScore = staleScore;
            bestMove = move;
          }
          continue;
        }
      }
    }

    // Pass rolling alpha cutoff window into minimax so inferior branches prune immediately
    const rootAlphaWindow =
      bestMinimaxBase > -50000 ? bestMinimaxBase - 1400 : -Infinity;

    let minimaxBase = minimax(
      nextPieces,
      searchDepth - 1,
      rootAlphaWindow,
      Infinity,
      false,
      aiColor,
      boardType,
      mode,
      learningData
    );

    // When searchDepth === 1, or when examining aggressive moves, verify opponent's strongest immediate response
    // (Directive Section 2: "A move that creates a threat but loses to an obvious response is not intelligent play.")
    const destSqKey = `${move.to.x},${move.to.y},${Boolean(move.to.isVerticalWall)}`;
    const cheapestEnemyAttackerVal = enemyAttackTargetPieces.get(destSqKey);
    if (cheapestEnemyAttackerVal !== undefined && difficultyProfile.tacticalAccuracy >= 0.45) {
      let victimVal = 0;
      if (move.isCapture) {
        const victim =
          (move.capturedPieceId && pieces.find((p) => p.id === move.capturedPieceId)) ||
          getPieceAtPosition(pieces, move.to);
        if (victim) victimVal = PIECE_VALUES[victim.type] || 100;
      }
      if (!move.isCapture) {
        if (searchDepth === 1) {
          minimaxBase -= Math.round(moverVal * (mode === 'rpg' ? 0.55 : 0.85) * tacticalScale);
        } else {
          // Even at deeper search, penalize stepping a high-value piece onto a square attacked by a cheaper enemy piece
          if (moverVal > cheapestEnemyAttackerVal) {
            minimaxBase -= Math.round((moverVal - cheapestEnemyAttackerVal) * 0.45 * tacticalScale);
          }
        }
      } else if (moverVal > victimVal + 120 && cheapestEnemyAttackerVal <= moverVal) {
        // Unsound trade: capturing a minor piece/pawn with a much more valuable piece on a defended square
        minimaxBase -= Math.round((moverVal - victimVal) * 0.6 * tacticalScale);
      }
    }

    if (minimaxBase > bestMinimaxBase) {
      bestMinimaxBase = minimaxBase;
    }

    let kingContainmentWeight = 0;
    let territoryCompressionWeight = 0;
    let materialCaptureWeight = 0;
    let lastOneStandingWeight = 0;
    let tacticalForkAndRescueWeight = 0;
    let playbookWeight = 0;
    let asymmetricDoctrineWeight = 0;
    let pastGameNoveltyPenalty = 0;
    let antiMimicPenalty = 0;
    let antiLoopPenalty = 0;
    let learnedMemoryWeight = 0;

    // 3. PLAYBOOK & ASYMMETRIC DOCTRINE BONUS (White and Black follow distinct, non-copying doctrines)
    const playbookManeuver = classifyMovePlaybook(move, pieces, boardType, turnEstimate);
    playbookWeight = playbookManeuver.winRateBonus;

    if (mover) {
      if (myDoctrine.favoredTypes.includes(mover.type)) {
        asymmetricDoctrineWeight += 145;
      }
      if (myDoctrine.favorsClimb && (move.tierDelta > 0 || isSummitTile(boardType, move.to.x, move.to.y))) {
        asymmetricDoctrineWeight += 115;
      }
      if (myDoctrine.favorsWalls && move.to.isVerticalWall) {
        asymmetricDoctrineWeight += 125;
      }
      const centerCoord = (boardSize - 1) / 2;
      const fileDistFromCenter = Math.abs(move.to.x - centerCoord);
      if (myDoctrine.favorsCenter && fileDistFromCenter <= boardSize * 0.22) {
        asymmetricDoctrineWeight += 75;
      } else if (myDoctrine.favorsFlanks && fileDistFromCenter >= boardSize * 0.25) {
        asymmetricDoctrineWeight += 85;
      }
      // Discourage using the opponent AI's signature piece types on quiet opening moves
      if (
        !move.isCapture &&
        myMoveIndex <= 10 &&
        oppDoctrine.favoredTypes[0] === mover.type &&
        !myDoctrine.favoredTypes.includes(mover.type)
      ) {
        asymmetricDoctrineWeight -= 95;
      }
    }

    // 3B. RULE 1: CANNOT USE THE SAME PLAY AS IN PAST GAMES (Past-Game Novelty Enforcement)
    if (myMoveIndex <= 20 && candidateMoves.length > 1) {
      const matchesPastTurnPlay =
        bannedPastTurnMoves.has(typeMoveSig) || bannedPastTurnMoves.has(coordMoveSig);
      const candidateOpeningSeq = myCurrentOpeningPrefix
        ? `${myCurrentOpeningPrefix}|${typeMoveSig}`
        : typeMoveSig;
      const matchesPastOpening =
        myMoveIndex <= 4 &&
        pastOpeningsSet.has(`${aiColor === 'white' ? 'W' : 'B'}:${candidateOpeningSeq}`);

      if (matchesPastTurnPlay || matchesPastOpening) {
        pastGameNoveltyPenalty = -4800;
        pastGamePlaysBlockedCount++;
      }
    }

    // 3C. RULE 2: CANNOT MIMIC OR COPY THE OTHER AI'S PLAY (Anti-Symmetry & Anti-Mimicry Enforcement)
    if (mover && recentOppSlice.length > 0 && candidateMoves.length > 1) {
      let isMimicMove = false;
      const myDx = move.to.x - move.from.x;
      const myDy = move.to.y - move.from.y;

      for (const oppM of recentOppSlice) {
        const oppPiece =
          pieces.find((p) => p.id === oppM.pieceId) ||
          ({
            type: oppM.pieceId.split('_')[1] as PieceType,
          } as Piece);
        const samePieceType = oppPiece && oppPiece.type === mover.type;

        // 1. Vertically or rotationally mirrored board coordinates
        const isVerticalMirror =
          move.from.x === oppM.from.x &&
          move.to.x === oppM.to.x &&
          move.from.y === boardSize - 1 - oppM.from.y &&
          move.to.y === boardSize - 1 - oppM.to.y;

        const isRotationalMirror =
          move.from.x === boardSize - 1 - oppM.from.x &&
          move.to.x === boardSize - 1 - oppM.to.x &&
          move.from.y === boardSize - 1 - oppM.from.y &&
          move.to.y === boardSize - 1 - oppM.to.y;

        if (isVerticalMirror || isRotationalMirror) {
          isMimicMove = true;
          break;
        }

        // 2. Same piece type executing the exact same displacement pattern as the opponent's immediately preceding move
        if (oppM === lastOppMove && samePieceType && !move.isCapture) {
          const oppDx = oppM.to.x - oppM.from.x;
          const oppDy = oppM.to.y - oppM.from.y;
          if (
            Math.abs(myDx) === Math.abs(oppDx) &&
            Math.abs(myDy) === Math.abs(oppDy) &&
            Boolean(move.to.isVerticalWall) === Boolean(oppM.to.isVerticalWall)
          ) {
            isMimicMove = true;
            break;
          }
        }
      }

      // 3. Copying the exact same opening/middlegame Playbook Doctrine maneuver on a quiet move
      if (
        !isMimicMove &&
        !move.isCapture &&
        myMoveIndex <= 14 &&
        lastOppPlaybookId &&
        playbookManeuver.id === lastOppPlaybookId
      ) {
        isMimicMove = true;
      }

      if (isMimicMove) {
        antiMimicPenalty = -4500;
        mimicMovesBlockedCount++;
      }
    }

    // 4. TACTICAL AGGRESSION, FORKS & HANGING PIECE RESCUE
    const wasThreatenedAtOrigin = threatenedFriendlySquareSet.has(
      `${move.from.x},${move.from.y},${Boolean(move.from.isVerticalWall)}`
    );
    if (wasThreatenedAtOrigin && mover && mover.type !== 'pawn') {
      tacticalForkAndRescueWeight += Math.round(moverVal * 0.28);
    }

    // Fast Fork / Double-Attack Detection using getRawMovesForPiece (10x faster than getValidMovesForPiece!)
    const movedPieceAfter = nextPieces.find((p) => p.id === move.pieceId);
    if (movedPieceAfter && movedPieceAfter.type !== 'king') {
      const followUpRawMoves = getRawMovesForPiece(movedPieceAfter, nextPieces, boardType);
      let threatenedValuableTargets = 0;
      for (let k = 0; k < followUpRawMoves.length; k++) {
        const fm = followUpRawMoves[k];
        if (!fm.isCapture) continue;
        const target =
          (fm.capturedPieceId && nextPieces.find((p) => p.id === fm.capturedPieceId)) ||
          getPieceAtPosition(nextPieces, fm.to);
        if (target && target.color === opponentColor) {
          const tVal = PIECE_VALUES[target.type] || 100;
          if (tVal >= 300 || target.type === 'king') {
            threatenedValuableTargets++;
          }
        }
      }
      if (threatenedValuableTargets >= 2) {
        tacticalForkAndRescueWeight += Math.round(195 * tacticalScale); // Fork / double attack bonus!
      } else if (threatenedValuableTargets === 1) {
        tacticalForkAndRescueWeight += Math.round(65 * tacticalScale); // Direct tactical threat against a high-value enemy piece
      }

      // Pin & Skewer Detection along orthogonal/diagonal lines toward the enemy King (Directive Section 2 & 6):
      // Only non-summit sliding pieces project multi-tile pin rays.
      const movedOnSummitAfter =
        (boardType === 'pyramid' || boardType === 'quick_pyramid') &&
        !movedPieceAfter.position.isVerticalWall &&
        isSummitTile(boardType, movedPieceAfter.position.x, movedPieceAfter.position.y);
      if (
        !movedOnSummitAfter &&
        opKingBefore &&
        (movedPieceAfter.type === 'rook' ||
          movedPieceAfter.type === 'bishop' ||
          movedPieceAfter.type === 'queen' ||
          movedPieceAfter.type === 'solar_queen')
      ) {
        const dxK = opKingBefore.position.x - movedPieceAfter.position.x;
        const dyK = opKingBefore.position.y - movedPieceAfter.position.y;
        const isOrthoLine =
          (dxK === 0 || dyK === 0) &&
          (movedPieceAfter.type === 'rook' ||
            movedPieceAfter.type === 'queen' ||
            movedPieceAfter.type === 'solar_queen');
        const isDiagLine =
          Math.abs(dxK) === Math.abs(dyK) &&
          dxK !== 0 &&
          (movedPieceAfter.type === 'bishop' ||
            movedPieceAfter.type === 'queen' ||
            movedPieceAfter.type === 'solar_queen');
        if (isOrthoLine || isDiagLine) {
          const stepX = Math.sign(dxK);
          const stepY = Math.sign(dyK);
          const dist = Math.max(Math.abs(dxK), Math.abs(dyK));
          if (dist >= 2 && dist <= 12) {
            let enemyInLine = 0;
            let friendlyBlocking = 0;
            for (let s = 1; s < dist; s++) {
              const cx = movedPieceAfter.position.x + stepX * s;
              const cy = movedPieceAfter.position.y + stepY * s;
              const occ = nextPieces.find(
                (p) => p.rpg.hp > 0 && p.position.x === cx && p.position.y === cy && !p.position.isVerticalWall
              );
              if (occ) {
                if (occ.color === opponentColor) enemyInLine++;
                else friendlyBlocking++;
              }
            }
            if (enemyInLine === 1 && friendlyBlocking === 0) {
              // Absolute pin against the enemy King!
              tacticalForkAndRescueWeight += Math.round(165 * tacticalScale);
            }
          }
        }
      }
    }

    // Opponent Flank Adaptation (Directive Section 9):
    // If the opponent concentrates heavily on one flank, reward advancing or counter-pressuring the open flank/center
    if (mover && !move.isCapture && Math.abs(oppEastFlankCount - oppWestFlankCount) >= 4) {
      const openFlankIsWest = oppEastFlankCount > oppWestFlankCount;
      if (openFlankIsWest && move.to.x <= boardSize * 0.45) {
        tacticalForkAndRescueWeight += Math.round(45 * difficultyProfile.evaluationAccuracy);
      } else if (!openFlankIsWest && move.to.x >= boardSize * 0.55) {
        tacticalForkAndRescueWeight += Math.round(45 * difficultyProfile.evaluationAccuracy);
      }
    }

    // 5. KING CONTAINMENT & TERRITORY COMPRESSION WEIGHTS (Evaluated continuously, amplified for Last One Standing)
    const convAfter = analyzeConversionState(
      nextPieces,
      aiColor,
      boardType,
      convBefore.isConversionState || givesCheck
    );
    const escapeReduction = convBefore.kingEscapeSquares - convAfter.kingEscapeSquares;
    const netGain = convAfter.coordinatedNetCount - convBefore.coordinatedNetCount;
    const cutoffGain = convAfter.cutoffDirections.length - convBefore.cutoffDirections.length;
    const edgeCompressionGain = convBefore.kingEdgeDistance - convAfter.kingEdgeDistance;
    const surfaceTrapGain = convAfter.surfaceEntrancesControlled - convBefore.surfaceEntrancesControlled;
    const lastStandMultiplier = enemySurvivorsBefore <= 3 ? 1.35 : convBefore.isConversionState ? 1.0 : 0.5;

    // 5A. King Containment Weight (Restricting King escapes, tightening mating cordon, productive checks)
    if (escapeReduction > 0) {
      kingContainmentWeight += Math.round(escapeReduction * 280 * lastStandMultiplier);
    }
    if (netGain > 0) {
      kingContainmentWeight += Math.round(netGain * 290 * lastStandMultiplier);
    }

    if (givesCheck) {
      if (convAfter.kingEscapeSquares <= 1) {
        kingContainmentWeight += Math.round(580 * lastStandMultiplier * containmentScale); // Productive forcing check (<= 1 legal escape left)
      } else if (convAfter.kingEscapeSquares === 2 && convAfter.coordinatedNetCount >= 2) {
        kingContainmentWeight += Math.round(280 * lastStandMultiplier * containmentScale); // Tightening coordinated check
      } else if (escapeReduction > 0) {
        kingContainmentWeight += Math.round(180 * escapeReduction * lastStandMultiplier * containmentScale);
      } else if (convBefore.isConversionState && convAfter.kingEscapeSquares >= 3) {
        // Pointless one-piece chasing check when the enemy King still has >= 3 escape squares!
        kingContainmentWeight -= Math.round(450 * coordinationScale);
      } else {
        // Directive Section 6: "A check is not automatically a good move."
        // Zero automatic bonus when check neither reduces escapes nor coordinates net attackers.
        kingContainmentWeight += 0;
      }
    } else if (convBefore.isConversionState && (escapeReduction >= 2 || cutoffGain >= 1 || netGain >= 1)) {
      // Quiet containment move that removes escape routes or brings another attacker into the mating net!
      kingContainmentWeight += Math.round(380 * containmentScale * coordinationScale);
    }

    // Surface Bound Wall-Escape Interception, Summit Mobility & Exit-Control Planning
    if (boardType === 'pyramid' || boardType === 'quick_pyramid') {
      const startedOnSummit =
        !move.from.isVerticalWall && isSummitTile(boardType, move.from.x, move.from.y);
      const endedOnSummit =
        !move.to.isVerticalWall && isSummitTile(boardType, move.to.x, move.to.y);

      if (getActivePlayStyle() === 'surface_bound') {
        if (enemyKingCanEscapeToVerticalWall) {
          if (move.to.isVerticalWall || (mover?.type === 'pawn' && move.tierDelta > 0)) {
            territoryCompressionWeight += Math.round(210 * terrainScale);
          }
        }
        if (
          mover &&
          (mover.type === 'knight' || mover.type === 'gargoyle') &&
          !mover.colorReleased &&
          (endedOnSummit || move.tierDelta > 0)
        ) {
          territoryCompressionWeight += Math.round(
            (endedOnSummit ? 320 : 140) * terrainScale
          );
        }
      }

      // Summit Mobility & Tactical Region Awareness (Rules 3 & 4):
      // - Knight on the summit retains full jump mobility advantage (+190).
      // - Non-Knight pieces on the summit are restricted to 1-tile ordinary movement:
      //   * Reward stepping onto/around the summit when blocking/trapping an enemy on the summit or defending an ally.
      //   * Penalize parking a long-range slider (Queen, Rook, Bishop, uncontracted Vanguard) on an uncontested summit.
      //   * Reward a long-range slider stepping OFF an uncontested summit to restore its full ray range.
      if (mover) {
        const isLongRangeSlider =
          mover.type === 'queen' ||
          mover.type === 'rook' ||
          mover.type === 'bishop' ||
          (mover.type === 'vanguard' && getVanguardMovementProfile(mover).maxTiles >= 3);

        let enemyNearDestSummit = false;
        let enemyOnSummitTrapped = false;
        for (let i = 0; i < pieces.length; i++) {
          const ep = pieces[i];
          if (ep.color !== opponentColor || ep.rpg.hp <= 0) continue;
          const chebToDest = Math.max(
            Math.abs(ep.position.x - move.to.x),
            Math.abs(ep.position.y - move.to.y)
          );
          if (chebToDest <= 2) {
            enemyNearDestSummit = true;
            if (!ep.position.isVerticalWall && isSummitTile(boardType, ep.position.x, ep.position.y) && ep.type !== 'knight') {
              enemyOnSummitTrapped = true;
            }
          }
        }

        if (endedOnSummit) {
          if (mover.type === 'knight') {
            territoryCompressionWeight += Math.round(190 * terrainScale);
          } else if (enemyOnSummitTrapped || move.isCapture || givesCheck) {
            // Blocking/trapping a 1-tile-restricted enemy on the summit or contesting summit control
            territoryCompressionWeight += Math.round(145 * terrainScale);
          } else if (isLongRangeSlider && !enemyNearDestSummit) {
            // Avoid disabling a long-range slider's 13-25 tile ray by parking it on an empty summit
            territoryCompressionWeight -= 160;
          } else if (mover.type === 'pawn' && enemyNearDestSummit) {
            // Pawn on summit maneuvers in 8 non-capture directions to block exits while threatening 2 forward diagonals
            territoryCompressionWeight += Math.round(110 * terrainScale);
          }
        } else if (startedOnSummit && !endedOnSummit && isLongRangeSlider && !move.isCapture) {
          // Leaving the summit restores the slider's full multi-tile ray on the next turn
          territoryCompressionWeight += Math.round(125 * terrainScale);
        } else if (!endedOnSummit && enemyOnSummitTrapped) {
          // Sealing a summit exit from Tier 2 / vertical lip to trap an enemy piece on the summit
          territoryCompressionWeight += Math.round(135 * terrainScale * containmentScale);
        }
      }
    }

    // Specialist Piece Strategic Planning (Section 3: Vanguard contraction/exchange & Trebuchet displacement)
    if (mover?.type === 'vanguard') {
      const vProf = getVanguardMovementProfile(mover);
      if (move.isRookExchange) {
        // Evaluate Rook Exchange as a coordinated deployment action (reward deploying Rook up tiers or into cordon)
        if (move.tierDelta > 0 || (opKingBefore && Math.abs(move.from.x - opKingBefore.position.x) <= 4)) {
          tacticalForkAndRescueWeight += Math.round(240 * coordinationScale);
        } else {
          tacticalForkAndRescueWeight -= 160; // Avoid random unproductive swaps
        }
      } else if (vProf.maxTiles === 1 && move.to.isVerticalWall) {
        // Contracted 1-tile Vanguard gains lateral mobility on vertical walls
        territoryCompressionWeight += Math.round(130 * terrainScale);
      }
    } else if (mover?.type === 'trebuchet' && move.isBombard) {
      // Trebuchet Bombardment is non-capturing 3-tile knockback displacement:
      // Reward when it reduces enemy King escapes or displaces a defender near the enemy King
      if (escapeReduction > 0 || netGain > 0) {
        tacticalForkAndRescueWeight += Math.round(260 * tacticalScale);
      } else if (
        opKingBefore &&
        Math.abs(move.to.x - opKingBefore.position.x) + Math.abs(move.to.y - opKingBefore.position.y) <= 4
      ) {
        tacticalForkAndRescueWeight += Math.round(175 * tacticalScale);
      }
    }

    // Whole-Army Development Bonus (Section 3: Activate underdeveloped pieces with no defensive/blocking job)
    if (mover && underdevelopedPieceIds.has(mover.id) && !move.isCapture) {
      tacticalForkAndRescueWeight += Math.round(165 * developmentScale * coordinationScale);
    }

    // Anti-Lone-Chasing Coordination Rule in Conversion State:
    // Penalize moving the same piece repeatedly without capturing when other friendly pieces are outside the cordon
    if (
      convBefore.isConversionState &&
      !move.isCapture &&
      lastMyMove &&
      lastMyMove.pieceId === move.pieceId &&
      convBefore.friendlyNonKingCount > convBefore.coordinatedNetCount
    ) {
      kingContainmentWeight -= 520;
    }

    // 5B. Territory Compression Weight (Rank/file cutoffs, shrinking King edge box, surface route trapping & approach)
    if (cutoffGain > 0) {
      territoryCompressionWeight += Math.round(cutoffGain * 250 * lastStandMultiplier);
    }
    if (edgeCompressionGain > 0) {
      territoryCompressionWeight += Math.round(edgeCompressionGain * 110 * lastStandMultiplier);
    }
    if (surfaceTrapGain > 0) {
      territoryCompressionWeight += Math.round(surfaceTrapGain * 140 * lastStandMultiplier);
    }
    if (opKingBefore && mover && mover.type !== 'king') {
      const distBefore =
        Math.abs(move.from.x - opKingBefore.position.x) +
        Math.abs(move.from.y - opKingBefore.position.y);
      const distAfter =
        Math.abs(move.to.x - opKingBefore.position.x) +
        Math.abs(move.to.y - opKingBefore.position.y);
      if (distAfter < distBefore) {
        territoryCompressionWeight += Math.round((distBefore - distAfter) * (convBefore.isConversionState ? 38 : 18));
      }
    }

    // 6. MATERIAL CAPTURE, RPG COMBAT ODDS & LAST-ONE-STANDING ELIMINATION WEIGHT
    if (move.isCapture) {
      const defender =
        pieces.find((p) => p.id === move.capturedPieceId) ||
        pieces.find(
          (p) =>
            p.position.x === move.to.x &&
            p.position.y === move.to.y &&
            (move.to.isVerticalWall ? !!p.position.isVerticalWall : !p.position.isVerticalWall)
        );
      const defenderVal = defender ? PIECE_VALUES[defender.type] || 100 : 100;

      // Base board-clearance & Last-One-Standing elimination drive
      materialCaptureWeight += 260 + Math.round(defenderVal * 0.25);
      lastOneStandingWeight += 190 + Math.round((24 - enemySurvivorsBefore) * 12);

      if (mode === 'rpg' && mover && defender) {
        const odds = calculateLiveRPGOdds(mover, defender, pieces, boardType);
        const expectedHpDrop = Math.min(defender.rpg.hp, odds.expectedDamage);
        const winProbWeight = (odds.hitPercent - odds.dodgePercent) * 2.5;
        const lethalBonus = odds.isFatalExpected ? 280 : 0;

        // Focus-fire wounded enemies to permanently remove them from the battlefield
        if (defender.rpg.hp < defender.rpg.maxHp) {
          lastOneStandingWeight += 180;
        }

        if (odds.hitPercent < 40 && !odds.isFatalExpected) {
          // Discourage low-odds RPG attacks where losing the roll sends the attacker back to its origin tile
          materialCaptureWeight -= Math.round((45 - odds.hitPercent) * 6);
        } else {
          materialCaptureWeight += Math.round(winProbWeight + expectedHpDrop * 3.5 + lethalBonus);
        }
      } else if (defenderVal >= moverVal) {
        materialCaptureWeight += 90 + Math.round((defenderVal - moverVal) * 0.25);
      }
    }

    // 7. DECISIVE ANTI-LOOP & ANTI-OSCILLATION PENALTY (Guarantees AI prioritizes ending games over looping!)
    if (!move.isCapture) {
      const moveSig = `${move.pieceId}:${move.from.x},${move.from.y}->${move.to.x},${move.to.y}`;
      const repeatCount = recentMoveSignatures.get(moveSig) || 0;
      const destVisitKey = `${move.pieceId}@${move.to.x},${move.to.y}`;
      const visitCount = recentPieceSquareVisits.get(destVisitKey) || 0;

      // Direct reversal of the AI's own previous move (A -> B followed immediately by B -> A)
      const isDirectReversal =
        Boolean(lastMyMove) &&
        lastMyMove!.pieceId === move.pieceId &&
        lastMyMove!.from.x === move.to.x &&
        lastMyMove!.from.y === move.to.y &&
        lastMyMove!.to.x === move.from.x &&
        lastMyMove!.to.y === move.from.y;

      if (isDirectReversal) {
        // Allow a one-time tactical retreat only if the piece just walked into a threat AND hasn't already repeated
        if (wasThreatenedAtOrigin && repeatCount <= 1 && visitCount <= 1) {
          antiLoopPenalty -= 140;
        } else {
          // Canonical Codex Repetition Penalty (-5,500 scaled by Repetition Aversion)
          antiLoopPenalty -= Math.round(5500 * repetitionScale);
        }
      }

      if (repeatCount > 0) {
        // If a move signature has already occurred in the recent window, heavily penalize repeating it so no 2-ply loop can form
        if (wasThreatenedAtOrigin && repeatCount === 1) {
          antiLoopPenalty -= 220;
        } else {
          antiLoopPenalty -= Math.round(Math.min(5500, repeatCount * 2750) * repetitionScale);
        }
      }

      if (visitCount > 0) {
        if (wasThreatenedAtOrigin && visitCount === 1) {
          antiLoopPenalty -= 90;
        } else {
          antiLoopPenalty -= visitCount * 850;
        }
      }
    }

    // 8. Learned Memory modifiers
    if (learningData.blunderMoveKeys[coordMoveSig]) {
      learnedMemoryWeight -= Math.min(150, learningData.blunderMoveKeys[coordMoveSig] * 25);
    }
    const destKey = `${move.to.x}_${move.to.y}`;
    if (learningData.successfulCheckmatePositions[destKey]) {
      learnedMemoryWeight += Math.min(100, learningData.successfulCheckmatePositions[destKey] * 20);
    }

    let moveScore =
      minimaxBase +
      kingContainmentWeight +
      territoryCompressionWeight +
      materialCaptureWeight +
      lastOneStandingWeight +
      tacticalForkAndRescueWeight +
      playbookWeight +
      asymmetricDoctrineWeight +
      pastGameNoveltyPenalty +
      antiMimicPenalty +
      antiLoopPenalty +
      learnedMemoryWeight;

    // Controlled variation based on the 5-level Difficulty Profile (Directive Sections 10 & 11):
    // Permits controlled variation among sound candidates while never overriding King safety or causing blunders.
    if (difficultyProfile.controlledVariationWindow > 0 && moveScore > -10000) {
      moveScore += (Math.random() - 0.5) * difficultyProfile.controlledVariationWindow;
    }

    diagnosticBreakdowns.push({
      moveNotation,
      pieceId: move.pieceId,
      isCapture: Boolean(move.isCapture),
      minimaxBase: Math.round(minimaxBase),
      kingContainmentWeight,
      territoryCompressionWeight,
      containmentAndCompressionTotal: kingContainmentWeight + territoryCompressionWeight,
      materialCaptureWeight,
      lastOneStandingWeight,
      tacticalForkAndRescueWeight,
      playbookWeight,
      asymmetricDoctrineWeight,
      pastGameNoveltyPenalty,
      antiMimicPenalty,
      antiLoopPenalty,
      learnedMemoryWeight,
      totalScore: Math.round(moveScore),
    });

    if (moveScore > bestScore) {
      bestScore = moveScore;
      bestMove = move;
    }
  }

  // Directive Section 7 & 11:
  // Ensure that anti-novelty / anti-mimic / anti-loop penalties NEVER force an objectively losing move
  // (e.g., if every non-repeating move loses the Queen or walks into checkmate, allow the sound defensive move).
  if (diagnosticBreakdowns.length > 1) {
    const sortedByRawSoundness = [...diagnosticBreakdowns].sort((a, b) => {
      const rawA = a.totalScore - a.pastGameNoveltyPenalty - a.antiMimicPenalty - a.antiLoopPenalty;
      const rawB = b.totalScore - b.pastGameNoveltyPenalty - b.antiMimicPenalty - b.antiLoopPenalty;
      return rawB - rawA;
    });
    const bestRawSound = sortedByRawSoundness[0];
    const chosenBreakdown = diagnosticBreakdowns.find(
      (d) =>
        d.pieceId === bestMove.pieceId &&
        d.moveNotation.endsWith(`${bestMove.to.x},${bestMove.to.y}`)
    );
    if (bestRawSound && chosenBreakdown) {
      const bestRawVal =
        bestRawSound.totalScore -
        bestRawSound.pastGameNoveltyPenalty -
        bestRawSound.antiMimicPenalty -
        bestRawSound.antiLoopPenalty;
      const chosenRawVal =
        chosenBreakdown.totalScore -
        chosenBreakdown.pastGameNoveltyPenalty -
        chosenBreakdown.antiMimicPenalty -
        chosenBreakdown.antiLoopPenalty;
      // If the chosen move is objectively losing (> 650 points worse in tactical/positional evaluation than the sound defensive move),
      // preserve King & material safety by selecting the sound move!
      if (bestRawVal - chosenRawVal > 650) {
        const recovered = candidateMoves.find(
          (m) =>
            m.pieceId === bestRawSound.pieceId &&
            `${m.pieceId}:${m.from.x},${m.from.y}${m.isCapture ? 'x' : '->'}${m.to.x},${m.to.y}` ===
              bestRawSound.moveNotation
        );
        if (recovered) {
          bestMove = recovered;
          bestScore = bestRawSound.totalScore;
        }
      }
    }
  }

  // Record chosen play into live staging so future games (even after mid-game resets) never repeat this play!
  if (myMoveIndex <= 20) {
    const chosenMover = pieces.find((p) => p.id === bestMove.pieceId);
    const chosenTypeSig = `${chosenMover?.type || 'piece'}:${bestMove.from.x},${bestMove.from.y}->${bestMove.to.x},${bestMove.to.y}`;
    const chosenCoordSig = `${bestMove.from.x},${bestMove.from.y}->${bestMove.to.x},${bestMove.to.y}`;
    const prevStaged = loadStagedMatchData(gameKey);
    const basePlays =
      prevStaged && recentMoves.length > 0 ? prevStaged.plays : [];
    saveStagedMatchData({
      gameKey,
      totalMovesRecorded: recentMoves.length + 1,
      whiteDoctrineId: whiteDoctrine.id,
      blackDoctrineId: blackDoctrine.id,
      plays: [
        ...basePlays,
        {
          color: aiColor,
          colorMoveIndex: myMoveIndex,
          typeMoveSig: chosenTypeSig,
          coordMoveSig: chosenCoordSig,
          doctrineId: myDoctrine.id,
        },
      ],
    });
  }

  // Update live AI vs AI Challenge telemetry for UI & Teaching overlay
  const selectedDiag =
    diagnosticBreakdowns.find(
      (d) =>
        d.pieceId === bestMove.pieceId &&
        d.moveNotation.endsWith(`${bestMove.to.x},${bestMove.to.y}`)
    ) || diagnosticBreakdowns[0];

  latestAIChallengeTelemetry = {
    matchGeneration: learningData.gamesPlayed + 1,
    whiteDoctrineName: whiteDoctrine.name,
    blackDoctrineName: blackDoctrine.name,
    pastGamePlaysBlocked: pastGamePlaysBlockedCount,
    mimicMovesBlocked: mimicMovesBlockedCount,
    whiteSurvivors: aliveWhiteCount,
    blackSurvivors: aliveBlackCount,
    isNovelPlay: selectedDiag ? selectedDiag.pastGameNoveltyPenalty === 0 && selectedDiag.antiMimicPenalty === 0 : true,
  };

  return bestMove;
}
