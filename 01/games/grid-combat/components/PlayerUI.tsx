import React from 'react';
import { Player, Skill, SelectedMove, GamePhase, Position, StatusEffectType, SkillType, CostType } from '../types';
import { STAY_SKILL } from '../constants';
import ExtraLifeIcon from './icons/ExtraLifeIcon';
import AIToggle from './AIToggle';

interface StatBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}

const StatBar: React.FC<StatBarProps> = ({ label, value, maxValue, color }) => (
  <div>
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span>{Math.ceil(value)} / {maxValue}</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2.5">
      <div className={color} style={{ width: `${(value / maxValue) * 100}%`, height: '100%', borderRadius: 'inherit' }}></div>
    </div>
  </div>
);

interface PlayerUIProps {
  player: Player;
  opponent?: Player;
  actions: { primary: SelectedMove; followup: SelectedMove; confirmed: boolean; };
  skillCooldowns: { [skillId: string]: number };
  onSkillSelect: (skill: Skill) => void;
  onConfirmMoves: () => void;
  isActive: boolean;
  gamePhase: GamePhase;
  activeMoveSlot: 'primary' | 'followup';
  onSetActiveMoveSlot: (slot: 'primary' | 'followup') => void;
  extraLives?: number;
  onToggleAI?: (isAi: boolean) => void;
  isToggleAIDisabled?: boolean;
}

const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

interface MoveSlotProps {
    title: string;
    player: Player;
    sourcePosition: Position;
    selectedMove: SelectedMove;
    isActive: boolean;
    onClick: () => void;
}

const MoveSlot: React.FC<MoveSlotProps> = ({ title, player, sourcePosition, selectedMove, isActive, onClick }) => {
    const isConstricted = player.statusEffects.some(e => e.type === StatusEffectType.CONSTRICTED_DEBUFF);
    const isSlowed = player.statusEffects.some(e => e.type === StatusEffectType.SLOW_DEBUFF);
    
    let effectiveRange = 0;
    if (selectedMove.skill) {
        effectiveRange = selectedMove.skill.range;
        if (isConstricted) {
            effectiveRange = Math.max(0, effectiveRange - 2);
        }
        if (isSlowed && selectedMove.skill.type === SkillType.MOVE) {
            effectiveRange = Math.max(0, Math.floor(effectiveRange / 2));
        }
    }
    
    return (
      <div 
        className={`bg-gray-800 p-3 rounded-lg border-2 transition-all duration-200 ${isActive ? 'border-yellow-400' : 'border-transparent'} ${!isActive ? 'hover:border-gray-600' : ''} cursor-pointer`}
        onClick={onClick}
      >
        <h4 className="text-md font-bold text-gray-400">{title}</h4>
        {selectedMove.skill ? (
          <div className="mt-2 text-sm">
            <p className="font-semibold text-cyan-400">{selectedMove.skill.name}</p>
            <p>Target: {selectedMove.target ? `(${selectedMove.target.x}, ${selectedMove.target.y})` : 'None'}</p>
            {selectedMove.target && selectedMove.skill.type !== 'Buff' && selectedMove.skill.range > 0 && (
                getDistance(sourcePosition, selectedMove.target) <= effectiveRange ? (
                <span className="text-green-400">Target in range</span>
              ) : (
                <span className="text-yellow-400">Target out of range</span>
              )
            )}
          </div>
        ) : (
          <p className="mt-2 text-gray-500">No move selected</p>
        )}
      </div>
    );
};


