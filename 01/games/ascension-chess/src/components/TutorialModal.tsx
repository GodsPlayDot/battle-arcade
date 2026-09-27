import React, { useState } from 'react';
import { BoardType, GameMode, Piece, PlayStyle } from '../types/chess';
import {
  getDefaultRPGStats,
  getPositionCheckerColor,
  getTileTier,
  toAuthoritativePosition,
} from '../logic/pyramidBoard';
import { downloadCompleteGameGuideTxt } from '../data/completeGameGuideText';
import { PieceCodexIcon } from './PieceGuideModal';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Crown,
  Shield,
  Swords,
  Sparkles,
  Compass,
  Award,
  Grid,
  GraduationCap,
  Play,
  Repeat,
  Download,
  Dices,
} from 'lucide-react';

export interface InteractiveDrillScenario {
  id: string;
  title: string;
  subtitle: string;
  boardType: BoardType;
  gameMode: GameMode;
  playStyle?: PlayStyle;
  objective: string;
  pieces: Piece[];
}

const makeScenarioPiece = (
  boardType: BoardType,
  type: Piece['type'],
  color: Piece['color'],
  x: number,
  y: number,
  isVerticalWall?: boolean,
  wallDirection?: 'north' | 'south' | 'east' | 'west',
  wallTierStep?: number
): Piece => {
  const rawPos = {
    x,
    y,
    tier: isVerticalWall ? Math.max(0, (wallTierStep || 1) - 1) : getTileTier(boardType, x, y),
    isVerticalWall: Boolean(isVerticalWall),
    wallDirection: isVerticalWall ? wallDirection : undefined,
    wallTierStep: isVerticalWall ? wallTierStep : undefined,
  };
  const position =
    toAuthoritativePosition(boardType, rawPos) ||
    toAuthoritativePosition(boardType, { x, y, tier: getTileTier(boardType, x, y), isVerticalWall: false }) ||
    rawPos;
  return {
    id: `drill_${color}_${type}_${x}_${y}`,
    type,
    color,
    position,
    hasMoved: false,
    facing: color === 'white' ? 'north' : 'south',
    originEdge: color === 'white' ? 'south' : 'north',
    detachment: 'main',
    maxForwardProgress: type === 'vanguard' ? (color === 'white' ? y : 19 - y) : undefined,
    hasCrossedCenter: false,
    originColor: getPositionCheckerColor(position, boardType),
    colorReleased: false,
    rpg: getDefaultRPGStats(type),
  };
};

