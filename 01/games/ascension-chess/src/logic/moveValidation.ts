import { BoardType, Move, Piece, PieceColor, PlayStyle, Position, TileData } from '../types/chess';
import { getConfiguredBoardRange, getPieceWorkshopSpec } from '../data/pieceWorkshopConfig';
import {
  BOARD_SIZES,
  getAscendantProfile,
  getGargoyleTerrainProfile,
  getPositionCheckerColor,
  getSummitToBaseJumpTargets,
  getTileTier,
  getTrebuchetProfile,
  getVanguardMovementProfile,
  getVerticalCliffTiles,
  isSummitTile,
  toAuthoritativePosition,
} from './pyramidBoard';

export interface ValidMoveResult {
  moves: Move[];
}

// Find a piece on flat ground / horizontal terrace
export function getPieceAt(pieces: Piece[], x: number, y: number): Piece | undefined {
  return pieces.find((p) => !p.position.isVerticalWall && p.position.x === x && p.position.y === y && p.rpg.hp > 0);
}

// Find a piece perched on a vertical wall tile
export function getVerticalPieceAt(pieces: Piece[], x: number, y: number, wallDirection?: string): Piece | undefined {
  return pieces.find(
    (p) =>
      p.position.isVerticalWall &&
      p.position.x === x &&
      p.position.y === y &&
      p.rpg.hp > 0 &&
      (!wallDirection || p.position.wallDirection === wallDirection)
  );
}

// Find any piece occupying the exact target position (horizontal or vertical)
export function getPieceAtPosition(pieces: Piece[], pos: Position): Piece | undefined {
  if (pos.isVerticalWall) {
    return getVerticalPieceAt(pieces, pos.x, pos.y, pos.wallDirection);
  }
  return getPieceAt(pieces, pos.x, pos.y);
}

// =========================================================================
// CONTINUOUS CONNECTED SURFACE TOPOLOGY
// The Pyramid is a folded / bent chessboard. Horizontal floors and vertical
// cliff walls are real playable squares connected across their shared edges.
// Movement is surface-relative: Floor <-> Wall <-> Terrace <-> Wall <-> Summit
//
// CANONICAL RULE:
// Pyramid Chess does not impose an arbitrary elevation limit on a piece merely
// because its movement enters another dimension.
// A piece may continue across any number of connected Pyramid tiles permitted
// by its normal movement range and movement geometry.
// Climbing follows connected playable tiles. Jumping bypasses intermediate tiles.
// Pieces cannot pass through occupied blocking tiles or the solid body of the Pyramid.
// =========================================================================

export type CardinalDirection = 'north' | 'south' | 'east' | 'west';

/**
 * Returns the next connected playable tile along a cardinal direction on the continuous surface.
 * Handles:
 * - Flat floor to flat floor
 * - Floor up into vertical cliff wall
 * - Vertical cliff wall up onto terrace
 * - Terrace down onto vertical cliff wall
 * - Vertical cliff wall down onto floor
 * - Lateral movement across adjacent vertical wall tiles and corner wraps
 */
export function getNextConnectedSurfaceTile(
  current: Position,
  dir: CardinalDirection,
  boardType: BoardType
): Position | null {
  const size = BOARD_SIZES[boardType];
  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const authCurrent = toAuthoritativePosition(boardType, current);
  if (!authCurrent) return null;

  // 1. If currently perched on a vertical cliff wall:
  if (authCurrent.isVerticalWall) {
    const wallDir = authCurrent.wallDirection || 'south';
    const wallStep = authCurrent.wallTierStep || 1;
    const lowerTier = Math.max(0, wallStep - 1);

    if (wallDir === 'south') {
      // South-facing wall (facing -Z / South)
      // Moving North climbs UP onto the terrace above
      if (dir === 'north') {
        const upPos = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: false,
        });
        return upPos && upPos.tier === wallStep ? upPos : null;
      }
      // Moving South drops DOWN onto the lower floor
      if (dir === 'south') {
        if (authCurrent.y - 1 >= 0) {
          const downPos = toAuthoritativePosition(boardType, {
            x: authCurrent.x,
            y: authCurrent.y - 1,
            isVerticalWall: false,
          });
          return downPos && downPos.tier === lowerTier ? downPos : null;
        }
        return null;
      }
      // Moving East slides laterally along South wall
      if (dir === 'east') {
        const nextX = authCurrent.x + 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: nextX,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'south',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets East wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'east',
          wallTierStep: wallStep,
        });
      }
      // Moving West slides laterally along South wall
      if (dir === 'west') {
        const nextX = authCurrent.x - 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: nextX,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'south',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets West wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'west',
          wallTierStep: wallStep,
        });
      }
    } else if (wallDir === 'north') {
      // North-facing wall (facing +Z / North)
      // Moving South climbs UP onto the terrace above
      if (dir === 'south') {
        const upPos = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: false,
        });
        return upPos && upPos.tier === wallStep ? upPos : null;
      }
      // Moving North drops DOWN onto the lower floor
      if (dir === 'north') {
        if (authCurrent.y + 1 < size) {
          const downPos = toAuthoritativePosition(boardType, {
            x: authCurrent.x,
            y: authCurrent.y + 1,
            isVerticalWall: false,
          });
          return downPos && downPos.tier === lowerTier ? downPos : null;
        }
        return null;
      }
      // Moving East slides laterally along North wall
      if (dir === 'east') {
        const nextX = authCurrent.x + 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: nextX,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'north',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets East wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'east',
          wallTierStep: wallStep,
        });
      }
      // Moving West slides laterally along North wall
      if (dir === 'west') {
        const nextX = authCurrent.x - 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: nextX,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'north',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets West wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'west',
          wallTierStep: wallStep,
        });
      }
    } else if (wallDir === 'west') {
      // West-facing wall (facing -X / West)
      // Moving East climbs UP onto the terrace above
      if (dir === 'east') {
        const upPos = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: false,
        });
        return upPos && upPos.tier === wallStep ? upPos : null;
      }
      // Moving West drops DOWN onto the lower floor
      if (dir === 'west') {
        if (authCurrent.x - 1 >= 0) {
          const downPos = toAuthoritativePosition(boardType, {
            x: authCurrent.x - 1,
            y: authCurrent.y,
            isVerticalWall: false,
          });
          return downPos && downPos.tier === lowerTier ? downPos : null;
        }
        return null;
      }
      // Moving North slides laterally along West wall
      if (dir === 'north') {
        const nextY = authCurrent.y + 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: nextY,
          isVerticalWall: true,
          wallDirection: 'west',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets North wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'north',
          wallTierStep: wallStep,
        });
      }
      // Moving South slides laterally along West wall
      if (dir === 'south') {
        const nextY = authCurrent.y - 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: nextY,
          isVerticalWall: true,
          wallDirection: 'west',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets South wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'south',
          wallTierStep: wallStep,
        });
      }
    } else if (wallDir === 'east') {
      // East-facing wall (facing +X / East)
      // Moving West climbs UP onto the terrace above
      if (dir === 'west') {
        const upPos = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: false,
        });
        return upPos && upPos.tier === wallStep ? upPos : null;
      }
      // Moving East drops DOWN onto the lower floor
      if (dir === 'east') {
        if (authCurrent.x + 1 < size) {
          const downPos = toAuthoritativePosition(boardType, {
            x: authCurrent.x + 1,
            y: authCurrent.y,
            isVerticalWall: false,
          });
          return downPos && downPos.tier === lowerTier ? downPos : null;
        }
        return null;
      }
      // Moving North slides laterally along East wall
      if (dir === 'north') {
        const nextY = authCurrent.y + 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: nextY,
          isVerticalWall: true,
          wallDirection: 'east',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets North wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'north',
          wallTierStep: wallStep,
        });
      }
      // Moving South slides laterally along East wall
      if (dir === 'south') {
        const nextY = authCurrent.y - 1;
        const matchingWall = toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: nextY,
          isVerticalWall: true,
          wallDirection: 'east',
          wallTierStep: wallStep,
        });
        if (matchingWall) return matchingWall;
        // Corner wrap: meets South wall
        return toAuthoritativePosition(boardType, {
          x: authCurrent.x,
          y: authCurrent.y,
          isVerticalWall: true,
          wallDirection: 'south',
          wallTierStep: wallStep,
        });
      }
    }
    return null;
  }

  // 2. Currently on a horizontal floor or terrace tile (authCurrent.isVerticalWall is false)
  let targetX = authCurrent.x;
  let targetY = authCurrent.y;
  if (dir === 'north') targetY += 1;
  else if (dir === 'south') targetY -= 1;
  else if (dir === 'east') targetX += 1;
  else if (dir === 'west') targetX -= 1;

  if (targetX < 0 || targetX >= size || targetY < 0 || targetY >= size) {
    return null; // Off board boundary
  }

  // If flat board (Classic 8x8 or Battlefield 20x20):
  if (!isPyramidMode) {
    return toAuthoritativePosition(boardType, { x: targetX, y: targetY, isVerticalWall: false });
  }

  // Pyramid mode: check elevation difference between adjacent squares
  const curTier = authCurrent.tier;
  const targetTier = getTileTier(boardType, targetX, targetY);

  // Flat step on the same terrace or floor:
  if (targetTier === curTier) {
    return toAuthoritativePosition(boardType, { x: targetX, y: targetY, isVerticalWall: false });
  }

  // Stepping UP into an elevation change (Wall facing current tile):
  if (targetTier > curTier) {
    let wallDir: 'south' | 'north' | 'west' | 'east' = 'south';
    if (dir === 'north') wallDir = 'south'; // South-facing wall stands in front of moving North
    else if (dir === 'south') wallDir = 'north'; // North-facing wall stands in front of moving South
    else if (dir === 'east') wallDir = 'west'; // West-facing wall stands in front of moving East
    else if (dir === 'west') wallDir = 'east'; // East-facing wall stands in front of moving West

    // Connect into the authoritative vertical cliff wall tile
    return toAuthoritativePosition(boardType, {
      x: targetX,
      y: targetY,
      isVerticalWall: true,
      wallDirection: wallDir,
      wallTierStep: targetTier,
    });
  }

  // Stepping DOWN from an elevation change (Wall descending from current terrace):
  if (targetTier < curTier) {
    let wallDir: 'south' | 'north' | 'west' | 'east' = 'north';
    if (dir === 'north') wallDir = 'north'; // Descending North steps onto North-facing wall
    else if (dir === 'south') wallDir = 'south'; // Descending South steps onto South-facing wall
    else if (dir === 'east') wallDir = 'east'; // Descending East steps onto East-facing wall
    else if (dir === 'west') wallDir = 'west'; // Descending West steps onto West-facing wall

    return toAuthoritativePosition(boardType, {
      x: authCurrent.x,
      y: authCurrent.y,
      isVerticalWall: true,
      wallDirection: wallDir,
      wallTierStep: curTier,
    });
  }

  return null;
}

