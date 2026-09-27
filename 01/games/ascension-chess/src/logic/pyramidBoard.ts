import { ArmyDeployment, BoardType, GameMode, Piece, PieceColor, PieceType, Position, RPGStats, TileData } from '../types/chess';
import { getPieceWorkshopSpec } from '../data/pieceWorkshopConfig';

export const BOARD_SIZES: Record<BoardType, number> = {
  classic: 8,          // 8x8 traditional flat chess battlefield
  quick_pyramid: 12,   // 12x12 elevated pyramid: compressed 4x4 summit & 1-tier steps
  battlefield: 20,     // 20x20 flat maneuvering battlefield with centered deployment
  pyramid: 20,         // 20x20 grand pyramid rising through 4 climbs to 4x4 summit
};

// 5 playable height levels (Elevations 0 to 4), separated by vertical walls (1.25m step each)
export const TIER_HEIGHTS: Record<number, number> = {
  0: 0.0,   // Elevation 0: Lower Plains & Flanking Lanes
  1: 1.25,  // Elevation 1: Lower Terrace
  2: 2.50,  // Elevation 2: Middle Terrace
  3: 3.75,  // Elevation 3: Upper Terrace (Summit on 12x12 Quick Pyramid)
  4: 5.00,  // Elevation 4: Summit Apex (Summit on 20x20 Grand Pyramid)
};

export function getTileTier(boardType: BoardType, x: number, y: number): number {
  // Classic (8x8) and Battlefield (20x20 flat) boards have zero elevation
  if (boardType === 'classic' || boardType === 'battlefield') return 0;

  // 12x12 Quick Pyramid: Concentric stepped ziggurat to 4x4 Summit
  // Lower Plain: outer perimeter (ranks 0, 1 for White; ranks 10, 11 for Black; files 0, 1 & 10, 11)
  if (boardType === 'quick_pyramid') {
    // 4x4 Summit Apex: x: [4..7], y: [4..7] -> Elevation 3
    if (x >= 4 && x <= 7 && y >= 4 && y <= 7) {
      return 3;
    }
    // 6x6 Upper Terrace: x: [3..8], y: [3..8] -> Elevation 2
    if (x >= 3 && x <= 8 && y >= 3 && y <= 8) {
      return 2;
    }
    // 8x8 Terrace: x: [2..9], y: [2..9] -> Elevation 1
    if (x >= 2 && x <= 9 && y >= 2 && y <= 9) {
      return 1;
    }
    // Lower Plain: Elevation 0
    return 0;
  }

  // 20x20 Grand Pyramid: Centered concentric pyramid tiers
  // Center 4x4 Summit Apex: x: [8..11], y: [8..11]
  if (x >= 8 && x <= 11 && y >= 8 && y <= 11) {
    return 4;
  }
  // Upper Terrace 6x6: x: [7..12], y: [7..12]
  if (x >= 7 && x <= 12 && y >= 7 && y <= 12) {
    return 3;
  }
  // Middle Terrace 8x8: x: [6..13], y: [6..13]
  if (x >= 6 && x <= 13 && y >= 6 && y <= 13) {
    return 2;
  }
  // Lower Terrace 10x10: x: [5..14], y: [5..14]
  if (x >= 5 && x <= 14 && y >= 5 && y <= 14) {
    return 1;
  }
  // Elevation 0: Open tiles surrounding the pyramid on all sides (20x20 battlefield)
  return 0;
}

export function isSummitTile(boardType: BoardType, x: number, y: number): boolean {
  if (boardType === 'quick_pyramid') {
    return x >= 4 && x <= 7 && y >= 4 && y <= 7;
  }
  if (boardType === 'pyramid') {
    return x >= 8 && x <= 11 && y >= 8 && y <= 11;
  }
  return false;
}

export function isValleyTile(boardType: BoardType, x: number, y: number): boolean {
  if (boardType === 'classic' || boardType === 'battlefield') return true;
  return getTileTier(boardType, x, y) === 0;
}

/**
 * Authoritative Continuous Board Law checker color ('light' | 'dark') for any horizontal or vertical position.
 */
export function getPositionCheckerColor(pos: Position, boardType: BoardType): 'light' | 'dark' {
  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';
  if (!isPyramidMode) {
    return (pos.x + pos.y) % 2 === 0 ? 'light' : 'dark';
  }
  if (pos.isVerticalWall) {
    const lowerTier = Math.max(0, (pos.wallTierStep || 1) - 1);
    return (pos.x + pos.y + lowerTier) % 2 === 0 ? 'light' : 'dark';
  }
  const tier = pos.tier ?? getTileTier(boardType, pos.x, pos.y);
  return (pos.x + pos.y + tier) % 2 === 0 ? 'light' : 'dark';
}

/**
 * Law 10 (Surface Bound — Summit Descent Law):
 * Designated Pyramid-Base landing ring surrounding the base of the Pyramid:
 * - On Grand Pyramid 20x20: the 12x12 Pyramid Base perimeter ring (outer edge of x,y in [4..15], Tier 0)
 * - On Quick Pyramid 12x12: the 10x10 Pyramid Base perimeter ring (outer edge of x,y in [1..10], Tier 0)
 */
