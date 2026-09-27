import React, { useState } from 'react';
import {
  ArmyDeployment,
  BeaconSideMode,
  BoardType,
  GameMode,
  Piece,
  PieceColor,
  PlayStyle,
  PlayerMode,
  VisibilitySettings,
} from '../types/chess';
import { PieceCapabilitiesDropdown } from './PieceCapabilitiesDropdown';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  Settings,
  Trophy,
  Swords,
  Layers,
  Eye,
  BookOpen,
  ChevronUp,
  ChevronDown,
  Users,
  Play,
  Square,
  Bot,
  Undo2,
  Flag,
  Sliders,
  Maximize2,
  Minimize2,
  Shield,
  Moon,
  Sun,
} from 'lucide-react';

interface HUDProps {
  boardType: BoardType;
  armyDeployment: ArmyDeployment;
  gameMode: GameMode;
  playStyle?: PlayStyle;
  currentTurn: PieceColor;
  turnCount: number;
  inCheck: boolean;
  winner: PieceColor | 'draw' | null;
  capturedWhite: Piece[];
  capturedBlack: Piece[];
  pieces?: Piece[];
  onFocusPiece?: (pieceId: string) => void;
  cameraPreset: string;
  isMatchActive?: boolean;
  isMatchLocked?: boolean;
  playerMode?: PlayerMode;
  humanColor?: PieceColor;
  onSelectBoardType?: (type: BoardType) => void;
  onSelectArmyDeployment?: (dep: ArmyDeployment) => void;
  onSelectGameMode?: (mode: GameMode) => void;
  onSelectPlayStyle?: (style: PlayStyle) => void;
  onSelectPlayerMode?: (mode: PlayerMode) => void;
  onSelectCameraPreset: (preset: string) => void;
  onOpenStartMenu?: () => void;
  onOpenSettings: () => void;
  onOpenTutorial: () => void;
  onOpenPieceGuide: () => void;
  onRestartGame: () => void;
  onStopEndGame?: () => void;
  onTriggerResetConfirm?: () => void;
  onTriggerReady?: () => void;
  onUndoMove?: () => void;
  canUndo?: boolean;
  visibilitySettings?: VisibilitySettings;
  onUpdateVisibilitySettings?: (updates: Partial<VisibilitySettings>) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  vsAI: boolean;
  highlightVerticalTiles?: boolean;
  onToggleHighlightVerticalTiles?: () => void;
  isCleanBoardMode?: boolean;
  onToggleCleanBoardMode?: () => void;
  autoRematch?: boolean;
  onToggleAutoRematch?: () => void;
  autoRematchCountdown?: number | null;
}