let latestExecutedMove: Move | null = null;
let activePlayStyle: PlayStyle = 'surface_bound';

export function setValidationLastMove(move: Move | null): void {
  latestExecutedMove = move;
}

export function setActivePlayStyle(style: PlayStyle): void {
  activePlayStyle = style;
}

export function getActivePlayStyle(): PlayStyle {
  return activePlayStyle;
}

// Generate raw candidate moves for a piece (without check filtering)
export function getRawMovesForPiece(
  piece: Piece,
  allPieces: Piece[],
  boardType: BoardType,
  lastMove: Move | null = latestExecutedMove,
  playStyle: PlayStyle = activePlayStyle
): Move[] {
  if (piece.rpg.hp <= 0) return [];
  const authPiecePos = toAuthoritativePosition(boardType, piece.position);
  if (!authPiecePos) return [];

  const size = BOARD_SIZES[boardType];
  const { x, y } = authPiecePos;
  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const isSurfaceBound = isPyramidMode && playStyle === 'surface_bound';
  const workshopSpec = getPieceWorkshopSpec(piece.type);
  const configuredRange = getConfiguredBoardRange(piece.type, boardType);
  const moves: Move[] = [];

  const isValidCoord = (cx: number, cy: number) => cx >= 0 && cx < size && cy >= 0 && cy < size;

  // Helper to determine if a pawn promotes upon reaching destination (x, y) on the opposite back rank
  // Rule: Pawns NEVER promote or transform merely by reaching the 4x4 Summit.
  const isPawnPromoted = (destX: number, destY: number): boolean => {
    if (isSummitTile(boardType, destX, destY)) return false;
    const origin = piece.originEdge || (piece.color === 'white' ? 'south' : 'north');
    if (origin === 'south' && destY === size - 1) return true;
    if (origin === 'north' && destY === 0) return true;
    if (origin === 'west' && destX === size - 1) return true;
    if (origin === 'east' && destX === 0) return true;
    return false;
  };

  // True when the piece starts its turn occupying one of the horizontal 4x4 Summit tiles
  const isStartingOnSummit =
    isPyramidMode &&
    !authPiecePos.isVerticalWall &&
    isSummitTile(boardType, authPiecePos.x, authPiecePos.y);

  // Helper to add move from piece's current position to targetPos
  const tryAddTargetMove = (rawTargetPos: Position): boolean => {
    const targetPos = toAuthoritativePosition(boardType, rawTargetPos);
    if (!targetPos) return false;

    // Enforce Pyramid Navigation Workshop permissions
    if (isPyramidMode) {
      if (targetPos.isVerticalWall && !workshopSpec.pyramidNav.canEnterVerticalWalls) {
        return false;
      }
      const isCrossSurfaceMove = Boolean(authPiecePos.isVerticalWall) !== Boolean(targetPos.isVerticalWall);
      if (isCrossSurfaceMove && !workshopSpec.pyramidNav.canCrossFloorWallBends) {
        return false;
      }
      if (
        authPiecePos.isVerticalWall &&
        targetPos.isVerticalWall &&
        authPiecePos.wallDirection !== targetPos.wallDirection &&
        !workshopSpec.pyramidNav.canWrapWallCorners
      ) {
        return false;
      }
    }

    const occ = getPieceAtPosition(allPieces, targetPos);
    if (occ && occ.color === piece.color) {
      return false; // Friendly piece blocks the path
    }

    // Law 4 & Law 5 (Surface Bound Play Style + Workshop Override):
    const isCrossSurface = Boolean(authPiecePos.isVerticalWall) !== Boolean(targetPos.isVerticalWall);
    if (
      occ &&
      occ.color !== piece.color &&
      isSurfaceBound &&
      isCrossSurface &&
      !workshopSpec.pyramidNav.canCrossSurfaceCaptureInSurfaceBound
    ) {
      return !workshopSpec.pyramidNav.blockedByOppositeSurfaceInSurfaceBound;
    }

    const isCapture = !!occ && occ.color !== piece.color;
    const destTier = targetPos.isVerticalWall
      ? targetPos.wallTierStep || 1
      : targetPos.tier;
    const currentEffectiveTier = authPiecePos.isVerticalWall
      ? authPiecePos.wallTierStep || 1
      : authPiecePos.tier;
    const tierDelta = destTier - currentEffectiveTier;

    if (isPyramidMode) {
      if (destTier > currentEffectiveTier && !workshopSpec.pyramidNav.canClimbUp) {
        return false;
      }
      if (destTier < currentEffectiveTier && !workshopSpec.pyramidNav.canDescendDown) {
        return false;
      }
    }
    const isSummit =
      !targetPos.isVerticalWall &&
      isSummitTile(boardType, targetPos.x, targetPos.y) &&
      !isSummitTile(boardType, authPiecePos.x, authPiecePos.y);

    // Ensure uniqueness
    const exists = moves.some(
      (m) =>
        m.to.x === targetPos.x &&
        m.to.y === targetPos.y &&
        !!m.to.isVerticalWall === !!targetPos.isVerticalWall &&
        m.to.wallDirection === targetPos.wallDirection
    );

    if (!exists) {
      const promotesOnBackRank =
        piece.type === 'pawn' &&
        !targetPos.isVerticalWall &&
        isPawnPromoted(targetPos.x, targetPos.y);
      moves.push({
        from: { ...authPiecePos },
        to: { ...targetPos },
        pieceId: piece.id,
        isCapture,
        capturedPieceId: occ?.id,
        isVerticalClimb: tierDelta > 0,
        tierDelta,
        isSummitAscension: isSummit,
        isWallPerch: targetPos.isVerticalWall,
        promotionType: promotesOnBackRank ? 'queen' : undefined,
      });
    }

    // Return true if tile was empty (ray can continue), false if captured enemy piece (ray stops)
    return !occ;
  };

  // 4x4 Summit 1-Tile 8-Direction Ordinary Movement Helper (for all non-Knight pieces starting on the Summit)
  const addSummitOneTileEightDirectionMoves = (options?: {
    nonCaptureOnly?: boolean;
    horizontalOnly?: boolean;
  }) => {
    const orthoDirs: CardinalDirection[] = ['north', 'south', 'east', 'west'];
    for (const dir of orthoDirs) {
      const nextOrtho = getNextConnectedSurfaceTile(authPiecePos, dir, boardType);
      if (!nextOrtho) continue;
      if (options?.horizontalOnly && nextOrtho.isVerticalWall) continue;
      if (options?.nonCaptureOnly) {
        const occ = getPieceAtPosition(allPieces, nextOrtho);
        if (occ) continue;
      }
      tryAddTargetMove(nextOrtho);
    }

    const diagDirs: [number, number][] = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    for (const [dx, dy] of diagDirs) {
      const cx = x + dx;
      const cy = y + dy;
      if (!isValidCoord(cx, cy)) continue;
      const destTier = getTileTier(boardType, cx, cy);

      if (isPyramidMode && isSurfaceBound && destTier !== authPiecePos.tier) {
        const stepTier = Math.max(authPiecePos.tier, destTier);
        const vTiles = getVerticalCliffTiles(boardType);
        const cornerWalls = vTiles.filter(
          (vt) =>
            vt.wallTierStep === stepTier &&
            vt.x === x &&
            vt.y === y &&
            ((dx > 0 && vt.wallDirection === 'east') ||
              (dx < 0 && vt.wallDirection === 'west') ||
              (dy > 0 && vt.wallDirection === 'north') ||
              (dy < 0 && vt.wallDirection === 'south'))
        );
        const blockedByWall = cornerWalls.some((tw) =>
          Boolean(
            getPieceAtPosition(allPieces, {
              x: tw.x,
              y: tw.y,
              tier: tw.tier,
              isVerticalWall: true,
              wallDirection: tw.wallDirection,
              wallTierStep: tw.wallTierStep,
            })
          )
        );
        if (blockedByWall && workshopSpec.pyramidNav.blockedByOppositeSurfaceInSurfaceBound) {
          continue;
        }
      }

      const diagCandidate: Position = {
        x: cx,
        y: cy,
        tier: destTier,
        isVerticalWall: false,
      };
      if (options?.nonCaptureOnly) {
        const occ = getPieceAtPosition(allPieces, diagCandidate);
        if (occ) continue;
      }
      tryAddTargetMove(diagCandidate);
    }
  };

  // Traverses an orthogonal ray across the connected surface (Rook & Queen)
  // Continuous manifold: floor <-> vertical wall <-> terrace <-> wall <-> summit
  // NO arbitrary elevation limits!
  const castOrthogonalSurfaceRay = (dir: CardinalDirection, maxSteps: number = 32) => {
    let curr: Position = { ...piece.position };
    for (let step = 0; step < maxSteps; step++) {
      const nextTile = getNextConnectedSurfaceTile(curr, dir, boardType);
      if (!nextTile) break; // End of surface or out of bounds

      const canContinue = tryAddTargetMove(nextTile);
      if (!canContinue) break; // Blocked by friendly or stopped at captured enemy

      curr = nextTile;
    }
  };

  // Traverses diagonal lines across the folded chessboard surface (Bishop, King & Queen)
  // Connects terraces, diagonal crossings, and perches without arbitrary elevation caps.
  const castDiagonalSurfaceRay = (dx: number, dy: number, maxSteps: number = size) => {
    let startX = x;
    let startY = y;
    let remainingSteps = maxSteps;

    // If starting on a vertical wall, step diagonally onto the terrace or lower floor first
    if (authPiecePos.isVerticalWall) {
      const wallDir = authPiecePos.wallDirection || 'south';
      const wallStep = authPiecePos.wallTierStep || 1;
      const lowerTier = Math.max(0, wallStep - 1);

      let candX = x;
      let candY = y;
      let expectedTier = lowerTier;

      if (wallDir === 'south') {
        candX = x + dx;
        if (dy > 0) {
          candY = y;
          expectedTier = wallStep;
        } else {
          candY = y - 1;
          expectedTier = lowerTier;
        }
      } else if (wallDir === 'north') {
        candX = x + dx;
        if (dy < 0) {
          candY = y;
          expectedTier = wallStep;
        } else {
          candY = y + 1;
          expectedTier = lowerTier;
        }
      } else if (wallDir === 'west') {
        candY = y + dy;
        if (dx > 0) {
          candX = x;
          expectedTier = wallStep;
        } else {
          candX = x - 1;
          expectedTier = lowerTier;
        }
      } else if (wallDir === 'east') {
        candY = y + dy;
        if (dx < 0) {
          candX = x;
          expectedTier = wallStep;
        } else {
          candX = x + 1;
          expectedTier = lowerTier;
        }
      }

      const authInitial = toAuthoritativePosition(boardType, {
        x: candX,
        y: candY,
        isVerticalWall: false,
      });

      if (authInitial && authInitial.tier === expectedTier) {
        const canCont = tryAddTargetMove(authInitial);
        if (!canCont) return;
        startX = authInitial.x;
        startY = authInitial.y;
        remainingSteps = Math.max(0, maxSteps - 1);
      } else {
        return;
      }
    }

    let cx = startX;
    let cy = startY;

    for (let step = 1; step <= remainingSteps; step++) {
      const prevX = cx;
      const prevY = cy;
      cx += dx;
      cy += dy;
      if (!isValidCoord(cx, cy)) break;

      const prevTier = getTileTier(boardType, prevX, prevY);
      const destTier = getTileTier(boardType, cx, cy);

      // In pyramid modes, check if any vertical wall at the transition has an enemy perch or is a valid perch
      if (isPyramidMode && destTier !== prevTier) {
        const vTiles = getVerticalCliffTiles(boardType);
        // Find matching wall at the step transition
        const transitionalWalls = vTiles.filter(
          (vt) =>
            (vt.x === cx && (vt.y === cy || vt.y === prevY)) ||
            (vt.y === cy && (vt.x === cx || vt.x === prevX))
        );

        for (const tw of transitionalWalls) {
          const occWall = getPieceAtPosition(allPieces, {
            x: tw.x,
            y: tw.y,
            tier: tw.tier,
            isVerticalWall: true,
            wallDirection: tw.wallDirection,
            wallTierStep: tw.wallTierStep,
          });

          // If enemy is perched on wall along diagonal path, offer capture (in Open Surface or when already on a wall)
          if (occWall) {
            if (occWall.color !== piece.color && (!isSurfaceBound || !!piece.position.isVerticalWall)) {
              tryAddTargetMove({
                x: tw.x,
                y: tw.y,
                tier: tw.tier,
                isVerticalWall: true,
                wallDirection: tw.wallDirection,
                wallTierStep: tw.wallTierStep,
              });
            }
            // Law 5 (Surface Bound Blocking Law): An occupied transitional wall tile stops a diagonal ray crossing that step
            if (isSurfaceBound) {
              return;
            }
          }
        }
      }

      // Add the destination horizontal terrace/floor tile
      const targetPos: Position = { x: cx, y: cy, tier: destTier };
      const canContinue = tryAddTargetMove(targetPos);
      if (!canContinue) break;
    }
  };

  // Switch by piece type
  switch (piece.type) {
    case 'pawn': {
      const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
      let fdx = 0;
      let fdy = 0;
      if (facing === 'north') fdy = 1;
      else if (facing === 'south') fdy = -1;
      else if (facing === 'east') fdx = 1;
      else if (facing === 'west') fdx = -1;

      const lateralDirs: CardinalDirection[] =
        facing === 'north' || facing === 'south' ? ['west', 'east'] : ['north', 'south'];

      const backwardDir: CardinalDirection =
        facing === 'north'
          ? 'south'
          : facing === 'south'
          ? 'north'
          : facing === 'east'
          ? 'west'
          : 'east';

      const nextForward = getNextConnectedSurfaceTile(authPiecePos, facing, boardType);

      if (isStartingOnSummit) {
        // 4x4 Summit Rule: While occupying a summit tile, Pawn may make a non-capture ordinary move
        // of 1 connected tile in any of the 8 directions (captures remain forward-diagonal only below).
        addSummitOneTileEightDirectionMoves({ nonCaptureOnly: true });
      } else {
        // 1. Single step forward across connected surface (floor, vertical wall, or terrace above)
        if (nextForward) {
          const occ = getPieceAtPosition(allPieces, nextForward);
          if (!occ) {
            const promotes = !nextForward.isVerticalWall && isPawnPromoted(nextForward.x, nextForward.y);
            moves.push({
              from: { ...authPiecePos },
              to: { ...nextForward },
              pieceId: piece.id,
              isCapture: false,
              isVerticalClimb: (nextForward.tier ?? 0) > (authPiecePos.tier ?? 0),
              tierDelta: (nextForward.tier ?? 0) - (authPiecePos.tier ?? 0),
              isSummitAscension: false,
              promotionType: promotes ? 'queen' : undefined,
              isWallPerch: nextForward.isVerticalWall,
            });

            // 2. Double step from start rank: ONLY on flat terrain (not on vertical wall) and unblocked
            if (
              (workshopSpec.specialParams.pawnInitialDoubleStep ?? true) &&
              !piece.hasMoved &&
              !authPiecePos.isVerticalWall &&
              !nextForward.isVerticalWall
            ) {
              const nextDouble = getNextConnectedSurfaceTile(nextForward, facing, boardType);
              if (nextDouble && !nextDouble.isVerticalWall && (nextDouble.tier ?? 0) === (authPiecePos.tier ?? 0)) {
                const occ2 = getPieceAtPosition(allPieces, nextDouble);
                if (!occ2) {
                  const promotes2 = isPawnPromoted(nextDouble.x, nextDouble.y);
                  moves.push({
                    from: { ...authPiecePos },
                    to: { ...nextDouble },
                    pieceId: piece.id,
                    isCapture: false,
                    isVerticalClimb: false,
                    tierDelta: 0,
                    isSummitAscension: false,
                    promotionType: promotes2 ? 'queen' : undefined,
                  });
                }
              }
            }
          }
        }

        // 2. Lateral Sideways Movement (and Pyramid-Board-Only Backward Movement)
        const stepDirs: CardinalDirection[] = isPyramidMode
          ? [...lateralDirs, backwardDir]
          : lateralDirs;

        for (const sideDir of stepDirs) {
          if (authPiecePos.isVerticalWall && !(workshopSpec.specialParams.pawnAllowWallSidewaysMove ?? true)) {
            continue;
          }
          const nextSide = getNextConnectedSurfaceTile(authPiecePos, sideDir, boardType);
          if (nextSide) {
            if (nextSide.isVerticalWall && !workshopSpec.pyramidNav.canEnterVerticalWalls) continue;
            const occSide = getPieceAtPosition(allPieces, nextSide);
            // Non-capture movement only! Must be completely empty
            if (!occSide) {
              const promotes = !nextSide.isVerticalWall && isPawnPromoted(nextSide.x, nextSide.y);
              moves.push({
                from: { ...authPiecePos },
                to: { ...nextSide },
                pieceId: piece.id,
                isCapture: false,
                isVerticalClimb: (nextSide.tier ?? 0) > (authPiecePos.tier ?? 0),
                tierDelta: (nextSide.tier ?? 0) - (authPiecePos.tier ?? 0),
                isSummitAscension: false,
                promotionType: promotes ? 'queen' : undefined,
                isWallPerch: nextSide.isVerticalWall,
              });
            }
          }
        }
      }

      // 3. Diagonal captures (only if enemy piece is present on ground, terrace, or vertical wall)
      // Captures: forward-diagonal relative to facing ONLY. Never captures sideways, straight-forward, or backward!
      const addPawnCaptureMove = (targetPos: Position, enemyPiece: Piece) => {
        if (enemyPiece.color === piece.color || enemyPiece.rpg.hp <= 0) return;
        const isCrossSurfaceCap = Boolean(authPiecePos.isVerticalWall) !== Boolean(targetPos.isVerticalWall);
        if (isSurfaceBound && isCrossSurfaceCap && !workshopSpec.pyramidNav.canCrossSurfaceCaptureInSurfaceBound) {
          return;
        }
        const exists = moves.some(
          (m) =>
            m.to.x === targetPos.x &&
            m.to.y === targetPos.y &&
            !!m.to.isVerticalWall === !!targetPos.isVerticalWall &&
            m.to.wallDirection === targetPos.wallDirection
        );
        if (exists) return;

        const destTier =
          targetPos.tier ??
          (targetPos.isVerticalWall
            ? targetPos.wallTierStep || 1
            : getTileTier(boardType, targetPos.x, targetPos.y));
        const curEffTier = authPiecePos.isVerticalWall
          ? authPiecePos.wallTierStep || 1
          : authPiecePos.tier ?? 0;
        const promotes =
          !targetPos.isVerticalWall && isPawnPromoted(targetPos.x, targetPos.y);

        moves.push({
          from: { ...authPiecePos },
          to: { ...targetPos },
          pieceId: piece.id,
          isCapture: true,
          capturedPieceId: enemyPiece.id,
          isVerticalClimb: destTier > curEffTier,
          tierDelta: destTier - curEffTier,
          isSummitAscension: false,
          promotionType: promotes ? 'queen' : undefined,
          isWallPerch: targetPos.isVerticalWall,
        });
      };

      const diagOffsets: [number, number][] =
        facing === 'north' || facing === 'south'
          ? [[-1, fdy], [1, fdy]]
          : [[fdx, -1], [fdx, 1]];

      for (const [cdx, cdy] of diagOffsets) {
        const cx = x + cdx;
        const cy = y + cdy;
        if (isValidCoord(cx, cy)) {
          const capTier = getTileTier(boardType, cx, cy);
          // 3a. Horizontal ground/terrace enemy at forward-diagonal (cx, cy)
          // Allowed in both Open Surface and Surface Bound (Pawn Cross-Surface Exception)
          const target = getPieceAt(allPieces, cx, cy);
          if (target && target.color !== piece.color) {
            addPawnCaptureMove({ x: cx, y: cy, tier: capTier }, target);
          }

          // 3b. Vertical wall perched enemy at forward-diagonal (cx, cy)
          // Allowed in both Open Surface and Surface Bound (Pawn Cross-Surface Exception)
          if (isPyramidMode) {
            const vTiles = getVerticalCliffTiles(boardType);
            const targetWallTiles = vTiles.filter((vt) => vt.x === cx && vt.y === cy);
            for (const tw of targetWallTiles) {
              const wallEnemy = getVerticalPieceAt(allPieces, tw.x, tw.y, tw.wallDirection);
              if (wallEnemy && wallEnemy.color !== piece.color) {
                addPawnCaptureMove(
                  {
                    x: tw.x,
                    y: tw.y,
                    tier: tw.tier,
                    isVerticalWall: true,
                    wallDirection: tw.wallDirection,
                    wallTierStep: tw.wallTierStep,
                  },
                  wallEnemy
                );
              }
            }
          }

          // 4. En Passant Capture (when enemy pawn just made a 2-square advance onto an adjacent file)
          if (
            lastMove &&
            lastMove.to &&
            lastMove.from &&
            !piece.position.isVerticalWall &&
            Math.abs(lastMove.to.y - lastMove.from.y) === 2 &&
            lastMove.to.x === cx &&
            lastMove.to.y === y &&
            Math.floor((lastMove.from.y + lastMove.to.y) / 2) === cy
          ) {
            const epTarget = allPieces.find(
              (p) =>
                p.id === lastMove.pieceId &&
                p.type === 'pawn' &&
                p.color !== piece.color &&
                p.rpg.hp > 0
            );
            if (epTarget && !getPieceAt(allPieces, cx, cy)) {
              moves.push({
                from: { ...piece.position },
                to: { x: cx, y: cy, tier: capTier },
                pieceId: piece.id,
                isCapture: true,
                capturedPieceId: epTarget.id,
                isEnPassant: true,
                isVerticalClimb: false,
                tierDelta: 0,
              });
            }
          }
        }
      }

      // 3c. Connected-manifold forward-diagonal cross-surface captures where wall and upper terrace share (x, y)
      // (e.g., Pawn perched on a vertical wall capturing forward-diagonally onto the lip of the terrace above,
      //  or Pawn on a terrace lip capturing forward-diagonally onto the descending vertical cliff wall).
      if (isPyramidMode) {
        const isStrictlyForwardDiagonalTransition = (cand: Position): boolean => {
          if (facing === 'north' || facing === 'south') {
            if (Math.abs(cand.x - x) !== 1) return false;
            if (cand.y === y + fdy) return true;
            if (cand.y === y) {
              // Stepping from vertical wall up onto terrace above in facing direction
              if (
                piece.position.isVerticalWall &&
                !cand.isVerticalWall &&
                ((facing === 'north' && piece.position.wallDirection === 'south') ||
                  (facing === 'south' && piece.position.wallDirection === 'north'))
              ) {
                return true;
              }
              // Stepping from horizontal terrace down onto descending vertical wall in facing direction
              if (
                !piece.position.isVerticalWall &&
                cand.isVerticalWall &&
                ((facing === 'north' && cand.wallDirection === 'north') ||
                  (facing === 'south' && cand.wallDirection === 'south'))
              ) {
                return true;
              }
            }
            return false;
          } else {
            if (Math.abs(cand.y - y) !== 1) return false;
            if (cand.x === x + fdx) return true;
            if (cand.x === x) {
              if (
                piece.position.isVerticalWall &&
                !cand.isVerticalWall &&
                ((facing === 'east' && piece.position.wallDirection === 'west') ||
                  (facing === 'west' && piece.position.wallDirection === 'east'))
              ) {
                return true;
              }
              if (
                !piece.position.isVerticalWall &&
                cand.isVerticalWall &&
                ((facing === 'east' && cand.wallDirection === 'east') ||
                  (facing === 'west' && cand.wallDirection === 'west'))
              ) {
                return true;
              }
            }
            return false;
          }
        };

        for (const latDir of lateralDirs) {
          const candidates: (Position | null)[] = [];
          if (nextForward) {
            candidates.push(getNextConnectedSurfaceTile(nextForward, latDir, boardType));
          }
          const nextLat = getNextConnectedSurfaceTile(piece.position, latDir, boardType);
          if (nextLat) {
            candidates.push(getNextConnectedSurfaceTile(nextLat, facing, boardType));
          }
          for (const cand of candidates) {
            if (!cand || !isStrictlyForwardDiagonalTransition(cand)) continue;
            const occEnemy = getPieceAtPosition(allPieces, cand);
            if (occEnemy && occEnemy.color !== piece.color) {
              addPawnCaptureMove(cand, occEnemy);
            }
          }
        }
      }
      break;
    }

    case 'knight': {
      // Law 8, 9 & 10 (Surface Bound Jump Color Law, Summit Release & Summit Descent Law)
      const originColor = piece.originColor || getPositionCheckerColor(piece.position, boardType);
      const isColorReleased =
        !!piece.colorReleased || !workshopSpec.pyramidNav.usesJumpColorLock;
      const isOnSummit = !piece.position.isVerticalWall && isSummitTile(boardType, x, y);

      const canKnightLandOn = (destPos: Position): boolean => {
        if (!isSurfaceBound || !workshopSpec.pyramidNav.usesJumpColorLock) return true;
        // Law 8 & Law 9: Before reaching the 4x4 summit, jump landings must match original starting tile color
        if (!isColorReleased && getPositionCheckerColor(destPos, boardType) !== originColor) {
          return false;
        }
        return true;
      };

      // Law 10 (Surface Bound Summit Descent Law):
      // A jump FROM the 4x4 summit can land ONLY on designated Pyramid-Base tiles!
      if (isSurfaceBound && isOnSummit && workshopSpec.pyramidNav.canUseSummitToBaseJump) {
        const baseTargets = getSummitToBaseJumpTargets(x, y, boardType);
        for (const bt of baseTargets) {
          if (canKnightLandOn(bt)) {
            tryAddTargetMove(bt);
          }
        }
        break;
      }

      if (workshopSpec.directions.lJump) {
        // Traditional Knight L-Jumps: bypasses intermediate tiles and elevation
        const knightOffsets: [number, number][] = [
          [1, 2], [2, 1], [-1, 2], [-2, 1],
          [1, -2], [2, -1], [-1, -2], [-2, -1],
        ];
        for (const [dx, dy] of knightOffsets) {
          const tx = x + dx;
          const ty = y + dy;
          if (isValidCoord(tx, ty)) {
            const destTier = getTileTier(boardType, tx, ty);
            const candidate: Position = { x: tx, y: ty, tier: destTier };
            if (canKnightLandOn(candidate)) {
              tryAddTargetMove(candidate);
            }
          }
        }

        // Can leap directly onto vertical cliff tiles within exact Knight L-radius
        if (isPyramidMode && workshopSpec.pyramidNav.canEnterVerticalWalls) {
          const vTiles = getVerticalCliffTiles(boardType);
          vTiles
            .filter((vt) => {
              const dx = Math.abs(vt.x - x);
              const dy = Math.abs(vt.y - y);
              return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
            })
            .forEach((vt) => {
              const candidate: Position = {
                x: vt.x,
                y: vt.y,
                tier: vt.tier,
                isVerticalWall: true,
                wallDirection: vt.wallDirection,
                wallTierStep: vt.wallTierStep,
              };
              if (canKnightLandOn(candidate)) {
                tryAddTargetMove(candidate);
              }
            });
        }
      }

      // 1-Step Surface-Bend Climb Fallback on Pyramid boards (lets color-locked Knights ascend bends toward 4x4 Summit)
      if (isPyramidMode && (workshopSpec.specialParams.knightAllowPyramidStepClimb ?? true)) {
        const dirs: CardinalDirection[] = ['north', 'south', 'east', 'west'];
        for (const d of dirs) {
          const nextStep = getNextConnectedSurfaceTile(piece.position, d, boardType);
          if (!nextStep) continue;
          const crossesBendOrClimbs =
            Boolean(nextStep.isVerticalWall) !== Boolean(piece.position.isVerticalWall) ||
            (nextStep.tier ?? 0) !== (piece.position.tier ?? 0);
          if (crossesBendOrClimbs) {
            tryAddTargetMove(nextStep);
          }
        }
      }
      break;
    }

    case 'bishop': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      // Diagonal sliding across connected surface with configurable board range (default 13 on large/Pyramid)
      const bRange = configuredRange;
      if (workshopSpec.directions.diagonalForward) {
        castDiagonalSurfaceRay(1, 1, bRange);
        castDiagonalSurfaceRay(-1, 1, bRange);
      }
      if (workshopSpec.directions.diagonalBackward) {
        castDiagonalSurfaceRay(1, -1, bRange);
        castDiagonalSurfaceRay(-1, -1, bRange);
      }
      if (workshopSpec.directions.forward) castOrthogonalSurfaceRay('north', bRange);
      if (workshopSpec.directions.backward) castOrthogonalSurfaceRay('south', bRange);
      if (workshopSpec.directions.sideways) {
        castOrthogonalSurfaceRay('east', bRange);
        castOrthogonalSurfaceRay('west', bRange);
      }
      break;
    }

    case 'rook': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      // Unbroken orthogonal sliding across connected surface with configurable board range (default 18 on large/Pyramid)
      const rRange = configuredRange;
      if (workshopSpec.directions.forward) castOrthogonalSurfaceRay('north', rRange);
      if (workshopSpec.directions.backward) castOrthogonalSurfaceRay('south', rRange);
      if (workshopSpec.directions.sideways) {
        castOrthogonalSurfaceRay('east', rRange);
        castOrthogonalSurfaceRay('west', rRange);
      }
      if (workshopSpec.directions.diagonalForward) {
        castDiagonalSurfaceRay(1, 1, rRange);
        castDiagonalSurfaceRay(-1, 1, rRange);
      }
      if (workshopSpec.directions.diagonalBackward) {
        castDiagonalSurfaceRay(1, -1, rRange);
        castDiagonalSurfaceRay(-1, -1, rRange);
      }
      break;
    }

    case 'queen': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      // Full combination of continuous Rook orthogonal ray + Bishop diagonal ray with configurable board range
      const qRange = configuredRange;
      if (workshopSpec.directions.forward) castOrthogonalSurfaceRay('north', qRange);
      if (workshopSpec.directions.backward) castOrthogonalSurfaceRay('south', qRange);
      if (workshopSpec.directions.sideways) {
        castOrthogonalSurfaceRay('east', qRange);
        castOrthogonalSurfaceRay('west', qRange);
      }
      if (workshopSpec.directions.diagonalForward) {
        castDiagonalSurfaceRay(1, 1, qRange);
        castDiagonalSurfaceRay(-1, 1, qRange);
      }
      if (workshopSpec.directions.diagonalBackward) {
        castDiagonalSurfaceRay(1, -1, qRange);
        castDiagonalSurfaceRay(-1, -1, qRange);
      }
      break;
    }

    case 'king': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      // King moves up to configuredRange connected tiles (default 1 on Classic 8x8, 13 on Large/Pyramid)
      const kRange = configuredRange;
      if (workshopSpec.directions.forward) castOrthogonalSurfaceRay('north', kRange);
      if (workshopSpec.directions.backward) castOrthogonalSurfaceRay('south', kRange);
      if (workshopSpec.directions.sideways) {
        castOrthogonalSurfaceRay('east', kRange);
        castOrthogonalSurfaceRay('west', kRange);
      }
      if (workshopSpec.directions.diagonalForward) {
        castDiagonalSurfaceRay(1, 1, kRange);
        castDiagonalSurfaceRay(-1, 1, kRange);
      }
      if (workshopSpec.directions.diagonalBackward) {
        castDiagonalSurfaceRay(1, -1, kRange);
        castDiagonalSurfaceRay(-1, -1, kRange);
      }

      // Classical Castling (Kingside O-O & Queenside O-O-O)
      if (
        (workshopSpec.specialParams.kingAllowCastling ?? true) &&
        !piece.hasMoved &&
        !piece.position.isVerticalWall
      ) {
          const sameRankRooks = allPieces.filter(
            (p) =>
              p.color === piece.color &&
              p.type === 'rook' &&
              !p.hasMoved &&
              !p.position.isVerticalWall &&
              p.position.y === y &&
              p.position.tier === piece.position.tier &&
              p.rpg.hp > 0
          );

          for (const rook of sameRankRooks) {
            const rx = rook.position.x;
            const dir = rx > x ? 1 : -1;
            const dist = Math.abs(rx - x);
            if (dist < 3) continue;

            let pathClear = true;
            for (let cx = x + dir; cx !== rx; cx += dir) {
              const stepTier = getTileTier(boardType, cx, y);
              if (stepTier !== piece.position.tier || getPieceAt(allPieces, cx, y)) {
                pathClear = false;
                break;
              }
            }

            if (pathClear) {
              const kingDestX = x + dir * 2;
              const rookDestX = x + dir;
              moves.push({
                from: { ...piece.position },
                to: { x: kingDestX, y, tier: piece.position.tier },
                pieceId: piece.id,
                isCapture: false,
                isVerticalClimb: false,
                tierDelta: 0,
                isCastling: true,
                castlingSide: dir > 0 ? 'kingside' : 'queenside',
                rookPieceId: rook.id,
                rookFrom: { ...rook.position },
                rookTo: { x: rookDestX, y, tier: piece.position.tier },
              });
            }
          }
        }
      break;
    }

    // =========================================================================
    // GRAND PYRAMID EXCLUSIVE PIECE — THE VANGUARD
    // - 9 -> 1 Forward Movement Contraction based on position relative to center
    // - Never retreats (no backward movement anywhere)
    // - No sideways movement on horizontal tiles
    // - Vertical-Tile Exception: Gains sideways movement ONLY while occupying a vertical Pyramid tile
    // - Cannot jump over occupied tiles
    // - Captures along legal movement paths (forward, or sideways while on a vertical tile)
    // - Exclusive Ability: Rook Exchange (switches board positions with any friendly Rook, subject to King safety)
    // =========================================================================
    case 'vanguard': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
      const { maxTiles } = getVanguardMovementProfile(piece);

      // 1. Forward Movement & Forward Capture across continuous connected surface (1..maxTiles)
      castOrthogonalSurfaceRay(facing, maxTiles);

      // 2. Vertical-Tile Exception: Sideways movement & sideways capture ONLY while occupying a vertical Pyramid tile
      if (
        piece.position.isVerticalWall &&
        (workshopSpec.specialParams.vanguardWallSidewaysMove ?? true)
      ) {
        const allowWallCapture = workshopSpec.specialParams.vanguardWallSidewaysCapture ?? true;
        const lateralDirs: CardinalDirection[] =
          facing === 'north' || facing === 'south' ? ['west', 'east'] : ['north', 'south'];

        for (const sideDir of lateralDirs) {
          let curr: Position = { ...piece.position };
          for (let step = 0; step < maxTiles; step++) {
            // Sideways movement is only permitted while physically occupying a vertical Pyramid tile
            if (!curr.isVerticalWall) break;

            const nextTile = getNextConnectedSurfaceTile(curr, sideDir, boardType);
            if (!nextTile) break;

            const occAtNext = getPieceAtPosition(allPieces, nextTile);
            if (occAtNext && occAtNext.color !== piece.color && !allowWallCapture) {
              break;
            }

            const canContinue = tryAddTargetMove(nextTile);
            if (!canContinue) break;

            curr = nextTile;
          }
        }
      }

      // 3. Exclusive Ability: Rook Exchange (Switch positions ONLY with a living Rook of its own team)
      if (workshopSpec.specialParams.vanguardAllowRookExchange ?? true) {
        const maxExchangeRange = workshopSpec.specialParams.vanguardRookExchangeMaxRange ?? 0;
        const allowCrossSurfaceExchange =
          workshopSpec.specialParams.vanguardRookExchangeCrossSurface ?? true;

        const friendlyRooks = allPieces.filter(
          (p) =>
            p.id !== piece.id &&
            p.color === piece.color &&
            p.type === 'rook' &&
            p.rpg.hp > 0 &&
            getPieceAtPosition(allPieces, p.position)?.id === p.id
        );

        for (const rook of friendlyRooks) {
          if (rook.color !== piece.color || rook.type !== 'rook') continue;
          if (
            !allowCrossSurfaceExchange &&
            Boolean(rook.position.isVerticalWall) !== Boolean(piece.position.isVerticalWall)
          ) {
            continue;
          }
          if (maxExchangeRange > 0) {
            const chebyshev = Math.max(
              Math.abs(rook.position.x - piece.position.x),
              Math.abs(rook.position.y - piece.position.y)
            );
            if (chebyshev > maxExchangeRange) continue;
          }
          const destTier =
            rook.position.tier ??
            (rook.position.isVerticalWall
              ? rook.position.wallTierStep || 1
              : getTileTier(boardType, rook.position.x, rook.position.y));
          const tierDelta = destTier - (piece.position.tier ?? 0);

          moves.push({
            from: { ...piece.position },
            to: { ...rook.position },
            pieceId: piece.id,
            isCapture: false,
            isRookExchange: true,
            exchangePartnerId: rook.id,
            isVerticalClimb: tierDelta > 0,
            tierDelta,
            isWallPerch: rook.position.isVerticalWall,
          });
        }
      }
      break;
    }

    // =========================================================================
    // GRAND PYRAMID RPG-EXCLUSIVE PIECES (Gargoyle, Ascendant, Trebuchet)
    // =========================================================================

    // 1. GARGOYLE — Pyramid Terrain & Defensive Specialist ("The wall and elevation specialist")
    // - Modest 2-tile surface stride on open flat valley ground
    // - Awakens full 3-tile terrain mastery when occupying or targeting Pyramid walls, terraces, and bends
    // - Can perch directly onto any vertical Pyramid wall tile within its terrain radius and traverse walls laterally
    case 'gargoyle': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      const gargoyleProfile = getGargoyleTerrainProfile(piece);
      const onPyramid = gargoyleProfile.isOnPyramidTerrain;

      // Connected surface orthogonal & diagonal traversal (2 tiles on flat ground, 3 on Pyramid terrain)
      const surfaceRange = onPyramid ? 3 : 2;
      castOrthogonalSurfaceRay('north', surfaceRange);
      castOrthogonalSurfaceRay('south', surfaceRange);
      castOrthogonalSurfaceRay('east', surfaceRange);
      castOrthogonalSurfaceRay('west', surfaceRange);
      castDiagonalSurfaceRay(1, 1, surfaceRange);
      castDiagonalSurfaceRay(-1, 1, surfaceRange);
      castDiagonalSurfaceRay(1, -1, surfaceRange);
      castDiagonalSurfaceRay(-1, -1, surfaceRange);

      // Winged terrain-hop onto elevated Pyramid terraces & bends (Open Surface only; in Surface Bound, Gargoyle uses connected surface paths)
      if (!isSurfaceBound) {
        const hopOffsets: [number, number][] = [
          [1, 2], [2, 1], [-1, 2], [-2, 1],
          [1, -2], [2, -1], [-1, -2], [-2, -1],
          [0, 2], [0, -2], [2, 0], [-2, 0],
          [2, 2], [-2, 2], [2, -2], [-2, -2],
        ];
        for (const [dx, dy] of hopOffsets) {
          const tx = x + dx;
          const ty = y + dy;
          if (isValidCoord(tx, ty)) {
            const destTier = getTileTier(boardType, tx, ty);
            // Gargoyle's leap advantage applies on Pyramid terrain or on the 20x20 Battlefield flat
            if (onPyramid || destTier >= 1 || boardType === 'battlefield') {
              tryAddTargetMove({ x: tx, y: ty, tier: destTier });
            }
          }
        }

        // Direct flight & perching onto vertical Pyramid cliff tiles within 3 tiles
        if (isPyramidMode) {
          const vTiles = getVerticalCliffTiles(boardType);
          const maxWallDist = onPyramid ? 3 : 2;
          vTiles
            .filter((vt) => {
              const dist = Math.max(Math.abs(vt.x - x), Math.abs(vt.y - y));
              return dist >= 1 && dist <= maxWallDist;
            })
            .forEach((vt) => {
              tryAddTargetMove({
                x: vt.x,
                y: vt.y,
                tier: vt.tier,
                isVerticalWall: true,
                wallDirection: vt.wallDirection,
                wallTierStep: vt.wallTierStep,
              });
            });
        }
      }
      break;
    }

    // 2. TREBUCHET — Siege Jump-Capturer & Knockback Artillery Specialist
    // - Must physically jump onto an enemy piece (within 1–2 tiles) to capture it!
    // - Physical Repositioning: 1–2 orthogonal connected horizontal tiles onto empty squares.
    // - Bombardment (isBombard: true, isCapture: false): Does NOT capture; knocks the target piece back
    //   3 tiles onto any random open tile without the Trebuchet leaving its square.
    // - Pyramid Rule: If the Trebuchet gets on the Pyramid (Tier 1+), it can ONLY bombard targets on the 4×4 Summit!
    case 'trebuchet': {
      const trebProfile = getTrebuchetProfile(piece);
      const dirs: CardinalDirection[] = ['north', 'south', 'east', 'west'];
      const attackerTier = authPiecePos.tier || 0;
      const isOnPyramid =
        isPyramidMode && (attackerTier >= 1 || Boolean(authPiecePos.isVerticalWall));

      // A1. Physical Repositioning onto empty horizontal tiles
      // On the 4x4 Summit: 1 connected tile in any of the 8 directions onto empty horizontal tiles.
      // Below the Summit: 1 to 2 orthogonal connected horizontal tiles onto empty squares.
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves({ nonCaptureOnly: true, horizontalOnly: true });
      } else {
        for (const dir of dirs) {
          let curr: Position = { ...authPiecePos };
          for (let step = 1; step <= trebProfile.repositionRange; step++) {
            const nextTile = getNextConnectedSurfaceTile(curr, dir, boardType);
            // Trebuchet chassis cannot perch on vertical cliff walls
            if (!nextTile || nextTile.isVerticalWall) break;
            const occ = getPieceAtPosition(allPieces, nextTile);
            if (occ) break; // Repositioning ray stops at occupied tiles (jump-capture handled below)

            const tierDelta = (nextTile.tier ?? 0) - attackerTier;
            moves.push({
              from: { ...authPiecePos },
              to: { ...nextTile },
              pieceId: piece.id,
              isCapture: false,
              isVerticalClimb: tierDelta > 0,
              tierDelta,
            });
            curr = nextTile;
          }
        }
      }

      // A2. Jump-Capture: The Trebuchet MUST jump onto an enemy piece (within 1–2 tiles) to capture it!
      for (let dx = -trebProfile.repositionRange; dx <= trebProfile.repositionRange; dx++) {
        for (let dy = -trebProfile.repositionRange; dy <= trebProfile.repositionRange; dy++) {
          if (dx === 0 && dy === 0) continue;
          const tx = x + dx;
          const ty = y + dy;
          if (!isValidCoord(tx, ty)) continue;

          const destTier = getTileTier(boardType, tx, ty);
          const groundEnemy = getPieceAt(allPieces, tx, ty);
          if (groundEnemy && groundEnemy.color !== piece.color) {
            // Surface Bound check: horizontal Trebuchet captures horizontal enemy
            if (!isSurfaceBound || !piece.position.isVerticalWall) {
              const isSummit = isSummitTile(boardType, tx, ty);
              moves.push({
                from: { ...piece.position },
                to: { x: tx, y: ty, tier: destTier },
                pieceId: piece.id,
                isCapture: true,
                capturedPieceId: groundEnemy.id,
                isBombard: false,
                isVerticalClimb: destTier > attackerTier,
                tierDelta: destTier - attackerTier,
                isSummitAscension: isSummit,
              });
            }
          }
        }
      }

      // B. Ranged Bombardment (isBombard: true, isCapture: false)
      // Knocks the bombarded enemy piece back N tiles onto any random open tile!
      if (isOnPyramid && trebProfile.pyramidSummitOnly) {
        // RULE: If the Trebuchet gets on the Pyramid (Tier 1+), it can ONLY bombard anything on the 4×4 Summit!
        for (const enemy of allPieces) {
          if (enemy.color === piece.color || enemy.rpg.hp <= 0) continue;
          if (enemy.position.isVerticalWall) continue;
          if (!isSummitTile(boardType, enemy.position.x, enemy.position.y)) continue;
          if (enemy.position.x === x && enemy.position.y === y) continue;

          const knockbackTile = findBombardKnockbackPosition(
            enemy.position,
            piece.position,
            allPieces,
            boardType,
            true
          );
          if (!knockbackTile) continue;

          const tileTier = getTileTier(boardType, enemy.position.x, enemy.position.y);
          moves.push({
            from: { ...piece.position },
            to: { x: enemy.position.x, y: enemy.position.y, tier: tileTier },
            pieceId: piece.id,
            isCapture: false,
            capturedPieceId: enemy.id,
            isBombard: true,
            isVerticalClimb: tileTier > attackerTier,
            tierDelta: tileTier - attackerTier,
          });
        }
      } else {
        // Off the Pyramid (Valley Plains Tier 0 or Flat Battlefield):
        // Bombard along 8 compass rays from distance 3 .. maxRange, knocking the target back 3 tiles!
        const firingRays: [number, number][] = [
          [0, 1], [0, -1], [1, 0], [-1, 0],
          [1, 1], [-1, 1], [1, -1], [-1, -1],
        ];

        for (const [rx, ry] of firingRays) {
          let maxInterveningTier = attackerTier;

          for (let dist = 1; dist <= trebProfile.maxRange; dist++) {
            const tx = x + rx * dist;
            const ty = y + ry * dist;
            if (!isValidCoord(tx, ty)) break;

            const tileTier = getTileTier(boardType, tx, ty);

            // Distance 1..2 is covered by Jump-Capture; Bombardment starts at minRange (3)
            if (dist < trebProfile.minRange) {
              maxInterveningTier = Math.max(maxInterveningTier, tileTier);
              continue;
            }

            // Line of attack check: an intervening Pyramid terrace strictly higher than both
            // the Trebuchet's elevation + 1 and the target's elevation blocks the artillery arc
            const arcCeiling = Math.max(attackerTier + 1, tileTier);
            if (maxInterveningTier > arcCeiling) {
              break;
            }

            // Check horizontal tile target at (tx, ty)
            const groundEnemy = getPieceAt(allPieces, tx, ty);
            if (groundEnemy && groundEnemy.color !== piece.color) {
              const knockbackTile = findBombardKnockbackPosition(
                groundEnemy.position,
                piece.position,
                allPieces,
                boardType,
                true
              );
              if (knockbackTile) {
                moves.push({
                  from: { ...piece.position },
                  to: { x: tx, y: ty, tier: tileTier },
                  pieceId: piece.id,
                  isCapture: false,
                  capturedPieceId: groundEnemy.id,
                  isBombard: true,
                  isVerticalClimb: tileTier > attackerTier,
                  tierDelta: tileTier - attackerTier,
                });
              }
            }

            // Check vertical wall target at (tx, ty) in Pyramid mode (Open Surface only)
            if (isPyramidMode && !isSurfaceBound) {
              const vTiles = getVerticalCliffTiles(boardType).filter((vt) => vt.x === tx && vt.y === ty);
              for (const vt of vTiles) {
                const wallEnemy = getVerticalPieceAt(allPieces, vt.x, vt.y, vt.wallDirection);
                if (wallEnemy && wallEnemy.color !== piece.color) {
                  const knockbackTile = findBombardKnockbackPosition(
                    wallEnemy.position,
                    piece.position,
                    allPieces,
                    boardType,
                    true
                  );
                  if (knockbackTile) {
                    const wallStep = vt.wallTierStep || 1;
                    moves.push({
                      from: { ...piece.position },
                      to: {
                        x: vt.x,
                        y: vt.y,
                        tier: vt.tier,
                        isVerticalWall: true,
                        wallDirection: vt.wallDirection,
                        wallTierStep: wallStep,
                      },
                      pieceId: piece.id,
                      isCapture: false,
                      capturedPieceId: wallEnemy.id,
                      isBombard: true,
                      isVerticalClimb: wallStep > attackerTier,
                      tierDelta: wallStep - attackerTier,
                      isWallPerch: true,
                    });
                  }
                }
              }
            }

            maxInterveningTier = Math.max(maxInterveningTier, tileTier);
          }
        }
      }
      break;
    }

    // 3. ASCENDANT — Elevation & Advancement Specialist
    // - Tactical potential develops as it advances and gains Pyramid elevation (2 -> 3 -> 4 connected tiles)
    // - Scales vertical walls and terraces seamlessly; checkmate remains the sole victory condition
    case 'ascendant': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      const { maxStride } = getAscendantProfile(piece, size);
      castOrthogonalSurfaceRay('north', maxStride);
      castOrthogonalSurfaceRay('south', maxStride);
      castOrthogonalSurfaceRay('east', maxStride);
      castOrthogonalSurfaceRay('west', maxStride);
      castDiagonalSurfaceRay(1, 1, maxStride);
      castDiagonalSurfaceRay(-1, 1, maxStride);
      castDiagonalSurfaceRay(1, -1, maxStride);
      castDiagonalSurfaceRay(-1, -1, maxStride);
      break;
    }

    // Promoted Queens / Apex ascendants
    case 'solar_queen':
    case 'archon_templar':
    case 'chrono_mage':
    case 'titan_golem': {
      if (isStartingOnSummit) {
        addSummitOneTileEightDirectionMoves();
        break;
      }
      castOrthogonalSurfaceRay('north');
      castOrthogonalSurfaceRay('south');
      castOrthogonalSurfaceRay('east');
      castOrthogonalSurfaceRay('west');
      castDiagonalSurfaceRay(1, 1);
      castDiagonalSurfaceRay(-1, 1);
      castDiagonalSurfaceRay(1, -1);
      castDiagonalSurfaceRay(-1, -1);
      break;
    }
  }

  // Authoritative Playable-Tile Gatekeeper:
  // Every returned move must reference an existing playable tile from `generateBoardTiles(boardType)`,
  // with exact canonical elevation `tier`, `isVerticalWall`, `wallDirection`, and `wallTierStep`.
  const validatedMoves: Move[] = [];
  const seenMoveKeys = new Set<string>();
  const fromEffTier = authPiecePos.isVerticalWall
    ? authPiecePos.wallTierStep || 1
    : authPiecePos.tier;

  for (const m of moves) {
    const authTo = toAuthoritativePosition(boardType, m.to);
    if (!authTo) continue;

    let authRookTo: Position | undefined = undefined;
    let authRookFrom: Position | undefined = undefined;
    if (m.isCastling) {
      if (!m.rookTo || !m.rookFrom) continue;
      const rTo = toAuthoritativePosition(boardType, m.rookTo);
      const rFrom = toAuthoritativePosition(boardType, m.rookFrom);
      if (!rTo || !rFrom || rTo.isVerticalWall || rFrom.isVerticalWall) continue;
      if (rTo.tier !== authPiecePos.tier || authTo.tier !== authPiecePos.tier) continue;
      authRookTo = rTo;
      authRookFrom = rFrom;
    }

    const toEffTier = authTo.isVerticalWall ? authTo.wallTierStep || 1 : authTo.tier;
    const canonicalTierDelta = toEffTier - fromEffTier;
    const dedupKey = `${authTo.x},${authTo.y},${Boolean(authTo.isVerticalWall)},${authTo.wallDirection || ''},${Boolean(m.isBombard)},${Boolean(m.isRookExchange)},${Boolean(m.isCastling)}`;
    if (seenMoveKeys.has(dedupKey)) continue;
    seenMoveKeys.add(dedupKey);

    validatedMoves.push({
      ...m,
      from: { ...authPiecePos },
      to: authTo,
      tierDelta: canonicalTierDelta,
      isVerticalClimb: canonicalTierDelta > 0,
      isWallPerch: Boolean(authTo.isVerticalWall),
      rookFrom: authRookFrom ?? m.rookFrom,
      rookTo: authRookTo ?? m.rookTo,
    });
  }

  return validatedMoves;
}