export function isPyramidBaseLandingTile(boardType: BoardType, x: number, y: number): boolean {
  if (boardType === 'pyramid') {
    const inBox = x >= 4 && x <= 15 && y >= 4 && y <= 15;
    const onRing = x === 4 || x === 15 || y === 4 || y === 15;
    return inBox && onRing && getTileTier(boardType, x, y) === 0;
  }
  if (boardType === 'quick_pyramid') {
    const inBox = x >= 1 && x <= 10 && y >= 1 && y <= 10;
    const onRing = x === 1 || x === 10 || y === 1 || y === 10;
    return inBox && onRing && getTileTier(boardType, x, y) === 0;
  }
  return false;
}

/**
 * Computes legal 4x4 Summit -> Pyramid Base jump landing positions for a jumper standing on the 4x4 Summit.
 * Projects the 8 Knight L-vectors from the summit tile directly to the designated Pyramid Base perimeter ring.
 * Every target is validated against the generated board's authoritative playable tiles.
 */
export function getSummitToBaseJumpTargets(
  x: number,
  y: number,
  boardType: BoardType
): Position[] {
  if (!isSummitTile(boardType, x, y)) return [];
  const targets: Position[] = [];
  const knightVectors: [number, number][] = [
    [1, 2], [2, 1], [-1, 2], [-2, 1],
    [1, -2], [2, -1], [-1, -2], [-2, -1],
  ];

  // Scale factor so L-vectors from 4x4 Summit reach the Pyramid Base perimeter ring
  const scales = boardType === 'pyramid' ? [2] : [1, 2];

  for (const scale of scales) {
    for (const [dx, dy] of knightVectors) {
      const tx = x + dx * scale;
      const ty = y + dy * scale;
      if (isPyramidBaseLandingTile(boardType, tx, ty)) {
        const authPos = toAuthoritativePosition(boardType, { x: tx, y: ty, isVerticalWall: false });
        if (authPos && authPos.tier === 0 && !targets.some((t) => t.x === authPos.x && t.y === authPos.y)) {
          targets.push(authPos);
        }
      }
    }
  }

  // Also ensure any aligned Pyramid Base perimeter tiles matching Knight L-offset parity from (x, y) are reachable
  const minB = boardType === 'pyramid' ? 4 : 1;
  const maxB = boardType === 'pyramid' ? 15 : 10;
  for (let bx = minB; bx <= maxB; bx++) {
    for (let by = minB; by <= maxB; by++) {
      if (!isPyramidBaseLandingTile(boardType, bx, by)) continue;
      const adx = Math.abs(bx - x);
      const ady = Math.abs(by - y);
      // Must preserve Knight L-ratio (one axis even, one axis odd, non-orthogonal, non-diagonal)
      if (adx > 0 && ady > 0 && adx !== ady && (adx + ady) % 2 === 1 && Math.min(adx, ady) <= 3) {
        const authPos = toAuthoritativePosition(boardType, { x: bx, y: by, isVerticalWall: false });
        if (authPos && authPos.tier === 0 && !targets.some((t) => t.x === authPos.x && t.y === authPos.y)) {
          targets.push(authPos);
        }
      }
    }
  }

  return targets;
}

const BOARD_TILES_CACHE: Partial<Record<BoardType, TileData[]>> = {};
const BOARD_TILE_INDEX_CACHE: Partial<Record<BoardType, Map<string, TileData>>> = {};

export function getPlayableTileKey(
  posOrX:
    | { x: number; y: number; isVerticalWall?: boolean; wallDirection?: string }
    | number,
  y?: number,
  isVerticalWall?: boolean,
  wallDirection?: string
): string {
  if (typeof posOrX === 'object' && posOrX !== null) {
    if (posOrX.isVerticalWall) {
      return `V:${posOrX.x}:${posOrX.y}:${posOrX.wallDirection || 'south'}`;
    }
    return `H:${posOrX.x}:${posOrX.y}`;
  }
  if (isVerticalWall) {
    return `V:${posOrX}:${y}:${wallDirection || 'south'}`;
  }
  return `H:${posOrX}:${y}`;
}

export function generateBoardTiles(boardType: BoardType): TileData[] {
  const cached = BOARD_TILES_CACHE[boardType];
  if (cached) return cached;

  const size = BOARD_SIZES[boardType];
  const tiles: TileData[] = [];
  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tier = getTileTier(boardType, x, y);
      const isSummit = isSummitTile(boardType, x, y);
      const isValley = isValleyTile(boardType, x, y);

      // Continuous checkerboard skin:
      // For flat boards (Classic, Battlefield): standard (x + y) % 2 === 0
      // For Pyramid boards: (x + y + tier) % 2 === 0 guarantees alternating skin across 3D terrain
      const isLight = isPyramidMode ? (x + y + tier) % 2 === 0 : (x + y) % 2 === 0;

      tiles.push({
        x,
        y,
        tier,
        isSummit,
        isValley,
        color: isLight ? 'light' : 'dark',
        isVerticalWall: false,
      });
    }
  }

  // Include interactive vertical cliff tiles for pyramid modes
  if (isPyramidMode) {
    const verticalTiles = getVerticalCliffTiles(boardType);
    tiles.push(...verticalTiles);
  }

  BOARD_TILES_CACHE[boardType] = tiles;
  return tiles;
}

