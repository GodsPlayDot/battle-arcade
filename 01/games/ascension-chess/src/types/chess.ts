export type PieceColor = 'white' | 'black';

export type PieceType =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king'
  // Grand Pyramid 20x20 Exclusive Piece
  | 'vanguard'   // Rapid deployment (9->1 forward contraction), vertical-wall lateral, Rook Exchange
  // Special 3D pieces
  | 'gargoyle'   // Aero-Knight: Can leap any vertical tier
  | 'trebuchet'  // Siege unit: Ranged bombard over elevations
  | 'ascendant'  // Chrono-Climber: Vertical phase & unit swap
  // Summit Apex Promoted Pieces
  | 'solar_queen'
  | 'archon_templar'
  | 'chrono_mage'
  | 'titan_golem';

export interface Position {
  x: number;
  y: number;
  tier: number; // 0: Valley flat, 1: Low Terrace, 2: High Terrace, 3: Summit
  isVerticalWall?: boolean;
  wallDirection?: 'north' | 'south' | 'east' | 'west'; // Facing direction of vertical cliff tile
  wallTierStep?: number; // E.g. step from tier 0->1, 1->2, 2->3
}

export interface RPGStats {
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  evasion: number; // 0-100 percentage
  critChance: number; // 0-100 percentage
  level: number;
  kills: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  position: Position;
  hasMoved: boolean;
  isAscended?: boolean;
  rpg: RPGStats;
  facing?: 'north' | 'south' | 'east' | 'west';
  originEdge?: 'south' | 'north' | 'west' | 'east';
  detachment?: 'main' | 'west' | 'east';
  // Vanguard 9 -> 1 progression state (never regains speed once reduced or after crossing center)
  maxForwardProgress?: number;
  hasCrossedCenter?: boolean;
  // Surface Bound Play Style: Jump Color Law & 4x4 Summit Color Release state
  originColor?: 'light' | 'dark';
  colorReleased?: boolean;
}

export interface TileData {
  x: number;
  y: number;
  tier: number;
  isSummit: boolean; // Part of 4x4 Summit
  isValley: boolean; // Part of flat apron
  color: 'light' | 'dark';
  isVerticalWall?: boolean;
  wallDirection?: 'north' | 'south' | 'east' | 'west';
  wallTierStep?: number;
}

export interface Move {
  from: Position;
  to: Position;
  pieceId: string;
  isCapture: boolean;
  capturedPieceId?: string;
  isVerticalClimb: boolean;
  tierDelta: number;
  isSummitAscension?: boolean;
  promotionType?: PieceType;
  isBombard?: boolean; // Ranged trebuchet shot without moving
  isWallPerch?: boolean; // Landing on or moving along vertical side tile
  isRookExchange?: boolean; // Vanguard exclusive positional exchange with a friendly Rook
  exchangePartnerId?: string; // ID of the friendly Rook exchanging positions with the Vanguard
  isCastling?: boolean; // Classical Kingside (O-O) or Queenside (O-O-O) castling
  castlingSide?: 'kingside' | 'queenside';
  rookPieceId?: string;
  rookFrom?: Position;
  rookTo?: Position;
  isEnPassant?: boolean; // Classical En Passant pawn capture
}

export interface MoveHistoryEntry {
  turnNumber: number;
  color: PieceColor;
  pieceType: PieceType;
  move: Move;
  notation: string;
  tags: string[];
  rpgRollSummary?: string;
}

export interface OngoingDuel {
  id: string;
  position: Position;
  whitePieceId: string;
  blackPieceId: string;
  roundsRemaining: number;
  maxRounds: number;
  logs: string[];
}

export type BoardType = 'classic' | 'quick_pyramid' | 'battlefield' | 'pyramid';
export type ArmyDeployment = 'standard' | 'kingdom';
export type GameMode = 'rpg' | 'standard';
export type PlayStyle = 'open' | 'open_surface' | 'surface_bound';
export type PlayerType = 'human' | 'ai';
export type PlayerMode = 'human_vs_human' | 'human_vs_ai' | 'ai_vs_ai';
export type AIDifficulty =
  | 'Beginner'
  | 'Developing'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert'
  // Backwards-compatible aliases
  | 'Apprentice'
  | 'Tactician'
  | 'Grandmaster'
  | 'Master'
  | 'Balanced';

export interface LearnedAIWeights {
  kingSafety: number;
  coordination: number;
  containment: number;
  antiLoop: number;
  terrainControl: number;
  tacticalDefense: number;
}

