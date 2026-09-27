import React from 'react';
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
import {
  Settings,
  Volume2,
  VolumeX,
  Swords,
  Layers,
  Bot,
  X,
  Users,
  Play,
  Lock,
  RotateCcw,
  Eye,
  Flag,
  Sliders,
  Shield,
} from 'lucide-react';
import { sounds } from '../audio/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Match state
  isMatchActive?: boolean;
  isMatchLocked: boolean;
  onTriggerResetConfirm?: () => void;
  // 1. Battlefield
  boardType: BoardType;
  onSelectBoardType: (type: BoardType) => void;
  // 2. Army
  armyDeployment: ArmyDeployment;
  onSelectArmyDeployment: (dep: ArmyDeployment) => void;
  // 3. Combat
  gameMode: GameMode;
  onSelectGameMode: (mode: GameMode) => void;
  // 4. Play Style
  playStyle: PlayStyle;
  onSelectPlayStyle: (style: PlayStyle) => void;
  // 5. Players
  playerMode: PlayerMode;
  onSelectPlayerMode: (mode: PlayerMode) => void;
  humanColor: PieceColor;
  onSelectHumanColor: (color: PieceColor) => void;
  aiDifficulty: AIDifficulty;
  onSelectAIDifficulty: (diff: AIDifficulty) => void;
  // Visibility System
  visibilitySettings?: VisibilitySettings;
  onUpdateVisibilitySettings?: (settings: Partial<VisibilitySettings>) => void;
  // Audio
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  // AI vs AI Auto-Rematch
  autoRematch?: boolean;
  onToggleAutoRematch?: () => void;
  // Ready trigger
  onTriggerReady: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isMatchActive = false,
  isMatchLocked,
  onTriggerResetConfirm,
  boardType,
  onSelectBoardType,
  armyDeployment,
  onSelectArmyDeployment,
  gameMode,
  onSelectGameMode,
  playStyle,
  onSelectPlayStyle,
  playerMode,
  onSelectPlayerMode,
  humanColor,
  onSelectHumanColor,
  aiDifficulty,
  onSelectAIDifficulty,
  visibilitySettings,
  onUpdateVisibilitySettings,
  soundEnabled,
  onToggleSound,
  autoRematch = true,
  onToggleAutoRematch,
  onTriggerReady,
}) => {
  if (!isOpen) return null;

  const boardLabel =
    boardType === 'quick_pyramid'
      ? '12×12 Quick Pyramid'
      : boardType === 'pyramid'
      ? '20×20 Grand Pyramid'
      : boardType === 'battlefield'
      ? '20×20 Battlefield'
      : '8×8 Classic';

  const is20x20Board = boardType === 'pyramid' || boardType === 'battlefield';

  const armyLabel =
    armyDeployment === 'kingdom'
      ? is20x20Board
        ? 'Kingdom 20×20 Army (29/side · 58 total)'
        : 'Kingdom Army (24/side)'
      : is20x20Board
      ? 'Standard + 20×20 Specialists (21/side)'
      : 'Standard Army (16/side)';

  const combatLabel = gameMode === 'rpg' ? 'RPG' : 'Standard Chess';
  const playStyleLabel = playStyle === 'surface_bound' ? 'Surface Bound' : 'Open Surface';

  const playerModeLabel =
    playerMode === 'human_vs_human'
      ? 'Human vs Human'
      : playerMode === 'ai_vs_ai'
      ? 'AI vs AI Simulation'
      : `Human (${humanColor === 'white' ? 'White' : 'Black'}) vs AI`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-6 text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Game Setup &amp; Rules</span>
                {isMatchLocked && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/30">
                    <Lock className="w-2.5 h-2.5" /> LOCKED
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {isMatchLocked
                  ? 'Configuration is locked for the active match.'
                  : 'Configure battlefield, army scale, combat ruleset, and players.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Configuration Summary & Quick Stop/Reset Banner */}
        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs">
            <span className="text-slate-400">Active Setup: </span>
            <span className="font-bold text-amber-300">{boardLabel.toUpperCase()}</span>
            <span className="text-slate-500 mx-1">·</span>
            <span className="font-semibold text-sky-300">{armyLabel}</span>
            <span className="text-slate-500 mx-1">·</span>
            <span className="font-semibold text-rose-300">{combatLabel}</span>
            <span className="text-slate-500 mx-1">·</span>
            <span className="font-semibold text-purple-300">{playStyleLabel}</span>
            <span className="text-slate-500 mx-1">·</span>
            <span className="font-semibold text-emerald-300">{playerModeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            {isMatchActive && onTriggerResetConfirm && (
              <button
                onClick={() => {
                  onClose();
                  onTriggerResetConfirm();
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Stop / End Game
              </button>
            )}
          </div>
        </div>

        {/* Settings Body (All 4 Setup Pillars & Visibility Settings Always Unlocked) */}
        <div className="my-3 space-y-3 flex-1 overflow-y-auto pr-1">
          <div className="space-y-3">
          {/* Pillar 1: Battlefield Architecture */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Layers className="w-4 h-4 text-amber-400" />
                1. Battlefield
              </div>
              <span className="text-[10px] font-mono text-slate-400">Topology &amp; Dimension</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectBoardType('classic')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  boardType === 'classic'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Classic</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">8×8</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Standard chess tournament flat battlefield.
                </div>
              </button>

              <button
                onClick={() => onSelectBoardType('battlefield')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  boardType === 'battlefield'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Battlefield</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">20×20</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Expansive flat maneuvering plain for open warfare.
                </div>
              </button>

              <button
                onClick={() => onSelectBoardType('quick_pyramid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  boardType === 'quick_pyramid'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Quick Pyramid</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">12×12</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Stepped ziggurat with 4×4 Summit. Fast, compressed action.
                </div>
              </button>

              <button
                onClick={() => onSelectBoardType('pyramid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  boardType === 'pyramid'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Grand Pyramid</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300">20×20</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  4-tier ziggurat with sheer cliffs and 4×4 Summit Apex.
                </div>
              </button>
            </div>
          </div>

          {/* Pillar 2: Army Deployment Selection */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Users className="w-4 h-4 text-sky-400" />
                2. Army
              </div>
              <span className="text-[10px] font-mono text-slate-400">Deployment Scale</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectArmyDeployment('standard')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  armyDeployment === 'standard'
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-200 ring-1 ring-sky-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Standard Army</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    {is20x20Board ? '21 / side' : '16 / side'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {is20x20Board
                    ? '8 Royals + 8 Pawns + Vanguard, Gargoyle, Ascendant & Trebuchet.'
                    : 'Classical deployment: 8 Royals + 8 Pawns.'}
                </div>
              </button>

              <button
                onClick={() => onSelectArmyDeployment('kingdom')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  armyDeployment === 'kingdom'
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-200 ring-1 ring-sky-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Kingdom Army</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
                    {is20x20Board ? '29 / side (58)' : '24 / side'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {is20x20Board
                    ? 'Main army + West/East flanks + Vanguard, Gargoyle, Ascendant & Trebuchet.'
                    : 'Main army + opposing West & East flank detachments.'}
                </div>
              </button>
            </div>
          </div>

          {/* Pillar 3: Combat Ruleset Selection */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Swords className="w-4 h-4 text-rose-400" />
                3. Combat
              </div>
              <span className="text-[10px] font-mono text-slate-400">Rules Engine</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectGameMode('standard')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  gameMode === 'standard'
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 ring-1 ring-rose-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white">Standard Chess</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Instant captures, check detection, and pure checkmate.
                </div>
              </button>

              <button
                onClick={() => onSelectGameMode('rpg')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  gameMode === 'rpg'
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-200 ring-1 ring-rose-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white">RPG Battle Chess</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  HP bars, Dice Rolls, Critical Strikes &amp; multi-turn Duels.
                </div>
              </button>
            </div>
          </div>

          {/* Pillar 4: Play Style (Open Surface vs Surface Bound Challenge) */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Shield className="w-4 h-4 text-purple-400" />
                4. Play Style
              </div>
              <span className="text-[10px] font-mono text-slate-400">Pyramid Surface Law</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectPlayStyle('open')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  playStyle === 'open'
                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Open Surface</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Standard
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Continuous-surface Pyramid play. Pieces can attack and jump freely across surfaces.
                </div>
              </button>

              <button
                onClick={() => onSelectPlayStyle('surface_bound')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  playStyle === 'surface_bound'
                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 ring-1 ring-purple-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">Surface Bound</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Challenge
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Same-surface combat law, cross-surface blocking, and Jump Color Lock until 4×4 Summit release.
                </div>
              </button>
            </div>
          </div>

          {/* Pillar 5: Players Configuration */}
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Bot className="w-4 h-4 text-emerald-400" />
                5. Players
              </div>
              <span className="text-[10px] font-mono text-slate-400">Participant Setup</span>
            </div>

            {/* Player Mode Selection */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => onSelectPlayerMode('human_vs_ai')}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  playerMode === 'human_vs_ai'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Human vs AI</div>
                <div className="text-[10px] text-slate-400">Solo play</div>
              </button>

              <button
                onClick={() => onSelectPlayerMode('human_vs_human')}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  playerMode === 'human_vs_human'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs">Human vs Human</div>
                <div className="text-[10px] text-slate-400">Pass &amp; play</div>
              </button>

              <button
                onClick={() => onSelectPlayerMode('ai_vs_ai')}
                className={`py-2 px-2 rounded-xl border text-center transition-all ${
                  playerMode === 'ai_vs_ai'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-semibold ring-1 ring-emerald-500/30'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs flex items-center justify-center gap-1">
                  <Eye className="w-3 h-3 text-emerald-400" />
                  <span>AI vs AI</span>
                </div>
                <div className="text-[10px] text-slate-400">Simulation</div>
              </button>
            </div>

            {/* Sub-options for Human vs AI */}
            {playerMode === 'human_vs_ai' && (
              <div className="space-y-2 pt-1 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Your Color:</span>
                  <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => onSelectHumanColor('white')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        humanColor === 'white'
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      White (First)
                    </button>
                    <button
                      onClick={() => onSelectHumanColor('black')}
                      className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                        humanColor === 'black'
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Black (Second)
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-300 font-semibold">
                      AI Difficulty (5 Levels):
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      {aiDifficulty}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(
                      [
                        {
                          id: 'Beginner',
                          desc: 'Recognizes immediate threats, makes understandable plans, and sometimes overlooks deeper tactics.',
                        },
                        {
                          id: 'Developing',
                          desc: 'Defends more consistently, recognizes basic combinations, and begins coordinating pieces.',
                        },
                        {
                          id: 'Intermediate',
                          desc: 'Searches further, creates multi-move threats, recognizes traps, and uses terrain purposefully.',
                        },
                        {
                          id: 'Advanced',
                          desc: 'Anticipates counterplay, maintains coordinated plans, converts advantages, and avoids most simple tactical errors.',
                        },
                        {
                          id: 'Expert',
                          desc: 'Uses the strongest available search and evaluation, explores multiple strategic plans, recognizes complex forcing sequences, and converts advantages as reliably as the engine permits.',
                        },
                      ] as const
                    ).map((lvl) => {
                      const isSelected =
                        aiDifficulty === lvl.id ||
                        (lvl.id === 'Beginner' && aiDifficulty === 'Apprentice') ||
                        (lvl.id === 'Developing' && aiDifficulty === 'Tactician') ||
                        (lvl.id === 'Intermediate' && aiDifficulty === 'Balanced') ||
                        (lvl.id === 'Advanced' && aiDifficulty === 'Grandmaster') ||
                        (lvl.id === 'Expert' && aiDifficulty === 'Master');
                      return (
                        <button
                          key={lvl.id}
                          onClick={() => onSelectAIDifficulty(lvl.id)}
                          title={lvl.desc}
                          className={`py-1.5 px-1 text-[11px] font-medium rounded-lg border transition-all text-center ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-bold shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {lvl.id}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300 leading-relaxed">
                    {aiDifficulty === 'Beginner' || aiDifficulty === 'Apprentice'
                      ? 'Beginner: Recognizes immediate threats, makes understandable plans, and sometimes overlooks deeper tactics.'
                      : aiDifficulty === 'Developing' || aiDifficulty === 'Tactician'
                      ? 'Developing: Defends more consistently, recognizes basic combinations, and begins coordinating pieces.'
                      : aiDifficulty === 'Intermediate' || aiDifficulty === 'Balanced'
                      ? 'Intermediate: Searches further, creates multi-move threats, recognizes traps, and uses terrain purposefully.'
                      : aiDifficulty === 'Advanced' || aiDifficulty === 'Grandmaster'
                      ? 'Advanced: Anticipates counterplay, maintains coordinated plans, converts advantages, and avoids most simple tactical errors.'
                      : 'Expert: Uses the strongest available search and evaluation, explores multiple strategic plans, recognizes complex forcing sequences, and converts advantages as reliably as the engine permits.'}
                  </div>
                </div>
              </div>
            )}

            {playerMode === 'ai_vs_ai' && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Spectator Simulation &amp; Challenge Mode
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Last One Standing
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Both White and Black are commanded by the Minimax engine using authoritative surface rules. Neither AI can repeat past-game plays or mimic its opponent.
                </p>
                {onToggleAutoRematch && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div>
                      <div className="font-semibold text-white">Auto-Rematch &amp; Continuous Learning</div>
                      <div className="text-[10px] text-slate-400">
                        Automatically start a new match when a game ends so AIs keep fighting and learning
                      </div>
                    </div>
                    <button
                      onClick={onToggleAutoRematch}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        autoRematch ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          autoRematch ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* 3D Pyramid Visibility & Camera Assistance System (Always editable during match) */}
          {visibilitySettings && onUpdateVisibilitySettings && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>Pyramid Visibility &amp; Camera Assistance</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">Live Viewing Preference</span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Night Mode: Eye-Comfort & Long-Distance Legibility */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/50 border border-amber-500/40">
                  <div>
                    <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                      <span>Night Mode (Eye-Comfort &amp; Distance View)</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Low Glare
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Replaces bright white tiles with matte moonlit slate, softens lighting glare, and adds floating high-contrast piece emblems for clear viewing in the dark and from a distance
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateVisibilitySettings({
                        nightMode: !(visibilitySettings.nightMode ?? true),
                      })
                    }
                    className={`w-10 h-5 flex-shrink-0 flex items-center rounded-full p-0.5 transition-colors ml-3 ${
                      visibilitySettings.nightMode ?? true ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        visibilitySettings.nightMode ?? true ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Rule 24: Beacon Side Setting (Off / Opponent Only / Both Sides) */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-white">Beacon Display (Pyramid Boards Only)</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Appears only when piece is obscured</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    {(
                      [
                        { id: 'off', label: 'Off', desc: 'No beacons' },
                        { id: 'opponent', label: 'Opponent Only', desc: 'Enemy hidden pieces' },
                        { id: 'both', label: 'Both Sides', desc: 'All hidden pieces' },
                      ] as { id: BeaconSideMode; label: string; desc: string }[]
                    ).map((opt) => {
                      const isActive =
                        (visibilitySettings.beaconSide || (visibilitySettings.hiddenPieceBeacons ? 'opponent' : 'off')) ===
                        opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() =>
                            onUpdateVisibilitySettings({
                              beaconSide: opt.id,
                              hiddenPieceBeacons: opt.id !== 'off',
                            })
                          }
                          className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                            isActive
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-900'
                          }`}
                        >
                          <div className="text-[11px] leading-tight">{opt.label}</div>
                          <div
                            className={`text-[9px] leading-tight ${
                              isActive ? 'text-slate-900 font-medium' : 'text-slate-500'
                            }`}
                          >
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rule 25: Pyramid Opacity Slider (0% - 100%) */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      <span className="font-semibold text-white">Pyramid Opacity</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {visibilitySettings.pyramidOpacity ?? 25}%
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 25, 50, 100].map((preset) => (
                          <button
                            key={preset}
                            onClick={() =>
                              onUpdateVisibilitySettings({
                                pyramidOpacity: preset,
                                terrainTransparency:
                                  preset === 100
                                    ? 'off'
                                    : visibilitySettings.terrainTransparency === 'off'
                                    ? 'auto'
                                    : visibilitySettings.terrainTransparency,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              (visibilitySettings.pyramidOpacity ?? 25) === preset
                                ? 'bg-sky-500/30 text-sky-200 border border-sky-500/50 font-bold'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-1">
                    <span className="text-[10px] text-slate-400 font-medium">Transparent (0%)</span>
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
                      className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">Opaque (100%)</span>
                  </div>

                  {/* Transparency Mode (Auto vs Always On vs Off) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Transparency Trigger:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-mono">
                      {(
                        [
                          { id: 'auto', label: 'Auto (When Obstructed)' },
                          { id: 'on', label: 'Always Transparent' },
                          { id: 'off', label: 'Always Opaque' },
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => onUpdateVisibilitySettings({ terrainTransparency: mode.id })}
                          className={`px-2 py-1 rounded font-bold transition-all ${
                            visibilitySettings.terrainTransparency === mode.id
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Focus Camera on Active Move */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-semibold text-white">Turn Side Switch &amp; Camera Focus</div>
                    <div className="text-[10px] text-slate-400">
                      In Human games, switches camera to the active side only after a move is placed (never while selecting or placing a piece). In AI vs AI, follows the active move.
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onUpdateVisibilitySettings({
                        focusCameraOnActiveMove: !visibilitySettings.focusCameraOnActiveMove,
                      })
                    }
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      visibilitySettings.focusCameraOnActiveMove ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                        visibilitySettings.focusCameraOnActiveMove ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="text-xs font-medium text-slate-300 flex items-center gap-2">
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              Sound Effects
            </div>
            <button
              onClick={() => {
                onToggleSound(!soundEnabled);
                sounds.enabled = !soundEnabled;
              }}
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors ${
                soundEnabled ? 'bg-amber-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer with Stop / End Game & Start New Game (READY) */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {isMatchActive && onTriggerResetConfirm && (
              <button
                onClick={() => {
                  onClose();
                  onTriggerResetConfirm();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wide shadow-md shadow-rose-600/25 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Stop / End Game</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onTriggerReady();
              }}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