/**
 * Builds and caches an O(1) lookup map of all authoritative playable tiles generated for `boardType`.
 */
export function getPlayableTileMap(boardType: BoardType): Map<string, TileData> {
  const cached = BOARD_TILE_INDEX_CACHE[boardType];
  if (cached) return cached;

  const tiles = generateBoardTiles(boardType);
  const map = new Map<string, TileData>();
  for (const tile of tiles) {
    const key = getPlayableTileKey(tile.x, tile.y, tile.isVerticalWall, tile.wallDirection);
    map.set(key, tile);
  }
  BOARD_TILE_INDEX_CACHE[boardType] = map;
  return map;
}

/**
 * Resolves a candidate position against the board's actual generated playable tiles.
 * Returns null if the tile does not exist on `boardType` (e.g. out-of-bounds or nonexistent wall face/step).
 */
export function resolvePlayableTile(
  boardType: BoardType,
  pos: {
    x: number;
    y: number;
    tier?: number;
    isVerticalWall?: boolean;
    wallDirection?: 'north' | 'south' | 'east' | 'west';
    wallTierStep?: number;
  }
): TileData | null {
  if (!pos || !Number.isInteger(pos.x) || !Number.isInteger(pos.y)) return null;
  const map = getPlayableTileMap(boardType);
  const isWall = Boolean(pos.isVerticalWall);
  if (isWall && !pos.wallDirection) return null;

  const key = getPlayableTileKey(pos.x, pos.y, isWall, pos.wallDirection);
  const tile = map.get(key);
  if (!tile) return null;

  if (isWall) {
    if (!tile.isVerticalWall || tile.wallDirection !== pos.wallDirection) return null;
    if (pos.wallTierStep !== undefined && pos.wallTierStep !== tile.wallTierStep) {
      return null;
    }
    return tile;
  }

  if (tile.isVerticalWall) return null;
  return tile;
}

/**
 * Converts any position candidate into its canonical, authoritative playable `Position` on `boardType`,
 * including the exact elevation `tier` and surface properties from `generateBoardTiles(boardType)`.
 * Returns `null` if no such playable tile exists on the board.
 */
export function toAuthoritativePosition(
  boardType: BoardType,
  pos: {
    x: number;
    y: number;
    tier?: number;
    isVerticalWall?: boolean;
    wallDirection?: 'north' | 'south' | 'east' | 'west';
    wallTierStep?: number;
  }
): Position | null {
  const tile = resolvePlayableTile(boardType, pos);
  if (!tile) return null;

  if (tile.isVerticalWall) {
    return {
      x: tile.x,
      y: tile.y,
      tier: tile.tier,
      isVerticalWall: true,
      wallDirection: tile.wallDirection,
      wallTierStep: tile.wallTierStep,
    };
  }

  return {
    x: tile.x,
    y: tile.y,
    tier: tile.tier,
    isVerticalWall: false,
  };
}

/**
 * Strictly checks whether `pos` corresponds to an existing playable tile on `boardType`
 * AND carries the exact matching `tier`, `isVerticalWall`, `wallDirection`, and `wallTierStep`.
 */
export function isValidPlayablePosition(boardType: BoardType, pos: Position): boolean {
  const tile = resolvePlayableTile(boardType, pos);
  if (!tile) return false;
  if (Boolean(pos.isVerticalWall) !== Boolean(tile.isVerticalWall)) return false;
  if (pos.tier !== tile.tier) return false;
  if (tile.isVerticalWall) {
    return (
      pos.wallDirection === tile.wallDirection &&
      pos.wallTierStep === tile.wallTierStep
    );
  }
  return true;
}

/**
 * Normalizes an array of pieces against the generated playable tiles of `boardType`.
 * Supports both `(boardType, pieces)` and `(pieces, boardType)` call signatures.
 * Drops any piece whose coordinates do not correspond to a real playable tile or duplicate an occupied tile.
 */
export function normalizePiecesToBoard(
  boardTypeOrPieces: BoardType | Piece[],
  piecesOrBoardType: Piece[] | BoardType
): Piece[] {
  const pieces: Piece[] = Array.isArray(boardTypeOrPieces)
    ? boardTypeOrPieces
    : (piecesOrBoardType as Piece[]);
  const boardType: BoardType = Array.isArray(boardTypeOrPieces)
    ? (piecesOrBoardType as BoardType)
    : boardTypeOrPieces;

  if (!Array.isArray(pieces)) return [];

  const seenTiles = new Set<string>();
  const normalized: Piece[] = [];

  for (const p of pieces) {
    if (!p || !p.position || p.rpg.hp <= 0) continue;
    const authPos = toAuthoritativePosition(boardType, p.position);
    if (!authPos) continue;
    const key = getPlayableTileKey(authPos.x, authPos.y, authPos.isVerticalWall, authPos.wallDirection);
    if (seenTiles.has(key)) continue;
    seenTiles.add(key);
    normalized.push({
      ...p,
      position: authPos,
      originColor: p.originColor || getPositionCheckerColor(authPos, boardType),
    });
  }

  return normalized;
}

