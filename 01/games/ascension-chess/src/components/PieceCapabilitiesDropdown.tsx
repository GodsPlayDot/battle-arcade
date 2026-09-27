import React, { useState, useMemo } from 'react';
import {
  ArmyDeployment,
  BoardType,
  GameMode,
  Piece,
  PieceType,
  PlayStyle,
} from '../types/chess';
import {
  Compass,
  ChevronDown,
  ChevronUp,
  Layers,
  Swords,
  Shield,
  Sparkles,
  Target,
  X,
} from 'lucide-react';

interface PieceCapabilitySpec {
  type: PieceType;
  name: string;
  symbol: string;
  rangeBadge: string;
  roleSummary: string;
  movementPattern: string;
  specialAbility: string;
  pyramidNavigation: string;
  flatNavigation: string;
  surfaceBoundNote: string;
  diagramSubtitle: string;
  diagramLegend: { color: string; label: string }[];
}

export const PIECE_CAPABILITY_SPECS: Record<PieceType, PieceCapabilitySpec> = {
  pawn: {
    type: 'pawn',
    name: 'Pawn',
    symbol: '♟',
    rangeBadge: '1 Tile (2 Initial · 8-Dir Summit)',
    roleSummary: 'Frontline Infantry · Forward & Lateral Advance · Opposite-Back-Rank Promotion',
    movementPattern:
      'Moves 1 tile Forward or 1 tile Sideways (Left/Right) onto empty squares (2 tiles Forward on initial step). While occupying a 4×4 Summit tile, makes an ordinary move of 1 connected tile in any of the 8 directions (including when leaving the summit). Never captures straight-forward, sideways, or backward; captures strictly 1 step diagonally forward.',
    specialAbility:
      'En Passant capture + Promotion upon reaching the enemy back rank (Pawns do NOT promote or transform merely by reaching the 4×4 Summit).',
    pyramidNavigation:
      'On Pyramid boards (12×12 & 20×20 Grand Pyramid), Pawns can ALSO step 1 tile Backward (non-capture) and climb/descend vertical cliff walls. On the 4×4 Summit, ordinary non-capture movement expands to 1 connected tile in all 8 directions while capture remains strictly 1 step forward-diagonally; normal movement resumes on the next turn after leaving the summit.',
    flatNavigation:
      'On Flat boards (8×8 & 20×20 Flat), Pawns move 1 tile Forward or Sideways only (never backward).',
    surfaceBoundNote:
      'Pawn Surface Bound Exception: Pawns MAY attack and give check across horizontal and vertical Pyramid tiles within their legal 1-step forward-diagonal capture range (no backward captures, no straight-forward captures, no extra range).',
    diagramSubtitle: 'Forward / Sideways Step (+Backward on Pyramid · 8-Dir 1-Tile on 4×4 Summit) · Forward-Diagonal Capture Only',
    diagramLegend: [
      { color: 'bg-sky-500/40 border-sky-400 text-sky-200', label: 'Move (1 Tile / 2 Start)' },
      { color: 'bg-indigo-500/35 border-indigo-400 text-indigo-200', label: 'Pyramid 1-Tile Retreat' },
      { color: 'bg-rose-500/45 border-rose-400 text-rose-200', label: 'Forward-Diagonal Capture (⚔)' },
    ],
  },
  knight: {
    type: 'knight',
    name: 'Knight',
    symbol: '♞',
    rangeBadge: 'L-Jump (2×1 · Summit Exempt)',
    roleSummary: 'Elevation Jumper · Exempt from 1-Tile Summit Limit · Cliff Infiltrator',
    movementPattern:
      'Leaps in an L-shape (2 tiles along one axis + 1 tile perpendicular) over any intervening pieces or terrain obstacles. Exempt from the 1-tile 4×4 Summit movement restriction!',
    specialAbility:
      '30% RPG Evasion · Only unit exempt from the 4×4 Summit 1-tile movement cap, retaining its full legal summit jumping mobility.',
    pyramidNavigation:
      'Leaps directly across elevation tiers or perches onto vertical cliff walls within L-jump distance without climbing intermediate wall tiles. Retains full jump mobility when occupying the 4×4 Summit.',
    flatNavigation: 'Standard 8-target L-jump across flat squares.',
    surfaceBoundNote:
      'Jump Color Law: Locked to its starting tile color (Light or Dark) until it touches the 4×4 Summit, which permanently unlocks both colors. Jumping from the 4×4 Summit in Surface Bound lands on legal Pyramid-base tiles. Same-surface combat only.',
    diagramSubtitle: '8 L-Jump Destinations (2×1) · Exempt from 4×4 Summit 1-Tile Cap',
    diagramLegend: [
      { color: 'bg-emerald-500/45 border-emerald-400 text-emerald-200', label: 'L-Jump & Capture (⚔)' },
      { color: 'bg-slate-800/60 border-slate-700 text-slate-400', label: 'Jumped Over (Ignored)' },
    ],
  },
  bishop: {
    type: 'bishop',
    name: 'Bishop',
    symbol: '♝',
    rangeBadge: 'Range 13 · Diagonal (1-Tile on Summit)',
    roleSummary: 'Long-Range Diagonal Sniper & Terrace Diagonal Controller',
    movementPattern:
      'Slides up to 13 unobstructed connected tiles along any of the 4 diagonal rays. While occupying a 4×4 Summit tile, ordinary movement is 1 connected tile in any of the 8 directions (including when leaving the summit).',
    specialAbility: '20% Critical Strike chance · 13-tile diagonal reach across tiers (resumes immediately on the next turn after leaving the 4×4 Summit).',
    pyramidNavigation:
      'Maintains its continuous 13-tile diagonal path across folded horizontal terraces and vertical cliff walls when starting below the summit. Starting on the 4×4 Summit restricts movement to 1 connected tile in all 8 directions until it steps off the summit.',
    flatNavigation: 'Slides up to 13 unobstructed diagonal squares.',
    surfaceBoundNote:
      'Stays on its starting tile color during diagonal slides. Can transition onto diagonal wall tiles, but only captures enemies on the same surface class (blocked by opposite-surface pieces).',
    diagramSubtitle: '4 Diagonal Rays (1..13) Below Summit · 1-Tile 8-Direction Step While on 4×4 Summit',
    diagramLegend: [
      { color: 'bg-sky-500/40 border-sky-400 text-sky-200', label: 'Diagonal Slide & Capture (1..13)' },
    ],
  },
  rook: {
    type: 'rook',
    name: 'Rook',
    symbol: '♜',
    rangeBadge: 'Range 18 · Orthogonal (1-Tile on Summit)',
    roleSummary: 'Heavy Bastion Anchor · 18-Tile File/Rank Lockdown · Vanguard Swap Partner',
    movementPattern:
      'Slides up to 18 unobstructed connected tiles orthogonally (North, South, East, West). While occupying a 4×4 Summit tile, ordinary movement is 1 connected tile in any of the 8 directions (including when leaving the summit).',
    specialAbility:
      'Castling with King + Can be swapped anywhere on a 20×20 board by a friendly Vanguard (Rook Exchange). Full 18-tile orthogonal range resumes on the next turn after leaving the 4×4 Summit.',
    pyramidNavigation:
      'Climbs straight up/down vertical cliff walls and patrols lateral terrace ramparts up to 18 connected tiles when starting below the summit. On the 4×4 Summit, moves 1 connected tile in any of the 8 directions.',
    flatNavigation: 'Slides up to 18 unobstructed orthogonal squares along ranks and files.',
    surfaceBoundNote:
      'Transitions orthogonally between Horizontal and Vertical surfaces, but only captures on the same surface class (opposite-surface pieces block its ray).',
    diagramSubtitle: '4 Orthogonal Rays (1..18) Below Summit · 1-Tile 8-Dir Step on 4×4 Summit + Vanguard Swap',
    diagramLegend: [
      { color: 'bg-sky-500/40 border-sky-400 text-sky-200', label: 'Orthogonal Slide & Capture (1..18)' },
      { color: 'bg-cyan-500/40 border-cyan-400 text-cyan-200', label: 'Vanguard Swap Partner (V⇄R)' },
    ],
  },
  queen: {
    type: 'queen',
    name: 'Queen',
    symbol: '♛',
    rangeBadge: 'Unlimited · 8-Dir (1-Tile on Summit)',
    roleSummary: 'Supreme Multi-Plane Commander (Rook + Bishop Combined)',
    movementPattern:
      'Slides any unobstructed distance in all 8 directions (4 orthogonal + 4 diagonal) when starting below the summit. While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit).',
    specialAbility: '65 ATK / 25% Crit · Highest conventional board control; resumes full unlimited 8-direction range on the next turn after stepping off the 4×4 Summit.',
    pyramidNavigation:
      'Flows seamlessly across valley floors, vertical cliff walls, and terraces along any orthogonal or diagonal ray when approaching the summit. While on the 4×4 Summit, moves 1 connected tile in all 8 directions.',
    flatNavigation: 'Unlimited orthogonal and diagonal sliding across clear lines.',
    surfaceBoundNote:
      'Can reposition across Horizontal and Vertical surfaces, but must enter the target’s surface class before capturing or giving check.',
    diagramSubtitle: 'All 8 Compass Rays · Unlimited Range Below Summit (1-Tile 8-Dir While on 4×4 Summit)',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Direction Slide & Capture (∞)' },
    ],
  },
  king: {
    type: 'king',
    name: 'King',
    symbol: '♚',
    rangeBadge: 'Range 13 · 8-Dir (1-Tile on Summit)',
    roleSummary: 'Sovereign Objective · Commanding 13-Tile 8-Direction Mobility',
    movementPattern:
      'Moves up to 13 unobstructed connected tiles in all 8 directions (4 orthogonal + 4 diagonal) when starting below the summit. While occupying a 4×4 Summit tile, moves 1 connected tile in any of the 8 directions. Cannot move into check.',
    specialAbility:
      'Sole win condition of the game + Kingside/Queenside Castling + 160 HP Royal Bastion in RPG mode. Resumes 13-tile range on the next turn after leaving the 4×4 Summit.',
    pyramidNavigation:
      'Climbs and descends vertical cliff walls and terraces up to 13 connected tiles below the summit; moves 1 connected tile in all 8 directions while occupying the 4×4 Summit.',
    flatNavigation: 'Moves up to 13 unobstructed squares in any of the 8 directions.',
    surfaceBoundNote:
      'Transitioning between Horizontal and Vertical surfaces changes which enemy pieces can legally check the King (except Pawns, which can check diagonally across surfaces).',
    diagramSubtitle: 'All 8 Compass Rays · Up to 13 Connected Tiles Below Summit (1-Tile on 4×4 Summit)',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Dir Sovereign Stride (1..13)' },
    ],
  },
  vanguard: {
    type: 'vanguard',
    name: 'Vanguard',
    symbol: '⛨',
    rangeBadge: '9 → 1 Forward (1-Tile 8-Dir on Summit) + Rook Swap',
    roleSummary: '20×20 Specialist · Contracting Forward Spearhead & Friendly Rook Teleporter',
    movementPattern:
      'Moves strictly FORWARD along its deployment axis (never retreats) below the summit, starting with 9-tile range in home territory and contracting irreversibly (9→8→7→6→5→4→3→2→1 tile). While occupying a 4×4 Summit tile, makes an ordinary move of 1 connected tile in any of the 8 directions (subject to capture restrictions), and resumes normal forward movement on the next turn after leaving the summit.',
    specialAbility:
      'Friendly Rook Exchange (V⇄R): Can switch board positions with any living Rook of its OWN team anywhere on the 20×20 board (consuming its turn).',
    pyramidNavigation:
      'Climbs straight up vertical cliff walls ahead; while perched on a Vertical Cliff Wall, unlocks SIDEWAYS movement and capture! On the 4×4 Summit, moves 1 connected tile in all 8 directions.',
    flatNavigation:
      'Sprints forward up to 9→1 tiles on 20×20 Flat and swaps positions with friendly Rooks.',
    surfaceBoundNote:
      'Obeys Same-Surface Combat & Blocking. Swapping with a friendly Rook exchanges both pieces’ current surface classes.',
    diagramSubtitle: 'Irreversible 9→1 Forward Sprint · Sideways on Walls · 1-Tile 8-Dir on Summit · Rook Swap',
    diagramLegend: [
      { color: 'bg-sky-500/45 border-sky-400 text-sky-200', label: 'Forward Sprint & Capture (9→1)' },
      { color: 'bg-purple-500/40 border-purple-400 text-purple-200', label: 'Wall-Only Sideways Step' },
      { color: 'bg-cyan-500/45 border-cyan-400 text-cyan-200', label: 'Own-Team Rook Swap (V⇄R)' },
    ],
  },
  gargoyle: {
    type: 'gargoyle',
    name: 'Gargoyle',
    symbol: '❖',
    rangeBadge: '2 Tiles Flat / 3 Pyramid (1-Tile on Summit)',
    roleSummary: '20×20 Specialist · Winged Cliff Sentinel & Ally Guard Aura',
    movementPattern:
      'Moves 2 tiles orthogonally/diagonally or L-hops on flat ground; awakens full 3-tile stride and winged cliff-perching on Pyramid terrain below the summit. While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit), resuming 3-tile Pyramid movement on the next turn after leaving.',
    specialAbility:
      'Stone Bulwark: +10 DEF & +15% Evasion on vertical walls (+6 DEF on terraces) and grants a 20% Damage Reduction Guard Aura to nearby allies.',
    pyramidNavigation:
      'Flies directly onto vertical cliff walls within 3 tiles and traverses terrace bends when starting below the summit; obeys the 1-tile 8-direction ordinary movement rule while occupying the 4×4 Summit.',
    flatNavigation: '2-tile omni-directional step and L-hop across the 20×20 Battlefield.',
    surfaceBoundNote:
      'When jumping, obeys the Jump Color Law (bound to starting tile color until reaching the 4×4 Summit). Same-surface combat only.',
    diagramSubtitle: '2-Tile Flat / 3-Tile Pyramid Stride (1-Tile 8-Dir Step While on 4×4 Summit)',
    diagramLegend: [
      { color: 'bg-emerald-500/45 border-emerald-400 text-emerald-200', label: '2-Tile Base Stride & L-Hop' },
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '3-Tile Awakened Pyramid Reach' },
    ],
  },
  ascendant: {
    type: 'ascendant',
    name: 'Ascendant',
    symbol: '✦',
    rangeBadge: 'Stage I–III (2 → 3 → 4 Tiles · 1-Tile on Summit)',
    roleSummary: '20×20 Specialist · Evolving 8-Direction Strider & Elevation Champion',
    movementPattern:
      'Moves in all 8 directions along connected surfaces, evolving from Stage I (2 tiles) → Stage II (3 tiles) → Stage III (4 tiles) as it advances and climbs. While occupying a 4×4 Summit tile, ordinary movement is 1 connected tile in any of the 8 directions (including when leaving the summit), and normal Stage stride resumes on the next turn after leaving without losing progression state.',
    specialAbility:
      'Elevation Resonance: Gains permanent +2 ATK/+2 DEF/+8 HP heal on every tier climb, +4 ATK/+3 DEF/+5% Crit per tier occupied, and ignores uphill penalties.',
    pyramidNavigation:
      'Scales vertical cliff walls and terraces seamlessly (up to 4 tiles on Tier 3); obeys the 1-tile 8-direction movement limit while standing on the 4×4 Summit.',
    flatNavigation:
      'Advances across the 20×20 Flat board to evolve its stride from 2 → 3 → 4 tiles.',
    surfaceBoundNote:
      'Non-jumping surface strider; obeys Same-Surface Combat and Cross-Surface Blocking.',
    diagramSubtitle: '8-Direction Evolving Stride: Stage I (2) → Stage II (3) → Stage III (4) (1-Tile on Summit)',
    diagramLegend: [
      { color: 'bg-sky-500/45 border-sky-400 text-sky-200', label: 'Stage I: 2 Tiles' },
      { color: 'bg-purple-500/40 border-purple-400 text-purple-200', label: 'Stage II: 3 Tiles' },
      { color: 'bg-amber-500/45 border-amber-400 text-amber-200', label: 'Stage III: 4 Tiles' },
    ],
  },
  trebuchet: {
    type: 'trebuchet',
    name: 'Trebuchet',
    symbol: '☄',
    rangeBadge: '1–2 Jump-Capture · 3–6 Bombard (1-Tile Move on Summit)',
    roleSummary: '20×20 Specialist · Jump-Capturer & 3-Tile Knockback Siege Artillery',
    movementPattern:
      'Repositions 1–2 orthogonal tiles onto empty horizontal ground below the summit (or 1 connected horizontal tile in any of the 8 directions while occupying the 4×4 Summit), OR physically jumps onto an enemy piece within 1–2 tiles to CAPTURE it. Cannot climb vertical cliff walls.',
    specialAbility:
      'Knockback Bombardment (☄): Fires 3–6 tiles away to knock an enemy piece back 3 tiles onto any random open tile (does NOT capture). If the Trebuchet gets on the Pyramid (Tier 1+), it can ONLY bombard targets on the 4×4 Summit!',
    pyramidNavigation:
      'Can climb onto horizontal Pyramid terraces (Tier 1+); once on the Pyramid, its Bombardment is restricted exclusively to targets on the 4×4 Summit, and while on the 4×4 Summit its ordinary non-capture move is 1 connected horizontal tile in any of the 8 directions.',
    flatNavigation:
      'Jumps 1–2 tiles onto enemies to capture them, or bombards 3–6 tiles along 8 rays to knock enemies back 3 tiles.',
    surfaceBoundNote:
      'Occupies Horizontal Surfaces only; in Surface Bound mode, only interacts with Horizontal-Surface targets.',
    diagramSubtitle: '1–2 Tile Jump-Capture (⚔) · 3–6 Tile Bombardment Knocks Target Back 3 Tiles (☄⇢3)',
    diagramLegend: [
      { color: 'bg-rose-500/45 border-rose-400 text-rose-200', label: '1–2 Tile Jump-Capture (⚔)' },
      { color: 'bg-sky-500/40 border-sky-400 text-sky-200', label: '1–2 Tile Move (1-Tile 8-Dir on Summit)' },
      { color: 'bg-amber-500/45 border-amber-400 text-amber-200', label: 'Bombard (☄ Knocks Back 3 Tiles)' },
    ],
  },
  solar_queen: {
    type: 'solar_queen',
    name: 'Solar Queen',
    symbol: '♕',
    rangeBadge: 'Apex · Unlimited (1-Tile on Summit)',
    roleSummary: 'Summit Apex Ascended Queen',
    movementPattern: 'Unlimited 8-direction connected surface movement (1 connected tile in all 8 directions while occupying the 4×4 Summit).',
    specialAbility: 'Summit Apex promotion class.',
    pyramidNavigation: 'Full multi-tier traversal (1-tile 8-direction limit while on the 4×4 Summit).',
    flatNavigation: 'Full 8-way slide.',
    surfaceBoundNote: 'Same-surface combat.',
    diagramSubtitle: 'All 8 Compass Rays · Unlimited Range Below Summit',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Direction Slide & Capture' },
    ],
  },
  archon_templar: {
    type: 'archon_templar',
    name: 'Archon Templar',
    symbol: '⚔',
    rangeBadge: 'Apex · Multi-Ray (1-Tile on Summit)',
    roleSummary: 'Summit Apex Ascended Champion',
    movementPattern: 'Unlimited 8-direction connected surface movement (1 connected tile in all 8 directions while occupying the 4×4 Summit).',
    specialAbility: 'Summit Apex promotion class.',
    pyramidNavigation: 'Full multi-tier traversal (1-tile 8-direction limit while on the 4×4 Summit).',
    flatNavigation: 'Full 8-way slide.',
    surfaceBoundNote: 'Same-surface combat.',
    diagramSubtitle: 'All 8 Compass Rays · Unlimited Range Below Summit',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Direction Slide & Capture' },
    ],
  },
  chrono_mage: {
    type: 'chrono_mage',
    name: 'Chrono Mage',
    symbol: '✧',
    rangeBadge: 'Apex · Multi-Ray (1-Tile on Summit)',
    roleSummary: 'Summit Apex Ascended Mage',
    movementPattern: 'Unlimited 8-direction connected surface movement (1 connected tile in all 8 directions while occupying the 4×4 Summit).',
    specialAbility: 'Summit Apex promotion class.',
    pyramidNavigation: 'Full multi-tier traversal (1-tile 8-direction limit while on the 4×4 Summit).',
    flatNavigation: 'Full 8-way slide.',
    surfaceBoundNote: 'Same-surface combat.',
    diagramSubtitle: 'All 8 Compass Rays · Unlimited Range Below Summit',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Direction Slide & Capture' },
    ],
  },
  titan_golem: {
    type: 'titan_golem',
    name: 'Titan Golem',
    symbol: '⛫',
    rangeBadge: 'Apex · Juggernaut (1-Tile on Summit)',
    roleSummary: 'Summit Apex Ascended Juggernaut',
    movementPattern: 'Unlimited 8-direction connected surface movement (1 connected tile in all 8 directions while occupying the 4×4 Summit).',
    specialAbility: 'Summit Apex promotion class.',
    pyramidNavigation: 'Full multi-tier traversal (1-tile 8-direction limit while on the 4×4 Summit).',
    flatNavigation: 'Full 8-way slide.',
    surfaceBoundNote: 'Same-surface combat.',
    diagramSubtitle: 'All 8 Compass Rays · Unlimited Range Below Summit',
    diagramLegend: [
      { color: 'bg-amber-500/40 border-amber-400 text-amber-200', label: '8-Direction Slide & Capture' },
    ],
  },
};