/**
 * Finds an open horizontal tile 3 tiles away from targetPos for Trebuchet Bombardment knockback.
 * Prioritizes open tiles at distance 3 in the knockback half-space (away from attackerPos),
 * then any open tile at distance 3, with fallback to distance 2 or 1 if all distance-3 tiles are full.
 */
export function findBombardKnockbackPosition(
  targetPos: Position,
  attackerPos: Position,
  allPieces: Piece[],
  boardType: BoardType = 'pyramid',
  deterministic: boolean = false
): Position | null {
  const size = BOARD_SIZES[boardType] || 20;
  const tx = targetPos.x;
  const ty = targetPos.y;
  const pushX = tx - attackerPos.x;
  const pushY = ty - attackerPos.y;

  const collectOpenAtRing = (ringDist: number): { pos: Position; forwardDot: number }[] => {
    const list: { pos: Position; forwardDot: number }[] = [];
    for (let dx = -ringDist; dx <= ringDist; dx++) {
      for (let dy = -ringDist; dy <= ringDist; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ringDist) continue;
        const nx = tx + dx;
        const ny = ty + dy;
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;
        if (getPieceAt(allPieces, nx, ny)) continue;
        const authPos = toAuthoritativePosition(boardType, {
          x: nx,
          y: ny,
          isVerticalWall: false,
        });
        if (!authPos) continue;
        const dot = dx * pushX + dy * pushY;
        list.push({ pos: authPos, forwardDot: dot });
      }
    }
    return list;
  };

  const trebSpec = getPieceWorkshopSpec('trebuchet');
  const preferredKnockback = trebSpec.specialParams.trebuchetKnockbackTiles ?? 3;
  const ringOrder = Array.from(new Set([preferredKnockback, 3, 2, 1])).filter((d) => d >= 1);

  for (const dist of ringOrder) {
    const ringOpen = collectOpenAtRing(dist);
    if (ringOpen.length > 0) {
      // Prefer tiles knocked away from the Trebuchet (dot >= 0), or any open tile at that distance
      const awayOpen = ringOpen.filter((c) => c.forwardDot >= 0);
      const pool = awayOpen.length > 0 ? awayOpen : ringOpen;
      if (deterministic) {
        pool.sort((a, b) => b.forwardDot - a.forwardDot);
        return pool[0].pos;
      }
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      return chosen.pos;
    }
  }

  return null;
}