const VERTICAL_CLIFF_TILES_CACHE: Partial<Record<BoardType, TileData[]>> = {};

export function getVerticalCliffTiles(boardType: BoardType): TileData[] {
  if (boardType !== 'pyramid' && boardType !== 'quick_pyramid') return [];

  const cached = VERTICAL_CLIFF_TILES_CACHE[boardType];
  if (cached) return cached;

  const vTiles: TileData[] = [];

  // Define concentric wall descents
  const tierBounds =
    boardType === 'quick_pyramid'
      ? [
          { tierStep: 1, minX: 2, maxX: 9, minY: 2, maxY: 9, lowerTier: 0, upperTier: 1 },
          { tierStep: 2, minX: 3, maxX: 8, minY: 3, maxY: 8, lowerTier: 1, upperTier: 2 },
          { tierStep: 3, minX: 4, maxX: 7, minY: 4, maxY: 7, lowerTier: 2, upperTier: 3 },
        ]
      : [
          { tierStep: 1, minX: 5, maxX: 14, minY: 5, maxY: 14, lowerTier: 0, upperTier: 1 },
          { tierStep: 2, minX: 6, maxX: 13, minY: 6, maxY: 13, lowerTier: 1, upperTier: 2 },
          { tierStep: 3, minX: 7, maxX: 12, minY: 7, maxY: 12, lowerTier: 2, upperTier: 3 },
          { tierStep: 4, minX: 8, maxX: 11, minY: 8, maxY: 11, lowerTier: 3, upperTier: 4 },
        ];

  tierBounds.forEach(({ tierStep, minX, maxX, minY, maxY, lowerTier, upperTier }) => {
    // South Wall (facing South / row - 1)
    for (let x = minX; x <= maxX; x++) {
      const isUpperLight = (x + minY + upperTier) % 2 === 0;
      vTiles.push({
        x,
        y: minY,
        tier: lowerTier,
        isSummit: false,
        isValley: false,
        color: isUpperLight ? 'dark' : 'light',
        isVerticalWall: true,
        wallDirection: 'south',
        wallTierStep: tierStep,
      });
    }

    // North Wall (facing North / row + 1)
    for (let x = minX; x <= maxX; x++) {
      const isUpperLight = (x + maxY + upperTier) % 2 === 0;
      vTiles.push({
        x,
        y: maxY,
        tier: lowerTier,
        isSummit: false,
        isValley: false,
        color: isUpperLight ? 'dark' : 'light',
        isVerticalWall: true,
        wallDirection: 'north',
        wallTierStep: tierStep,
      });
    }

    // West Wall (facing West / col - 1)
    for (let y = minY; y <= maxY; y++) {
      const isUpperLight = (minX + y + upperTier) % 2 === 0;
      vTiles.push({
        x: minX,
        y,
        tier: lowerTier,
        isSummit: false,
        isValley: false,
        color: isUpperLight ? 'dark' : 'light',
        isVerticalWall: true,
        wallDirection: 'west',
        wallTierStep: tierStep,
      });
    }

    // East Wall (facing East / col + 1)
    for (let y = minY; y <= maxY; y++) {
      const isUpperLight = (maxX + y + upperTier) % 2 === 0;
      vTiles.push({
        x: maxX,
        y,
        tier: lowerTier,
        isSummit: false,
        isValley: false,
        color: isUpperLight ? 'dark' : 'light',
        isVerticalWall: true,
        wallDirection: 'east',
        wallTierStep: tierStep,
      });
    }
  });

  VERTICAL_CLIFF_TILES_CACHE[boardType] = vTiles;
  return vTiles;
}

export function getDefaultRPGStats(type: PieceType): RPGStats {
  switch (type) {
    case 'pawn':
      return { maxHp: 50, hp: 50, atk: 25, def: 12, evasion: 15, critChance: 10, level: 1, kills: 0 };
    case 'knight':
      return { maxHp: 80, hp: 80, atk: 40, def: 18, evasion: 30, critChance: 15, level: 1, kills: 0 };
    case 'bishop':
      return { maxHp: 75, hp: 75, atk: 45, def: 14, evasion: 20, critChance: 20, level: 1, kills: 0 };
    case 'rook':
      return { maxHp: 105, hp: 105, atk: 50, def: 32, evasion: 5, critChance: 10, level: 1, kills: 0 };
    case 'queen':
      return { maxHp: 130, hp: 130, atk: 65, def: 28, evasion: 25, critChance: 25, level: 1, kills: 0 };
    case 'king':
      return { maxHp: 160, hp: 160, atk: 35, def: 32, evasion: 15, critChance: 12, level: 1, kills: 0 };
    case 'vanguard':
      return { maxHp: 90, hp: 90, atk: 46, def: 24, evasion: 25, critChance: 15, level: 1, kills: 0 };
    case 'gargoyle':
      return { maxHp: 80, hp: 80, atk: 42, def: 16, evasion: 35, critChance: 20, level: 1, kills: 0 };
    case 'trebuchet':
      return { maxHp: 75, hp: 75, atk: 52, def: 14, evasion: 5, critChance: 15, level: 1, kills: 0 };
    case 'ascendant':
      return { maxHp: 85, hp: 85, atk: 44, def: 20, evasion: 25, critChance: 20, level: 1, kills: 0 };
    default:
      return { maxHp: 50, hp: 50, atk: 25, def: 12, evasion: 10, critChance: 10, level: 1, kills: 0 };
  }
}

/**
 * Computes the Vanguard's 9 -> 1 Maximum Forward Movement based on its position
 * relative to the 20x20 Grand Pyramid center and its irreversible forward progression.
 *
 * Band Mapping (20x20 Grand Pyramid):
 * - Deep home territory (progress 0-1)     -> 9 tiles
 * - Advancing toward center (progress 2)   -> 8 tiles
 * - Closer (progress 3)                    -> 7 tiles
 * - Closer (progress 4)                    -> 6 tiles
 * - Lower Terrace / Wall (progress 5)      -> 5 tiles
 * - Middle Terrace / Wall (progress 6)     -> 4 tiles
 * - Upper Terrace / Wall (progress 7)      -> 3 tiles
 * - Near central conflict (progress 8)     -> 2 tiles
 * - Center / crossing center (progress >=9)-> 1 tile (permanent)
 */
export function getVanguardMovementProfile(piece: Piece): {
  maxTiles: number;
  bandLabel: string;
  effectiveProgress: number;
} {
  const spec = getPieceWorkshopSpec('vanguard');
  const startRange = spec.specialParams.vanguardStartRange ?? spec.boardRanges.pyramid ?? 9;
  const minRange = spec.specialParams.vanguardMinRange ?? 1;
  const permanentDecay = spec.specialParams.vanguardPermanentDecay ?? true;

  const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
  let rawProgress = 0;
  if (facing === 'north') {
    rawProgress = piece.position.y;
  } else if (facing === 'south') {
    rawProgress = 19 - piece.position.y;
  } else if (facing === 'east') {
    rawProgress = piece.position.x;
  } else {
    rawProgress = 19 - piece.position.x;
  }

  // Once reduced through forward progress or crossing the center, range never increases again (unless configured otherwise)
  const effectiveProgress = permanentDecay
    ? piece.hasCrossedCenter
      ? Math.max(9, rawProgress, piece.maxForwardProgress ?? 0)
      : Math.max(rawProgress, piece.maxForwardProgress ?? 0)
    : rawProgress;

  if (effectiveProgress >= 9) {
    return {
      maxTiles: minRange,
      bandLabel: `Center / Crossing Center (${minRange} tile${minRange > 1 ? 's' : ''})`,
      effectiveProgress,
    };
  }

  const maxTiles = Math.max(minRange, Math.min(startRange, startRange + 1 - effectiveProgress));
  let bandLabel = 'Advancing toward center';
  if (maxTiles === startRange) bandLabel = `Deep home territory (${startRange} tiles)`;
  else if (maxTiles === startRange - 1) bandLabel = `Advancing toward center (${maxTiles} tiles)`;
  else if (maxTiles <= minRange + 1) bandLabel = `Near central conflict (${maxTiles} tiles)`;
  else bandLabel = `Closer to center (${maxTiles} tiles)`;

  return {
    maxTiles,
    bandLabel,
    effectiveProgress,
  };
}

/**
 * Gargoyle — Pyramid Terrain / Defensive Specialist ("The wall and elevation specialist")
 * Strongest on vertical Pyramid walls, terraces, bends, and elevated defensive positions.
 */
export function getGargoyleTerrainProfile(piece: Piece): {
  isOnPyramidTerrain: boolean;
  isWallPerch: boolean;
  terrainLabel: string;
  defBonus: number;
  evasionBonus: number;
  atkBonusPercent: number;
  maxLeapRadius: number;
} {
  const spec = getPieceWorkshopSpec('gargoyle');
  const valleyJump = spec.specialParams.gargoyleValleyJumpRadius ?? spec.boardRanges.battlefield ?? 2;
  const pyramidJump = spec.specialParams.gargoylePyramidJumpRadius ?? spec.boardRanges.pyramid ?? 3;
  const wallDefBonus = spec.specialParams.gargoyleWallDefBonus ?? 10;
  const wallEvaBonus = spec.specialParams.gargoyleWallEvaBonus ?? 15;

  const isWallPerch = !!piece.position.isVerticalWall;
  const effTier = isWallPerch ? piece.position.wallTierStep || 1 : piece.position.tier || 0;
  const isOnPyramidTerrain = isWallPerch || effTier >= 1;

  if (isWallPerch) {
    return {
      isOnPyramidTerrain: true,
      isWallPerch: true,
      terrainLabel: `Vertical Wall Perch (Step ${effTier}) · Stone Bulwark Active`,
      defBonus: wallDefBonus,
      evasionBonus: wallEvaBonus,
      atkBonusPercent: 18,
      maxLeapRadius: pyramidJump,
    };
  }

  if (effTier >= 1) {
    return {
      isOnPyramidTerrain: true,
      isWallPerch: false,
      terrainLabel: `Elevated Pyramid Terrace (Tier ${effTier}) · Rampart Stance`,
      defBonus: 6 + effTier * 2,
      evasionBonus: 10 + effTier * 2,
      atkBonusPercent: 12,
      maxLeapRadius: pyramidJump,
    };
  }

  return {
    isOnPyramidTerrain: false,
    isWallPerch: false,
    terrainLabel: 'Flat Valley Ground (Exposed — Climb Pyramid to Awaken)',
    defBonus: 0,
    evasionBonus: -5,
    atkBonusPercent: 0,
    maxLeapRadius: valleyJump,
  };
}

