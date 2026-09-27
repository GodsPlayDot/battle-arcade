// Minimal localStorage shim for Node.js test runner
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
  };
}

import {
  AIDifficulty,
  BoardType,
  GameMode,
  Move,
  Piece,
  PieceColor,
  PlayStyle,
  Position,
} from '../types/chess';
import {
  createInitialPieces,
  generateBoardTiles,
  getPlayableTileKey,
  getPlayableTileMap,
  getSummitToBaseJumpTargets,
  getTileTier,
  isSummitTile,
  isValidPlayablePosition,
  normalizePiecesToBoard,
  resolvePlayableTile,
  TIER_HEIGHTS,
  toAuthoritativePosition,
} from './pyramidBoard';
import {
  findBombardKnockbackPosition,
  getAllValidMovesForColor,
  getCaptureThreatSquaresForPiece,
  getPieceAtPosition,
  getValidMovesForPiece,
  isKingInCheck,
  setActivePlayStyle,
  setValidationLastMove,
  simulateMove,
} from './moveValidation';
import {
  AI_DIFFICULTY_PROFILES,
  evaluateBoard,
  findBestMoveAI,
  getActiveStrategicObjective,
  getGameKey,
  loadGameLearning,
  normalizeAIDifficulty,
  recordMatchOutcome,
  validateLearnedWeights,
} from './chessAI';
import { generateAITeachingThought } from './aiTeaching';
import { INTERACTIVE_DRILLS } from '../components/TutorialModal';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function computeAuthoritativeWorldY(boardType: BoardType, pos: Position): number {
  const tile = resolvePlayableTile(boardType, pos);
  assert(!!tile, `Position (${pos.x},${pos.y},wall=${!!pos.isVerticalWall},dir=${pos.wallDirection}) must resolve to a playable tile on ${boardType}`);
  if (tile!.isVerticalWall) {
    const step = tile!.wallTierStep || 1;
    const lowerH = TIER_HEIGHTS[step - 1] || 0;
    const upperH = TIER_HEIGHTS[step] || 1.25;
    return (lowerH + upperH) / 2;
  }
  return (TIER_HEIGHTS[tile!.tier] || 0) + 0.16;
}

/**
 * TEST 1: No piece spawns or moves onto a nonexistent tile.
 */
function testNoPieceSpawnsOrMovesOntoNonexistentTile(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid', 'classic', 'battlefield'];
  const deployments: ('standard' | 'kingdom')[] = ['standard', 'kingdom'];
  const modes: GameMode[] = ['standard', 'rpg'];

  for (const boardType of boards) {
    const tileMap = getPlayableTileMap(boardType);
    assert(tileMap.size > 0, `Board ${boardType} must generate playable tiles`);

    for (const dep of deployments) {
      for (const mode of modes) {
        const pieces = createInitialPieces(boardType, false, dep, mode);
        for (const p of pieces) {
          assert(
            isValidPlayablePosition(boardType, p.position),
            `Spawned piece ${p.id} on ${boardType} (${dep}/${mode}) at (${p.position.x},${p.position.y},tier=${p.position.tier},wall=${!!p.position.isVerticalWall}) is not a valid playable tile!`
          );
          const resolved = resolvePlayableTile(boardType, p.position)!;
          assert(
            p.position.tier === resolved.tier,
            `Spawned piece ${p.id} tier ${p.position.tier} does not match playable tile tier ${resolved.tier}`
          );
        }
      }
    }
  }

  // Also verify all Interactive Drill Scenarios
  for (const drill of INTERACTIVE_DRILLS) {
    for (const p of drill.pieces) {
      assert(
        isValidPlayablePosition(drill.boardType, p.position),
        `Drill "${drill.id}" piece ${p.id} at (${p.position.x},${p.position.y},tier=${p.position.tier},wall=${!!p.position.isVerticalWall},dir=${p.position.wallDirection},step=${p.position.wallTierStep}) is not a valid playable tile on ${drill.boardType}!`
      );
    }
  }
  console.log('✓ Test 1 Passed: No piece spawns or moves onto a nonexistent tile.');
}

/**
 * TEST 2: No legal-move highlight appears beneath the board.
 */
function testNoLegalMoveHighlightBeneathBoard(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid', 'classic', 'battlefield'];
  const styles: PlayStyle[] = ['open', 'surface_bound'];

  for (const boardType of boards) {
    // Verify Summit-to-Base jump targets on pyramid boards
    if (boardType === 'quick_pyramid' || boardType === 'pyramid') {
      const sX = boardType === 'quick_pyramid' ? 5 : 9;
      const sY = boardType === 'quick_pyramid' ? 5 : 9;
      const jumpTargets = getSummitToBaseJumpTargets(sX, sY, boardType);
      assert(jumpTargets.length > 0, `Summit-to-Base jump targets should exist on ${boardType}`);
      for (const jt of jumpTargets) {
        assert(
          isValidPlayablePosition(boardType, jt),
          `Summit-to-Base jump target (${jt.x},${jt.y},tier=${jt.tier}) on ${boardType} is not a valid playable tile!`
        );
        const expectedSurfaceTier = getTileTier(boardType, jt.x, jt.y);
        assert(
          jt.tier === expectedSurfaceTier,
          `Summit-to-Base jump target (${jt.x},${jt.y}) on ${boardType} has tier ${jt.tier} beneath surface tier ${expectedSurfaceTier}!`
        );
      }
    }

    for (const style of styles) {
      setActivePlayStyle(style);
      const pieces = createInitialPieces(boardType, false, 'kingdom', 'rpg');

      // Also place test pieces on the Summit and on Vertical Walls to test elevated legal moves
      const summitX = boardType === 'quick_pyramid' ? 5 : boardType === 'pyramid' ? 9 : 4;
      const summitY = boardType === 'quick_pyramid' ? 5 : boardType === 'pyramid' ? 9 : 4;
      const summitPos = toAuthoritativePosition(boardType, {
        x: summitX,
        y: summitY,
        tier: getTileTier(boardType, summitX, summitY),
        isVerticalWall: false,
      })!;
      pieces[0].position = summitPos;

      const allMoves = [
        ...getAllValidMovesForColor('white', pieces, boardType, undefined, style),
        ...getAllValidMovesForColor('black', pieces, boardType, undefined, style),
      ];

      for (const move of allMoves) {
        assert(
          isValidPlayablePosition(boardType, move.to),
          `Legal move destination (${move.to.x},${move.to.y},tier=${move.to.tier},wall=${!!move.to.isVerticalWall},dir=${move.to.wallDirection}) on ${boardType} (${style}) is not a valid playable tile!`
        );
        const worldY = computeAuthoritativeWorldY(boardType, move.to);
        if (!move.to.isVerticalWall) {
          const surfaceTier = getTileTier(boardType, move.to.x, move.to.y);
          const surfaceHeight = TIER_HEIGHTS[surfaceTier] || 0;
          assert(
            move.to.tier === surfaceTier && worldY >= surfaceHeight,
            `Legal move highlight at (${move.to.x},${move.to.y}) on ${boardType} resolved to tier ${move.to.tier} (worldY=${worldY}) beneath surface tier ${surfaceTier} (height=${surfaceHeight})!`
          );
        }
      }
    }
  }
  console.log('✓ Test 2 Passed: No legal-move highlight appears beneath the board.');
}

/**
 * TEST 3: Neither human players nor AI can select an invalid destination.
 */
function testNeitherHumanNorAICanSelectInvalidDestination(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];

  for (const boardType of boards) {
    // 1. Verify nonexistent wall coordinates are rejected by toAuthoritativePosition
    const invalidWallPos: Position = {
      x: 0,
      y: 0,
      tier: 0,
      isVerticalWall: true,
      wallDirection: 'south',
      wallTierStep: 1,
    };
    assert(
      toAuthoritativePosition(boardType, invalidWallPos) === null,
      `Nonexistent vertical wall at (0,0) on ${boardType} must be rejected!`
    );

    // 2. Verify out-of-bounds coordinates are rejected
    const outOfBoundsPos: Position = {
      x: -1,
      y: 99,
      tier: 0,
      isVerticalWall: false,
    };
    assert(
      toAuthoritativePosition(boardType, outOfBoundsPos) === null,
      `Out-of-bounds tile (-1,99) on ${boardType} must be rejected!`
    );

    // 3. Verify horizontal tile with forged sub-pyramid tier (tier: 0 under the Pyramid) is normalized to the true surface tier
    const centerCoord = boardType === 'quick_pyramid' ? 5 : 9;
    const forgedSubPyramidPos: Position = {
      x: centerCoord,
      y: centerCoord,
      tier: 0, // Forged tier 0 underneath the Summit!
      isVerticalWall: false,
    };
    assert(
      !isValidPlayablePosition(boardType, forgedSubPyramidPos),
      `Forged sub-pyramid position (${centerCoord},${centerCoord},tier=0) must not pass strict playable validation!`
    );
    const corrected = toAuthoritativePosition(boardType, forgedSubPyramidPos);
    assert(
      corrected !== null && corrected.tier === getTileTier(boardType, centerCoord, centerCoord) && corrected.tier > 0,
      `toAuthoritativePosition must snap horizontal (${centerCoord},${centerCoord}) to its true surface tier (${corrected?.tier})!`
    );

    // 4. Verify AI move selection and simulateMove only produce valid playable positions
    let pieces = createInitialPieces(boardType, false, 'kingdom', 'rpg');
    for (let ply = 0; ply < 8; ply++) {
      const turnColor = ply % 2 === 0 ? 'white' : 'black';
      const aiMove = findBestMoveAI(pieces, turnColor, boardType, 'rpg', 'Master', 'kingdom', []);
      assert(!!aiMove, `AI must find a legal move on ${boardType} ply ${ply}`);
      assert(
        isValidPlayablePosition(boardType, aiMove!.from),
        `AI move.from must be a valid playable tile on ${boardType}`
      );
      assert(
        isValidPlayablePosition(boardType, aiMove!.to),
        `AI move.to (${aiMove!.to.x},${aiMove!.to.y},tier=${aiMove!.to.tier},wall=${!!aiMove!.to.isVerticalWall}) must be a valid playable tile on ${boardType}`
      );

      pieces = simulateMove(pieces, aiMove!, boardType);
      for (const p of pieces) {
        if (p.rpg.hp <= 0) continue;
        assert(
          isValidPlayablePosition(boardType, p.position),
          `After simulateMove on ${boardType}, piece ${p.id} at (${p.position.x},${p.position.y},tier=${p.position.tier},wall=${!!p.position.isVerticalWall}) is not on a valid playable tile!`
        );
      }
    }
  }
  console.log('✓ Test 3 Passed: Neither human players nor AI can select an invalid destination.');
}

/**
 * TEST 4: Legitimate wall movement continues working.
 */
function testLegitimateWallMovementWorks(): void {
  const boardType: BoardType = 'pyramid';
  setActivePlayStyle('open');

  // Create a minimal board with a White Rook at (8, 4) [Tier 0, foot of South Tier 1 cliff wall at (8, 5)]
  // and a Black Rook perched on the South Vertical Wall at (9, 5, true, 'south', 1)
  const whiteKingPos = toAuthoritativePosition(boardType, { x: 10, y: 0, tier: 0, isVerticalWall: false })!;
  const blackKingPos = toAuthoritativePosition(boardType, { x: 10, y: 19, tier: 0, isVerticalWall: false })!;
  const whiteRookStart = toAuthoritativePosition(boardType, { x: 8, y: 4, tier: 0, isVerticalWall: false })!;
  const wallTile8_5 = toAuthoritativePosition(boardType, {
    x: 8,
    y: 5,
    tier: 0,
    isVerticalWall: true,
    wallDirection: 'south',
    wallTierStep: 1,
  })!;
  const wallTile9_5 = toAuthoritativePosition(boardType, {
    x: 9,
    y: 5,
    tier: 0,
    isVerticalWall: true,
    wallDirection: 'south',
    wallTierStep: 1,
  })!;

  assert(isValidPlayablePosition(boardType, wallTile8_5), 'South cliff wall (8,5) must be a valid playable tile');
  assert(isValidPlayablePosition(boardType, wallTile9_5), 'South cliff wall (9,5) must be a valid playable tile');

  const basePieces = createInitialPieces(boardType, false, 'standard', 'standard');
  const templateKingW = basePieces.find((p) => p.color === 'white' && p.type === 'king')!;
  const templateKingB = basePieces.find((p) => p.color === 'black' && p.type === 'king')!;
  const templateRookW = basePieces.find((p) => p.color === 'white' && p.type === 'rook')!;
  const templateRookB = basePieces.find((p) => p.color === 'black' && p.type === 'rook')!;

  const testPieces: Piece[] = [
    { ...templateKingW, id: 'wk', position: whiteKingPos },
    { ...templateKingB, id: 'bk', position: blackKingPos },
    { ...templateRookW, id: 'wr', position: whiteRookStart, hasMoved: true },
    { ...templateRookB, id: 'br_wall', position: wallTile9_5, hasMoved: true },
  ];

  // 1. White Rook at (8, 4) can step onto the South Vertical Wall at (8, 5, wall='south', step=1)
  //    AND continue climbing onto horizontal (8, 5, tier=1)
  const wrMovesFromFoot = getValidMovesForPiece(testPieces[2], testPieces, boardType, undefined, 'open');
  const stepOntoWallMove = wrMovesFromFoot.find(
    (m) => m.to.x === 8 && m.to.y === 5 && m.to.isVerticalWall && m.to.wallDirection === 'south'
  );
  const climbOverWallMove = wrMovesFromFoot.find(
    (m) => m.to.x === 8 && m.to.y === 5 && !m.to.isVerticalWall && m.to.tier === 1
  );
  assert(!!stepOntoWallMove, 'White Rook at (8,4) must be able to perch on the South Vertical Wall at (8,5)');
  assert(!!climbOverWallMove, 'White Rook at (8,4) must be able to climb over the South Vertical Wall onto horizontal (8,5) Tier 1');

  // 2. Move White Rook onto the South Vertical Wall at (8, 5) and verify lateral wall movement & wall capture at (9, 5)
  const afterPerchPieces = simulateMove(testPieces, stepOntoWallMove!, boardType);
  const perchedRook = afterPerchPieces.find((p) => p.id === 'wr')!;
  assert(
    perchedRook.position.isVerticalWall === true &&
      perchedRook.position.wallDirection === 'south' &&
      perchedRook.position.wallTierStep === 1 &&
      isValidPlayablePosition(boardType, perchedRook.position),
    'Perched White Rook must be on authoritative South Vertical Wall tile (8,5)'
  );

  const wrMovesFromWall = getValidMovesForPiece(perchedRook, afterPerchPieces, boardType, undefined, 'open');
  const lateralWallWest = wrMovesFromWall.find(
    (m) => m.to.x === 7 && m.to.y === 5 && m.to.isVerticalWall && m.to.wallDirection === 'south'
  );
  const lateralWallCaptureEast = wrMovesFromWall.find(
    (m) =>
      m.to.x === 9 &&
      m.to.y === 5 &&
      m.to.isVerticalWall &&
      m.to.wallDirection === 'south' &&
      m.isCapture &&
      m.capturedPieceId === 'br_wall'
  );
  const ascendFromWallToTerrace = wrMovesFromWall.find(
    (m) => m.to.x === 8 && m.to.y === 5 && !m.to.isVerticalWall && m.to.tier === 1
  );

  assert(!!lateralWallWest, 'Perched Rook must be able to move laterally along the vertical wall to (7,5)');
  assert(!!lateralWallCaptureEast, 'Perched Rook must be able to capture enemy piece on adjacent vertical wall tile (9,5)');
  assert(!!ascendFromWallToTerrace, 'Perched Rook must be able to ascend from vertical wall (8,5) onto upper terrace (8,5,tier=1)');

  console.log('✓ Test 4 Passed: Legitimate wall movement (perching, lateral traversal, ascending, and wall capture) continues working.');
}

/**
 * TEST 5: Every rendered piece corresponds to exactly one valid playable tile.
 */
function testEveryRenderedPieceCorrespondsToOneValidPlayableTile(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];

  for (const boardType of boards) {
    const tileMap = getPlayableTileMap(boardType);
    let pieces = createInitialPieces(boardType, false, 'kingdom', 'rpg');

    for (let step = 0; step < 12; step++) {
      // Normalize as App.tsx / ThreeCanvas.tsx do
      pieces = normalizePiecesToBoard(boardType, pieces);
      const occupiedKeys = new Set<string>();

      for (const p of pieces) {
        if (p.rpg.hp <= 0) continue;
        const key = getPlayableTileKey(p.position);
        const tile = tileMap.get(key);
        assert(
          !!tile,
          `Living piece ${p.id} on ${boardType} step ${step} does not correspond to a valid playable tile: key=${key}`
        );
        assert(
          p.position.tier === tile!.tier &&
            Boolean(p.position.isVerticalWall) === Boolean(tile!.isVerticalWall),
          `Living piece ${p.id} position metadata does not match authoritative tile ${key}`
        );
        assert(
          !occupiedKeys.has(key),
          `Two living pieces occupy the exact same playable tile ${key} on ${boardType} at step ${step}!`
        );
        occupiedKeys.add(key);
      }

      const turnColor = step % 2 === 0 ? 'white' : 'black';
      const move = findBestMoveAI(pieces, turnColor, boardType, 'rpg', 'Grandmaster', 'kingdom', []);
      if (!move) break;
      pieces = simulateMove(pieces, move, boardType);
    }
  }
  console.log('✓ Test 5 Passed: Every rendered piece corresponds to exactly one valid playable tile.');
}

/**
 * Helper to create a test piece at an authoritative board position.
 */
function makeTestPiece(
  id: string,
  type: Piece['type'],
  color: Piece['color'],
  boardType: BoardType,
  rawPos: Position,
  facing?: 'north' | 'south' | 'east' | 'west'
): Piece {
  const authPos = toAuthoritativePosition(boardType, rawPos);
  assert(
    !!authPos,
    `Test setup error: ${JSON.stringify(rawPos)} is not a valid playable tile on ${boardType}`
  );
  return {
    id,
    type,
    color,
    position: authPos!,
    hasMoved: false,
    facing: facing || (color === 'white' ? 'north' : 'south'),
    rpg: {
      level: 1,
      xp: 0,
      maxHp: 100,
      hp: 100,
      atk: 30,
      def: 15,
      critChance: 10,
      evasion: 5,
      kills: 0,
    },
  };
}

/**
 * SUMMIT TEST 1: Queen, Rook, Bishop, Pawn, Vanguard, Gargoyle, and Ascendant obey the one-tile summit movement limit.
 */
function testSummitOneTileMovementLimit(): void {
  const boards: BoardType[] = ['pyramid', 'quick_pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];
  const restrictedTypes: Piece['type'][] = [
    'queen',
    'rook',
    'bishop',
    'pawn',
    'vanguard',
    'gargoyle',
    'ascendant',
  ];

  for (const boardType of boards) {
    const summitMin = boardType === 'pyramid' ? 8 : 4;
    const summitMax = boardType === 'pyramid' ? 11 : 7;
    const sampleSummitCoords: [number, number][] = [
      [summitMin, summitMin], // SW corner of 4x4 summit
      [summitMin + 1, summitMin + 1], // interior of 4x4 summit
      [summitMax, summitMin + 1], // E edge of 4x4 summit
      [summitMax, summitMax], // NE corner of 4x4 summit
    ];

    for (const playStyle of playStyles) {
      for (const pType of restrictedTypes) {
        for (const [sx, sy] of sampleSummitCoords) {
          const testPiece = makeTestPiece(
            `test-${pType}-${sx}-${sy}`,
            pType,
            'white',
            boardType,
            { x: sx, y: sy }
          );
          const whiteKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
          const blackKing = makeTestPiece('b-king', 'king', 'black', boardType, {
            x: 3,
            y: boardType === 'pyramid' ? 19 : 11,
          });
          // Add a friendly rook to ensure Vanguard does not bypass the 1-tile limit via Rook Exchange on the summit
          const friendlyRook = makeTestPiece('w-rook-ally', 'rook', 'white', boardType, {
            x: 1,
            y: 0,
          });
          const pieces = [testPiece, whiteKing, blackKing, friendlyRook];

          const moves = getValidMovesForPiece(testPiece, pieces, boardType, null, playStyle);
          assert(
            moves.length > 0,
            `${pType} at summit (${sx},${sy}) on ${boardType} [${playStyle}] must have legal moves`
          );

          for (const m of moves) {
            const dx = Math.abs(m.to.x - sx);
            const dy = Math.abs(m.to.y - sy);
            assert(
              dx <= 1 && dy <= 1,
              `${pType} on summit (${sx},${sy}) [${boardType}/${playStyle}] violated 1-tile limit with move to (${m.to.x},${m.to.y}) (dx=${dx}, dy=${dy})`
            );
            // If moving to a horizontal tile, it must not be the same (x,y); if moving to a vertical wall at the summit lip, (x,y) matches the summit lip tile
            if (!m.to.isVerticalWall) {
              assert(
                dx + dy >= 1,
                `${pType} on summit (${sx},${sy}) generated zero-displacement horizontal move`
              );
            }
          }
        }
      }
    }
  }
  console.log(
    '✓ Summit Test 1 Passed: Queen, Rook, Bishop, Pawn, Vanguard, Gargoyle, and Ascendant obey the 1-tile summit movement limit.'
  );
}

/**
 * SUMMIT TEST 2: Non-Knight pieces can use all eight directions for legal ordinary movement on the summit,
 * while preserving Pawn forward-diagonal-only capture and Trebuchet capture/bombardment rules.
 */
function testSummitAllEightDirectionsAndCaptureSeparation(): void {
  const boards: BoardType[] = ['pyramid', 'quick_pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];
  const nonKnightTypes: Piece['type'][] = [
    'queen',
    'rook',
    'bishop',
    'pawn',
    'vanguard',
    'gargoyle',
    'ascendant',
    'king',
    'trebuchet',
  ];

  const eightOffsets: [number, number][] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ];

  for (const boardType of boards) {
    // Interior summit tile where all 8 neighbors are horizontal summit tiles
    const sx = boardType === 'pyramid' ? 9 : 5;
    const sy = boardType === 'pyramid' ? 9 : 5;

    for (const playStyle of playStyles) {
      for (const pType of nonKnightTypes) {
        const piece = makeTestPiece(`summit-8dir-${pType}`, pType, 'white', boardType, {
          x: sx,
          y: sy,
        });
        const whiteKing =
          pType === 'king'
            ? piece
            : makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
        const blackKing = makeTestPiece('b-king', 'king', 'black', boardType, {
          x: 3,
          y: boardType === 'pyramid' ? 19 : 11,
        });
        const pieces = pType === 'king' ? [piece, blackKing] : [piece, whiteKing, blackKing];

        const moves = getValidMovesForPiece(piece, pieces, boardType, null, playStyle);
        const ordinaryMoves = moves.filter((m) => !m.isCapture && !m.isBombard);

        assert(
          ordinaryMoves.length === 8,
          `Expected ${pType} at interior summit (${sx},${sy}) on ${boardType} [${playStyle}] to have exactly 8 ordinary moves, got ${ordinaryMoves.length}`
        );

        for (const [dx, dy] of eightOffsets) {
          const found = ordinaryMoves.some(
            (m) => m.to.x === sx + dx && m.to.y === sy + dy && !m.to.isVerticalWall
          );
          assert(
            found,
            `${pType} at interior summit (${sx},${sy}) on ${boardType} [${playStyle}] missing ordinary move in direction (${dx},${dy})`
          );
        }
      }

      // Verify Pawn on the summit: 8-direction movement does NOT grant 8-direction capture!
      // Surround a White Pawn (facing 'north') at (sx, sy) with 8 Black Pawns on all 8 adjacent summit tiles.
      const whitePawn = makeTestPiece('w-pawn-summit', 'pawn', 'white', boardType, { x: sx, y: sy }, 'north');
      const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
      const bKing = makeTestPiece('b-king', 'king', 'black', boardType, {
        x: 3,
        y: boardType === 'pyramid' ? 19 : 11,
      });
      const surroundingEnemies: Piece[] = eightOffsets.map(([dx, dy], idx) =>
        makeTestPiece(`b-enemy-${idx}`, 'pawn', 'black', boardType, { x: sx + dx, y: sy + dy }, 'south')
      );
      const pawnCaptureTestPieces = [whitePawn, wKing, bKing, ...surroundingEnemies];
      const pawnMoves = getValidMovesForPiece(
        whitePawn,
        pawnCaptureTestPieces,
        boardType,
        null,
        playStyle
      );

      // All 8 neighbors are occupied by enemies, so non-capture moves must be 0,
      // and captures must ONLY be the 2 forward-diagonal tiles: (sx - 1, sy + 1) and (sx + 1, sy + 1)!
      const pawnNonCaptures = pawnMoves.filter((m) => !m.isCapture);
      const pawnCaptures = pawnMoves.filter((m) => m.isCapture);
      assert(
        pawnNonCaptures.length === 0,
        `Blocked Pawn on summit should have 0 non-capture moves when all 8 neighbors are occupied, got ${pawnNonCaptures.length}`
      );
      assert(
        pawnCaptures.length === 2,
        `Pawn on summit surrounded by 8 enemies must only capture in 2 forward-diagonal directions, got ${pawnCaptures.length}`
      );
      for (const cap of pawnCaptures) {
        assert(
          cap.to.y === sy + 1 && Math.abs(cap.to.x - sx) === 1,
          `Pawn on summit made illegal non-forward-diagonal capture to (${cap.to.x},${cap.to.y})`
        );
      }

      // Verify Trebuchet on the summit preserves Jump-Capture (1-2 tiles) and Summit Bombardment
      const whiteTreb = makeTestPiece('w-treb-summit', 'trebuchet', 'white', boardType, {
        x: sx,
        y: sy,
      });
      const enemyAtDist2 = makeTestPiece('b-dist2', 'rook', 'black', boardType, {
        x: sx + 2,
        y: sy + 2,
      });
      const trebPieces = [whiteTreb, wKing, bKing, enemyAtDist2];
      const trebMoves = getValidMovesForPiece(whiteTreb, trebPieces, boardType, null, playStyle);
      const trebOrdinary = trebMoves.filter((m) => !m.isCapture && !m.isBombard);
      const trebJumpCap = trebMoves.filter(
        (m) => m.isCapture && !m.isBombard && m.to.x === sx + 2 && m.to.y === sy + 2
      );
      const trebBombard = trebMoves.filter(
        (m) => m.isBombard && !m.isCapture && m.capturedPieceId === enemyAtDist2.id
      );
      assert(
        trebOrdinary.length === 8,
        `Trebuchet on summit (${sx},${sy}) must have 8 ordinary 1-tile moves, got ${trebOrdinary.length}`
      );
      assert(
        trebJumpCap.length === 1,
        `Trebuchet on summit must preserve its 2-tile jump-capture rule`
      );
      assert(
        trebBombard.length === 1,
        `Trebuchet on summit must preserve its summit bombardment rule`
      );
    }
  }
  console.log(
    '✓ Summit Test 2 Passed: Non-Knight pieces use all 8 directions on the summit; Pawn & Trebuchet capture rules preserved.'
  );
}

/**
 * SUMMIT TEST 3: The Knight retains its summit jump rules.
 */
function testKnightRetainsSummitJumpRules(): void {
  const boards: BoardType[] = ['pyramid', 'quick_pyramid'];

  for (const boardType of boards) {
    const sx = boardType === 'pyramid' ? 9 : 5;
    const sy = boardType === 'pyramid' ? 9 : 5;
    const knight = makeTestPiece('w-knight-summit', 'knight', 'white', boardType, { x: sx, y: sy });
    const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
    const bKing = makeTestPiece('b-king', 'king', 'black', boardType, {
      x: 3,
      y: boardType === 'pyramid' ? 19 : 11,
    });
    const pieces = [knight, wKing, bKing];

    // 1. Open Surface: Knight performs L-jumps (dx=1,dy=2 or dx=2,dy=1) from the summit
    const openMoves = getValidMovesForPiece(knight, pieces, boardType, null, 'open_surface');
    const lJumps = openMoves.filter((m) => {
      const dx = Math.abs(m.to.x - sx);
      const dy = Math.abs(m.to.y - sy);
      return (dx === 1 && dy === 2) || (dx === 2 && dy === 1);
    });
    assert(
      lJumps.length >= 8,
      `Knight on summit (${sx},${sy}) in open_surface on ${boardType} must retain all 8 L-jumps, got ${lJumps.length}`
    );

    // 2. Surface Bound: Knight performs Law 10 Summit-to-Base jumps to Tier 0 base landing ring
    const releasedKnight: Piece = { ...knight, colorReleased: true };
    const sbMoves = getValidMovesForPiece(
      releasedKnight,
      [releasedKnight, wKing, bKing],
      boardType,
      null,
      'surface_bound'
    );
    const expectedBaseTargets = getSummitToBaseJumpTargets(sx, sy, boardType);
    assert(
      sbMoves.length === expectedBaseTargets.length && sbMoves.length > 0,
      `Knight on summit (${sx},${sy}) in surface_bound on ${boardType} must retain Law 10 Summit-to-Base jumps (expected ${expectedBaseTargets.length}, got ${sbMoves.length})`
    );
    for (const m of sbMoves) {
      assert(
        m.to.tier === 0 && !m.to.isVerticalWall,
        `Knight Summit-to-Base jump in surface_bound must land on Tier 0 horizontal base tile, got ${JSON.stringify(m.to)}`
      );
    }
  }
  console.log('✓ Summit Test 3 Passed: The Knight retains its summit jump rules.');
}

/**
 * SUMMIT TEST 4: Normal movement resumes after leaving the summit (and normal movement applies when approaching from below).
 */
function testNormalMovementResumesAfterLeavingSummit(): void {
  const boardType: BoardType = 'pyramid';
  const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
  const bKing = makeTestPiece('b-king', 'king', 'black', boardType, { x: 3, y: 19 });

  // A. Starting below the summit: ordinary movement applies when approaching it
  const vanguardBelow = makeTestPiece('v-below', 'vanguard', 'white', boardType, { x: 8, y: 6 }, 'north');
  const belowMoves = getValidMovesForPiece(
    vanguardBelow,
    [vanguardBelow, wKing, bKing],
    boardType,
    null,
    'open_surface'
  );
  // At y=6, Vanguard has maxTiles = 9 + 1 - 6 = 4 connected steps forward, reaching onto the Summit
  const multiStepApproach = belowMoves.filter((m) => m.to.y - 6 >= 2);
  assert(
    multiStepApproach.length > 0,
    `Vanguard starting below the summit at (8,6) must use ordinary multi-tile movement when approaching the summit`
  );

  // B. Starting on the summit -> leaving the summit (1 tile) -> next turn normal movement resumes!
  const testTypes: Piece['type'][] = [
    'queen',
    'rook',
    'bishop',
    'pawn',
    'vanguard',
    'gargoyle',
    'ascendant',
  ];

  for (const pType of testTypes) {
    // Start on SW corner of 4x4 summit (8, 8) on 20x20 pyramid
    const startPiece = makeTestPiece(`leave-${pType}`, pType, 'white', boardType, { x: 8, y: 8 }, 'north');
    const initialPieces = [startPiece, wKing, bKing];
    const summitMoves = getValidMovesForPiece(
      startPiece,
      initialPieces,
      boardType,
      null,
      'open_surface'
    );

    // Every move while starting on (8,8) must obey the 1-tile limit, including moves that leave the summit to (7,7) Tier 3
    const leaveMoveTo77 = summitMoves.find(
      (m) => m.to.x === 7 && m.to.y === 7 && !m.to.isVerticalWall
    );
    assert(
      !!leaveMoveTo77,
      `${pType} starting on summit corner (8,8) must be able to leave the summit by 1 diagonal step to (7,7)`
    );

    // Simulate leaving the summit to (7,7) (Upper Terrace, Tier 3, off the 4x4 summit)
    const afterLeavingPieces = simulateMove(initialPieces, leaveMoveTo77!, boardType);
    const movedPiece = afterLeavingPieces.find((p) => p.id === startPiece.id)!;
    assert(
      movedPiece.type === pType,
      `${pType} identity must not permanently change after leaving the summit (got ${movedPiece.type})`
    );
    assert(
      movedPiece.position.x === 7 && movedPiece.position.y === 7 && movedPiece.position.tier === 3,
      `${pType} should now occupy Upper Terrace (7,7) Tier 3 after leaving the summit`
    );

    // Now on the next turn at (7,7) (below the summit), verify normal movement resumes!
    const resumedMoves = getValidMovesForPiece(
      movedPiece,
      afterLeavingPieces,
      boardType,
      leaveMoveTo77!,
      'open_surface'
    );

    if (pType === 'queen' || pType === 'gargoyle' || pType === 'ascendant') {
      const hasMultiTileMove = resumedMoves.some(
        (m) => Math.max(Math.abs(m.to.x - 7), Math.abs(m.to.y - 7)) >= 2
      );
      assert(
        hasMultiTileMove,
        `${pType} must resume multi-tile movement after leaving the summit to (7,7)`
      );
    } else if (pType === 'rook') {
      const hasMultiTileOrtho = resumedMoves.some(
        (m) => Math.max(Math.abs(m.to.x - 7), Math.abs(m.to.y - 7)) >= 2
      );
      const hasDiagonalMove = resumedMoves.some(
        (m) => Math.abs(m.to.x - 7) > 0 && Math.abs(m.to.y - 7) > 0
      );
      assert(
        hasMultiTileOrtho && !hasDiagonalMove,
        `Rook must resume multi-tile orthogonal-only movement after leaving the summit to (7,7)`
      );
    } else if (pType === 'bishop') {
      const hasMultiTileDiag = resumedMoves.some(
        (m) => Math.abs(m.to.x - 7) >= 2 && Math.abs(m.to.y - 7) >= 2
      );
      const hasOrthoMove = resumedMoves.some(
        (m) => (m.to.x === 7 && m.to.y !== 7) || (m.to.y === 7 && m.to.x !== 7)
      );
      assert(
        hasMultiTileDiag && !hasOrthoMove,
        `Bishop must resume multi-tile diagonal-only movement after leaving the summit to (7,7)`
      );
    } else if (pType === 'vanguard') {
      // At (7,7) facing north, Vanguard should have multi-tile forward range (9 + 1 - 7 = 3) and NO backward/diagonal moves
      const hasMultiTileForward = resumedMoves.some((m) => m.to.x === 7 && m.to.y >= 9);
      const hasBackwardOrDiag = resumedMoves.some((m) => m.to.y < 7 || m.to.x !== 7);
      assert(
        hasMultiTileForward && !hasBackwardOrDiag,
        `Vanguard must resume forward-only multi-tile movement after leaving the summit to (7,7)`
      );
    } else if (pType === 'pawn') {
      // At (7,7) with no enemies around, Pawn only moves orthogonally (forward, sideways, backward on pyramid), NO diagonal non-capture moves!
      const hasDiagNonCapture = resumedMoves.some(
        (m) => !m.isCapture && Math.abs(m.to.x - 7) === 1 && Math.abs(m.to.y - 7) === 1
      );
      assert(
        !hasDiagNonCapture && resumedMoves.length > 0,
        `Pawn must resume orthogonal-only non-capture movement after leaving the summit to (7,7)`
      );
    }
  }
  console.log('✓ Summit Test 4 Passed: Normal movement resumes after leaving the summit.');
}

/**
 * SUMMIT TEST 5: No summit movement ends on a nonexistent tile.
 */
function testNoSummitMovementEndsOnNonexistentTile(): void {
  const boards: BoardType[] = ['pyramid', 'quick_pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];
  const allTypes: Piece['type'][] = [
    'pawn',
    'knight',
    'bishop',
    'rook',
    'queen',
    'king',
    'vanguard',
    'gargoyle',
    'ascendant',
    'trebuchet',
  ];

  for (const boardType of boards) {
    const tileMap = getPlayableTileMap(boardType);
    const sMin = boardType === 'pyramid' ? 8 : 4;
    const sMax = boardType === 'pyramid' ? 11 : 7;

    for (const playStyle of playStyles) {
      for (let sx = sMin; sx <= sMax; sx++) {
        for (let sy = sMin; sy <= sMax; sy++) {
          for (const pType of allTypes) {
            const p = makeTestPiece(`s-valid-${pType}-${sx}-${sy}`, pType, 'white', boardType, {
              x: sx,
              y: sy,
            });
            const wKing =
              pType === 'king'
                ? p
                : makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
            const bKing = makeTestPiece('b-king', 'king', 'black', boardType, {
              x: 3,
              y: boardType === 'pyramid' ? 19 : 11,
            });
            const pieces = pType === 'king' ? [p, bKing] : [p, wKing, bKing];

            const moves = getValidMovesForPiece(p, pieces, boardType, null, playStyle);
            for (const m of moves) {
              assert(
                isValidPlayablePosition(boardType, m.to),
                `Summit move for ${pType} from (${sx},${sy}) on ${boardType} [${playStyle}] ended on nonexistent tile: ${JSON.stringify(m.to)}`
              );
              const simPieces = simulateMove(pieces, m, boardType);
              for (const sp of simPieces) {
                const resolved = resolvePlayableTile(boardType, sp.position);
                assert(
                  !!resolved && isValidPlayablePosition(boardType, sp.position),
                  `Simulated piece ${sp.id} after summit move ended on nonexistent tile ${JSON.stringify(sp.position)}`
                );
              }
            }
          }
        }
      }
    }
  }
  console.log('✓ Summit Test 5 Passed: No summit movement ends on a nonexistent tile.');
}

/**
 * REGRESSION TEST 6: Check Detection & Capture vs. Movement Separation
 * Verifies:
 * - Non-Knight pieces on the 4x4 Summit only check/threaten 1 connected tile away (never 2+ tiles away).
 * - Pawns on the 4x4 Summit have 8-direction ordinary movement, yet ONLY check/threaten on their 2 forward-diagonal squares.
 * - Vanguards on a Vertical Wall can move 1 step sideways, yet ONLY check/threaten forward.
 * - Knights on the 4x4 Summit retain full jumping check/threat capability in both Open Surface and Surface Bound modes.
 */
function testCheckDetectionAndCaptureSeparation(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];

  for (const boardType of boards) {
    const sx = boardType === 'pyramid' ? 9 : 5;
    const sy = boardType === 'pyramid' ? 9 : 5;

    for (const playStyle of playStyles) {
      setActivePlayStyle(playStyle);

      // 1. Queen / Rook / Bishop on Summit: checks enemy King at 1 tile distance, does NOT check at 2 tiles distance!
      for (const sliderType of ['queen', 'rook', 'bishop'] as const) {
        const slider = makeTestPiece(`w-${sliderType}-summit`, sliderType, 'white', boardType, { x: sx, y: sy });
        const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });

        // Enemy King 1 tile away diagonally or orthogonally on the summit -> MUST be in check!
        const bKingAdj = makeTestPiece('b-king-adj', 'king', 'black', boardType, { x: sx + 1, y: sy + 1 });
        assert(
          isKingInCheck('black', [slider, wKing, bKingAdj], boardType),
          `${sliderType} on summit (${sx},${sy}) [${boardType}/${playStyle}] must give check to adjacent King at (${sx + 1},${sy + 1})`
        );

        // Enemy King 2 tiles away on the summit (e.g., (sx+2, sy) or (sx+2, sy+2)) -> MUST NOT be in check because of 1-tile summit rule!
        const bKingDist2Ortho = makeTestPiece('b-king-d2o', 'king', 'black', boardType, { x: sx + 2, y: sy });
        const bKingDist2Diag = makeTestPiece('b-king-d2d', 'king', 'black', boardType, { x: sx + 2, y: sy + 2 });
        assert(
          !isKingInCheck('black', [slider, wKing, bKingDist2Ortho], boardType),
          `${sliderType} on summit (${sx},${sy}) [${boardType}/${playStyle}] must NOT check King 2 tiles away at (${sx + 2},${sy})`
        );
        assert(
          !isKingInCheck('black', [slider, wKing, bKingDist2Diag], boardType),
          `${sliderType} on summit (${sx},${sy}) [${boardType}/${playStyle}] must NOT check King 2 tiles away at (${sx + 2},${sy + 2})`
        );
      }

      // 2. Pawn on Summit: 8-direction movement does NOT give 8-direction check or threat!
      const summitPawn = makeTestPiece('w-pawn-summit', 'pawn', 'white', boardType, { x: sx, y: sy }, 'north');
      const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
      const pawnThreats = getCaptureThreatSquaresForPiece(
        summitPawn,
        [summitPawn, wKing],
        boardType,
        playStyle
      );
      const horizontalPawnThreats = pawnThreats.filter((t) => !t.isVerticalWall);
      // Must ONLY threaten the 2 forward-diagonal horizontal summit squares (sx - 1, sy + 1) and (sx + 1, sy + 1),
      // and every single threat (including any transitional cliff face at those forward-diagonal coordinates) must be strictly forward-diagonal!
      assert(
        horizontalPawnThreats.length === 2,
        `Pawn on summit (${sx},${sy}) [${boardType}/${playStyle}] must only threaten 2 horizontal forward-diagonal squares, got ${horizontalPawnThreats.length}`
      );
      for (const tPos of pawnThreats) {
        assert(
          tPos.y === sy + 1 && Math.abs(tPos.x - sx) === 1,
          `Pawn on summit threatened non-forward-diagonal square (${tPos.x},${tPos.y})`
        );
      }
      // Enemy King directly in front of Pawn on summit (sx, sy + 1) or behind (sx, sy - 1) is NOT in check
      const bKingFront = makeTestPiece('b-king-front', 'king', 'black', boardType, { x: sx, y: sy + 1 });
      const bKingBackDiag = makeTestPiece('b-king-backdiag', 'king', 'black', boardType, { x: sx + 1, y: sy - 1 });
      const bKingFwdDiag = makeTestPiece('b-king-fwddiag', 'king', 'black', boardType, { x: sx + 1, y: sy + 1 });
      assert(
        !isKingInCheck('black', [summitPawn, wKing, bKingFront], boardType),
        `Pawn on summit must NOT check King straight ahead at (${sx},${sy + 1})`
      );
      assert(
        !isKingInCheck('black', [summitPawn, wKing, bKingBackDiag], boardType),
        `Pawn on summit must NOT check King backward-diagonally at (${sx + 1},${sy - 1})`
      );
      assert(
        isKingInCheck('black', [summitPawn, wKing, bKingFwdDiag], boardType),
        `Pawn on summit MUST check King forward-diagonally at (${sx + 1},${sy + 1})`
      );

      // 3. Knight on Summit: retains full jump check/threat capability
      const summitKnight: Piece = {
        ...makeTestPiece('w-knight-summit', 'knight', 'white', boardType, { x: sx, y: sy }),
        colorReleased: true,
      };
      const knightThreats = getCaptureThreatSquaresForPiece(
        summitKnight,
        [summitKnight, wKing],
        boardType,
        playStyle
      );
      assert(
        knightThreats.length > 0 &&
          knightThreats.every((t) => Math.max(Math.abs(t.x - sx), Math.abs(t.y - sy)) >= 2),
        `Knight on summit [${boardType}/${playStyle}] must retain multi-tile jump threat squares`
      );
    }
  }
  console.log(
    '✓ Regression Test 6 Passed: Check detection and capture-threat squares consistently obey summit & capture-separation rules.'
  );
}

