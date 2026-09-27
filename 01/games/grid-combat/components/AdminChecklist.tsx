import React, { useState } from 'react';
import ChecklistIcon from './icons/ChecklistIcon';

const AdminChecklist: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const features = [
    { name: 'Create Admin Checklist', completed: true, description: 'Added this checklist to track requested features.' },
    { name: 'Truly Simultaneous Combat', completed: true, description: 'Combat resolution logic was reworked. Both players\' Primary moves now resolve, followed by both Follow-up moves, simulating simultaneous action.' },
    { name: 'Improve Skill Representation', completed: true, description: 'Visuals and mechanics for skills like Vanish, Summon Decoy, Summon Rift, Barbed Trap, etc., have been implemented or improved.' },
    { name: 'Balance Skill Costs', completed: true, description: 'Costs for most skills have been increased by 15-25% to make resource management more strategic.' },
    { name: 'Diversify Redundant Skills', completed: true, description: 'Replaced generic skills on some opponents with more unique abilities to create varied challenges.' },
    { name: 'Fix Vanish Skill', completed: true, description: 'Vanished players are now visually transparent and untargetable by single-target skills.' },
    { name: 'Create Projectiles & AOE Indicators', completed: true, description: 'Ranged attacks now have visible projectiles, and AOE skill ranges are highlighted on the grid.' },
    { name: 'Enhance AI Resource Intelligence', completed: true, description: 'Taught the AI to treat HP, MP, and Stamina as a combined resource pool, enabling it to use stamina-based skills when low on MP instead of idling vulnerably.' },
    { name: 'Improve Combat Log Clarity', completed: true, description: 'Buffs now show duration and potency in the UI, and the combat log is more descriptive.' },
    { name: 'Add Player 1 AI Toggle', completed: true, description: 'An admin toggle has been added to allow AI control over Player 1 for testing and simulation.' },
    { name: 'Enhance AI Reporting', completed: true, description: 'The Admin Report now includes an AI Battle Analysis section to monitor AI vs. AI combat.' },
    { name: 'Improve AI Aggression & Strategy', completed: true, description: 'The AI\'s decision-making has been overhauled to be more aggressive, goal-oriented, and capable of long-term planning and risk assessment.' },
    { name: 'Fix Pre-Battle Countdown', completed: true, description: 'The countdown animation and timing have been polished.' },
    { name: 'Add Proximity Damage Modifier', completed: true, description: 'Ranged skills now gain a damage bonus when used at maximum range, rewarding tactical positioning.' },
    { name: 'Battle Royale Entity Cleanup', completed: true, description: 'Decoys, summons, and other placed entities are now removed from the board when their caster is defeated in Battle Royale.' },
    { name: 'Skill Rebalance Pass 1 (Jab/Parry/Hamstring)', completed: true, description: 'Improved the "Jab" skill and reworked "Block" into "Parry". Replaced redundant skills like "Heroic Strike" with new ones like "Hamstring".' },
    { name: 'New Skills Integrated', completed: true, description: 'Added Ricochet, Phase Shift, and Silence to the game and distributed them among challengers to diversify their kits.' },
    { name: 'Strategy Book Expansion', completed: true, description: 'Added new sections to the Strategy Book with developer notes on potential skill ideas and system enhancements.' },
    { name: 'Challenger Generation & Integration', completed: true, description: 'The AI Combat book can now generate new challengers and add them to the campaign roster.' },
    { name: 'Standardize All Challengers', completed: true, description: 'All existing challengers have been updated to a 9-skill moveset standard.' },
    { name: 'Fix Campaign Progression & Crashes', completed: true, description: 'Fixed bugs preventing campaign progression and causing crashes on match start.' },
    { name: 'Implement Advanced Skill Mechanics', completed: true, description: 'Added logic for persistent tile effects, ultimate skills, and resource warfare as outlined in the Strategy Book.' },
    { name: 'Overhaul AI to Master Spec', completed: true, description: 'Replaced the simple AI with a sophisticated tactical engine that evaluates thousands of move combos and plays strategically.' },
  ];
  
  const CheckItem: React.FC<{ item: typeof features[0] }> = ({ item }) => (
    <li className="flex items-start space-x-3 bg-gray-900/50 p-3 rounded-lg">
       <div className="flex-shrink-0 pt-1">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.completed ? 'bg-green-500' : 'bg-gray-600'}`}>
          {item.completed && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
      </div>
       <div>
        <h4 className={`font-semibold ${item.completed ? 'text-green-300' : 'text-yellow-300'}`}>{item.name}</h4>
        <p className="text-sm text-gray-400">{item.description}</p>
      </div>
    </li>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 rounded-full bg-gray-700 hover:bg-yellow-600 transition-colors" aria-label="Show Admin Integration Checklist">
        <ChecklistIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="modal-enter-active bg-gray-800 border-2 border-yellow-400 rounded-lg p-6 max-w-2xl w-full text-left"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-yellow-300 mb-4">Admin Integration Checklist</h2>
            <div className="space-y-3 text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
                <ul className="space-y-2">
                    {features.sort((a,b) => {
                        if (a.completed && !b.completed) return 1;
                        if (!a.completed && b.completed) return -1;
                        return a.name.localeCompare(b.name);
                    }).map(item => <CheckItem key={item.name} item={item} />)}
                </ul>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors"
            >
              Close Checklist
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminChecklist;