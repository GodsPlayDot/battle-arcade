import React, { useState } from 'react';
import { Player, Position, Skill, FloatingText, Decoy, StatusEffectType, SkillAnimation, SkillType, Obstacle, Skeleton, Trap, DamagingTile, Rift, Projectile, PlayerActions, EffectZone, EffectZoneType } from '../types';
import FloatingTextComponent from './FloatingText';
import ProjectileComponent from './Projectile';

interface GameBoardProps {
  gridSize: number;
  players: Player[];
  decoys: Decoy[];
  skeletons: Skeleton[];
  obstacles: Obstacle[];
  traps: Trap[];
  damagingTiles: DamagingTile[];
  effectZones: EffectZone[];
  rifts: Rift[];
  projectiles: Projectile[];
  selectedSkill: Skill | null;
  onCellClick: (pos: Position) => void;
  activePlayer: Player | null;
  activePlayerActions: PlayerActions | null;
  activeMoveSlot: 'primary' | 'followup';
  floatingTexts: FloatingText[];
  skillAnimation: SkillAnimation | null;
  shrinkLevel?: number;
}

const getDistance = (pos1: Position, pos2: Position): number => {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

const hasLineOfSight = (start: Position, end: Position, obstacles: (Obstacle | {position: Position})[], effectZones: EffectZone[]): boolean => {
    // Cannot shoot through players or decoys
    const smokeClouds = effectZones.filter(z => z.type === EffectZoneType.SMOKE_CLOUD);
    const allObstacles = [
        ...obstacles.map(o => o.position),
        ...smokeClouds.flatMap(z => {
            const tiles: Position[] = [];
            for (let y_offset = -z.radius; y_offset <= z.radius; y_offset++) {
                for (let x_offset = -z.radius; x_offset <= z.radius; x_offset++) {
                    if(getDistance({x:0, y:0}, {x: x_offset, y: y_offset}) <= z.radius) {
                        tiles.push({ x: z.position.x + x_offset, y: z.position.y + y_offset });
                    }
                }
            }
            return tiles;
        })
    ];

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    if (steps <= 1) return true;

    const x_inc = dx / steps;
    const y_inc = dy / steps;

    let x = start.x;
    let y = start.y;

    for (let i = 1; i < steps; i++) {
        x += x_inc;
        y += y_inc;
        const currentPos = { x: Math.round(x), y: Math.round(y) };
        if (allObstacles.some(o => o.x === currentPos.x && o.y === currentPos.y)) {
            return false;
        }
    }
    return true;
}


const GameBoard: React.FC<GameBoardProps> = ({ gridSize, players, decoys, skeletons, obstacles, traps, damagingTiles, effectZones, rifts, projectiles, selectedSkill, onCellClick, activePlayer, activePlayerActions, activeMoveSlot, floatingTexts, skillAnimation, shrinkLevel = 0 }) => {
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const cells = [];
  const CELL_SIZE_REM = 4; // Corresponds to w-16, h-16 -> 4rem
  const BOARD_DIMENSION_PX = gridSize * (CELL_SIZE_REM * 16);

  const opponent = players.find(p => p.id !== activePlayer?.id);
  const allBlockers = [...obstacles, ...players.map(p => ({ position: p.position, duration: 1})), ...decoys.map(d => ({ position: d.position, duration: 1})), ...skeletons.map(s => ({ position: s.position, duration: 1}))];

  const tauntEffect = activePlayer ? activePlayer.statusEffects.find(e => e.type === StatusEffectType.TAUNTED_DEBUFF) : null;

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const pos = { x, y };
      const playerOnCell = players.find(p => p.position.x === x && p.position.y === y);
      const isPlayerOccupied = !!playerOnCell;
      const isDecoyOccupied = decoys.some(d => d.position.x === x && d.position.y === y);
      const isSkeletonOccupied = skeletons.some(s => s.position.x === x && s.position.y === y);
      const isObstacleOccupied = obstacles.some(o => o.position.x === x && o.position.y === y);
      const isOccupied = isPlayerOccupied || isDecoyOccupied || isObstacleOccupied || isSkeletonOccupied;

      let cellStyle = 'bg-gray-700/50 border border-gray-600/50';
      let isClickable = false;
      
      const damagingTile = damagingTiles.find(dt => dt.position.x === x && dt.position.y === y);
      if (damagingTile) {
        cellStyle = `${damagingTile.color}-600/40 border ${damagingTile.color}-500/50`;
      }
      
      const isUnsafe = shrinkLevel > 0 && (x < shrinkLevel || x >= gridSize - shrinkLevel || y < shrinkLevel || y >= gridSize - shrinkLevel);
      if (isUnsafe) {
        cellStyle = 'bg-red-900/60 border border-red-700/70 animate-pulse';
      }

      if (activePlayer && selectedSkill) {
        const isFollowupAfterSummon = activeMoveSlot === 'followup' && activePlayerActions?.primary.skill?.id === 'sp1';
        let baseSourcePos: Position;
        if (activeMoveSlot === 'followup' && activePlayerActions?.primary.target) {
            const primarySkill = activePlayerActions.primary.skill;
            if (primarySkill?.type === SkillType.MOVE || primarySkill?.id === 'sp1') {
                baseSourcePos = activePlayerActions.primary.target;
            } else {
                baseSourcePos = activePlayer.position;
            }
        } else {
            baseSourcePos = activePlayer.position;
        }

        const activePlayerDecoy = decoys.find(d => d.playerId === activePlayer?.id);

        const isConstricted = activePlayer.statusEffects.some(e => e.type === StatusEffectType.CONSTRICTED_DEBUFF);
        const isSlowed = activePlayer.statusEffects.some(e => e.type === StatusEffectType.SLOW_DEBUFF);
        let effectiveRange = selectedSkill.range;
        if (isConstricted) effectiveRange = Math.max(0, effectiveRange - 2);
        if (isSlowed && selectedSkill.type === SkillType.MOVE) effectiveRange = Math.max(0, Math.floor(effectiveRange / 2));
        
        const isAttackable = ['Attack', 'Special', 'Debuff'].includes(selectedSkill.type);

        if (selectedSkill.type === 'Move') {
            if (isOccupied && selectedSkill.id !== 's105') {
                isClickable = false;
                cellStyle = 'bg-red-900/50 border border-red-700/50 cursor-not-allowed';
            } else {
                const distFromSource = getDistance(baseSourcePos, pos);
                if (distFromSource <= effectiveRange) {
                    isClickable = true;
                    cellStyle = 'bg-green-500/30 border border-green-400/50 cursor-pointer';
                } else {
                    isClickable = false;
                    cellStyle = 'bg-yellow-500/20 border border-yellow-400/40';
                }
            }
        } else if (isAttackable) {
            isClickable = true; // Assume clickable until a condition fails
            if (tauntEffect) {
                const taunter = players.find(p => p.id === tauntEffect.sourceId);
                if (taunter && pos.x === taunter.position.x && pos.y === taunter.position.y) {
                    cellStyle = 'bg-pink-500/40 border border-pink-400/60 cursor-pointer';
                } else {
                    isClickable = false;
                    cellStyle = 'bg-gray-800/50 border border-gray-700/50 cursor-not-allowed';
                }
            } else {
                let sourcePositions: Position[] = [baseSourcePos];
                if (activePlayerDecoy && !isFollowupAfterSummon) {
                    sourcePositions.push(activePlayerDecoy.position);
                }

                const reachInfo = sourcePositions.reduce((acc, sourcePos) => {
                    if (getDistance(sourcePos, pos) <= effectiveRange) {
                        acc.inRange = true;
                        if (hasLineOfSight(sourcePos, pos, allBlockers, effectZones)) {
                            acc.hasLos = true;
                        }
                    }
                    return acc;
                }, { inRange: false, hasLos: false });

                const isVanishedTarget = playerOnCell?.statusEffects.some(e => e.type === StatusEffectType.VANISHED) && (!selectedSkill.aoe || selectedSkill.aoe === 0);
                if (isVanishedTarget) {
                    isClickable = false;
                    cellStyle = 'bg-purple-900/50 border border-purple-700/50 cursor-not-allowed';
                } else if (reachInfo.inRange && reachInfo.hasLos) {
                    cellStyle = 'bg-green-500/30 border border-green-400/50 cursor-pointer';
                } else if (reachInfo.inRange) {
                    isClickable = false;
                    cellStyle = 'bg-orange-500/30 border border-orange-400/50 cursor-not-allowed';
                } else {
                    isClickable = false;
                    cellStyle = 'bg-yellow-500/20 border border-yellow-400/40';
                }
            }
        } else if (selectedSkill.type === 'Buff') {
            const isPotentialTarget = players.some(p => p.position.x === x && p.position.y === y);
            if (getDistance(baseSourcePos, pos) <= effectiveRange && isPotentialTarget) {
                isClickable = true;
                cellStyle = 'bg-blue-500/30 border border-blue-400/50 cursor-pointer';
            } else {
                isClickable = false;
            }
        }

        if(isClickable === false && selectedSkill.type === 'Attackable') {
             // Redundant check, simplified logic above
        }

        // AOE highlight on hover
        if (hoveredCell && (selectedSkill.aoe || 0) > 0 && isAttackable) {
            const inAoeRadius = getDistance(pos, hoveredCell) <= selectedSkill.aoe!;
            if (inAoeRadius) {
                 cellStyle += ' outline outline-2 outline-red-400 outline-offset-[-2px]';
            }
        }
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={`grid-cell w-16 h-16 ${cellStyle}`}
          onClick={() => isClickable && onCellClick(pos)}
          onMouseEnter={() => setHoveredCell(pos)}
          onMouseLeave={() => setHoveredCell(null)}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
        >
        {traps.some(t => t.position.x === x && t.position.y === y && t.playerId === activePlayer?.id) && (
            <div className="w-full h-full flex items-center justify-center text-red-400 text-3xl font-bold animate-pulse">!</div>
        )}
        </div>
      );
    }
  }
  
  const renderAnimationLayer = () => {
    if (!skillAnimation) return null;

    const { skill, source, target } = skillAnimation;
    const animationElements: React.ReactNode[] = [];

    let sourceAnimClass = 'animation-source';
    let targetAnimClass = '';

    switch (skill.type) {
        case SkillType.ATTACK:
        case SkillType.DEBUFF:
            targetAnimClass = 'animation-target-attack';
            break;
        case SkillType.MOVE:
            targetAnimClass = 'animation-target-move';
            break;
        case SkillType.BUFF:
            targetAnimClass = 'animation-target-buff';
            break;
        case SkillType.SPECIAL:
            targetAnimClass = 'animation-target-special';
            break;
        default:
            targetAnimClass = 'animation-target-attack';
    }

    // Source Tile
    animationElements.push(<div key="source" className={`animation-tile ${sourceAnimClass} absolute w-16 h-16`} style={{ top: `${source.y * CELL_SIZE_REM}rem`, left: `${source.x * CELL_SIZE_REM}rem` }} />);

    // Target/AOE Tiles
    if (skill.aoe && skill.aoe > 0 && (['Attack', 'Special', 'Debuff'].includes(skill.type))) {
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                if (getDistance({x, y}, target) <= skill.aoe) {
                    animationElements.push(<div key={`aoe-${x}-${y}`} className={`animation-tile ${targetAnimClass} absolute w-16 h-16`} style={{ top: `${y * CELL_SIZE_REM}rem`, left: `${x * CELL_SIZE_REM}rem` }} />);
                }
            }
        }
    } else {
        animationElements.push(<div key="target" className={`animation-tile ${targetAnimClass} absolute w-16 h-16`} style={{ top: `${target.y * CELL_SIZE_REM}rem`, left: `${target.x * CELL_SIZE_REM}rem` }} />);
    }
    
    return <React.Fragment key={skillAnimation.key}>{animationElements}</React.Fragment>;
  };

  const scaleClass = gridSize > 11 ? 'scale-[0.25] sm:scale-[0.35] md:scale-[0.4] lg:scale-[0.45] xl:scale-[0.5]' : 'scale-[0.55] sm:scale-65 md:scale-75 lg:scale-90 xl:scale-100';

  return (
    <div 
        className={`relative flex items-center justify-center p-0 ${scaleClass}`}
        style={{ width: `${BOARD_DIMENSION_PX}px`, height: `${BOARD_DIMENSION_PX}px`}}
    >
      <div className="iso-grid grid relative" style={{ gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE_REM}rem)`, gridTemplateRows: `repeat(${gridSize}, ${CELL_SIZE_REM}rem)` }}>
        {cells}
        {effectZones.map(zone => {
             const zoneTiles: React.ReactNode[] = [];
             let colorClass = '';
             switch (zone.type) {
                 case EffectZoneType.GRAVITY_WELL: colorClass = 'bg-purple-900/50 border-purple-500/70'; break;
                 case EffectZoneType.CONSECRATED_GROUND: colorClass = 'bg-yellow-200/50 border-yellow-300/70'; break;
                 case EffectZoneType.CORROSIVE_MIRE: colorClass = 'bg-lime-800/60 border-lime-600/70'; break;
                 case EffectZoneType.SMOKE_CLOUD: colorClass = 'bg-gray-500/60 border-gray-400/70'; break;
             }

            for (let y_offset = -zone.radius; y_offset <= zone.radius; y_offset++) {
                for (let x_offset = -zone.radius; x_offset <= zone.radius; x_offset++) {
                    const tilePos = { x: zone.position.x + x_offset, y: zone.position.y + y_offset };
                    if (getDistance(zone.position, tilePos) <= zone.radius) {
                        zoneTiles.push(<div key={`zone-${zone.id}-${tilePos.x}-${tilePos.y}`} className={`absolute w-16 h-16 ${colorClass} border animate-pulse`} style={{ top: `${tilePos.y * CELL_SIZE_REM}rem`, left: `${tilePos.x * CELL_SIZE_REM}rem`, transform: 'translateZ(0.5px)' }} />);
                    }
                }
            }
            return zoneTiles;
        })}
        {renderAnimationLayer()}
        {projectiles.map(p => <ProjectileComponent key={p.id} projectile={p} cellSizeRem={CELL_SIZE_REM} />)}
        {players.map(player => {
          if (player.hp <= 0) return null;
          const top = player.position.y * CELL_SIZE_REM;
          const left = player.position.x * CELL_SIZE_REM;
          const isVanished = player.statusEffects.some(e => e.type === StatusEffectType.VANISHED);
          return (
            <div
              key={player.id}
              className={`player-token absolute w-16 h-16 flex items-center justify-center pointer-events-none transition-all duration-300 ${isVanished ? 'opacity-10' : 'opacity-100'}`}
              style={{
                top: `${top}rem`,
                left: `${left}rem`,
                transform: 'translateZ(5px)',
              }}
            >
              <div className={`player-token-inner w-10 h-10 rounded-full ${player.color} shadow-lg shadow-black/50 flex items-center justify-center font-bold text-xl`}>
                {player.id > 21 ? 'G' : (player.id > 20 ? 'B' : player.id)}
              </div>
            </div>
          );
        })}
        {decoys.map(decoy => {
            const top = decoy.position.y * CELL_SIZE_REM;
            const left = decoy.position.x * CELL_SIZE_REM;
            return (
              <div
                key={`decoy-${decoy.id}`}
                className="player-token absolute w-16 h-16 flex items-center justify-center pointer-events-none"
                style={{
                  top: `${top}rem`,
                  left: `${left}rem`,
                  transform: 'translateZ(4px)',
                }}
              >
                <div className={`player-token-inner w-8 h-8 rounded-md ${decoy.color} opacity-70 shadow-md shadow-black/50 flex items-center justify-center font-bold text-lg`}>
                  D
                </div>
              </div>
            );
        })}
        {skeletons.map(skeleton => {
            const top = skeleton.position.y * CELL_SIZE_REM;
            const left = skeleton.position.x * CELL_SIZE_REM;
            return (
              <div
                key={`skeleton-${skeleton.id}`}
                className="player-token absolute w-16 h-16 flex items-center justify-center pointer-events-none"
                style={{
                  top: `${top}rem`,
                  left: `${left}rem`,
                  transform: 'translateZ(4px)',
                }}
              >
                <div className={`player-token-inner w-8 h-8 rounded-full bg-gray-400 shadow-md shadow-black/50 flex items-center justify-center font-bold text-lg`}>
                  S
                </div>
              </div>
            );
        })}
         {obstacles.map((obstacle, i) => {
            const top = obstacle.position.y * CELL_SIZE_REM;
            const left = obstacle.position.x * CELL_SIZE_REM;
            return (
              <div
                key={`obstacle-${i}`}
                className="player-token absolute w-16 h-16 flex items-center justify-center pointer-events-none"
                style={{
                  top: `${top}rem`,
                  left: `${left}rem`,
                  transform: 'translateZ(4px)',
                }}
              >
                <div className={`player-token-inner w-10 h-10 bg-gray-600 shadow-lg shadow-black/50 flex items-center justify-center`}>
                   <div className="w-8 h-8 bg-gray-800 border-2 border-gray-500" />
                </div>
              </div>
            );
        })}
        {rifts.map((rift) => {
             const top = rift.position.y * CELL_SIZE_REM;
             const left = rift.position.x * CELL_SIZE_REM;
             return (
                <div key={`rift-${rift.id}`} className="absolute w-16 h-16 flex items-center justify-center pointer-events-none" style={{ top: `${top}rem`, left: `${left}rem`, transform: 'translateZ(1px)' }}>
                    <div className="player-token-inner w-12 h-12 rounded-full bg-purple-900 animate-pulse border-4 border-purple-500 shadow-lg shadow-purple-500/50" />
                </div>
             )
        })}
        {floatingTexts.map(ft => (
          <FloatingTextComponent key={ft.id} text={ft.text} color={ft.color} position={ft.position} cellSizeRem={CELL_SIZE_REM} />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;