export const INTERACTIVE_DRILLS: InteractiveDrillScenario[] = [
  {
    id: 'vanguard_rook_exchange',
    title: 'Drill 1: The Vanguard Sprint & Rook Exchange',
    subtitle: 'Grand Pyramid 20×20 · Standard Combat',
    boardType: 'pyramid',
    gameMode: 'standard',
    objective:
      'Advance your White Vanguard (5, 0) up to 9 tiles onto the Pyramid Middle Terrace, then on your next turn click your friendly White Rook (6, 0) to execute a Rook Exchange and command the high ground!',
    pieces: [
      makeScenarioPiece('pyramid', 'king', 'white', 10, 0),
      makeScenarioPiece('pyramid', 'rook', 'white', 6, 0),
      makeScenarioPiece('pyramid', 'rook', 'white', 13, 0),
      makeScenarioPiece('pyramid', 'vanguard', 'white', 5, 0),
      makeScenarioPiece('pyramid', 'vanguard', 'white', 14, 0),
      makeScenarioPiece('pyramid', 'pawn', 'white', 9, 1),
      makeScenarioPiece('pyramid', 'pawn', 'white', 10, 1),
      makeScenarioPiece('pyramid', 'king', 'black', 10, 19),
      makeScenarioPiece('pyramid', 'rook', 'black', 6, 19),
      makeScenarioPiece('pyramid', 'vanguard', 'black', 5, 19),
      makeScenarioPiece('pyramid', 'bishop', 'black', 8, 15),
      makeScenarioPiece('pyramid', 'pawn', 'black', 9, 18),
      makeScenarioPiece('pyramid', 'pawn', 'black', 10, 18),
    ],
  },
  {
    id: 'vertical_wall_flanking',
    title: 'Drill 2: Vertical Wall Flanking & Pawn Sidestep',
    subtitle: 'Grand Pyramid 20×20 · Standard Combat',
    boardType: 'pyramid',
    gameMode: 'standard',
    objective:
      'Use your White Vanguard perched on the South Vertical Cliff Wall (7, 5) to move laterally sideways along the sheer cliff face, or use your advancing White Pawn (8, 4) to sidestep around the guarded terrace obstacle!',
    pieces: [
      makeScenarioPiece('pyramid', 'king', 'white', 10, 0),
      makeScenarioPiece('pyramid', 'vanguard', 'white', 7, 5, true, 'south', 1),
      makeScenarioPiece('pyramid', 'pawn', 'white', 8, 4),
      makeScenarioPiece('pyramid', 'rook', 'white', 6, 0),
      makeScenarioPiece('pyramid', 'king', 'black', 10, 19),
      makeScenarioPiece('pyramid', 'rook', 'black', 8, 6),
      makeScenarioPiece('pyramid', 'knight', 'black', 11, 8),
      makeScenarioPiece('pyramid', 'pawn', 'black', 10, 18),
    ],
  },
  {
    id: 'grand_pyramid_rpg_trio',
    title: 'Drill 3: Grand Pyramid RPG Trio (Gargoyle, Ascendant & Trebuchet)',
    subtitle: 'Grand Pyramid 20×20 · RPG Combat',
    boardType: 'pyramid',
    gameMode: 'rpg',
    objective:
      'Command all three Grand Pyramid RPG specialists: (1) Perch your Gargoyle on the vertical wall for Stone Bulwark (+10 DEF, +15% EVA), (2) Climb to Tier 2 with your Ascendant to unlock a 3-tile stride, and (3) Jump-capture an enemy within 1–2 tiles or fire a Bombardment with your Trebuchet to knock an enemy back 3 tiles onto a random open tile!',
    pieces: [
      makeScenarioPiece('pyramid', 'king', 'white', 10, 0),
      makeScenarioPiece('pyramid', 'trebuchet', 'white', 6, 3),
      makeScenarioPiece('pyramid', 'gargoyle', 'white', 5, 4),
      makeScenarioPiece('pyramid', 'ascendant', 'white', 12, 5),
      makeScenarioPiece('pyramid', 'vanguard', 'white', 14, 0),
      makeScenarioPiece('pyramid', 'pawn', 'white', 6, 4),
      makeScenarioPiece('pyramid', 'king', 'black', 10, 19),
      makeScenarioPiece('pyramid', 'rook', 'black', 6, 8),
      makeScenarioPiece('pyramid', 'knight', 'black', 12, 8),
      makeScenarioPiece('pyramid', 'gargoyle', 'black', 9, 13),
      makeScenarioPiece('pyramid', 'trebuchet', 'black', 13, 15),
    ],
  },
  {
    id: 'mirror_rps_and_d20_clash',
    title: 'Drill 4: Mirror-Class RPS & 3D D20 High-Ground Clash',
    subtitle: 'Quick Pyramid 12×12 · RPG Combat · Open Surface',
    boardType: 'quick_pyramid',
    gameMode: 'rpg',
    playStyle: 'open',
    objective:
      'Experience both RPG resolution systems: Strike the Black Knight (5, 6) with your White Knight (4, 4) to trigger a Same-Class Rock·Paper·Scissors Duel, or strike the Black Rook (7, 5) from high ground with your White Queen (7, 3) to trigger the 3D Floating D20 Die & Damage Formula!',
    pieces: [
      makeScenarioPiece('quick_pyramid', 'king', 'white', 6, 0),
      makeScenarioPiece('quick_pyramid', 'knight', 'white', 4, 4),
      makeScenarioPiece('quick_pyramid', 'queen', 'white', 7, 3),
      makeScenarioPiece('quick_pyramid', 'bishop', 'white', 5, 3),
      makeScenarioPiece('quick_pyramid', 'king', 'black', 6, 11),
      makeScenarioPiece('quick_pyramid', 'knight', 'black', 5, 6),
      makeScenarioPiece('quick_pyramid', 'rook', 'black', 7, 5),
      makeScenarioPiece('quick_pyramid', 'pawn', 'black', 6, 8),
    ],
  },
  {
    id: 'surface_bound_summit_release',
    title: 'Drill 5: Surface Bound Challenge — Summit Color Release & Wall Combat',
    subtitle: 'Quick Pyramid 12×12 · Standard Combat · Surface Bound Play Style',
    boardType: 'quick_pyramid',
    gameMode: 'standard',
    playStyle: 'surface_bound',
    objective:
      'Surface Bound Challenge: Your White Knight (3, 3) is bound to its starting tile color! Leap onto the 4×4 Summit (4, 5) to permanently release its color lock so it can strike either color, or transition your White Rook (6, 2) onto the South Vertical Wall to engage the Black Wall Defender!',
    pieces: [
      makeScenarioPiece('quick_pyramid', 'king', 'white', 6, 0),
      makeScenarioPiece('quick_pyramid', 'knight', 'white', 3, 3),
      makeScenarioPiece('quick_pyramid', 'rook', 'white', 6, 2),
      makeScenarioPiece('quick_pyramid', 'queen', 'white', 4, 2),
      makeScenarioPiece('quick_pyramid', 'king', 'black', 6, 11),
      makeScenarioPiece('quick_pyramid', 'rook', 'black', 6, 3, true, 'south', 2),
      makeScenarioPiece('quick_pyramid', 'knight', 'black', 5, 7),
      makeScenarioPiece('quick_pyramid', 'bishop', 'black', 7, 8),
    ],
  },
  {
    id: 'summit_one_tile_tactical_region',
    title: 'Drill 6: 4×4 Summit Tactical Region — 1-Tile Rule, Knight Exemption & Capture Separation',
    subtitle: 'Quick Pyramid 12×12 · Standard Combat · Open Surface',
    boardType: 'quick_pyramid',
    gameMode: 'standard',
    playStyle: 'open',
    objective:
      'Test the 4×4 Summit Tactical Region laws: (1) Select your White Queen (5, 5) or White Rook (6, 4) on the 4×4 Summit to see that non-Knights move 1 connected tile in any of the 8 directions—and step off the Summit to restore full sliding range on the next turn! (2) Select your White Pawn on the Summit (4, 5) to see 8-direction 1-tile ordinary moves while capturing ONLY 1 step forward-diagonally (5, 6)! (3) Select your White Knight on the Summit (6, 6) to verify the Knight is exempt and retains its full L-jump mobility!',
    pieces: [
      makeScenarioPiece('quick_pyramid', 'king', 'white', 6, 0),
      makeScenarioPiece('quick_pyramid', 'queen', 'white', 5, 5),
      makeScenarioPiece('quick_pyramid', 'rook', 'white', 6, 4),
      makeScenarioPiece('quick_pyramid', 'pawn', 'white', 4, 5),
      makeScenarioPiece('quick_pyramid', 'knight', 'white', 6, 6),
      makeScenarioPiece('quick_pyramid', 'king', 'black', 6, 11),
      makeScenarioPiece('quick_pyramid', 'bishop', 'black', 5, 6),
      makeScenarioPiece('quick_pyramid', 'rook', 'black', 4, 6),
      makeScenarioPiece('quick_pyramid', 'knight', 'black', 7, 8),
    ],
  },
];