// Simulates executing a move on the piece array to check King safety and AI evaluation
export function simulateMove(
  pieces: Piece[],
  move: Move,
  boardType: BoardType = 'pyramid'
): Piece[] {
  const authFrom = toAuthoritativePosition(boardType, move.from);
  const authTo = toAuthoritativePosition(boardType, move.to);
  if (!authFrom || !authTo) return pieces;

  // Handle Trebuchet Bombardment Knockback (knocks target piece 3 tiles onto an open tile without capturing)
  if (move.isBombard && move.capturedPieceId) {
    const bombardedTarget = pieces.find((p) => p.id === move.capturedPieceId && p.rpg.hp > 0);
    if (!bombardedTarget) return pieces;
    const knockbackPos = findBombardKnockbackPosition(
      bombardedTarget.position,
      authFrom,
      pieces,
      boardType,
      true
    );
    if (!knockbackPos) return pieces;
    return pieces.map((p) => {
      if (p.id === move.pieceId) {
        return { ...p, hasMoved: true };
      }
      if (p.id === move.capturedPieceId) {
        return {
          ...p,
          position: { ...knockbackPos },
          hasMoved: true,
        };
      }
      return p;
    });
  }
  // Handle Vanguard <-> Friendly Rook positional exchange (strictly same team Vanguard + Rook only)
  if (move.isRookExchange && move.exchangePartnerId) {
    const mover = pieces.find((p) => p.id === move.pieceId && p.rpg.hp > 0);
    const partner = pieces.find((p) => p.id === move.exchangePartnerId && p.rpg.hp > 0);
    if (
      !mover ||
      !partner ||
      mover.type !== 'vanguard' ||
      partner.type !== 'rook' ||
      mover.color !== partner.color
    ) {
      return pieces;
    }
    return pieces.map((p) => {
      if (p.id === move.pieceId) {
        const facing = p.facing || (p.color === 'white' ? 'north' : 'south');
        const newProg =
          facing === 'north'
            ? authTo.y
            : facing === 'south'
            ? 19 - authTo.y
            : facing === 'east'
            ? authTo.x
            : 19 - authTo.x;
        const maxForwardProgress = Math.max(p.maxForwardProgress ?? 0, newProg);
        return {
          ...p,
          position: { ...authTo },
          hasMoved: true,
          maxForwardProgress,
          hasCrossedCenter: p.hasCrossedCenter || maxForwardProgress >= 9,
        };
      }
      if (p.id === move.exchangePartnerId) {
        return {
          ...p,
          position: { ...authFrom },
          hasMoved: true,
        };
      }
      return p;
    });
  }

  // Handle Classical Castling (moves both King and Rook)
  if (move.isCastling && move.rookPieceId && move.rookTo) {
    const authRookTo = toAuthoritativePosition(boardType, move.rookTo);
    if (!authRookTo) return pieces;
    return pieces.map((p) => {
      if (p.id === move.pieceId) {
        return {
          ...p,
          position: { ...authTo },
          hasMoved: true,
        };
      }
      if (p.id === move.rookPieceId) {
        return {
          ...p,
          position: { ...authRookTo },
          hasMoved: true,
        };
      }
      return p;
    });
  }

  return pieces
    .filter((p) => {
      if (move.isCapture) {
        if (move.capturedPieceId) {
          return p.id !== move.capturedPieceId;
        }
        const isMatchPos =
          p.position.x === authTo.x &&
          p.position.y === authTo.y &&
          (authTo.isVerticalWall
            ? !!p.position.isVerticalWall &&
              (!authTo.wallDirection || p.position.wallDirection === authTo.wallDirection)
            : !p.position.isVerticalWall);
        if (isMatchPos) {
          return false;
        }
      }
      return true;
    })
    .map((p) => {
      if (p.id === move.pieceId) {
        let maxForwardProgress = p.maxForwardProgress;
        let hasCrossedCenter = p.hasCrossedCenter;
        const startedOnSummit =
          !authFrom.isVerticalWall && isSummitTile(boardType, authFrom.x, authFrom.y);
        const endedOnSummit =
          !authTo.isVerticalWall && isSummitTile(boardType, authTo.x, authTo.y);
        if (p.type === 'vanguard' && !startedOnSummit && !endedOnSummit) {
          const facing = p.facing || (p.color === 'white' ? 'north' : 'south');
          const newProg =
            facing === 'north'
              ? authTo.y
              : facing === 'south'
              ? 19 - authTo.y
              : facing === 'east'
              ? authTo.x
              : 19 - authTo.x;
          maxForwardProgress = Math.max(p.maxForwardProgress ?? 0, newProg);
          hasCrossedCenter = !!p.hasCrossedCenter || maxForwardProgress >= 9;
        }
        const newPos = move.isBombard ? { ...authFrom } : { ...authTo };
        const reachedSummit =
          !newPos.isVerticalWall &&
          (Boolean(move.isSummitAscension) || isSummitTile(boardType, newPos.x, newPos.y));
        const canPromote =
          p.type === 'pawn' &&
          Boolean(move.promotionType) &&
          !newPos.isVerticalWall &&
          !isSummitTile(boardType, newPos.x, newPos.y);
        const promotedType = canPromote && move.promotionType ? move.promotionType : p.type;
        return {
          ...p,
          position: newPos,
          hasMoved: true,
          type: promotedType,
          maxForwardProgress,
          hasCrossedCenter,
          colorReleased: p.colorReleased || reachedSummit,
          rpg: canPromote
            ? { ...p.rpg, maxHp: 130, hp: 130, atk: 65, def: 28 }
            : p.rpg,
        };
      }
      return p;
    });
}

