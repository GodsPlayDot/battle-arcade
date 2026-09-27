import React, { useState } from 'react';
import BookIcon from './icons/BookIcon';
import SkillTestingPanel from './SkillTestingPanel';
import { Skill } from '../types';

interface StrategyBookProps {
  skillsForTesting: Skill[];
}

const StrategyBook: React.FC<StrategyBookProps> = ({ skillsForTesting }) => {
  const [isOpen, setIsOpen] = useState(false);

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
      <h3 className="text-xl font-bold text-yellow-300 mb-2 border-b-2 border-yellow-300/50 pb-1">{title}</h3>
      <div className="space-y-3 text-gray-300">{children}</div>
    </div>
  );

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 rounded-full bg-gray-700 hover:bg-blue-600 transition-colors" aria-label="Show strategy book">
        <BookIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="modal-enter-active bg-gray-800 border-2 border-yellow-400 rounded-lg p-6 max-w-4xl w-full text-left flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-3xl font-bold text-yellow-300 mb-4 text-center">Strategy Book</h2>
            <div className="overflow-y-auto pr-4 space-y-6">
              
              <Section title="The Objective">
                <p>The primary goal is straightforward: reduce your opponent's HP to zero to win the match. In the campaign mode, you must defeat a series of increasingly difficult challengers to be declared the ultimate champion.</p>
              </Section>
              
              <Section title="Battles, Turns, and Actions">
                 <p>The game uses a unique simultaneous turn-based system. This isn't a simple "I go, you go" system. Here's how a turn unfolds:</p>
                 <ul className="list-disc list-inside ml-4 space-y-2">
                    <li><strong className="text-white">Selection Phase:</strong> Both you and your opponent plan your actions at the same time. Each player must select two distinct actions for the turn: a <span className="text-cyan-400">Primary Move</span> and a <span className="text-cyan-400">Follow-up Move</span>.</li>
                    <li><strong className="text-white">Confirm Moves:</strong> Once you've chosen a skill and a valid target for both your Primary and Follow-up slots, you lock in your choices by clicking the "Confirm Moves" button.</li>
                    <li><strong className="text-white">Resolution Phase:</strong> After both players have confirmed their moves, the action begins. Combat resolves in two distinct phases:
                        <ul className="list-inside list-[circle] ml-6 mt-1">
                            <li><strong className="text-yellow-300">Primary Phase:</strong> Both players' Primary moves execute and resolve simultaneously.</li>
                            <li><strong className="text-yellow-300">Follow-up Phase:</strong> After the Primary moves are complete, both players' Follow-up moves execute and resolve simultaneously.</li>
                        </ul>
                    </li>
                 </ul>
                 <p>This system emphasizes prediction and strategy. You have to anticipate where your opponent will be after their primary move, not just where they are now.</p>
              </Section>

              <Section title="Resources: The Engine of Combat">
                 <p>Every action is fueled by one of three resources. Managing them is critical.</p>
                 <ul className="list-disc list-inside ml-4 space-y-2">
                    <li><strong className="text-white">HP (Health Points):</strong> Your life force. If this hits 0, you lose the match.</li>
                    <li><strong className="text-white">MP (Mana Points):</strong> Used to cast magical skills, which often have powerful effects or long range (e.g., Fireball).</li>
                    <li><strong className="text-white">Stamina:</strong> Used for physical actions like swinging a sword (Slash) or moving across the battlefield (Dash). Stamina management is key for mobility and physical offense. You regain a small amount of Stamina at the end of a turn if you didn't use a MOVE skill, rewarding strategic positioning.</li>
                 </ul>
              </Section>
              
              <Section title="Skills & Stats">
                 <div>
                    <h4 className="text-lg font-semibold text-cyan-400">Stats</h4>
                    <p className="mb-2">Each character has 7 core stats that influence their performance:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong className="text-white">Strength (STR):</strong> Increases the damage of physical (Stamina-costing) attacks.</li>
                        <li><strong className="text-white">Intelligence (INT):</strong> Increases the damage of magical (MP-costing) skills and also increases your maximum MP.</li>
                        <li><strong className="text-white">Endurance (END):</strong> Increases your maximum HP and maximum Stamina, making you more durable and capable of more physical actions.</li>
                        <li><strong className="text-white">Defense (DEF):</strong> Reduces the amount of damage you take from all attacks.</li>
                        <li><strong className="text-white">Speed (SPD):</strong> Primarily used as a tie-breaker. If two players try to move to the same tile, the one with higher Speed gets there first.</li>
                        <li><strong className="text-white">Dexterity (DEX):</strong> Influences movement and accuracy (currently affects some skill interactions).</li>
                        <li><strong className="text-white">Luck (LCK):</strong> A background stat that will influence future mechanics like critical hits and evasion.</li>
                    </ul>
                 </div>
                 <div>
                    <h4 className="text-lg font-semibold text-cyan-400 mt-3">Skills</h4>
                    <p className="mb-2">Skills are your actions in combat, categorized by type and range.</p>
                     <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong className="text-white">Types:</strong> Move, Attack, Buff, Debuff, Special.</li>
                        <li><strong className="text-white">Range (Close, Mid, Long):</strong> A skill's range determines how far away you can use it. The grid highlights valid targets when you select a skill.
                          <ul className="list-inside list-[circle] ml-6 mt-1">
                            <li><strong className="text-yellow-300">Close Range (1-2 tiles):</strong> Melee attacks like Slash or short-range abilities.</li>
                            <li><strong className="text-yellow-300">Mid Range (3-4 tiles):</strong> Versatile skills that can be used from a moderate distance.</li>
                            <li><strong className="text-yellow-300">Long Range (5+ tiles):</strong> Powerful spells or shots like Fireball and Longshot, allowing you to attack from safety.</li>
                          </ul>
                        </li>
                    </ul>
                 </div>
              </Section>

              <Section title="Core Combat Mechanics">
                  <p>This is where the real strategy comes into play.</p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                      <li><strong className="text-white">Damage Calculation:</strong> The final damage of an attack is a formula based on the skill's base power, the attacker's relevant stat (STR or INT), and the target's Defense stat. Status effects like Focus (damage buff) or Vulnerable (damage debuff) can dramatically alter the outcome.</li>
                      <li><strong className="text-white">Proximity Modifier:</strong> Positioning matters. Ranged attacks are rewarded for being used at their maximum effective range with a 20% damage bonus. Conversely, using them on an adjacent enemy incurs a 30% damage penalty. This encourages smart movement and discourages simply standing and shooting.</li>
                      <li><strong className="text-white">Line of Sight (LoS):</strong> You can't shoot through other units or obstacles. Most ranged attacks require a clear, straight line to the target, which is highlighted on the grid.</li>
                      <li><strong className="text-white">Status Effects:</strong> Skills can apply buffs (positive) or debuffs (negative) that last for a certain number of turns. Examples include: Vanish, Frozen, Focus, and Aegis Shield.</li>
                  </ul>
              </Section>
              
              <Section title="Advanced Strategy: The Simultaneous Turn System">
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">Extending Your Range with Primary and Follow-up Moves</h4>
                    <p>The key concept is that your Follow-up Move originates from where your Primary Move ends.</p>
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li><strong className="text-white">Standard Case:</strong> If your Primary move is an attack or a buff that doesn't move your character (like Slash or Focus), both your Primary and Follow-up moves will be calculated from your starting position for the turn.</li>
                      <li><strong className="text-white">The Extension Mechanic:</strong> If your Primary Move is a skill of type <span className="text-green-400">Move</span> (like Dash or Walk), the game considers your new position to be the tile you moved to. Consequently, your Follow-up Move will be launched from that new tile.</li>
                    </ul>
                     <p className="mt-2 p-2 bg-gray-900/50 rounded-md text-sm"><strong className="text-yellow-300">Example:</strong> You are at tile (1, 5). The opponent is far away at (8, 5). Your Fireball skill only has a range of 5, so you can't hit them. You select Dash (range 4) as your Primary Move and target tile (5, 5). You then select Fireball as your Follow-up Move. The game now calculates the range for this Fireball from your new, temporary position at (5, 5). From (5, 5), the opponent at (8, 5) is only 3 tiles away, which is well within Fireball's range. You can now target them successfully.</p>
                  </div>
                   <div className="mt-4">
                    <h4 className="text-lg font-semibold text-cyan-400">Predictive Targeting (Targeting Tiles, Not Players)</h4>
                    <p>The combat system is simultaneous. Both players lock in their moves, and then the game resolves them in two phases (Primary, then Follow-up). Because of this, you are not targeting the opponent; you are targeting a specific grid tile. If you anticipate your opponent will move to an empty tile, you can target that empty tile with your Follow-up move. If you're right, you'll hit them as they arrive. If you're wrong, your attack hits an empty square and misses entirely.</p>
                  </div>
              </Section>

              <Section title="Winning and Progression">
                 <div>
                    <h4 className="text-lg font-semibold text-cyan-400">After a Defeat (Your HP drops to 0)</h4>
                     <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong className="text-white">Extra Life Check:</strong> The game first checks if you have any "Extra Lives." You gain an Extra Life every time you defeat a challenger. If you have an Extra Life, you automatically consume one. Your character is revived on the spot with 50% of their maximum HP, and the battle continues immediately.</li>
                        <li><strong className="text-white">No Extra Lives:</strong> The game is over. The "Game Over" screen appears, declaring your opponent the victor. You'll then have the option to "Play Again," which restarts the entire campaign from the first opponent.</li>
                    </ul>
                 </div>
                 <div className="mt-3">
                    <h4 className="text-lg font-semibold text-cyan-400">After a Victory (The Challenger's HP drops to 0)</h4>
                     <p>Winning a battle is a multi-step process that prepares you for the next, more difficult fight.</p>
                     <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                        <li><strong className="text-white">Gain an Extra Life:</strong> For every challenger you defeat, you are rewarded with one Extra Life. This acts as a safety net for future, tougher battles.</li>
                        <li><strong className="text-white">Enter the Upgrade Phase:</strong> You are taken to a special "Upgrade Screen" where you get to permanently improve your character:
                            <ul className="list-inside list-[circle] ml-6 mt-1 space-y-1">
                                <li><strong className="text-yellow-300">Stat Allocation:</strong> You are awarded 2 stat points to distribute among your core stats as you see fit.</li>
                                <li><strong className="text-yellow-300">Skill Swap (Optional):</strong> You are given the opportunity to learn a new skill. You must choose one of your current skills to "forget," and then you can select a new one from a large pool of available skills.</li>
                            </ul>
                        </li>
                        <li><strong className="text-white">Advance to the Next Challenger:</strong> Once you confirm your upgrades, your character's resources are fully restored, cooldowns are reset, and the next battle begins.</li>
                    </ul>
                     <p className="mt-2 text-sm text-gray-400">This cycle repeats: Battle {"->"} Win {"->"} Upgrade {"->"} Next Battle, until you either run out of extra lives and are defeated, or you successfully overcome every single challenger to win the game. At the end of the last challenger, the Challenger Factory will be available to generate new opponents.</p>
                 </div>
              </Section>
              
              <Section title="Skill Testing">
                <p className="text-gray-400">Select any skill below to see its range, cost, and effects on the testing grid. Plan your strategies before you enter the fray!</p>
                <SkillTestingPanel skillsToShow={skillsForTesting} />
              </Section>

              <Section title="Skill Evaluation & Concepts (Developer Notes)">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">New Skill Ideas</h4>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                        <li><strong className="text-white">Ricochet Shot (Attack):</strong> A ranged attack that, if it hits a target adjacent to an obstacle, bounces to hit another random enemy within a short range.</li>
                        <li><strong className="text-white">Phase Shift (Move):</strong> A move skill that allows the user to pass through one enemy or obstacle.</li>
                        <li><strong className="text-white">Silence (Debuff):</strong> A status effect that prevents the target from using skills that cost MP for 2 turns.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">Skills to Improve</h4>
                     <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                        <li><strong className="text-white">Jab:</strong> If the target has a buff, Jab removes it and deals +50% damage.</li>
                        <li><strong className="text-white">Parry:</strong> Replaces Block. If the user is attacked this turn, they take 75% reduced damage and their next melee attack costs 0 Stamina.</li>
                    </ul>
                  </div>
                   <div>
                    <h4 className="text-lg font-semibold text-cyan-400">Skills to Remove</h4>
                     <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                        <li><strong className="text-white">Slash vs. Heroic Strike:</strong> Replaced one with "Hamstring" that slows the target.</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">Special Skill Concepts</h4>
                     <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-sm">
                        <li><strong className="text-white">Last Stand (Ultimate):</strong> Can only be used when below 25% HP. For 2 turns, the user cannot die (HP won't drop below 1) and all their skills have 0 cost. The user dies at the end of the effect.</li>
                        <li><strong className="text-white">Gravity Well (Ultimate):</strong> Creates a 3x3 area on the grid for 2 turns. Any unit that enters or starts its turn in the area is pulled to the center tile and Immobilized for 1 turn.</li>
                    </ul>
                  </div>
                </div>
              </Section>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full flex-shrink-0 py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors"
            >
              Back to Battle!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StrategyBook;
