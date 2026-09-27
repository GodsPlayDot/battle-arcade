import React from 'react';

interface HelpProps {
  onClose: () => void;
}

const Help: React.FC<HelpProps> = ({ onClose }) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 text-neutral-200 rounded-2xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative border border-neutral-700">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors text-2xl"
          aria-label="Close help"
        >
          &times;
        </button>
        <h1 className="font-bold text-4xl mb-4 text-center text-white">Spinning Top Arena - Help</h1>
        
        <div className="flex justify-center mb-8">
          <div className="bg-neutral-800 p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setShowAdvanced(false)}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${!showAdvanced ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-neutral-400 hover:text-white'}`}
            >
              Basic Rules
            </button>
            <button 
              onClick={() => setShowAdvanced(true)}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${showAdvanced ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-neutral-400 hover:text-white'}`}
            >
              Advanced Mechanics
            </button>
          </div>
        </div>

        {!showAdvanced ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Section title="Core Match Setup">
              <DetailItem label="Match Type" value="1 Player vs 1 Intelligent Enemy" />
              <DetailItem label="Stability (DEF)" value="Absorbs 70% of damage before HP is hit" />
              <DetailItem label="Arena Size" value="40 x 40 grid tiles" />
              <DetailItem label="Top Physical Size" value="Player Radius: 1 tile, Enemy Radius: 1 tile" />
            </Section>

            <Section title="The Six Combat Styles">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">1. Physics Momentum</h4>
                  <p className="text-xs text-neutral-400">Combat is decided by forward velocity and impact angle. Head-on hits deal 200% damage.</p>
                </div>
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">2. Spin-Power Scaling</h4>
                  <p className="text-xs text-neutral-400">Rotation speed acts as a damage multiplier. Higher spin = stronger hits and better defense.</p>
                </div>
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">3. Stability Shield</h4>
                  <p className="text-xs text-neutral-400">A secondary health layer that absorbs 70% of damage. HP is only hit once stability is low.</p>
                </div>
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">4. Intent Engagement</h4>
                  <p className="text-xs text-neutral-400">Actively moving toward an opponent grants a +5% score bonus. Scores within 5% trigger a Clash.</p>
                </div>
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">5. Arena Control</h4>
                  <p className="text-xs text-neutral-400">Utilize boost tiles and environmental gravity to manipulate the battlefield and trap enemies.</p>
                </div>
                <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-700">
                  <h4 className="text-cyan-400 font-bold mb-1">6. Tactical AI</h4>
                  <p className="text-xs text-neutral-400">Enemies use a state-machine (Hunt/Evade/Idle) to evaluate combat risk and commit to windows.</p>
                </div>
              </div>
            </Section>

            <Section title="Movement System">
              <p className="mb-4 text-neutral-400">Movement Speed determines how fast the top moves across the arena. It affects your "Forward Momentum" in collisions.</p>
              <DetailItem label="Base Movement Speed" value="Standard: 2.0 tiles/sec" />
              <DetailItem label="Maximum Movement Speed" value="Standard: 3.5 tiles/sec" />
              <DetailItem label="Momentum Gain Rate" value="+0.1 tiles/sec every second without being hit" />
              <DetailItem label="Momentum Loss on Hit" value="Lose 25% of current movement speed on collision" />
            </Section>

            <Section title="Rotation (Spin) System">
              <p className="mb-4 text-neutral-400">Rotation Speed determines damage output and visual animation speed.</p>
              <DetailItem label="Base Rotation Speed" value="Standard: 3.5" />
              <DetailItem label="Maximum Rotation Speed" value="Standard: 15.0" />
              <DetailItem label="Momentum Gain Rate" value="+0.5 spin/sec without being hit" />
              <DetailItem label="Momentum Loss on Hit" value="Lose 25% of current rotation speed" />
              <DetailItem label="Tile Boost" value="x3 spin multiplier for 10 seconds" />
            </Section>

            <Section title="Collision Resolution Order">
               <p className="mb-4 text-neutral-400">Collisions are resolved in a strict sequence to ensure competitive fairness.</p>
              <DetailItem label="1. Intent Check" value="Attack Commit grants +5% Momentum bonus" />
              <DetailItem label="2. Forward Momentum" value="Only velocity directed TOWARD opponent counts" />
              <DetailItem label="3. Engagement Lock" value="Momentum values lock for 50ms at impact" />
              <DetailItem label="4. Priority Decision" value=">5% diff = Attacker/Defender, <=5% = Clash" />
            </Section>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Section title="Radii & Detection Zones">
              <p className="text-neutral-400 mb-4">Every top has multiple invisible radii that dictate how it interacts with the world and other tops.</p>
              <DetailItem label="Physical Radius" value="4 units. The core collision circle." />
              <DetailItem label="Evade Radius" value="3 units. AI prioritizes survival." />
              <DetailItem label="Push Radius" value="2 units. Exerts soft force on opponent." />
              <DetailItem label="Gravity Radius" value="1 unit. Strongest pull/slow effect." />
            </Section>

            <Section title="Specials & Abilities">
              <p className="text-neutral-400 mb-4">Each top has unique abilities to turn the tide of battle.</p>
              <DetailItem label="Bounce Shield (Player)" value="Spacebar. Prevents damage and momentum loss for 6s." />
              <DetailItem label="Gravity Pull (Player)" value="Shift. Creates a local gravity well that drags the enemy toward you for 2s. Use this to force high-momentum collisions when you have the advantage." />
              <DetailItem label="Boss System" value="Every enemy is a unique boss with a Passive, an Active Special, and a Reactive Trigger." />
              <DetailItem label="The Phantom" value="Passive: Ghost Trails. Active: Invisibility. Reactive: Desperation Speed (HP < 30%)." />
              <DetailItem label="The Juggernaut" value="Passive: Large Radius. Active: Growth Mode (DMG +50%). Reactive: Kinetic Spin Gain on hit." />
              <DetailItem label="The Sniper" value="Passive: Projectile Burst. Active: Lock-On Dash. Reactive: Split Shot (Spin > 8)." />
              <DetailItem label="The Predator" value="Passive: Keen Senses. Active: Blood Sense (Momentum Bonus). Reactive: Tactical Retreat." />
            </Section>

            <Section title="Reactive Threshold System">
              <p className="text-neutral-400 mb-4">All bosses have global reactive behaviors triggered by health and rotation thresholds.</p>
              <DetailItem label="Low HP (< 25%)" value="Triggers Panic Burst (+5 spin) and Defensive Shield (3s damage immunity)." />
              <DetailItem label="High Spin (> 12)" value="Activates Spin Aura (passive damage to player nearby) and Shockwave on collision." />
              <DetailItem label="Visual Cues" value="Blue Shield = Defensive Shield. Red Fire Ring = High Spin Aura." />
            </Section>

            <Section title="Combat Analysis (HUD)">
              <p className="text-neutral-400 mb-4">Use the Combat Analysis HUD to predict collision outcomes.</p>
              <DetailItem label="Win Chance %" value="Likelihood of becoming the Attacker based on momentum." />
              <DetailItem label="Potential DMG" value="Estimated damage based on spin and angle." />
              <DetailItem label="Stability (DEF)" value="Your current damage absorption capacity." />
            </Section>

            <Section title="Enemy AI Commit Windows">
              <p className="text-neutral-400 mb-4">The AI doesn't just react; it commits to strategic windows.</p>
              <DetailItem label="Attack Commit" value="0.4s window where AI locks direction and accelerates." />
              <DetailItem label="Visual Indicator" value="Red Glow + Directional Streak = Committed Attack." />
              <DetailItem label="Disengage Mode" value="AI seeks safe vectors, avoiding borders and spin disadvantage." />
            </Section>

            <Section title="Layered Combat Model">
              <p className="text-neutral-400 mb-4">The advanced model calculates damage based on multiple physical factors.</p>
              <DetailItem label="Rotation Scaling" value="Damage increases based on your spin advantage." />
              <DetailItem label="Impact Angle" value="Head-on = 200% DMG, Glancing = 50% DMG." />
              <DetailItem label="Stability Absorption" value="70% of damage hits Stability first. HP is hit once Stability is low." />
              <DetailItem label="Impact Efficiency" value="Boosts and Specials increase damage conversion." />
            </Section>

            <Section title="Arena & Environmental Hazards">
              <p className="text-neutral-400 mb-4">The arena itself is a physical participant in the duel.</p>
              <DetailItem label="Arena Gravity (The Maelstrom)" value="Every 80s, a 20s gravity field pulls both tops to the center. Speed and Spin are boosted x5 during this phase. Watch for the purple field!" />
              <DetailItem label="Border Bounce" value="Hitting a border causes instant bounce and speed loss. High-speed impacts can sometimes cause 'clipping' glitches." />
              <DetailItem label="Emergency Respawn" value="If stuck for 1.5s, a manual button appears. If stuck for 10s, an auto-respawn triggers with a detailed diagnostic report in the System Log." />
              <DetailItem label="System Diagnostics" value="The HUD log tracks exactly when, where, and why a top was trapped (e.g., 'Beyond Arena' or 'Immobile')." />
              <DetailItem label="Tile Respawning" value="Boost tiles spawn on all levels and respawn at random locations every 15s. Use them to maintain high spin." />
            </Section>

            <Section title="System Integrity Checklist">
              <p className="text-neutral-400 mb-4">Core balance rules enforced by the engine.</p>
              <DetailItem label="Deterministic Radii" value="Push Radius = 2.0x Physical Radius." />
              <DetailItem label="Gravity Scaling" value="Effective Gravity = Base × sqrt(Level)." />
              <DetailItem label="Damage Normalization" value="Hard Damage Cap at 25% Max HP." />
              <DetailItem label="Effective HP Model" value="Health = HP + (Stability × 0.7)." />
              <DetailItem label="Arena Size" value="40x40 Grid (Expanded)." />
              <DetailItem label="AI Awareness" value="4-zone detection (Idle, Evaluate, Pressure, Commit)." />
            </Section>

            <Section title="Special Abilities Reference">
              <p className="text-neutral-400 mb-4">Available modules for player loadouts and enemy bosses.</p>
              <DetailItem label="Bounce Shield" value="Prevents damage/momentum loss. Converts 50% dmg to stability." />
              <DetailItem label="Gravity Pull" value="Drags enemy toward you for 2s." />
              <DetailItem label="Berserk Rage" value="Damage increases as HP decreases (up to +50%)." />
              <DetailItem label="Mirror Shield" value="Reflects 50% of incoming damage for 4s." />
              <DetailItem label="Blink" value="Instantly teleport behind the opponent." />
              <DetailItem label="Size Shift" value="+40% size, +35% damage output." />
              <DetailItem label="Cloak Pulse" value="Invisibility (cannot attack)." />
              <DetailItem label="Shockwave" value="Pushes enemies away strongly on collision." />
            </Section>
          </div>
        )}
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-neutral-800/50 p-6 rounded-xl border border-neutral-700">
    <h2 className="text-2xl font-semibold mb-4 text-white tracking-tight">{title}</h2>
    <div className="space-y-3">{children}</div>
  </div>
);

const DetailItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row justify-between pb-2 border-b border-neutral-800">
    <p className="font-medium text-neutral-300">{label}</p>
    <p className="text-neutral-400 text-right">{value}</p>
  </div>
);

export default Help;
