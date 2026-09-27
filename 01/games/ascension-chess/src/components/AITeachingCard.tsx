import React, { useState, useMemo } from 'react';
import {
  AITeachingThought,
  ArmyDeployment,
  BoardType,
  GameMode,
  Move,
  Piece,
  PieceColor,
  PieceType,
  PlayStyle,
  PlayerMode,
} from '../types/chess';
import {
  getGameKey,
  loadAIPlaybook,
  loadAIPlaybookLogs,
  loadGameLearning,
} from '../logic/chessAI';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Play,
  Pause,
  SkipForward,
  Swords,
  Shield,
  Layers,
  Target,
  X,
  Compass,
  Zap,
  Info,
  History,
  BookOpen,
  Trophy,
  RotateCcw,
} from 'lucide-react';

interface AITeachingCardProps {
  thought: AITeachingThought | null;
  currentTurn?: PieceColor;
  boardType?: BoardType;
  armyDeployment?: ArmyDeployment;
  gameMode: GameMode;
  playStyle?: PlayStyle;
  onSelectPlayStyle?: (style: PlayStyle) => void;
  playerMode?: PlayerMode;
  pieces?: Piece[];
  recentMoves?: Move[];
  isPaused: boolean;
  simulationSpeed: number; // 0.5, 1, 2, 4, 8
  onTogglePause: () => void;
  onStepForward: () => void;
  onChangeSpeed: (speed: number) => void;
  autoRematch?: boolean;
  onToggleAutoRematch?: () => void;
  onHoverCandidateMove?: (move: Move | null) => void;
  onFocusPiece?: (pieceId: string) => void;
  onClose?: () => void;
}

