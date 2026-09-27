import React, { useState } from 'react';
import { BoardType, Piece, PieceType, PlayStyle } from '../types/chess';
import { downloadCompleteGameGuideTxt } from '../data/completeGameGuideText';
import { PieceMovementDiagram } from './PieceCapabilitiesDropdown';
import { CodexQuestionnaireSection } from './CodexQuestionnaireSection';
import { PieceWorkshopSection } from './PieceWorkshopSection';
import {
  X,
  Shield,
  ShieldAlert,
  Swords,
  ChevronRight,
  BookOpen,
  Layers,
  Crown,
  Grid,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Move,
  Award,
  Sparkles,
  Eye,
  Compass,
  Download,
  Dices,
  Brain,
  ListChecks,
  Sliders,
} from 'lucide-react';

interface PieceInfo {
  type: PieceType;
  name: string;
  subtitle: string;
  icon: string;
  badge?: string;
  horizontalMovement: string;
  verticalMovement: string;
  surfaceBoundRule: string;
  tacticalRole: string;
  rpgStats: {
    hp: number;
    atk: number;
    def: number;
    evasion: number;
    critChance: number;
  };
  keyTraits: string[];
}

/**
 * Custom Staunton-inspired architectural SVG icons for the specialist pieces
 * (Gargoyle, Ascendant, Trebuchet, Vanguard) and classic chess pieces.
 */
export const PieceCodexIcon: React.FC<{
  type: PieceType;
  size?: 'sm' | 'md' | 'lg';
}> = ({ type, size = 'md' }) => {
  const dim = size === 'lg' ? 'w-10 h-10' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  if (type === 'gargoyle') {
    // Winged Stone Bulwark Sentinel (Gothic Winged Chess Piece on Staunton Pedestal)
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} shrink-0`}
      >
        {/* Staunton Pedestal Base */}
        <path
          d="M8 31H28L26.5 28H9.5L8 31Z"
          fill="currentColor"
          fillOpacity="0.9"
        />
        <rect x="10.5" y="25.5" width="15" height="2" rx="1" fill="#FBBF24" />
        {/* Swept Gothic Stone Wings */}
        <path
          d="M18 15L6 8.5C5.5 13 7.5 17.5 11.5 20L14 17.5L18 15Z"
          fill="#38BDF8"
          fillOpacity="0.35"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M18 15L30 8.5C30.5 13 28.5 17.5 24.5 20L22 17.5L18 15Z"
          fill="#38BDF8"
          fillOpacity="0.35"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Wing Rib Filigree */}
        <path d="M15 14L8 12.5M21 14L28 12.5" stroke="#FBBF24" strokeWidth="1.1" strokeLinecap="round" />
        {/* Sculpted Stone Torso & Perch Claws */}
        <path
          d="M13.5 25.5L15 13.5H21L22.5 25.5H13.5Z"
          fill="currentColor"
          stroke="#FBBF24"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Horned Gargoyle Crest & Head */}
        <path
          d="M14.5 13L12.5 6.5L16 10H20L23.5 6.5L21.5 13H14.5Z"
          fill="#FBBF24"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        {/* Glowing Sentinel Eyes */}
        <circle cx="16.6" cy="11.5" r="0.9" fill="#0F172A" />
        <circle cx="19.4" cy="11.5" r="0.9" fill="#0F172A" />
      </svg>
    );
  }

  if (type === 'ascendant') {
    // Stepped Ziggurat Spire with Ascending Stage I-II-III Rings & Radiant Octahedron Apex
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} shrink-0`}
      >
        {/* Staunton Pedestal Base */}
        <path d="M7 31.5H29L27.5 28.5H8.5L7 31.5Z" fill="currentColor" />
        {/* Tier 1 Lower Stepped Ziggurat */}
        <path
          d="M9.5 28.5L11 23.5H25L26.5 28.5H9.5Z"
          fill="currentColor"
          fillOpacity="0.85"
          stroke="#38BDF8"
          strokeWidth="1.2"
        />
        {/* Tier 2 Middle Stepped Ziggurat */}
        <path
          d="M12 23.5L13.5 18.5H22.5L24 23.5H12Z"
          fill="currentColor"
          fillOpacity="0.9"
          stroke="#10B981"
          strokeWidth="1.2"
        />
        {/* Tier 3 Upper Stepped Ziggurat */}
        <path
          d="M14.5 18.5L15.8 14H20.2L21.5 18.5H14.5Z"
          fill="currentColor"
          stroke="#FBBF24"
          strokeWidth="1.3"
        />
        {/* Ascending Resonance Halo Arc */}
        <ellipse
          cx="18"
          cy="14"
          rx="8.5"
          ry="2.3"
          stroke="#A855F7"
          strokeWidth="1.2"
          strokeDasharray="2 1.5"
        />
        {/* Radiant Octahedron Summit Star */}
        <path
          d="M18 3.5L22.5 8.5L18 13.5L13.5 8.5L18 3.5Z"
          fill="#FBBF24"
          stroke="#FEF08A"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M18 3.5V13.5M13.5 8.5H22.5" stroke="#B45309" strokeWidth="1" />
      </svg>
    );
  }

  if (type === 'trebuchet') {
    // Counterweight Siege Engine on Staunton Chess Pedestal with Flaming Bombard Orb
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} shrink-0`}
      >
        {/* Staunton Pedestal Base */}
        <path d="M7 31.5H29L27.5 28.5H8.5L7 31.5Z" fill="currentColor" />
        <rect x="9.5" y="26.5" width="17" height="2" rx="0.8" fill="#FBBF24" />
        {/* Heavy A-Frame Siege Truss */}
        <path
          d="M11.5 26.5L17.5 13.5L23.5 26.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M13.5 22H21.5" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
        {/* Pivoted Throwing Arm Beam */}
        <path
          d="M8.5 18.5L27.5 8.5"
          stroke="#FBBF24"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        {/* Pivot Axle Hub */}
        <circle cx="17.5" cy="13.8" r="2.1" fill="#0F172A" stroke="#FBBF24" strokeWidth="1.4" />
        {/* Hanging Counterpoise Weight Box (Left) */}
        <path d="M10.5 17.5V22" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 22H13L13.8 25.5H7.2L8 22Z"
          fill="#38BDF8"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        {/* Blazing Siege Boulder Projectile (Top Right) */}
        <circle
          cx="28.5"
          cy="7.5"
          r="3.4"
          fill="#F97316"
          stroke="#FDE047"
          strokeWidth="1.3"
        />
        <path
          d="M25.5 5.2C23.5 4.2 21.8 4.8 20.5 6"
          stroke="#FB7185"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'vanguard') {
    // Swept Spearhead Lancer & Rook-Exchange Shield Beacon
    return (
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dim} shrink-0`}
      >
        <path d="M8 31H28L26.5 28H9.5L8 31Z" fill="currentColor" />
        <rect x="10.5" y="25.5" width="15" height="2" rx="1" fill="#10B981" />
        {/* Twin Heraldic Swept Shields */}
        <path
          d="M18 12L9 15.5L11.5 23.5L18 21L24.5 23.5L27 15.5L18 12Z"
          fill="#10B981"
          fillOpacity="0.3"
          stroke="#34D399"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Spearhead Spire */}
        <path
          d="M18 4.5L22.5 13.5L18 25.5L13.5 13.5L18 4.5Z"
          fill="currentColor"
          stroke="#FBBF24"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <circle cx="18" cy="13.5" r="2" fill="#FBBF24" />
      </svg>
    );
  }

  const fallbackMap: Record<PieceType, string> = {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚',
    vanguard: '⛨',
    gargoyle: '❖',
    ascendant: '✦',
    trebuchet: '☄',
    archon_templar: '⚜',
    chrono_mage: '⌛',
    solar_queen: '☀',
    titan_golem: '◆',
  };

  return (
    <span className={size === 'lg' ? 'text-3xl leading-none' : size === 'sm' ? 'text-sm leading-none' : 'text-lg leading-none'}>
      {fallbackMap[type]}
    </span>
  );
};