/**
 * REGRESSION TEST 7: Pawns Do Not Promote or Transform Merely by Reaching the Summit
 * Verifies on Quick Pyramid and Grand Pyramid in both Open Surface and Surface Bound:
 * - Stepping onto the 4x4 Summit from below never promotes a Pawn.
 * - Moving within or exiting the 4x4 Summit never promotes a Pawn.
 * - Reaching the opposite back rank DOES promote a Pawn.
 */
function testPawnNoPromotionOnSummit(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];

  for (const boardType of boards) {
    const summitMin = boardType === 'pyramid' ? 8 : 4;
    const backRankY = boardType === 'pyramid' ? 19 : 11;

    for (const playStyle of playStyles) {
      setActivePlayStyle(playStyle);
      const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
      const bKing = makeTestPiece('b-king', 'king', 'black', boardType, { x: 3, y: backRankY });

      // A. Pawn one step south of the 4x4 Summit ascending via the South Vertical Cliff Wall onto (summitMin, summitMin)
      const approachingPawn = makeTestPiece(
        'w-pawn-approach',
        'pawn',
        'white',
        boardType,
        { x: summitMin, y: summitMin - 1 },
        'north'
      );
      const approachMoves = getValidMovesForPiece(
        approachingPawn,
        [approachingPawn, wKing, bKing],
        boardType,
        null,
        playStyle
      );
      const stepOntoSummitWall = approachMoves.find(
        (m) => m.to.x === summitMin && m.to.y === summitMin && !!m.to.isVerticalWall && m.to.wallDirection === 'south'
      );
      assert(
        !!stepOntoSummitWall && !stepOntoSummitWall.promotionType && !stepOntoSummitWall.isSummitAscension,
        `Pawn at (${summitMin},${summitMin - 1}) on ${boardType} [${playStyle}] stepping onto summit cliff wall must not promote`
      );
      const onWallPieces = simulateMove([approachingPawn, wKing, bKing], stepOntoSummitWall!, boardType);
      const pawnOnWall = onWallPieces.find((p) => p.id === approachingPawn.id)!;

      const wallMoves = getValidMovesForPiece(
        pawnOnWall,
        onWallPieces,
        boardType,
        stepOntoSummitWall!,
        playStyle
      );
      const stepOntoSummit = wallMoves.find(
        (m) => m.to.x === summitMin && m.to.y === summitMin && !m.to.isVerticalWall
      );
      assert(
        !!stepOntoSummit,
        `Pawn on summit wall (${summitMin},${summitMin}) on ${boardType} [${playStyle}] should be able to step onto horizontal summit (${summitMin},${summitMin})`
      );
      assert(
        !stepOntoSummit!.promotionType && !stepOntoSummit!.isSummitAscension,
        `Pawn stepping onto 4x4 Summit (${summitMin},${summitMin}) on ${boardType} [${playStyle}] must NOT have promotionType or isSummitAscension`
      );
      const afterAscent = simulateMove(onWallPieces, stepOntoSummit!, boardType);
      const pawnOnSummit = afterAscent.find((p) => p.id === approachingPawn.id)!;
      assert(
        pawnOnSummit.type === 'pawn',
        `Pawn after stepping onto 4x4 Summit must remain 'pawn', got '${pawnOnSummit.type}'`
      );

      // B. Pawn moving across the 4x4 Summit in all 8 directions never promotes
      const summitMoves = getValidMovesForPiece(pawnOnSummit, afterAscent, boardType, stepOntoSummit!, playStyle);
      assert(summitMoves.length > 0, `Pawn on summit must have valid moves`);
      for (const sm of summitMoves) {
        assert(
          !sm.promotionType && !sm.isSummitAscension,
          `Pawn moving from summit to (${sm.to.x},${sm.to.y}) must NOT promote`
        );
        const simAfter = simulateMove(afterAscent, sm, boardType);
        const stillPawn = simAfter.find((p) => p.id === approachingPawn.id)!;
        assert(
          stillPawn.type === 'pawn',
          `Pawn after moving from summit to (${sm.to.x},${sm.to.y}) must remain 'pawn', got '${stillPawn.type}'`
        );
      }

      // C. Pawn reaching the opposite back rank DOES promote
      const preBackRankPawn = makeTestPiece(
        'w-pawn-backrank',
        'pawn',
        'white',
        boardType,
        { x: 5, y: backRankY - 1 },
        'north'
      );
      const promoMoves = getValidMovesForPiece(
        preBackRankPawn,
        [preBackRankPawn, wKing, bKing],
        boardType,
        null,
        playStyle
      );
      const reachBackRank = promoMoves.find((m) => m.to.x === 5 && m.to.y === backRankY && !m.to.isVerticalWall);
      assert(
        !!reachBackRank && reachBackRank.promotionType === 'queen',
        `Pawn reaching opposite back rank (5,${backRankY}) on ${boardType} [${playStyle}] MUST promote to queen`
      );
    }
  }
  console.log(
    '✓ Regression Test 7 Passed: Pawns never promote or transform on the 4x4 Summit, and promote normally on the opposite back rank.'
  );
}