/**
 * Ascendant — Elevation / Advancement Specialist
 * Develops tactical potential (movement stride & RPG combat resonance) as it climbs the Pyramid
 * and advances toward enemy territory. Checkmate remains the sole victory condition.
 */
export function getAscendantProfile(piece: Piece, boardSize: number = 20): {
  maxStride: number;
  ascensionTier: number;
  stageLabel: string;
  atkBonus: number;
  defBonus: number;
  critBonus: number;
  ignoresUphillPenalty: boolean;
} {
  const spec = getPieceWorkshopSpec('ascendant');
  const s1 = spec.specialParams.ascendantStage1Range ?? 2;
  const s2 = spec.specialParams.ascendantStage2Range ?? 3;
  const s3 = spec.specialParams.ascendantStage3Range ?? 4;

  const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
  const forwardDist =
    facing === 'north'
      ? piece.position.y
      : facing === 'south'
      ? boardSize - 1 - piece.position.y
      : facing === 'east'
      ? piece.position.x
      : boardSize - 1 - piece.position.x;

  const effElevation = piece.position.isVerticalWall
    ? piece.position.wallTierStep || 1
    : piece.position.tier || 0;

  // Advancement bonus: 0 in home valley, +1 past rank 5, +2 past center (rank 9+), +4 in deep enemy territory (rank 13+)
  const advanceStage = forwardDist >= 13 ? 4 : forwardDist >= 9 ? 2 : forwardDist >= 5 ? 1 : 0;
  const ascensionTier = effElevation + advanceStage;

  const maxStride = ascensionTier >= 4 ? s3 : ascensionTier >= 1 ? s2 : s1;
  const atkBonus = effElevation * 4 + advanceStage * 3;
  const defBonus = effElevation * 3 + advanceStage * 2;
  const critBonus = effElevation * 5 + advanceStage * 3;

  let stageLabel = `Stage I · Valley Initiate (${s1}-Tile Stride)`;
  if (ascensionTier >= 4) {
    stageLabel = `Stage III · Apex Ascendant (${maxStride}-Tile Stride · +${atkBonus} ATK)`;
  } else if (ascensionTier >= 1) {
    stageLabel = `Stage II · Elevated Climber (${maxStride}-Tile Stride · +${atkBonus} ATK)`;
  }

  return {
    maxStride,
    ascensionTier,
    stageLabel,
    atkBonus,
    defBonus,
    critBonus,
    ignoresUphillPenalty: true,
  };
}

/**
 * Trebuchet — Siege Jump-Capturer & Knockback Artillery Specialist
 * - Must physically jump onto an enemy piece (within 1–2 tiles) to capture it.
 * - Bombardment does NOT capture; it knocks the target piece back 3 tiles onto a random open tile.
 * - On the Pyramid (Tier 1+), it can ONLY bombard targets on the 4×4 Summit Apex.
 */
export function getTrebuchetProfile(piece: Piece): {
  minRange: number;
  maxRange: number;
  repositionRange: number;
  rangeLabel: string;
  siegeBonusPercent: number;
  isOnPyramid: boolean;
  pyramidSummitOnly: boolean;
  knockbackTiles: number;
} {
  const spec = getPieceWorkshopSpec('trebuchet');
  const jumpRange = spec.specialParams.trebuchetJumpCaptureRange ?? spec.boardRanges.pyramid ?? 2;
  const minRange = spec.specialParams.trebuchetBombardMinRange ?? 3;
  const baseMaxRange = spec.specialParams.trebuchetBombardMaxRange ?? 6;
  const knockbackTiles = spec.specialParams.trebuchetKnockbackTiles ?? 3;
  const pyramidSummitOnly = spec.specialParams.trebuchetPyramidBombardSummitOnly ?? true;

  const effTier = piece.position.tier || 0;
  const isOnPyramid = effTier >= 1 || Boolean(piece.position.isVerticalWall);
  const maxRange = baseMaxRange + effTier;
  const siegeBonusPercent = 20 + effTier * 5;

  return {
    minRange,
    maxRange,
    repositionRange: jumpRange,
    rangeLabel:
      isOnPyramid && pyramidSummitOnly
        ? `Jump-Capture (1–${jumpRange}) · Pyramid Bombard: 4×4 Summit Only (${knockbackTiles}-Tile Knockback)`
        : `Jump-Capture (1–${jumpRange}) · Bombard ${minRange}–${maxRange} Tiles (${knockbackTiles}-Tile Knockback)`,
    siegeBonusPercent,
    isOnPyramid,
    pyramidSummitOnly,
    knockbackTiles,
  };
}

