import React from 'react';
import type { Slime, StatusEffect, SlimeStat, SlimeStats } from '../types';
import HeartIcon from './icons/HeartIcon';
import SwordIcon from './icons/SwordIcon';
import ShieldIcon from './icons/ShieldIcon';
import SpeedIcon from './icons/SpeedIcon';
import CloverIcon from './icons/CloverIcon';
import DamageReductionIcon from './icons/DamageReductionIcon';
import EvasionIcon from './icons/EvasionIcon';

interface SlimeCardProps {
  slime: Slime;
  effectiveStats?: SlimeStats;
  isOpponent?: boolean;
  isHit?: boolean;
  feedbackText?: string;
  statusEffects?: StatusEffect[];
  abilityUsedName?: string | null;
}

const SlimeCard: React.FC<SlimeCardProps> = ({ slime, isOpponent = false, isHit = false, feedbackText, statusEffects, abilityUsedName, effectiveStats }) => {
  const hpPercentage = (slime.currentHp / (effectiveStats?.HP ?? slime.stats.HP)) * 100;

  const statInfo: { key: SlimeStat; icon: React.ReactNode }[] = [
    { key: 'ATK', icon: <SwordIcon className="w-5 h-5 mr-2" /> },
    { key: 'DEF', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
    { key: 'SPD', icon: <SpeedIcon className="w-5 h-5 mr-2" /> },
    { key: 'LUK', icon: <CloverIcon className="w-5 h-5 mr-2" /> },
  ];
  
  const getEffectIcon = (type: StatusEffect['type']) => {
    switch (type) {
      case 'DAMAGE_REDUCTION':
        return <DamageReductionIcon className="w-4 h-4 mr-2 text-blue-300" />;
      case 'GUARANTEED_EVASION':
      case 'EVASION_BOOST':
        return <EvasionIcon className="w-4 h-4 mr-2 text-teal-300" />;
      default:
        return null;
    }
  };


  return (
    <div className={`pixel-border p-4 relative ${isOpponent ? 'border-red-500' : 'border-green-400'} ${isHit ? 'shake' : ''} ${abilityUsedName ? 'ability-glow' : ''}`}>
       {feedbackText && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-bold text-red-500 feedback-popup" style={{ textShadow: '2px 2px #000' }}>
          {feedbackText}
        </div>
      )}
      <div className="text-center mb-2">
        <h3 className="text-2xl">{slime.name}</h3>
        <p className="text-sm">Lvl {slime.level} {isOpponent ? '' : slime.evolutionStage.name}</p>
      </div>
      
      <pre className="text-center text-3xl leading-none my-2 font-mono">
        {slime.evolutionStage.art.join('\n')}
      </pre>

      <div className="my-2">
          <div className="flex items-center justify-between text-sm">
             <div className="flex items-center">
                 <HeartIcon className="w-4 h-4 mr-1 text-red-500" />
                 <span>HP</span>
             </div>
             <span>{slime.currentHp} / {effectiveStats?.HP ?? slime.stats.HP}</span>
          </div>
          <div className="w-full bg-gray-700 border-2 border-current">
              <div
                  className="h-3 bg-red-500"
                  style={{ width: `${hpPercentage}%`, transition: 'width 0.5s ease-in-out' }}
              ></div>
          </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-4 text-lg">
        {statInfo.map(({ key, icon }) => {
          const baseValue = slime.stats[key];
          const effectiveValue = effectiveStats ? effectiveStats[key] : baseValue;
          const diff = effectiveValue - baseValue;

          return (
            <div key={key} className="flex items-center">
              {icon}
              <span>{key}: {baseValue}</span>
              {diff !== 0 && (
                <span className={`ml-2 text-base ${diff > 0 ? 'text-green-300' : 'text-red-300'}`}>
                  ({diff > 0 ? `+${diff}` : diff})
                </span>
              )}
            </div>
          );
        })}
      </div>
       {statusEffects && statusEffects.length > 0 && (
        <div className="mt-4 pt-2 border-t-2 border-dashed border-current">
          <h4 className="text-center text-sm mb-1 text-cyan-300">EFFECTS</h4>
          <div className="space-y-1">
            {statusEffects.map(effect => (
              <div key={effect.name} className="flex items-center justify-center text-xs">
                {getEffectIcon(effect.type)}
                <span className="text-green-300">{effect.name} ({effect.duration} turn{effect.duration > 1 ? 's' : ''})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SlimeCard;