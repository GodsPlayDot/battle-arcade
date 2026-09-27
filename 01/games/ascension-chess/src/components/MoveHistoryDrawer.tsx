import React, { useState, useEffect } from 'react';
import { BoardType, CombatResult, Move, MoveHistoryEntry, Piece, PieceColor, PieceType, PlayerMode, RPSChoice } from '../types/chess';
import { getRPSOutcome, rollRandomRPS } from '../logic/rpgCombat';
import { sounds } from '../audio/soundEffects';
import { History, ChevronDown, ChevronUp, RotateCcw, Crown, Sparkles, Swords, Dices } from 'lucide-react';

interface MoveHistoryDrawerProps {
  entries: MoveHistoryEntry[];
  onPreviewMove: (move: Move | null) => void;
  onJumpToTurn?: (index: number) => void;
}

export const MoveHistoryDrawer: React.FC<MoveHistoryDrawerProps> = React.memo(({
  entries,
  onPreviewMove,
  onJumpToTurn,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle Clickable Move History & 3D Algebraic Log"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold text-slate-200 shadow-lg backdrop-blur-md transition-all"
      >
        <History className="w-3.5 h-3.5 text-amber-400" />
        <span>Move Log ({entries.length})</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 w-80 max-h-72 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 border-b border-slate-800 flex items-center justify-between text-[11px]">
            <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              3D Algebraic Move Log
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              Hover to preview · Click to rewind
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
            {entries.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-[11px] italic">
                No moves recorded yet. Make a move on the 3D board to populate the log.
              </div>
            ) : (
              entries.map((entry, idx) => (
                <div
                  key={`${entry.turnNumber}_${entry.color}_${idx}`}
                  onMouseEnter={() => onPreviewMove(entry.move)}
                  onMouseLeave={() => onPreviewMove(null)}
                  onClick={() => onJumpToTurn?.(idx)}
                  className="group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-amber-500/40 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        entry.color === 'white' ? 'bg-amber-300' : 'bg-indigo-400'
                      }`}
                    />
                    <span className="font-mono font-bold text-white truncate">
                      {entry.notation}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {entry.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700/80 text-[9px] font-mono text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                    {entry.rpgRollSummary && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/40 text-[9px] font-mono text-rose-200">
                        {entry.rpgRollSummary}
                      </span>
                    )}
                    <RotateCcw className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

interface PawnPromotionModalProps {
  color: PieceColor;
  boardType: BoardType;
  onSelectPromotion: (type: PieceType) => void;
  onCancel: () => void;
}

export const PawnPromotionModal: React.FC<PawnPromotionModalProps> = ({
  color,
  boardType,
  onSelectPromotion,
  onCancel,
}) => {
  const options: { type: PieceType; name: string; icon: string; desc: string }[] = [
    {
      type: 'queen',
      name: 'Queen',
      icon: '♛',
      desc: 'Maximum orthogonal + diagonal surface control (130 HP / 65 ATK)',
    },
    {
      type: 'rook',
      name: 'Rook',
      icon: '♜',
      desc: 'Long straight-line rampart bastion & Vanguard swap partner (105 HP / 32 DEF)',
    },
    {
      type: 'bishop',
      name: 'Bishop',
      icon: '♝',
      desc: 'Long diagonal terrace sniper with 20% Critical Strike (75 HP / 45 ATK)',
    },
    {
      type: 'knight',
      name: 'Knight',
      icon: '♞',
      desc: 'Elevation jumper & direct vertical cliff infiltrator (80 HP / 30% Evasion)',
    },
  ];

  if (boardType === 'pyramid' || boardType === 'battlefield') {
    options.push({
      type: 'vanguard',
      name: 'Vanguard',
      icon: '⛨',
      desc: '20×20 Specialist · Rapid forward deployment & Friendly Rook Exchange',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto">
      <div className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl p-6 text-white space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Crown className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white capitalize">
                {color} Pawn Promotion
              </h3>
              <p className="text-xs text-slate-400">
                Choose the piece to promote your advancing Pawn into:
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onSelectPromotion(opt.type)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
            >
              <span className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 group-hover:border-amber-400 flex items-center justify-center text-2xl shrink-0">
                {opt.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-white group-hover:text-amber-300">
                  {opt.name}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">
                  {opt.desc}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-1 flex justify-end">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel Move
          </button>
        </div>
      </div>
    </div>
  );
};

interface RockPaperScissorsModalProps {
  attacker: Piece;
  defender: Piece;
  playerMode: PlayerMode;
  humanColor: PieceColor;
  onResolveRPS: (attackerChoice: RPSChoice, defenderChoice: RPSChoice) => void;
  onCancel?: () => void;
}

const RPS_META: Record<
  RPSChoice,
  { label: string; subtitle: string; icon: string; beatsLabel: string; accent: string }
> = {
  rock: {
    label: 'Rock',
    subtitle: 'Crushing Blow',
    icon: '🪨',
    beatsLabel: 'Crushes Scissors ✂️',
    accent: 'border-amber-500/50 hover:bg-amber-500/15 text-amber-300',
  },
  paper: {
    label: 'Paper',
    subtitle: 'Bastion Ward',
    icon: '📄',
    beatsLabel: 'Wards Rock 🪨',
    accent: 'border-sky-500/50 hover:bg-sky-500/15 text-sky-300',
  },
  scissors: {
    label: 'Scissors',
    subtitle: 'Swift Pierce',
    icon: '✂️',
    beatsLabel: 'Pierces Paper 📄',
    accent: 'border-rose-500/50 hover:bg-rose-500/15 text-rose-300',
  },
};

const PIECE_CHESS_ICONS: Record<string, string> = {
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
};

export const RockPaperScissorsModal: React.FC<RockPaperScissorsModalProps> = ({
  attacker,
  defender,
  playerMode,
  humanColor,
  onResolveRPS,
  onCancel,
}) => {
  const [round, setRound] = useState(1);
  const [p1LockedChoice, setP1LockedChoice] = useState<RPSChoice | null>(null);
  const [tieHistory, setTieHistory] = useState<RPSChoice[]>([]);
  const [isShooting, setIsShooting] = useState(false);
  const [shootBeatIndex, setShootBeatIndex] = useState(0);
  const [lastClash, setLastClash] = useState<{
    attackerChoice: RPSChoice;
    defenderChoice: RPSChoice;
    outcome: 'attacker_win' | 'defender_win' | 'tie';
  } | null>(null);

  const isHumanVsHuman = playerMode === 'human_vs_human';
  const isHumanAttacker = !isHumanVsHuman ? attacker.color === humanColor : p1LockedChoice === null;
  const activeChooserColor = isHumanVsHuman
    ? p1LockedChoice === null
      ? attacker.color
      : defender.color
    : humanColor;
  const activeChooserRole = isHumanVsHuman
    ? p1LockedChoice === null
      ? 'Attacker'
      : 'Defender'
    : attacker.color === humanColor
    ? 'Attacker'
    : 'Defender';

  const shootBeats: { icon: string; word: string }[] = [
    { icon: '🪨', word: 'ROCK...' },
    { icon: '📄', word: 'PAPER...' },
    { icon: '✂️', word: 'SCISSORS...' },
    { icon: '⚡', word: 'SHOOT!' },
  ];

  const handlePickChoice = (choice: RPSChoice) => {
    if (isShooting) return;
    sounds.playSelect();

    if (isHumanVsHuman && p1LockedChoice === null) {
      setP1LockedChoice(choice);
      return;
    }

    const attChoice: RPSChoice = isHumanVsHuman
      ? p1LockedChoice!
      : isHumanAttacker
      ? choice
      : rollRandomRPS();
    const defChoice: RPSChoice = isHumanVsHuman
      ? choice
      : isHumanAttacker
      ? rollRandomRPS()
      : choice;

    // Start 3-beat animated "ROCK... PAPER... SCISSORS... SHOOT!" sequence
    setIsShooting(true);
    setLastClash(null);
    setShootBeatIndex(0);

    const b1 = setTimeout(() => {
      setShootBeatIndex(1);
      sounds.playSelect();
    }, 170);
    const b2 = setTimeout(() => {
      setShootBeatIndex(2);
      sounds.playSelect();
    }, 340);
    const b3 = setTimeout(() => {
      setShootBeatIndex(3);
      const outcome = getRPSOutcome(attChoice, defChoice);
      setIsShooting(false);
      setLastClash({
        attackerChoice: attChoice,
        defenderChoice: defChoice,
        outcome,
      });
      setP1LockedChoice(null);

      if (outcome === 'tie') {
        sounds.playDodge();
        setTieHistory((prev) => [...prev, attChoice]);
        setRound((r) => r + 1);
      } else {
        sounds.playCrit();
      }
    }, 540);

    return () => {
      clearTimeout(b1);
      clearTimeout(b2);
      clearTimeout(b3);
    };
  };

  const canCancel = !isHumanVsHuman
    ? attacker.color === humanColor && !lastClash && !isShooting
    : !lastClash && !isShooting;
  const pieceIcon = PIECE_CHESS_ICONS[attacker.type] || '♟';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-900 border border-amber-500/60 rounded-3xl shadow-2xl p-6 text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Swords className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wide text-white">
                  Identical Piece Clash · Rock Paper Scissors
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-mono text-amber-300">
                  Round {round}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Identical piece types (<strong className="text-amber-300 uppercase">{attacker.type}</strong> vs{' '}
                <strong className="text-indigo-300 uppercase">{defender.type}</strong>) resolve via 3-choice Rock-Paper-Scissors!
              </p>
            </div>
          </div>
        </div>

        {/* Combatants VS Arena Banner */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-2xl text-amber-300">
                {pieceIcon}
              </span>
              <div>
                <div className="text-[10px] uppercase font-mono text-amber-400 font-bold">
                  Attacker · {attacker.color}
                </div>
                <div className="text-sm font-black uppercase text-white">
                  {attacker.type}
                </div>
                <div className="text-[11px] font-mono text-emerald-400">
                  {attacker.rpg.hp}/{attacker.rpg.maxHp} HP
                </div>
              </div>
            </div>
            {(isShooting || lastClash) && (
              <div
                className={`text-3xl transition-transform ${
                  isShooting ? 'animate-bounce scale-110' : 'scale-125'
                }`}
              >
                {isShooting
                  ? shootBeats[shootBeatIndex]?.icon
                  : lastClash
                  ? RPS_META[lastClash.attackerChoice].icon
                  : ''}
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/90 border border-indigo-500/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-2xl text-indigo-300">
                {pieceIcon}
              </span>
              <div>
                <div className="text-[10px] uppercase font-mono text-indigo-400 font-bold">
                  Defender · {defender.color}
                </div>
                <div className="text-sm font-black uppercase text-white">
                  {defender.type}
                </div>
                <div className="text-[11px] font-mono text-emerald-400">
                  {defender.rpg.hp}/{defender.rpg.maxHp} HP
                </div>
              </div>
            </div>
            {(isShooting || lastClash) && (
              <div
                className={`text-3xl transition-transform ${
                  isShooting ? 'animate-bounce scale-110' : 'scale-125'
                }`}
              >
                {isShooting
                  ? shootBeats[shootBeatIndex]?.icon
                  : lastClash
                  ? RPS_META[lastClash.defenderChoice].icon
                  : ''}
              </div>
            )}
          </div>
        </div>

        {/* Animated Shoot Stage */}
        {isShooting && (
          <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col items-center justify-center space-y-2 animate-pulse">
            <div className="flex items-center gap-6 text-5xl">
              <span className="animate-bounce">{shootBeats[shootBeatIndex]?.icon}</span>
              <span className="text-xl font-black text-amber-400 font-mono">VS</span>
              <span className="animate-bounce">{shootBeats[shootBeatIndex]?.icon}</span>
            </div>
            <div className="text-sm font-black uppercase tracking-widest text-amber-300 font-mono">
              {shootBeats[shootBeatIndex]?.word}
            </div>
          </div>
        )}

        {/* Previous Parried Ties */}
        {tieHistory.length > 0 && !isShooting && (
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span>Parried Clashes:</span>
            {tieHistory.map((t, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200"
              >
                {RPS_META[t].icon} Tie
              </span>
            ))}
          </div>
        )}

        {/* Tie / Sudden Death or Final Outcome Banner */}
        {!isShooting && lastClash && lastClash.outcome === 'tie' && (
          <div className="p-3 rounded-2xl bg-sky-950/50 border border-sky-500/50 text-center space-y-1 animate-in zoom-in-95 duration-150">
            <div className="text-xs font-black uppercase tracking-wider text-sky-300">
              ⚡ Clash Parried! Both Chose {RPS_META[lastClash.attackerChoice].icon}{' '}
              {RPS_META[lastClash.attackerChoice].label.toUpperCase()}!
            </div>
            <div className="text-[11px] text-slate-300">
              Sudden Death Round {round}: Pick 1 of 3 again to break the deadlock!
            </div>
          </div>
        )}

        {!isShooting && lastClash && lastClash.outcome !== 'tie' ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-150">
            {/* Animated Clash Arena Reveal */}
            <div className="flex items-center justify-center gap-5 py-2">
              <div
                className={`flex flex-col items-center p-3 rounded-2xl border ${
                  lastClash.outcome === 'attacker_win'
                    ? 'bg-emerald-950/60 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950/80 border-slate-800 opacity-60 scale-95'
                } transition-all`}
              >
                <span className="text-4xl">{RPS_META[lastClash.attackerChoice].icon}</span>
                <span className="text-[10px] font-black uppercase mt-1 text-amber-300">
                  {RPS_META[lastClash.attackerChoice].label}
                </span>
              </div>

              <div className="text-lg font-black text-amber-400 animate-pulse">⚡ CLASH ⚡</div>

              <div
                className={`flex flex-col items-center p-3 rounded-2xl border ${
                  lastClash.outcome === 'defender_win'
                    ? 'bg-emerald-950/60 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-950/80 border-slate-800 opacity-60 scale-95'
                } transition-all`}
              >
                <span className="text-4xl">{RPS_META[lastClash.defenderChoice].icon}</span>
                <span className="text-[10px] font-black uppercase mt-1 text-indigo-300">
                  {RPS_META[lastClash.defenderChoice].label}
                </span>
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center space-y-1.5 ${
                lastClash.outcome === 'attacker_win'
                  ? 'bg-emerald-950/50 border-emerald-500/60'
                  : 'bg-rose-950/50 border-rose-500/60'
              }`}
            >
              <div className="text-sm font-black uppercase tracking-wider text-white">
                {lastClash.outcome === 'attacker_win'
                  ? `${RPS_META[lastClash.attackerChoice].icon} ${RPS_META[lastClash.attackerChoice].label} Beats ${RPS_META[lastClash.defenderChoice].icon} ${RPS_META[lastClash.defenderChoice].label} — Attacker (${attacker.color.toUpperCase()}) Wins!`
                  : `${RPS_META[lastClash.defenderChoice].icon} ${RPS_META[lastClash.defenderChoice].label} Counters ${RPS_META[lastClash.attackerChoice].icon} ${RPS_META[lastClash.attackerChoice].label} — Defender (${defender.color.toUpperCase()}) Wins!`}
              </div>
              <div className="text-xs text-slate-300">
                {lastClash.outcome === 'attacker_win'
                  ? `${attacker.color.toUpperCase()} ${attacker.type.toUpperCase()} defeats the defending ${defender.type} and claims the tile!`
                  : `${defender.color.toUpperCase()} ${defender.type.toUpperCase()} repels and destroys the attacking ${attacker.type}!`}
              </div>
            </div>

            <button
              onClick={() => onResolveRPS(lastClash.attackerChoice, lastClash.defenderChoice)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/30 transition-all"
            >
              Complete Battle Resolution
            </button>
          </div>
        ) : !isShooting ? (
          /* Pick 1 of 3 Buttons */
          <div className="space-y-2.5">
            <div className="text-xs font-bold text-center text-amber-300 uppercase tracking-wider">
              {activeChooserColor.toUpperCase()} ({activeChooserRole}): Pick 1 of 3 to Win the Battle
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(['rock', 'paper', 'scissors'] as RPSChoice[]).map((choice) => {
                const meta = RPS_META[choice];
                return (
                  <button
                    key={choice}
                    onClick={() => handlePickChoice(choice)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-950/90 border transition-all group hover:scale-[1.02] active:scale-95 ${meta.accent}`}
                  >
                    <span className="text-3xl mb-1.5 group-hover:scale-110 transition-transform">
                      {meta.icon}
                    </span>
                    <span className="text-sm font-black uppercase text-white">
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {meta.subtitle}
                    </span>
                    <span className="mt-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[9px] font-mono text-slate-300">
                      {meta.beatsLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {canCancel && onCancel && (
          <div className="pt-1 flex justify-end">
            <button
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel Move
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// LIVE 3D-STYLED D20 DICE ROLL & ROCK-PAPER-SCISSORS ANIMATION SHOWCASE
// ============================================================================
export interface CombatShowcaseEvent {
  id: string;
  attackerColor: PieceColor;
  attackerType: PieceType;
  attackerAtk?: number;
  attackerDef?: number;
  attackerHpBefore?: number;
  attackerMaxHp?: number;
  defenderColor: PieceColor;
  defenderType: PieceType;
  defenderAtk?: number;
  defenderDef?: number;
  defenderHpBefore?: number;
  defenderMaxHp?: number;
  combatResult: CombatResult;
}

const Floating3DD20Die: React.FC<{
  value: number;
  isRolling: boolean;
  hasLanded: boolean;
  variant: 'attacker' | 'defender';
  isHighlight?: boolean;
  rotationTick: number;
}> = ({ value, isRolling, hasLanded, variant, isHighlight, rotationTick }) => {
  const isAmber = variant === 'attacker';
  const rx = isRolling ? (rotationTick * 43) % 360 : 0;
  const ry = isRolling ? (rotationTick * 67) % 360 : 0;
  const rz = isRolling ? (rotationTick * 29) % 360 : 0;
  const translateY = isRolling ? (rotationTick % 2 === 0 ? -7 : 3) : hasLanded ? 0 : -4;

  const primaryStroke = isAmber
    ? isHighlight
      ? '#fde047'
      : '#f59e0b'
    : isHighlight
    ? '#38bdf8'
    : '#818cf8';
  const topFacetFill = isAmber ? 'rgba(245, 158, 11, 0.34)' : 'rgba(99, 102, 241, 0.34)';
  const sideFacetFill = isAmber ? 'rgba(180, 83, 9, 0.45)' : 'rgba(55, 48, 163, 0.45)';
  const centerFacetFill = isAmber ? 'rgba(120, 53, 15, 0.88)' : 'rgba(30, 27, 75, 0.88)';

  return (
    <div
      className={`relative w-16 h-16 flex items-center justify-center select-none transition-transform duration-200 ${
        hasLanded && isHighlight ? 'scale-110 drop-shadow-[0_0_14px_rgba(251,191,36,0.65)]' : ''
      }`}
    >
      {/* Ground Shadow */}
      <div
        className={`absolute -bottom-1 w-10 h-2 rounded-full bg-black/70 blur-[2px] transition-all duration-150 ${
          isRolling ? 'scale-75 opacity-40' : 'scale-100 opacity-85'
        }`}
      />

      {/* 3D Rotating Icosahedron Polyhedron SVG */}
      <div
        className="w-14 h-14 transition-transform duration-75"
        style={{
          transform: `translateY(${translateY}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          {/* Outer Icosahedron Hexagon Hull */}
          <polygon
            points="50,4 93,27 93,73 50,96 7,73 7,27"
            fill={sideFacetFill}
            stroke={primaryStroke}
            strokeWidth="3"
          />
          {/* Upper & Side 3D Facet Triangles */}
          <polygon
            points="50,4 93,27 50,24"
            fill={topFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="50,4 7,27 50,24"
            fill={topFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="7,27 23,68 50,24"
            fill={sideFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="93,27 77,68 50,24"
            fill={sideFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="7,73 50,96 23,68"
            fill={sideFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="93,73 50,96 77,68"
            fill={sideFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          <polygon
            points="23,68 77,68 50,96"
            fill={topFacetFill}
            stroke={primaryStroke}
            strokeWidth="1.5"
          />
          {/* Central Engraved D20 Face Triangle */}
          <polygon
            points="50,22 79,69 21,69"
            fill={centerFacetFill}
            stroke={primaryStroke}
            strokeWidth="2.5"
          />
          {/* Rolled Number on Central Face */}
          <text
            x="50"
            y="59"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="26"
            fontWeight="900"
            fontFamily="monospace"
          >
            {value}
          </text>
        </svg>
      </div>

      {/* Landed Lock Badge */}
      {hasLanded && (
        <span
          className={`absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-black uppercase border shadow ${
            isAmber
              ? 'bg-amber-500 text-slate-950 border-amber-200'
              : 'bg-indigo-500 text-white border-indigo-200'
          }`}
        >
          D20
        </span>
      )}
    </div>
  );
};

export const CombatAnimationShowcase: React.FC<{
  event: CombatShowcaseEvent | null;
}> = React.memo(({ event }) => {
  // 3 Distinct Visceral Stages:
  // 'rolling' (3D D20 rotates in air) -> 'landed' (snaps onto rolled number) -> 'damage_calc' (reveals damage formula & HP impact)
  const [phase, setPhase] = useState<'rolling' | 'landed' | 'damage_calc'>('rolling');
  const [rotationTick, setRotationTick] = useState(0);
  const [rollingAttackerDie, setRollingAttackerDie] = useState(20);
  const [rollingDefenderDie, setRollingDefenderDie] = useState(20);
  const [rpsCycleIdx, setRpsCycleIdx] = useState(0);

  useEffect(() => {
    if (!event) return;
    setPhase('rolling');
    setRotationTick(0);

    const interval = setInterval(() => {
      setRotationTick((t) => t + 1);
      setRollingAttackerDie(Math.floor(Math.random() * 20) + 1);
      setRollingDefenderDie(Math.floor(Math.random() * 20) + 1);
      setRpsCycleIdx((prev) => (prev + 1) % 3);
    }, 55);

    // Stage 2: Die lands physically on the rolled result at 680ms
    const landTimer = setTimeout(() => {
      clearInterval(interval);
      setPhase('landed');
    }, 680);

    // Stage 3: Reveal the Damage Calculation & HP bar impact at 1120ms (after landing!)
    const calcTimer = setTimeout(() => {
      setPhase('damage_calc');
    }, 1120);

    return () => {
      clearInterval(interval);
      clearTimeout(landTimer);
      clearTimeout(calcTimer);
    };
  }, [event?.id]);

  if (!event) return null;

  const {
    attackerColor,
    attackerType,
    attackerAtk = 45,
    attackerDef = 20,
    attackerHpBefore = 100,
    attackerMaxHp = 100,
    defenderColor,
    defenderType,
    defenderAtk = 45,
    defenderDef = 20,
    defenderHpBefore = 100,
    defenderMaxHp = 100,
    combatResult,
  } = event;

  const isRPS = combatResult.combatMode === 'rps';
  const isDiceLoss = !isRPS && combatResult.diceOutcome === 'defender_win';
  const isRolling = phase === 'rolling';
  const hasLanded = phase === 'landed' || phase === 'damage_calc';
  const showDamageCalc = phase === 'damage_calc';

  const attIcon = PIECE_CHESS_ICONS[attackerType] || '♟';
  const defIcon = PIECE_CHESS_ICONS[defenderType] || '♟';

  const rpsOrder: RPSChoice[] = ['rock', 'paper', 'scissors'];
  const displayedAttRPS = isRolling
    ? RPS_META[rpsOrder[rpsCycleIdx]]
    : RPS_META[combatResult.attackerRPS || 'rock'];
  const displayedDefRPS = isRolling
    ? RPS_META[rpsOrder[(rpsCycleIdx + 1) % 3]]
    : RPS_META[combatResult.defenderRPS || 'scissors'];

  const displayedAttRoll = isRolling ? rollingAttackerDie : combatResult.attackerDiceRoll;
  const displayedDefRoll = isRolling ? rollingDefenderDie : combatResult.defenderDiceRoll;

  const hpAfter = isDiceLoss
    ? Math.max(0, combatResult.attackerKilled ? 0 : attackerHpBefore - (combatResult.counterDamage || 0))
    : Math.max(0, combatResult.targetKilled ? 0 : defenderHpBefore - (combatResult.damage || 0));
  const trackedHpBefore = isDiceLoss ? attackerHpBefore : defenderHpBefore;
  const trackedMaxHp = isDiceLoss ? attackerMaxHp : defenderMaxHp;
  const hpPercent = Math.max(
    0,
    Math.min(100, ((showDamageCalc ? hpAfter : trackedHpBefore) / Math.max(1, trackedMaxHp)) * 100)
  );

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
      <div className="px-4 py-3 rounded-2xl bg-slate-950/95 border border-amber-500/60 shadow-2xl backdrop-blur-md text-white flex flex-col gap-2.5 min-w-[390px]">
        {/* Top Row: Attacker 3D Die / RPS Emblem vs Defender 3D Die / RPS Emblem */}
        <div className="flex items-center justify-between gap-4">
          {/* Attacker Side */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                {attackerColor}
              </div>
              <div className="text-xs font-black uppercase text-white flex items-center gap-1 justify-end">
                <span>{attIcon}</span>
                <span>{attackerType}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">ATK {attackerAtk}</div>
            </div>

            {isRPS ? (
              <div
                className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  isRolling
                    ? 'bg-amber-500/20 border-amber-400 animate-bounce'
                    : combatResult.rpsOutcome === 'attacker_win'
                    ? 'bg-emerald-500/25 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 opacity-75'
                }`}
              >
                <span className="text-2xl leading-none">{displayedAttRPS.icon}</span>
                <span className="text-[8px] font-mono uppercase font-bold text-amber-200 mt-0.5">
                  {displayedAttRPS.label}
                </span>
              </div>
            ) : (
              <Floating3DD20Die
                value={displayedAttRoll}
                isRolling={isRolling}
                hasLanded={hasLanded}
                variant="attacker"
                isHighlight={!isDiceLoss && (combatResult.crit || combatResult.hit)}
                rotationTick={rotationTick}
              />
            )}
          </div>

          {/* Center Stage Status */}
          <div className="flex flex-col items-center justify-center px-2 min-w-[125px] text-center">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
              {isRPS ? 'Mirror RPS Duel' : '3D D20 Skirmish'}
            </span>
            {isRolling ? (
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black uppercase text-amber-300 animate-pulse">
                {isRPS ? '⚡ Clashing...' : '🎲 Tumbling D20...'}
              </span>
            ) : phase === 'landed' ? (
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-sky-500/25 border border-sky-400 text-[10px] font-black uppercase text-sky-200 animate-bounce">
                {isRPS
                  ? `${displayedAttRPS.icon} vs ${displayedDefRPS.icon} Locked!`
                  : `🎲 Landed: ${displayedAttRoll} vs ${displayedDefRoll}!`}
              </span>
            ) : isRPS ? (
              <span
                className={`mt-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                  combatResult.rpsOutcome === 'attacker_win'
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                    : 'bg-rose-500/25 border-rose-400 text-rose-300'
                }`}
              >
                {combatResult.rpsOutcome === 'attacker_win'
                  ? `${displayedAttRPS.icon} Beats ${displayedDefRPS.icon}!`
                  : `${displayedDefRPS.icon} Counters ${displayedAttRPS.icon}!`}
              </span>
            ) : combatResult.dodged ? (
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-sky-500/25 border border-sky-400 text-[10px] font-black uppercase text-sky-300">
                💨 Evaded! Sent Back!
              </span>
            ) : isDiceLoss ? (
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400 text-[10px] font-black uppercase text-indigo-200">
                {combatResult.attackerReturned
                  ? `↩ Roll Lost (−${combatResult.counterDamage || 0} HP) · Sent Back!`
                  : `💥 Countered −${combatResult.counterDamage || 0} HP!`}
              </span>
            ) : (
              <span
                className={`mt-1 px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${
                  combatResult.crit
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-rose-500/25 border-rose-400 text-rose-200'
                }`}
              >
                {combatResult.crit ? `⚡ CRIT −${combatResult.damage} HP` : `💥 HIT −${combatResult.damage} HP`}
              </span>
            )}
          </div>

          {/* Defender Side */}
          <div className="flex items-center gap-2.5">
            {isRPS ? (
              <div
                className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                  isRolling
                    ? 'bg-indigo-500/20 border-indigo-400 animate-bounce'
                    : combatResult.rpsOutcome === 'defender_win'
                    ? 'bg-emerald-500/25 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 opacity-75'
                }`}
              >
                <span className="text-2xl leading-none">{displayedDefRPS.icon}</span>
                <span className="text-[8px] font-mono uppercase font-bold text-indigo-200 mt-0.5">
                  {displayedDefRPS.label}
                </span>
              </div>
            ) : (
              <Floating3DD20Die
                value={displayedDefRoll}
                isRolling={isRolling}
                hasLanded={hasLanded}
                variant="defender"
                isHighlight={isDiceLoss || combatResult.dodged}
                rotationTick={rotationTick + 5}
              />
            )}

            <div className="text-left">
              <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
                {defenderColor}
              </div>
              <div className="text-xs font-black uppercase text-white flex items-center gap-1">
                <span>{defIcon}</span>
                <span>{defenderType}</span>
              </div>
              <div className="text-[9px] font-mono text-slate-400">DEF {defenderDef}</div>
            </div>
          </div>
        </div>

        {/* Stage 3: Step-by-Step Damage Calculation Breakdown (Appears ONLY after 3D Die lands!) */}
        {showDamageCalc && (
          <div className="pt-2 border-t border-slate-800/90 flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400 uppercase font-bold">Damage Calculation:</span>
              {isRPS ? (
                <span className="text-amber-300 font-bold">
                  {combatResult.rpsOutcome === 'attacker_win'
                    ? `Mirror Strike (${displayedAttRPS.label} > ${displayedDefRPS.label}) → Lethal −${combatResult.damage} HP`
                    : `Mirror Counter (${displayedDefRPS.label} > ${displayedAttRPS.label}) → Attacker Eliminated!`}
                </span>
              ) : combatResult.dodged ? (
                <span className="text-sky-300 font-bold">
                  Def Roll ({combatResult.defenderDiceRoll}) + Evasion &gt; Att Roll ({combatResult.attackerDiceRoll}) → Sent Back to Origin!
                </span>
              ) : isDiceLoss ? (
                <span className="text-indigo-300 font-bold">
                  Def 🎲{combatResult.defenderDiceRoll} &gt; Att 🎲{combatResult.attackerDiceRoll} · Counter ATK {Math.round(defenderAtk * 0.65)} − DEF {Math.round(attackerDef * 0.35)} ={' '}
                  <strong className="text-rose-400">−{combatResult.counterDamage || 0} Attacker HP</strong>
                  {combatResult.attackerReturned ? ' (Sent Back to Original Tile!)' : ''}
                </span>
              ) : (
                <span className="text-emerald-300 font-bold">
                  ATK {attackerAtk} − DEF {Math.round(defenderDef * 0.4)} + 🎲{combatResult.attackerDiceRoll}
                  {combatResult.heightAdvantage !== 0
                    ? ` × Elev(${combatResult.heightAdvantage > 0 ? '+10%' : '-10%'})`
                    : ''}
                  {combatResult.crit ? ' × 1.4 CRIT' : ''} ={' '}
                  <strong className="text-rose-400">−{combatResult.damage} HP</strong>
                </span>
              )}
            </div>

            {/* Live Health Bar Impact */}
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-400 shrink-0">
                {isDiceLoss ? 'Attacker HP' : 'Defender HP'}: {hpAfter}/{trackedMaxHp}
              </span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 25 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
              {combatResult.targetKilled && (
                <span className="text-[9px] font-mono font-black uppercase text-rose-400">
                  ELIMINATED
                </span>
              )}
              {combatResult.attackerKilled && (
                <span className="text-[9px] font-mono font-black uppercase text-rose-400">
                  ATTACKER ELIMINATED
                </span>
              )}
              {combatResult.attackerReturned && !combatResult.attackerKilled && (
                <span className="text-[9px] font-mono font-black uppercase text-amber-300">
                  RETURNED TO ORIGIN TILE
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});