const kingInCheckCache = new WeakMap<Piece[], Map<string, boolean>>();
const validMovesForPieceCache = new WeakMap<Piece[], Map<string, Move[]>>();

// Check detection: true if king of color is attacked by any opposing piece
export function isKingInCheck(
  color: PieceColor,
  pieces: Piece[],
  boardType: BoardType,
  playStyle: PlayStyle = activePlayStyle
): boolean {
  const king = pieces.find((p) => p.type === 'king' && p.color === color && p.rpg.hp > 0);
  if (!king) return false;

  let checkMap = kingInCheckCache.get(pieces);
  if (!checkMap) {
    checkMap = new Map<string, boolean>();
    kingInCheckCache.set(pieces, checkMap);
  }
  const checkKey = `${color}_${king.position.x}_${king.position.y}_${Boolean(king.position.isVerticalWall)}_${boardType}_${playStyle}`;
  const cachedCheck = checkMap.get(checkKey);
  if (cachedCheck !== undefined) {
    return cachedCheck;
  }

  const kx = king.position.x;
  const ky = king.position.y;
  const kingOnWall = Boolean(king.position.isVerticalWall);
  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const isSurfaceBound = isPyramidMode && playStyle === 'surface_bound';
  const enemyColor: PieceColor = color === 'white' ? 'black' : 'white';

  for (let i = 0; i < pieces.length; i++) {
    const enemy = pieces[i];
    if (enemy.color !== enemyColor || enemy.rpg.hp <= 0) continue;

    // Law 10 & Law 14 (Surface Bound) with Pawn Cross-Surface Exception:
    // Non-pawn pieces cannot attack or give check across Horizontal and Vertical surfaces in Surface Bound play.
    // Exception: Pawns MAY attack and give check across horizontal and vertical Pyramid tiles within their forward-diagonal capture range!
    if (
      isSurfaceBound &&
      enemy.type !== 'pawn' &&
      Boolean(enemy.position.isVerticalWall) !== kingOnWall
    ) {
      continue;
    }

    const adx = Math.abs(enemy.position.x - kx);
    const ady = Math.abs(enemy.position.y - ky);
    const enemyOnSummit =
      isPyramidMode &&
      !enemy.position.isVerticalWall &&
      isSummitTile(boardType, enemy.position.x, enemy.position.y);

    // Fast O(1) geometric reach filter before generating raw moves
    if (enemyOnSummit && enemy.type !== 'knight' && enemy.type !== 'trebuchet') {
      if (adx > 1 || ady > 1) continue;
    } else if (enemy.type === 'pawn') {
      if (adx > 1 || ady > 1) continue;
    } else if (enemy.type === 'king') {
      if (adx > 13 || ady > 13) continue;
      if (!enemy.position.isVerticalWall && !isPyramidMode && adx !== 0 && ady !== 0 && adx !== ady) continue;
    } else if (enemy.type === 'knight' && !isPyramidMode) {
      if (adx > 2 || ady > 2 || adx + ady !== 3) continue;
    } else if (enemy.type === 'gargoyle') {
      if (adx > 3 || ady > 3) continue;
    } else if (enemy.type === 'rook') {
      if (adx > 18 || ady > 18) continue;
      if (!enemy.position.isVerticalWall && adx !== 0 && ady !== 0) continue;
    } else if (enemy.type === 'bishop') {
      if (adx > 13 || ady > 13) continue;
      if (!enemy.position.isVerticalWall && !isPyramidMode && adx !== ady) continue;
    } else if (enemy.type === 'queen' && !enemy.position.isVerticalWall && !isPyramidMode) {
      if (adx !== 0 && ady !== 0 && adx !== ady) continue;
    }

    const rawMoves = getRawMovesForPiece(enemy, pieces, boardType, latestExecutedMove, playStyle);
    for (let j = 0; j < rawMoves.length; j++) {
      const m = rawMoves[j];
      if (!m.isCapture || m.isBombard) continue;
      if (m.isRookExchange || m.isCastling) continue;
      if (
        m.to.x === kx &&
        m.to.y === ky &&
        (kingOnWall ? !!m.to.isVerticalWall : !m.to.isVerticalWall)
      ) {
        checkMap.set(checkKey, true);
        return true;
      }
    }
  }

  checkMap.set(checkKey, false);
  return false;
}