export function createInitialPieces(
  boardType: BoardType,
  includeSpecial3D: boolean = false,
  armyDeployment: ArmyDeployment = 'standard',
  gameMode: GameMode = 'standard'
): Piece[] {
  const pieces: Piece[] = [];

  const createPiece = (
    type: PieceType,
    color: PieceColor,
    x: number,
    y: number,
    facing: 'north' | 'south' | 'east' | 'west' = color === 'white' ? 'north' : 'south',
    originEdge: 'south' | 'north' | 'west' | 'east' = color === 'white' ? 'south' : 'north',
    detachment: 'main' | 'west' | 'east' = 'main'
  ): Piece => {
    const authPos = toAuthoritativePosition(boardType, { x, y, isVerticalWall: false });
    const tier = authPos ? authPos.tier : getTileTier(boardType, x, y);
    const initialProgress = color === 'white' ? y : BOARD_SIZES[boardType] - 1 - y;
    const pos: Position = authPos || { x, y, tier, isVerticalWall: false };
    return {
      id: `${boardType}_${color}_${type}_${detachment}_${x}_${y}`,
      type,
      color,
      position: pos,
      hasMoved: false,
      facing,
      originEdge,
      detachment,
      maxForwardProgress: type === 'vanguard' ? initialProgress : undefined,
      hasCrossedCenter: false,
      originColor: getPositionCheckerColor(pos, boardType),
      colorReleased: false,
      rpg: getDefaultRPGStats(type),
    };
  };

  // Standard 16-piece classical chess back rank:
  // Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook
  // The 6 traditional Chess piece identities are ALWAYS preserved on every board and mode!
  const backrow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  if (boardType === 'classic') {
    // 8x8 standard classic chess layout:
    // White on Rank 0 (backrow) & Rank 1 (pawns)
    // Black on Rank 7 (backrow) & Rank 6 (pawns)
    for (let x = 0; x < 8; x++) {
      pieces.push(createPiece(backrow[x], 'white', x, 0, 'north', 'south', 'main'));
      pieces.push(createPiece('pawn', 'white', x, 1, 'north', 'south', 'main'));
      pieces.push(createPiece('pawn', 'black', x, 6, 'south', 'north', 'main'));
      pieces.push(createPiece(backrow[x], 'black', x, 7, 'south', 'north', 'main'));
    }
  } else if (boardType === 'quick_pyramid') {
    // 12x12 Quick Pyramid layout:
    // 8-file army centered in files 2..9 on the Lower Plain (ranks 0-1 and 10-11)
    // Files 0, 1 and 10, 11 provide open flanking lanes
    const startCol = 2;
    for (let i = 0; i < 8; i++) {
      const col = startCol + i;
      // White Main Army: Rank 0 (Backrow) & Rank 1 (Pawns)
      pieces.push(createPiece(backrow[i], 'white', col, 0, 'north', 'south', 'main'));
      pieces.push(createPiece('pawn', 'white', col, 1, 'north', 'south', 'main'));

      // Black Main Army: Rank 11 (Backrow) & Rank 10 (Pawns)
      pieces.push(createPiece(backrow[i], 'black', col, 11, 'south', 'north', 'main'));
      pieces.push(createPiece('pawn', 'black', col, 10, 'south', 'north', 'main'));
    }

    // Kingdom Army deployment for 12x12: Flank detachments facing each other in the flanking lanes
    if (armyDeployment === 'kingdom') {
      // White West Detachment (4 Pawns in South-West corridor advancing North towards Black)
      const whiteWestPositions = [
        { x: 0, y: 2 }, { x: 1, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 },
      ];
      whiteWestPositions.forEach((pos) => {
        pieces.push(createPiece('pawn', 'white', pos.x, pos.y, 'north', 'south', 'west'));
      });

      // White East Detachment (4 Pawns in South-East corridor advancing North towards Black)
      const whiteEastPositions = [
        { x: 10, y: 2 }, { x: 11, y: 2 },
        { x: 10, y: 3 }, { x: 11, y: 3 },
      ];
      whiteEastPositions.forEach((pos) => {
        pieces.push(createPiece('pawn', 'white', pos.x, pos.y, 'north', 'south', 'east'));
      });

      // Black West Detachment (4 Pawns in North-West corridor advancing South towards White)
      const blackWestPositions = [
        { x: 0, y: 8 }, { x: 1, y: 8 },
        { x: 0, y: 9 }, { x: 1, y: 9 },
      ];
      blackWestPositions.forEach((pos) => {
        pieces.push(createPiece('pawn', 'black', pos.x, pos.y, 'south', 'north', 'west'));
      });

      // Black East Detachment (4 Pawns in North-East corridor advancing South towards White)
      const blackEastPositions = [
        { x: 10, y: 8 }, { x: 11, y: 8 },
        { x: 10, y: 9 }, { x: 11, y: 9 },
      ];
      blackEastPositions.forEach((pos) => {
        pieces.push(createPiece('pawn', 'black', pos.x, pos.y, 'south', 'north', 'east'));
      });
    }
  } else {
    // 20x20 Battlefield (Flat) & Grand Pyramid (Elevated):
    // Main armies deployed in centered files 6..13 (ranks 0-1 and 18-19)
    const startCol = 6;
    for (let i = 0; i < 8; i++) {
      const col = startCol + i;

      // White Army: Rank 0 (Backrow) & Rank 1 (Pawns)
      pieces.push(createPiece(backrow[i], 'white', col, 0, 'north', 'south', 'main'));
      pieces.push(createPiece('pawn', 'white', col, 1, 'north', 'south', 'main'));

      // Black Army: Rank 19 (Backrow) & Rank 18 (Pawns)
      pieces.push(createPiece(backrow[i], 'black', col, 19, 'south', 'north', 'main'));
      pieces.push(createPiece('pawn', 'black', col, 18, 'south', 'north', 'main'));
    }

    // 20x20 SPECIALIST ROSTER — VANGUARD, GARGOYLE, ASCENDANT & TREBUCHET
    // Placed on the 20x20 flat outer home wings (Rank 0 for White, Rank 19 for Black)
    // on BOTH 20x20 battlefields: Battlefield (20x20 Flat) and Grand Pyramid (20x20 Elevated),
    // in both Standard and RPG combat modes so all 6 traditional Chess pieces remain intact.
    // White Vanguards (Deep home territory Rank 0, files F (x=5) and O (x=14))
    pieces.push(createPiece('vanguard', 'white', 5, 0, 'north', 'south', 'west'));
    pieces.push(createPiece('vanguard', 'white', 14, 0, 'north', 'south', 'east'));

    // Black Vanguards (Deep home territory Rank 19, files F (x=5) and O (x=14))
    pieces.push(createPiece('vanguard', 'black', 5, 19, 'south', 'north', 'west'));
    pieces.push(createPiece('vanguard', 'black', 14, 19, 'south', 'north', 'east'));

    // White Specialist Wing Units (Rank 0 flat outer wings: x=3 Trebuchet, x=4 Gargoyle, x=15 Ascendant)
    pieces.push(createPiece('trebuchet', 'white', 3, 0, 'north', 'south', 'west'));
    pieces.push(createPiece('gargoyle', 'white', 4, 0, 'north', 'south', 'west'));
    pieces.push(createPiece('ascendant', 'white', 15, 0, 'north', 'south', 'east'));

    // Black Specialist Wing Units (Rank 19 flat outer wings: x=3 Trebuchet, x=4 Gargoyle, x=15 Ascendant)
    pieces.push(createPiece('trebuchet', 'black', 3, 19, 'south', 'north', 'west'));
    pieces.push(createPiece('gargoyle', 'black', 4, 19, 'south', 'north', 'west'));
    pieces.push(createPiece('ascendant', 'black', 15, 19, 'south', 'north', 'east'));

    // Kingdom Army Deployment:
    // On Battlefield 20x20: 24 pieces per kingdom (48 total)
    // On Grand Pyramid 20x20: 26 pieces per kingdom (52 total, including 2 Vanguards per side)
    if (armyDeployment === 'kingdom') {
      // White West Flank Detachment (4 Pawns, South-West quadrant, facing North towards Black West)
      const whiteWestCoords = [
        { x: 1, y: 3 }, { x: 2, y: 3 },
        { x: 1, y: 4 }, { x: 2, y: 4 },
      ];
      whiteWestCoords.forEach((pos) => {
        pieces.push(createPiece('pawn', 'white', pos.x, pos.y, 'north', 'south', 'west'));
      });

      // White East Flank Detachment (4 Pawns, South-East quadrant, facing North towards Black East)
      const whiteEastCoords = [
        { x: 17, y: 3 }, { x: 18, y: 3 },
        { x: 17, y: 4 }, { x: 18, y: 4 },
      ];
      whiteEastCoords.forEach((pos) => {
        pieces.push(createPiece('pawn', 'white', pos.x, pos.y, 'north', 'south', 'east'));
      });

      // Black West Flank Detachment (4 Pawns, North-West quadrant, facing South towards White West)
      const blackWestCoords = [
        { x: 1, y: 15 }, { x: 2, y: 15 },
        { x: 1, y: 16 }, { x: 2, y: 16 },
      ];
      blackWestCoords.forEach((pos) => {
        pieces.push(createPiece('pawn', 'black', pos.x, pos.y, 'south', 'north', 'west'));
      });

      // Black East Flank Detachment (4 Pawns, North-East quadrant, facing South towards White East)
      const blackEastCoords = [
        { x: 17, y: 15 }, { x: 18, y: 15 },
        { x: 17, y: 16 }, { x: 18, y: 16 },
      ];
      blackEastCoords.forEach((pos) => {
        pieces.push(createPiece('pawn', 'black', pos.x, pos.y, 'south', 'north', 'east'));
      });
    }
  }

  return pieces;
}
