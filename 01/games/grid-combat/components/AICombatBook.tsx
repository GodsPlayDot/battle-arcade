import React, { useState } from 'react';
import AdminIcon from './icons/AdminIcon';
import { AdminSettings, Player } from '../types';

interface AICombatBookProps {
  adminSettings: AdminSettings;
  onSettingsChange: (setting: keyof AdminSettings, value: boolean) => void;
  aiBattleReport: string[];
  onStartBattleRoyale: () => void;
  isBattleRoyaleMode?: boolean;
  onReturnToCampaign?: () => void;
  onGenerateChallenger: () => void;
  generatedChallenger: Player | null;
  onAddChallengerAndFight: () => void;
}

const AICombatBook: React.FC<AICombatBookProps> = ({ adminSettings, onSettingsChange, aiBattleReport, onStartBattleRoyale, isBattleRoyaleMode = false, onReturnToCampaign, onGenerateChallenger, generatedChallenger, onAddChallengerAndFight }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const Toggle: React.FC<{ label: string; description: string; enabled: boolean; onToggle: () => void; disabled?: boolean; }> = ({ label, description, enabled, onToggle, disabled = false }) => (
    <div className={`flex items-start space-x-3 bg-gray-900/50 p-3 rounded-lg ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex-shrink-0">
         <button
            onClick={onToggle}
            disabled={disabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-green-500 ${enabled ? 'bg-green-600' : 'bg-gray-600'} ${disabled ? 'cursor-not-allowed' : ''}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      <div>
        <h4 className={`font-semibold ${disabled ? 'text-gray-500' : 'text-white'}`}>{label}</h4>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );

  const handleStartRoyaleClick = () => {
    onStartBattleRoyale();
    setIsOpen(false);
  }
  
  const handleAddChallengerClick = () => {
    onAddChallengerAndFight();
    setIsOpen(false);
  }

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 rounded-full bg-gray-700 hover:bg-green-600 transition-colors" aria-label="Show AI Combat Book">
        <AdminIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="modal-enter-active bg-gray-800 border-2 border-green-400 rounded-lg p-6 max-w-2xl w-full text-left"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-green-300 mb-4">AI Combat Book</h2>
            <div className="space-y-4 text-gray-300 max-h-[70vh] overflow-y-auto pr-2">
              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Admin Controls</h3>
                <div className="space-y-2">
                    <Toggle 
                        label="Player 1 AI Control"
                        description="Enables AI control for Player 1. Useful for running AI vs. AI simulations to test balance and strategy."
                        enabled={adminSettings.player1IsAi}
                        onToggle={() => onSettingsChange('player1IsAi', !adminSettings.player1IsAi)}
                        disabled={isBattleRoyaleMode}
                    />
                    <Toggle 
                        label="Single Opponent Mode"
                        description="Focuses the game on a repeatable 1v1 match against Player 2, hiding other challengers and disabling the upgrade/campaign system."
                        enabled={adminSettings.singleOpponentMode}
                        onToggle={() => onSettingsChange('singleOpponentMode', !adminSettings.singleOpponentMode)}
                        disabled={isBattleRoyaleMode}
                    />
                    <Toggle 
                        label="Hide Unowned Skills"
                        description="Filters the Skill Testing panel in the Strategy Book to only show skills that Player 1 currently possesses."
                        enabled={adminSettings.hideUnownedSkills}
                        onToggle={() => onSettingsChange('hideUnownedSkills', !adminSettings.hideUnownedSkills)}
                    />
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Game Modes</h3>
                 {isBattleRoyaleMode ? (
                    <button
                        onClick={() => { onReturnToCampaign?.(); setIsOpen(false); }}
                        className="w-full p-3 rounded-lg bg-blue-800 hover:bg-blue-700 transition-colors text-left"
                    >
                        <h4 className="font-semibold text-white">Return to Campaign</h4>
                        <p className="text-sm text-gray-400">Exit the Battle Royale and return to the main game.</p>
                    </button>
                 ) : (
                    <button
                        onClick={handleStartRoyaleClick}
                        className="w-full p-3 rounded-lg bg-red-800 hover:bg-red-700 transition-colors text-left"
                    >
                        <h4 className="font-semibold text-white">Start Battle Royale</h4>
                        <p className="text-sm text-gray-400">Immediately begin a free-for-all battle with all challengers.</p>
                    </button>
                 )}
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">Challenger Factory</h3>
                <div className="space-y-2">
                    <button
                        onClick={onGenerateChallenger}
                        disabled={isBattleRoyaleMode}
                        className="w-full p-3 rounded-lg bg-purple-800 hover:bg-purple-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <h4 className="font-semibold text-white">Generate New Challenger</h4>
                        <p className="text-sm text-gray-400">Dynamically generate a new AI opponent with a unique skill set.</p>
                    </button>
                    {generatedChallenger && !isBattleRoyaleMode && (
                        <div className="bg-gray-900/50 p-3 rounded-lg">
                            <h4 className="font-semibold text-purple-300">New Challenger: <span className="text-white">{generatedChallenger.name}</span></h4>
                            <p className="text-xs text-gray-400">A new opponent has been generated. Add them to the campaign roster to fight them next.</p>
                             <button
                                onClick={handleAddChallengerClick}
                                className="w-full mt-2 p-2 rounded-lg bg-green-700 hover:bg-green-600 transition-colors text-white font-bold"
                            >
                                Add to Roster & Fight Next
                            </button>
                        </div>
                    )}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-white mb-2">AI Player Intelligence Report</h3>
                <p className="mb-2"><strong className="text-yellow-400">Thought Process (State Evaluation):</strong> The AI simulates thousands of potential outcomes each turn. Its decision-making is guided by these core principles:</p>
                <ul className="list-disc list-inside space-y-2 pl-2">
                    <li><strong>Unified Resource Management:</strong> The AI now treats HP, MP, and Stamina as a single "action potential." It will intelligently use stamina-based skills to reposition or attack when low on mana, instead of idling vulnerably.</li>
                    <li><strong>Threat-Aware Positioning:</strong> It constantly evaluates a "threat heatmap" of the board, allowing it to move with intent—either to find safe tiles when weak or to corner a vulnerable opponent.</li>
                    <li><strong>Synergistic Combo Planning:</strong> The AI no longer picks moves independently. It simulates thousands of combinations to find the best Primary and Follow-up move pair that achieves a strategic goal, such as moving into optimal range for a powerful follow-up attack.</li>
                    <li><strong>Deathmatch Mentality:</strong> It is programmed to win. It will take calculated risks, trade resources, and aggressively pursue an opponent it assesses is in "kill range."</li>
                    <li><strong>Calculated Unpredictability:</strong> To prevent it from becoming predictable, a small amount of randomness has been injected into its decision-making, helping it choose between several equally good options to keep you on your toes.</li>
                </ul>
              </section>
              
              <section>
                 <h3 className="text-lg font-semibold text-white mb-2">AI vs AI Battle Analysis (Persistent Log)</h3>
                 <p className="mb-2 text-xs text-green-300">After every AI-vs-AI match, the winner reinforces its chosen archetype and skills while the loser reduces confidence in its failed plan. These weights persist through rematches and reloads.</p>
                 <div className="bg-gray-900/50 p-3 rounded-lg max-h-48 overflow-y-auto">
                    {aiBattleReport.length > 0 ? aiBattleReport.map((log, i) => (
                        <p key={i} className="text-xs font-mono" dangerouslySetInnerHTML={{__html: log}} />
                    )) : (
                        <p className="text-sm text-gray-500">No AI vs AI battle has occurred yet. Enable AI for both players to generate a report.</p>
                    )}
                 </div>
              </section>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="mt-6 w-full py-2 bg-green-500 text-gray-900 font-bold rounded hover:bg-green-400 transition-colors"
            >
              Close Book
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AICombatBook;
