import React, { useState, useMemo } from 'react';
import { Player, Skill, PlayerStats, SkillType } from '../types';
import { ALL_GAME_SKILLS, STAY_SKILL } from '../constants';

interface UpgradeScreenProps {
  player: Player;
  onConfirm: (statIncreases: Partial<PlayerStats>, skillToRemoveId: string | null, skillToAdd: Skill | null) => void;
}

const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ player, onConfirm }) => {
  const [skillToRemove, setSkillToRemove] = useState<Skill | null>(null);
  const [skillToAdd, setSkillToAdd] = useState<Skill | null>(null);
  const [statPoints, setStatPoints] = useState(2);
  const [statIncreases, setStatIncreases] = useState<Partial<PlayerStats>>({});
  const [stage, setStage] = useState<'stats' | 'skills'>('stats');
  const [activeTab, setActiveTab] = useState('Close');


  const availableSkills = useMemo(() => {
    const playerSkillIds = new Set(player.skills.map(s => s.id));
    return ALL_GAME_SKILLS.filter(s => !playerSkillIds.has(s.id) && s.id !== STAY_SKILL.id);
  }, [player.skills]);

  const categorizedSkills = useMemo(() => {
    return {
        'Close': availableSkills.filter(s => s.range <= 2 && s.type !== SkillType.MOVE && s.type !== SkillType.BUFF),
        'Mid': availableSkills.filter(s => s.range > 2 && s.range <= 4 && s.type !== SkillType.MOVE && s.type !== SkillType.BUFF),
        'Long': availableSkills.filter(s => s.range > 4 && s.type !== SkillType.MOVE && s.type !== SkillType.BUFF),
        'AOE': availableSkills.filter(s => s.aoe && s.aoe > 0),
        'Buff': availableSkills.filter(s => s.type === SkillType.BUFF),
        'Special': availableSkills.filter(s => s.type === SkillType.SPECIAL)
    }
  }, [availableSkills]);
  
  const handleStatChange = (stat: keyof PlayerStats, amount: number) => {
    const currentIncrease = statIncreases[stat] || 0;
    if (amount > 0 && statPoints > 0) {
      setStatIncreases(prev => ({ ...prev, [stat]: currentIncrease + 1 }));
      setStatPoints(prev => prev - 1);
    } else if (amount < 0 && currentIncrease > 0) {
      setStatIncreases(prev => ({ ...prev, [stat]: currentIncrease - 1 }));
      setStatPoints(prev => prev + 1);
    }
  }

  const handleConfirm = () => {
    onConfirm(statIncreases, skillToRemove?.id || null, skillToAdd);
  };

  const StatButton: React.FC<{ stat: keyof PlayerStats }> = ({ stat }) => (
     <div className="bg-gray-700 p-2 rounded flex items-center justify-between">
      <span className="font-bold uppercase">{stat}:</span>
      <span>{player.stats[stat]} {statIncreases[stat] ? <span className="text-green-400 font-bold">+{statIncreases[stat]}</span> : ''}</span>
      <div className="flex items-center space-x-1">
        <button onClick={() => handleStatChange(stat, -1)} disabled={(statIncreases[stat] || 0) === 0} className="w-6 h-6 rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-600">-</button>
        <button onClick={() => handleStatChange(stat, 1)} disabled={statPoints === 0} className="w-6 h-6 rounded bg-green-600 hover:bg-green-500 disabled:bg-gray-600">+</button>
      </div>
    </div>
  );

  const SkillButton: React.FC<{ skill: Skill; onClick: () => void; isSelected: boolean }> = ({ skill, onClick, isSelected }) => (
     <button
        onClick={onClick}
        className={`p-2 rounded text-left w-full transition-all duration-200 ${isSelected ? 'bg-yellow-500 text-black ring-2 ring-white' : 'bg-gray-700 hover:bg-cyan-700'}`}
    >
        <div className="flex items-center space-x-2">
            <skill.icon className="w-5 h-5 flex-shrink-0" />
            <div>
                <p className="font-semibold">{skill.name}</p>
                <p className="text-xs opacity-80">{skill.cost} {skill.costType}</p>
            </div>
        </div>
    </button>
  );

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 border-2 border-yellow-400 p-6 rounded-lg shadow-lg text-center w-full max-w-4xl max-h-[90vh] flex flex-col">
        <h2 className="text-3xl font-bold text-yellow-300">Victory Upgrade</h2>
        <p className="text-gray-400 mt-2 mb-4">{stage === 'stats' ? 'You were victorious! Spend your 2 stat points to grow stronger.' : 'Optionally, you may now swap one of your skills.'}</p>
        
        {stage === 'stats' && (
            <div className="flex-grow p-4 bg-gray-900/50 rounded-lg">
                <h3 className="text-xl font-bold text-cyan-400 mb-3 text-center">Allocate Stat Points ({statPoints} remaining)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <StatButton stat="strength" />
                    <StatButton stat="defense" />
                    <StatButton stat="speed" />
                    <StatButton stat="intelligence" />
                    <StatButton stat="endurance" />
                    <StatButton stat="luck" />
                    <StatButton stat="dexterity" />
                </div>
            </div>
        )}

        {stage === 'skills' && (
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2">
                <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col">
                    <h3 className="text-xl font-bold text-cyan-400 mb-3 text-center">Choose a Skill to Replace</h3>
                    <div className="space-y-2 overflow-y-auto pr-2 flex-grow min-h-64">
                    {player.skills.filter(s => s.id !== 's0').map(skill => (
                        <SkillButton key={skill.id} skill={skill} onClick={() => setSkillToRemove(skill)} isSelected={skillToRemove?.id === skill.id} />
                    ))}
                    </div>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col">
                    <h3 className="text-xl font-bold text-cyan-400 mb-3 text-center">Choose a New Skill</h3>
                     <div className="flex items-center justify-center border-b border-gray-600 mb-2">
                         {Object.keys(categorizedSkills).map(tab => (
                             <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 text-sm font-semibold transition-colors ${activeTab === tab ? 'border-b-2 border-yellow-400 text-yellow-300' : 'text-gray-400 hover:text-white'}`}>
                                 {tab} ({categorizedSkills[tab as keyof typeof categorizedSkills].length})
                             </button>
                         ))}
                     </div>
                    <div className="space-y-2 overflow-y-auto pr-2 flex-grow min-h-64">
                        {categorizedSkills[activeTab as keyof typeof categorizedSkills].length > 0 ? (
                            categorizedSkills[activeTab as keyof typeof categorizedSkills].map(skill => (
                                <SkillButton key={skill.id} skill={skill} onClick={() => setSkillToAdd(skill)} isSelected={skillToAdd?.id === skill.id} />
                            ))
                        ) : (
                            <p className="text-gray-500 text-center pt-10">No skills in this category.</p>
                        )}
                    </div>
                    <div className="mt-2 p-2 bg-gray-800 rounded-md flex-grow-0 min-h-24">
                        {skillToAdd ? ( <> <h5 className="font-bold text-yellow-400">{skillToAdd.name}</h5> <p className="text-sm text-gray-300 mt-1">{skillToAdd.description}</p> </>
                        ) : ( <p className="text-gray-500 text-center flex items-center justify-center h-full">Select a skill to see its description.</p> )}
                    </div>
                </div>
            </div>
        )}
        
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {stage === 'stats' ? (
                <button onClick={() => setStage('skills')} disabled={statPoints > 0} className="w-full py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed">
                    {statPoints > 0 ? `Allocate ${statPoints} more point(s)` : 'Continue to Skill Swap'}
                </button>
            ) : (
                <>
                <button onClick={handleConfirm} className="w-full sm:w-2/3 py-3 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors">
                    Confirm & Continue
                </button>
                 <button onClick={() => { setSkillToRemove(null); setSkillToAdd(null); }} className="w-full sm:w-1/3 py-3 bg-gray-600 text-white font-bold rounded hover:bg-gray-500 transition-colors">
                    Clear Skill Selection
                </button>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default UpgradeScreen;
