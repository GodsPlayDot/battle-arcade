import React, { useState } from 'react';
import {
  AIDifficulty,
  ArmyDeployment,
  BeaconSideMode,
  BoardType,
  GameMode,
  PieceColor,
  PlayStyle,
  PlayerMode,
  VisibilitySettings,
} from '../types/chess';
import { normalizeAIDifficulty } from '../logic/chessAI';
import { INTERACTIVE_DRILLS, InteractiveDrillScenario } from './TutorialModal';
import { downloadCompleteGameGuideTxt } from '../data/completeGameGuideText';
import {
  Play,
  BookOpen,
  GraduationCap,
  Eye,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Compass,
  Download,
  Sliders,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface GameStartMenuProps {
  isOpen: boolean;
  hasActiveMatch: boolean;
  boardType: BoardType;
  armyDeployment: ArmyDeployment;
  gameMode: GameMode;
  playStyle: PlayStyle;
  playerMode: PlayerMode;
  humanColor: PieceColor;
  aiDifficulty: AIDifficulty;
  autoRematch: boolean;
  cameraPreset: string;
  soundEnabled: boolean;
  isTeacherPanelOpen: boolean;
  visibilitySettings: VisibilitySettings;
  onSelectBoardType: (type: BoardType) => void;
  onSelectArmyDeployment: (dep: ArmyDeployment) => void;
  onSelectGameMode: (mode: GameMode) => void;
  onSelectPlayStyle: (style: PlayStyle) => void;
  onSelectPlayerMode: (mode: PlayerMode) => void;
  onSelectHumanColor: (color: PieceColor) => void;
  onSelectAIDifficulty: (diff: AIDifficulty) => void;
  onToggleAutoRematch: () => void;
  onSelectCameraPreset: (preset: string) => void;
  onToggleSound: () => void;
  onToggleTeacherPanel: () => void;
  onUpdateVisibilitySettings: (updates: Partial<VisibilitySettings>) => void;
  onLaunchMatch: () => void;
  onResumeMatch: () => void;
  onOpenPieceGuide: () => void;
  onOpenTutorial: () => void;
  onLoadScenario: (scenario: InteractiveDrillScenario) => void;
}

const AI_DIFFICULTY_DESCRIPTIONS: Record<
  'Beginner' | 'Developing' | 'Intermediate' | 'Advanced' | 'Expert',
  { summary: string; depthLabel: string }
> = {
  Beginner: {
    summary:
      'Recognizes immediate threats, makes understandable plans, and sometimes overlooks deeper multi-move tactics.',
    depthLabel: '1-Ply Search · High Variation',
  },
  Developing: {
    summary:
      'Defends consistently, verifies static recaptures, recognizes basic combinations, and begins coordinating pieces.',
    depthLabel: '1–2 Ply Search · Balanced Defense',
  },
  Intermediate: {
    summary:
      'Searches further ahead, creates multi-move threats, recognizes pins and summit traps, and uses Pyramid terrain purposefully.',
    depthLabel: '2-Ply Search · Terrain & Trap Aware',
  },
  Advanced: {
    summary:
      'Anticipates opponent counterplay, maintains coordinated multi-turn plans, converts advantages, and avoids tactical errors.',
    depthLabel: '2–3 Ply Search · Counterplay Verified',
  },
  Expert: {
    summary:
      'Uses the strongest search and evaluation, explores multiple strategic plans, and executes Contain → Coordinate → Compress → Force → Mate.',
    depthLabel: 'Adaptive 3-Ply Search · Full Precision',
  },
};

export const GameStartMenu: React.FC<GameStartMenuProps> = ({
  isOpen,
  hasActiveMatch,
  boardType,
  armyDeployment,
  gameMode,
  playStyle,
  playerMode,
  humanColor,
  aiDifficulty,
  autoRematch,
  cameraPreset,
  soundEnabled,
  isTeacherPanelOpen,
  visibilitySettings,
  onSelectBoardType,
  onSelectArmyDeployment,
  onSelectGameMode,
  onSelectPlayStyle,
  onSelectPlayerMode,
  onSelectHumanColor,
  onSelectAIDifficulty,
  onToggleAutoRematch,
  onSelectCameraPreset,
  onToggleSound,
  onToggleTeacherPanel,
  onUpdateVisibilitySettings,
  onLaunchMatch,
  onResumeMatch,
  onOpenPieceGuide,
  onOpenTutorial,
  onLoadScenario,
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'modes'>('setup');
  const [isPeekingBoard, setIsPeekingBoard] = useState(false);

  if (!isOpen) return null;

  const activeDifficulty = normalizeAIDifficulty(aiDifficulty);
  const diffMeta = AI_DIFFICULTY_DESCRIPTIONS[activeDifficulty];

  const boardLabel =
    boardType === 'pyramid'
      ? '20×20 Grand Pyramid'
      : boardType === 'quick_pyramid'
      ? '12×12 Quick Pyramid'
      : boardType === 'battlefield'
      ? '20×20 Flat Battlefield'
      : '8×8 Classic Chess';

  const armyCountText =
    armyDeployment === 'kingdom'
      ? boardType === 'pyramid'
        ? gameMode === 'rpg'
          ? '29 pieces / side (58 total)'
          : '26 pieces / side (52 total)'
        : '24 pieces / side (48 total)'
      : boardType === 'pyramid'
      ? gameMode === 'rpg'
        ? '21 pieces / side (42 total)'
        : '18 pieces / side (36 total)'
      : '16 pieces / side (32 total)';

  const handleQuickPresetLaunch = (preset: {
    board: BoardType;
    army: ArmyDeployment;
    mode: GameMode;
    style: PlayStyle;
    players: PlayerMode;
    color?: PieceColor;
    diff?: AIDifficulty;
  }) => {
    onSelectBoardType(preset.board);
    onSelectArmyDeployment(preset.army);
    onSelectGameMode(preset.mode);
    onSelectPlayStyle(preset.style);
    onSelectPlayerMode(preset.players);
    if (preset.color) onSelectHumanColor(preset.color);
    if (preset.diff) onSelectAIDifficulty(preset.diff);
    setTimeout(() => {
      onLaunchMatch();
    }, 30);
  };

  // When peeking at the live 3D board, collapse the menu into a clean bottom bar so the player can orbit/inspect the 3D scene
  if (isPeekingBoard) {
    return (
      <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4 pointer-events-none">
        <div className="flex items-center gap-4 px-6 py-3.5 rounded-2xl bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-100 shadow-2xl pointer-events-auto">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">{boardLabel}</span>
            <span className="mx-2 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>{armyDeployment === 'kingdom' ? 'Kingdom Army' : 'Standard Army'}</span>
            <span className="mx-2 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>{playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface'}</span>
            <span className="mx-2 text-slate-600" aria-hidden="true">
              ·
            </span>
            <span>{gameMode === 'rpg' ? 'RPG Battle Chess' : 'Standard Chess'}</span>
          </div>

          <button
            onClick={() => setIsPeekingBoard(false)}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            Return to Start Menu
          </button>

          <button
            onClick={() => {
              setIsPeekingBoard(false);
              onLaunchMatch();
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Match</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950/85 backdrop-blur-md text-slate-100 overflow-y-auto pointer-events-auto">
      {/* 3-Zone Top Bar Contract */}
      <header className="w-full max-w-[1360px] mx-auto flex items-center justify-between px-6 py-4 border-b border-slate-800/80 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('setup');
          }}
          className="font-display text-xl font-bold tracking-wide text-amber-400 whitespace-nowrap shrink-0"
        >
          Ascension Chess
        </a>

        {/* Zone 2: 4–5 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveTab('setup')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'setup'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Match Setup
          </button>
          <button
            onClick={() => setActiveTab('modes')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
              activeTab === 'modes'
                ? 'text-white border-amber-400 font-semibold'
                : 'text-slate-400 border-transparent hover:text-white'
            }`}
          >
            Presets &amp; 3D Drills
          </button>
          <button
            onClick={onOpenPieceGuide}
            className="py-1 text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Piece Codex &amp; Workshop
          </button>
          <button
            onClick={onOpenTutorial}
            className="py-1 text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Rules &amp; Tutorial
          </button>
          <button
            onClick={downloadCompleteGameGuideTxt}
            className="hidden xl:inline-block py-1 text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Rulebook (.txt)
          </button>
        </nav>

        {/* Zone 3: 1–2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPeekingBoard(true)}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Preview 3D Board
          </button>
          {hasActiveMatch && (
            <button
              onClick={onResumeMatch}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 transition-colors whitespace-nowrap shrink-0"
            >
              Resume Match
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container (1440px Desktop Baseline) */}
      <main className="w-full max-w-[1360px] mx-auto flex-1 px-6 py-8 flex flex-col justify-between gap-8">
        {/* Hero Header */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-medium text-amber-400/90 tracking-wide">
              Three-Dimensional Ziggurat Warfare · Authoritative Summit Rules · 5-Level Tactical AI
            </p>
            <h1
              className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Command the Ziggurat, Conquer the Vertical Walls, and Seal the Summit
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Configure your battlefield geometry, surface combat laws, army deployment, and AI opponent below, or jump directly into an interactive 3D tactical drill.
            </p>
          </div>

          {/* Mobile Tab Switcher + Quick Reference Access */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex md:hidden items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab('setup')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'setup' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Match Setup
              </button>
              <button
                onClick={() => setActiveTab('modes')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeTab === 'modes' ? 'bg-amber-500 text-slate-950' : 'text-slate-300'
                }`}
              >
                Presets &amp; Drills
              </button>
            </div>

            <button
              onClick={onOpenPieceGuide}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              <span>Piece Codex &amp; Workshop</span>
            </button>

            <button
              onClick={onOpenTutorial}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Rules, Tutorial &amp; Drills</span>
            </button>
          </div>
        </section>

        {activeTab === 'setup' ? (
          /* ==========================================
             TAB 1: 5-PILLAR MATCH SETUP & SYSTEMS DECK
             ========================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left & Center Columns (8 cols): The 5 Canonical Match Setup Pillars */}
            <div className="lg:col-span-8 space-y-8">
              {/* 01. Battlefield Geometry */}
              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold text-white">01. Battlefield Geometry</h2>
                  <span className="text-xs text-slate-400 font-mono-tabular">
                    Active: {boardLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      id: 'pyramid' as BoardType,
                      title: '20×20 Grand Pyramid',
                      meta: '4 Ziggurat Tiers · Vertical Cliff Walls · 4×4 Summit Apex',
                      desc: 'Full-scale multi-tiered ziggurat campaign featuring Vanguards, Rook Exchanges, and 1-tile Summit exit blockades.',
                    },
                    {
                      id: 'quick_pyramid' as BoardType,
                      title: '12×12 Quick Pyramid',
                      meta: '4 Ziggurat Tiers · Compact 12×12 Footprint · 4×4 Summit Apex',
                      desc: 'Fast-paced 3D pyramid warfare where armies clash immediately over terrace steps and vertical walls.',
                    },
                    {
                      id: 'battlefield' as BoardType,
                      title: '20×20 Flat Battlefield',
                      meta: 'Single-Plane 400-Tile Arena · Extended 13-Tile Sliders',
                      desc: 'Vast open maneuver plain built for deep flanking sweeps, Vanguard-Rook swaps, and long-range artillery.',
                    },
                    {
                      id: 'classic' as BoardType,
                      title: '8×8 Classic Chess',
                      meta: '64 Squares · Traditional Royal Formation',
                      desc: 'Standard 8×8 chess board compatible with both deterministic Standard Chess and D20 RPG Battle Chess.',
                    },
                  ].map((b) => {
                    const active = boardType === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => onSelectBoardType(b.id)}
                        className={`text-left p-4 rounded-xl border transition-colors ${
                          active
                            ? 'bg-slate-900 border-amber-400/80 text-white'
                            : 'bg-slate-900/50 border-slate-800/90 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white">{b.title}</span>
                          <span className="text-xs font-mono-tabular text-amber-400">
                            {active ? 'Selected' : 'Select'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{b.meta}</p>
                        <p className="text-xs text-slate-300/90 mt-2 leading-relaxed">{b.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* 02. Surface Play Style, Combat System & Army Deployment */}
              <section className="space-y-4 pt-6 border-t border-slate-800/80">
                <h2 className="text-base font-semibold text-white">
                  02. Surface Law, Combat System &amp; Army Formation
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Play Style */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-300">3D Surface Law</div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        onClick={() => onSelectPlayStyle('surface_bound')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          playStyle === 'surface_bound'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Surface Bound
                      </button>
                      <button
                        onClick={() => onSelectPlayStyle('open_surface')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          playStyle === 'open_surface'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Open Surface
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {playStyle === 'surface_bound'
                        ? 'Non-Pawns capture only on their current surface plane. Knights reaching the 4×4 Summit permanently unlock Color Release.'
                        : 'All pieces move and capture freely across horizontal terraces and vertical cliff walls.'}
                    </p>
                  </div>

                  {/* Combat Rules */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-300">Combat System</div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        onClick={() => onSelectGameMode('standard')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          gameMode === 'standard'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Standard Chess
                      </button>
                      <button
                        onClick={() => onSelectGameMode('rpg')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          gameMode === 'rpg'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        RPG Battle
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {gameMode === 'standard'
                        ? 'Deterministic 1-strike captures, classical check, checkmate, and Last One Standing victory.'
                        : 'HP, ATK, DEF, D20 tactical combat rolls, RPS mirror clashes, plus Gargoyles, Ascendants & Trebuchets on Grand Pyramid.'}
                    </p>
                  </div>

                  {/* Army Deployment */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-slate-300">Army Deployment</div>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                      <button
                        onClick={() => onSelectArmyDeployment('kingdom')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          armyDeployment === 'kingdom'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Kingdom Army
                      </button>
                      <button
                        onClick={() => onSelectArmyDeployment('standard')}
                        className={`px-2.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                          armyDeployment === 'standard'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Standard Army
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono-tabular">
                      {armyCountText}.{' '}
                      {armyDeployment === 'kingdom'
                        ? 'Full royal battalions with expanded flank detachments.'
                        : 'Streamlined classical chess formation.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 03. Players, Side Selection & 5-Level AI Intelligence */}
              <section className="space-y-4 pt-6 border-t border-slate-800/80">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold text-white">
                    03. Players, Command Side &amp; AI Intelligence
                  </h2>
                  <span className="text-xs text-slate-400">
                    {playerMode === 'human_vs_ai'
                      ? `Human (${humanColor === 'white' ? 'White' : 'Black'}) vs ${activeDifficulty} AI`
                      : playerMode === 'ai_vs_ai'
                      ? `Autonomous AI vs AI (${activeDifficulty})`
                      : '2-Player Local Pass & Play'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      mode: 'human_vs_ai' as PlayerMode,
                      title: 'Human vs AI',
                      desc: 'Command White or Black against the 5-level strategic AI.',
                    },
                    {
                      mode: 'human_vs_human' as PlayerMode,
                      title: '2-Player Pass & Play',
                      desc: 'Two human commanders share the 3D battlefield locally.',
                    },
                    {
                      mode: 'ai_vs_ai' as PlayerMode,
                      title: 'AI vs AI Simulation',
                      desc: 'Watch two autonomous AIs clash with live AI Teacher commentary.',
                    },
                  ].map((pm) => {
                    const active = playerMode === pm.mode;
                    return (
                      <button
                        key={pm.mode}
                        onClick={() => onSelectPlayerMode(pm.mode)}
                        className={`text-left p-3.5 rounded-xl border transition-colors ${
                          active
                            ? 'bg-slate-900 border-amber-400/80 text-white'
                            : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">{pm.title}</div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{pm.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Human Side + 5-Level AI Difficulty Controls */}
                {playerMode !== 'human_vs_human' && (
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
                    {playerMode === 'human_vs_ai' && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <span className="text-xs font-semibold text-slate-300">
                          Your Command Side:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectHumanColor('white')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              humanColor === 'white'
                                ? 'bg-white text-slate-950'
                                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            Play as White (First Move · South)
                          </button>
                          <button
                            onClick={() => onSelectHumanColor('black')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                              humanColor === 'black'
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                            }`}
                          >
                            Play as Black (Counter · North)
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                          AI Playing Intelligence (5 Levels):
                        </span>
                        <span className="text-xs font-mono-tabular text-amber-400">
                          {activeDifficulty} · {diffMeta.depthLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {(
                          [
                            'Beginner',
                            'Developing',
                            'Intermediate',
                            'Advanced',
                            'Expert',
                          ] as const
                        ).map((level) => {
                          const isSelected = activeDifficulty === level;
                          return (
                            <button
                              key={level}
                              onClick={() => onSelectAIDifficulty(level)}
                              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap truncate ${
                                isSelected
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed pt-1">
                        <strong className="text-slate-200">{activeDifficulty}:</strong>{' '}
                        {diffMeta.summary}
                      </p>
                    </div>

                    {playerMode === 'ai_vs_ai' && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-xs text-slate-300">
                          Continuous Auto-Rematch &amp; Cross-Game Learning:
                        </span>
                        <button
                          onClick={onToggleAutoRematch}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            autoRematch
                              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-950 border border-slate-800 text-slate-400'
                          }`}
                        >
                          {autoRematch ? 'Auto-Rematch Enabled' : 'Single Match'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column (4 cols): Match Summary, 3D Viewport & Visibility Systems, and Primary Launch CTA */}
            <div className="lg:col-span-4 space-y-6">
              {/* Primary Launch Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-amber-400">Active Deployment Brief</div>
                  <h3 className="font-display text-xl font-bold text-white">{boardLabel}</h3>
                  <p className="text-xs text-slate-400 font-mono-tabular">
                    {armyCountText} · {playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface'} ·{' '}
                    {gameMode === 'rpg' ? 'RPG Rules' : 'Standard Rules'}
                  </p>
                </div>

                {/* Single Dominant Focal CTA */}
                <div className="space-y-2.5">
                  <button
                    onClick={onLaunchMatch}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition-colors whitespace-nowrap"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{hasActiveMatch ? 'Start Fresh Match' : 'Launch Match'}</span>
                  </button>

                  {hasActiveMatch && (
                    <button
                      onClick={onResumeMatch}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resume In-Progress Match</span>
                    </button>
                  )}
                </div>

                {/* 04. 3D Viewport, Visibility & Audio Systems */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="text-xs font-semibold text-white">
                    04. 3D Viewport, Visibility &amp; Audio
                  </div>

                  {/* Camera Preset */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>Starting Camera View</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'isometric', label: 'Isometric' },
                        { id: 'top_down', label: 'Top-Down' },
                        { id: 'vertical_side', label: 'Wall Side' },
                        { id: 'white_view', label: 'White Side' },
                        { id: 'black_view', label: 'Black Side' },
                        { id: 'side_profile', label: 'Profile' },
                      ].map((cam) => (
                        <button
                          key={cam.id}
                          onClick={() => onSelectCameraPreset(cam.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                            cameraPreset === cam.id
                              ? 'bg-slate-800 border border-amber-400/70 text-amber-300 font-semibold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {cam.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pyramid Glass Transparency & Opacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Pyramid Transparency</span>
                      </span>
                      <span className="font-mono-tabular text-slate-400">
                        {visibilitySettings.terrainTransparency === 'off'
                          ? 'Solid'
                          : `${visibilitySettings.pyramidOpacity}% Opacity`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'on', label: 'Glass On' },
                          { id: 'auto', label: 'Auto X-Ray' },
                          { id: 'off', label: 'Solid Stone' },
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() =>
                            onUpdateVisibilitySettings({ terrainTransparency: mode.id })
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                            visibilitySettings.terrainTransparency === mode.id
                              ? 'bg-slate-800 border border-amber-400/70 text-amber-300 font-semibold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    {visibilitySettings.terrainTransparency !== 'off' && (
                      <input
                        type="range"
                        min={10}
                        max={90}
                        step={5}
                        value={visibilitySettings.pyramidOpacity}
                        onChange={(e) =>
                          onUpdateVisibilitySettings({
                            pyramidOpacity: Number(e.target.value),
                          })
                        }
                        aria-label="Pyramid Opacity Percentage"
                        className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                      />
                    )}
                  </div>

                  {/* Hidden Piece Beacons */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300">3D Piece Beacons:</span>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          { id: 'both', label: 'Both' },
                          { id: 'opponent', label: 'Enemy' },
                          { id: 'off', label: 'Off' },
                        ] as { id: BeaconSideMode; label: string }[]
                      ).map((b) => (
                        <button
                          key={b.id}
                          onClick={() =>
                            onUpdateVisibilitySettings({
                              hiddenPieceBeacons: b.id !== 'off',
                              beaconSide: b.id,
                            })
                          }
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                            visibilitySettings.beaconSide === b.id
                              ? 'bg-slate-800 border border-amber-400/70 text-amber-300 font-semibold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Toggles Row: Night Mode, AI Teacher Panel, Sound */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() =>
                        onUpdateVisibilitySettings({
                          nightMode: !(visibilitySettings.nightMode ?? true),
                        })
                      }
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                    >
                      {visibilitySettings.nightMode ?? true ? (
                        <>
                          <Moon className="w-3.5 h-3.5 text-amber-400" />
                          <span>Night</span>
                        </>
                      ) : (
                        <>
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>Daylight</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={onToggleTeacherPanel}
                      className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                        isTeacherPanelOpen
                          ? 'bg-slate-800 border-amber-400/60 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>{isTeacherPanelOpen ? 'Teacher On' : 'Teacher Off'}</span>
                    </button>

                    <button
                      onClick={onToggleSound}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                    >
                      {soundEnabled ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Audio On</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                          <span>Muted</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ==========================================
             TAB 2: QUICK-LAUNCH PRESETS & INTERACTIVE 3D DRILLS
             ========================================== */
          <div className="space-y-8">
            {/* Curated 1-Click Campaign Presets */}
            <section className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-white">
                  01. Instant Campaign &amp; Arena Presets
                </h2>
                <span className="text-xs text-slate-400">
                  One-click configuration and immediate launch
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: 'Grand Ziggurat Campaign',
                    meta: '20×20 Pyramid · Surface Bound · Human vs AI',
                    desc: 'Command the White Kingdom Army up the 4-tier Grand Pyramid against the Intermediate AI.',
                    config: {
                      board: 'pyramid' as BoardType,
                      army: 'kingdom' as ArmyDeployment,
                      mode: 'standard' as GameMode,
                      style: 'surface_bound' as PlayStyle,
                      players: 'human_vs_ai' as PlayerMode,
                      color: 'white' as PieceColor,
                      diff: 'Intermediate' as AIDifficulty,
                    },
                  },
                  {
                    title: 'Quick Pyramid Blitz',
                    meta: '12×12 Pyramid · Open Surface · Human vs AI',
                    desc: 'Immediate high-ground skirmishes over the 4×4 Summit Apex with Standard 16-piece armies.',
                    config: {
                      board: 'quick_pyramid' as BoardType,
                      army: 'standard' as ArmyDeployment,
                      mode: 'standard' as GameMode,
                      style: 'open_surface' as PlayStyle,
                      players: 'human_vs_ai' as PlayerMode,
                      color: 'white' as PieceColor,
                      diff: 'Developing' as AIDifficulty,
                    },
                  },
                  {
                    title: 'RPG Ziggurat Siege',
                    meta: '20×20 Pyramid · RPG Battle · Specialists Unlocked',
                    desc: 'Unleash Gargoyles, Ascendants, and Trebuchet knockbacks with D20 combat and RPS mirror clashes.',
                    config: {
                      board: 'pyramid' as BoardType,
                      army: 'kingdom' as ArmyDeployment,
                      mode: 'rpg' as GameMode,
                      style: 'open_surface' as PlayStyle,
                      players: 'human_vs_ai' as PlayerMode,
                      color: 'white' as PieceColor,
                      diff: 'Advanced' as AIDifficulty,
                    },
                  },
                  {
                    title: 'AI vs AI Master Arena',
                    meta: '20×20 Pyramid · Expert AI vs AI · Teacher HUD',
                    desc: 'Spectate two autonomous Expert AIs executing multi-turn containment and summit blockades.',
                    config: {
                      board: 'pyramid' as BoardType,
                      army: 'kingdom' as ArmyDeployment,
                      mode: 'standard' as GameMode,
                      style: 'surface_bound' as PlayStyle,
                      players: 'ai_vs_ai' as PlayerMode,
                      diff: 'Expert' as AIDifficulty,
                    },
                  },
                ].map((preset) => (
                  <div
                    key={preset.title}
                    className="flex flex-col justify-between p-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
                  >
                    <div className="space-y-1.5">
                      <h3 className="text-sm font-semibold text-white">{preset.title}</h3>
                      <p className="text-xs text-amber-400/90">{preset.meta}</p>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">{preset.desc}</p>
                    </div>
                    <button
                      onClick={() => handleQuickPresetLaunch(preset.config)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <span>Play Preset</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive 3D Practice Drills */}
            <section className="space-y-3 pt-6 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-white">
                  02. Interactive 3D Practice Drills
                </h2>
                <span className="text-xs text-slate-400">
                  Hands-on playable scenarios teaching Pyramid &amp; Summit mechanics
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {INTERACTIVE_DRILLS.map((drill, idx) => (
                  <div
                    key={drill.id}
                    className="flex flex-col justify-between p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="text-xs font-mono-tabular text-slate-400">
                        0{idx + 1}. {drill.subtitle}
                      </div>
                      <h3 className="text-sm font-semibold text-white">
                        {drill.title.replace(/^Drill \d+:\s*/, '')}
                      </h3>
                      <p className="text-xs text-slate-300 leading-relaxed pt-1">
                        {drill.objective}
                      </p>
                    </div>

                    <button
                      onClick={() => onLoadScenario(drill)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-100 hover:text-slate-950 text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch 3D Drill</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Quiet Footer with Direct Feature Links */}
        <footer className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Ascension Chess · 3D Ziggurat &amp; Battle Chess Strategy · Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono-tabular text-slate-300">
              Tab
            </kbd>{' '}
            in-game to toggle Clean Board View
          </div>

          <div className="flex items-center gap-5">
            <button
              onClick={onOpenPieceGuide}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Piece Capabilities &amp; Workshop
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={onOpenTutorial}
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Interactive Rules &amp; Questionnaire
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={downloadCompleteGameGuideTxt}
              className="flex items-center gap-1 hover:text-white transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Guide (.txt)</span>
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
};