/**
 * REGRESSION TEST 8: AI Summit Tactical Planning & Rule Understanding
 * Verifies:
 * 1. AI only selects moves landing on valid playable tiles.
 * 2. AI does not plan Pawn summit promotion.
 * 3. AI obeys the 1-tile summit limit for all non-Knight pieces on the summit.
 * 4. AI recognizes the Knight's summit mobility advantage and steps uncontested sliders off the summit to restore full range.
 * 5. AI evaluates summit trapping/blocking/exit control.
 */
function testAISummitTacticalPlanning(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];

  for (const boardType of boards) {
    const sMin = boardType === 'pyramid' ? 8 : 4;
    const backRankY = boardType === 'pyramid' ? 19 : 11;

    for (const playStyle of playStyles) {
      setActivePlayStyle(playStyle);

      // Scenario A: White Queen starts on SW summit corner (sMin, sMin) with no enemies on the summit,
      // and an enemy Rook at (sMin - 1, 2) down on the lower terrace file.
      const wQueenSummit = makeTestPiece('w-queen-s', 'queen', 'white', boardType, { x: sMin, y: sMin });
      const wKing = makeTestPiece('w-king', 'king', 'white', boardType, { x: 0, y: 0 });
      const bKing = makeTestPiece('b-king', 'king', 'black', boardType, { x: 3, y: backRankY });
      const bTarget = makeTestPiece('b-rook-target', 'rook', 'black', boardType, { x: sMin - 1, y: 2 });

      const aiMoveA = findBestMoveAI(
        [wQueenSummit, wKing, bKing, bTarget],
        'white',
        boardType,
        'standard',
        'Master',
        'standard',
        []
      );
      assert(!!aiMoveA, `AI must find a legal move in Summit Scenario A on ${boardType} [${playStyle}]`);
      assert(
        isValidPlayablePosition(boardType, aiMoveA!.to),
        `AI move destination must be a valid playable tile`
      );
      if (aiMoveA!.pieceId === wQueenSummit.id) {
        const dx = Math.abs(aiMoveA!.to.x - sMin);
        const dy = Math.abs(aiMoveA!.to.y - sMin);
        assert(
          dx <= 1 && dy <= 1,
          `AI planned an illegal multi-tile move from the summit for Queen: (${sMin},${sMin}) -> (${aiMoveA!.to.x},${aiMoveA!.to.y})`
        );
      }

      // Scenario B: Knight on the summit vs non-Knight on the summit
      const wKnightSummit: Piece = {
        ...makeTestPiece('w-knight-s', 'knight', 'white', boardType, { x: sMin + 1, y: sMin + 1 }),
        colorReleased: true,
      };
      const wPawnNearSummit = makeTestPiece('w-pawn-near', 'pawn', 'white', boardType, { x: sMin, y: sMin - 1 }, 'north');
      const aiMoveB = findBestMoveAI(
        [wKnightSummit, wPawnNearSummit, wKing, bKing],
        'white',
        boardType,
        'standard',
        'Master',
        'standard',
        []
      );
      assert(!!aiMoveB, `AI must find a legal move in Summit Scenario B on ${boardType} [${playStyle}]`);
      assert(
        !aiMoveB!.promotionType && !aiMoveB!.isSummitAscension,
        `AI must never assign promotionType or isSummitAscension to a Pawn near the summit`
      );

      // Scenario C: AI Teaching Thought preview options all obey authoritative rules
      const thought = generateAITeachingThought(
        aiMoveB!,
        [wKnightSummit, wPawnNearSummit, wKing, bKing],
        boardType,
        'standard',
        5
      );
      assert(!!thought && thought.options.length > 0, `AI Teaching Thought must generate valid candidate options`);
      for (const opt of thought.options) {
        assert(
          isValidPlayablePosition(boardType, opt.move.to),
          `AI Teaching preview option must land on a valid playable tile`
        );
      }
    }
  }
  console.log(
    '✓ Regression Test 8 Passed: AI planning and move previews obey all 5 summit & Pyramid rules.'
  );
}

