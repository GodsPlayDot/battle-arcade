import React, { useMemo, useRef } from 'react';
import {
  BeaconSideMode,
  BoardType,
  PieceBeaconInfo,
  PieceColor,
  PlayerMode,
} from '../types/chess';
import { AlertCircle, EyeOff, Target } from 'lucide-react';

interface PieceBeaconsOverlayProps {
  beacons: PieceBeaconInfo[];
  boardType: BoardType;
  onFocusPiece: (pieceId: string) => void;
  enabled: boolean;
  beaconSide?: BeaconSideMode;
  playerMode?: PlayerMode;
  humanColor?: PieceColor;
  currentTurn?: PieceColor;
}

interface StackedBeaconItem extends PieceBeaconInfo {
  posX: number;
  posY: number;
  anchorClampedX: number;
  stackedRow: number;
}

interface ElevationRowRail {
  rowIndex: number;
  rowY: number;
  minX: number;
  maxX: number;
  elevationLabel: string;
}

export const PieceBeaconsOverlay: React.FC<PieceBeaconsOverlayProps> = React.memo(({
  beacons,
  boardType,
  onFocusPiece,
  enabled,
  beaconSide = 'opponent',
  playerMode = 'human_vs_ai',
  humanColor = 'white',
  currentTurn = 'white',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Rule 20: Beacons are a Pyramid visibility feature ONLY (Quick Pyramid & Grand Pyramid)
  const isPyramidBoard = boardType === 'quick_pyramid' || boardType === 'pyramid';

  // Determine which side is considered "opponent" for 'opponent' mode
  const opponentColor: PieceColor =
    playerMode === 'human_vs_ai'
      ? humanColor === 'white'
        ? 'black'
        : 'white'
      : currentTurn === 'white'
      ? 'black'
      : 'white';

  // Rule 21 & Rule 24: Visible piece = no beacon, plus filter by Beacon Side Setting
  const obscuredBeacons = useMemo(() => {
    if (beaconSide === 'off') return [];
    return beacons.filter((b) => {
      if (!b.isOccluded) return false;
      if (beaconSide === 'opponent' && playerMode !== 'ai_vs_ai') {
        if (b.status === 'in_check' || b.status === 'selected' || b.status === 'target') {
          return true;
        }
        return b.piece.color === opponentColor;
      }
      return true;
    });
  }, [beacons, beaconSide, opponentColor, playerMode]);

  // Organize beacons into straight horizontal stacked rows at different elevations with plumb-vertical poles
  const { processedFlags, elevationRails } = useMemo<{
    processedFlags: StackedBeaconItem[];
    elevationRails: ElevationRowRail[];
  }>(() => {
    if (!enabled || !isPyramidBoard || obscuredBeacons.length === 0) {
      return { processedFlags: [], elevationRails: [] };
    }

    const vpW =
      overlayRef.current?.clientWidth ||
      (typeof window !== 'undefined' ? window.innerWidth : 1200);
    const vpH =
      overlayRef.current?.clientHeight ||
      (typeof window !== 'undefined' ? window.innerHeight : 800);

    const marginX = 56;
    const topHudClearance = 58; // Clear the minimized top HUD micro-bar
    const MAX_STACKED_ROWS = 6;
    const ROW_VERTICAL_GAP = 34; // Crisp vertical spacing between stacked horizontal rows
    const MIN_HORIZONTAL_DIST = 72; // Minimum horizontal badge separation within a single row

    // 1. Sort primarily by piece elevation tier & depthTier (lowest/nearest first -> bottom row),
    //    then left-to-right by anchorX so rows fill cleanly and predictably.
    const sorted = [...obscuredBeacons].sort((a, b) => {
      const elevA = a.piece.position.tier * 2 + (a.depthTier || 0);
      const elevB = b.piece.position.tier * 2 + (b.depthTier || 0);
      if (elevA !== elevB) return elevA - elevB;
      const ax = a.anchorX ?? a.screenX;
      const bx = b.anchorX ?? b.screenX;
      return ax - bx;
    });

    // 2. Assign each beacon to a straight horizontal stacked row (0 = lowest row, higher = higher elevation row)
    //    Keeping posX === anchorX so every flagpole rises 100% straight vertically!
    const rows: StackedBeaconItem[][] = Array.from({ length: MAX_STACKED_ROWS }, () => []);

    sorted.forEach((b) => {
      const rawAnchorX = b.anchorX ?? b.screenX;
      const clampedX = Math.max(marginX, Math.min(vpW - marginX, rawAnchorX));

      // Preferred starting row based on piece elevation tier / depth tier (0..3)
      const preferredBaseRow = Math.min(
        3,
        Math.max(b.piece.position.tier, b.depthTier || 0)
      );

      // Search from preferredBaseRow upward for a row with no horizontal overlap at clampedX
      let chosenRow = -1;
      for (let r = preferredBaseRow; r < MAX_STACKED_ROWS; r++) {
        const hasCollision = rows[r].some(
          (existing) => Math.abs(existing.posX - clampedX) < MIN_HORIZONTAL_DIST
        );
        if (!hasCollision) {
          chosenRow = r;
          break;
        }
      }

      // If upper rows were occupied at this X, check lower rows (0 .. preferredBaseRow - 1)
      if (chosenRow === -1) {
        for (let r = preferredBaseRow - 1; r >= 0; r--) {
          const hasCollision = rows[r].some(
            (existing) => Math.abs(existing.posX - clampedX) < MIN_HORIZONTAL_DIST
          );
          if (!hasCollision) {
            chosenRow = r;
            break;
          }
        }
      }

      // Fallback if all 6 rows are tightly packed at the exact same X: pick the least crowded row
      if (chosenRow === -1) {
        let bestRow = preferredBaseRow;
        let maxMinDist = -1;
        for (let r = 0; r < MAX_STACKED_ROWS; r++) {
          const minDistInRow = rows[r].reduce(
            (minD, existing) => Math.min(minD, Math.abs(existing.posX - clampedX)),
            Infinity
          );
          if (minDistInRow > maxMinDist) {
            maxMinDist = minDistInRow;
            bestRow = r;
          }
        }
        chosenRow = bestRow;
      }

      rows[chosenRow].push({
        ...b,
        posX: clampedX,
        posY: 0, // Assigned in step 3 once active rows are compacted
        anchorClampedX: clampedX,
        stackedRow: chosenRow,
      });
    });

    // 3. Compact non-empty rows into consecutive stacked horizontal elevation levels
    //    and ensure minimum horizontal spacing within each row if fallback was used
    const activeRowIndices = rows
      .map((list, idx) => (list.length > 0 ? idx : -1))
      .filter((idx) => idx !== -1);

    const numActiveRows = activeRowIndices.length;

    // Find the highest screen anchorY (smallest Y pixel value) among all obscured pieces
    const minAnchorY = sorted.reduce((minY, b) => {
      const ay = b.anchorY ?? b.screenY + 80;
      return Math.min(minY, ay);
    }, vpH * 0.42);

    // Bottom-most stacked row (rank 0) sits cleanly above the pyramid silhouette & piece anchors;
    // each subsequent row (rank 1, 2, 3...) stacks straight above it by ROW_VERTICAL_GAP (34px).
    const maxAllowedBottomRowY = Math.min(vpH * 0.36, minAnchorY - 34);
    const minNeededBottomRowY = topHudClearance + Math.max(0, numActiveRows - 1) * ROW_VERTICAL_GAP;
    const baseBottomRowY = Math.max(minNeededBottomRowY, Math.min(245, maxAllowedBottomRowY));

    const finalItems: StackedBeaconItem[] = [];
    const rails: ElevationRowRail[] = [];

    activeRowIndices.forEach((originalRowIdx, compactRank) => {
      const rowItems = rows[originalRowIdx];
      // Straight horizontal Y coordinate shared by EVERY beacon on this stacked elevation row
      const rowY = Math.max(
        topHudClearance,
        Math.round(baseBottomRowY - compactRank * ROW_VERTICAL_GAP)
      );

      // Sort left-to-right within the row
      rowItems.sort((a, b) => a.posX - b.posX);

      // Gentle pass only if two items in the same fallback row still overlap
      for (let iter = 0; iter < 4; iter++) {
        for (let i = 0; i < rowItems.length - 1; i++) {
          const leftItem = rowItems[i];
          const rightItem = rowItems[i + 1];
          const dx = rightItem.posX - leftItem.posX;
          if (dx < MIN_HORIZONTAL_DIST) {
            const push = (MIN_HORIZONTAL_DIST - dx) / 2;
            leftItem.posX = Math.max(marginX, leftItem.posX - push);
            rightItem.posX = Math.min(vpW - marginX, rightItem.posX + push);
          }
        }
      }

      let minX = Infinity;
      let maxX = -Infinity;

      rowItems.forEach((item) => {
        item.posY = rowY;
        item.stackedRow = compactRank;
        if (item.posX < minX) minX = item.posX;
        if (item.posX > maxX) maxX = item.posX;
        finalItems.push(item);
      });

      rails.push({
        rowIndex: compactRank,
        rowY,
        minX: Math.max(marginX - 28, minX - 36),
        maxX: Math.min(vpW - marginX + 28, maxX + 36),
        elevationLabel: `ELEV ROW ${compactRank + 1}`,
      });
    });

    return { processedFlags: finalItems, elevationRails: rails };
  }, [enabled, isPyramidBoard, obscuredBeacons]);

  if (!enabled || !isPyramidBoard || processedFlags.length === 0) return null;

  // Staunton symbols
  const getPieceSymbol = (type: string, color: string) => {
    const isWhite = color === 'white';
    switch (type) {
      case 'king':
        return isWhite ? '♔' : '♚';
      case 'queen':
        return isWhite ? '♕' : '♛';
      case 'rook':
        return isWhite ? '♖' : '♜';
      case 'bishop':
        return isWhite ? '♗' : '♝';
      case 'knight':
        return isWhite ? '♘' : '♞';
      case 'vanguard':
        return '⛨';
      case 'gargoyle':
        return '❖';
      case 'ascendant':
        return '✦';
      case 'trebuchet':
        return '☄';
      default:
        return isWhite ? '♙' : '♟';
    }
  };

  const getStatusBadge = (
    status: PieceBeaconInfo['status'],
    occlusionLevel?: PieceBeaconInfo['occlusionLevel']
  ) => {
    switch (status) {
      case 'in_check':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-500/80 animate-pulse">
            <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
            CHECK
          </span>
        );
      case 'selected':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-300 bg-amber-950/90 px-1 py-0.2 rounded border border-amber-400/80 animate-pulse">
            ACTIVE
          </span>
        );
      case 'active_mover':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-sky-300 bg-sky-950/90 px-1 py-0.2 rounded border border-sky-400/80">
            MOVING
          </span>
        );
      case 'target':
        return (
          <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-300 bg-rose-950/90 px-1 py-0.2 rounded border border-rose-500/80">
            <Target className="w-2.5 h-2.5 text-rose-400" />
            TARGET
          </span>
        );
      default:
        return (
          <span
            className="flex items-center gap-0.5 text-[8px] font-mono text-slate-400"
            title={occlusionLevel === 'partial' ? 'Partially obscured' : 'Completely obscured'}
          >
            <EyeOff className="w-2.5 h-2.5 opacity-75" />
          </span>
        );
    }
  };

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* 1. SVG Layer: Horizontal Stacked Elevation Rails + Plumb-Vertical Flagpoles */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        <defs>
          <filter id="pole-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="gold-pole" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="silver-pole" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0.55" />
            <stop offset="50%" stopColor="#cbd5e1" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Horizontal Stacked Elevation Row Guide Lines */}
        {elevationRails.map((rail) => (
          <g key={`elevation-rail-${rail.rowIndex}`}>
            <line
              x1={rail.minX}
              y1={rail.rowY}
              x2={rail.maxX}
              y2={rail.rowY}
              stroke="#38bdf8"
              strokeWidth={1}
              strokeDasharray="4 4"
              strokeOpacity={0.28}
            />
            <circle
              cx={rail.minX}
              cy={rail.rowY}
              r={2}
              fill="#38bdf8"
              fillOpacity={0.45}
            />
            <circle
              cx={rail.maxX}
              cy={rail.rowY}
              r={2}
              fill="#38bdf8"
              fillOpacity={0.45}
            />
          </g>
        ))}

        {/* Straight Vertical Flagpoles from Piece Anchor to Stacked Horizontal Row */}
        {processedFlags.map((flag) => {
          if (flag.anchorX === undefined || flag.anchorY === undefined) return null;
          const isWhite = flag.piece.color === 'white';
          const isCheck = flag.status === 'in_check';
          const isSelected = flag.status === 'selected' || flag.status === 'active_mover';

          const anchorX = flag.anchorX;
          const anchorY = flag.anchorY;
          const poleTopX = flag.posX;
          const poleTopY = flag.posY + 12; // Bottom edge of flag banner on the horizontal row
          const finialTopY = flag.posY - 15; // Top spearhead finial above banner

          const poleStroke = isCheck
            ? '#f43f5e'
            : isSelected
            ? '#fbbf24'
            : isWhite
            ? 'url(#gold-pole)'
            : 'url(#silver-pole)';

          const hasHorizontalOffset = Math.abs(anchorX - poleTopX) > 1.5;
          const elbowY = poleTopY + 6;

          return (
            <g key={`flagpole-${flag.piece.id}`}>
              {hasHorizontalOffset ? (
                /* Orthogonal 90-degree straight vertical + straight horizontal elbow if nudged */
                <polyline
                  points={`${anchorX},${anchorY} ${anchorX},${elbowY} ${poleTopX},${elbowY} ${poleTopX},${poleTopY}`}
                  fill="none"
                  stroke={poleStroke}
                  strokeWidth={isCheck || isSelected ? 2.4 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={isSelected ? 1.0 : 0.88}
                  filter="url(#pole-glow)"
                />
              ) : (
                /* 100% Plumb-Straight Vertical Flagpole */
                <line
                  x1={anchorX}
                  y1={anchorY}
                  x2={poleTopX}
                  y2={poleTopY}
                  stroke={poleStroke}
                  strokeWidth={isCheck || isSelected ? 2.4 : 1.75}
                  strokeLinecap="round"
                  strokeOpacity={isSelected ? 1.0 : 0.88}
                  filter="url(#pole-glow)"
                />
              )}

              {/* Straight vertical mast extension behind the flag banner up to finial */}
              <line
                x1={poleTopX}
                y1={poleTopY}
                x2={poleTopX}
                y2={finialTopY}
                stroke={poleStroke}
                strokeWidth={1.5}
                strokeOpacity={0.85}
              />

              {/* Spearhead Finial on top of vertical mast */}
              <polygon
                points={`${poleTopX},${finialTopY - 6} ${poleTopX - 3},${finialTopY} ${poleTopX + 3},${finialTopY}`}
                fill={isCheck ? '#f43f5e' : isWhite ? '#fbbf24' : '#cbd5e1'}
                stroke="#0f172a"
                strokeWidth={0.8}
              />

              {/* Piece Anchor Base Mount on the obscured piece */}
              <circle
                cx={anchorX}
                cy={anchorY}
                r={3.2}
                fill={isCheck ? '#f43f5e' : isWhite ? '#fbbf24' : '#a855f7'}
                stroke="#020617"
                strokeWidth={1.4}
              />
            </g>
          );
        })}
      </svg>

      {/* 2. Subtle Row Elevation Tags on the left edge of each Stacked Horizontal Row */}
      {elevationRails.map((rail) => (
        <div
          key={`rail-label-${rail.rowIndex}`}
          style={{
            left: `${Math.max(12, rail.minX - 6)}px`,
            top: `${rail.rowY}px`,
            transform: 'translate(-100%, -50%)',
          }}
          className="absolute hidden sm:flex items-center px-1.5 py-0.5 rounded bg-slate-950/80 border border-sky-500/25 text-[8px] font-mono font-bold text-sky-300/80 tracking-wider whitespace-nowrap pointer-events-none"
        >
          L{rail.rowIndex + 1}
        </div>
      ))}

      {/* 3. Straight Stacked Horizontal Beacon Cards */}
      {processedFlags.map((flag) => {
        const isWhite = flag.piece.color === 'white';
        const isCheck = flag.status === 'in_check';
        const isSelected = flag.status === 'selected';
        const isActiveMover = flag.status === 'active_mover';

        const occlusionText =
          flag.occlusionLevel === 'partial' ? 'Partially Obscured' : 'Obscured';

        return (
          <div
            key={flag.piece.id}
            style={{
              left: `${flag.posX}px`,
              top: `${flag.posY}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute pointer-events-auto cursor-pointer group transition-transform hover:scale-110 hover:z-30 select-none"
            onClick={() => onFocusPiece(flag.piece.id)}
            title={`${flag.piece.color.toUpperCase()} ${flag.piece.type.toUpperCase()} (${occlusionText} · Stacked Elevation Row ${flag.stackedRow + 1})\nClick to rotate camera toward piece.`}
          >
            <div className="relative flex flex-col items-center">
              {/* Active / Checked Aura Shimmer */}
              {(isCheck || isSelected || isActiveMover) && (
                <span
                  className={`absolute -inset-1 rounded-lg animate-pulse opacity-60 blur-xs ${
                    isCheck
                      ? 'bg-rose-500'
                      : isWhite
                      ? 'bg-amber-400'
                      : 'bg-purple-500'
                  }`}
                />
              )}

              {/* Straight Horizontal Pennant Badge */}
              <div
                className={`relative flex items-center gap-1.5 px-2 py-0.5 h-[22px] rounded-lg shadow-xl border backdrop-blur-md transition-all ${
                  isCheck
                    ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/70 ring-2 ring-rose-500/60'
                    : isSelected || isActiveMover
                    ? 'bg-amber-950/95 border-amber-400 text-amber-100 shadow-amber-950/70 ring-2 ring-amber-400/60'
                    : isWhite
                    ? 'bg-slate-900/95 border-amber-400/85 text-amber-100 shadow-slate-950/90'
                    : 'bg-slate-950/95 border-purple-400/85 text-purple-100 shadow-slate-950/90'
                }`}
              >
                {/* Staunton Piece Standard Glyph */}
                <span
                  className={`text-sm font-serif leading-none drop-shadow-md ${
                    isWhite ? 'text-amber-300' : 'text-purple-300'
                  }`}
                >
                  {getPieceSymbol(flag.piece.type, flag.piece.color)}
                </span>

                {/* Piece Abbreviation & Coordinate */}
                <div className="flex items-center gap-1 leading-none">
                  <span className="text-[9px] font-black tracking-tight uppercase">
                    {flag.piece.type.slice(0, 3)}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">
                    {String.fromCharCode(65 + flag.piece.position.x)}
                    {flag.piece.position.y + 1}
                  </span>
                </div>

                {/* Tier Pill if elevated */}
                {flag.piece.position.tier > 0 && (
                  <span className="text-[8px] font-mono font-bold px-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 leading-tight">
                    T{flag.piece.position.tier}
                  </span>
                )}

                {/* Status Badge */}
                {getStatusBadge(flag.status, flag.occlusionLevel)}
              </div>

              {/* Hover Tooltip */}
              <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/95 border border-slate-700 text-white text-[9px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none">
                {flag.label} · {occlusionText} (Row {flag.stackedRow + 1})
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