export const AITeachingCard: React.FC<AITeachingCardProps> = React.memo(({
  thought,
  currentTurn = 'white',
  boardType = 'pyramid',
  armyDeployment = 'kingdom',
  gameMode,
  playStyle = 'surface_bound',
  onSelectPlayStyle,
  playerMode = 'ai_vs_ai',
  pieces = [],
  recentMoves = [],
  isPaused,
  simulationSpeed,
  onTogglePause,
  onStepForward,
  onChangeSpeed,
  autoRematch = true,
  onToggleAutoRematch,
  onHoverCandidateMove,
  onFocusPiece,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'coach' | 'playbook'>('coach');
  const playbookEntries = useMemo(() => loadAIPlaybook(), [thought, activeTab]);
  const playbookLogs = useMemo(() => loadAIPlaybookLogs(), [thought, activeTab]);
  const learningStats = useMemo(
    () => loadGameLearning(getGameKey(boardType, armyDeployment, gameMode)),
    [boardType, armyDeployment, gameMode, thought, pieces.length]
  );
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'capture':
      case 'attack':
        return <Swords className="w-3.5 h-3.5 text-rose-400" />;
      case 'defend':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'climb':
        return <Layers className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Target className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  const activeTurnColor = thought ? thought.activePiece.color : currentTurn;
  const isWhite = activeTurnColor === 'white';

  // Live Battlefield & Elevation Statistics (memoized by pieces reference)
  const { activeWhite, activeBlack, elevatedWhite, elevatedBlack } = useMemo(() => {
    const aw = pieces.filter((p) => p.color === 'white' && p.rpg.hp > 0);
    const ab = pieces.filter((p) => p.color === 'black' && p.rpg.hp > 0);
    const ew = aw.filter((p) => p.position.tier > 0 || p.position.isVerticalWall).length;
    const eb = ab.filter((p) => p.position.tier > 0 || p.position.isVerticalWall).length;
    return { activeWhite: aw, activeBlack: ab, elevatedWhite: ew, elevatedBlack: eb };
  }, [pieces]);

  const formatCoord = (x: number, y: number) => `${String.fromCharCode(65 + x)}${y + 1}`;

  const getStepLabel = (step?: string) => {
    switch (step) {
      case 'evaluating':
        return <span className="text-[11px] font-bold text-sky-300 animate-pulse">1. Evaluating</span>;
      case 'targeting':
        return <span className="text-[11px] font-bold text-amber-300 animate-pulse">2. Targeting</span>;
      case 'chosen':
        return <span className="text-[11px] font-bold text-emerald-300">3. Chosen Move</span>;
      case 'executing':
        return <span className="text-[11px] font-bold text-purple-300">4. Executing</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-400">Live Analysis</span>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white select-none overflow-hidden">
      {/* 1. Header Bar: AI Teacher Branding, Simulation Controls & Close */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-white uppercase">
                AI Chess Teacher
              </span>
            </div>
            <span className="text-[10px] text-amber-400/90 font-mono tracking-tight">
              Tactical &amp; Position Rationale
            </span>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="Collapse AI Teacher Side Panel"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Simulation Speed & Playback Bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePause}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-300">Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-300">Pause</span>
              </>
            )}
          </button>

          <button
            onClick={onStepForward}
            title="Step Forward to Next Thought"
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {playerMode === 'ai_vs_ai' && onToggleAutoRematch && (
            <button
              onClick={onToggleAutoRematch}
              title={
                autoRematch
                  ? 'Auto-Rematch ON: AIs automatically rematch and learn after every game'
                  : 'Auto-Rematch OFF: Click to enable automatic AI vs AI rematches'
              }
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                autoRematch
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>Rematch: {autoRematch ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>

        {/* Speed presets */}
        <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          {[0.5, 1, 2, 4, 8].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              title={`Set AI Teacher play speed to ${s}×`}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                simulationSpeed === s
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* 3. Turn & Mode Switcher Header */}
      <div className="flex-shrink-0 px-4 py-2 bg-slate-900/90 border-b border-slate-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full border shadow-sm ${
                isWhite
                  ? 'bg-amber-400 border-amber-300 shadow-amber-400/50'
                  : 'bg-purple-500 border-purple-400 shadow-purple-500/50'
              }`}
            />
            <span className="text-xs font-black tracking-wider uppercase">
              AI TURN — {activeTurnColor}
            </span>
          </div>

          {getStepLabel(thought?.step)}
        </div>

        {/* Sub-Tabs: Live Tactical Coach vs AI Playbook & Win Log */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveTab('coach')}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'coach'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Live Coach</span>
          </button>
          <button
            onClick={() => setActiveTab('playbook')}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'playbook'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Playbook Log ({playbookLogs.length})</span>
          </button>
        </div>
      </div>

      {/* 4. Scrollable Educational Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'playbook' ? (
          <div className="space-y-4">
            {/* Master Board-Clearance & Anti-Loop Directive */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border border-emerald-500/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Master Total-Clearance Directive</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                  Anti-Loop Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Builds upon classical chess theory across all 4 fields (8×8, 12×12, 20×20 Ziggurat &amp; 20×20 Plain) to hunt down and eliminate every enemy piece without falling into repetition loops or stalemate ties.
              </p>
              <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>White Remaining: <strong className="text-amber-300">{activeWhite.length}</strong></span>
                <span>·</span>
                <span>Black Remaining: <strong className="text-purple-300">{activeBlack.length}</strong></span>
              </div>
            </div>

            {/* Live AI Playbook Execution Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>AI Winning Playbook Log</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {playbookLogs.length} logged plays
                </span>
              </div>

              {playbookLogs.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                  Start or resume a match to watch the AI log its tactical playbook sequences in real time.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {playbookLogs.slice(0, 12).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-300 truncate">
                          {log.maneuverName}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                          T{log.turn} · {log.aiColor.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-200/90">
                        {log.actionSummary}
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                        <span className="truncate">Basis: {log.chessFoundation}</span>
                        <span className="font-mono text-rose-300 shrink-0 ml-2">
                          {log.remainingEnemyPieces} foes left
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All-Fields Established & Expanded Chess Playbook Doctrines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>All-Fields Chess Playbook</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {boardType.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2">
                {playbookEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{entry.name}</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300 shrink-0">
                        +{entry.winRateBonus} Eval
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-sky-300">
                      Chess Basis: {entry.chessFoundation}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {entry.sequenceDescription}
                    </p>
                    <div className="flex items-center justify-between pt-1 text-[9px] font-mono text-slate-400">
                      <span>Used: <strong className="text-white">{entry.timesExecuted}×</strong></span>
                      <span>Wins/Captures: <strong className="text-emerald-300">{entry.winsGenerated}</strong></span>
                      <span className="uppercase text-slate-500">Field: {entry.field}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : thought ? (
          <>
            {/* Considering / Evaluated Options (Hover to preview trajectory on 3D board!) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  Considering
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {thought.consideredMoves.length} candidates · Hover to preview
                </span>
              </div>

              <div className="space-y-1.5">
                {thought.options.map((opt, idx) => {
                  const isChosen =
                    opt.move.from.x === thought.chosenMove.from.x &&
                    opt.move.from.y === thought.chosenMove.from.y &&
                    opt.move.to.x === thought.chosenMove.to.x &&
                    opt.move.to.y === thought.chosenMove.to.y;

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => onHoverCandidateMove?.(opt.move)}
                      onMouseLeave={() => onHoverCandidateMove?.(null)}
                      onClick={() => onFocusPiece?.(opt.move.pieceId)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChosen
                          ? 'bg-amber-500/15 border-amber-500/70 text-amber-200 font-bold shadow-md shadow-amber-950/40 ring-1 ring-amber-500/40'
                          : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:border-sky-500/50 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="p-1 rounded-md bg-slate-950/70 flex-shrink-0">
                          {getCategoryIcon(opt.category)}
                        </div>
                        <span className="truncate">{opt.label}</span>
                      </div>

                      {isChosen && (
                        <span className="text-[10px] font-bold uppercase text-amber-300 flex-shrink-0">
                          Selected
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chosen Move Card */}
            <div
              onMouseEnter={() => onHoverCandidateMove?.(thought.chosenMove)}
              onMouseLeave={() => onHoverCandidateMove?.(null)}
              onClick={() => onFocusPiece?.(thought.activePiece.id)}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/40 shadow-xl space-y-2.5 cursor-pointer hover:border-amber-400/70 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CHOSEN</span>
                </div>
                <span className="text-[10px] font-mono text-amber-300/80">
                  {thought.activePiece.color.toUpperCase()} {thought.activePiece.type.toUpperCase()}
                </span>
              </div>

              <div className="text-sm font-black text-white flex items-center gap-2">
                <span className="text-amber-300">
                  {thought.targetDescription || 'Decisive Tactical Advance'}
                </span>
              </div>

              {/* Reason / Tactical Rationale */}
              <div className="pt-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  REASON
                </div>
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                  {thought.reason}
                </p>
              </div>

              {/* Advantage Conversion & King Containment Telemetry */}
              {thought.conversionTelemetry && (
                <div
                  className={`p-2.5 rounded-xl border space-y-1.5 ${
                    thought.conversionTelemetry.isConversionState
                      ? 'bg-rose-950/35 border-rose-500/40'
                      : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono uppercase font-black text-rose-300">
                      {thought.conversionTelemetry.isConversionState
                        ? 'Advantage Conversion State'
                        : 'Strategic Objective'}
                    </span>
                    <span className="text-[9px] font-mono text-amber-300">
                      Net: {thought.conversionTelemetry.coordinatedAttackers} pcs
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-white">
                    {thought.conversionTelemetry.modeLabel}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300 pt-0.5 border-t border-slate-800/80">
                    <span>
                      King Territory:{' '}
                      <strong className="text-amber-300">
                        {thought.conversionTelemetry.kingEscapesBefore} → {thought.conversionTelemetry.kingEscapesAfter} tiles
                      </strong>
                    </span>
                    {thought.conversionTelemetry.cutoffSummary && (
                      <span className="text-emerald-300">{thought.conversionTelemetry.cutoffSummary}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Active AI Playbook Doctrine Badge */}
              {thought.activePlaybookEntry && (
                <div className="p-2.5 rounded-xl bg-emerald-950/35 border border-emerald-500/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase font-black text-emerald-300 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Playbook Doctrine Logged</span>
                    </span>
                    <span className="text-[9px] font-mono text-amber-300">
                      Used {thought.activePlaybookEntry.timesExecuted}×
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white">
                    {thought.activePlaybookEntry.name}
                  </div>
                  <div className="text-[10px] font-mono text-sky-300">
                    Basis: {thought.activePlaybookEntry.chessFoundation}
                  </div>
                </div>
              )}

              {/* AI vs AI Last-One-Standing Challenge Telemetry */}
              {thought.aiChallengeTelemetry && (
                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono uppercase font-black text-amber-300 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Last-One-Standing AI Challenge (Match #{thought.aiChallengeTelemetry.matchGeneration})</span>
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {thought.aiChallengeTelemetry.isNovelPlay ? 'Novel Play' : 'Forced Line'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="text-[8px] uppercase text-amber-400 font-bold">White Doctrine ({thought.aiChallengeTelemetry.whiteSurvivors} left)</div>
                      <div className="text-white truncate">{thought.aiChallengeTelemetry.whiteDoctrineName}</div>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <div className="text-[8px] uppercase text-purple-400 font-bold">Black Doctrine ({thought.aiChallengeTelemetry.blackSurvivors} left)</div>
                      <div className="text-white truncate">{thought.aiChallengeTelemetry.blackDoctrineName}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 pt-0.5">
                    <span>Past-Game Repeats Blocked: <strong className="text-amber-300">{thought.aiChallengeTelemetry.pastGamePlaysBlocked}</strong></span>
                    <span>Mimic Moves Blocked: <strong className="text-sky-300">{thought.aiChallengeTelemetry.mimicMovesBlocked}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-emerald-300/90 pt-1 border-t border-amber-500/20">
                    <span>Games Fought: <strong>{learningStats.gamesPlayed}</strong></span>
                    <span>Mates Learned: <strong>{Object.keys(learningStats.successfulCheckmatePositions || {}).length}</strong></span>
                    <span>Blunders Pruned: <strong>{Object.keys(learningStats.blunderMoveKeys || {}).length}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* RPG Teaching: Positional Combat Odds Shift */}
            {gameMode === 'rpg' && thought.rpgOddsShift && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-900 to-purple-950/30 border border-rose-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-wider text-rose-300">
                    <Swords className="w-3.5 h-3.5" />
                    <span>RPG Positional Odds Shift</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {thought.rpgOddsShift.contextLabel}
                  </span>
                </div>

                {/* Odds Comparison Bar */}
                <div className="flex items-center justify-between bg-slate-950/90 px-3 py-2.5 rounded-xl border border-slate-800">
                  <div className="text-center">
                    <div className="text-[9px] text-slate-400 uppercase font-semibold">Prior Odds</div>
                    <div className="text-sm font-mono font-black text-slate-300">
                      {thought.rpgOddsShift.oddsBefore}%
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    <ArrowRight className="w-4 h-4 animate-pulse" />
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>

                  <div className="text-center">
                    <div className="text-[9px] text-emerald-400 uppercase font-semibold">Updated Odds</div>
                    <div className="text-sm font-mono font-black text-emerald-300">
                      {thought.rpgOddsShift.oddsAfter}% favor
                    </div>
                  </div>
                </div>

                {/* Tactical Formula */}
                <div className="text-[11px] text-slate-300 font-medium">
                  <span className="text-rose-400 font-bold">Tactical Lesson: </span>
                  {thought.rpgOddsShift.factor}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Standby / Active Board Coaching Insights when awaiting next move */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                {playerMode === 'human_vs_ai' && currentTurn === 'white'
                  ? 'Your Turn to Command'
                  : 'Analyzing Battlefield'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {playerMode === 'human_vs_ai' && currentTurn === 'white'
                  ? 'Select any friendly White piece on the board to view its legal horizontal and vertical destinations.'
                  : 'AI is reading the tactical board state and calculating optimal terrace climbs.'}
              </p>
            </div>

            {/* Live Battlefield & High-Ground Control Meter */}
            {pieces.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>High-Ground &amp; Force Balance</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-amber-500/20">
                    <div className="text-[10px] text-amber-300 font-bold uppercase">White Army</div>
                    <div className="text-xs font-mono text-white mt-0.5">
                      {activeWhite.length} Active · <span className="text-amber-300">{elevatedWhite} Elevated</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-purple-500/20">
                    <div className="text-[10px] text-purple-300 font-bold uppercase">Black Army</div>
                    <div className="text-xs font-mono text-white mt-0.5">
                      {activeBlack.length} Active · <span className="text-purple-300">{elevatedBlack} Elevated</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Move Log */}
            {recentMoves.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-sky-400" />
                    <span>Recent Maneuvers</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Click to focus</span>
                </div>

                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {recentMoves
                    .slice(-6)
                    .reverse()
                    .map((mv, idx) => {
                      const movedPiece = pieces.find((p) => p.id === mv.pieceId);
                      const moveNum = recentMoves.length - idx;
                      return (
                        <div
                          key={`${mv.pieceId}-${moveNum}`}
                          onMouseEnter={() => onHoverCandidateMove?.(mv)}
                          onMouseLeave={() => onHoverCandidateMove?.(null)}
                          onClick={() => onFocusPiece?.(mv.pieceId)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/70 hover:bg-slate-800 border border-slate-800/80 text-xs cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[10px] font-mono text-slate-500">#{moveNum}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                movedPiece?.color === 'white' ? 'bg-amber-400' : 'bg-purple-400'
                              }`}
                            />
                            <span className="font-semibold text-slate-200 capitalize">
                              {movedPiece?.type || 'Piece'}
                            </span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {formatCoord(mv.from.x, mv.from.y)} &rarr; {formatCoord(mv.to.x, mv.to.y)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-300/90">
                            {mv.isCapture
                              ? 'Capture'
                              : mv.to.isVerticalWall
                              ? 'Wall'
                              : mv.to.tier > 0
                              ? `Tier ${mv.to.tier}`
                              : 'Flat'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Tactical Concepts Primer (Dynamically shows Open Surface vs Surface Bound Play Style) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {playStyle === 'surface_bound'
                      ? 'Surface Bound Rules (Challenge)'
                      : 'Open Surface Rules (Standard)'}
                  </span>
                </span>
                {onSelectPlayStyle && (
                  <button
                    onClick={() =>
                      onSelectPlayStyle(playStyle === 'surface_bound' ? 'open' : 'surface_bound')
                    }
                    className="text-[10px] font-mono text-purple-300 hover:text-white underline"
                  >
                    Switch to {playStyle === 'surface_bound' ? 'Open Surface' : 'Surface Bound'}
                  </button>
                )}
              </div>

              {playStyle === 'surface_bound' ? (
                <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/40 text-xs text-slate-200 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">1.</span>
                    <span>
                      <strong>Same-Surface Combat (Pawn Exception):</strong> Non-pawn pieces can only attack enemies on the same surface class. <strong>Pawns</strong> may attack and give check across horizontal and vertical Pyramid tiles within their 1-step forward-diagonal capture range.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">2.</span>
                    <span>
                      <strong>Cross-Surface Blocking:</strong> Opposite-surface pieces cannot be captured across surface classes, but they still physically block sliding movement paths.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">3.</span>
                    <span>
                      <strong>Jump Color Law &amp; 4×4 Release:</strong> Jumpers (Knights/Gargoyles) are restricted to their starting tile color until reaching the 4×4 Summit, which permanently releases them to use both colors.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">4.</span>
                    <span>
                      <strong>Summit-to-Base Jump &amp; Check Law:</strong> Jumping from the 4×4 Summit lands on legal Pyramid-base tiles. Check and checkmate obey the exact same surface and color laws.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">1.</span>
                    <span>
                      <strong>Continuous Surface:</strong> Pieces climb connected wall squares and terraces seamlessly with open cross-surface attacks.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">2.</span>
                    <span>
                      <strong>Vertical Perch:</strong> Vertical cliff walls are real playable squares. Rooks, Queens, and Kings can perch on cliff faces.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">3.</span>
                    <span>
                      <strong>Summit Ascent:</strong> Reaching the 4×4 Summit Apex unlocks heightened tactical vision and pawn apex promotion.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">4.</span>
                    <span>
                      <strong>Dynamic Beacons:</strong> Obscured pieces automatically raise straight stacked elevation flags above the Pyramid.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer: Distinction Reminder */}
      <div className="flex-shrink-0 px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-slate-400">
          <Info className="w-3 h-3 text-amber-400/80" />
          <span>Board = Action · Teacher = Reason</span>
        </span>
      </div>
    </div>
  );
});
