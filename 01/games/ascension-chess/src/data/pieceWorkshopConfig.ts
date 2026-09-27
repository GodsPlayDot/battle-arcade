import { BoardType, PieceType } from '../types/chess';

export interface BoardRangeConfig {
  classic: number; // 8x8 flat
  battlefield: number; // 20x20 flat
  quick_pyramid: number; // 12x12 pyramid
  pyramid: number; // 20x20 grand pyramid
}

export interface PyramidNavigationConfig {
  canEnterVerticalWalls: boolean;
  canCrossFloorWallBends: boolean;
  canWrapWallCorners: boolean;
  canClimbUp: boolean;
  canDescendDown: boolean;
  canCrossSurfaceCaptureInSurfaceBound: boolean;
  blockedByOppositeSurfaceInSurfaceBound: boolean;
  usesJumpColorLock: boolean;
  summitReleasesColorLock: boolean;
  canUseSummitToBaseJump: boolean;
}

export interface DirectionPermissions {
  forward: boolean;
  backward: boolean;
  sideways: boolean;
  diagonalForward: boolean;
  diagonalBackward: boolean;
  lJump: boolean;
}

export interface PieceWorkshopRuleSpec {
  pieceType: PieceType;
  ruleId: string;
  name: string;
  roleTitle: string;
  status: 'CONFIRMED' | 'TESTING' | 'CUSTOMIZED';
  movementFamily: 'step' | 'orthogonal_ray' | 'diagonal_ray' | 'omni_ray' | 'l_jump' | 'hybrid_specialist';
  boardRanges: BoardRangeConfig;
  captureRangeMatchesMove: boolean;
  customCaptureRange?: number;
  directions: DirectionPermissions;
  pyramidNav: PyramidNavigationConfig;
  // Piece-specific parameters
  specialParams: {
    // King
    kingAllowCastling?: boolean;
    // Pawn
    pawnInitialDoubleStep?: boolean;
    pawnAllowWallSidewaysMove?: boolean;
    pawnAllowEnPassant?: boolean;
    // Knight
    knightAllowPyramidStepClimb?: boolean;
    // Vanguard
    vanguardStartRange?: number;
    vanguardMinRange?: number;
    vanguardPermanentDecay?: boolean;
    vanguardWallSidewaysMove?: boolean;
    vanguardWallSidewaysCapture?: boolean;
    vanguardAllowRookExchange?: boolean;
    vanguardRookExchangeMaxRange?: number; // 0 = unlimited
    vanguardRookExchangeCrossSurface?: boolean;
    // Gargoyle
    gargoyleValleyJumpRadius?: number;
    gargoylePyramidJumpRadius?: number;
    gargoyleGlideMaxRange?: number;
    gargoyleWallDefBonus?: number;
    gargoyleWallEvaBonus?: number;
    // Ascendant
    ascendantStage1Range?: number;
    ascendantStage2Range?: number;
    ascendantStage3Range?: number;
    ascendantPermanentStages?: boolean;
    // Trebuchet
    trebuchetJumpCaptureRange?: number;
    trebuchetBombardMinRange?: number;
    trebuchetBombardMaxRange?: number;
    trebuchetKnockbackTiles?: number;
    trebuchetPyramidBombardSummitOnly?: boolean;
    trebuchetBombardCanGiveCheck?: boolean;
  };
  // Written canonical specification strings (auto-synced or custom notes)
  doesNotAllow: string[];
  counterplayNotes: string;
  safeMoveTargetRange: [number, number];
}

export type PieceWorkshopConfigMap = Record<PieceType, PieceWorkshopRuleSpec>;

const STORAGE_KEY = 'ascension_piece_workshop_config_v1';