export const HUD: React.FC<HUDProps> = React.memo(({
  boardType,
  armyDeployment,
  gameMode,
  playStyle = 'surface_bound',
  currentTurn,
  turnCount,
  inCheck,
  winner,
  capturedWhite,
  capturedBlack,
  pieces = [],
  onFocusPiece,
  cameraPreset,
  isMatchActive = true,
  playerMode = 'ai_vs_ai',
  humanColor = 'white',
  onSelectBoardType,
  onSelectArmyDeployment,
  onSelectGameMode,
  onSelectPlayStyle,
  onSelectPlayerMode,
  onSelectCameraPreset,
  onOpenStartMenu,
  onOpenSettings,
  onOpenTutorial,
  onOpenPieceGuide,
  onRestartGame,
  onStopEndGame,
  onTriggerReady,
  onUndoMove,
  canUndo = false,
  visibilitySettings,
  onUpdateVisibilitySettings,
  soundEnabled,
  onToggleSound,
  isCleanBoardMode = false,
  onToggleCleanBoardMode,
  autoRematch = true,
  onToggleAutoRematch,
  autoRematchCountdown = null,
}) => {
  const [showTacticsDrawer, setShowTacticsDrawer] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showPlayerMenu, setShowPlayerMenu] = useState(false);
  const [isTopBarExpanded, setIsTopBarExpanded] = useState(false);

  const cameraOptions = [
    { id: 'isometric', label: 'Isometric 3D' },
    { id: 'top_down', label: 'Top-Down' },
    { id: 'vertical_side', label: 'Vertical Wall (On Side)' },
    { id: 'white_view', label: 'White View' },
    { id: 'black_view', label: 'Black View' },
    { id: 'side_profile', label: 'Side Angles' },
  ];

  const boardOptions: { type: BoardType; label: string; desc: string }[] = [
    { type: 'quick_pyramid', label: '12×12 Quick Pyramid', desc: 'Elevated 4×4 Summit, fast paced' },
    { type: 'pyramid', label: '20×20 Grand Pyramid', desc: 'Full 4-tier ziggurat campaign' },
    { type: 'battlefield', label: '20×20 Battlefield', desc: 'Vast flat flanking plain' },
    { type: 'classic', label: '8×8 Classic', desc: 'Standard chess battlefield' },
  ];

  const boardLabel =
    boardType === 'quick_pyramid'
      ? '12×12 Pyramid'
      : boardType === 'pyramid'
      ? '20×20 Pyramid'
      : boardType === 'battlefield'
      ? '20×20 Plain'
      : '8×8 Classic';

  const isGrandPyramidRpg = boardType === 'pyramid' && gameMode === 'rpg';

  const armyLabel =
    armyDeployment === 'kingdom'
      ? boardType === 'pyramid'
        ? isGrandPyramidRpg
          ? 'Kingdom (58)'
          : 'Kingdom (52)'
        : 'Kingdom (48)'
      : boardType === 'pyramid'
      ? isGrandPyramidRpg
        ? 'Standard (42)'
        : 'Standard (36)'
      : 'Standard (32)';

  const modeLabel = gameMode === 'rpg' ? 'RPG Rules' : 'Classic Rules';
  const playStyleLabel = playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface';

  const playerModeLabel =
    playerMode === 'human_vs_human'
      ? '2P Local'
      : playerMode === 'ai_vs_ai'
      ? 'AI vs AI'
      : `vs AI (${humanColor === 'white' ? 'W' : 'B'})`;

  if (isCleanBoardMode) {
    return (
      <div className="absolute top-2 left-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-white shadow-xl pointer-events-auto">
        <span
          className={`w-2 h-2 rounded-full ${
            !isMatchActive
              ? 'bg-slate-500'
              : currentTurn === 'white'
              ? 'bg-amber-300 animate-pulse'
              : 'bg-indigo-400 animate-pulse'
          }`}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {isMatchActive ? `${currentTurn} · T${turnCount}` : 'Standby'}
        </span>
        {inCheck && !winner && (
          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/30 border border-rose-500 text-rose-200 text-[9px] font-bold">
            CHECK
          </span>
        )}
        {visibilitySettings && onUpdateVisibilitySettings && (
          <button
            onClick={() =>
              onUpdateVisibilitySettings({
                nightMode: !(visibilitySettings.nightMode ?? true),
              })
            }
            title="Toggle Night Mode (Low-Glare & Distance View)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-colors ${
              visibilitySettings.nightMode ?? true
                ? 'bg-indigo-950/90 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-sky-300'
            }`}
          >
            {visibilitySettings.nightMode ?? true ? (
              <>
                <Moon className="w-3 h-3 text-amber-300" />
                <span>Night: ON</span>
              </>
            ) : (
              <>
                <Sun className="w-3 h-3 text-sky-300" />
                <span>Day Mode</span>
              </>
            )}
          </button>
        )}
        <button
          onClick={onToggleCleanBoardMode}
          title="Exit Clean Board Mode (Shortcut: Tab)"
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-semibold transition-colors"
        >
          <Minimize2 className="w-3 h-3" />
          <span>HUD [Tab]</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* MINIMIZED COMPACT TOP BAR NAVIGATION (Unified Brand + Turn Pill + Quick Controls) */}
      <header className="absolute top-0 inset-x-0 z-30 flex flex-col bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 text-white pointer-events-auto">
        <div className="flex items-center justify-between px-2.5 md:px-4 py-1 gap-2">
          {/* Left: Compact Brand & Expand/Minimize Toggle */}
          <div className="flex items-center gap-1.5">
            {onOpenStartMenu && (
              <button
                onClick={onOpenStartMenu}
                title="Open Game Start Menu"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <span>Main Menu</span>
              </button>
            )}

            <button
              onClick={() => setIsTopBarExpanded(!isTopBarExpanded)}
              title={isTopBarExpanded ? 'Minimize Top Controls' : 'Expand All Battlefield & Codex Controls'}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-white transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                Ascension 3D
              </span>
              {isTopBarExpanded ? (
                <ChevronUp className="w-3 h-3 text-amber-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-slate-400" />
              )}
            </button>

            {/* Quick Compact Pills (Always accessible) */}
            <div className="hidden md:flex items-center gap-1 text-[11px]">
              {/* Quick Board Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  title="Directly select battlefield topology"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg border text-slate-200 transition-colors bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-amber-500/50"
                >
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span className="font-semibold text-amber-200">{boardLabel}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {showBoardMenu && (
                  <div className="absolute left-0 mt-1 w-56 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                      Select Battlefield
                    </div>
                    {boardOptions.map((opt) => (
                      <button
                        key={opt.type}
                        onClick={() => {
                          onSelectBoardType?.(opt.type);
                          setShowBoardMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex flex-col ${
                          boardType === opt.type
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Ruleset Toggle */}
              <button
                onClick={() => {
                  const nextMode = gameMode === 'rpg' ? 'standard' : 'rpg';
                  onSelectGameMode?.(nextMode);
                }}
                title="Click to toggle Classic vs RPG Battle Rules"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all ${
                  gameMode === 'rpg'
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-200 hover:bg-rose-500/25'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Swords className="w-3 h-3 text-rose-400" />
                <span>{modeLabel}</span>
              </button>

              {/* Quick Play Style Toggle (Open Surface vs Surface Bound Challenge) */}
              <button
                onClick={() => {
                  const nextStyle = playStyle === 'surface_bound' ? 'open' : 'surface_bound';
                  onSelectPlayStyle?.(nextStyle);
                }}
                title="Click to toggle Play Style: Open Surface (standard continuous Pyramid) vs Surface Bound (same-surface combat & jump color lock until 4×4 Summit)"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all ${
                  playStyle === 'surface_bound'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-200 hover:bg-purple-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Shield className="w-3 h-3 text-purple-400" />
                <span>{playStyleLabel}</span>
              </button>

              {/* Quick Players Mode Switcher */}
              <div className="relative">
                <button
                  onClick={() => setShowPlayerMenu(!showPlayerMenu)}
                  title="Select Players configuration (Human vs AI, Human vs Human, AI vs AI)"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-medium transition-all ${
                    playerMode === 'ai_vs_ai'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/30'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {playerMode === 'ai_vs_ai' ? (
                    <Eye className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Bot className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>{playerModeLabel}</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {showPlayerMenu && (
                  <div className="absolute left-0 mt-1 w-48 p-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl z-40 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                      Player Mode
                    </div>
                    <button
                      onClick={() => {
                        onSelectPlayerMode?.('human_vs_ai');
                        setShowPlayerMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        playerMode === 'human_vs_ai'
                          ? 'bg-emerald-500/20 text-emerald-200 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>Human vs AI</span>
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectPlayerMode?.('human_vs_human');
                        setShowPlayerMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        playerMode === 'human_vs_human'
                          ? 'bg-emerald-500/20 text-emerald-200 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>Human vs Human</span>
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      onClick={() => {
                        onSelectPlayerMode?.('ai_vs_ai');
                        setShowPlayerMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${
                        playerMode === 'ai_vs_ai'
                          ? 'bg-emerald-500/20 text-emerald-200 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>AI vs AI Simulation</span>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Integrated Compact Turn & Check Pill (No more second stacked bar!) */}
          <div
            className={`flex items-center gap-2 px-2.5 py-0.5 rounded-full border text-[11px] transition-all ${
              !isMatchActive
                ? 'bg-slate-900/90 border-slate-700/80'
                : currentTurn === 'white'
                ? 'bg-slate-900/90 border-amber-400/70'
                : 'bg-slate-900/90 border-indigo-400/70'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full border ${
                !isMatchActive
                  ? 'bg-slate-600 border-slate-400'
                  : currentTurn === 'white'
                  ? 'bg-white border-amber-300 animate-pulse'
                  : 'bg-slate-900 border-indigo-400 animate-pulse'
              }`}
            />
            {isMatchActive ? (
              <span className="font-extrabold uppercase tracking-wider text-white">
                {currentTurn === 'white' ? 'White' : 'Black'}
                {playerMode === 'human_vs_ai' && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    {currentTurn === humanColor ? '(You)' : '(AI)'}
                  </span>
                )}
              </span>
            ) : (
              <span className="font-bold uppercase tracking-wider text-amber-300">
                Standby
              </span>
            )}
            <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-1.5">
              T{turnCount}
            </span>
            {inCheck && !winner && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 border border-rose-500 text-rose-200 text-[9px] font-black animate-bounce">
                CHECK!
              </span>
            )}
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-1.5">
              Lost W:{capturedWhite.length} B:{capturedBlack.length}
            </span>
          </div>

          {/* Right: Compact Action & Lifecycle Controls */}
          <div className="flex items-center gap-1">
            {playerMode === 'ai_vs_ai' && onToggleAutoRematch && (
              <button
                onClick={onToggleAutoRematch}
                title={
                  autoRematch
                    ? 'Auto-Rematch ON: AI vs AI automatically starts a new match to keep fighting & learning'
                    : 'Auto-Rematch OFF: Click to enable automatic AI vs AI rematches'
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                  autoRematch
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className={`w-3 h-3 ${autoRematch ? 'text-emerald-400 animate-spin' : ''}`} />
                <span className="hidden md:inline">Auto-Rematch:</span>
                <span>{autoRematch ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {isMatchActive && onUndoMove && (
              <button
                onClick={onUndoMove}
                disabled={!canUndo}
                title={canUndo ? 'Undo last move' : 'No moves to undo'}
                className={`p-1 bg-slate-900 border border-slate-800 rounded-lg transition-colors ${
                  canUndo
                    ? 'text-amber-300 hover:text-white hover:bg-slate-800'
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}

            <PieceCapabilitiesDropdown
              boardType={boardType}
              armyDeployment={armyDeployment}
              gameMode={gameMode}
              playStyle={playStyle}
              pieces={pieces}
              onFocusPiece={onFocusPiece}
            />

            <button
              onClick={onOpenPieceGuide}
              title="Open Piece Codex"
              className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-all"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span>Codex</span>
            </button>

            {visibilitySettings && onUpdateVisibilitySettings && (
              <button
                onClick={() =>
                  onUpdateVisibilitySettings({
                    nightMode: !(visibilitySettings.nightMode ?? true),
                  })
                }
                aria-label="Toggle Night Mode"
                title={
                  (visibilitySettings.nightMode ?? true)
                    ? 'Night Mode ON (Low-glare matte board & high-contrast distance emblems) — Click for Daylight Mode'
                    : 'Daylight Mode — Click for Night Mode (Easy on eyes in the dark & readable from a distance)'
                }
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold transition-all whitespace-nowrap ${
                  visibilitySettings.nightMode ?? true
                    ? 'bg-indigo-950/95 border-amber-400/60 text-amber-300 shadow-sm'
                    : 'bg-sky-950/80 border-sky-400/50 text-sky-200 hover:text-white'
                }`}
              >
                {visibilitySettings.nightMode ?? true ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-amber-300" />
                    <span>Night: ON</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-sky-300" />
                    <span>Day Mode</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onToggleSound}
              aria-label="Toggle Sound"
              className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              title="Open Game Setup & Visibility Settings"
              className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {onToggleCleanBoardMode && (
              <button
                onClick={onToggleCleanBoardMode}
                title="Clean View [Tab]"
                className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}

            {isMatchActive && !winner && onStopEndGame && (
              <button
                onClick={onStopEndGame}
                title="End the current game immediately"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-[11px] uppercase shadow-sm active:scale-95 transition-all whitespace-nowrap"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>End</span>
              </button>
            )}

            {(!isMatchActive || !!winner) && (
              <>
                <button
                  onClick={onOpenSettings}
                  title="Configure New Game Setup"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-500/40 text-amber-300 hover:text-white font-black text-[11px] uppercase transition-all whitespace-nowrap"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Setup</span>
                </button>

                <button
                  onClick={onTriggerReady || onRestartGame}
                  title="Start Game Now"
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] uppercase shadow-sm active:scale-95 transition-all whitespace-nowrap"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Start</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Optional Expanded Secondary Drawer (Only visible when user clicks Ascension 3D chevron) */}
        {isTopBarExpanded && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/95 border-t border-slate-800/80 text-xs animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  const nextDep = armyDeployment === 'standard' ? 'kingdom' : 'standard';
                  onSelectArmyDeployment?.(nextDep);
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-slate-950 border-slate-800 text-sky-200 text-[11px]"
              >
                <Users className="w-3 h-3 text-sky-400" />
                <span>{armyLabel}</span>
              </button>

              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-slate-950 border-slate-800 text-slate-300 hover:text-white text-[11px]"
              >
                <Compass className="w-3 h-3 text-sky-400" />
                <span>Rules &amp; Drills</span>
              </button>

              <button
                onClick={() => setShowTacticsDrawer(!showTacticsDrawer)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg border bg-slate-950 border-slate-800 text-amber-300 text-[11px]"
              >
                <Layers className="w-3 h-3 text-amber-400" />
                <span>Elevation Bonuses (+10% ATK/Tier)</span>
              </button>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {playStyle === 'surface_bound'
                ? 'Surface Bound: Same-Surface Combat · Jump Color Lock until 4×4 Summit'
                : 'Open Surface: Continuous 3D Surface (Floor ↔ Wall ↔ Terrace ↔ Summit)'}
            </span>
          </div>
        )}
      </header>

      {/* Floating Camera Selector (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 md:left-6 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300 uppercase tracking-wider font-semibold pl-1">
          <span>Camera Navigation</span>
          <div className="flex items-center gap-1.5">
            {visibilitySettings && onUpdateVisibilitySettings && (
              <button
                onClick={() =>
                  onUpdateVisibilitySettings({
                    focusCameraOnActiveMove: !visibilitySettings.focusCameraOnActiveMove,
                  })
                }
                title={
                  playerMode === 'ai_vs_ai'
                    ? 'Toggle Auto-Focus Camera on AI Active Move'
                    : 'When ON, camera switches to the other side ONLY after a move is placed (never while selecting or placing a piece)'
                }
                className={`px-1.5 py-0.5 rounded border font-mono text-[9px] transition-colors ${
                  visibilitySettings.focusCameraOnActiveMove
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {playerMode === 'ai_vs_ai'
                  ? `Auto-Focus: ${visibilitySettings.focusCameraOnActiveMove ? 'ON' : 'OFF'}`
                  : `Turn Side Switch: ${visibilitySettings.focusCameraOnActiveMove ? 'ON' : 'OFF'}`}
              </button>
            )}
            <span className="text-amber-400 font-mono text-[9px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              [↑ ↓ ← →] Keys
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/85 backdrop-blur-md border border-slate-800/90 rounded-xl shadow-lg">
          {cameraOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSelectCameraPreset(opt.id)}
              title={
                opt.id === 'vertical_side'
                  ? 'Put camera on its side looking down onto the vertical cliff walls (click again to cycle N/E/S/W walls)'
                  : `Switch camera to ${opt.label}`
              }
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                cameraPreset === opt.id
                  ? opt.id === 'vertical_side'
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm font-bold'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Visibility & Night Mode Dock (Bottom-Right) */}
      {visibilitySettings &&
        onUpdateVisibilitySettings && (
          <div className="absolute bottom-4 right-4 md:right-6 z-20 flex flex-col gap-1.5 pointer-events-auto">
            <div className="flex items-center justify-between text-[10px] text-slate-300 uppercase tracking-wider font-semibold px-1">
              <span className="flex items-center gap-1 text-amber-300">
                <Flag className="w-3 h-3 text-amber-400" />
                <span>Visibility &amp; Eye Comfort</span>
              </span>
              {(boardType === 'quick_pyramid' || boardType === 'pyramid') && (
                <span className="text-slate-400 font-mono text-[9px]">
                  Opacity {visibilitySettings.pyramidOpacity ?? 25}%
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 p-1.5 px-2.5 bg-slate-950/90 backdrop-blur-md border border-slate-800/90 rounded-xl shadow-lg text-xs">
              {/* Quick Night Mode / Day Mode Toggle */}
              <button
                onClick={() =>
                  onUpdateVisibilitySettings({
                    nightMode: !(visibilitySettings.nightMode ?? true),
                  })
                }
                title="Toggle Night Mode (Low-glare matte board & floating distance piece emblems) vs Bright Day Mode"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                  visibilitySettings.nightMode ?? true
                    ? 'bg-indigo-950 border-amber-400/60 text-amber-300 shadow-sm'
                    : 'bg-sky-950/80 border-sky-400/50 text-sky-200 hover:bg-sky-900/80'
                }`}
              >
                {visibilitySettings.nightMode ?? true ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-amber-300" />
                    <span>Night Mode: ON</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-sky-300" />
                    <span>Night Mode: OFF (Day)</span>
                  </>
                )}
              </button>

              {(boardType === 'quick_pyramid' || boardType === 'pyramid') && (
                <>
                  <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                  {/* Rule 24: Beacon Side Setting */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 font-medium mr-0.5">Beacons:</span>
                    {(
                      [
                        { id: 'off', label: 'Off' },
                        { id: 'opponent', label: 'Opponent' },
                        { id: 'both', label: 'Both' },
                      ] as { id: BeaconSideMode; label: string }[]
                    ).map((opt) => {
                      const activeSide =
                        visibilitySettings.beaconSide ||
                        (visibilitySettings.hiddenPieceBeacons ? 'opponent' : 'off');
                      const isActive = activeSide === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            onUpdateVisibilitySettings({
                              beaconSide: opt.id,
                              hiddenPieceBeacons: opt.id !== 'off',
                            })
                          }
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-4 w-px bg-slate-800 hidden sm:block" />

                  {/* Rule 25: Pyramid Opacity Slider (0% - 100%) */}
                  <div className="flex items-center gap-2">
                    <Sliders className="w-3 h-3 text-sky-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={visibilitySettings.pyramidOpacity ?? 25}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        onUpdateVisibilitySettings({
                          pyramidOpacity: val,
                          terrainTransparency:
                            val === 100
                              ? 'off'
                              : visibilitySettings.terrainTransparency === 'off'
                              ? 'auto'
                              : visibilitySettings.terrainTransparency,
                        });
                      }}
                      title={`Pyramid Opacity: ${visibilitySettings.pyramidOpacity ?? 25}%`}
                      className="w-20 md:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <button
                      onClick={() => {
                        const nextMode =
                          visibilitySettings.terrainTransparency === 'on'
                            ? 'auto'
                            : visibilitySettings.terrainTransparency === 'auto'
                            ? 'off'
                            : 'on';
                        onUpdateVisibilitySettings({ terrainTransparency: nextMode });
                      }}
                      title="Cycle Pyramid Transparency Trigger: Auto (when obstructed) / On (always glass) / Off (opaque)"
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                        visibilitySettings.terrainTransparency === 'on'
                          ? 'bg-sky-500/25 text-sky-200 border border-sky-500/40'
                          : visibilitySettings.terrainTransparency === 'auto'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {visibilitySettings.terrainTransparency}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      {/* Victory / Defeat Modal Banner */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 pointer-events-auto">
          <div className="relative w-full max-w-sm bg-slate-900 border border-amber-500/50 rounded-3xl p-6 text-center shadow-2xl text-white space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Trophy className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight text-white capitalize">
                {winner === 'draw' ? 'Stalemate Draw!' : `${winner} Victorious!`}
              </h2>
              <p className="text-xs text-slate-400">
                {winner === 'draw'
                  ? 'No legal maneuvers remain. Both AIs have logged this line to avoid drawing in future rematches.'
                  : `Last One Standing / Checkmate! The ${winner} army has vanquished the enemy Monarch and updated its tactical memory.`}
              </p>
            </div>

            {playerMode === 'ai_vs_ai' && (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>AI Challenge Auto-Rematch</span>
                  </span>
                  {onToggleAutoRematch && (
                    <button
                      onClick={onToggleAutoRematch}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
                        autoRematch
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {autoRematch ? 'Enabled' : 'Paused'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-300">
                  {autoRematch && autoRematchCountdown !== null
                    ? `Launching next Challenge Rematch in ${autoRematchCountdown}s with rotated doctrines & banned past plays...`
                    : 'Enable Auto-Rematch so the AIs automatically fight, learn, and evolve across consecutive games.'}
                </p>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={onRestartGame}
                className="w-full py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg transition-all"
              >
                {playerMode === 'ai_vs_ai' ? 'Rematch Immediately' : 'Play Another Match'}
              </button>
              <button
                onClick={onOpenStartMenu || onOpenSettings}
                className="w-full py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