// Returns legal moves for a specific piece (filtering out moves that leave own King in check)
export function getValidMovesForPiece(
  piece: Piece,
  allPieces: Piece[],
  boardType: BoardType,
  lastMove: Move | null = latestExecutedMove,
  playStyle: PlayStyle = activePlayStyle
): Move[] {
  let movesMap = validMovesForPieceCache.get(allPieces);
  if (!movesMap) {
    movesMap = new Map<string, Move[]>();
    validMovesForPieceCache.set(allPieces, movesMap);
  }
  const cacheKey = `${piece.id}_${piece.type}_${piece.position.x}_${piece.position.y}_${Boolean(piece.position.isVerticalWall)}_${Boolean(piece.colorReleased)}_${boardType}_${playStyle}_${lastMove?.pieceId || ''}_${lastMove?.to.x ?? ''}_${lastMove?.to.y ?? ''}`;
  const cachedMoves = movesMap.get(cacheKey);
  if (cachedMoves) {
    return cachedMoves;
  }

  const rawMoves = getRawMovesForPiece(piece, allPieces, boardType, lastMove, playStyle);

  const filtered = rawMoves.filter((move) => {
    // Vanguard Rook Exchange: strictly enforce Vanguard switching ONLY with a living Rook of its own team
    if (move.isRookExchange) {
      if (piece.type !== 'vanguard' || !move.exchangePartnerId) return false;
      const partnerRook = allPieces.find((p) => p.id === move.exchangePartnerId && p.rpg.hp > 0);
      if (!partnerRook || partnerRook.type !== 'rook' || partnerRook.color !== piece.color) {
        return false;
      }
    }

    // Castling cannot be performed while in check or through a square under attack
    if (move.isCastling) {
      if (isKingInCheck(piece.color, allPieces, boardType, playStyle)) return false;
      const midX = (move.from.x + move.to.x) / 2;
      const midPos = toAuthoritativePosition(boardType, {
        x: midX,
        y: move.from.y,
        isVerticalWall: false,
      });
      if (!midPos || midPos.tier !== move.from.tier) return false;
      const transitMove: Move = {
        ...move,
        isCastling: false,
        to: midPos,
      };
      const transitSim = simulateMove(allPieces, transitMove, boardType);
      if (isKingInCheck(piece.color, transitSim, boardType, playStyle)) return false;
    }

    const simulated = simulateMove(allPieces, move, boardType);
    return !isKingInCheck(piece.color, simulated, boardType, playStyle);
  });

  movesMap.set(cacheKey, filtered);
  return filtered;
}

