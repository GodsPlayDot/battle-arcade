import {
  AITeachingOption,
  AITeachingThought,
  BoardType,
  GameMode,
  Move,
  Piece,
  PieceColor,
  PieceType,
} from '../types/chess';
import {
   getActivePlayStyle,
  getAllValidMovesForColor,
  getPieceAt,
  isKingInCheck,
  simulateMove,
} from './moveValidation';
import { getTileTier, isSummitTile } from './pyramidBoard';
import { calculateLiveRPGOdds } from './rpgTactics';
import { analyzeConversionState, getLatestAIChallengeTelemetry, recordPlaybookExecution } from './chessAI';

export function formatAlgebraicCoord(to: Move['to']): string {
  const file = String.fromCharCode(65 + to.x);
  const rank = to.y + 1;
  return to.isVerticalWall ? `${file}${rank} (Wall)` : `${file}${rank}`;
}

/**
 * Capitalizes piece type for display
 */
export function formatPieceName(type: PieceType): string {
  switch (type) {
    case 'solar_queen':
      return 'Solar Queen';
    case 'archon_templar':
      return 'Archon Templar';
    case 'chrono_mage':
      return 'Chrono Mage';
    case 'titan_golem':
      return 'Titan Golem';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/**
 * Returns clean destination coordinate or surface name
 */
export function formatDestination(to: Move['to'], boardType: BoardType): string {
  if (to.isVerticalWall) {
    return `Wall Position (${to.wallDirection || 'cliff'} face, Step ${to.wallTierStep || 1})`;
  }
  const tier = getTileTier(boardType, to.x, to.y);
  if (isSummitTile(boardType, to.x, to.y)) {
    return `Summit Apex (Tier 3)`;
  }
  if (tier === 2) {
    return `High Terrace (Tier 2)`;
  }
  if (tier === 1) {
    return `Low Terrace (Tier 1)`;
  }
  return `Square (${to.x + 1}, ${to.y + 1})`;
}

/**
 * Formats a chosen action line: e.g. "Knight → Terrace → threatens Queen"
 */
export function formatActionLine(
  move: Move,
  pieces: Piece[],
  boardType: BoardType
): { line: string; reason: string } {
  const mover = pieces.find((p) => p.id === move.pieceId);
  const moverName = mover ? formatPieceName(mover.type) : 'Piece';
  const destName = formatDestination(move.to, boardType);

  // Check Vanguard <-> Rook Exchange
  if (move.isRookExchange) {
    return {
      line: `${moverName} ⇄ Rook Exchange → deploys Rook to advanced position`,
      reason: `Switches board positions with friendly Rook to rapidly project straight-line power across the Grand Pyramid.`,
    };
  }

  // Check Trebuchet Long-Range Bombardment
  if (move.isBombard) {
    const target = pieces.find((p) => p.id === move.capturedPieceId) || getPieceAt(pieces, move.to.x, move.to.y);
    const targetName = target ? formatPieceName(target.type) : 'enemy';
    return {
      line: `${moverName} ☄ Bombard → strikes ${targetName} from long range`,
      reason: `Projects long-range RPG artillery pressure across the battlefield without exposing the Trebuchet to close-quarters counterattack.`,
    };
  }

  // Check capture
  if (move.isCapture) {
    const target = pieces.find((p) => p.id === move.capturedPieceId) || getPieceAt(pieces, move.to.x, move.to.y);
    const targetName = target ? formatPieceName(target.type) : 'enemy';
    return {
      line: `${moverName} → captures ${targetName} → opens line toward King`,
      reason: `Eliminates high-priority enemy ${targetName} and breaks open file structure.`,
    };
  }

  // Check check & Advantage Conversion Containment / Territory Compression
  const simulatedPieces = simulateMove(pieces, move);
  const moverColor: PieceColor = mover ? mover.color : 'white';
  const oppColor: PieceColor = moverColor === 'white' ? 'black' : 'white';
  const checksKing = isKingInCheck(oppColor, simulatedPieces, boardType);
  const algCoord = formatAlgebraicCoord(move.to);
  const convBefore = analyzeConversionState(pieces, moverColor, boardType);
  const convAfter = analyzeConversionState(simulatedPieces, moverColor, boardType);

  if (checksKing) {
    if (convAfter.kingEscapeSquares === 0) {
      return {
        line: `Checkmate (${moverName} to ${algCoord})`,
        reason: `All remaining escape tiles are controlled. Delivers final checkmate!`,
      };
    }
    if (convBefore.isConversionState || convAfter.kingEscapeSquares <= 2) {
      return {
        line: `Check (${moverName} to ${algCoord})`,
        reason:
          convAfter.kingEscapeSquares === 1
            ? `All remaining escape tiles are controlled except 1 forced square (${convAfter.coordinatedNetCount}-piece containment).`
            : `Productive forcing check: shrinks the King's legal escape territory to ${convAfter.kingEscapeSquares} tiles.`,
      };
    }
    return {
      line: `${moverName} to ${algCoord} (Check)`,
      reason: `Forces defensive retreat and restricts King escape routes.`,
    };
  }

  // Advantage Conversion Non-Checking Containment, Cutoff & Territory Compression Explanations
  const newCutoffs = convAfter.cutoffDirections.filter((d) => !convBefore.cutoffDirections.includes(d));
  const escapeDrop = convBefore.kingEscapeSquares - convAfter.kingEscapeSquares;
  const netGain = convAfter.coordinatedNetCount - convBefore.coordinatedNetCount;

  if (convBefore.isConversionState || (escapeDrop >= 2 && convBefore.enemyNonKingCount <= 5)) {
    if (newCutoffs.length > 0 && escapeDrop > 0) {
      return {
        line: `${moverName} to ${algCoord}`,
        reason: `Removes the King's ${newCutoffs[0]}ern escape route and completes a ${Math.max(
          2,
          convAfter.coordinatedNetCount
        )}-piece containment (shrinks legal territory from ${convBefore.kingEscapeSquares} tiles to ${
          convAfter.kingEscapeSquares
        }).`,
      };
    }
    if (newCutoffs.length > 0) {
      return {
        line: `${moverName} to ${algCoord}`,
        reason: `Removes the King's ${newCutoffs[0]}ern escape route and completes a ${Math.max(
          2,
          convAfter.coordinatedNetCount
        )}-piece containment.`,
      };
    }
    if (escapeDrop > 0) {
      return {
        line: `${moverName} to ${algCoord}`,
        reason: `Shrinks the King's legal territory from ${convBefore.kingEscapeSquares} tiles to ${convAfter.kingEscapeSquares} without giving a premature chasing check.`,
      };
    }
    if (netGain > 0) {
      return {
        line: `${moverName} to ${algCoord}`,
        reason: `Coordinates a ${convAfter.coordinatedNetCount}-piece mating net around the enemy King rather than chasing with a lone attacker.`,
      };
    }
  }

  // Check Summit Ascension / Summit Tactical Region
  if (isSummitTile(boardType, move.to.x, move.to.y)) {
    if (
      getActivePlayStyle() === 'surface_bound' &&
      mover &&
      (mover.type === 'knight' || mover.type === 'gargoyle') &&
      !mover.colorReleased
    ) {
      return {
        line: `${moverName} → 4×4 Summit → unlocks Jump Color Release`,
        reason: `Surface Bound Mastery: Reaches the 4×4 Summit to permanently release its starting tile color restriction and unlock both light and dark landing tiles.`,
      };
    }
    if (mover?.type === 'knight') {
      return {
        line: `${moverName} → 4×4 Summit → claims apex jump advantage`,
        reason: `The Knight is exempt from the 1-tile Summit movement limit and retains full jumping mobility from the 4×4 Summit.`,
      };
    }
    return {
      line: `${moverName} → Summit Apex → controls 1-tile tactical zone`,
      reason: `Secures the 4×4 Summit tactical region where non-Knight pieces move 1 connected tile in 8 directions to block, trap, or control exits.`,
    };
  }

  // Check stepping off the 4x4 Summit to restore full long-range movement
  if (
    !move.from.isVerticalWall &&
    isSummitTile(boardType, move.from.x, move.from.y) &&
    !isSummitTile(boardType, move.to.x, move.to.y) &&
    mover &&
    mover.type !== 'knight'
  ) {
    return {
      line: `${moverName} exits 4×4 Summit → ${destName}`,
      reason: `Steps off the 4×4 Summit (1-tile exit rule) so full ordinary movement range resumes on the next turn.`,
    };
  }

  // Check vertical wall
  if (move.to.isVerticalWall) {
    if (getActivePlayStyle() === 'surface_bound') {
      return {
        line: `${moverName} → Vertical Wall → enters vertical combat plane`,
        reason: `Surface Bound Transition: Enters the Vertical Wall surface class to contest wall-mounted defenders or physically block horizontal sliders.`,
      };
    }
    return {
      line: `${moverName} → Wall Position → opens ambush angle`,
      reason: `Climbs cliff face to bypass terrain and prepare ambush attack.`,
    };
  }

  // Check terrace climb
  if (move.tierDelta > 0) {
    return {
      line: `${moverName} → Terrace → secures elevated position`,
      reason: `Gains high-ground elevation advantage and expands control radius.`,
    };
  }

  return {
    line: `${moverName} → ${destName} → strengthens board control`,
    reason: `Adds a defender to planned engagements and reinforces board structure.`,
  };
}

/**
 * Generates an educational AITeachingThought object for the viewer to learn from.
 */
export function generateAITeachingThought(
  chosenMove: Move,
  pieces: Piece[],
  boardType: BoardType,
  gameMode: GameMode,
  turnCount: number = 1
): AITeachingThought {
  const activePiece = pieces.find((p) => p.id === chosenMove.pieceId)!;
  const oppColor: PieceColor = activePiece.color === 'white' ? 'black' : 'white';
  const allValidMoves = getAllValidMovesForColor(activePiece.color, pieces, boardType);

  // Group candidate options for educational display
  const options: AITeachingOption[] = [];

  // Option 1: Capture options
  const captureMoves = allValidMoves.filter((m) => m.isCapture);
  if (captureMoves.length > 0) {
    const bestCapture = captureMoves[0];
    const target = pieces.find((p) => p.id === bestCapture.capturedPieceId) || getPieceAt(pieces, bestCapture.to.x, bestCapture.to.y);
    options.push({
      label: `Capture ${target ? formatPieceName(target.type) : 'Enemy'}`,
      move: bestCapture,
      category: 'capture',
    });
  }

  // Option 2: King defense / Check
  const checkMoves = allValidMoves.filter((m) => {
    const next = simulateMove(pieces, m);
    return isKingInCheck(oppColor, next, boardType);
  });
  if (checkMoves.length > 0) {
    options.push({
      label: 'Pressure King (Deliver Check)',
      move: checkMoves[0],
      category: 'attack',
    });
  } else {
    // Defend King
    const king = pieces.find((p) => p.color === activePiece.color && p.type === 'king');
    if (king) {
      options.push({
        label: 'Defend King Perimeter',
        move: allValidMoves.find((m) => Math.abs(m.to.x - king.position.x) <= 2) || allValidMoves[0] || chosenMove,
        category: 'defend',
      });
    }
  }

  // Option 3: Climb Terrace / Summit
  const climbMoves = allValidMoves.filter((m) => m.tierDelta > 0 || m.to.isVerticalWall);
  if (climbMoves.length > 0) {
    options.push({
      label: isSummitTile(boardType, climbMoves[0].to.x, climbMoves[0].to.y) ? 'Climb Summit Apex' : 'Climb Terrace Tier',
      move: climbMoves[0],
      category: 'climb',
    });
  } else {
    options.push({
      label: 'Control Center Files',
      move: allValidMoves[Math.floor(allValidMoves.length / 2)] || chosenMove,
      category: 'position',
    });
  }

  // Option 4: Support / Chosen
  const actionInfo = formatActionLine(chosenMove, pieces, boardType);
  const chosenCategory: AITeachingOption['category'] = chosenMove.isCapture
    ? 'capture'
    : chosenMove.tierDelta > 0
    ? 'climb'
    : 'support';

  // Ensure chosen move is in the list
  if (!options.some((o) => o.move && o.move.from.x === chosenMove.from.x && o.move.to.x === chosenMove.to.x && o.move.to.y === chosenMove.to.y)) {
    options.push({
      label: chosenMove.isCapture
        ? `Capture with ${formatPieceName(activePiece.type)}`
        : `Advance ${formatPieceName(activePiece.type)}`,
      move: chosenMove,
      category: chosenCategory,
    });
  }

  // RPG Teaching Odds Demonstration:
  // If moving piece positions to support an ally, or engages in combat:
  let rpgOddsShift: AITeachingThought['rpgOddsShift'] | undefined;
  if (gameMode === 'rpg') {
    if (chosenMove.isCapture) {
      const defender =
        pieces.find((p) => p.id === chosenMove.capturedPieceId) ||
        getPieceAt(pieces, chosenMove.to.x, chosenMove.to.y);
      if (defender) {
        const isMirror = activePiece.type === defender.type;
        const odds = calculateLiveRPGOdds(activePiece, defender, pieces, boardType);
        rpgOddsShift = {
          contextLabel: `${formatPieceName(activePiece.type)} vs ${formatPieceName(defender.type)}`,
          attackerPiece: activePiece,
          targetPiece: defender,
          oddsBefore: isMirror ? 50 : odds.hitPercent,
          oddsAfter: isMirror ? 50 : odds.hitPercent,
          factor: isMirror
            ? 'Identical Piece Types: Resolved via 3-choice Rock-Paper-Scissors duel'
            : odds.positiveModifiers[0] || 'Heterogeneous Piece Types: Resolved via 1d20 roll & RPG stats',
        };
      }
    } else {
      // Find an ally that can attack an enemy, and check if this move improves odds!
      const simulatedPieces = simulateMove(pieces, chosenMove);
      const allies = pieces.filter((p) => p.color === activePiece.color && p.id !== activePiece.id && p.rpg.hp > 0);
      const enemies = pieces.filter((p) => p.color === oppColor && p.rpg.hp > 0);

      for (const ally of allies.slice(0, 4)) {
        for (const enemy of enemies.slice(0, 4)) {
          const beforeOdds = calculateLiveRPGOdds(ally, enemy, pieces, boardType);
          const simulatedAlly = simulatedPieces.find((p) => p.id === ally.id);
          const simulatedEnemy = simulatedPieces.find((p) => p.id === enemy.id);
          if (simulatedAlly && simulatedEnemy) {
            const afterOdds = calculateLiveRPGOdds(simulatedAlly, simulatedEnemy, simulatedPieces, boardType);
            if (afterOdds.hitPercent > beforeOdds.hitPercent || afterOdds.positiveModifiers.length > beforeOdds.positiveModifiers.length) {
              rpgOddsShift = {
                contextLabel: `${formatPieceName(ally.type)} vs ${formatPieceName(enemy.type)}`,
                attackerPiece: ally,
                targetPiece: enemy,
                oddsBefore: beforeOdds.hitPercent,
                oddsAfter: afterOdds.hitPercent,
                factor: `Adds legal support from ${formatPieceName(activePiece.type)} at ${formatDestination(chosenMove.to, boardType)}`,
              };
              break;
            }
          }
        }
        if (rpgOddsShift) break;
      }

      // Default educational demonstration if no ally engagement changed
      if (!rpgOddsShift && enemies.length > 0) {
        const nearbyEnemy = enemies[0];
        const odds = calculateLiveRPGOdds(activePiece, nearbyEnemy, pieces, boardType);
        rpgOddsShift = {
          contextLabel: `${formatPieceName(activePiece.type)} → Threat Field`,
          attackerPiece: activePiece,
          targetPiece: nearbyEnemy,
          oddsBefore: Math.max(30, odds.hitPercent - 12),
          oddsAfter: odds.hitPercent,
          factor: `Gains territorial control and tactical line toward ${formatPieceName(nearbyEnemy.type)}`,
        };
      }
    }
  }

  const activePlaybookEntry = recordPlaybookExecution(
    chosenMove,
    pieces,
    boardType,
    turnCount,
    actionInfo.line
  );

  const convBefore = analyzeConversionState(pieces, activePiece.color, boardType);
  const simChosen = simulateMove(pieces, chosenMove);
  const convAfter = analyzeConversionState(simChosen, activePiece.color, boardType);

  return {
    step: 'chosen',
    activePiece,
    consideredMoves: allValidMoves.filter((m) => m.pieceId === activePiece.id),
    chosenMove,
    options: options.slice(0, 4),
    reason: actionInfo.reason,
    targetDescription: actionInfo.line,
    activePlaybookEntry,
    conversionTelemetry: {
      isConversionState: convBefore.isConversionState,
      modeLabel: convBefore.phaseLabel,
      kingEscapesBefore: convBefore.kingEscapeSquares,
      kingEscapesAfter: convAfter.kingEscapeSquares,
      coordinatedAttackers: convAfter.coordinatedNetCount,
      cutoffSummary:
        convAfter.cutoffDirections.length > 0
          ? `Cutoffs: ${convAfter.cutoffDirections.map((d) => d.toUpperCase()).join(', ')}`
          : undefined,
    },
    aiChallengeTelemetry: getLatestAIChallengeTelemetry() || undefined,
    rpgOddsShift,
  };
}