const PlayerUI: React.FC<PlayerUIProps> = ({ player, opponent, actions, skillCooldowns, onSkillSelect, onConfirmMoves, isActive, gamePhase, activeMoveSlot, onSetActiveMoveSlot, extraLives, onToggleAI, isToggleAIDisabled }) => {
  const canConfirm = actions.primary.skill && actions.primary.target && actions.followup.skill && actions.followup.target;
  const isTurnDisabled = !isActive || actions.confirmed || (gamePhase !== GamePhase.SELECTING_MOVES && gamePhase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS) || player.isAi || player.statusEffects.some(e => e.type === StatusEffectType.FROZEN_DEBUFF);

  const getStatusEffectDisplay = (type: StatusEffectType, potency?: number, duration?: number) => {
    let text = type.replace(/_/g, ' ');
    let details = `(${duration}t)`;
    switch (type) {
        case StatusEffectType.AEGIS_SHIELD: details = `(${potency} HP, ${duration}t)`; break;
        case StatusEffectType.CONSTRICTED_DEBUFF: details = `(-2 Range, ${duration}t)`; break;
        case StatusEffectType.RETRIBUTION_AURA: details = `(200% Reflect, ${duration}t)`; break;
        case StatusEffectType.VULNERABLE_DEBUFF: details = `(+50% Dmg, ${duration}t)`; break;
        case StatusEffectType.BURNING_DEBUFF:
        case StatusEffectType.POISONED_DEBUFF:
            details = `(-${potency} HP/t, ${duration}t)`; break;
        case StatusEffectType.STRENGTH_BUFF: details = `(+50% Dmg, ${duration}t)`; break;
        case StatusEffectType.DEFENSE_BUFF: details = `(+100% Def, ${duration}t)`; break;
        case StatusEffectType.BLOOD_PACT_BUFF: details = `(Costs  halved, ${duration}t)`; break;
        case StatusEffectType.TWIN_ECHO_BUFF: details = `(Echo free, 2x Dmg Taken, ${duration}t)`; break;
        default: break; // Keep default (duration)
    }
    return `${text} ${details}`;
  };

  const getStatusEffectColor = (type: StatusEffectType) => {
    switch (type) {
        case StatusEffectType.STRENGTH_BUFF: return 'bg-orange-500 text-white';
        case StatusEffectType.VANISHED: return 'bg-purple-500 text-white';
        case StatusEffectType.DEFENSE_BUFF: return 'bg-sky-500 text-white';
        case StatusEffectType.AEGIS_SHIELD: return 'bg-cyan-400 text-black';
        case StatusEffectType.RAMPAGE_BUFF: return 'bg-red-700 text-white';
        case StatusEffectType.BLOOD_PACT_BUFF: return 'bg-rose-500 text-white';
        case StatusEffectType.RETRIBUTION_AURA: return 'bg-indigo-500 text-white';
        case StatusEffectType.CONSTRICTED_DEBUFF: return 'bg-gray-500 text-white';
        case StatusEffectType.TWIN_ECHO_BUFF: return 'bg-cyan-600 text-white';
        case StatusEffectType.VULNERABLE_DEBUFF: return 'bg-yellow-600 text-black';
        case StatusEffectType.FROZEN_DEBUFF: return 'bg-blue-300 text-black';
        case StatusEffectType.BURNING_DEBUFF: return 'bg-orange-600 text-white';
        case StatusEffectType.POISONED_DEBUFF: return 'bg-lime-600 text-white';
        case StatusEffectType.TAUNTED_DEBUFF: return 'bg-pink-600 text-white';
        case StatusEffectType.SLOW_DEBUFF: return 'bg-stone-500 text-white';
        case StatusEffectType.IMMOBILIZED_DEBUFF: return 'bg-amber-700 text-white';
        case StatusEffectType.UNSTOPPABLE_BUFF: return 'bg-yellow-400 text-black font-bold';
        case StatusEffectType.CHARGING_ATTACK: return 'bg-red-800 text-white animate-pulse';
        case StatusEffectType.HASTE_BUFF: return 'bg-teal-400 text-black';
        default: return 'bg-gray-600 text-gray-200';
    }
  }

  return (
    <div className={`flex flex-col border-2 rounded-lg p-4 space-y-3 w-full h-full ${isActive ? 'border-yellow-400' : 'border-gray-700'} bg-gray-800/50`}>
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-bold ${player.color.replace('bg-', 'text-').replace('-600', '-400').replace('-700', '-400').replace('-500', '-300').replace('-800', '-500')}`}>{player.name}</h2>
        <div className="flex items-center space-x-2">
            {extraLives !== undefined && extraLives > 0 && (
              <div className="flex items-center space-x-1 bg-pink-800/50 px-2 py-1 rounded-md">
                  <ExtraLifeIcon className="w-5 h-5 text-pink-300" />
                  <span className="font-bold text-lg text-pink-300">x{extraLives}</span>
              </div>
            )}
            {onToggleAI && (
                <AIToggle isAi={player.isAi} onToggle={onToggleAI} disabled={isToggleAIDisabled ?? false} />
            )}
        </div>
      </div>
      
      <div className="space-y-2">
        <StatBar label="HP" value={player.hp} maxValue={player.maxHp} color="bg-red-500" />
        <StatBar label="MP" value={player.mp} maxValue={player.maxMp} color="bg-blue-500" />
        <StatBar label="Stamina" value={player.stamina} maxValue={player.maxStamina} color="bg-green-500" />
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-sm bg-gray-900/30 p-2 rounded">
          <div className="text-center"><span className="font-bold text-gray-400">STR:</span> {player.stats.strength}</div>
          <div className="text-center"><span className="font-bold text-gray-400">DEF:</span> {player.stats.defense}</div>
          <div className="text-center"><span className="font-bold text-gray-400">SPD:</span> {player.stats.speed}</div>
          <div className="text-center"><span className="font-bold text-gray-400">INT:</span> {player.stats.intelligence}</div>
          <div className="text-center"><span className="font-bold text-gray-400">END:</span> {player.stats.endurance}</div>
          <div className="text-center"><span className="font-bold text-gray-400">LCK:</span> {player.stats.luck}</div>
      </div>

       <div className="h-6 flex items-center space-x-2 overflow-x-auto">
        {player.statusEffects.map(effect => (
            <div key={effect.type + Math.random()} className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${getStatusEffectColor(effect.type)}`}>
                {getStatusEffectDisplay(effect.type, effect.potency, effect.duration)}
            </div>
        ))}
      </div>

      {(() => {
          const primarySourcePos = player.position;
          let followupSourcePos = player.position;
          if (actions.primary.target && (actions.primary.skill?.type === SkillType.MOVE || actions.primary.skill?.id === 'sp1')) {
              followupSourcePos = actions.primary.target;
          }

          return (
      <div className="grid grid-cols-2 gap-2">
        <MoveSlot 
            title="Primary Move" 
            selectedMove={actions.primary} 
            player={player}
            sourcePosition={primarySourcePos}
            isActive={isActive && activeMoveSlot === 'primary'}
            onClick={() => onSetActiveMoveSlot('primary')}
        />
        <MoveSlot 
            title="Follow-up Move" 
            selectedMove={actions.followup} 
            player={player}
            sourcePosition={followupSourcePos}
            isActive={isActive && activeMoveSlot === 'followup'}
            onClick={() => onSetActiveMoveSlot('followup')}
        />
      </div>
          );
      })()}

      <div className="flex-grow overflow-y-auto bg-gray-900/50 p-2 rounded-md min-h-28">
        <h3 className="text-center font-bold mb-2">Skills</h3>
        <div className="grid grid-cols-2 gap-2">
          {player.skills.map(skill => {
            const cooldown = skillCooldowns[skill.id] || 0;
            const onCooldown = cooldown > 0;
            
            const getSkillColorClass = () => {
                if (skill.type === SkillType.SPECIAL) {
                    return 'bg-purple-800 hover:bg-purple-700 border-2 border-yellow-400/80 shadow-lg shadow-yellow-500/10';
                }
                switch (skill.costType) {
                    case CostType.MP:
                        return 'bg-blue-800 hover:bg-blue-700';
                    case CostType.STAMINA:
                        return 'bg-green-800 hover:bg-green-700';
                    case CostType.HP:
                        return 'bg-red-900 hover:bg-red-800';
                    default:
                        return 'bg-gray-700 hover:bg-cyan-600';
                }
            };
            
            let displayCost = skill.cost;
            let displayCostType = skill.costType;

            const twinEchoBuff = player.statusEffects.some(e => e.type === StatusEffectType.TWIN_ECHO_BUFF);
            const isEchoedMove = actions.primary.skill?.id === skill.id && actions.followup.skill?.id === skill.id;
            if(twinEchoBuff && isEchoedMove && skill.id !== STAY_SKILL.id) {
                displayCost = 0;
            }


            return (
              <button
                key={skill.id}
                onClick={() => onSkillSelect(skill)}
                disabled={isTurnDisabled || onCooldown}
                className={`p-2 rounded disabled:bg-gray-800 disabled:cursor-not-allowed disabled:text-gray-500 transition-colors text-left relative ${getSkillColorClass()}`}
              >
                <div className="flex items-center space-x-2">
                   <skill.icon className="w-5 h-5" />
                   <span className="font-semibold">{skill.name}</span>
                </div>
                <p className="text-xs text-gray-400">{displayCost} {displayCostType}</p>
                {onCooldown && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-lg text-white rounded">
                        {cooldown}
                    </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <button 
        onClick={onConfirmMoves}
        disabled={!canConfirm || actions.confirmed || (gamePhase !== GamePhase.SELECTING_MOVES && gamePhase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS) || player.isAi || player.statusEffects.some(e => e.type === StatusEffectType.FROZEN_DEBUFF)}
        className={`w-full py-2 font-bold rounded transition-colors ${
          actions.confirmed 
            ? 'bg-green-600 text-white' 
            : 'bg-yellow-500 hover:bg-yellow-400 text-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed'
        }`}
      >
        {actions.confirmed ? 'Ready' : 'Confirm Moves'}
      </button>
    </div>
  );
};

export default PlayerUI;