/**
 * Interactive 7×7 Tactical Grid Diagram illustrating the exact movement, capture,
 * and special ability geometry of any selected piece (with Normal vs. 4×4 Summit toggle).
 */
export const PieceMovementDiagram: React.FC<{
  pieceType: PieceType;
  isPyramidBoard?: boolean;
}> = ({ pieceType, isPyramidBoard = true }) => {
  const [trebPyramidView, setTrebPyramidView] = useState(false);
  const [summitView, setSummitView] = useState(false);
  const spec = PIECE_CAPABILITY_SPECS[pieceType] || PIECE_CAPABILITY_SPECS.pawn;

  // 7x7 grid with center at (3, 3), except Vanguard which sits at row 5 (bottom-center) in normal view to show forward sprint
  const originR = pieceType === 'vanguard' && !summitView ? 5 : 3;
  const originC = 3;

  const getCellStyle = (r: number, c: number): { classes: string; label: string; title?: string } => {
    const dr = originR - r; // positive = North (Forward)
    const dc = c - originC; // positive = East (Right)
    const adr = Math.abs(dr);
    const adc = Math.abs(dc);
    const cheb = Math.max(adr, adc);

    if (r === originR && c === originC) {
      return {
        classes:
          'bg-amber-400 text-slate-950 border-2 border-white font-black shadow-md shadow-amber-500/30 scale-105 z-10',
        label: spec.symbol,
        title: `${spec.name} (${summitView ? 'Occupying 4×4 Summit Tile' : 'Origin Square'})`,
      };
    }

    // 4x4 Summit 1-Tile Rule View for Non-Knight Pieces
    if (summitView && pieceType !== 'knight') {
      if (pieceType === 'pawn') {
        if (dr === 1 && adc === 1) {
          return {
            classes: 'bg-rose-500/55 border-rose-400 text-rose-100 font-bold',
            label: '⚔/•',
            title: '4×4 Summit Pawn: 1-Tile Ordinary Move onto Empty Tile (•) OR Forward-Diagonal Capture (⚔)',
          };
        }
        if (cheb === 1) {
          return {
            classes: 'bg-sky-500/45 border-sky-400 text-sky-100 font-bold',
            label: '•1',
            title: '4×4 Summit Pawn: 1-Tile 8-Direction Ordinary Move ONLY (Does NOT Capture in This Direction)',
          };
        }
        return {
          classes: 'bg-slate-900/70 border-slate-800/80 text-slate-700',
          label: '',
        };
      }

      if (pieceType === 'trebuchet') {
        if (cheb === 1) {
          return {
            classes: 'bg-sky-500/45 border-sky-300 text-sky-100 font-bold',
            label: '•/⚔',
            title: '4×4 Summit Trebuchet: 1-Tile 8-Direction Ordinary Move onto Empty Tile (•) OR Jump-Capture (⚔)',
          };
        }
        if (cheb === 2) {
          return {
            classes: 'bg-rose-500/45 border-rose-400 text-rose-100 font-bold',
            label: '⚔',
            title: 'Trebuchet 2-Tile Jump-Capture (Preserved on Summit)',
          };
        }
        if (r === 0 && c >= 2 && c <= 4) {
          return {
            classes: 'bg-amber-500/55 border-amber-300 text-amber-100 font-bold',
            label: '☄4×4',
            title: 'On-Pyramid Bombardment: Targets 4×4 Summit Tiles Only (Knocks Back 3 Tiles)',
          };
        }
        return {
          classes: 'bg-slate-900/70 border-slate-800/80 text-slate-700',
          label: '',
        };
      }

      if ((pieceType === 'vanguard' || pieceType === 'rook') && r === 1 && c === 5) {
        return {
          classes: 'bg-cyan-500/50 border-cyan-300 text-cyan-100 font-bold',
          label: 'V⇄R',
          title: 'Friendly Rook Exchange (Preserved on 20×20 Board)',
        };
      }

      if (cheb === 1) {
        const isVanguardNonForward = pieceType === 'vanguard' && !(dr === 1 && dc === 0);
        return {
          classes: isVanguardNonForward
            ? 'bg-sky-500/45 border-sky-400 text-sky-100 font-bold'
            : 'bg-amber-500/50 border-amber-400 text-amber-100 font-bold',
          label: isVanguardNonForward ? '•1' : '1⚔',
          title: isVanguardNonForward
            ? '4×4 Summit Rule: 1-Tile Connected Ordinary Move in Any of the 8 Directions (Non-Capture)'
            : '4×4 Summit Rule: 1-Tile Connected Move & Capture in All 8 Directions (Normal Range Resumes Next Turn After Leaving Summit)',
        };
      }

      return {
        classes: 'bg-slate-900/70 border-slate-800/80 text-slate-700',
        label: '',
      };
    }

    switch (pieceType) {
      case 'pawn': {
        // Forward 1 or Sideways 1
        if ((dr === 1 && dc === 0) || (dr === 0 && adc === 1)) {
          return {
            classes: 'bg-sky-500/40 border-sky-400/80 text-sky-100 font-bold',
            label: dr === 1 ? '↑' : dc < 0 ? '←' : '→',
            title: '1-Tile Move (Empty Square Only)',
          };
        }
        // Initial 2-step forward
        if (dr === 2 && dc === 0) {
          return {
            classes: 'bg-sky-500/25 border-sky-400/50 border-dashed text-sky-200',
            label: '2',
            title: '2-Tile Initial Forward Advance',
          };
        }
        // Forward-diagonal capture
        if (dr === 1 && adc === 1) {
          return {
            classes: 'bg-rose-500/50 border-rose-400 text-rose-100 font-bold',
            label: '⚔',
            title: 'Forward-Diagonal Capture Only (Works Cross-Surface in Surface Bound!)',
          };
        }
        // Pyramid 1-step backward retreat
        if (dr === -1 && dc === 0) {
          return {
            classes: isPyramidBoard
              ? 'bg-indigo-500/40 border-indigo-400/80 text-indigo-100 font-bold'
              : 'bg-indigo-500/20 border-indigo-400/40 border-dashed text-indigo-300',
            label: '↓P',
            title: 'Pyramid Boards Only: 1-Tile Backward Step (Non-Capture)',
          };
        }
        break;
      }

      case 'knight': {
        if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) {
          return {
            classes: 'bg-emerald-500/50 border-emerald-400 text-emerald-100 font-bold',
            label: '♞⚔',
            title: 'L-Jump Destination (Leaps Over Intervening Pieces)',
          };
        }
        if (cheb === 1) {
          return {
            classes: 'bg-slate-800/70 border-slate-700 text-slate-500',
            label: '×',
            title: 'Jumped Over (Blockers Ignored)',
          };
        }
        break;
      }

      case 'bishop': {
        if (adr === adc && adr > 0) {
          const isEdge = adr === 3;
          return {
            classes: 'bg-sky-500/40 border-sky-400/80 text-sky-100 font-bold',
            label: isEdge ? '13' : '•',
            title: 'Diagonal Slide & Capture (Up to 13 Connected Tiles)',
          };
        }
        break;
      }

      case 'rook': {
        if (r === 1 && c === 5) {
          return {
            classes: 'bg-cyan-500/45 border-cyan-300 text-cyan-100 font-bold',
            label: 'V⇄R',
            title: 'Can Swap Positions with Friendly Vanguard Anywhere on 20×20 Board',
          };
        }
        if ((adr === 0 || adc === 0) && cheb > 0) {
          const isEdge = cheb === 3;
          return {
            classes: 'bg-sky-500/40 border-sky-400/80 text-sky-100 font-bold',
            label: isEdge ? '18' : '•',
            title: 'Orthogonal Slide & Capture (Up to 18 Connected Tiles)',
          };
        }
        break;
      }

      case 'queen':
      case 'solar_queen':
      case 'archon_templar':
      case 'chrono_mage':
      case 'titan_golem': {
        if (adr === 0 || adc === 0 || adr === adc) {
          const isEdge = cheb === 3;
          return {
            classes: 'bg-amber-500/40 border-amber-400/80 text-amber-100 font-bold',
            label: isEdge ? '∞' : '•',
            title: '8-Direction Unlimited Slide & Capture',
          };
        }
        break;
      }

      case 'king': {
        if (adr === 0 || adc === 0 || adr === adc) {
          const isEdge = cheb === 3;
          return {
            classes: 'bg-amber-500/40 border-amber-400/80 text-amber-100 font-bold',
            label: isEdge ? '13' : '•',
            title: '8-Direction Sovereign Stride (Up to 13 Connected Tiles · Cannot Enter Check)',
          };
        }
        break;
      }

      case 'vanguard': {
        // Forward column (c === 3, r < 5)
        if (dc === 0 && dr > 0) {
          const isTop = r === 0;
          return {
            classes: 'bg-sky-500/45 border-sky-400 text-sky-100 font-bold',
            label: isTop ? '9→1' : '↑',
            title: 'Forward-Only Sprint & Capture (Contracts 9 → 1 as Vanguard Advances)',
          };
        }
        // Sideways on Vertical Cliff Walls
        if (dr === 0 && adc >= 1 && adc <= 2) {
          return {
            classes: 'bg-purple-500/40 border-purple-400 border-dashed text-purple-100 font-bold',
            label: '⇄W',
            title: 'Vertical Cliff Wall Exception: Sideways Move & Capture on Walls',
          };
        }
        // Friendly Rook Exchange
        if (r === 1 && c === 5) {
          return {
            classes: 'bg-cyan-500/50 border-cyan-300 text-cyan-100 font-bold',
            label: 'V⇄R',
            title: 'Friendly Rook Exchange: Switches Positions with Own-Team Rook Only',
          };
        }
        break;
      }

      case 'gargoyle': {
        if (cheb === 1) {
          return {
            classes: 'bg-emerald-500/45 border-emerald-400 text-emerald-100 font-bold',
            label: '•',
            title: '1-Tile Step (Flat & Pyramid)',
          };
        }
        if (cheb === 2) {
          const isKnightHop = (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
          return {
            classes: 'bg-emerald-500/45 border-emerald-400 text-emerald-100 font-bold',
            label: isKnightHop ? '❖' : '2',
            title: '2-Tile Winged Hop / Stride (Flat & Pyramid)',
          };
        }
        if (cheb === 3 && (adr === 0 || adc === 0 || adr === adc)) {
          return {
            classes: 'bg-amber-500/40 border-amber-400 border-dashed text-amber-100 font-bold',
            label: '3P',
            title: 'Awakened 3-Tile Pyramid & Vertical Cliff Reach (+Stone Bulwark)',
          };
        }
        break;
      }

      case 'ascendant': {
        if (adr === 0 || adc === 0 || adr === adc) {
          if (cheb === 1) {
            return {
              classes: 'bg-sky-500/45 border-sky-400 text-sky-100 font-bold',
              label: '•',
              title: 'Stage I–III Connected Surface Stride',
            };
          }
          if (cheb === 2) {
            return {
              classes: 'bg-sky-500/45 border-sky-400 text-sky-100 font-bold',
              label: 'I:2',
              title: 'Stage I Base Stride (2 Tiles)',
            };
          }
          if (cheb === 3) {
            return {
              classes: 'bg-amber-500/45 border-amber-400 text-amber-100 font-bold',
              label: '3→4',
              title: 'Stage II (3 Tiles) → Stage III (4 Tiles on High Tiers)',
            };
          }
        }
        break;
      }

      case 'trebuchet': {
        if (trebPyramidView) {
          // On the Pyramid view: show 4x4 Summit target zone & 1-2 tile jump-capture
          const isSummitZone = r >= 1 && r <= 2 && c >= 2 && c <= 4;
          if (isSummitZone) {
            return {
              classes: 'bg-amber-500/55 border-amber-300 text-amber-100 font-bold',
              label: '☄4×4',
              title: 'On-Pyramid Rule: Can ONLY Bombard Targets on the 4×4 Summit (Knocks Back 3 Tiles!)',
            };
          }
          if (cheb <= 2) {
            const isOrtho = adr === 0 || adc === 0;
            return {
              classes: 'bg-rose-500/45 border-rose-400 text-rose-100 font-bold',
              label: isOrtho ? '⚔/•' : '⚔',
              title: '1–2 Tile Jump-Capture (Must Jump on Piece to Capture It!)',
            };
          }
        } else {
          // Ground / Standard view:
          // Distance 1-2: Jump-Capture (all squares in 2-tile radius) + Orthogonal Reposition
          if (cheb >= 1 && cheb <= 2) {
            const isOrtho = adr === 0 || adc === 0;
            return {
              classes: isOrtho
                ? 'bg-rose-500/45 border-sky-300 text-rose-100 font-bold'
                : 'bg-rose-500/40 border-rose-400/80 text-rose-100 font-bold',
              label: isOrtho ? '⚔/•' : '⚔',
              title: isOrtho
                ? '1–2 Tile Orthogonal Move (•) OR Jump-Capture Enemy (⚔)'
                : '1–2 Tile Jump-Capture Enemy (⚔ Must Jump on Piece to Capture)',
            };
          }
          // Distance 3+: Ranged Bombardment along 8 rays (knocks enemy back 3 tiles!)
          if (cheb === 3 && (adr === 0 || adc === 0 || adr === adc)) {
            return {
              classes: 'bg-amber-500/50 border-amber-400 text-amber-100 font-bold',
              label: '☄⇢3',
              title: 'Bombardment (Range 3–6): Knocks Enemy Piece Back 3 Tiles onto Any Random Open Tile!',
            };
          }
        }
        break;
      }
    }

    return {
      classes: 'bg-slate-900/70 border-slate-800/80 text-slate-700',
      label: '',
    };
  };

  return (
    <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-800 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
            Interactive Movement &amp; Range Diagram
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {isPyramidBoard && (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-amber-500/40">
              <button
                type="button"
                onClick={() => setSummitView(false)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  !summitView
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Below Summit
              </button>
              <button
                type="button"
                onClick={() => setSummitView(true)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  summitView
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                On 4×4 Summit
              </button>
            </div>
          )}

          {pieceType === 'trebuchet' && !summitView && (
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setTrebPyramidView(false)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  !trebPyramidView
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ground (3–6 Ray)
              </button>
              <button
                type="button"
                onClick={() => setTrebPyramidView(true)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                  trebPyramidView
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                On Pyramid (4×4 Only)
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-slate-300 leading-snug">
        {summitView
          ? pieceType === 'knight'
            ? '4×4 Summit Exemption: Knight retains its full legal jump mobility on the 4×4 Summit!'
            : pieceType === 'pawn'
            ? '4×4 Summit Rule: 1-Tile Ordinary Move in All 8 Directions (•1) · Capture Strictly Forward-Diagonal (⚔)'
            : '4×4 Summit Rule: 1-Tile Connected Move in All 8 Directions (Normal Range Resumes Next Turn After Leaving Summit)'
          : spec.diagramSubtitle}
      </p>

      {/* 7x7 Visual Grid */}
      <div className="flex justify-center py-1">
        <div className="grid grid-cols-7 gap-1 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner">
          {Array.from({ length: 7 }).map((_, r) =>
            Array.from({ length: 7 }).map((__, c) => {
              const cell = getCellStyle(r, c);
              return (
                <div
                  key={`${r}-${c}`}
                  title={cell.title}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center text-[10px] font-mono select-none transition-transform ${cell.classes}`}
                >
                  {cell.label}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {spec.diagramLegend.map((item, idx) => (
          <span
            key={idx}
            className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${item.color}`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

interface PieceCapabilitiesDropdownProps {
  boardType: BoardType;
  armyDeployment?: ArmyDeployment;
  gameMode: GameMode;
  playStyle: PlayStyle;
  pieces: Piece[];
  onFocusPiece?: (pieceId: string) => void;
}

export const PieceCapabilitiesDropdown: React.FC<PieceCapabilitiesDropdownProps> = ({
  boardType,
  gameMode,
  playStyle,
  pieces,
  onFocusPiece,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<PieceType>('trebuchet');

  const isPyramidBoard = boardType === 'pyramid' || boardType === 'quick_pyramid';

  // Pieces active in the current mode or currently alive on the board
  const modePieceTypes = useMemo<PieceType[]>(() => {
    const base: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
    if (boardType === 'pyramid' || boardType === 'battlefield') {
      base.push('vanguard', 'gargoyle', 'ascendant', 'trebuchet');
    }
    for (const p of pieces) {
      if (p.rpg.hp > 0 && !base.includes(p.type)) {
        base.push(p.type);
      }
    }
    return base;
  }, [boardType, pieces]);

  const effectiveSelectedType: PieceType = modePieceTypes.includes(selectedType)
    ? selectedType
    : modePieceTypes[0] || 'pawn';

  const spec =
    PIECE_CAPABILITY_SPECS[effectiveSelectedType] || PIECE_CAPABILITY_SPECS.pawn;

  const liveInstances = useMemo(
    () => pieces.filter((p) => p.type === effectiveSelectedType && p.rpg.hp > 0),
    [pieces, effectiveSelectedType]
  );

  const formatCoord = (x: number, y: number) => `${String.fromCharCode(65 + x)}${y + 1}`;

  return (
    <div className="relative pointer-events-auto">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Inspect All Pieces in Mode — Movement Diagram, Range & Navigation Capabilities"
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all whitespace-nowrap ${
          isOpen
            ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10'
            : 'bg-slate-900/95 hover:bg-slate-800 border-amber-500/40 text-amber-300 hover:text-white'
        }`}
      >
        <Compass className="w-3.5 h-3.5 text-amber-400" />
        <span>Piece Capabilities &amp; Range</span>
        <span className="hidden md:inline text-[10px] font-mono text-amber-400/90">
          ({modePieceTypes.length})
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-12 sm:top-full sm:mt-2 sm:w-[440px] max-h-[82vh] overflow-y-auto rounded-2xl bg-slate-950/98 border border-amber-500/40 shadow-2xl backdrop-blur-xl p-3.5 space-y-3 z-50 text-white select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-white">
                  Piece Capabilities, Range &amp; Diagram
                </h3>
                <p className="text-[10px] text-slate-400">
                  {boardType === 'pyramid'
                    ? '20×20 Grand Pyramid'
                    : boardType === 'quick_pyramid'
                    ? '12×12 Quick Pyramid'
                    : boardType === 'battlefield'
                    ? '20×20 Battlefield Flat'
                    : '8×8 Classic Flat'}{' '}
                  · {playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface'} ·{' '}
                  {gameMode === 'rpg' ? 'RPG Combat' : 'Standard'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Piece Capabilities Dropdown"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Piece Selector Selector + Quick Grid */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Select Piece in Current Mode ({modePieceTypes.length})
              </label>
              <span className="text-[10px] font-mono text-emerald-300">
                {liveInstances.length} Active on Board
              </span>
            </div>

            <select
              value={effectiveSelectedType}
              onChange={(e) => setSelectedType(e.target.value as PieceType)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
            >
              {modePieceTypes.map((pType) => {
                const s = PIECE_CAPABILITY_SPECS[pType];
                const count = pieces.filter((p) => p.type === pType && p.rpg.hp > 0).length;
                return (
                  <option key={pType} value={pType}>
                    {s.symbol} {s.name.toUpperCase()} — {s.rangeBadge} ({count} on board)
                  </option>
                );
              })}
            </select>

            <div className="flex flex-wrap gap-1 pt-0.5">
              {modePieceTypes.map((pType) => {
                const s = PIECE_CAPABILITY_SPECS[pType];
                const isSelected = pType === effectiveSelectedType;
                return (
                  <button
                    key={pType}
                    type="button"
                    onClick={() => setSelectedType(pType)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{s.symbol}</span>
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Piece Banner */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-xl text-amber-300">
                {spec.symbol}
              </div>
              <div>
                <div className="text-xs font-black uppercase text-white">{spec.name}</div>
                <div className="text-[10px] text-slate-400">{spec.roleSummary}</div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono font-bold text-amber-300 whitespace-nowrap">
              {spec.rangeBadge}
            </span>
          </div>

          {/* Interactive 7x7 Movement Diagram */}
          <PieceMovementDiagram
            pieceType={effectiveSelectedType}
            isPyramidBoard={isPyramidBoard}
          />

          {/* Written Capabilities Breakdown */}
          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300 mb-1">
                <Swords className="w-3.5 h-3.5" />
                <span>Movement &amp; Capture Pattern</span>
              </div>
              <p className="text-slate-200 leading-relaxed">{spec.movementPattern}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Special Capabilities</span>
              </div>
              <p className="text-slate-200 leading-relaxed">{spec.specialAbility}</p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isPyramidBoard
                    ? '3D Pyramid & Vertical Cliff Navigation'
                    : 'Flat Board Navigation'}
                </span>
              </div>
              <p className="text-slate-200 leading-relaxed">
                {isPyramidBoard ? spec.pyramidNavigation : spec.flatNavigation}
              </p>
            </div>

            {isPyramidBoard && (
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/35">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300 mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  <span>
                    Surface Bound Rule (
                    {playStyle === 'surface_bound' ? 'ACTIVE' : 'Reference'})
                  </span>
                </div>
                <p className="text-purple-100/90 leading-relaxed">{spec.surfaceBoundNote}</p>
              </div>
            )}
          </div>

          {/* Live Board Camera Focus Chips */}
          {liveInstances.length > 0 && onFocusPiece && (
            <div className="pt-1 border-t border-slate-800/80">
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3 text-amber-400" />
                <span>Click to Focus Camera on Board ({liveInstances.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {liveInstances.map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => onFocusPiece(inst.id)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
                      inst.color === 'white'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/30'
                        : 'bg-purple-500/15 border-purple-500/40 text-purple-200 hover:bg-purple-500/30'
                    }`}
                  >
                    {inst.color === 'white' ? 'W' : 'B'}@
                    {formatCoord(inst.position.x, inst.position.y)}
                    {inst.position.isVerticalWall
                      ? '(Wall)'
                      : inst.position.tier > 0
                      ? `(T${inst.position.tier})`
                      : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