const PIECE_ROSTER: PieceInfo[] = [
  {
    type: 'pawn',
    name: 'Pawn',
    subtitle: 'Advancing Infantry & Directional Surface Climber',
    icon: '♟',
    badge: 'All Boards',
    horizontalMovement:
      'On Flat Boards (8×8 Classic & 20×20 Battlefield Flat), advances 1 square forward or 1 square laterally (sideways Left or Right) across unobstructed ground (2 squares forward on its initial step) and can NEVER move backward. Captures diagonally forward relative to its facing.',
    verticalMovement:
      'On Pyramid Boards ONLY (12×12 Quick Pyramid & 20×20 Grand Pyramid), Pawns can ALSO move 1 tile backward (in addition to 1 tile forward or sideways) along the continuous surface—and while occupying the 4×4 Summit, make an ordinary move of 1 connected tile in any of the 8 directions while keeping forward-diagonal-only capture. Promotes upon reaching the opposite back rank (never merely by reaching the Summit).',
    surfaceBoundRule:
      'Surface Bound Exception (Pawns Only): Pawns may attack and give check across horizontal and vertical Pyramid tiles, provided the target is within their legal forward-diagonal capture range (no backward captures, no straight-forward captures, and no extra movement range). Blocks opposite-surface sliding paths.',
    tacticalRole:
      'Advancing frontline infantry with forward + lateral maneuverability on all boards, 1-tile backward repositioning on Pyramid Boards, and 1-tile 8-direction movement on the 4×4 Summit. In Kingdom Deployment, West and East Flank Detachment Pawns march inward across the flanks.',
    rpgStats: { hp: 50, atk: 25, def: 12, evasion: 15, critChance: 10 },
    keyTraits: [
      'Forward + Sideways Advance',
      'Backward Move on Pyramid Boards Only',
      '8-Direction 1-Tile Move on 4×4 Summit',
      'Diagonal-Only Capture',
      'Opposite-Back-Rank Promotion',
    ],
  },
  {
    type: 'knight',
    name: 'Knight',
    subtitle: 'Jumper & Elevation Attacker (Summit Exempt)',
    icon: '♞',
    badge: 'All Boards · Summit Exempt',
    horizontalMovement:
      'Moves in the familiar Chess Knight pattern (2 squares in one axis, 1 square perpendicular). Leaps over intervening pieces without being blocked.',
    verticalMovement:
      'Jumping bypasses intermediate tiles. Evaluates destination by Pyramid Knight L-geometry across any connected elevation or directly onto vertical cliff tiles within leap range. Exempt from the 4×4 Summit 1-tile movement limit—retains its full legal summit jumping movement!',
    surfaceBoundRule:
      'Jump Color Law: Restricted to jumping onto the tile color (Light or Dark) it originally started on until it reaches the 4×4 Summit, which permanently releases the color restriction so it can use both colors. Jumping from the 4×4 Summit is restricted to legal Pyramid-base landing tiles. May only capture enemies on the same surface class.',
    tacticalRole:
      'Elevation jumper and cliff infiltrator that ignores intervening terrain and is the ONLY piece exempt from the 1-tile movement restriction on the 4×4 Summit.',
    rpgStats: { hp: 80, atk: 40, def: 18, evasion: 30, critChance: 15 },
    keyTraits: [
      'Ignores Intervening Path',
      'Exempt from 4×4 Summit 1-Tile Limit',
      'Direct Cliff Wall Perch',
      'High Evasion (30%)',
    ],
  },
  {
    type: 'bishop',
    name: 'Bishop',
    subtitle: 'Diagonal Control & Terrace Sniper (Range 13)',
    icon: '♝',
    badge: 'Range 13',
    horizontalMovement:
      'Controls diagonals across clear sightlines up to 13 tiles. Moves up to 13 connected tiles along unblocked diagonal paths across flat ground or connected terraces.',
    verticalMovement:
      'Continuous 13-tile diagonal range across the folded chessboard surface (horizontal ↔ vertical ↔ horizontal) when starting below the summit. While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit); normal 13-tile diagonal movement resumes on the next turn after leaving the summit.',
    surfaceBoundRule:
      'Naturally remains on its starting tile color during diagonal slides. Can transition onto diagonal wall tiles within its 13-tile range, but cannot capture across different surface classes. Opposite-surface pieces still physically block its diagonal path.',
    tacticalRole:
      'Long-range 13-tile diagonal control below the summit, and 1-tile 8-direction tactical control while occupying the 4×4 Summit.',
    rpgStats: { hp: 75, atk: 45, def: 14, evasion: 20, critChance: 20 },
    keyTraits: [
      '13-Tile Diagonal Range',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Diagonal Wall Scaling',
      '20% Critical Strike',
    ],
  },
  {
    type: 'rook',
    name: 'Rook',
    subtitle: 'Straight-Line Control & Rampart Siege (Range 18)',
    icon: '♜',
    badge: 'Range 18',
    horizontalMovement:
      'Controls straight lines (ranks and files) up to 18 tiles. Moves up to 18 connected tiles orthogonally through unblocked tiles across the valley, along terraces, or toward an elevation transition.',
    verticalMovement:
      'Continuous 18-tile straight-line orthogonal range along connected surface tiles when starting below the summit. While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit); normal 18-tile orthogonal range resumes on the next turn after leaving the summit. Also serves as the swap partner for friendly Vanguards.',
    surfaceBoundRule:
      'Can transition between Horizontal and Vertical surfaces along orthogonal lines within its 18-tile range. While horizontal, it can only capture horizontal enemies; while on a vertical wall, it can only capture vertical enemies. Opposite-surface pieces on its file or rank physically block its path and force it to stop before them.',
    tacticalRole:
      'Fortress anchor and 18-tile corridor lockdown below the summit, 1-tile 8-direction controller on the 4×4 Summit, and Vanguard Rook Exchange partner.',
    rpgStats: { hp: 105, atk: 50, def: 32, evasion: 5, critChance: 10 },
    keyTraits: [
      '18-Tile Orthogonal Range',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Lateral Wall Patrol',
      'Vanguard Swap Partner',
    ],
  },
  {
    type: 'queen',
    name: 'Queen',
    subtitle: 'Maximum Conventional Mobility (Rook + Bishop)',
    icon: '♛',
    badge: 'All Boards',
    horizontalMovement:
      'Combines the full powers of the Rook and Bishop. Moves any distance in straight lines or diagonals through clear terrain when starting below the summit.',
    verticalMovement:
      'Supreme multi-dimensional mobility combining Rook and Bishop over the continuous connected surface below the summit. While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit); full unlimited 8-direction range resumes on the next turn after leaving the summit.',
    surfaceBoundRule:
      'High mobility for repositioning between horizontal terraces and vertical walls, but cannot snipe across surface classes. Must first enter the target’s surface class to capture or deliver check, and is physically blocked by opposite-surface pieces on its ray.',
    tacticalRole:
      'Supreme tactical force and multi-elevation orchestrator. Commands open lines below the summit and steps off the 4×4 Summit to restore full multi-tier range.',
    rpgStats: { hp: 130, atk: 65, def: 28, evasion: 25, critChance: 25 },
    keyTraits: [
      'Rook + Bishop Combined',
      '1-Tile 8-Dir Move on 4×4 Summit',
      '25% Critical Strike',
      'Massive Combat Output (65 ATK)',
    ],
  },
  {
    type: 'king',
    name: 'King',
    subtitle: 'The Sovereign Objective of the Army (Range 13)',
    icon: '♚',
    badge: 'Range 13 · Sovereign',
    horizontalMovement:
      'Moves up to 13 connected squares in any of the 8 directions (4 orthogonal and 4 diagonal) through unobstructed paths when starting below the summit. Supports Kingside and Queenside Castling.',
    verticalMovement:
      'Moves up to 13 connected tiles in any of the 8 directions across the continuous surface below the summit. While occupying a 4×4 Summit tile, moves 1 connected tile in any of the 8 directions (resuming 13-tile range on the next turn after leaving the summit). The core rule remains absolute: The King cannot legally move into check.',
    surfaceBoundRule:
      'Can glide up to 13 connected tiles between Horizontal and Vertical surfaces, changing which enemies are legally allowed to attack or check it! A King on a Horizontal tile can only be checked by horizontal attackers; a King on a Vertical wall can only be checked by vertical attackers.',
    tacticalRole:
      'The sole victory objective of the game, armed with a commanding 13-tile omni-directional range below the summit and 1-tile 8-direction step on the 4×4 Summit.',
    rpgStats: { hp: 160, atk: 35, def: 32, evasion: 15, critChance: 12 },
    keyTraits: [
      'Sole Win Condition',
      '13-Tile Range (1-Tile on Summit)',
      'Cannot Move Into Check',
      'Royal Bastion (160 HP)',
    ],
  },
  {
    type: 'vanguard',
    name: 'Vanguard',
    subtitle: '20×20 Specialist · Rapid Deployment & Rook Exchange',
    icon: '⛨',
    badge: '20×20 Boards',
    horizontalMovement:
      'Moves forward ONLY along its deployment orientation (never backward, never sideways on horizontal tiles below the summit). Begins in deep home territory with a maximum range of 9 tiles forward, progressively contracting as it approaches the central conflict (9 → 8 → 7 → 6 → 5 → 4 → 3 → 2 → 1 tile at the center and beyond). Cannot jump over occupied tiles.',
    verticalMovement:
      'Vertical-Tile Exception: While physically occupying a vertical Pyramid cliff tile, the Vanguard gains sideways movement (and lateral capture) in addition to forward movement. 4×4 Summit Rule: While occupying a 4×4 Summit tile, makes an ordinary move of 1 connected tile in any of the 8 directions (subject to capture restrictions), and resumes normal forward movement on the next turn after leaving the summit. Exclusive Ability — Rook Exchange: May switch board positions with a living Rook of its OWN team anywhere on the 20×20 battlefield.',
    surfaceBoundRule:
      'Obeys Same-Surface Combat and Cross-Surface Blocking. Rook Exchange swaps both pieces’ current surface classes (a Rook swapped onto a vertical wall immediately becomes a vertical-surface piece).',
    tacticalRole:
      'Rapid deployment spearhead and long-distance Rook reinforcement unit placed on both 20×20 battlefields (2 Vanguards per side at files F & O).',
    rpgStats: { hp: 90, atk: 46, def: 24, evasion: 25, critChance: 15 },
    keyTraits: [
      '9 → 1 Forward Contraction',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Vertical-Wall Sideways',
      'Friendly Rook Exchange',
    ],
  },
  {
    type: 'gargoyle',
    name: 'Gargoyle',
    subtitle: '20×20 Specialist · Winged Stone Wall & Elevation Sentinel',
    icon: '❖',
    badge: '20×20 Boards',
    horizontalMovement:
      'Placed on the 20×20 Battlefield Flat and 20×20 Grand Pyramid outer wings (file E / x=4). On flat ground, steps or leaps up to 2 tiles orthogonally, diagonally, or in Knight L-hops.',
    verticalMovement:
      'While occupying any vertical Pyramid cliff wall or elevated terrace below the summit, awakens full 3-tile terrain mastery and Stone Bulwark (+10 DEF & +15% Evasion on vertical walls; +6 DEF & +10% Evasion on terraces; +20% Ally Guard Aura). While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit), and 3-tile Pyramid movement resumes on the next turn after leaving.',
    surfaceBoundRule:
      'When using jump/glide movement, obeys the Jump Color Law (restricted to its starting tile color until reaching the 4×4 Summit, which permanently releases it to use both colors), Summit-to-Base Jump Law, and Same-Surface Combat Law.',
    tacticalRole:
      '20×20 winged stone sentinel. Agile 2-tile leaper on flat ground, 3-tile rampart defender on Pyramid cliffs and terraces, and 1-tile 8-direction controller on the 4×4 Summit.',
    rpgStats: { hp: 80, atk: 42, def: 16, evasion: 35, critChance: 20 },
    keyTraits: [
      'Winged Leap & Cliff Mastery (2–3 Tiles)',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Stone Bulwark (+10 DEF / +15% EVA)',
      '20% Ally Guard Aura',
    ],
  },
  {
    type: 'ascendant',
    name: 'Ascendant',
    subtitle: '20×20 Specialist · Progressive Stride & Elevation Climber',
    icon: '✦',
    badge: '20×20 Boards',
    horizontalMovement:
      'Placed on the 20×20 Battlefield Flat and 20×20 Grand Pyramid outer wings (file P / x=15). Develops through three stages as it advances and climbs: Stage I (2 tiles) → Stage II (3 tiles) → Stage III (4 connected tiles orthogonally or diagonally).',
    verticalMovement:
      'Ascending and advancing unlock Elevation Stat Resonance (+4 ATK, +3 DEF, +5% Crit per tier) plus permanent stat tempering (+2 ATK, +2 DEF, +8 HP heal per tier climb). While occupying a 4×4 Summit tile, ordinary movement is restricted to 1 connected tile in any of the 8 directions (including when leaving the summit), and full Stage stride resumes on the next turn after leaving without losing progression state.',
    surfaceBoundRule:
      'As a non-jumping surface strider, obeys Same-Surface Combat and Cross-Surface Blocking. Must occupy the same surface class (Horizontal or Vertical) as its target to attack.',
    tacticalRole:
      '20×20 progression champion whose mobility (2 → 3 → 4 tiles below the summit; 1-tile 8-direction on the 4×4 Summit) and combat output scale as it marches forward and climbs.',
    rpgStats: { hp: 85, atk: 44, def: 20, evasion: 25, critChance: 20 },
    keyTraits: [
      '2 → 3 → 4 Tile Developing Stride',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Ignores Uphill Penalty',
      'Permanent Climb Stat Tempering',
    ],
  },
  {
    type: 'trebuchet',
    name: 'Trebuchet',
    subtitle: '20×20 Specialist · Jump-Capturer & 3-Tile Knockback Artillery',
    icon: '☄',
    badge: '20×20 Boards',
    horizontalMovement:
      'Placed on the 20×20 Battlefield Flat and 20×20 Grand Pyramid outer wings (file D / x=3). Repositions 1–2 connected orthogonal tiles onto empty horizontal ground below the summit (or 1 connected horizontal tile in any of the 8 directions while occupying the 4×4 Summit), OR physically JUMPS onto an enemy piece within 1–2 tiles to CAPTURE it!',
    verticalMovement:
      'Knockback Bombardment (☄): Fires ranged boulders 3–6 tiles along 8 compass rays to knock an enemy piece back 3 tiles onto any random open tile (does NOT capture, and the Trebuchet stays on its square). On-Pyramid Rule: If the Trebuchet gets onto the Pyramid (Tier 1+), it can ONLY bombard targets on the 4×4 Summit!',
    surfaceBoundRule:
      'Occupies Horizontal Surfaces only. In Surface Bound mode, its 1–2 tile Jump-Captures and ranged 3-tile Knockback Bombardments only target Horizontal-Surface enemies (and when on the Pyramid, Bombardment is restricted exclusively to the 4×4 Summit).',
    tacticalRole:
      '20×20 siege disruption and jump-capture specialist. Preserves its distinct 1–2 tile Jump-Capture and 4×4 Summit Bombardment rules while obeying 1-tile 8-direction ordinary movement on the 4×4 Summit.',
    rpgStats: { hp: 75, atk: 52, def: 14, evasion: 5, critChance: 15 },
    keyTraits: [
      '1–2 Tile Jump-Capture Required',
      '1-Tile 8-Dir Move on 4×4 Summit',
      'Bombard Knocks Back 3 Tiles',
      'On Pyramid: Bombards 4×4 Summit Only',
    ],
  },
];

