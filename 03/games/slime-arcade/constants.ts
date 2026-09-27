import type { SlimeStats, EvolutionStage, Ability, MiniGame, SlimeStat, BattleEnvironment } from './types';

export const BASE_SLIME_STATS: SlimeStats = {
  HP: 25,
  ATK: 1,
  DEF: 1,
  SPD: 1,
  LUK: 0,
};

export const EVOLUTION_STAGES: EvolutionStage[] = [
  { name: 'Blob Slime', levelReq: 1, art: [
      "  .--.  ",
      " / oo \\ ",
      " \\ C / ",
      "  `--'  "
  ]},
  { name: 'Armored Slime', levelReq: 10, art: [
      " /####\\ ",
      " | oo | ",
      " \\ - / ",
      "  `--'  "
  ]},
  { name: 'Elemental Slime', levelReq: 20, art: [
      "  .^^.  ",
      " / ** \\ ",
      " \\_ww_/ ",
      "  `--'  "
  ]},
  { name: 'Slime Lord', levelReq: 30, art: [
      " _/\\W/\\_ ",
      "| @  @ |",
      " \\ ~~~ / ",
      "  `---'  "
  ]},
];

export const ABILITIES: Ability[] = [
    // Attack
    { name: 'Gooey Pound', levelReq: 2, description: 'A simple, physical attack.', type: 'ATTACK', chargeUpTurns: 0, cooldownTurns: 2, baseDamage: 1, damageMultiplier: 1.0, apCost: 1 },
    { name: 'Slime Spit', levelReq: 5, description: 'Deals minor damage and applies Poison for 3 turns.', type: 'ATTACK', chargeUpTurns: 0, cooldownTurns: 3, baseDamage: 2, damageMultiplier: 0.5, apCost: 2 },
    { name: 'Corrosive Slime', levelReq: 14, description: 'Deals minor damage and corrodes the target, reducing their DEF by 20% for 2 turns.', type: 'ATTACK', chargeUpTurns: 0, cooldownTurns: 4, baseDamage: 1, damageMultiplier: 0.4, apCost: 2 },
    { name: 'Acid Burst', levelReq: 15, description: 'A high-damage attack with a bonus critical hit chance.', type: 'ATTACK', chargeUpTurns: 1, cooldownTurns: 6, baseDamage: 4, damageMultiplier: 1.5, apCost: 3 },
    { name: 'Leeching Ooze', levelReq: 18, description: "Drains opponent's ATK, boosting your own for 2 turns.", type: 'ATTACK', chargeUpTurns: 1, cooldownTurns: 6, baseDamage: 2, damageMultiplier: 0.25, apCost: 3 },
    { name: 'Ooze Barrage', levelReq: 22, description: 'Unleashes 3 weak hits.', type: 'ATTACK', chargeUpTurns: 0, cooldownTurns: 4, baseDamage: 1, damageMultiplier: 0.5, apCost: 2 },

    // Defense
    { name: 'Brace', levelReq: 3, description: 'Adopt a defensive stance, boosting your DEF by +3 for 2 turns.', type: 'DEFENSE', chargeUpTurns: 0, cooldownTurns: 4, apCost: 1 },
    { name: 'Regeneration', levelReq: 8, description: 'Restores HP, but each use applies a stacking DEF debuff.', type: 'DEFENSE', chargeUpTurns: 2, cooldownTurns: 8, apCost: 2 },
    { name: 'Slime Wall', levelReq: 5, description: 'Absorbs all damage from the next attack.', type: 'DEFENSE', chargeUpTurns: 1, cooldownTurns: 7, apCost: 3 },
    { name: 'Iron Slime', levelReq: 15, description: 'Temporarily reduces all incoming damage by 50% for 2 turns.', type: 'DEFENSE', chargeUpTurns: 1, cooldownTurns: 6, apCost: 3 },
    { name: 'Hardened Carapace', levelReq: 12, description: 'Gain +2 DEF and take 25% fewer critical hits for 3 turns.', type: 'DEFENSE', chargeUpTurns: 0, cooldownTurns: 5, apCost: 2 },

    // Evasion
    { name: 'Dodge Roll', levelReq: 10, description: 'A 50% chance to completely evade the next attack.', type: 'EVASION', chargeUpTurns: 0, cooldownTurns: 4, apCost: 2 },
    { name: 'Slime Blink', levelReq: 20, description: 'Guarantees evasion of 1 attack and boosts SPD by +2 next turn.', type: 'EVASION', chargeUpTurns: 2, cooldownTurns: 8, apCost: 3 },
    { name: 'Gel Slide', levelReq: 16, description: '75% chance to evade. If successful, counter-attack for low damage.', type: 'EVASION', chargeUpTurns: 0, cooldownTurns: 5, apCost: 2 },
    
    // Environment & Stances
    { name: 'Adrenaline Rush', levelReq: 26, description: 'When HP is below 50%, activate for a large ATK and SPD boost for 3 turns.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 8, apCost: 3, condition: { type: 'HP_BELOW_PERCENT', value: 0.5 } },
    { name: 'Savage Stance', levelReq: 12, description: 'Enter a stance for 3 turns, boosting ATK by 15%.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 6, apCost: 2 },
    { name: 'Resilient Stance', levelReq: 12, description: 'Enter a stance for 3 turns, boosting DEF by 15%.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 6, apCost: 2 },
    { name: 'Quick Stance', levelReq: 12, description: 'Enter a stance for 3 turns, boosting SPD by 15%.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 6, apCost: 2 },
    { name: 'Lucky Stance', levelReq: 12, description: 'Enter a stance for 3 turns, boosting LUK by 15%.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 6, apCost: 2 },
    { name: 'Muddy Terrain', levelReq: 10, description: "Reduces the opponent's SPD by -2 for 2 turns.", type: 'ENVIRONMENT', chargeUpTurns: 1, cooldownTurns: 6, apCost: 2 },
    { name: 'Momentum Shift', levelReq: 24, description: 'Lower your guard to power up. Reduces own DEF by 25% to boost ATK by 50% for 3 turns.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 6, apCost: 3 },
    { name: 'Environmental Surprise', levelReq: 25, description: 'Uses luck to trigger a random helpful event.', type: 'ENVIRONMENT', chargeUpTurns: 2, cooldownTurns: 8, apCost: 2 },
    { name: 'Sticky Field', levelReq: 20, description: "Halves the opponent's DEF for 2 turns.", type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 7, apCost: 3 },
    { name: 'Overdrive', levelReq: 28, description: 'For 3 turns, boost ATK by a massive 25% at the cost of -15% DEF.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 8, apCost: 3 },
    { name: 'Unstable Core', levelReq: 17, description: 'A passive stance. Permanently reduces DEF by 10% to boost ATK by 10% for the whole battle.', type: 'ENVIRONMENT', chargeUpTurns: 0, cooldownTurns: 99, apCost: 3 },
    { name: 'Corrosive Slime', levelReq: 14, description: 'Deals minor damage and corrodes the target, reducing their DEF by 20% for 2 turns.', type: 'ATTACK', chargeUpTurns: 0, cooldownTurns: 4, baseDamage: 1, damageMultiplier: 0.4, apCost: 2 },
];

export const BATTLE_ENVIRONMENTS: BattleEnvironment[] = [
    {
        name: 'Volcanic Arena',
        description: 'The air crackles with heat. All slimes take 1 burn damage at the end of each turn.',
        color: 'bg-red-900/50',
        effect: { type: 'DOT', value: 1 }
    },
    {
        name: 'Glacial Cavern',
        description: 'The biting cold slows everyone down. All slimes have -2 SPD.',
        color: 'bg-blue-900/50',
        effect: { type: 'STAT_MOD', stat: 'SPD', value: -2 }
    },
    {
        name: 'Overgrown Jungle',
        description: 'Thick vines cover the ground. There is a small chance to get ensnared and lose a turn.',
        color: 'bg-green-900/50',
        effect: { type: 'DOT', value: 0 } // Placeholder for custom logic in BattleArena
    },
    {
        name: 'Arcane Sanctuary',
        description: 'Mystical energy flows through the air. All ability cooldowns are reduced by 1.',
        color: 'bg-purple-900/50',
        effect: { type: 'DOT', value: 0 } // Placeholder for custom logic
    }
];


export const MINI_GAMES: MiniGame[] = [
    { name: 'Slime Whack', description: 'Whack the slimes before they hide!', expBase: 15, levelReq: 1 },
    { name: 'Slime Snake', description: 'Eat pellets, grow long!', expBase: 15, levelReq: 1 },
    { name: 'Slime Tetris', description: 'Clear lines, get combos!', expBase: 20, levelReq: 1 },
    { name: 'Slime Pong', description: 'Classic paddle and ball action against an AI!', expBase: 25, levelReq: 5 },
    { name: 'Slime Impact', description: 'Shoot aliens, defeat the boss!', expBase: 30, levelReq: 5 },
    { name: 'Meteor Strike', description: 'Asteroids-style shooter. High-risk, high-reward.', expBase: 40, levelReq: 10 },
    { name: 'Memory Puzzle', description: 'Match pairs of cards. Difficulty increases!', expBase: 45, levelReq: 10 },
    { name: 'Jump Frog', description: 'Frogger-style. Navigate a busy street and river.', expBase: 50, levelReq: 15 },
    { name: 'Connect the Dots', description: 'Draw lines to form boxes and claim them before the AI does!', expBase: 45, levelReq: 15 },
    { name: 'Nibbles', description: 'Survive and outgrow the opponent snake!', expBase: 55, levelReq: 20 },
    { name: 'Connect Four', description: 'Classic strategy game. Beat the AI as it gets smarter!', expBase: 50, levelReq: 20 },
    { name: 'Slime Bomber', description: 'Blast your way through enemies and levels!', expBase: 60, levelReq: 20 },
];

export const MAX_LEVEL = 200;
export const MAX_STAT_VALUE = 99;

export const EXP_TO_LEVEL_UP = (level: number): number => {
    // A gentle exponential curve for a more rewarding long-term progression.
    return Math.floor(50 * Math.pow(level, 1.2));
}

export const STAT_TOKEN_COST = (statValue: number): number => {
    // Cost starts at 1 and increases every 10 stat points.
    if (statValue >= MAX_STAT_VALUE) return 999; // Effectively infinite cost
    return 1 + Math.floor(statValue / 10);
}

export const TOKENS_PER_LEVEL = (): number => {
    // A constant token gain designed to allow maxing stats by max level.
    return 6;
};

export const MAX_ABILITIES = 4;

export const MINI_GAME_HELP_DATA: Record<string, {
    rules: string;
    scoring: string;
    progression?: string;
    powerups?: { name: string; description: string }[];
    enemies?: { name: string; description: string }[];
    bosses?: { name: string; description: string }[];
}> = {
    'Slime Snake': {
        rules: "Use the Arrow Keys to guide your snake. Eat the yellow pellets to grow longer. The game ends if you run into a wall or your own tail.",
        scoring: "You gain 10 EXP for each pellet eaten.",
        progression: "The game is split into 12 levels. To pass a level, you must eat a set number of pellets. The snake's speed increases with each level."
    },
    'Slime Tetris': {
        rules: "Use the Arrow Keys to move and rotate the falling blocks (Tetrominoes). Use the Space Bar to drop them instantly. Complete horizontal lines to clear them.",
        scoring: "Points are awarded for each line cleared. Clearing multiple lines at once (a 'Tetris') gives a large bonus. The score is multiplied by the current level.",
        progression: "The game has 12 levels. You must clear 10 lines to advance to the next level. The block drop speed increases with each level."
    },
    'Slime Whack': {
        rules: "Slimes will pop out of the 9 holes. Click them or use the corresponding Numpad key (1-9) to whack them before they disappear. Meet the level's score target before time runs out!",
        scoring: "Regular Slime: +1 point. Golden Slime (rare, fast): +5 points. Bomb Slime: -3 points.",
        progression: "12 levels of increasing difficulty. Each level requires a higher score, and the slimes appear and disappear more quickly."
    },
    'Slime Pong': {
        rules: "A classic game of Pong. Use your mouse to control the left paddle. The first to 5 points wins the level.",
        scoring: "You gain EXP for each point you score and a bonus for winning a level.",
        progression: "12 levels. The AI opponent's speed and reaction time increase with each level.",
        powerups: [
            { name: "Grow Paddle (Green)", description: "Temporarily increases the size of your paddle." },
            { name: "Shrink AI (Red)", description: "Temporarily shrinks the AI's paddle." },
            { name: "Fast Ball (Blue)", description: "Temporarily makes the ball move much faster." },
            { name: "Slow AI (Purple)", description: "Temporarily makes the AI paddle move more slowly." }
        ]
    },
    'Slime Impact': {
        rules: "A vertical shooter. Use Arrow Keys to move and Space to fire. Collect power-ups by shooting them. Survive 12 waves of enemies and bosses.",
        scoring: "EXP is awarded for defeating enemies and bosses. The amount increases with enemy difficulty.",
        progression: "12 waves with increasing difficulty. You must defeat a set number of enemies to clear each wave. Bosses appear on waves 5, 10, and 12.",
        powerups: [
             { name: "Inventory System", description: "Hold up to 3 power-ups. Use Right Arrow to cycle and Left Arrow to activate." },
             { name: "Gravity Gun", description: "Activates a 10-second mode where your shots become orbs that pull in and destroy nearby enemies and projectiles, growing in power." },
             { name: "Laser Beam", description: "A single-use, screen-piercing laser that destroys everything in its path." },
             { name: "Spread Shot", description: "For 10 seconds, your ship fires a wide 5-way spread of bullets." },
             { name: "Rapid Fire", description: "For 10 seconds, your ship's fire rate is massively increased." },
             { name: "Shield", description: "Grants 10 seconds of complete invincibility." }
        ],
        enemies: [
            { name: "Grunt", description: "Standard enemy, moves forward slowly." },
            { name: "Charger", description: "A faster version of the Grunt that aims for the player." },
            // ... and so on for all 9 enemy types
        ],
        bosses: [
            { name: "Wave 5 Boss", description: "High HP. Fires barrages and summons minions." },
            { name: "Wave 10 Boss", description: "Higher HP and speed. More aggressive attacks." },
            { name: "Wave 12 Boss", description: "The final challenge. Extremely high HP and speed. Uses all previous attacks plus homing projectiles." }
        ]
    },
    'Meteor Strike': {
        rules: "An Asteroids-style shooter. Use Arrow Keys to turn and thrust, Space to shoot. You have 5 lives. Survive 12 waves of enemies and asteroids.",
        scoring: "EXP is awarded only for destroying enemy ships (Scouts, Hunters, Boss). No points for asteroids.",
        progression: "12 waves. Enemy count and difficulty increases. Boss fights occur on waves 5, 10, and 12.",
        powerups: [
            { name: "Shield (Blue)", description: "Absorbs one fatal hit." },
            { name: "Weapon (Yellow)", description: "Increases fire rate and gives a 3-way spread shot." },
            { name: "Speed (Red)", description: "Boosts your ship's thrust." },
            { name: "Traction (White)", description: "Reduces space-drift for tighter controls." },
            { name: "Beam (Orange)", description: "Your next shot is a powerful, piercing laser beam." },
            { name: "Tri-Beam (Green)", description: "Fires a 3-way spread of piercing beams." },
            { name: "Homing Missiles (Purple)", description: "Fires 3 homing missiles." },
            { name: "Clone (Pink)", description: "Spawns an AI-controlled duplicate of your ship for 20 seconds." },
            { name: "Slow Motion (Black)", description: "Briefly slows down all enemies and projectiles." },
            { name: "Boss Summon (Orange)", description: "Immediately skips to the final boss fight and grants a rear gun." }
        ],
        enemies: [
             { name: "Scout (Red)", description: "Simple enemy with low HP. Fires single shots." },
             { name: "Hunter (Purple)", description: "Faster, more aggressive enemy. Fires spread shots." }
        ],
        bosses: [
            { name: "Slime Overlord", description: "A massive, multi-phase boss. Spawns minions and uses a variety of attack patterns that change as it takes damage." }
        ]
    },
    'Memory Puzzle': {
        rules: "Click on the cards to reveal the symbols underneath. Match two identical symbols to clear them from the board. Clear the entire board before the time runs out.",
        scoring: "EXP is awarded for each matched pair, with a bonus for completing a level and for any time remaining on the clock.",
        progression: "17 levels of increasing difficulty. The board gets larger and the time limit gets tighter with each level."
    },
    'Jump Frog': {
        rules: "Use the Arrow Keys to guide your frog across the busy road and treacherous river. Each successful crossing advances you to the next level.",
        scoring: "You gain EXP for every forward hop and for completing a level. Large bonuses are awarded for escorting a Lady Frog.",
        progression: "12 levels. The traffic and river obstacles get faster and longer with each level.",
        enemies: [
            { name: "Diving Turtles", description: "These turtles will blink before they submerge. Don't be on them when they go under!" },
            { name: "Alligators", description: "You can ride on their backs, but their snapping jaws are a lethal trap." },
            { name: "Lady Frog Escort", description: "Occasionally, a pink frog will appear. Pick her up and carry her to safety for a huge EXP bonus." }
        ]
    },
     'Connect the Dots': {
        rules: "Take turns with the AI drawing lines to connect dots. When you draw the fourth side of a 1x1 box, you claim it, score a point, and get to take another turn. The player with the most boxes at the end wins.",
        scoring: "EXP is awarded for winning a match.",
        progression: "12 levels. The AI gets smarter and the board size increases as you progress."
    },
    'Nibbles': {
        rules: "A competitive version of Snake. You are the green snake, the AI is red. Eat food to grow and cut off your opponent, forcing them to crash. Crashing into a wall, your own tail, or the opponent's tail ends the round.",
        scoring: "EXP is awarded for defeating the AI. The amount increases with the level.",
        progression: "12 levels. The AI gets progressively smarter and the game speed increases with each level.",
        powerups: [
            { name: "Protective Food (Blue)", description: "Eating this grants temporary immunity from crashing into the opponent's snake or your own tail (but not walls)." }
        ]
    },
    'Connect Four': {
        rules: "Take turns dropping your colored discs into the grid. The first player to get four of their discs in a row—horizontally, vertically, or diagonally—wins the level.",
        scoring: "EXP is awarded for defeating the AI. The amount increases with the level.",
        progression: "12 levels. The AI uses more advanced strategies (like the Minimax algorithm) on higher levels, making it much harder to beat."
    },
    'Slime Bomber': {
        rules: "Navigate the maze and use bombs to destroy soft walls and defeat all enemies. Once all enemies are defeated, find the hidden exit to advance to the next level. You have 3 lives.",
        scoring: "EXP is awarded for defeating enemies and bosses.",
        progression: "12 levels of increasing difficulty. Bosses appear on levels 5, 10, and 12.",
        powerups: [
            { name: "Bomb Up", description: "Increases the number of bombs you can place at once." },
            { name: "Range Up", description: "Increases the explosion range of your bombs." },
            { name: "Speed Up", description: "Increases your movement speed." },
            { name: "Kick Bomb", description: "Allows you to kick bombs by walking into them." },
            { name: "Detonator", description: "Allows you to detonate your oldest bomb by pressing Shift." },
            { name: "Ghost Potion", description: "Temporarily allows you to walk through soft walls." },
            { name: "Pierce Bomb", description: "Your next bomb's explosion will travel through a full row of soft walls." }
        ],
        enemies: [
            { name: "Wanderer", description: "Moves around randomly." },
            { name: "Chaser", description: "Uses a pathfinding algorithm to hunt the player." },
            { name: "Ghost", description: "Can move through soft walls." },
            { name: "Sprinter", description: "Moves very quickly in straight lines." }
        ],
        bosses: [
            { name: "Level 5 Boss", description: "A large, durable boss that aggressively chases you." },
            { name: "Level 10 Boss", description: "Faster and smarter, this boss will periodically stop to lay a deadly line of bombs in your path." },
            { name: "Level 12 Boss", description: "The ultimate challenge. This boss is incredibly fast and switches between chasing you, laying bomb traps, and unleashing devastating, screen-filling spiral bomb attacks." }
        ]
    },
// Fix: Removed duplicate 'Slime Whack' entry.
};