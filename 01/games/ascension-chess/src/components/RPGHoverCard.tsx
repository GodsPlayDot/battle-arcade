import React from 'react';
import { BoardType, Piece, PlayStyle } from '../types/chess';
import { CombatOdds, TacticalContext } from '../logic/rpgTactics';
import {
  getAscendantProfile,
  getGargoyleTerrainProfile,
  getPositionCheckerColor,
  getTrebuchetProfile,
  getVanguardMovementProfile,
} from '../logic/pyramidBoard';
import {
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Percent,
  Crosshair,
  Layers,
  Skull,
  ArrowUpRight,
  Repeat,
} from 'lucide-react';

interface RPGHoverCardProps {
  hoveredPiece: Piece | null;
  targetPiece?: Piece | null;
  tacticalContext?: TacticalContext | null;
  combatOdds?: CombatOdds | null;
  isAttackerHover?: boolean;
  playStyle?: PlayStyle;
  boardType?: BoardType;
}

export const RPGHoverCard: React.FC<RPGHoverCardProps> = React.memo(({
  hoveredPiece,
  targetPiece,
  tacticalContext,
  combatOdds,
  playStyle = 'open',
  boardType = 'pyramid',
}) => {
  if (!hoveredPiece) return null;

  // Case 1: Live Engagement Preview (Attacker hovering over legal target enemy piece)
  if (targetPiece && combatOdds) {
    const hpRatio = Math.max(0, Math.min(100, (targetPiece.rpg.hp / targetPiece.rpg.maxHp) * 100));
    const isMirrorClassClash = hoveredPiece.type === targetPiece.type;

    return (
      <div className="w-80 p-3.5 bg-slate-950/95 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl text-white space-y-3 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header Matchup */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
              <Crosshair className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-bold tracking-wide uppercase text-white">
                {hoveredPiece.color} {hoveredPiece.type} vs {targetPiece.color} {targetPiece.type}
              </div>
              <div className="text-[10px] text-slate-400">
                {isMirrorClassClash ? (
                  <span>
                    Mirror Class Duel:{' '}
                    <strong className="text-amber-400 font-mono">Rock · Paper · Scissors</strong>
                  </span>
                ) : (
                  <>
                    Attack Roll: <strong className="text-amber-400 font-mono">1d20</strong>
                    {combatOdds.attackerDiceRollBonus !== 0 && (
                      <span className="ml-1 text-emerald-400 font-mono">
                        ({combatOdds.attackerDiceRollBonus > 0 ? '+1' : '-1'} Mod)
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
              isMirrorClassClash
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {isMirrorClassClash ? '1-of-3 RPS' : '1d20 Odds'}
          </span>
        </div>

        {isMirrorClassClash ? (
          /* Same Piece Type -> Rock Paper Scissors Preview */
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-100 leading-snug">
              <div className="font-bold text-amber-300 uppercase tracking-wider text-[10px] mb-1">
                Same Piece Type Clash ({hoveredPiece.type.toUpperCase()} vs {targetPiece.type.toUpperCase()})
              </div>
              Both units share the same class! Pick <strong>1 of 3 stances</strong> to decide who wins the battle outright:
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded-xl bg-slate-900 border border-amber-500/30 space-y-0.5">
                <div className="text-base">🪨</div>
                <div className="text-[10px] font-bold text-amber-300 uppercase">Rock</div>
                <div className="text-[9px] text-slate-400 font-mono">Beats ✂️</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-sky-500/30 space-y-0.5">
                <div className="text-base">📄</div>
                <div className="text-[10px] font-bold text-sky-300 uppercase">Paper</div>
                <div className="text-[9px] text-slate-400 font-mono">Beats 🪨</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-rose-500/30 space-y-0.5">
                <div className="text-base">✂️</div>
                <div className="text-[10px] font-bold text-rose-300 uppercase">Scissors</div>
                <div className="text-[9px] text-slate-400 font-mono">Beats 📄</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Different Piece Types -> D20 Odds Distribution Row */}
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Hit</span>
                <div className="text-sm font-black text-emerald-400 font-mono">
                  {combatOdds.hitPercent}%
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Evade</span>
                <div className="text-sm font-black text-sky-400 font-mono">
                  {combatOdds.dodgePercent}%
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Crit</span>
                <div className="text-sm font-black text-amber-400 font-mono">
                  {combatOdds.critPercent}%
                </div>
              </div>
            </div>

            {/* Expected Damage & Defender Health Impact */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Expected Strike:
                </span>
                <span className="font-bold font-mono text-white flex items-center gap-1.5">
                  <span>~{combatOdds.expectedDamage} DMG</span>
                  {combatOdds.isFatalExpected && (
                    <span className="flex items-center gap-0.5 text-[10px] text-rose-400 font-bold bg-rose-500/20 px-1.5 py-0.5 rounded">
                      <Skull className="w-3 h-3" /> Lethal
                    </span>
                  )}
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Target HP: {targetPiece.rpg.hp}/{targetPiece.rpg.maxHp}</span>
                  <span className="text-rose-400">
                    &rarr; est. {Math.max(0, targetPiece.rpg.hp - combatOdds.expectedDamage)} HP
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${hpRatio}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Dynamic Positional Modifiers Breakdown */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Positional &amp; Battlefield Modifiers
          </div>

          <div className="space-y-1 text-[11px] max-h-36 overflow-y-auto pr-0.5">
            {combatOdds.positiveModifiers.map((mod, idx) => (
              <div
                key={`pos_${idx}`}
                className="flex items-start gap-1.5 text-emerald-300 bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-800/40 leading-tight"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>{mod}</span>
              </div>
            ))}

            {combatOdds.negativeModifiers.map((mod, idx) => (
              <div
                key={`neg_${idx}`}
                className="flex items-start gap-1.5 text-rose-300 bg-rose-950/30 p-1.5 rounded-lg border border-rose-800/40 leading-tight"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <span>{mod}</span>
              </div>
            ))}

            {combatOdds.positiveModifiers.length === 0 &&
              combatOdds.negativeModifiers.length === 0 && (
                <div className="text-[10px] text-slate-500 italic p-1">
                  Neutral terrain &amp; unassisted engagement
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  // Case 2: General Piece Hover (Friendly or Enemy Inspection)
  const isFriendly = hoveredPiece.color === 'white';
  const hpPercent = Math.max(0, Math.min(100, (hoveredPiece.rpg.hp / hoveredPiece.rpg.maxHp) * 100));

  return (
    <div className="w-72 p-3 bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl text-white space-y-2.5 pointer-events-auto animate-in fade-in zoom-in-95 duration-150">
      {/* Title & Position */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isFriendly ? 'bg-amber-400' : 'bg-indigo-400'
            }`}
          />
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-white">
              {hoveredPiece.color} {hoveredPiece.type}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Tile ({hoveredPiece.position.x}, {hoveredPiece.position.y})
            </div>
          </div>
        </div>

        <span className="text-[10px] text-sky-300 font-mono px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20">
          Lv. {hoveredPiece.rpg.level || 1}
        </span>
      </div>

      {/* HP Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-slate-400">Health Points</span>
          <span className="font-bold text-emerald-400">
            {hoveredPiece.rpg.hp} / {hoveredPiece.rpg.maxHp} HP
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-4 gap-1 text-center font-mono">
        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400">ATK</div>
          <div className="text-xs font-bold text-amber-300">{hoveredPiece.rpg.atk}</div>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400">DEF</div>
          <div className="text-xs font-bold text-sky-300">{hoveredPiece.rpg.def}</div>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400">EVA</div>
          <div className="text-xs font-bold text-teal-300">{hoveredPiece.rpg.evasion}%</div>
        </div>

        <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[9px] text-slate-400">CRIT</div>
          <div className="text-xs font-bold text-rose-300">{hoveredPiece.rpg.critChance}%</div>
        </div>
      </div>

      {/* Elevation & Terrain */}
      <div className="flex items-center justify-between gap-1.5 text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">
            {tacticalContext?.elevationName ||
              (hoveredPiece.position.isVerticalWall
                ? 'Vertical Wall Face'
                : `Terrace Tier ${hoveredPiece.position.tier}`)}
          </span>
        </div>
        {playStyle === 'surface_bound' && (
          <span className="text-[10px] font-mono text-purple-300 shrink-0">
            {hoveredPiece.position.isVerticalWall ? 'Vertical Surface' : 'Horizontal Surface'}
          </span>
        )}
      </div>

      {/* 4×4 Summit Tactical Mobility Rule Telemetry */}
      {!hoveredPiece.position.isVerticalWall &&
        (hoveredPiece.position.tier === 3 || hoveredPiece.position.tier === 4) &&
        tacticalContext?.elevationName?.toLowerCase().includes('summit') && (
          <div className="p-2 rounded-xl bg-amber-950/35 border border-amber-500/40 space-y-1 text-[10px]">
            <div className="flex items-center justify-between font-bold text-amber-200">
              <span>4×4 Summit Rule:</span>
              <span className="text-amber-300 font-mono">
                {hoveredPiece.type === 'knight' ? 'KNIGHT EXEMPT (JUMP)' : '1-TILE 8-DIR STEP'}
              </span>
            </div>
            <div className="text-slate-300 leading-snug">
              {hoveredPiece.type === 'knight'
                ? 'Exempt from the 1-tile summit restriction — retains full legal summit jumping mobility!'
                : hoveredPiece.type === 'pawn'
                ? 'Moves 1 connected tile in any of the 8 directions; captures strictly 1 step forward-diagonally.'
                : 'Moves 1 connected tile in any of the 8 directions while on the Summit; normal range resumes next turn after leaving.'}
            </div>
          </div>
        )}

      {/* Surface Bound Play Style: Jump Color Law & 4×4 Summit Release Status */}
      {playStyle === 'surface_bound' &&
        (hoveredPiece.type === 'knight' || hoveredPiece.type === 'gargoyle') && (() => {
          const originCol =
            hoveredPiece.originColor ?? getPositionCheckerColor(hoveredPiece.position, boardType);
          const isReleased = Boolean(hoveredPiece.colorReleased);
          return (
            <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-1 text-[10px]">
              <div className="flex items-center justify-between font-bold text-purple-200">
                <span>Surface Bound Jump Law:</span>
                <span className={isReleased ? 'text-emerald-300 font-mono' : 'text-amber-300 font-mono'}>
                  {isReleased ? 'SUMMIT RELEASED' : `${originCol.toUpperCase()}-TILE BOUND`}
                </span>
              </div>
              <div className="text-slate-300">
                {isReleased
                  ? '4×4 Summit reached — may jump to both light and dark tiles.'
                  : `Bound to ${originCol} tiles until reaching the 4×4 Summit.`}
              </div>
            </div>
          );
        })()}

      {/* Vanguard 9 -> 1 Forward Contraction & Rook Exchange Telemetry */}
      {hoveredPiece.type === 'vanguard' && (() => {
        const profile = getVanguardMovementProfile(hoveredPiece);
        return (
          <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-emerald-300 font-bold">
              <span className="flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                Forward Range (9→1):
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono">
                Max {profile.maxTiles} {profile.maxTiles === 1 ? 'Tile' : 'Tiles'}
              </span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>Lateral (Sideways):</span>
              <span className={hoveredPiece.position.isVerticalWall ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                {hoveredPiece.position.isVerticalWall ? 'Active (Vertical Wall)' : 'Locked (Horizontal)'}
              </span>
            </div>
            <div className="text-cyan-300 flex items-center gap-1 pt-0.5 border-t border-emerald-800/40">
              <Repeat className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Special: Click own-team Rook to Exchange positions</span>
            </div>
          </div>
        );
      })()}

      {/* Gargoyle — Pyramid Terrain / Defensive Specialist Telemetry */}
      {hoveredPiece.type === 'gargoyle' && (() => {
        const gProf = getGargoyleTerrainProfile(hoveredPiece);
        return (
          <div className="p-2 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-purple-300 font-bold">
              <span>Pyramid Terrain Specialist:</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 font-mono">
                {gProf.maxLeapRadius}-Tile Radius
              </span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>Stance:</span>
              <span className={gProf.isOnPyramidTerrain ? 'text-emerald-300 font-semibold' : 'text-amber-300'}>
                {gProf.isOnPyramidTerrain
                  ? `+${gProf.defBonus} DEF · +${gProf.evasionBonus}% EVA · +${gProf.atkBonusPercent}% ATK`
                  : 'Flat Valley (-5% EVA)'}
              </span>
            </div>
            <div className="text-purple-200/80 pt-0.5 border-t border-purple-800/40">
              {gProf.terrainLabel}
            </div>
          </div>
        );
      })()}

      {/* Ascendant — Elevation / Advancement Specialist Telemetry */}
      {hoveredPiece.type === 'ascendant' && (() => {
        const aProf = getAscendantProfile(hoveredPiece, 20);
        return (
          <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-amber-300 font-bold">
              <span>Elevation Development:</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 font-mono">
                {aProf.maxStride}-Tile Stride
              </span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>Resonance Bonus:</span>
              <span className="text-emerald-300 font-semibold font-mono">
                +{aProf.atkBonus} ATK · +{aProf.defBonus} DEF · +{aProf.critBonus}% CRIT
              </span>
            </div>
            <div className="text-amber-200/80 pt-0.5 border-t border-amber-800/40">
              {aProf.stageLabel} · Ignores Uphill Penalty
            </div>
          </div>
        );
      })()}

      {/* Trebuchet — Jump-Capture & 3-Tile Knockback Bombardment Specialist Telemetry */}
      {hoveredPiece.type === 'trebuchet' && (() => {
        const tProf = getTrebuchetProfile(hoveredPiece);
        const onPyramid = (hoveredPiece.position.tier || 0) >= 1 || Boolean(hoveredPiece.position.isVerticalWall);
        return (
          <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-1.5 text-[10px]">
            <div className="flex items-center justify-between text-rose-300 font-bold">
              <span>Jump-Capture (Required):</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-200 font-mono">
                1–{tProf.repositionRange} Tiles (⚔ Jump on Piece)
              </span>
            </div>
            <div className="text-slate-300 flex items-center justify-between">
              <span>Bombardment (☄):</span>
              <span className="text-amber-300 font-semibold font-mono">
                Knocks Back 3 Tiles (Random Open)
              </span>
            </div>
            <div className="text-rose-200/80 pt-0.5 border-t border-rose-800/40">
              {onPyramid
                ? 'On Pyramid: Can ONLY bombard targets on the 4×4 Summit!'
                : `Ground Bombard Range: ${tProf.minRange}–${tProf.maxRange} Tiles (Climb Pyramid → 4×4 Summit Only)`}
            </div>
          </div>
        );
      })()}

      {/* Whole-Board Tactical Relationships */}
      {tacticalContext && (
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="p-1.5 rounded-lg bg-emerald-950/20 border border-emerald-800/30 text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Protected:
            </span>
            <strong className="font-mono font-bold">×{tacticalContext.protectedCount}</strong>
          </div>

          <div className="p-1.5 rounded-lg bg-rose-950/20 border border-rose-800/30 text-rose-300 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Crosshair className="w-3 h-3 text-rose-400" /> Threatened:
            </span>
            <strong className="font-mono font-bold">×{tacticalContext.threatenedCount}</strong>
          </div>
        </div>
      )}

      {/* Pinned Warning */}
      {tacticalContext?.isPinned && (
        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1">
          <Percent className="w-3 h-3 text-amber-400" />
          <span>Pinned to Monarch (Escape geometry locked)</span>
        </div>
      )}
    </div>
  );
});
