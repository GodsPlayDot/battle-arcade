import React, { useState, useMemo } from 'react';
import type { Slime, SlimeStats, SlimeStat, Ability } from '../types';
import { ABILITIES, BASE_SLIME_STATS } from '../constants';

import HeartIcon from './icons/HeartIcon';
import SwordIcon from './icons/SwordIcon';
import ShieldIcon from './icons/ShieldIcon';
import SpeedIcon from './icons/SpeedIcon';
import CloverIcon from './icons/CloverIcon';


interface BattleCalculatorProps {
  playerSlime: Slime;
}

const BattleCalculator: React.FC<BattleCalculatorProps> = ({ playerSlime }) => {
  const [attackerStats, setAttackerStats] = useState<SlimeStats>(playerSlime.stats);
  const [defenderStats, setDefenderStats] = useState<SlimeStats>({ ...BASE_SLIME_STATS });
  const [selectedAbilityId, setSelectedAbilityId] = useState<string>('basic');

  const handleStatChange = (team: 'attacker' | 'defender', stat: SlimeStat, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) return;

    const setter = team === 'attacker' ? setAttackerStats : setDefenderStats;
    setter(prev => ({ ...prev, [stat]: numValue }));
  };

  // Fix: Update calculation logic to match the dice-based system in BattleArena.tsx.
  const calculation = useMemo(() => {
    const ability = ABILITIES.find(a => a.name === selectedAbilityId);

    // Replicating the dice-based accuracy logic from BattleArena.tsx to calculate hit probability.
    const luckBonus = Math.floor(attackerStats.LUK / 5);
    const speedPenalty = Math.floor(defenderStats.SPD / 5);
    const targetScore = 4 + speedPenalty;

    // A roll of 1 always misses. A roll of 6 always hits. Check rolls 2, 3, 4, 5.
    const successfulMidRolls = [2, 3, 4, 5].filter(roll => (roll + luckBonus) >= targetScore).length;
    const hitChance = ((1 + successfulMidRolls) / 6) * 100;

    // Replicating crit chance from BattleArena.tsx
    const baseCritChance = 5;
    const attackerCritBonus = attackerStats.LUK * 0.5;
    const defenderCritReduction = defenderStats.LUK * 0.25;
    const abilityCritBonus = (ability?.name === 'Acid Burst' ? 15 : 0);
    const critChance = Math.max(0, baseCritChance + attackerCritBonus - defenderCritReduction + abilityCritBonus);

    let minDamage = 0;
    let maxDamage = 0;
    let avgDamage = 0;

    // This logic now correctly mirrors the BattleArena, assuming an average dice roll of 3.5 for defense.
    const avgDefenderRoll = 3.5;
    if (selectedAbilityId === 'basic') {
        const minBase = attackerStats.ATK + 1; // d6 roll min 1
        const maxBase = attackerStats.ATK + 6; // d6 roll max 6
        minDamage = Math.max(1, minBase - (defenderStats.DEF + 6));
        maxDamage = Math.max(1, maxBase - (defenderStats.DEF + 1));
        avgDamage = Math.max(1, (attackerStats.ATK + 3.5) - (defenderStats.DEF + avgDefenderRoll));
    } else if (ability && (ability.baseDamage != null || ability.damageMultiplier != null)) {
        const baseAttackPower = Math.round((ability.baseDamage || 0) + attackerStats.ATK * (ability.damageMultiplier || 1));
        const minAttackPower = baseAttackPower + 1;
        const maxAttackPower = baseAttackPower + 6;
        minDamage = Math.max(1, minAttackPower - (defenderStats.DEF + 6));
        maxDamage = Math.max(1, maxAttackPower - (defenderStats.DEF + 1));
        avgDamage = Math.max(1, (baseAttackPower + 3.5) - (defenderStats.DEF + avgDefenderRoll));
    }
    
    return { 
        hitChance: hitChance.toFixed(2), 
        critChance: critChance.toFixed(2), 
        minDamage: Math.round(minDamage), 
        maxDamage: Math.round(maxDamage),
        avgDamage: Math.round(avgDamage)
    };
  }, [attackerStats, defenderStats, selectedAbilityId]);
  
  const statInfo: { key: SlimeStat; icon: React.ReactNode }[] = [
    { key: 'HP', icon: <HeartIcon className="w-6 h-6 mr-2" /> },
    { key: 'ATK', icon: <SwordIcon className="w-6 h-6 mr-2" /> },
    { key: 'DEF', icon: <ShieldIcon className="w-6 h-6 mr-2" /> },
    { key: 'SPD', icon: <SpeedIcon className="w-6 h-6 mr-2" /> },
    { key: 'LUK', icon: <CloverIcon className="w-6 h-6 mr-2" /> },
  ];

  const StatInputGrid = ({ stats, team, handler }: { stats: SlimeStats, team: 'attacker' | 'defender', handler: (team: 'attacker' | 'defender', stat: SlimeStat, value: string) => void }) => (
    <div className={`pixel-border p-4 ${team === 'attacker' ? 'border-green-400' : 'border-red-500'}`}>
        <h3 className="text-2xl text-center mb-4">{team === 'attacker' ? 'Attacker' : 'Defender'}</h3>
        <div className="space-y-2">
            {statInfo.map(({ key, icon }) => (
                <div key={key} className="flex items-center">
                    {icon}
                    <label htmlFor={`${team}-${key}`} className="w-12">{key}:</label>
                    <input
                        type="number"
                        id={`${team}-${key}`}
                        value={stats[key]}
                        onChange={(e) => handler(team, key, e.target.value)}
                        className="pixel-border bg-black p-1 w-full text-center"
                        min="0"
                    />
                </div>
            ))}
        </div>
    </div>
  );

  return (
    <div className="pixel-border p-4">
      <h2 className="text-3xl text-center mb-4 flicker">BATTLE CALCULATOR</h2>
      <p className="text-center text-sm mb-6">Enter stats to see potential battle outcomes.</p>
      <div className="grid md:grid-cols-2 gap-6">
        <StatInputGrid stats={attackerStats} team="attacker" handler={handleStatChange} />
        <StatInputGrid stats={defenderStats} team="defender" handler={handleStatChange} />
      </div>
      <div className="mt-6">
        <label htmlFor="ability-select" className="block text-xl text-center mb-2">Select Action</label>
        <select
            id="ability-select"
            value={selectedAbilityId}
            onChange={(e) => setSelectedAbilityId(e.target.value)}
            className="pixel-border bg-black p-2 w-full text-center text-lg"
        >
            <option value="basic">Basic Attack</option>
            {playerSlime.abilities
                .filter(ability => ability.type === 'ATTACK')
                .map(ability => (
                <option key={ability.name} value={ability.name}>{ability.name}</option>
            ))}
        </select>
      </div>
      <div className="mt-6 pixel-border p-4 border-yellow-400">
        <h3 className="text-2xl text-center text-yellow-400 flicker mb-4">PREDICTED OUTCOME</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xl">
            <div>
                <p className="text-sm">Hit Chance</p>
                <p className="text-3xl">{calculation.hitChance}%</p>
            </div>
            <div>
                <p className="text-sm">Crit Chance</p>
                <p className="text-3xl">{calculation.critChance}%</p>
            </div>
            <div>
                <p className="text-sm">Avg. Damage</p>
                <p className="text-3xl">{calculation.avgDamage}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BattleCalculator;