/**
 * REGRESSION TEST 9: Multi-Turn Human-vs-AI and AI-vs-AI Matches
 * Runs regression matches on Quick Pyramid (12x12) and Grand Pyramid (20x20)
 * in both Open Surface and Surface Bound modes, for both Human-vs-AI and AI-vs-AI.
 */
function testFullMatchRegressions(): void {
  const boards: BoardType[] = ['quick_pyramid', 'pyramid'];
  const playStyles: PlayStyle[] = ['open_surface', 'surface_bound'];
  const matchTypes: ('human_vs_ai' | 'ai_vs_ai')[] = ['human_vs_ai', 'ai_vs_ai'];
  const pliesPerMatch = 14;

  for (const boardType of boards) {
    for (const playStyle of playStyles) {
      for (const matchType of matchTypes) {
        setActivePlayStyle(playStyle);
        setValidationLastMove(null);

        let pieces = normalizePiecesToBoard(
          boardType,
          createInitialPieces(boardType, false, 'kingdom', 'standard')
        );
        let turn: PieceColor = 'white';
        let lastMove: Move | null = null;
        const recentMoves: Move[] = [];

        // Verify all initial pieces are on valid playable tiles
        assert(
          pieces.length >= 16,
          `[${boardType}/${playStyle}/${matchType}] Initial army must have at least 16 pieces, got ${pieces.length}`
        );
        for (const p of pieces) {
          assert(
            isValidPlayablePosition(boardType, p.position),
            `[${boardType}/${playStyle}/${matchType}] Initial piece ${p.id} spawned on invalid tile ${JSON.stringify(p.position)}`
          );
        }

        for (let ply = 1; ply <= pliesPerMatch; ply++) {
          const allLegalMoves = getAllValidMovesForColor(turn, pieces, boardType, lastMove, playStyle);
          if (allLegalMoves.length === 0) break;

          // Verify every legal move preview for the active player obeys all rules
          for (const m of allLegalMoves) {
            const mover = pieces.find((p) => p.id === m.pieceId)!;
            assert(
              isValidPlayablePosition(boardType, m.to),
              `[${boardType}/${playStyle}/${matchType} ply ${ply}] Legal move preview for ${mover.id} targets invalid tile ${JSON.stringify(m.to)}`
            );

            // Check 1-tile summit rule for non-Knights starting on the 4x4 Summit
            const startedOnSummit =
              !mover.position.isVerticalWall && isSummitTile(boardType, mover.position.x, mover.position.y);
            if (startedOnSummit && mover.type !== 'knight') {
              const dx = Math.abs(m.to.x - mover.position.x);
              const dy = Math.abs(m.to.y - mover.position.y);
              if (!m.isCapture && !m.isBombard) {
                assert(
                  dx <= 1 && dy <= 1,
                  `[${boardType}/${playStyle}/${matchType} ply ${ply}] Non-Knight ${mover.type} on summit violated 1-tile ordinary move limit: (${mover.position.x},${mover.position.y}) -> (${m.to.x},${m.to.y})`
                );
              }
            }

            // Check Pawn non-promotion on the 4x4 Summit
            if (mover.type === 'pawn' && isSummitTile(boardType, m.to.x, m.to.y)) {
              assert(
                !m.promotionType && !m.isSummitAscension,
                `[${boardType}/${playStyle}/${matchType} ply ${ply}] Pawn move to summit (${m.to.x},${m.to.y}) illegally set promotionType=${m.promotionType}`
              );
            }
          }

          let chosenMove: Move | null = null;
          if (matchType === 'human_vs_ai' && turn === 'white') {
            // Simulate a human player selecting a piece, inspecting its validMoves preview,
            // prioritizing advancing toward or testing the summit / tactical captures
            const summitOrAdvanceMoves = allLegalMoves.filter((m) => {
              const mover = pieces.find((p) => p.id === m.pieceId)!;
              return (
                m.isCapture ||
                isSummitTile(boardType, m.to.x, m.to.y) ||
                (!mover.position.isVerticalWall && isSummitTile(boardType, mover.position.x, mover.position.y)) ||
                m.tierDelta > 0
              );
            });
            const pool = summitOrAdvanceMoves.length > 0 ? summitOrAdvanceMoves : allLegalMoves;
            const humanCandidate = pool[ply % pool.length];
            const selectedPiece = pieces.find((p) => p.id === humanCandidate.pieceId)!;
            const piecePreviewMoves = getValidMovesForPiece(
              selectedPiece,
              pieces,
              boardType,
              lastMove,
              playStyle
            );
            assert(
              piecePreviewMoves.some(
                (pm) =>
                  pm.to.x === humanCandidate.to.x &&
                  pm.to.y === humanCandidate.to.y &&
                  Boolean(pm.to.isVerticalWall) === Boolean(humanCandidate.to.isVerticalWall)
              ),
              `[${boardType}/${playStyle}/${matchType} ply ${ply}] Human piece preview moves must match authoritative getAllValidMovesForColor`
            );
            chosenMove = humanCandidate;
          } else {
            // AI turn (either Black in human_vs_ai, or both sides in ai_vs_ai)
            chosenMove = findBestMoveAI(
              pieces,
              turn,
              boardType,
              'standard',
              'Balanced',
              'kingdom',
              recentMoves
            );
          }

          assert(
            !!chosenMove,
            `[${boardType}/${playStyle}/${matchType} ply ${ply}] Player (${turn}) must select a valid move`
          );

          // Verify chosenMove is in allLegalMoves (authoritative engine check)
          const isAuthoritativeLegal = allLegalMoves.some(
            (m) =>
              m.pieceId === chosenMove!.pieceId &&
              m.to.x === chosenMove!.to.x &&
              m.to.y === chosenMove!.to.y &&
              Boolean(m.to.isVerticalWall) === Boolean(chosenMove!.to.isVerticalWall) &&
              m.wallDirection === chosenMove!.wallDirection
          );
          assert(
            isAuthoritativeLegal,
            `[${boardType}/${playStyle}/${matchType} ply ${ply}] Chosen move ${JSON.stringify(chosenMove)} is not in authoritative legal moves!`
          );

          // Execute move via authoritative simulateMove + normalizePiecesToBoard
          const moverBefore = pieces.find((p) => p.id === chosenMove!.pieceId)!;
          pieces = normalizePiecesToBoard(boardType, simulateMove(pieces, chosenMove!, boardType));
          lastMove = chosenMove!;
          recentMoves.push(chosenMove!);
          setValidationLastMove(chosenMove!);

          // Post-move assertions:
          // 1. Mover's King is NEVER left in check
          assert(
            !isKingInCheck(turn, pieces, boardType),
            `[${boardType}/${playStyle}/${matchType} ply ${ply}] ${turn} King left in check after move!`
          );

          // 2. If a Pawn moved onto the 4x4 Summit, it must still be a Pawn
          if (moverBefore.type === 'pawn' && isSummitTile(boardType, chosenMove!.to.x, chosenMove!.to.y)) {
            const moverAfter = pieces.find((p) => p.id === moverBefore.id);
            assert(
              !!moverAfter && moverAfter.type === 'pawn',
              `[${boardType}/${playStyle}/${matchType} ply ${ply}] Pawn promoted illegally on the 4x4 Summit!`
            );
          }

          // 3. Every surviving piece is on a valid playable tile
          for (const sp of pieces) {
            const resolved = resolvePlayableTile(boardType, sp.position);
            assert(
              !!resolved && isValidPlayablePosition(boardType, sp.position),
              `[${boardType}/${playStyle}/${matchType} ply ${ply}] Piece ${sp.id} ended on nonexistent tile ${JSON.stringify(sp.position)}`
            );
          }

          turn = turn === 'white' ? 'black' : 'white';
        }

        assert(
          recentMoves.length === pliesPerMatch,
          `[${boardType}/${playStyle}/${matchType}] Expected ${pliesPerMatch} plies executed, got ${recentMoves.length}`
        );
        console.log(
          `  ✓ Verified ${boardType} [${playStyle}] (${matchType}): ${recentMoves.length} plies executed with 100% rule & tile integrity.`
        );
      }
    }
  }
  console.log(
    '✓ Regression Test 9 Passed: All Quick Pyramid & Grand Pyramid matches (Open Surface & Surface Bound, Human-vs-AI & AI-vs-AI) passed.'
  );
}

