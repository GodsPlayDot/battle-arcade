import React from 'react';
import type { Slime, SlimeStat, Ability } from '../types';
import { STAT_TOKEN_COST, ABILITIES, MAX_ABILITIES, MAX_LEVEL, MAX_STAT_VALUE } from '../constants';
import HeartIcon from './icons/HeartIcon';
import SwordIcon from './icons/SwordIcon';
import ShieldIcon from './icons/ShieldIcon';
import SpeedIcon from './icons/SpeedIcon';
import CloverIcon from './icons/CloverIcon';

interface StatUpgradeProps {
  slime: Slime;
  onUpgradeStat: (stat: SlimeStat) => void;
  onLevelUp: () => void;
  onLearnAbility: (ability: Ability) => void;
  onUnlearnAbility: (ability: Ability) => void;
  onToggleEquipAbility: (ability: Ability) => void;
  expToNextLevel: number;
}

const StatUpgrade: React.FC<StatUpgradeProps> = ({ slime, onUpgradeStat, onLevelUp, onLearnAbility, onUnlearnAbility, onToggleEquipAbility, expToNextLevel }) => {
  const statInfo: { key: SlimeStat; icon: React.ReactNode }[] = [
    { key: 'HP', icon: <HeartIcon className="w-5 h-5 mr-2" /> },
    { key: 'ATK', icon: <SwordIcon className="w-5 h-5 mr-2" /> },
    { key: 'DEF', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
    { key: 'SPD', icon: <SpeedIcon className="w-5 h-5 mr-2" /> },
    { key: 'LUK', icon: <CloverIcon className="w-5 h-5 mr-2" /> },
  ];

  const readyToLevelUp = slime.exp >= expToNextLevel;
  
  const learnableAbilities = ABILITIES.filter(ability => 
    slime.level >= ability.levelReq && !slime.abilities.some(a => a.name === ability.name)
  );
  
  const atMaxEquipped = slime.equippedAbilities.length >= MAX_ABILITIES;

  const AbilityDetails: React.FC<{ability: Ability}> = ({ ability }) => (
      <>
        <h4 className="text-lg font-bold">{ability.name} <span className="text-sm font-normal text-gray-400">({ability.type})</span></h4>
        <p className="text-sm my-2">{ability.description}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs my-3 text-gray-300">
            {ability.chargeUpTurns > 0 && (
                <>
                    <span className="font-bold">Charge Time:</span>
                    <span>{ability.chargeUpTurns} turn(s)</span>
                </>
            )}
            {ability.cooldownTurns > 0 && (
                <>
                    <span className="font-bold">Cooldown:</span>
                    <span>{ability.cooldownTurns} turns</span>
                </>
            )}
            {ability.type === 'ATTACK' && (ability.baseDamage != null || ability.damageMultiplier != null) && (
                <>
                    <span className="font-bold">Damage:</span>
                    <span>
                        {[
                            ability.baseDamage ? ability.baseDamage.toString() : null,
                            ability.damageMultiplier ? `${ability.damageMultiplier}x ATK` : null
                        ].filter(Boolean).join(' + ')}
                    </span>
                </>
            )}
        </div>
      </>
  );

  return (
    <div className="space-y-6">
      {/* Level Up Section */}
      <div className="pixel-border p-4">
        <h3 className="text-2xl text-center mb-4 text-yellow-400 flicker">LEVEL UP</h3>
        <p className="text-center mb-4">Gain enough EXP to advance to the next level!</p>
        <p className="text-center text-lg mb-2">Current EXP: {slime.exp} / {expToNextLevel}</p>
        <button
          onClick={onLevelUp}
          disabled={!readyToLevelUp || slime.level >= MAX_LEVEL}
          className="pixel-border p-2 w-full bg-yellow-400 text-black disabled:opacity-50 disabled:bg-gray-700 disabled:text-green-400 transition-colors duration-200"
        >
          {slime.level >= MAX_LEVEL ? 'MAX LEVEL REACHED' : readyToLevelUp ? `LEVEL UP TO ${slime.level + 1}!` : 'NEED MORE EXP'}
        </button>
      </div>

      {/* Stat Upgrade Section */}
      <div className="pixel-border p-4">
        <h3 className="text-2xl text-center mb-4">STAT UPGRADES</h3>
        <p className="text-center mb-4">Spend Upgrade Tokens to improve your slime's stats!</p>
        <p className="text-center mb-4 text-xl text-blue-400">Available Tokens: {slime.upgradeTokens}</p>
        <div className="space-y-3">
          {statInfo.map(({ key, icon }) => {
            const cost = STAT_TOKEN_COST(slime.stats[key]);
            const canAfford = slime.upgradeTokens >= cost;
            const atMaxStat = key !== 'HP' && slime.stats[key] >= MAX_STAT_VALUE;
            return (
              <div key={key} className="grid grid-cols-3 items-center gap-2">
                <div className="flex items-center text-lg col-span-1">
                  {icon}
                  {key}: {slime.stats[key]}
                </div>
                <div className="text-center text-blue-400 col-span-1">
                  {atMaxStat ? 'MAX' : `Cost: ${cost} Tokens`}
                </div>
                <button
                  onClick={() => onUpgradeStat(key)}
                  disabled={!canAfford || atMaxStat}
                  className="pixel-border p-2 bg-black hover:bg-green-400 hover:text-black disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-green-400 transition-colors duration-200 col-span-1"
                >
                  {atMaxStat ? 'MAX' : '+1'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Manage Abilities Section */}
      {slime.abilities.length > 0 && (
        <div className="pixel-border p-4">
          <h3 className="text-2xl text-center mb-4">MANAGE ABILITIES ({slime.equippedAbilities.length}/{MAX_ABILITIES} EQUIPPED)</h3>
          <div className="space-y-4">
            {slime.abilities.map(ability => {
              const isEquipped = slime.equippedAbilities.some(a => a.name === ability.name);
              return (
                <div key={ability.name} className="pixel-border p-3">
                    <AbilityDetails ability={ability} />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                            onClick={() => onToggleEquipAbility(ability)}
                            disabled={!isEquipped && atMaxEquipped}
                            className={`pixel-border p-2 w-full flex items-center justify-center gap-2 transition-colors duration-200 ${
                                isEquipped
                                    ? 'bg-green-700 hover:bg-green-600'
                                    : 'bg-black hover:bg-green-400 hover:text-black disabled:opacity-50'
                            }`}
                        >
                            {isEquipped ? '✅ Equipped' : 'Equip for Battle'}
                        </button>
                        <button
                            onClick={() => onUnlearnAbility(ability)}
                            className="pixel-border p-2 w-full flex items-center justify-center gap-2 bg-black hover:bg-red-500 hover:text-black"
                        >
                            Unlearn
                        </button>
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Learn Abilities Section */}
      {learnableAbilities.length > 0 && (
          <div className="pixel-border p-4">
              <h3 className="text-2xl text-center mb-4">LEARN ABILITIES</h3>
              <p className="text-center mb-2">Spend Ability Points (AP) to learn new abilities!</p>
               <p className="text-center mb-4 text-xl text-purple-400">Available AP: {slime.ap}</p>
              <div className="space-y-4">
                  {learnableAbilities.map(ability => {
                      const canAfford = slime.ap >= ability.apCost;
                      return (
                        <div key={ability.name} className="pixel-border p-3">
                            <AbilityDetails ability={ability} />
                            <button
                                onClick={() => onLearnAbility(ability)}
                                disabled={!canAfford}
                                className="pixel-border p-2 w-full flex items-center justify-center gap-2 bg-black hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-green-400 transition-colors duration-200"
                            >
                                Learn (Cost: {ability.apCost} AP)
                            </button>
                        </div>
                      )
                  })}
              </div>
          </div>
      )}

    </div>
  );
};

export default StatUpgrade;