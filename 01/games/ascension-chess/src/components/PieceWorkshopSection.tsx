import React, { useState, useEffect } from 'react';
import { BoardType, PieceType, PlayStyle } from '../types/chess';
import {
  DEFAULT_PIECE_WORKSHOP_CONFIG,
  PieceWorkshopConfigMap,
  PieceWorkshopRuleSpec,
  formatAllPieceWorkshopRulesAsText,
  formatPieceWorkshopRuleAsText,
  loadPieceWorkshopConfig,
  resetPieceWorkshopConfig,
  savePieceWorkshopConfig,
} from '../data/pieceWorkshopConfig';
import { PieceMovementDiagram } from './PieceCapabilitiesDropdown';
import { PieceCodexIcon } from './PieceGuideModal';
import {
  Sliders,
  ShieldCheck,
  Layers,
  Compass,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Swords,
  Mountain,
  Crown,
} from 'lucide-react';

const PIECE_ORDER: PieceType[] = [
  'king',
  'queen',
  'rook',
  'bishop',
  'knight',
  'pawn',
  'vanguard',
  'gargoyle',
  'ascendant',
  'trebuchet',
];

interface PieceWorkshopSectionProps {
  playStyle?: PlayStyle;
  boardType?: BoardType;
}

export const PieceWorkshopSection: React.FC<PieceWorkshopSectionProps> = ({
  playStyle = 'surface_bound',
  boardType = 'pyramid',
}) => {
  const [configMap, setConfigMap] = useState<PieceWorkshopConfigMap>(() => loadPieceWorkshopConfig());
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('rook');
  const [viewMode, setViewMode] = useState<'workshop' | 'audit' | 'canonical_txt'>('workshop');
  const [previewBoard, setPreviewBoard] = useState<BoardType>(boardType);
  const [previewPlayStyle, setPreviewPlayStyle] = useState<PlayStyle>(playStyle);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newDoesNotAllowText, setNewDoesNotAllowText] = useState('');

  useEffect(() => {
    const handleSync = () => {
      setConfigMap(loadPieceWorkshopConfig());
    };
    window.addEventListener('piece-workshop-updated', handleSync);
    return () => window.removeEventListener('piece-workshop-updated', handleSync);
  }, []);

  const currentSpec: PieceWorkshopRuleSpec = configMap[selectedPiece];

  const updatePieceSpec = (updater: (prev: PieceWorkshopRuleSpec) => PieceWorkshopRuleSpec) => {
    const updatedPiece = updater(currentSpec);
    const nextMap: PieceWorkshopConfigMap = {
      ...configMap,
      [selectedPiece]: {
        ...updatedPiece,
        status: 'CUSTOMIZED',
      },
    };
    setConfigMap(nextMap);
    savePieceWorkshopConfig(nextMap);
  };

  const handleResetPiece = (pt: PieceType) => {
    const defaultSpec = structuredClone(DEFAULT_PIECE_WORKSHOP_CONFIG[pt]);
    const nextMap: PieceWorkshopConfigMap = {
      ...configMap,
      [pt]: defaultSpec,
    };
    setConfigMap(nextMap);
    savePieceWorkshopConfig(nextMap);
  };

  const handleResetAll = () => {
    const fresh = resetPieceWorkshopConfig();
    setConfigMap(fresh);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadWorkshopTxt = () => {
    const fullText = formatAllPieceWorkshopRulesAsText(configMap);
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Ascension_3D_Chess_Piece_Workshop_And_Balancing_Codex.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Compute live balance diagnostics based on currentSpec
  const activeBoardRange = currentSpec.boardRanges[previewBoard];
  const dirCount = Object.values(currentSpec.directions).filter(Boolean).length;
  const estimatedSafeMoves = Math.min(
    28,
    Math.max(
      1,
      selectedPiece === 'knight'
        ? currentSpec.pyramidNav.usesJumpColorLock && previewPlayStyle === 'surface_bound'
          ? 4
          : 8
        : selectedPiece === 'pawn'
        ? 4
        : Math.round((Math.min(activeBoardRange, 12) * dirCount) / 2.2)
    )
  );
  const [minTarget, maxTarget] = currentSpec.safeMoveTargetRange;
  const isDominantWarning = estimatedSafeMoves > maxTarget + 4 || (activeBoardRange >= 20 && currentSpec.pyramidNav.canCrossSurfaceCaptureInSurfaceBound && selectedPiece !== 'pawn');
  const isUselessWarning = estimatedSafeMoves < Math.max(1, minTarget - 1) || dirCount === 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/90 text-slate-200">
      {/* Top Workshop Header & Mode Bar */}
      <div className="px-5 py-3.5 bg-slate-900/95 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm md:text-base font-extrabold text-white tracking-tight">
                Piece Workshop &amp; Balancing Framework
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live Engine Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Customize piece range per board, Pyramid wall/bend navigation, what each piece can &amp; cannot do, and Surface Bound rules in real time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('workshop')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'workshop'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Live Workshop</span>
            </button>
            <button
              onClick={() => setViewMode('audit')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'audit'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>10-Point Audit &amp; Balance</span>
            </button>
            <button
              onClick={() => setViewMode('canonical_txt')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewMode === 'canonical_txt'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Canonical .TXT Spec</span>
            </button>
          </div>

          <button
            onClick={handleDownloadWorkshopTxt}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Workshop (.txt)</span>
          </button>

          <button
            onClick={handleResetAll}
            title="Reset all 10 pieces to canonical defaults"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/40 text-xs font-medium transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left Piece Selector + Right Controls */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Sidebar: 10 Piece Classes + 4-Level Priority Hierarchy */}
        <div className="w-full lg:w-72 bg-slate-900/75 border-b lg:border-b-0 lg:border-r border-slate-800 p-3.5 overflow-y-auto space-y-4 shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2 flex items-center justify-between">
              <span>Select Piece to Configure (10)</span>
              <span className="text-amber-400 font-mono">Live Rules</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-1 gap-1.5">
              {PIECE_ORDER.map((pt) => {
                const spec = configMap[pt];
                const isSelected = selectedPiece === pt;
                const isCustom = spec.status === 'CUSTOMIZED';
                return (
                  <button
                    key={pt}
                    onClick={() => setSelectedPiece(pt)}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/50 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800/90 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg border shrink-0 ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300'
                        }`}
                      >
                        <PieceCodexIcon type={pt} size="sm" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold leading-tight truncate">{spec.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Range: {spec.boardRanges[previewBoard] >= 25 ? '∞' : spec.boardRanges[previewBoard]}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        isCustom
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {isCustom ? 'EDITED' : 'CANON'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Level Rule Priority Hierarchy Reference Card */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-[11px]">
            <div className="font-bold text-amber-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>4-Level Rule Priority Hierarchy</span>
            </div>
            <div className="space-y-1.5 text-slate-300">
              <div className="p-1.5 rounded bg-rose-950/30 border border-rose-500/30">
                <strong className="text-rose-300 block text-[10px]">Level 1 — King Safety (Highest)</strong>
                No move, capture, swap, or bombardment may leave the friendly King in check.
              </div>
              <div className="p-1.5 rounded bg-purple-950/30 border border-purple-500/30">
                <strong className="text-purple-300 block text-[10px]">Level 2 — Surface &amp; Jump Laws</strong>
                Open Surface vs Surface Bound combat &amp; Jump Color Lock until 4×4 Summit.
              </div>
              <div className="p-1.5 rounded bg-sky-950/30 border border-sky-500/30">
                <strong className="text-sky-300 block text-[10px]">Level 3 — Board-Specific Range</strong>
                Classic 8×8, Battlefield 20×20, Quick Pyramid 12×12, Grand Pyramid 20×20.
              </div>
              <div className="p-1.5 rounded bg-emerald-950/30 border border-emerald-500/30">
                <strong className="text-emerald-300 block text-[10px]">Level 4 — Piece &amp; Special Abilities</strong>
                Piece ray/jump geometry, Rook Exchange, Stone Bulwark, Ascension, Bombardment.
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Piece Title & Quick Status Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/30 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300">
                <PieceCodexIcon type={selectedPiece} size="lg" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-amber-400 font-bold">{currentSpec.ruleId}</span>
                  <h2 className="text-lg md:text-xl font-extrabold text-white">{currentSpec.name}</h2>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                      currentSpec.status === 'CUSTOMIZED'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {currentSpec.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">{currentSpec.roleTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopyText(formatPieceWorkshopRuleAsText(currentSpec), `copy-${selectedPiece}`)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
              >
                {copiedId === `copy-${selectedPiece}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied Spec!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Piece Rule</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleResetPiece(selectedPiece)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 text-slate-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset {currentSpec.name}</span>
              </button>
            </div>
          </div>

          {viewMode === 'workshop' && (
            <>
              {/* SECTION 1: Movement Range Per Board & Allowed Directions */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Board-by-Board Range Controls */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-bold text-white">
                        1. Movement &amp; Capture Range By Board
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-amber-300">
                      25 = Unlimited Board Ray
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        { key: 'classic', label: 'Classic 8×8 (Flat Chess)', maxCap: 8 },
                        { key: 'battlefield', label: 'Battlefield 20×20 (Flat)', maxCap: 25 },
                        { key: 'quick_pyramid', label: 'Quick Pyramid 12×12 (3 Tiers)', maxCap: 25 },
                        { key: 'pyramid', label: 'Grand Pyramid 20×20 (4 Tiers + Summit)', maxCap: 25 },
                      ] as { key: BoardType; label: string; maxCap: number }[]
                    ).map(({ key, label, maxCap }) => {
                      const val = currentSpec.boardRanges[key];
                      return (
                        <div
                          key={key}
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">{label}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={25}
                                value={val}
                                onChange={(e) => {
                                  const nextVal = Math.max(1, Math.min(25, Number(e.target.value) || 1));
                                  updatePieceSpec((prev) => ({
                                    ...prev,
                                    boardRanges: {
                                      ...prev.boardRanges,
                                      [key]: nextVal,
                                    },
                                  }));
                                }}
                                className="w-14 px-2 py-0.5 rounded bg-slate-900 border border-amber-500/40 text-amber-300 font-mono text-xs text-center"
                              />
                              <span className="text-[11px] font-mono text-slate-400 w-20 text-right">
                                {val >= 25 ? 'Unlimited' : `${val} tile${val > 1 ? 's' : ''}`}
                              </span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={maxCap}
                            value={Math.min(val, maxCap)}
                            onChange={(e) => {
                              const nextVal = Number(e.target.value);
                              updatePieceSpec((prev) => ({
                                ...prev,
                                boardRanges: {
                                  ...prev.boardRanges,
                                  [key]: nextVal,
                                },
                              }));
                            }}
                            className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Direction Permissions */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300">
                      Allowed Movement Directions &amp; Vectors:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(
                        [
                          { key: 'forward', label: 'Forward (North)' },
                          { key: 'backward', label: 'Backward (South)' },
                          { key: 'sideways', label: 'Sideways (East/West)' },
                          { key: 'diagonalForward', label: 'Diag-Forward (NE/NW)' },
                          { key: 'diagonalBackward', label: 'Diag-Backward (SE/SW)' },
                          { key: 'lJump', label: 'L-Jump / Knight Leap' },
                        ] as { key: keyof PieceWorkshopRuleSpec['directions']; label: string }[]
                      ).map(({ key, label }) => {
                        const active = currentSpec.directions[key];
                        return (
                          <button
                            key={key}
                            onClick={() =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                directions: {
                                  ...prev.directions,
                                  [key]: !prev.directions[key],
                                },
                              }))
                            }
                            className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                              active
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <span>{label}</span>
                            {active ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Pyramid Navigation & Surface Behavior (What It Can & Cannot Do) */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-sky-400" />
                      <h4 className="text-sm font-bold text-white">
                        2. Pyramid Navigation: What {currentSpec.name} Can &amp; Cannot Do
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-sky-300">
                      3D Topology &amp; Surface Laws
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(
                      [
                        {
                          key: 'canEnterVerticalWalls',
                          title: 'Occupy Vertical Cliff Wall Tiles',
                          desc: 'Whether this piece may step onto and stand on vertical Pyramid wall squares.',
                        },
                        {
                          key: 'canCrossFloorWallBends',
                          title: 'Cross 90° Floor ↔ Wall & Wall ↔ Terrace Bends',
                          desc: 'Whether sliding rays or steps can transition smoothly across horizontal/vertical bends.',
                        },
                        {
                          key: 'canWrapWallCorners',
                          title: 'Wrap Laterally Around Vertical Wall Corners',
                          desc: 'Whether lateral movement on a vertical cliff can wrap around a 90° Pyramid corner.',
                        },
                        {
                          key: 'canClimbUp',
                          title: 'Climb Upward to Higher Pyramid Tiers',
                          desc: 'Permits ascending from Valley (Tier 0) up toward the 4×4 Summit.',
                        },
                        {
                          key: 'canDescendDown',
                          title: 'Descend Downward to Lower Pyramid Tiers',
                          desc: 'Permits stepping down from higher terraces back toward the Valley.',
                        },
                        {
                          key: 'canCrossSurfaceCaptureInSurfaceBound',
                          title: 'Surface Bound: Cross-Surface Capture & Check Exception',
                          desc: 'Allows capturing and giving check across Horizontal ↔ Vertical surfaces in Surface Bound mode (Canonical default: ONLY Pawn on forward diagonals).',
                        },
                        {
                          key: 'blockedByOppositeSurfaceInSurfaceBound',
                          title: 'Surface Bound: Opposite-Surface Enemy Blocks Sliding Path',
                          desc: 'When cross-surface capture is forbidden, an enemy on the opposite surface still blocks sliding rays.',
                        },
                        {
                          key: 'usesJumpColorLock',
                          title: 'Surface Bound: Jump Color Lock (Before 4×4 Summit)',
                          desc: 'Requires jump landings to match the piece’s starting checker color until reaching the 4×4 Summit.',
                        },
                        {
                          key: 'summitReleasesColorLock',
                          title: '4×4 Summit Permanently Releases Jump Color Lock',
                          desc: 'Reaching any 4×4 Summit tile permanently unlocks both Light and Dark jump landing squares.',
                        },
                        {
                          key: 'canUseSummitToBaseJump',
                          title: '4×4 Summit-to-Base Jump Ability',
                          desc: 'When standing on the 4×4 Summit in Surface Bound mode, allows jumping directly to Pyramid-Base tiles.',
                        },
                      ] as {
                        key: keyof PieceWorkshopRuleSpec['pyramidNav'];
                        title: string;
                        desc: string;
                      }[]
                    ).map(({ key, title, desc }) => {
                      const enabled = currentSpec.pyramidNav[key];
                      return (
                        <div
                          key={key}
                          onClick={() =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              pyramidNav: {
                                ...prev.pyramidNav,
                                [key]: !prev.pyramidNav[key],
                              },
                            }))
                          }
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            enabled
                              ? 'bg-slate-950/90 border-sky-500/40 hover:border-sky-400'
                              : 'bg-slate-950/40 border-slate-800/80 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{title}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                              enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {enabled ? 'CAN DO' : 'CANNOT'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 3: Piece-Specific Special Ability Tuning + Live Visual Diagram */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Piece-Specific Special Ability Parameters (7 cols) */}
                <div className="xl:col-span-7 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h4 className="text-sm font-bold text-white">
                        3. {currentSpec.name} Special Ability &amp; Tactical Rules
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-purple-300">
                      Level 4 Ability Tuning
                    </span>
                  </div>

                  {/* Dynamic Controls by Piece Type */}
                  {selectedPiece === 'king' && (
                    <div className="space-y-3 text-xs">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                        <div>
                          <div className="font-bold text-white">Allow Classical Castling (O-O / O-O-O)</div>
                          <div className="text-[11px] text-slate-400">
                            King and unmoved friendly Rook on same horizontal rank with clear path and no check.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.kingAllowCastling ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                kingAllowCastling: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>
                    </div>
                  )}

                  {selectedPiece === 'pawn' && (
                    <div className="space-y-2.5 text-xs">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                        <div>
                          <div className="font-bold text-white">Opening 2-Tile Forward Sprint</div>
                          <div className="text-[11px] text-slate-400">
                            Unmoved Pawns on flat horizontal squares may advance 2 tiles forward.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.pawnInitialDoubleStep ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                pawnInitialDoubleStep: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                        <div>
                          <div className="font-bold text-white">Allow Sideways Step on Vertical Cliff Walls</div>
                          <div className="text-[11px] text-slate-400">
                            Permits 1-tile non-capturing lateral movement while perched on a vertical wall.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.pawnAllowWallSidewaysMove ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                pawnAllowWallSidewaysMove: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                        <div>
                          <div className="font-bold text-white">Allow En Passant Capture</div>
                          <div className="text-[11px] text-slate-400">
                            Immediate forward-diagonal capture after an adjacent enemy Pawn’s 2-step advance.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.pawnAllowEnPassant ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                pawnAllowEnPassant: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>
                    </div>
                  )}

                  {selectedPiece === 'knight' && (
                    <div className="space-y-3 text-xs">
                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                        <div>
                          <div className="font-bold text-white">
                            1-Step Pyramid Surface-Bend Climb (Summit Ascent Bridge)
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Allows a Knight to make a 1-tile connected surface climb across a floor↔wall or wall↔terrace bend so color-locked Knights can reach the 4×4 Summit.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.knightAllowPyramidStepClimb ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                knightAllowPyramidStepClimb: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>
                    </div>
                  )}

                  {selectedPiece === 'vanguard' && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Starting Forward Range</span>
                            <span className="text-amber-300 font-mono">
                              {currentSpec.specialParams.vanguardStartRange ?? 9} tiles
                            </span>
                          </div>
                          <input
                            type="range"
                            min={2}
                            max={15}
                            value={currentSpec.specialParams.vanguardStartRange ?? 9}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardStartRange: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Center Minimum Range</span>
                            <span className="text-amber-300 font-mono">
                              {currentSpec.specialParams.vanguardMinRange ?? 1} tile
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={5}
                            value={currentSpec.specialParams.vanguardMinRange ?? 1}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardMinRange: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                          <span>Permanent Forward Decay (9→1)</span>
                          <input
                            type="checkbox"
                            checked={currentSpec.specialParams.vanguardPermanentDecay ?? true}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardPermanentDecay: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 accent-amber-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                          <span>Own-Team Rook Exchange</span>
                          <input
                            type="checkbox"
                            checked={currentSpec.specialParams.vanguardAllowRookExchange ?? true}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardAllowRookExchange: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 accent-amber-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                          <span>Vertical Wall Sideways Move</span>
                          <input
                            type="checkbox"
                            checked={currentSpec.specialParams.vanguardWallSidewaysMove ?? true}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardWallSidewaysMove: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 accent-amber-400"
                          />
                        </label>

                        <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                          <span>Vertical Wall Sideways Capture</span>
                          <input
                            type="checkbox"
                            checked={currentSpec.specialParams.vanguardWallSidewaysCapture ?? true}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  vanguardWallSidewaysCapture: e.target.checked,
                                },
                              }))
                            }
                            className="w-4 h-4 accent-amber-400"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {selectedPiece === 'gargoyle' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Flat Valley Jump Radius</span>
                          <span className="text-amber-300 font-mono">
                            {currentSpec.specialParams.gargoyleValleyJumpRadius ?? 2} tiles
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={6}
                          value={currentSpec.specialParams.gargoyleValleyJumpRadius ?? 2}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                gargoyleValleyJumpRadius: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex justify-between font-bold text-white">
                          <span>Pyramid / Wall Jump &amp; Glide</span>
                          <span className="text-amber-300 font-mono">
                            {currentSpec.specialParams.gargoylePyramidJumpRadius ?? 3} tiles
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={8}
                          value={currentSpec.specialParams.gargoylePyramidJumpRadius ?? 3}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                gargoylePyramidJumpRadius: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>
                  )}

                  {selectedPiece === 'ascendant' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {(
                        [
                          { key: 'ascendantStage1Range', label: 'Stage I (Valley)', def: 2 },
                          { key: 'ascendantStage2Range', label: 'Stage II (Climber)', def: 3 },
                          { key: 'ascendantStage3Range', label: 'Stage III (Apex)', def: 4 },
                        ] as const
                      ).map(({ key, label, def }) => (
                        <div key={key} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>{label}</span>
                            <span className="text-amber-300 font-mono">
                              {currentSpec.specialParams[key] ?? def} tiles
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={10}
                            value={currentSpec.specialParams[key] ?? def}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  [key]: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedPiece === 'trebuchet' && (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Jump-Capture Range</span>
                            <span className="text-amber-300 font-mono">
                              1–{currentSpec.specialParams.trebuchetJumpCaptureRange ?? 2} tiles
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={4}
                            value={currentSpec.specialParams.trebuchetJumpCaptureRange ?? 2}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  trebuchetJumpCaptureRange: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Bombard Max Base</span>
                            <span className="text-amber-300 font-mono">
                              {currentSpec.specialParams.trebuchetBombardMaxRange ?? 6} tiles
                            </span>
                          </div>
                          <input
                            type="range"
                            min={4}
                            max={12}
                            value={currentSpec.specialParams.trebuchetBombardMaxRange ?? 6}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  trebuchetBombardMaxRange: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                          <div className="flex justify-between font-bold text-white">
                            <span>Knockback Distance</span>
                            <span className="text-amber-300 font-mono">
                              {currentSpec.specialParams.trebuchetKnockbackTiles ?? 3} tiles
                            </span>
                          </div>
                          <input
                            type="range"
                            min={1}
                            max={6}
                            value={currentSpec.specialParams.trebuchetKnockbackTiles ?? 3}
                            onChange={(e) =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                specialParams: {
                                  ...prev.specialParams,
                                  trebuchetKnockbackTiles: Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>

                      <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-amber-500/30 cursor-pointer">
                        <div>
                          <div className="font-bold text-amber-200">
                            On Pyramid (Tier 1+): Bombard 4×4 Summit Targets ONLY
                          </div>
                          <div className="text-[11px] text-slate-400">
                            When enabled, climbing onto the Pyramid restricts ranged Bombardment exclusively to targets on the 4×4 Summit Apex.
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={currentSpec.specialParams.trebuchetPyramidBombardSummitOnly ?? true}
                          onChange={(e) =>
                            updatePieceSpec((prev) => ({
                              ...prev,
                              specialParams: {
                                ...prev.specialParams,
                                trebuchetPyramidBombardSummitOnly: e.target.checked,
                              },
                            }))
                          }
                          className="w-4 h-4 accent-amber-400"
                        />
                      </label>
                    </div>
                  )}

                  {/* Editable "WHAT IT CANNOT DO" (Explicit Prohibitions) */}
                  <div className="pt-3 border-t border-slate-800 space-y-2.5">
                    <div className="text-xs font-bold text-rose-300 flex items-center justify-between">
                      <span>Explicit Prohibitions (What {currentSpec.name} CANNOT Do):</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Included in .TXT Codex Export
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {currentSpec.doesNotAllow.map((line, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-rose-950/25 border border-rose-500/30 text-xs text-rose-200"
                        >
                          <span>• {line}</span>
                          <button
                            onClick={() =>
                              updatePieceSpec((prev) => ({
                                ...prev,
                                doesNotAllow: prev.doesNotAllow.filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-[10px] text-rose-400 hover:text-rose-200 font-mono"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newDoesNotAllowText}
                        onChange={(e) => setNewDoesNotAllowText(e.target.value)}
                        placeholder={`Add a prohibition for ${currentSpec.name} (e.g. Cannot jump over walls)...`}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500"
                      />
                      <button
                        onClick={() => {
                          const trimmed = newDoesNotAllowText.trim();
                          if (!trimmed) return;
                          updatePieceSpec((prev) => ({
                            ...prev,
                            doesNotAllow: [...prev.doesNotAllow, trimmed],
                          }));
                          setNewDoesNotAllowText('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-semibold"
                      >
                        + Add Rule
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Interactive Diagram & Balance Target Telemetry (5 cols) */}
                <div className="xl:col-span-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>Live Diagram &amp; Balance Meter</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={previewBoard}
                        onChange={(e) => setPreviewBoard(e.target.value as BoardType)}
                        className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200"
                      >
                        <option value="classic">Classic 8×8</option>
                        <option value="battlefield">Battlefield 20×20</option>
                        <option value="quick_pyramid">Quick Pyramid 12×12</option>
                        <option value="pyramid">Grand Pyramid 20×20</option>
                      </select>
                      <select
                        value={previewPlayStyle}
                        onChange={(e) => setPreviewPlayStyle(e.target.value as PlayStyle)}
                        className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-[11px] text-slate-200"
                      >
                        <option value="open_surface">Open Surface</option>
                        <option value="surface_bound">Surface Bound</option>
                      </select>
                    </div>
                  </div>

                  <PieceMovementDiagram
                    pieceType={selectedPiece}
                    isPyramidBoard={previewBoard === 'pyramid' || previewBoard === 'quick_pyramid'}
                  />

                  {/* Balance Target Range & Broken Piece Warning Signals (Section 9 of Framework) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200">
                        Target Safe Legal Moves / Turn:
                      </span>
                      <span className="font-mono text-amber-300 font-bold">
                        Target {minTarget}–{maxTarget} · Est. ~{estimatedSafeMoves}
                      </span>
                    </div>

                    {isDominantWarning ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 flex items-start gap-2 text-[11px]">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Dominant Piece Warning Signal</strong>
                          High range combined with broad surface/capture permissions may compress midgame counterplay on {previewBoard}.
                        </div>
                      </div>
                    ) : isUselessWarning ? (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-start gap-2 text-[11px]">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Restricted / Stranded Piece Warning Signal</strong>
                          Very low legal move count or disabled directions may leave {currentSpec.name} stranded on {previewBoard}.
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 flex items-start gap-2 text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block">Balanced Tactical Envelope</strong>
                          {currentSpec.name} falls within its target mobility and counterplay window ({minTarget}–{maxTarget} safe moves).
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400">
                      <strong className="text-slate-200">Counterplay Profile:</strong>{' '}
                      {currentSpec.counterplayNotes}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {viewMode === 'audit' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-sky-500/30 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>10-Point Piece Audit for {currentSpec.name} (Framework Section 8)</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Every piece in Ascension 3D Chess must pass all 10 tactical clarity and balance checks across Flat and Pyramid boards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    {
                      num: 1,
                      title: 'Flat Movement',
                      val: `Classic: ${currentSpec.boardRanges.classic} · Battlefield 20×20: ${
                        currentSpec.boardRanges.battlefield >= 25 ? 'Unlimited' : currentSpec.boardRanges.battlefield
                      } tiles.`,
                    },
                    {
                      num: 2,
                      title: 'Vertical Wall Entry',
                      val: currentSpec.pyramidNav.canEnterVerticalWalls
                        ? 'May step onto and occupy vertical cliff wall tiles.'
                        : 'Forbidden from occupying vertical cliff wall tiles.',
                    },
                    {
                      num: 3,
                      title: 'Floor ↔ Wall ↔ Terrace Bend Crossing',
                      val: currentSpec.pyramidNav.canCrossFloorWallBends
                        ? 'Crosses 90° floor-to-wall and wall-to-terrace bends along connected paths.'
                        : 'Must stop before surface bends.',
                    },
                    {
                      num: 4,
                      title: 'Capture Pattern',
                      val:
                        selectedPiece === 'trebuchet'
                          ? `Must physically Jump-Capture within 1–${currentSpec.specialParams.trebuchetJumpCaptureRange ?? 2} tiles. Ranged Bombardment knocks target back ${currentSpec.specialParams.trebuchetKnockbackTiles ?? 3} tiles without capturing.`
                          : selectedPiece === 'pawn'
                          ? 'Captures 1 step forward-diagonally only (never straight forward or sideways).'
                          : 'Captures on the same connected paths and range as its normal movement.',
                    },
                    {
                      num: 5,
                      title: 'Surface Bound Combat Law',
                      val: currentSpec.pyramidNav.canCrossSurfaceCaptureInSurfaceBound
                        ? 'EXCEPTION ENABLED: May capture and give check across Horizontal ↔ Vertical surfaces.'
                        : 'Must occupy the same surface class (Horizontal vs Vertical) to attack an enemy.',
                    },
                    {
                      num: 6,
                      title: 'Jump Color Lock & 4×4 Summit Release',
                      val: currentSpec.pyramidNav.usesJumpColorLock
                        ? 'Jump landings are locked to starting tile color until permanently released by reaching the 4×4 Summit.'
                        : 'Does not use jump color lock.',
                    },
                    {
                      num: 7,
                      title: 'Special Ability',
                      val: currentSpec.roleTitle,
                    },
                    {
                      num: 8,
                      title: 'King Safety & Check Interaction',
                      val:
                        selectedPiece === 'trebuchet'
                          ? 'Jump-capture threatens Check; ranged Bombardment displaces pieces (and cannot leave friendly King in Check).'
                          : 'Can give Check along legal capture paths; all moves strictly filtered by Level 1 King Safety.',
                    },
                    {
                      num: 9,
                      title: 'Target Mobility & Safe Destinations',
                      val: `Target window: ${minTarget}–${maxTarget} safe legal moves per turn.`,
                    },
                    {
                      num: 10,
                      title: 'Counterplay & Weakness',
                      val: currentSpec.counterplayNotes,
                    },
                  ].map((item) => (
                    <div
                      key={item.num}
                      className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1"
                    >
                      <div className="font-bold text-sky-300 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-[10px] font-mono">
                          #{item.num}
                        </span>
                        <span>{item.title}</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">{item.val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'canonical_txt' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Canonical text-file specification for <strong className="text-white">{currentSpec.name}</strong> (auto-generated from your live Workshop settings):
                </div>
                <button
                  onClick={() =>
                    handleCopyText(formatAllPieceWorkshopRulesAsText(configMap), 'copy-all-workshop')
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-xs font-semibold"
                >
                  {copiedId === 'copy-all-workshop' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied All 10 Pieces!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy All 10 Piece Specs (.TXT)</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-100/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {formatPieceWorkshopRuleAsText(currentSpec)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