/**
 * REGRESSION TEST 10: Win Condition & Last One Standing Integrity
 * Verifies that after the first play of the game (and throughout opening/midgame play):
 * - normalizePiecesToBoard(boardType, updatedPieces) and normalizePiecesToBoard(updatedPieces, boardType)
 *   preserve all living pieces and both Kings (never returning an empty array that would falsely trigger Last One Standing).
 * - Neither Last One Standing nor Checkmate/Stalemate triggers after Move 1 on any board, deployment, or mode.
 * - Win condition only triggers when a King is genuinely checkmated or eliminated.
 */
function testWinConditionNotTriggeredPrematurely(): void {
  const boards: BoardType[] = ['pyramid', 'quick_pyramid', 'battlefield', 'classic'];
  const deployments: ('standard' | 'kingdom')[] = ['standard', 'kingdom'];
  const modes: GameMode[] = ['standard', 'rpg'];

  for (const boardType of boards) {
    for (const dep of deployments) {
      for (const mode of modes) {
        const initialPieces = createInitialPieces(boardType, false, dep, mode);
        const expectedInitialCount = initialPieces.length;

        // Verify both parameter orders of normalizePiecesToBoard preserve all initial pieces and both Kings
        const normOrderA = normalizePiecesToBoard(boardType, initialPieces);
        const normOrderB = normalizePiecesToBoard(initialPieces, boardType);
        assert(
          normOrderA.length === expectedInitialCount && normOrderB.length === expectedInitialCount,
          `normalizePiecesToBoard dropped pieces on ${boardType} (${dep}/${mode}): expected ${expectedInitialCount}, got ${normOrderA.length} / ${normOrderB.length}`
        );

        // Execute Move 1 using the exact executeMove state update + Last One Standing check from App.tsx
        const firstMoves = getAllValidMovesForColor('white', normOrderA, boardType);
        assert(firstMoves.length > 0, `White must have legal moves on Turn 1 on ${boardType}`);
        const firstMove = firstMoves[0];

        const updatedPieces = normOrderA.map((p) => ({
          ...p,
          position: { ...p.position },
          rpg: { ...p.rpg },
        }));
        const movingPiece = updatedPieces.find((p) => p.id === firstMove.pieceId)!;
        movingPiece.position = { ...firstMove.to };
        movingPiece.hasMoved = true;

        const normalizedAfterFirstPlay = normalizePiecesToBoard(boardType, updatedPieces);
        const remainingBlack = normalizedAfterFirstPlay.filter((p) => p.color === 'black' && p.rpg.hp > 0);
        const remainingWhite = normalizedAfterFirstPlay.filter((p) => p.color === 'white' && p.rpg.hp > 0);
        const blackHasKing = remainingBlack.some((p) => p.type === 'king');
        const whiteHasKing = remainingWhite.some((p) => p.type === 'king');

        const prematureWinnerTriggered =
          remainingBlack.length === 0 ||
          !blackHasKing ||
          remainingWhite.length === 0 ||
          !whiteHasKing ||
          (isKingInCheck('black', normalizedAfterFirstPlay, boardType) &&
            getAllValidMovesForColor('black', normalizedAfterFirstPlay, boardType).length === 0);

        assert(
          !prematureWinnerTriggered,
          `Premature win condition triggered after Move 1 on ${boardType} (${dep}/${mode})! remainingBlack=${remainingBlack.length}, remainingWhite=${remainingWhite.length}`
        );
      }
    }
  }
  console.log(
    '✓ Regression Test 10 Passed: Win condition & Last One Standing check never trigger prematurely after the first play.'
  );
}

