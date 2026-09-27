import React from 'react';
import { OngoingDuel, Piece } from '../types/chess';
import { Swords, Shield, Clock, Flame, ChevronRight } from 'lucide-react';

interface OngoingDuelsPanelProps {
  duels: OngoingDuel[];
  pieces: Piece[];
  onSelectDuelTile?: (x: number, y: number) => void;
}

export const OngoingDuelsPanel: React.FC<OngoingDuelsPanelProps> = React.memo(({
  duels,
  pieces,
  onSelectDuelTile,
}) => {
  if (duels.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 max-w-sm w-full">
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-rose-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
          <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Active Contested Battles ({duels.length})</span>
        </div>
        <span className="text-[11px] text-slate-400">Ongoing Clash</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {duels.map((duel) => {
          const whitePiece = pieces.find((p) => p.id === duel.whitePieceId);
          const blackPiece = pieces.find((p) => p.id === duel.blackPieceId);

          if (!whitePiece || !blackPiece) return null;

          const whiteHpPercent = Math.max(0, Math.min(100, (whitePiece.rpg.hp / whitePiece.rpg.maxHp) * 100));
          const blackHpPercent = Math.max(0, Math.min(100, (blackPiece.rpg.hp / blackPiece.rpg.maxHp) * 100));

          return (
            <div
              key={duel.id}
              onClick={() => onSelectDuelTile?.(duel.position.x, duel.position.y)}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/70 hover:border-rose-500/50 cursor-pointer shadow-lg backdrop-blur-md transition-all text-xs space-y-2 group"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  Tile ({duel.position.x}, {duel.position.y}) · Tier {duel.position.tier}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <Clock className="w-3 h-3" />
                  Round {duel.maxRounds - duel.roundsRemaining + 1}/{duel.maxRounds}
                </span>
              </div>

              {/* Combatants Bars */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {/* White Piece */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="capitalize font-medium">White {whitePiece.type}</span>
                    <span className="font-mono text-emerald-400">{whitePiece.rpg.hp} HP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${whiteHpPercent}%` }}
                    />
                  </div>
                </div>

                {/* Black Piece */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span className="capitalize font-medium">Black {blackPiece.type}</span>
                    <span className="font-mono text-rose-400">{blackPiece.rpg.hp} HP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${blackHpPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Last Log Line */}
              {duel.logs.length > 0 && (
                <div className="text-[10px] text-slate-400 font-mono line-clamp-1 pt-1 border-t border-slate-800">
                  {duel.logs[duel.logs.length - 1]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