interface TutorialModalProps {
  onClose: () => void;
  onOpenPieceGuide?: () => void;
  onLoadScenario?: (scenario: InteractiveDrillScenario) => void;
  playStyle?: PlayStyle;
  onSelectPlayStyle?: (style: PlayStyle) => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  onClose,
  onOpenPieceGuide,
  onLoadScenario,
  playStyle = 'open',
  onSelectPlayStyle,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [localPlayStyle, setLocalPlayStyle] = useState<PlayStyle>(playStyle);
  const effectivePlayStyle = onSelectPlayStyle ? playStyle : localPlayStyle;
  const handleTogglePlayStyle = (next: PlayStyle) => {
    setLocalPlayStyle(next);
    onSelectPlayStyle?.(next);
  };

  const steps = [
    {
      id: 'core_concept',
      title: '1. Core Rules & Victory Conditions',
      icon: <Crown className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong className="text-white">Ascension 3D Chess is real Chess</strong> elevated onto a 3D multi-tiered architectural mountain with climbable vertical cliff faces, 10 specialized piece classes, and optional RPG tactical combat.
          </p>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 text-xs">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Win Conditions: Identical to Classical Chess</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-normal">
              Checkmate the enemy King (or eliminate the enemy Monarch in combat). There are <strong>no artificial summit king-of-the-hill victories</strong> and no kill-count gimmicks. On the 4×4 Summit Apex, every non-Knight piece moves 1 connected tile in all 8 directions while the Knight retains its summit jumping advantage—and only Checkmate wins the war!
            </p>
          </div>
          <ul className="space-y-1.5 list-disc list-inside text-slate-300 pl-1">
            <li>
              <strong className="text-white">Pawn Promotion:</strong> Pawns promote upon reaching the opposite back rank (Pawns do not promote merely by reaching the 4×4 Summit). On Grand Pyramid 20×20, Pawns can also promote into a <strong>Vanguard</strong>!
            </li>
            <li>
              <strong className="text-white">Continuous Board Law:</strong> Every playable horizontal and vertical cliff tile alternates colors across 90° bends without resetting.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'playing_boards',
      title: '2. The 4 Battlefields & Army Deployments',
      icon: <Grid className="w-5 h-5 text-sky-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Choose between four distinct battlefields and two army deployment scales:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-900/40 space-y-1">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>Quick Pyramid (12×12)</span>
                <span className="text-[10px] font-mono text-amber-400">32 Cliff Tiles</span>
              </div>
              <p className="text-[11px] text-slate-300">
                12×12 footprint with a 4×4 Summit Apex. Armies start only 4 files apart for fast-paced, elevated tactical clashes.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-900/40 space-y-1">
              <div className="font-bold text-sky-300 flex items-center justify-between">
                <span>Grand Pyramid (20×20)</span>
                <span className="text-[10px] font-mono text-sky-400">80 Cliff Tiles</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Full 5-elevation (0.00m → 5.00m) ziggurat with 4-tile outer flanking corridors, Vanguards, and RPG Specialists.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span>Battlefield (20×20 Flat)</span>
                <span className="text-[10px] font-mono text-slate-400">400 Squares</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Expansive flat open plain featuring Vanguard, Gargoyle, Ascendant, and Trebuchet alongside the classical army.
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <div className="font-bold text-slate-300 flex items-center justify-between">
                <span>Classic Chess (8×8)</span>
                <span className="text-[10px] font-mono text-slate-400">64 Squares</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Timeless flat 64-square tournament board with either Standard or RPG combat.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200 space-y-1">
            <strong className="text-sky-300">👑 Standard vs Kingdom Army Deployment (Up to 58 Pieces Total):</strong>
            <p>
              <strong>Standard Army</strong> deploys 16 pieces per side on 8×8 &amp; 12×12, and 21 pieces per side on both 20×20 boards (including 2 Vanguards, Gargoyle, Ascendant &amp; Trebuchet). <strong>Kingdom Army</strong> adds West &amp; East Flank Detachments (+8 inward-facing wing Pawns per side)!
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'game_modes_and_dice',
      title: '3. RPG Combat: 3D D20 Die & Mirror Rock-Paper-Scissors',
      icon: <Dices className="w-5 h-5 text-rose-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Switch seamlessly between <strong className="text-white">Standard Mode</strong> (instant one-hit captures) and <strong className="text-rose-300">RPG Tactics Mode</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-900/40 space-y-1.5">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <Dices className="w-4 h-4 text-rose-400" />
                <span>Different-Class: 3D Floating D20</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                A <strong>3D-faceted icosahedron D20 die</strong> physically rotates and lands on a roll (1–20), then reveals the step-by-step damage calculation:
              </p>
              <div className="p-1.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-300 text-center">
                ATK − DEF + 🎲Roll × Elev × Crit = −DMG
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-900/40 space-y-1.5">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <Swords className="w-4 h-4 text-amber-400" />
                <span>Same-Class: Rock · Paper · Scissors</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                When two pieces of the <strong>exact same class</strong> clash (e.g., Knight vs Knight), a 4-beat <strong>ROCK... PAPER... SCISSORS... SHOOT!</strong> duel decides the winner outright (🪨 beats ✂️, ✂️ beats 📄, 📄 beats 🪨)!
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
            <strong className="text-emerald-300">Ongoing Multi-Turn Contests:</strong> When a defender survives a D20 strike with HP remaining, both pieces lock into an active Contest on that square and clash at the start of subsequent turns!
          </div>
        </div>
      ),
    },
    {
      id: 'pyramid_specialists',
      title: '4. 20×20 Specialist Units & Pyramid Pawn Rule',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
          <p>
            Four specialized unit classes join the 6 classic Staunton pieces on both 20×20 battlefields (<strong className="text-white">20×20 Battlefield Flat</strong> &amp; <strong className="text-white">20×20 Grand Pyramid</strong>):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-800/40 flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-300 shrink-0">
                <PieceCodexIcon type="vanguard" size="md" />
              </span>
              <div>
                <strong className="text-emerald-300 block">Vanguard (20×20 Flat &amp; Pyramid)</strong>
                <span>9 → 1 forward sprint contraction; lateral cliff walking; switches places with a Rook of its own team.</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-800/40 flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sky-300 shrink-0">
                <PieceCodexIcon type="gargoyle" size="md" />
              </span>
              <div>
                <strong className="text-sky-300 block">Gargoyle (20×20 Flat &amp; Pyramid)</strong>
                <span>2-tile winged hop on flat ground; 3-tile cliff &amp; terrace glider with Stone Bulwark (+10 DEF, +15% EVA).</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-800/40 flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-300 shrink-0">
                <PieceCodexIcon type="ascendant" size="md" />
              </span>
              <div>
                <strong className="text-amber-300 block">Ascendant (20×20 Flat &amp; Pyramid)</strong>
                <span>Develops 2 → 3 → 4 tile stride by advancing or climbing; ignores uphill penalty.</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-800/40 flex items-start gap-2.5">
              <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-300 shrink-0">
                <PieceCodexIcon type="trebuchet" size="md" />
              </span>
              <div>
                <strong className="text-rose-300 block">Trebuchet (20×20 Flat &amp; Pyramid)</strong>
                <span>Must jump 1–2 tiles onto a piece to capture it; Bombardment knocks the target back 3 tiles onto a random open tile (on Pyramid: bombards 4×4 Summit only).</span>
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200">
            <strong className="text-amber-300">♟ Pyramid-Board Pawn Upgrade:</strong> Pawns can move 1 tile <strong>backward</strong> (non-capture) <strong>ONLY on Pyramid Boards</strong> (12×12 Quick Pyramid &amp; 20×20 Grand Pyramid). On Flat Boards (8×8 Classic &amp; 20×20 Battlefield Flat), Pawns can never move backward.
          </div>
        </div>
      ),
    },
    {
      id: 'vertical_and_height_tactics',
      title:
        effectivePlayStyle === 'surface_bound'
          ? '5. Play Style: Surface Bound Challenge Laws & Elevation'
          : '5. Play Style: Open Surface & Elevation Combat Modifiers',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          {effectivePlayStyle === 'surface_bound' ? (
            <div className="p-3 rounded-2xl bg-purple-950/35 border border-purple-500/40 space-y-2 text-[11px]">
              <div className="font-bold text-purple-200 flex items-center justify-between">
                <span>Surface Bound Play Style (Active Challenge Ruleset)</span>
                <span className="font-mono text-[10px] text-amber-300">Same-Surface + Color Lock</span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-slate-200">
                <li>
                  <strong className="text-purple-300">Same-Surface Combat &amp; Pawn Exception:</strong> Non-Pawn pieces cannot attack across Horizontal and Vertical surfaces. <strong>Pawn Exception:</strong> Pawns MAY attack and give check across horizontal and vertical Pyramid tiles within their legal 1-step forward-diagonal capture range!
                </li>
                <li>
                  <strong className="text-purple-300">Cross-Surface Blocking:</strong> Opposite-surface pieces cannot be captured across surface classes, but they still physically block sliding movement paths!
                </li>
                <li>
                  <strong className="text-amber-300">Jump Color Law &amp; 4×4 Summit Release:</strong> Jump-capable pieces (Knights, Gargoyles) are restricted to the tile color they originally started on until reaching the <strong>4×4 Summit</strong>, which permanently releases them to use either tile color.
                </li>
                <li>
                  <strong className="text-emerald-300">Summit-to-Base Jump &amp; Check Law:</strong> Jumping from the 4×4 Summit is restricted to legal Pyramid-base landing tiles. Check and checkmate obey these exact same attack restrictions.
                </li>
              </ul>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="font-bold text-emerald-300 flex items-center justify-between">
                <span>Open Surface Play Style (Active Standard Ruleset)</span>
                <button
                  onClick={() => handleTogglePlayStyle('surface_bound')}
                  className="text-[10px] font-mono text-purple-300 hover:text-white underline"
                >
                  Preview Surface Bound Rules
                </button>
              </div>
              <p className="text-slate-300">
                Uses the accessible continuous-surface Pyramid movement and attack system: pieces move and attack freely across connected horizontal terraces and vertical cliff faces, and jumpers can leap to any legal tile color immediately.
              </p>
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/35 text-[11px] text-amber-100 space-y-1">
            <strong className="text-amber-300 block">🏔️ 4×4 Summit Tactical Region Law (Both Play Styles):</strong>
            <p className="text-slate-200 leading-normal">
              While occupying a <strong>4×4 Summit</strong> tile, every non-Knight piece makes an ordinary move of <strong>1 connected tile in any of the 8 directions</strong> (including when leaving the summit), and resumes its normal movement range on the next turn after leaving. The <strong>Knight is exempt</strong> and retains its summit jump mobility! Movement and capture remain separate (a Pawn on the Summit moves 1 tile in all 8 directions onto empty squares, but captures strictly 1 step forward-diagonally).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
              <strong className="text-emerald-300 block">High Ground Superiority</strong>
              <div>+10% Attack Damage per tier above</div>
              <div>+1 D20 Roll Advantage</div>
              <div>+15% Vertical Cliff Ambush Strike</div>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 space-y-1">
              <strong className="text-rose-300 block">Uphill Disadvantage</strong>
              <div>−10% Attack Damage per tier below</div>
              <div>−1 D20 Roll Penalty</div>
              <div>Ascendant ignores uphill penalty</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'tactical_hover',
      title: '6. Live Tactical Hover, Whole-Board Support & Odds',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Hovering over any piece computes real-time tactical intelligence across the entire 3D board:
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <strong className="text-emerald-300 block">Friendly Piece Inspection</strong>
              <div>
                Displays current HP, ATK, DEF, EVA, and CRIT stats; elevation tier; plus live whole-board relationships: <span className="text-emerald-400 font-semibold">Protected ×N</span> and <span className="text-rose-400 font-semibold">Threatened ×N</span>.
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-900/40 space-y-1">
              <strong className="text-rose-300 block">Legal Enemy Target Hover</strong>
              <div>
                Hovering an in-range enemy target previews either the <span className="text-amber-400 font-mono">1d20</span> odds (Hit %, Evade %, Crit %, expected damage, one-hit kill chance) or the <span className="text-amber-300 font-mono">1-of-3 Rock·Paper·Scissors</span> mirror matchup.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'ai_teaching_and_playbook',
      title: '7. Master AI Advantage Conversion, 10-Point Hierarchy & Playbook',
      icon: <GraduationCap className="w-5 h-5 text-amber-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            The AI defaults to <strong className="text-amber-300">Master Difficulty</strong> and features a dual-mode <strong className="text-white">Visual Chess Coach &amp; AI Playbook Log</strong> panel:
          </p>
          <div className="space-y-1.5 text-[11px]">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/40">
              <strong className="text-rose-300">Advantage Conversion Doctrine (Herding vs. Chasing):</strong> When the opponent has few pieces remaining or the AI holds overwhelming force, the AI shifts from <em>develop → defend → gain position → attack</em> to <strong>contain → coordinate → compress → force → mate</strong>.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
              <strong className="text-amber-300">10-Point AI Evaluation Hierarchy:</strong> (1) Forced checkmate → (2) Prevent own checkmate → (3) Build/maintain mating net → (4) Restrict enemy King mobility → (5) Prevent escape via rank/file cutoffs &amp; surface trapping → (6) Coordinate multiple attackers → (7) Remove critical defenders → (8) Give productive checks (penalizes pointless chasing checks in favor of non-checking moves that shrink legal King territory) → (9) Improve attack position → (10) Gain material.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <strong className="text-emerald-300">Anti-Loop &amp; Anti-Stalemate Protection:</strong> Penalizes lone-piece chasing, back-and-forth square oscillations (−5500), and stalemate traps (−95,000) so games convert cleanly into checkmate.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'interactive_drills',
      title: '8. Interactive Practice Scenarios (6 Hands-On Drills)',
      icon: <Repeat className="w-5 h-5 text-emerald-400" />,
      content: (
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Launch a hands-on tactical drill directly onto the 3D board to practice any capability:
          </p>
          <div className="space-y-2 text-[11px]">
            {INTERACTIVE_DRILLS.map((drill) => (
              <div
                key={drill.id}
                className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-amber-500/40 space-y-1.5 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-xs">{drill.title}</div>
                    <div className="text-[10px] font-mono text-amber-400">{drill.subtitle}</div>
                  </div>
                  {onLoadScenario && (
                    <button
                      onClick={() => {
                        onLoadScenario(drill);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wide shadow-sm transition-all shrink-0"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Load Drill</span>
                    </button>
                  )}
                </div>
                <p className="text-slate-300 leading-normal">{drill.objective}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20">
              <Compass className="w-5 h-5 text-sky-400" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Tactical Academy &amp; Rules
              </h3>
              <p className="text-[11px] text-slate-400">
                Complete Capabilities · 10 Units · 3D D20 &amp; RPS · Master AI Playbook
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Play Style Toggle (Open Surface vs Surface Bound) */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-purple-500/40 text-[11px]">
              <button
                onClick={() => handleTogglePlayStyle('open')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                  effectivePlayStyle === 'open'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Open Surface
              </button>
              <button
                onClick={() => handleTogglePlayStyle('surface_bound')}
                className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                  effectivePlayStyle === 'surface_bound'
                    ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Surface Bound
              </button>
            </div>

            <button
              onClick={downloadCompleteGameGuideTxt}
              title="Download Complete Game Capabilities, Piece Codex & Rules (.txt)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Rules (.txt)</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Indicator Navigation */}
        <div className="flex items-center justify-between py-3 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                  idx === currentStep
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {currentStep + 1} of {steps.length}
          </span>
        </div>

        {/* Step Content */}
        <div className="py-4 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            {steps[currentStep].icon}
            <h4>{steps[currentStep].title}</h4>
          </div>
          {steps[currentStep].content}
        </div>

        {/* Bottom Navigation */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>

          {onOpenPieceGuide && (
            <button
              onClick={() => {
                onClose();
                onOpenPieceGuide();
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
            >
              Open Piece Codex (10 Units)
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md transition-all"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 shadow-md transition-all"
            >
              Got It, Let&apos;s Play!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