export const DEFAULT_PIECE_WORKSHOP_CONFIG = {
  king: {
    pieceType: 'king',
    ruleId: 'PIECE-KING-01',
    name: 'King',
    roleTitle: 'Royal Anchor & Sole Victory Condition',
    status: 'CONFIRMED',
    movementFamily: 'omni_ray',
    boardRanges: {
      classic: 1,
      battlefield: 13,
      quick_pyramid: 13,
      pyramid: 13,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {
      kingAllowCastling: true,
    },
    doesNotAllow: [
      'Moving into or remaining in Check',
      'Jumping over occupied blocking tiles',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Cross-surface captures in Surface Bound mode',
    ],
    counterplayNotes:
      'Long-range rays on 20x20 boards let the King relocate across terraces (up to 13 tiles below the summit; 1 connected tile in all 8 directions while occupying the 4x4 Summit), while any occupied tile blocks its ray and Surface Bound walls create tactical shelter.',
    safeMoveTargetRange: [3, 10],
  },
  queen: {
    pieceType: 'queen',
    ruleId: 'PIECE-QUEEN-01',
    name: 'Queen',
    roleTitle: 'long-Range Omni-Directional Sovereign',
    status: 'CONFIRMED',
    movementFamily: 'omni_ray',
    boardRanges: {
      classic: 8,
      battlefield: 25,
      quick_pyramid: 25,
      pyramid: 25,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {},
    doesNotAllow: [
      'Jumping over occupied friendly or enemy tiles',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Attacking across Horizontal <-> Vertical surfaces in Surface Bound mode',
    ],
    counterplayNotes:
      'While occupying the 4x4 Summit, ordinary movement is capped at 1 connected tile in all 8 directions (resuming full unlimited range on the next turn after stepping off the summit); blocked by intermediate pieces and restricted by Surface Bound walls.',
    safeMoveTargetRange: [10, 24],
  },
  rook: {
    pieceType: 'rook',
    ruleId: 'PIECE-ROOK-01',
    name: 'Rook',
    roleTitle: '18-Tile Orthogonal Rampart & Corridor Controller',
    status: 'CONFIRMED',
    movementFamily: 'orthogonal_ray',
    boardRanges: {
      classic: 8,
      battlefield: 18,
      quick_pyramid: 18,
      pyramid: 18,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: false,
      diagonalBackward: false,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {},
    doesNotAllow: [
      'Moving beyond 18 connected orthogonal tiles on large/Pyramid boards',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Diagonal movement below the 4x4 Summit or jumping over pieces',
      'Cross-surface captures in Surface Bound mode',
    ],
    counterplayNotes:
      '18-tile orthogonal range below the summit (and 1 connected tile in any of the 8 directions while occupying the 4x4 Summit, resuming 18-tile orthogonal range after leaving the summit); serves as the Vanguard Exchange anchor.',
    safeMoveTargetRange: [6, 18],
  },
  bishop: {
    pieceType: 'bishop',
    ruleId: 'PIECE-BISHOP-01',
    name: 'Bishop',
    roleTitle: '13-Tile Diagonal Terrace & Bend Slicer',
    status: 'CONFIRMED',
    movementFamily: 'diagonal_ray',
    boardRanges: {
      classic: 8,
      battlefield: 13,
      quick_pyramid: 13,
      pyramid: 13,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: false,
      backward: false,
      sideways: false,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {},
    doesNotAllow: [
      'Moving beyond 13 connected diagonal steps',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Orthogonal movement below the 4x4 Summit or jumping over pieces',
      'Cross-surface captures in Surface Bound mode',
    ],
    counterplayNotes:
      '13-tile diagonal cap below the summit; while occupying the 4x4 Summit, moves 1 connected tile in any of the 8 directions and resumes 13-tile diagonal range on the next turn after leaving the summit.',
    safeMoveTargetRange: [5, 14],
  },
  knight: {
    pieceType: 'knight',
    ruleId: 'PIECE-KNIGHT-01',
    name: 'Knight',
    roleTitle: 'L-Jump Leaper & Summit Color-Release Specialist',
    status: 'CONFIRMED',
    movementFamily: 'l_jump',
    boardRanges: {
      classic: 3,
      battlefield: 3,
      quick_pyramid: 3,
      pyramid: 3,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: false,
      diagonalBackward: false,
      lJump: true,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: false,
      usesJumpColorLock: true,
      summitReleasesColorLock: true,
      canUseSummitToBaseJump: true,
    },
    specialParams: {
      knightAllowPyramidStepClimb: true,
    },
    doesNotAllow: [
      'Landing on opposite checker color via jump before reaching the 4x4 Summit in Surface Bound mode',
      'Cross-surface captures in Surface Bound mode',
    ],
    counterplayNotes:
      'The ONLY piece exempt from the 1-tile 4x4 Summit movement restriction, retaining its full legal summit jumping mobility! In Surface Bound mode its jump is locked to its starting checker color until it ascends to the 4x4 Summit.',
    safeMoveTargetRange: [3, 8],
  },
  pawn: {
    pieceType: 'pawn',
    ruleId: 'PIECE-PAWN-01',
    name: 'Pawn',
    roleTitle: 'Frontline Infantry & Cross-Surface Diagonal Exception',
    status: 'CONFIRMED',
    movementFamily: 'step',
    boardRanges: {
      classic: 1,
      battlefield: 1,
      quick_pyramid: 1,
      pyramid: 1,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: false,
      sideways: false,
      diagonalForward: true,
      diagonalBackward: false,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: true, // CANONICAL PAWN EXCEPTION
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {
      pawnInitialDoubleStep: true,
      pawnAllowWallSidewaysMove: true,
      pawnAllowEnPassant: true,
    },
    doesNotAllow: [
      'Backward movement on Flat boards (8x8 Classic & 20x20 Battlefield Flat)',
      'Capturing in non-forward-diagonal directions (even on the 4x4 Summit where ordinary movement is 8-directional)',
      'Promoting merely by reaching the 4x4 Summit (promotes ONLY on the opposite back rank)',
      'Capturing beyond 1 connected forward-diagonal step',
    ],
    counterplayNotes:
      'While occupying the 4x4 Summit, makes an ordinary move of 1 connected tile in all 8 directions while preserving strictly 1-step forward-diagonal capture. Also the ONLY piece allowed to capture and give check across Horizontal <-> Vertical surfaces in Surface Bound mode.',
    safeMoveTargetRange: [1, 4],
  },
  vanguard: {
    pieceType: 'vanguard',
    ruleId: 'PIECE-VANGUARD-01',
    name: 'Vanguard',
    roleTitle: '9->1 Decaying Shock Runner & Own-Team Rook Exchanger',
    status: 'CONFIRMED',
    movementFamily: 'hybrid_specialist',
    boardRanges: {
      classic: 9,
      battlefield: 9,
      quick_pyramid: 9,
      pyramid: 9,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: false,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {
      vanguardStartRange: 9,
      vanguardMinRange: 1,
      vanguardPermanentDecay: true,
      vanguardWallSidewaysMove: true,
      vanguardWallSidewaysCapture: true,
      vanguardAllowRookExchange: true,
      vanguardRookExchangeMaxRange: 0, // 0 = unlimited
      vanguardRookExchangeCrossSurface: true,
    },
    doesNotAllow: [
      'Recovering forward sprint range after advancing or crossing the board center',
      'Moving more than 1 connected tile for ordinary movement while starting a turn on the 4x4 Summit',
      'Swapping with an enemy Rook',
      'Swapping with a friendly Rook if the swap leaves its own King in check',
    ],
    counterplayNotes:
      'Explosive 9-tile opening sprint decays permanently down to 1 tile at the center; on the 4x4 Summit it makes a 1-tile ordinary move in any of the 8 directions (resuming normal forward movement after leaving the summit) and can swap a friendly Rook into the high ground.',
    safeMoveTargetRange: [4, 12],
  },
  gargoyle: {
    pieceType: 'gargoyle',
    ruleId: 'PIECE-GARGOYLE-01',
    name: 'Gargoyle',
    roleTitle: 'Vertical Cliff Sentinel & Stone Bulwark Leaper',
    status: 'CONFIRMED',
    movementFamily: 'hybrid_specialist',
    boardRanges: {
      classic: 2,
      battlefield: 2,
      quick_pyramid: 3,
      pyramid: 3,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: true,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: true,
      summitReleasesColorLock: true,
      canUseSummitToBaseJump: true,
    },
    specialParams: {
      gargoyleValleyJumpRadius: 2,
      gargoylePyramidJumpRadius: 3,
      gargoyleGlideMaxRange: 3,
      gargoyleWallDefBonus: 10,
      gargoyleWallEvaBonus: 15,
    },
    doesNotAllow: [
      '3-tile leaps while standing on flat valley ground (limited to 2 tiles until reaching Pyramid terrain)',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Jumping onto opposite-color tiles in Surface Bound mode prior to 4x4 Summit release',
    ],
    counterplayNotes:
      '2-tile leap on flat valley ground, 3-tile leap/glide with Stone Bulwark (+10 DEF, +15% EVA) on Pyramid cliffs/terraces below the summit, and 1-tile 8-direction ordinary movement while occupying the 4x4 Summit (resuming 3-tile Pyramid range on the next turn after leaving).',
    safeMoveTargetRange: [4, 14],
  },
  ascendant: {
    pieceType: 'ascendant',
    ruleId: 'PIECE-ASCENDANT-01',
    name: 'Ascendant',
    roleTitle: '3-Stage Elevation & Territory Evolution Specialist',
    status: 'CONFIRMED',
    movementFamily: 'omni_ray',
    boardRanges: {
      classic: 2,
      battlefield: 4,
      quick_pyramid: 4,
      pyramid: 4,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: false,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: true,
      usesJumpColorLock: false,
      summitReleasesColorLock: false,
      canUseSummitToBaseJump: false,
    },
    specialParams: {
      ascendantStage1Range: 2,
      ascendantStage2Range: 3,
      ascendantStage3Range: 4,
      ascendantPermanentStages: false,
    },
    doesNotAllow: [
      'Jumping over occupied tiles',
      'Moving more than 1 connected tile while starting a turn on the 4x4 Summit',
      'Retaining Stage III stride if pushed back into the home valley (unless Permanent Stages is enabled in Workshop)',
    ],
    counterplayNotes:
      'Evolves from 2 -> 3 -> 4 tiles as it advances and climbs; while occupying the 4x4 Summit, ordinary movement is 1 connected tile in all 8 directions (resuming full Stage stride on the next turn after leaving the summit without losing progression state).',
    safeMoveTargetRange: [6, 16],
  },
  trebuchet: {
    pieceType: 'trebuchet',
    ruleId: 'PIECE-TREBUCHET-01',
    name: 'Trebuchet',
    roleTitle: '1–2 Tile Jump-Capturer & 3-Tile Knockback Siege Engine',
    status: 'CONFIRMED',
    movementFamily: 'hybrid_specialist',
    boardRanges: {
      classic: 2,
      battlefield: 2,
      quick_pyramid: 2,
      pyramid: 2,
    },
    captureRangeMatchesMove: true,
    directions: {
      forward: true,
      backward: true,
      sideways: true,
      diagonalForward: true,
      diagonalBackward: true,
      lJump: true,
    },
    pyramidNav: {
      canEnterVerticalWalls: true,
      canCrossFloorWallBends: true,
      canWrapWallCorners: true,
      canClimbUp: true,
      canDescendDown: true,
      canCrossSurfaceCaptureInSurfaceBound: false,
      blockedByOppositeSurfaceInSurfaceBound: false,
      usesJumpColorLock: false,
      summitReleasesColorLock: true,
      canUseSummitToBaseJump: false,
    },
    specialParams: {
      trebuchetJumpCaptureRange: 2,
      trebuchetBombardMinRange: 3,
      trebuchetBombardMaxRange: 6,
      trebuchetKnockbackTiles: 3,
      trebuchetPyramidBombardSummitOnly: true,
      trebuchetBombardCanGiveCheck: false,
    },
    doesNotAllow: [
      'Capturing enemies via ranged Bombardment (must physically Jump-Capture within 1-2 tiles)',
      'Moving more than 1 connected tile for ordinary non-capture movement while starting a turn on the 4x4 Summit',
      'Bombarding non-Summit tiles when the Trebuchet is positioned on the Pyramid (Tier 1+ or Wall)',
      'Bombarding the enemy King directly as a lethal capture',
    ],
    counterplayNotes:
      'Separates ordinary movement (1-2 orthogonal tiles below the summit; 1 connected tile in all 8 directions on the 4x4 Summit), lethal capture (1-2 tile jump), and ranged disruption (3-tile knockback bombardment).',
    safeMoveTargetRange: [3, 10],
  },
} as unknown as PieceWorkshopConfigMap;

let cachedWorkshopConfig: PieceWorkshopConfigMap | null = null;

export function loadPieceWorkshopConfig(): PieceWorkshopConfigMap {
  if (cachedWorkshopConfig) return cachedWorkshopConfig;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedWorkshopConfig = structuredClone(DEFAULT_PIECE_WORKSHOP_CONFIG);
      return cachedWorkshopConfig;
    }
    const parsed = JSON.parse(raw) as Partial<PieceWorkshopConfigMap>;
    const merged: PieceWorkshopConfigMap = structuredClone(DEFAULT_PIECE_WORKSHOP_CONFIG);
    (Object.keys(merged) as PieceType[]).forEach((pt) => {
      if (parsed[pt]) {
        merged[pt] = {
          ...merged[pt],
          ...parsed[pt],
          boardRanges: {
            ...merged[pt].boardRanges,
            ...(parsed[pt]?.boardRanges || {}),
          },
          directions: {
            ...merged[pt].directions,
            ...(parsed[pt]?.directions || {}),
          },
          pyramidNav: {
            ...merged[pt].pyramidNav,
            ...(parsed[pt]?.pyramidNav || {}),
          },
          specialParams: {
            ...merged[pt].specialParams,
            ...(parsed[pt]?.specialParams || {}),
          },
        };
      }
    });
    cachedWorkshopConfig = merged;
    return merged;
  } catch {
    cachedWorkshopConfig = structuredClone(DEFAULT_PIECE_WORKSHOP_CONFIG);
    return cachedWorkshopConfig;
  }
}

export function getPieceWorkshopSpec(pieceType: PieceType): PieceWorkshopRuleSpec {
  const all = loadPieceWorkshopConfig();
  return all[pieceType] || DEFAULT_PIECE_WORKSHOP_CONFIG[pieceType];
}

export function getConfiguredBoardRange(pieceType: PieceType, boardType: BoardType): number {
  const spec = getPieceWorkshopSpec(pieceType);
  return spec.boardRanges[boardType] ?? spec.boardRanges.pyramid;
}

export function savePieceWorkshopConfig(nextConfig: PieceWorkshopConfigMap): void {
  cachedWorkshopConfig = structuredClone(nextConfig);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedWorkshopConfig));
    window.dispatchEvent(new CustomEvent('piece-workshop-updated'));
  } catch {
    // ignore storage quota errors
  }
}

export function resetPieceWorkshopConfig(): PieceWorkshopConfigMap {
  cachedWorkshopConfig = structuredClone(DEFAULT_PIECE_WORKSHOP_CONFIG);
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('piece-workshop-updated'));
  } catch {
    // ignore
  }
  return cachedWorkshopConfig;
}