const hasAnyMoveCache = new WeakMap<Piece[], Map<string, boolean>>();
const allValidMovesCache = new WeakMap<Piece[], Map<string, Move[]>>();

// Fast early-exit helper: returns true as soon as ANY single legal move is found for color
export function hasAnyValidMoveForColor(
  color: PieceColor,
  allPieces: Piece[],
  boardType: BoardType,
  lastMoveOrPlayStyle: Move | null | PlayStyle = activePlayStyle,
  maybePlayStyle?: PlayStyle
): boolean {
  const playStyle: PlayStyle =
    typeof lastMoveOrPlayStyle === 'string'
      ? lastMoveOrPlayStyle
      : maybePlayStyle ?? activePlayStyle;
  const effectiveLastMove: Move | null =
    typeof lastMoveOrPlayStyle === 'string'
      ? latestExecutedMove
      : lastMoveOrPlayStyle ?? latestExecutedMove;

  let map = hasAnyMoveCache.get(allPieces);
  if (!map) {
    map = new Map<string, boolean>();
    hasAnyMoveCache.set(allPieces, map);
  }
  const key = `${color}_${boardType}_${playStyle}_${effectiveLastMove?.pieceId || ''}`;
  const cached = map.get(key);
  if (cached !== undefined) return cached;

  for (let i = 0; i < allPieces.length; i++) {
    const p = allPieces[i];
    if (p.color !== color || p.rpg.hp <= 0) continue;
    const rawMoves = getRawMovesForPiece(p, allPieces, boardType, effectiveLastMove, playStyle);
    for (let j = 0; j < rawMoves.length; j++) {
      const move = rawMoves[j];
      if (move.isCastling) continue;
      const simulated = simulateMove(allPieces, move, boardType);
      if (!isKingInCheck(color, simulated, boardType, playStyle)) {
        map.set(key, true);
        return true;
      }
    }
  }
  map.set(key, false);
  return false;
}