export interface GameLearningData {
  gameKey: string;
  gamesPlayed: number;
  aiWins: number;
  aiLosses: number;
  draws: number;
  successfulCheckmatePositions: Record<string, number>; // "x_y" -> count
  blunderMoveKeys: Record<string, number>; // "from_to" -> count
  highValueCaptures: Record<string, number>; // pieceType -> count
  summitAscensions: number;
  pastGameMovesByTurn?: Record<string, string[]>; // "white_1" -> ["pawn:4,1->4,3", ...]
  pastOpeningSignatures?: string[]; // Opening sequence hashes from previous games
  lastUsedDoctrines?: {
    white?: string[];
    black?: string[];
  };
  // Post-game diagnostic counters (Directive Section 12)
  loopOccurrences?: number;
  missedTacticsCount?: number;
  undefendedLossesCount?: number;
  loneChasingCount?: number;
  pyramidStallsCount?: number;
  stalemateDrawsCount?: number;
  unconvertedAdvantagesCount?: number;
  // Validated bounded learned weights that measurably adjust future AI evaluations
  learnedWeights?: LearnedAIWeights;
}

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface CombatResult {
  hit: boolean;
  dodged: boolean;
  crit: boolean;
  damage: number;
  counterDamage?: number;
  attackerDiceRoll: number;
  defenderDiceRoll: number;
  heightAdvantage: number; // +tier difference
  ongoingDuelStarted: boolean;
  targetKilled: boolean;
  attackerKilled?: boolean;
  attackerReturned?: boolean;
  diceOutcome?: 'attacker_win' | 'defender_win';
  combatMode?: 'dice' | 'rps';
  attackerRPS?: RPSChoice;
  defenderRPS?: RPSChoice;
  rpsOutcome?: 'attacker_win' | 'defender_win' | 'tie';
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetTile?: { x: number; y: number };
  expectedAction: string;
  hint: string;
}

export interface PracticeScenario {
  id: string;
  name: string;
  difficulty: 'Apprentice' | 'Tactician' | 'Grandmaster';
  objective: string;
  description: string;
  boardType: BoardType;
  gameMode: GameMode;
  initialPieces: Piece[];
  playerTurn: PieceColor;
}

// ==========================================
// AI TEACHING & VISUALIZATION TYPES
// ==========================================
export interface AITeachingOption {
  label: string;
  move: Move;
  category: 'capture' | 'defend' | 'climb' | 'support' | 'position' | 'attack';
}

export interface AIPlaybookEntry {
  id: string;
  name: string;
  field: BoardType | 'all';
  phase: 'opening' | 'middlegame' | 'endgame' | 'special_3d';
  chessFoundation: string;
  sequenceDescription: string;
  timesExecuted: number;
  winsGenerated: number;
  winRateBonus: number;
  lastUsedTurn?: number;
}

export interface AIPlaybookLogItem {
  id: string;
  turn: number;
  aiColor: PieceColor;
  boardType: BoardType;
  maneuverId: string;
  maneuverName: string;
  chessFoundation: string;
  actionSummary: string;
  remainingEnemyPieces: number;
  timestamp: number;
}

export interface AITeachingThought {
  step: 'evaluating' | 'targeting' | 'chosen' | 'executing';
  activePiece: Piece;
  consideredMoves: Move[];
  chosenMove: Move;
  options: AITeachingOption[];
  reason: string;
  targetDescription?: string;
  activePlaybookEntry?: AIPlaybookEntry;
  conversionTelemetry?: {
    isConversionState: boolean;
    modeLabel: string;
    kingEscapesBefore: number;
    kingEscapesAfter: number;
    coordinatedAttackers: number;
    cutoffSummary?: string;
  };
  aiChallengeTelemetry?: {
    matchGeneration: number;
    whiteDoctrineName: string;
    blackDoctrineName: string;
    pastGamePlaysBlocked: number;
    mimicMovesBlocked: number;
    whiteSurvivors: number;
    blackSurvivors: number;
    isNovelPlay: boolean;
  };
  rpgOddsShift?: {
    contextLabel: string;
    attackerPiece: Piece;
    targetPiece: Piece;
    oddsBefore: number;
    oddsAfter: number;
    factor: string;
  };
}

// ==========================================
// PYRAMID VISIBILITY SYSTEM TYPES
// ==========================================
export type BeaconSideMode = 'off' | 'opponent' | 'both';

export interface VisibilitySettings {
  autoAssistance: boolean;
  hiddenPieceBeacons: boolean;
  beaconSide: BeaconSideMode;
  terrainTransparency: 'auto' | 'on' | 'off';
  pyramidOpacity: number; // 0 to 100 percentage (e.g., 25 = 25% opacity)
  focusCameraOnActiveMove: boolean;
  nightMode?: boolean; // Low-glare eye-comfort & long-distance high-contrast mode
}

export interface PieceBeaconInfo {
  piece: Piece;
  screenX: number;
  screenY: number;
  anchorX?: number;
  anchorY?: number;
  isOccluded: boolean;
  occlusionLevel?: 'full' | 'partial';
  status: 'in_check' | 'active_mover' | 'target' | 'selected' | 'hidden';
  label: string;
  directionAngle?: number;
  priority?: number;
  poleHeight3D?: number;
  depthTier?: number;
  worldFlagY?: number;
  worldPieceY?: number;
}