interface PieceGuideModalProps {
  onClose: () => void;
  playStyle?: PlayStyle;
  onSelectPlayStyle?: (style: PlayStyle) => void;
  pieces?: Piece[];
  boardType?: BoardType;
}

export const PieceGuideModal: React.FC<PieceGuideModalProps> = ({
  onClose,
  playStyle = 'open',
  onSelectPlayStyle,
  pieces = [],
  boardType = 'pyramid',
}) => {
  const [activeTab, setActiveTab] = useState<
    'manifesto' | 'armory' | 'workshop' | 'ai_workshop' | 'questionnaire'
  >('ai_workshop');
  const [selectedType, setSelectedType] = useState<PieceType>('gargoyle');
  const [localPlayStyle, setLocalPlayStyle] = useState<PlayStyle>(playStyle);
  const effectivePlayStyle = onSelectPlayStyle ? playStyle : localPlayStyle;
  const handleTogglePlayStyle = (next: PlayStyle) => {
    setLocalPlayStyle(next);
    onSelectPlayStyle?.(next);
  };
  const piece = PIECE_ROSTER.find((p) => p.type === selectedType) || PIECE_ROSTER[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl text-slate-100 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 md:px-7 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Chess — Piece Codex &amp; Battlefield Guide</span>
              </h2>
              <p className="text-[11px] md:text-xs text-slate-400">
                Updated with All 10 Piece Classes · 4 Battlefields · 3D D20 &amp; RPS Combat · Master AI Playbook
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Play Style Rules Filter (Open Surface vs Surface Bound) */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-purple-500/40 text-xs">
              <button
                onClick={() => handleTogglePlayStyle('open')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  effectivePlayStyle === 'open'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Open Surface
              </button>
              <button
                onClick={() => handleTogglePlayStyle('surface_bound')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  effectivePlayStyle === 'surface_bound'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Surface Bound
              </button>
            </div>

            {/* Download Complete Text Specification Button */}
            <button
              onClick={downloadCompleteGameGuideTxt}
              title="Download Complete Game Capabilities, Piece Codex, Tactical Academy & Rules (.txt)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Complete Guide (.txt)</span>
              <span className="sm:hidden">.TXT</span>
            </button>

            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('manifesto')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'manifesto'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Battlefield</span> Guide
              </button>
              <button
                onClick={() => setActiveTab('armory')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'armory'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Piece Codex (10)</span>
              </button>
              <button
                onClick={() => setActiveTab('workshop')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'workshop'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Pieces Workshop</span>
              </button>
              <button
                onClick={() => setActiveTab('questionnaire')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeTab === 'questionnaire'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Rules Questionnaire (72)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab 1: Official Battlefield Guide & Codex Manifesto */}
        {activeTab === 'manifesto' && (
          <div className="flex-1 p-5 md:p-8 overflow-y-auto space-y-8 text-xs md:text-sm text-slate-300 leading-relaxed">
            {/* Hero / What Is This Game */}
            <section className="space-y-4">
              <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950/80 to-sky-500/10 border border-amber-500/30">
                <div className="text-amber-400 font-bold uppercase tracking-wider text-[11px] mb-1 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>The Fundamental Principle</span>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-white mb-2">
                  This Is Chess — Elevated Across Four Battlefields.
                </h3>
                <p className="text-slate-200 text-xs md:text-sm leading-relaxed">
                  The objective has not changed. The two armies are still White and Black. Players alternate turns. Every move matters. Pieces threaten, defend, capture, sacrifice, pin, block, and protect one another.
                </p>
                <div className="mt-3.5 pt-3.5 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="font-semibold text-amber-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>The King is the sole piece that decides the game. You win through Checkmate.</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    No kill counts · No summit king-of-the-hill
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 space-y-2">
                <p>Traditional Chess asks you to control a flat board.</p>
                <p className="text-white font-semibold text-sm">
                  Ascension 3D Chess asks: <em>What happens when the chessboard itself has terrain, elevation, and tactical combat?</em>
                </p>
                <p className="text-xs text-slate-400">
                  The battlefield can rise above you, fall beneath you, wrap around a structure, and continue onto vertical cliff surfaces. A Rook controls roads along the valley and sweeps up vertical ramparts. A Knight leaps onto higher terraces. A Vanguard sprints 9 tiles forward to swap with a friendly Rook. Gargoyles, Ascendants, and Trebuchets turn the 20×20 Grand Pyramid into a living siege.
                </p>
              </div>
            </section>

            {/* The Five Independent Setup Pillars */}
            <section className="space-y-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>The Five Independent Setup Categories: Battlefield → Army → Combat → Play Style → Players</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-sky-900/40 space-y-1.5">
                  <div className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-sky-400" />
                    <span>1. Four Battlefields</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    <strong>Classic 8×8</strong>, <strong>Quick Pyramid 12×12</strong>, <strong>Grand Pyramid 20×20</strong> (5 elevations, 80 cliff tiles), or <strong>Battlefield 20×20 Flat</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-900/40 space-y-1.5">
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. Standard vs Kingdom Army</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    <strong>Standard Army</strong> (16–22 pieces/side) or <strong>Kingdom Army</strong> (+8 inward-facing wing Pawns per side, up to 60 pieces total!).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-amber-900/40 space-y-1.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    <span>3. Standard vs RPG Combat</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    <strong>Standard Mode</strong> (instant captures) or <strong>RPG Mode</strong> (3D D20 dice rolls, Mirror-Class Rock-Paper-Scissors &amp; multi-turn duels).
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-purple-900/50 space-y-1.5">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>4. Play Style: Open vs Surface Bound</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    <strong>Open Surface</strong> (standard continuous-surface Pyramid play) or <strong>Surface Bound</strong> (same-surface combat &amp; jump color lock until 4×4 Summit).
                  </p>
                </div>
              </div>

              {/* Dynamic Play Style Rules Showcase */}
              {effectivePlayStyle === 'surface_bound' ? (
                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-extrabold text-purple-200 uppercase tracking-wide flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Active Play Style: Surface Bound (Advanced / Challenge Ruleset)</span>
                    </div>
                    <span className="text-[11px] font-mono text-amber-300">
                      “Can I reach the correct surface from which I’m allowed to fight that enemy?”
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-200">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-1">
                      <strong className="text-purple-300 block">1. Same-Surface Combat &amp; Pawn Exception</strong>
                      <p className="text-slate-300">
                        Non-Pawn pieces cannot attack across Horizontal and Vertical surfaces and must enter the target’s surface class first. <strong>Pawn Exception:</strong> Pawns MAY attack and give check across horizontal and vertical Pyramid tiles within their legal 1-step forward-diagonal capture range!
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-1">
                      <strong className="text-amber-300 block">2. Jump Color Law &amp; 4×4 Summit Release</strong>
                      <p className="text-slate-300">
                        Jump-capable pieces (Knights, Gargoyles) are restricted to the tile color (Light or Dark) they originally started on. Reaching the <strong>4×4 Summit</strong> permanently releases that color restriction so the jumper can use either tile color!
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 space-y-1">
                      <strong className="text-emerald-300 block">3. Summit-to-Base Jump &amp; Check Law</strong>
                      <p className="text-slate-300">
                        Jumping from the 4×4 Summit is restricted to legal Pyramid-base landing tiles. Check, checkmate, and tactical support obey these exact same surface and color restrictions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Active Play Style: Open Surface (Standard Accessible Pyramid Play)</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      Pieces move and attack freely across connected horizontal terraces and vertical cliff walls, and jumpers can use any legal landing color immediately. Switch to <strong>Surface Bound</strong> above to inspect the advanced challenge ruleset.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTogglePlayStyle('surface_bound')}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 font-semibold text-[11px] shrink-0 transition-colors"
                  >
                    Inspect Surface Bound Rules
                  </button>
                </div>
              )}
            </section>

            {/* Horizontal and Vertical Tiles: Continuous Board Law */}
            <section className="space-y-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Move className="w-4 h-4 text-emerald-400" />
                <span>The Continuous Board Law: A Chessboard Pressed Over a Pyramid</span>
              </h4>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                <div className="font-extrabold text-amber-300 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>The Continuous Board Law</span>
                </div>
                <p className="leading-relaxed text-slate-200">
                  The vertical cliff faces are <strong>not extra decorative barriers inserted between ordinary chess squares</strong>. They are part of the same continuous checkerboard skin. If you peel the entire playing surface off the pyramid and flatten it, it reads as one continuous alternating grid:
                </p>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 font-semibold text-white text-xs">
                  &ldquo;Every playable tile must share an edge only with the opposite color.&rdquo;
                </div>
                <p className="text-[11px] text-slate-300">
                  If a horizontal top tile is Black, every tile touching its four edges is White—including a tile that bends 90° downward onto a vertical cliff wall. That wall tile in turn meets the next lower terrace tile, which alternates back to Black.
                </p>
              </div>

              {/* 20x20 Elevation Geometry Table */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs">
                  Grand Pyramid 20×20 Geometry (5 Elevations, 80 Vertical Cliff Tiles, Centered &amp; Kingdom Deployments)
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 font-mono">
                      <tr>
                        <th className="p-2.5">Surface Level</th>
                        <th className="p-2.5">Outer Boundary</th>
                        <th className="p-2.5">Height &amp; Tactical Function</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      <tr>
                        <td className="p-2.5 font-bold text-amber-300">Elevation 4 (Summit Apex)</td>
                        <td className="p-2.5 font-mono text-white">4×4 [8..11]</td>
                        <td className="p-2.5">
                          5.00m · Tactical Apex: Non-Knights move 1 connected tile in all 8 directions while Knights retain full jump mobility; unlocks Surface Bound jump color release &amp; Ascendant Stage III (Pawns promote on opposite back rank only)
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-sky-300">Elevation 3 (Upper Terrace)</td>
                        <td className="p-2.5 font-mono text-white">6×6 [7..12]</td>
                        <td className="p-2.5">3.75m · Commanding ring terrace; Trebuchet on Pyramid bombards 4×4 Summit only</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-indigo-300">Elevation 2 (Middle Terrace)</td>
                        <td className="p-2.5 font-mono text-white">8×8 [6..13]</td>
                        <td className="p-2.5">2.50m · Central stepped battle lines; Vanguard opening sprint target</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-300">Elevation 1 (Lower Terrace)</td>
                        <td className="p-2.5 font-mono text-white">10×10 [5..14]</td>
                        <td className="p-2.5">1.25m · First stepped rampart; awakens Gargoyle 3-tile Stone Bulwark</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-300">Elevation 0 (Plains &amp; Flanks)</td>
                        <td className="p-2.5 font-mono text-white">12×12 → 20×20</td>
                        <td className="p-2.5">0.00m · 4 full open flanking lanes on all sides &amp; main/wing deployment zones</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Authoritative 10-Piece Movement Matrix */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Authoritative 10-Piece Movement Matrix: Flats vs. The Pyramid</span>
                </h4>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  Complete 10-Unit Roster
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px]">
                    <tr>
                      <th className="p-3 w-36">Piece</th>
                      <th className="p-3 w-52">On Horizontal Flats</th>
                      <th className="p-3">Navigating The 3D Pyramid &amp; Special Abilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-300 text-[11px]">
                    {PIECE_ROSTER.map((p) => (
                      <tr
                        key={p.type}
                        onClick={() => {
                          setSelectedType(p.type);
                          setActiveTab('armory');
                        }}
                        className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-300">
                              <PieceCodexIcon type={p.type} size="md" />
                            </span>
                            <div>
                              <div className="capitalize">{p.name}</div>
                              <div className="text-[9px] font-mono text-slate-400">{p.badge}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 leading-relaxed">
                          {p.horizontalMovement.split('.')[0]}.
                        </td>
                        <td className="p-3 leading-relaxed text-slate-200 space-y-1">
                          <div>{p.verticalMovement}</div>
                          {effectivePlayStyle === 'surface_bound' && (
                            <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-200 text-[10px]">
                              <strong className="text-purple-300">Surface Bound Law: </strong>
                              {p.surfaceBoundRule}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* RPG Combat Resolution: 3D D20 Die, Damage Formula & Mirror-Class RPS */}
            <section className="space-y-4">
              <h4 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Dices className="w-4 h-4 text-rose-400" />
                <span>RPG Combat Engine: 3D Floating D20 Die &amp; Mirror-Class Rock-Paper-Scissors</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 3D D20 Combat Showcase */}
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-rose-300 text-xs flex items-center gap-1.5">
                      <Dices className="w-4 h-4 text-rose-400" />
                      <span>1. Different-Class Clash: 3D Floating D20 Roll</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      1d20 + Formula
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    When two different unit classes engage (e.g., Knight vs Rook), a <strong>3D-faceted icosahedron D20 die</strong> physically rotates and tumbles across the viewport before snapping onto the rolled face (1–20) and revealing the step-by-step damage calculation:
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-300 text-center">
                    ATK − DEF + 🎲D20 Mod × Elevation % × Crit (1.5×) = −Final Damage
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-emerald-300">High Ground:</strong> +10% Damage per tier above &amp; +1 D20 roll bonus.</li>
                    <li><strong className="text-rose-300">Uphill Strike:</strong> −10% Damage per tier below &amp; −1 D20 penalty (ignored by Ascendant).</li>
                    <li><strong className="text-sky-300">Ongoing Duel:</strong> If the defender survives Round 1, the square locks into an active multi-turn contest!</li>
                  </ul>
                </div>

                {/* Mirror-Class Rock Paper Scissors */}
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                      <Swords className="w-4 h-4 text-amber-400" />
                      <span>2. Same-Class Mirror Duel: Rock · Paper · Scissors</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      1-of-3 Stance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    When two pieces of the <strong>exact same class</strong> clash in RPG Mode (e.g., Pawn vs Pawn, Knight vs Knight, Queen vs Queen), combat resolves via a visceral 4-beat <strong>ROCK... PAPER... SCISSORS... SHOOT!</strong> showdown:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                    <div className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300">
                      🪨 <strong>ROCK</strong><br />Crushes ✂️
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-sky-500/30 text-sky-300">
                      📄 <strong>PAPER</strong><br />Wards 🪨
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-rose-500/30 text-rose-300">
                      ✂️ <strong>SCISSORS</strong><br />Pierces 📄
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ties trigger an automatic instant rematch round. Winning as Attacker captures the tile outright; winning as Defender eliminates the attacker in a counter-strike!
                  </p>
                </div>
              </div>
            </section>

            {/* Master AI Strategic Playbook & Anti-Loop Engine */}
            <section className="space-y-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Master AI Playbook, Total Board Clearance &amp; Anti-Loop Engine</span>
              </h4>
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5 text-xs">
                <p className="text-slate-200 leading-relaxed">
                  The AI defaults to <strong>Master Difficulty</strong> and builds a persistent <strong>Strategic Playbook &amp; Winning Log</strong> across all four battlefields. Every AI move is classified against 15 named doctrines—combining classical Chess theory (<em>Italian Game, Ruy Lopez, Sicilian Dragon, Queen&apos;s Gambit, French/Caro-Kann, Greek Gift, Pin/Skewer/Fork, Smothered Mate, Lucena/Philidor, Staircase Mate</em>) with 3D Pyramid maneuvers (<em>Vanguard Sprint &amp; Rook Swap, Gargoyle Cliff Bulwark, Ascendant Tier-4 Resonance, Trebuchet Siege Screen, 20×20 Wing Pincer</em>).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <strong className="text-amber-300 block mb-0.5">Relentless Board Clearance Drive:</strong>
                    Awards a high elimination bounty (+125 to +140 per captured piece) and activates Mop-Up Convergence to hunt down every enemy unit on the board before delivering checkmate.
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <strong className="text-emerald-300 block mb-0.5">Anti-Loop &amp; Anti-Stalemate Protection:</strong>
                    Tracks recent move history to heavily penalize 2-ply square oscillations (−5500), repeated move signatures (−2600), and accidental stalemate traps (−95,000).
                  </div>
                </div>
              </div>
            </section>

            {/* Reading Battlefield, Camera & HUD */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span>Camera &amp; Occlusion Beacons</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1">
                  <li><strong className="text-white">← / → (or Drag):</strong> Orbit smoothly around the 3D pyramid.</li>
                  <li><strong className="text-white">↑ / ↓ &amp; Scroll:</strong> Adjust elevation pitch and zoom distance.</li>
                  <li><strong className="text-white">Occlusion Beacons:</strong> Pieces hidden behind rising pyramid tiers automatically project clickable floating flags and translucent terrain windows.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Minimized Top HUD &amp; Live Overlays</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  The compact top micro-HUD provides instant one-click switching for Battlefield, Combat Mode, Players, AI Coach Playbook, and Codex—expanding only when you click the chevron toggle.
                </p>
                <div className="pt-1 text-[11px] font-mono text-amber-300">
                  PIECE → TERRAIN → COMBAT → CHECKMATE THE KING
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Piece Armory & Detailed Codex */}
        {activeTab === 'armory' && (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left: Piece Selector Strip */}
            <div className="w-full md:w-68 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/50 p-3 space-y-1.5 overflow-y-auto max-h-52 md:max-h-none">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>All Unit Classes ({PIECE_ROSTER.length})</span>
                <span className="text-amber-400 font-mono">Click to Inspect</span>
              </div>
              {PIECE_ROSTER.map((p) => {
                const isSelected = p.type === selectedType;
                return (
                  <button
                    key={p.type}
                    onClick={() => setSelectedType(p.type)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-300 shrink-0">
                        <PieceCodexIcon type={p.type} size="md" />
                      </span>
                      <div className="text-left truncate">
                        <div className="capitalize leading-tight">{p.name}</div>
                        {p.badge && (
                          <div className="text-[9px] font-mono text-slate-400 leading-tight">
                            {p.badge}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Right: Piece Deep-Dive */}
            <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-5 text-xs">
              {/* Piece Header Card */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                    <PieceCodexIcon type={piece.type} size="lg" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-extrabold text-white">{piece.name}</h3>
                      {piece.badge && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                          {piece.badge}
                        </span>
                      )}
                      {piece.type === 'king' && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300">
                          Sovereign Objective
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-amber-400 mt-0.5">{piece.subtitle}</p>
                  </div>
                </div>

                {/* RPG Stats Badges */}
                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
                    HP: <strong className="text-white">{piece.rpgStats.hp}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-rose-400">
                    ATK: <strong className="text-white">{piece.rpgStats.atk}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-sky-400">
                    DEF: <strong className="text-white">{piece.rpgStats.def}</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-amber-400">
                    CRIT: <strong className="text-white">{piece.rpgStats.critChance}%</strong>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400">
                    EVA: <strong className="text-white">{piece.rpgStats.evasion}%</strong>
                  </div>
                </div>
              </div>

              {/* Visual Movement & Range Diagram */}
              <PieceMovementDiagram pieceType={piece.type} isPyramidBoard={true} />

              {/* Movement Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Horizontal Movement */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-300 text-xs">
                    <Move className="w-4 h-4 text-sky-400" />
                    <span>Horizontal Movement (Flat Ground &amp; Terraces)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {piece.horizontalMovement}
                  </p>
                </div>

                {/* Vertical Movement & Elevation */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Vertical Movement (Cliffs, Perches &amp; Special Abilities)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {piece.verticalMovement}
                  </p>
                </div>
              </div>

              {/* Play Style Specific Law Card (Open Surface vs Surface Bound) */}
              <div
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  effectivePlayStyle === 'surface_bound'
                    ? 'bg-purple-950/30 border-purple-500/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-purple-300 text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400" />
                    <span>
                      {effectivePlayStyle === 'surface_bound'
                        ? `Active Surface Bound Law — ${piece.name}`
                        : `Optional Surface Bound Challenge Rule — ${piece.name}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Play Style: {effectivePlayStyle === 'surface_bound' ? 'Surface Bound (Active)' : 'Open Surface (Active)'}
                  </span>
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">
                  {piece.surfaceBoundRule}
                </p>
              </div>

              {/* Tactical Role & Key Traits */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="font-bold text-white text-xs flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Battlefield Role &amp; Key Traits</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  {piece.tacticalRole}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {piece.keyTraits.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Pieces Workshop & Balancing Framework */}
        {activeTab === 'workshop' && (
          <PieceWorkshopSection playStyle={effectivePlayStyle} boardType={boardType} />
        )}

        {/* Tab 4: 72-Rule Questionnaire & Canonical Text-File Codex */}
        {activeTab === 'questionnaire' && <CodexQuestionnaireSection />}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Checkmate the King · 10 Unit Classes · 3D D20 &amp; Mirror RPS · Master AI Playbook
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadCompleteGameGuideTxt}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Full Spec (.txt)</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
            >
              Return to Battlefield
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
