import React from 'react';

// This data is based on the new "Dungeon Puzzle Roguelike" premise.
const settingsData = {
  systemInstruction: "You are one of three AI Dungeon Masters (The Architect, The Warden, The Trickster) ruling a living dungeon. You are bound by the game's rules: every trap is solvable without damage, failure teaches the player, and difficulty escalates through complexity, not just speed. Your goal is to create challenging, fair, and engaging puzzle-traps that adapt to the player's successes and failures, competing with the other AIs for cleverness. Always include a brief solvable-proof and player counterplay. Avoid unsolvable overlaps.",
  prompts: [
    {
      id: 'architect_trap_gen',
      name: 'Architect: Generate Trap',
      purpose: 'To generate a new logic-based puzzle for The Architect AI.',
      prompt: `You are The Architect, a logic & structure AI Dungeon Master. Your focus is on pattern puzzles, switches, timing, and spatial logic. Generate a new puzzle-trap room.

Player Stats/Abilities for context:
- Health: 3/3
- Abilities: Wall Peek (briefly see trap logic)
- Player last failed on: A timing-based crusher puzzle.

Constraints:
- De-emphasize pure timing; prioritize observation and inference.
- Must include a clear, discoverable visual tell.
- Must not repeat these motifs: rotating-gear switches, floor-tile counting, mirrored levers.
- Include 1 new motif (name it).

Describe the room layout, trap mechanism, visual tell, and the correct sequence/solution.
Include a short solvable-proof (1–2 sentences) and a failure-teaches moment.

Return ONLY a JSON object with the keys: "roomName", "layoutDescription", "trapMechanism", "playerTell", "solution", "motif", "solvableProof", "failureLesson".`
    },
    {
      id: 'warden_escalation',
      name: 'Warden: Escalate Hazard',
      purpose: 'To escalate a pressure-based hazard after the player succeeds.',
      prompt: `You are The Warden, a pressure & risk AI Dungeon Master. Your focus is on hazards like spikes, lasers, rising floors, and enemies. The player just successfully navigated a room with a simple dart trap that fired in a fixed pattern.

Escalate this concept for the next room. Combine it with another hazard or increase its complexity, but ensure there is at least one safe path with a recovery window of 2+ seconds between hazards.

Describe the new, more intense hazard room. Include a short solvable-proof and the player's counterplay.

Return ONLY a JSON object with the keys: "roomName", "escalationDescription", "combinedHazards", "playerCounterplay", "solvableProof", "safeWindowSeconds".`
    },
    {
      id: 'trickster_deception',
      name: 'Trickster: Generate Deception',
      purpose: 'To generate a deceptive trap based on misdirection.',
      prompt: `You are The Trickster, a deception & chaos AI Dungeon Master. You specialize in illusions, fake walls, reversed controls, and subverting player expectations. The player has been successfully using their "Wall Peek" ability to solve secrets.

Generate a deceptive trap that counters overuse of "Wall Peek" without making it useless. The deception must have a non-ability tell (e.g., sound, dust, lighting, rhythm). Describe the setup, the lie the player is meant to believe (especially what they'd see with Wall Peek), and the hidden truth/trap they would fall into.

Include a fair counterplay and a solvable-proof.

Return ONLY a JSON object with the keys: "trapName", "theSetup", "theLie", "theTruth", "nonAbilityTell", "playerCounterplay", "solvableProof".`
    },
  ],
  gameMechanics: `Core Loop: Enter dungeon → solve puzzle-traps → survive escalation → descend → dungeon learns → repeat.

The dungeon is controlled by three competing AIs:
1. The Architect (Logic & Structure): Creates pattern puzzles, switch logic, and spatial challenges.
2. The Warden (Pressure & Risk): Uses environmental hazards, enemies, and time pressure.
3. The Trickster (Deception & Chaos): Employs illusions, misdirection, and rule changes.

Key Rules:
- Every trap is solvable without taking damage.
- Failure is a learning tool; the dungeon adapts to how you fail.
- No invisible instant deaths.
- Difficulty escalates by complexity, not just raw speed.`,
  knownIssues: `1. Warden Hazard Overlap: In rare cases, The Warden's escalation logic can combine two hazards (e.g., rising lava and moving platforms) in a way that creates an unsolvable timing sequence. [Priority: High]
2. Trickster Texture Flicker: The textures for The Trickster's illusionary walls occasionally flicker when certain player abilities are used nearby, revealing the secret prematurely. [Priority: Medium]
3. Architect Pattern Repetition: After long runs (>20 floors), The Architect's pattern-generation algorithm can begin to repeat puzzle structures, reducing variety. Needs a larger seed pool for randomization. [Priority: Low]`
};

const Settings: React.FC = () => {

  const handleExport = () => {
    const jsonString = JSON.stringify(settingsData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dungeon_ai_settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PromptCard: React.FC<{ name: string, purpose: string, prompt: string }> = ({ name, purpose, prompt }) => (
    <div className="pixel-border p-3 mb-4 bg-black/30">
        <h4 className="text-lg text-green-300">{name}</h4>
        <p className="text-xs italic text-gray-400 mb-2">{purpose}</p>
        <textarea
            readOnly
            className="w-full h-40 bg-gray-900/50 p-2 text-sm font-mono border-2 border-gray-700"
            value={prompt}
        />
    </div>
  );

  return (
    <div className="pixel-border p-4 space-y-6">
      <div>
        <h3 className="text-2xl text-center mb-4 text-yellow-400 flicker">AI Settings & Game Data</h3>
        <p className="text-center text-sm mb-6">
          This screen contains the core configurations for the AI Dungeon Masters, game mechanics, and allows for exporting all data.
        </p>
      </div>

      {/* System Instruction Section */}
      <div className="pixel-border p-4">
        <h3 className="text-xl text-center mb-2">AI Dungeon Master: System Instruction</h3>
        <textarea
            readOnly
            className="w-full h-28 bg-gray-900/50 p-2 text-sm font-mono border-2 border-gray-700"
            value={settingsData.systemInstruction}
        />
      </div>
      
      {/* Prompts Collection */}
      <div className="pixel-border p-4">
        <h3 className="text-xl text-center mb-4">Gemini API Prompts</h3>
        {/* Fix: Pass props explicitly to PromptCard to match its type definition and avoid passing the extra 'id' prop. */}
        {settingsData.prompts.map(p => <PromptCard key={p.id} name={p.name} purpose={p.purpose} prompt={p.prompt} />)}
      </div>

      {/* Game Mechanics & Issues */}
      <div className="pixel-border p-4">
        <h3 className="text-xl text-center mb-2">Game Mechanics & Known Issues</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h4 className="text-lg text-green-300 mb-1">Core Mechanics</h4>
                <textarea
                    readOnly
                    className="w-full h-56 bg-gray-900/50 p-2 text-sm font-mono border-2 border-gray-700"
                    value={settingsData.gameMechanics}
                />
            </div>
            <div>
                <h4 className="text-lg text-red-400 mb-1">Known Issues</h4>
                 <textarea
                    readOnly
                    className="w-full h-56 bg-gray-900/50 p-2 text-sm font-mono border-2 border-gray-700"
                    value={settingsData.knownIssues}
                />
            </div>
        </div>
      </div>
      
      {/* Export Button */}
      <div className="text-center">
        <button 
          onClick={handleExport}
          className="pixel-border p-4 w-full max-w-sm text-xl hover:bg-blue-500 hover:text-black transition-colors duration-200"
        >
          Export All as JSON
        </button>
      </div>
    </div>
  );
};

export default Settings;