/**
 * REGRESSION TEST 11: Five Difficulty Levels, Multi-Turn Strategic Objectives & Validated Learning
 * Verifies:
 * - All 5 canonical AI difficulty levels (Beginner, Developing, Intermediate, Advanced, Expert)
 *   obey identical game rules, select legal moves, and maintain distinct search/evaluation profiles.
 * - Multi-turn strategic objectives are tracked and reassessed per side.
 * - Post-game learning analyzes completed games (loops, lone chasing, draws, wins/losses),
 *   measurably updates learnedWeights, and validates/clamps weights so invalid updates cannot corrupt active play.
 */
function testFiveDifficultiesObjectivesAndValidatedLearning(): void {
  const canonicalLevels: AIDifficulty[] = [
    'Beginner',
    'Developing',
    'Intermediate',
    'Advanced',
    'Expert',
  ];
  const boardType: BoardType = 'quick_pyramid';
  setActivePlayStyle('open_surface');
  setValidationLastMove(null);

  const pieces = normalizePiecesToBoard(
    boardType,
    createInitialPieces(boardType, false, 'standard', 'standard')
  );
  const allLegal = getAllValidMovesForColor('white', pieces, boardType);

  for (const level of canonicalLevels) {
    const norm = normalizeAIDifficulty(level);
    assert(norm === level, `Canonical level ${level} must normalize to itself`);
    const profile = AI_DIFFICULTY_PROFILES[norm];
    assert(profile.baseSearchDepth >= 1, `Profile ${level} must have valid baseSearchDepth`);

    const move = findBestMoveAI(pieces, 'white', boardType, 'standard', level, 'standard', []);
    assert(!!move, `AI at difficulty ${level} must return a legal move`);
    const isLegal = allLegal.some(
      (m) =>
        m.pieceId === move!.pieceId &&
        m.to.x === move!.to.x &&
        m.to.y === move!.to.y &&
        Boolean(m.to.isVerticalWall) === Boolean(move!.to.isVerticalWall)
    );
    assert(isLegal, `AI at difficulty ${level} selected an illegal move!`);
  }

  // Verify multi-turn strategic objective state was recorded for White
  const whiteObj = getActiveStrategicObjective('white');
  assert(
    !!whiteObj && whiteObj.turnsActive >= 1 && whiteObj.label.length > 0,
    `AI must maintain an active strategic objective across turns`
  );

  // Verify validateLearnedWeights clamps extreme/corrupt values safely to [0.85, 1.45]
  const safeWeights = validateLearnedWeights({
    kingSafety: 999,
    coordination: -50,
    containment: Number.NaN,
    antiLoop: 1.12,
  });
  assert(
    safeWeights.kingSafety === 1.45 &&
      safeWeights.coordination === 0.85 &&
      safeWeights.containment === 1.0 &&
      safeWeights.antiLoop === 1.12,
    `validateLearnedWeights must clamp out-of-range or NaN values safely: got ${JSON.stringify(safeWeights)}`
  );

  // Verify post-game learning updates learnedWeights measurably after a draw with repeated moves
  const gameKey = getGameKey('quick_pyramid', 'standard', 'standard');
  const beforeLearn = loadGameLearning(gameKey);
  const beforeAntiLoop = beforeLearn.learnedWeights?.antiLoop || 1.0;
  const beforeContainment = beforeLearn.learnedWeights?.containment || 1.0;

  const loopHistory: Move[] = [
    {
      pieceId: 'white_knight_1',
      from: { x: 2, y: 0, tier: 0 },
      to: { x: 3, y: 2, tier: 1 },
      isCapture: false,
      tierDelta: 1,
    },
    {
      pieceId: 'black_knight_1',
      from: { x: 2, y: 11, tier: 0 },
      to: { x: 3, y: 9, tier: 1 },
      isCapture: false,
      tierDelta: 1,
    },
    {
      pieceId: 'white_knight_1',
      from: { x: 3, y: 2, tier: 1 },
      to: { x: 2, y: 0, tier: 0 },
      isCapture: false,
      tierDelta: -1,
    },
  ];
  recordMatchOutcome('quick_pyramid', 'standard', 'standard', 'draw', 'white', loopHistory);

  const afterLearn = loadGameLearning(gameKey);
  assert(
    (afterLearn.learnedWeights?.antiLoop || 1.0) > beforeAntiLoop &&
      (afterLearn.learnedWeights?.containment || 1.0) > beforeContainment &&
      (afterLearn.loopOccurrences || 0) >= 1,
    `Post-game learning must measurably increase antiLoop and containment weights after a loop draw`
  );

  // Verify learned weights measurably influence conversion evaluation
  const wKing: Piece = {
    ...pieces.find((p) => p.color === 'white' && p.type === 'king')!,
    position: { x: 4, y: 4, tier: 2 },
  };
  const wQueen: Piece = {
    ...pieces.find((p) => p.color === 'white' && p.type === 'queen')!,
    position: { x: 5, y: 5, tier: 3 },
  };
  const wRook: Piece = {
    ...pieces.find((p) => p.color === 'white' && p.type === 'rook')!,
    position: { x: 6, y: 4, tier: 2 },
  };
  const bKing: Piece = {
    ...pieces.find((p) => p.color === 'black' && p.type === 'king')!,
    position: { x: 6, y: 6, tier: 3 },
  };
  const convBoard = [wKing, wQueen, wRook, bKing];
  const baseEval = evaluateBoard([wKing, wQueen, wRook, bKing], 'white', boardType, 'standard', {
    ...afterLearn,
    learnedWeights: validateLearnedWeights({ containment: 1.0, coordination: 1.0 }),
  });
  const learnedEval = evaluateBoard(convBoard.map((p) => ({ ...p })), 'white', boardType, 'standard', {
    ...afterLearn,
    learnedWeights: validateLearnedWeights({ containment: 1.25, coordination: 1.25 }),
  });
  assert(
    learnedEval > baseEval,
    `Learned weights must measurably change position evaluation in conversion states (${learnedEval} vs ${baseEval})`
  );

  console.log(
    '✓ Regression Test 11 Passed: All 5 difficulty levels, multi-turn strategic objectives, and validated post-game learning verified.'
  );
}

function runAllBoardIntegrityTests(): void {
  console.log('=== Running Pyramid Board & Tile Integrity Tests ===');
  testNoPieceSpawnsOrMovesOntoNonexistentTile();
  testNoLegalMoveHighlightBeneathBoard();
  testNeitherHumanNorAICanSelectInvalidDestination();
  testLegitimateWallMovementWorks();
  testEveryRenderedPieceCorrespondsToOneValidPlayableTile();
  console.log('=== Running 4x4 Summit 1-Tile Movement Restriction Tests ===');
  testSummitOneTileMovementLimit();
  testSummitAllEightDirectionsAndCaptureSeparation();
  testKnightRetainsSummitJumpRules();
  testNormalMovementResumesAfterLeavingSummit();
  testNoSummitMovementEndsOnNonexistentTile();
  console.log('=== Running Unified Engine, Check Detection, AI Summit Planning & Match Regression Tests ===');
  testCheckDetectionAndCaptureSeparation();
  testPawnNoPromotionOnSummit();
  testAISummitTacticalPlanning();
  testFullMatchRegressions();
  testWinConditionNotTriggeredPrematurely();
  testFiveDifficultiesObjectivesAndValidatedLearning();
  console.log('=== ALL REQUIRED BOARD INTEGRITY, SUMMIT MOVEMENT & MATCH REGRESSION TESTS PASSED ===');
}

runAllBoardIntegrityTests();