export function formatPieceWorkshopRuleAsText(spec: PieceWorkshopRuleSpec): string {
  const dirs: string[] = [];
  if (spec.directions.forward) dirs.push('Forward');
  if (spec.directions.backward) dirs.push('Backward');
  if (spec.directions.sideways) dirs.push('Sideways (Orthogonal)');
  if (spec.directions.diagonalForward) dirs.push('Forward-Diagonal');
  if (spec.directions.diagonalBackward) dirs.push('Backward-Diagonal');
  if (spec.directions.lJump) dirs.push('L-Jump / Leap');

  const lines: string[] = [
    '========================================================================',
    `RULE ID: ${spec.ruleId}`,
    `PIECE: ${spec.name.toUpperCase()} (${spec.roleTitle})`,
    `STATUS: ${spec.status}`,
    `BOARDS: Classic 8x8, Battlefield 20x20, Quick Pyramid 12x12, Grand Pyramid 20x20`,
    `PLAY STYLE: Both Open Surface and Surface Bound`,
    `COMBAT MODE: Both Standard and RPG`,
    '',
    'FLAT MOVEMENT & RANGE BY BOARD:',
    `- Classic 8x8 Max Range: ${spec.boardRanges.classic} tile(s)`,
    `- Battlefield 20x20 Max Range: ${spec.boardRanges.battlefield >= 25 ? 'Unlimited (Full Board)' : `${spec.boardRanges.battlefield} tile(s)`}`,
    `- Quick Pyramid 12x12 Max Range: ${spec.boardRanges.quick_pyramid >= 25 ? 'Unlimited (Full Board)' : `${spec.boardRanges.quick_pyramid} tile(s)`}`,
    `- Grand Pyramid 20x20 Max Range: ${spec.boardRanges.pyramid >= 25 ? 'Unlimited (Full Board)' : `${spec.boardRanges.pyramid} tile(s)`}`,
    `- Allowed Directions: ${dirs.join(', ') || 'None'}`,
    '',
    'PYRAMID NAVIGATION (WHAT IT CAN & CANNOT DO):',
    `- Occupy Vertical Cliff Walls: ${spec.pyramidNav.canEnterVerticalWalls ? 'YES (Legal playable square)' : 'NO (Forbidden)'}`,
    `- Cross Floor <-> Wall & Wall <-> Terrace 90° Bends: ${spec.pyramidNav.canCrossFloorWallBends ? 'YES (Continuous connected path)' : 'NO (Must stop before bend)'}`,
    `- Lateral Wall Corner Wrap: ${spec.pyramidNav.canWrapWallCorners ? 'YES' : 'NO'}`,
    `- Climb Upward Tiers: ${spec.pyramidNav.canClimbUp ? 'YES' : 'NO'}`,
    `- Descend Downward Tiers: ${spec.pyramidNav.canDescendDown ? 'YES' : 'NO'}`,
    '',
    'CAPTURE:',
    `- Matches Movement Pattern: ${spec.captureRangeMatchesMove ? 'YES' : `Custom (${spec.customCaptureRange || 1} tile)`}`,
    ...(spec.pieceType === 'trebuchet'
      ? [
          `- Trebuchet Jump-Capture Range: 1 to ${spec.specialParams.trebuchetJumpCaptureRange ?? 2} tiles (Must physically land on target to capture)`,
          `- Trebuchet Ranged Bombardment: ${spec.specialParams.trebuchetBombardMinRange ?? 3} to ${spec.specialParams.trebuchetBombardMaxRange ?? 6} tiles (+Tier bonus) -> Knocks target back ${spec.specialParams.trebuchetKnockbackTiles ?? 3} tiles onto a random open tile (Does NOT capture)`,
          `- Pyramid Bombardment Restriction: ${spec.specialParams.trebuchetPyramidBombardSummitOnly ? 'On Pyramid (Tier 1+/Wall), can ONLY bombard targets on the 4x4 Summit' : 'Can bombard any in-range Pyramid tile'}`,
        ]
      : []),
    '',
    'SURFACE BOUND:',
    `- Cross-Surface Attack (Horizontal <-> Vertical): ${
      spec.pyramidNav.canCrossSurfaceCaptureInSurfaceBound
        ? 'ALLOWED (May capture and give check across surfaces)'
        : 'FORBIDDEN (Must occupy same surface class to attack)'
    }`,
    `- Opposite-Surface Occupied Tiles Block Sliding Rays: ${
      spec.pyramidNav.blockedByOppositeSurfaceInSurfaceBound ? 'YES' : 'NO'
    }`,
    '',
    'JUMP COLOR & 4x4 SUMMIT:',
    `- 4x4 Summit Tactical Mobility Rule: ${
      spec.pieceType === 'knight'
        ? 'EXEMPT from 1-tile limit — retains full legal Summit jump mobility'
        : '1-Tile Connected Ordinary Move in all 8 directions while occupying the 4x4 Summit (including when leaving the summit); normal movement resumes on the next turn after leaving'
    }`,
    `- Jump Color Lock (Before 4x4 Summit): ${
      spec.pyramidNav.usesJumpColorLock
        ? 'YES (Jump destinations must match starting tile color until 4x4 Summit release)'
        : 'NO (Not color-locked)'
    }`,
    `- 4x4 Summit Color Release: ${spec.pyramidNav.summitReleasesColorLock ? 'YES (Permanent upon reaching 4x4 Summit)' : 'NO'}`,
    `- 4x4 Summit-to-Base Jump: ${spec.pyramidNav.canUseSummitToBaseJump ? 'ENABLED' : 'DISABLED'}`,
    '',
    'SPECIAL ABILITY PARAMETERS:',
  ];

  if (spec.pieceType === 'king') {
    lines.push(`- Castling Permitted: ${spec.specialParams.kingAllowCastling ? 'YES' : 'NO'}`);
  } else if (spec.pieceType === 'pawn') {
    lines.push(`- Opening 2-Tile Sprint: ${spec.specialParams.pawnInitialDoubleStep ? 'YES' : 'NO'}`);
    lines.push(`- Lateral Wall Step on Vertical Cliff: ${spec.specialParams.pawnAllowWallSidewaysMove ? 'YES' : 'NO'}`);
    lines.push(`- En Passant Permitted: ${spec.specialParams.pawnAllowEnPassant ? 'YES' : 'NO'}`);
  } else if (spec.pieceType === 'knight') {
    lines.push(
      `- 1-Step Surface-Bend Climb Fallback (for Color-Locked Summit Ascent): ${
        spec.specialParams.knightAllowPyramidStepClimb ? 'YES' : 'NO'
      }`
    );
  } else if (spec.pieceType === 'vanguard') {
    lines.push(
      `- Forward Range Decay: ${spec.specialParams.vanguardStartRange ?? 9} tiles -> ${spec.specialParams.vanguardMinRange ?? 1} tile (${
        spec.specialParams.vanguardPermanentDecay ? 'Permanent decay' : 'Position-based'
      })`
    );
    lines.push(
      `- Vertical Wall Sideways Move / Capture: Move=${spec.specialParams.vanguardWallSidewaysMove ? 'YES' : 'NO'}, Capture=${
        spec.specialParams.vanguardWallSidewaysCapture ? 'YES' : 'NO'
      }`
    );
    lines.push(
      `- Own-Team Rook Exchange: ${spec.specialParams.vanguardAllowRookExchange ? 'ENABLED' : 'DISABLED'} (Max Range: ${
        (spec.specialParams.vanguardRookExchangeMaxRange ?? 0) === 0
          ? 'Unlimited'
          : `${spec.specialParams.vanguardRookExchangeMaxRange} tiles`
      }, Cross-Surface: ${spec.specialParams.vanguardRookExchangeCrossSurface ? 'YES' : 'NO'})`
    );
  } else if (spec.pieceType === 'gargoyle') {
    lines.push(`- Flat Valley Jump Radius: ${spec.specialParams.gargoyleValleyJumpRadius ?? 2} tiles`);
    lines.push(`- Pyramid / Wall Jump & Glide Radius: ${spec.specialParams.gargoylePyramidJumpRadius ?? 3} tiles`);
    lines.push(
      `- Vertical Wall Stone Bulwark Bonus: +${spec.specialParams.gargoyleWallDefBonus ?? 10} DEF, +${
        spec.specialParams.gargoyleWallEvaBonus ?? 15
      }% Evasion`
    );
  } else if (spec.pieceType === 'ascendant') {
    lines.push(
      `- Stage Stride Progression: Stage I = ${spec.specialParams.ascendantStage1Range ?? 2} tiles, Stage II = ${
        spec.specialParams.ascendantStage2Range ?? 3
      } tiles, Stage III = ${spec.specialParams.ascendantStage3Range ?? 4} tiles`
    );
    lines.push(`- Stage Retention: ${spec.specialParams.ascendantPermanentStages ? 'Permanent once unlocked' : 'Dynamic by current elevation + advancement'}`);
  } else if (spec.pieceType === 'trebuchet') {
    lines.push(`- Jump-Capture Radius: 1-${spec.specialParams.trebuchetJumpCaptureRange ?? 2} tiles`);
    lines.push(
      `- Bombardment Range: ${spec.specialParams.trebuchetBombardMinRange ?? 3}-${spec.specialParams.trebuchetBombardMaxRange ?? 6} tiles (+Elevation Tier)`
    );
    lines.push(`- Knockback Distance: ${spec.specialParams.trebuchetKnockbackTiles ?? 3} tiles onto random open tile`);
    lines.push(`- Pyramid 4x4 Summit-Only Bombardment: ${spec.specialParams.trebuchetPyramidBombardSummitOnly ? 'YES' : 'NO'}`);
  } else {
    lines.push('- Standard continuous-surface ray geometry.');
  }

  lines.push('');
  lines.push('DOES NOT ALLOW:');
  spec.doesNotAllow.forEach((item) => {
    lines.push(`- ${item}`);
  });
  lines.push('');
  lines.push('CHECK & COUNTERPLAY:');
  lines.push(`- Target Safe Legal Moves Per Turn: ${spec.safeMoveTargetRange[0]} to ${spec.safeMoveTargetRange[1]} tiles`);
  lines.push(`- Counterplay: ${spec.counterplayNotes}`);

  return lines.join('\n');
}

export function formatAllPieceWorkshopRulesAsText(configMap: PieceWorkshopConfigMap): string {
  const header = [
    '========================================================================',
    'ASCENSION 3D CHESS — PIECE WORKSHOP & BALANCING FRAMEWORK SPECIFICATION',
    '========================================================================',
    'Four-Level Rule Priority Hierarchy:',
    '  Level 1: King Safety (Absolute Priority — No move or ability may leave friendly King in Check)',
    '  Level 2: Surface & Jump Restrictions (Open Surface vs Surface Bound, Jump Color Lock & 4x4 Summit Release)',
    '  Level 3: Board-Specific Movement Rules (Classic 8x8, Battlefield 20x20, Quick Pyramid 12x12, Grand Pyramid 20x20)',
    '  Level 4: Piece Movement, Pyramid Navigation & Special Ability Rules',
    '',
  ].join('\n');

  const blocks = (Object.keys(configMap) as PieceType[]).map((pt) => formatPieceWorkshopRuleAsText(configMap[pt]));
  return `${header}\n${blocks.join('\n\n')}\n`;
}