// Returns all legal moves for a given player color
export function getAllValidMovesForColor(
  color: PieceColor,
  allPieces: Piece[],
  boardType: BoardType,
  lastMoveOrPlayStyle: Move | null | PlayStyle = activePlayStyle,
  maybePlayStyle?: PlayStyle
): Move[] {
  const playStyle: PlayStyle =
    typeof lastMoveOrPlayStyle === 'string'
      ? lastMoveOrPlayStyle
      : maybePlayStyle ?? activePlayStyle;
  const effectiveLastMove: Move | null =
    typeof lastMoveOrPlayStyle === 'string'
      ? latestExecutedMove
      : lastMoveOrPlayStyle ?? latestExecutedMove;

  let map = allValidMovesCache.get(allPieces);
  if (!map) {
    map = new Map<string, Move[]>();
    allValidMovesCache.set(allPieces, map);
  }
  const key = `${color}_${boardType}_${playStyle}_${effectiveLastMove?.pieceId || ''}`;
  const cached = map.get(key);
  if (cached) return cached;

  const moves: Move[] = [];
  for (let i = 0; i < allPieces.length; i++) {
    const p = allPieces[i];
    if (p.color !== color || p.rpg.hp <= 0) continue;
    const valid = getValidMovesForPiece(p, allPieces, boardType, effectiveLastMove, playStyle);
    moves.push(...valid);
  }

  map.set(key, moves);
  return moves;
}

// Checkmate: King is in check and no legal moves exist
export function isCheckmate(
  color: PieceColor,
  pieces: Piece[],
  boardType: BoardType,
  playStyle: PlayStyle = activePlayStyle
): boolean {
  if (!isKingInCheck(color, pieces, boardType, playStyle)) return false;
  return !hasAnyValidMoveForColor(color, pieces, boardType, playStyle);
}

// Stalemate: King is NOT in check and no legal moves exist
export function isStalemate(
  color: PieceColor,
  pieces: Piece[],
  boardType: BoardType,
  playStyle: PlayStyle = activePlayStyle
): boolean {
  if (isKingInCheck(color, pieces, boardType, playStyle)) return false;
  return !hasAnyValidMoveForColor(color, pieces, boardType, playStyle);
}

/**
 * Authoritative Capture-Threat Map Helper for AI & Tactical Evaluation:
 * Returns all playable tiles where `piece` has legal CAPTURE permission if an enemy piece
 * occupies or moves onto that square.
 * Explicitly respects:
 * 1. Only actual generated playable tiles exist on the Pyramid.
 * 2. Every non-Knight piece on the 4x4 Summit is limited to 1-tile movement/capture.
 * 3. The Knight retains its summit jump mobility.
 * 4. Capture restrictions differ from movement permissions:
 *    - Pawns ONLY threaten 1-step forward-diagonal squares (never straight, sideways, backward, or 8-dir summit non-capture squares).
 *    - Trebuchets ONLY threaten 1-2 tile horizontal jump-capture squares (never ranged bombardment squares).
 *    - In Surface Bound mode, non-Pawn pieces only threaten captures on their own surface class, while Pawns may threaten across surfaces on forward diagonals.
 */
export function getCaptureThreatSquaresForPiece(
  piece: Piece,
  allPieces: Piece[],
  boardType: BoardType,
  playStyle: PlayStyle = activePlayStyle
): Position[] {
  if (piece.rpg.hp <= 0) return [];
  const authPos = toAuthoritativePosition(boardType, piece.position);
  if (!authPos) return [];

  const isPyramidMode = boardType === 'pyramid' || boardType === 'quick_pyramid';
  const isSurfaceBound = isPyramidMode && playStyle === 'surface_bound';
  const size = BOARD_SIZES[boardType] || 20;
  const threats: Position[] = [];
  const seen = new Set<string>();

  const pushThreat = (raw: Position) => {
    const auth = toAuthoritativePosition(boardType, raw);
    if (!auth) return;
    const key = `${auth.x},${auth.y},${Boolean(auth.isVerticalWall)},${auth.wallDirection || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    threats.push(auth);
  };

  if (piece.type === 'pawn') {
    const facing = piece.facing || (piece.color === 'white' ? 'north' : 'south');
    let fdx = 0;
    let fdy = 0;
    if (facing === 'north') fdy = 1;
    else if (facing === 'south') fdy = -1;
    else if (facing === 'east') fdx = 1;
    else if (facing === 'west') fdx = -1;

    const diagOffsets: [number, number][] =
      facing === 'north' || facing === 'south'
        ? [[-1, fdy], [1, fdy]]
        : [[fdx, -1], [fdx, 1]];

    for (const [cdx, cdy] of diagOffsets) {
      const cx = authPos.x + cdx;
      const cy = authPos.y + cdy;
      if (cx < 0 || cx >= size || cy < 0 || cy >= size) continue;
      pushThreat({ x: cx, y: cy, tier: getTileTier(boardType, cx, cy), isVerticalWall: false });
      if (isPyramidMode) {
        const vTiles = getVerticalCliffTiles(boardType).filter((vt) => vt.x === cx && vt.y === cy);
        for (const tw of vTiles) {
          pushThreat({
            x: tw.x,
            y: tw.y,
            tier: tw.tier,
            isVerticalWall: true,
            wallDirection: tw.wallDirection,
            wallTierStep: tw.wallTierStep,
          });
        }
      }
    }
    return threats;
  }

  if (piece.type === 'trebuchet') {
    if (isSurfaceBound && authPos.isVerticalWall) return threats;
    const trebProfile = getTrebuchetProfile(piece);
    for (let dx = -trebProfile.repositionRange; dx <= trebProfile.repositionRange; dx++) {
      for (let dy = -trebProfile.repositionRange; dy <= trebProfile.repositionRange; dy++) {
        if (dx === 0 && dy === 0) continue;
        const tx = authPos.x + dx;
        const ty = authPos.y + dy;
        if (tx < 0 || tx >= size || ty < 0 || ty >= size) continue;
        pushThreat({ x: tx, y: ty, tier: getTileTier(boardType, tx, ty), isVerticalWall: false });
      }
    }
    return threats;
  }

  // All other pieces (Queen, Rook, Bishop, Knight, King, Vanguard, Gargoyle, Ascendant, Apex):
  // Query authoritative getRawMovesForPiece (which enforces 1-tile summit restriction for non-Knights
  // and full jump mobility for Knights) and filter to moves that have capture permission.
  const rawMoves = getRawMovesForPiece(piece, allPieces, boardType, latestExecutedMove, playStyle);
  for (let i = 0; i < rawMoves.length; i++) {
    const m = rawMoves[i];
    if (m.isCastling || m.isRookExchange || m.isBombard) continue;
    if (isSurfaceBound && Boolean(authPos.isVerticalWall) !== Boolean(m.to.isVerticalWall)) {
      continue;
    }
    pushThreat(m.to);
  }
  return threats;
}
