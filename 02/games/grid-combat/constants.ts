import { Skill, Player, SkillType, CostType } from './types';
import SwordIcon from './components/icons/SwordIcon';
import FireIcon from './components/icons/FireIcon';
import BootIcon from './components/icons/BootIcon';
import HeartIcon from './components/icons/HeartIcon';
import SummonIcon from './components/icons/SummonIcon';
import VanishIcon from './components/icons/VanishIcon';
import DrainIcon from './components/icons/DrainIcon';
import ParryIcon from './components/icons/ParryIcon';
import StayIcon from './components/icons/StayIcon';
import HealIcon from './components/icons/HealIcon';
import AegisShieldIcon from './components/icons/AegisShieldIcon';
import RecklessSwingIcon from './components/icons/RecklessSwingIcon';
import RampageIcon from './components/icons/RampageIcon';
import BattleCryIcon from './components/icons/BattleCryIcon';
import BloodPactIcon from './components/icons/BloodPactIcon';
import RetributionAuraIcon from './components/icons/RetributionAuraIcon';
import ConstrictIcon from './components/icons/ConstrictIcon';
import ConstructionIcon from './components/icons/ConstructionIcon';
import TwinEchoIcon from './components/icons/TwinEchoIcon';
import JabIcon from './components/icons/JabIcon';
import PushIcon from './components/icons/PushIcon';
import RageOutIcon from './components/icons/RageOutIcon';
import FreezeIcon from './components/icons/FreezeIcon';
import BurningIcon from './components/icons/BurningIcon';
import TauntIcon from './components/icons/TauntIcon';
import PoisonIcon from './components/icons/PoisonIcon';
import HasteIcon from './components/icons/HasteIcon';
import TrapIcon from './components/icons/TrapIcon';
import ChainLightningIcon from './components/icons/ChainLightningIcon';
import SummonSkeletonIcon from './components/icons/SummonSkeletonIcon';
import UnstoppableIcon from './components/icons/UnstoppableIcon';
import AbyssalBladeIcon from './components/icons/AbyssalBladeIcon';
import KineticConversionIcon from './components/icons/KineticConversionIcon';
import ArcaneSurgeIcon from './components/icons/ArcaneSurgeIcon';
import SideStepIcon from './components/icons/SideStepIcon';
import TripIcon from './components/icons/TripIcon';
import QuickShotIcon from './components/icons/QuickShotIcon';
import MeditateIcon from './components/icons/MeditateIcon';
import RicochetIcon from './components/icons/RicochetIcon';
import PhaseShiftIcon from './components/icons/PhaseShiftIcon';
import SilenceIcon from './components/icons/SilenceIcon';


export const DEFAULT_GRID_SIZE = 11;

const MASTER_SKILLS_LIST: Skill[] = [
  { id: 's0', name: 'Stay', description: 'Remain in place. Costs nothing. Can be used twice.', cost: 0, costType: CostType.STAMINA, range: 0, type: SkillType.MOVE, icon: StayIcon },
  { id: 's15', name: 'Push', description: 'A forceful shove that deals minor damage and pushes the target back 1 tile.', cost: 12, costType: CostType.STAMINA, range: 1, damage: 5, type: SkillType.ATTACK, icon: PushIcon },
  { id: 's1', name: 'Slash', description: 'A quick sword attack.', cost: 18, costType: CostType.STAMINA, range: 1, damage: 15, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 's2', name: 'Fireball', description: 'Hurl a ball of fire that explodes on impact, hitting a small area.', cost: 25, costType: CostType.MP, range: 5, damage: 18, type: SkillType.ATTACK, icon: FireIcon, aoe: 1 },
  { id: 's3', name: 'Dash', description: 'Move quickly across the field.', cost: 25, costType: CostType.STAMINA, range: 4, type: SkillType.MOVE, icon: BootIcon },
  { id: 's8', name: 'Walk', description: 'A short, stamina-efficient move.', cost: 12, costType: CostType.STAMINA, range: 2, type: SkillType.MOVE, icon: BootIcon },
  { id: 's4', name: 'Focus', description: 'Focus your power, increasing the damage of your next Attack or Special skill by 50%. Effect is consumed on use.', cost: 15, costType: CostType.MP, range: 0, type: SkillType.BUFF, icon: HeartIcon },
  { id: 's7', name: 'Parry', description: 'If attacked this turn, take 75% reduced damage and your next melee attack costs 0 Stamina.', cost: 25, costType: CostType.STAMINA, range: 0, type: SkillType.BUFF, icon: ParryIcon },
  { id: 's14', name: 'Jab', description: 'A focused punch. Damage increases based on your missing HP. If target has a buff, removes it and deals +50% damage.', cost: 15, costType: CostType.STAMINA, range: 1, damage: 8, type: SkillType.SPECIAL, icon: JabIcon, cooldown: 3 },
  { id: 's30', name: 'Boulder Toss', description: 'Hurl a heavy rock a long distance.', cost: 30, costType: CostType.STAMINA, range: 6, damage: 20, type: SkillType.ATTACK, icon: PushIcon },
  { id: 's100', name: 'Side Step', description: 'A quick 1-tile hop. Very low cost.', cost: 5, costType: CostType.STAMINA, range: 1, type: SkillType.MOVE, icon: SideStepIcon },
  { id: 's101', name: 'Trip', description: 'A low-damage attack that applies SLOW for 2 turns.', cost: 15, costType: CostType.STAMINA, range: 1, damage: 5, type: SkillType.ATTACK, icon: TripIcon },
  { id: 's102', name: 'Quick Shot', description: 'A fast, low-cost magical bolt.', cost: 10, costType: CostType.MP, range: 4, damage: 8, type: SkillType.ATTACK, icon: QuickShotIcon },
  { id: 's103', name: 'Meditate', description: 'Regain 20 Stamina at the cost of some MP.', cost: 10, costType: CostType.MP, range: 0, type: SkillType.BUFF, icon: MeditateIcon },
  { id: 's104', name: 'Ricochet Shot', description: 'Ranged attack. If target is by an obstacle, it bounces to another enemy.', cost: 30, costType: CostType.STAMINA, range: 5, damage: 15, type: SkillType.ATTACK, icon: RicochetIcon },
  { id: 's105', name: 'Phase Shift', description: 'Move through one enemy or obstacle.', cost: 35, costType: CostType.MP, range: 3, type: SkillType.MOVE, icon: PhaseShiftIcon },
  { id: 's106', name: 'Silence', description: 'Prevents the target from using MP skills for 2 turns.', cost: 25, costType: CostType.MP, range: 4, type: SkillType.DEBUFF, icon: SilenceIcon },
  { id: 's29', name: 'Hamstring', description: 'A crippling strike that deals damage and Immobilizes the target for 1 turn.', cost: 25, costType: CostType.STAMINA, range: 1, damage: 10, type: SkillType.ATTACK, icon: TripIcon, cooldown: 4 },
  { id: 'sp1', name: 'Summon Decoy', description: 'Summon a decoy that taunts enemies. Costs 20% of Max HP. You can cast non-move skills from the decoy\'s position.', cost: 20, costType: CostType.HP, range: 3, type: SkillType.SPECIAL, icon: SummonIcon, cooldown: 5 },
  { id: 'sp21', name: 'Kinetic Conversion', description: 'Sacrifice 50% of current MP to restore Stamina (1 MP : 1.5 STA).', cost: 10, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: KineticConversionIcon, cooldown: 3 },
  { id: 'sp22', name: 'Arcane Surge', description: 'Convert 50% of current Stamina into MP (2 STA : 1 MP).', cost: 10, costType: CostType.STAMINA, range: 0, type: SkillType.SPECIAL, icon: ArcaneSurgeIcon, cooldown: 3 },
  { id: 'sp10', name: 'Flash Freeze', description: 'AOE blast with a 30% chance to Freeze enemies for 1 turn.', cost: 45, costType: CostType.MP, range: 4, aoe: 1, type: SkillType.SPECIAL, icon: FreezeIcon, cooldown: 5 },
  { id: 's5', name: 'Shadow Strike', description: 'A swift strike from the shadows.', cost: 25, costType: CostType.STAMINA, range: 2, damage: 15, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 's6', name: 'Life Drain', description: 'Siphon life from your opponent, healing for 75% of damage dealt.', cost: 30, costType: CostType.MP, range: 4, damage: 10, type: SkillType.ATTACK, icon: DrainIcon },
  { id: 'sp2', name: 'Vanish', description: 'Become untargetable and invisible for 1 turn. Your next attack deals +50% damage.', cost: 35, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: VanishIcon, cooldown: 6 },
  { id: 's9', name: 'Holy Smite', description: 'Strike with holy power. Damage scales strongly with Intelligence.', cost: 30, costType: CostType.MP, range: 1, damage: 15, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 's31', name: 'Holy Bolt', description: 'Fire a bolt of sacred energy.', cost: 25, costType: CostType.MP, range: 5, damage: 12, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 's10', name: 'Heal', description: 'Restore a small amount of HP (20 + 50% INT).', cost: 25, costType: CostType.MP, range: 0, type: SkillType.BUFF, icon: HealIcon },
  { id: 'sp3', name: 'Aegis Shield', description: 'Create a shield that absorbs 35 damage. Lasts 2 turns.', cost: 40, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: AegisShieldIcon, cooldown: 5 },
  { id: 's11', name: 'Reckless Swing', description: 'A powerful, wild swing that deals high damage but also inflicts 5 recoil damage upon yourself.', cost: 30, costType: CostType.STAMINA, range: 1, damage: 28, type: SkillType.ATTACK, icon: RecklessSwingIcon },
  { id: 's12', name: 'Battle Cry', description: 'Let out a mighty roar, increasing Strength by 50% but decreasing Defense by 50% for 2 turns.', cost: 20, costType: CostType.STAMINA, range: 0, type: SkillType.BUFF, icon: BattleCryIcon },
  { id: 'sp4', name: 'Rampage', description: 'For this turn, Stamina costs are halved and damage is increased by 25%.', cost: 45, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: RampageIcon, cooldown: 6 },
  { id: 's13', name: 'Retribution Aura', description: 'For 2 turns, any enemy that damages you takes 200% of that damage back.', cost: 35, costType: CostType.MP, range: 0, type: SkillType.BUFF, icon: RetributionAuraIcon, cooldown: 5 },
  { id: 'sp5', name: 'Blood Pact', description: 'Pay 10% Max HP to halve MP and Stamina costs for 3 turns.', cost: 10, costType: CostType.HP, range: 0, type: SkillType.SPECIAL, icon: BloodPactIcon, cooldown: 6 },
  { id: 's22', name: 'Haste', description: 'Boosts Speed by 50% for 3 turns, allowing you to act first.', cost: 25, costType: CostType.MP, range: 0, type: SkillType.BUFF, icon: HasteIcon, cooldown: 5 },
  { id: 'sp6', name: 'Overgrowth', description: 'Causes thorny vines to erupt in an area, Immobilizing all units for 1 turn.', cost: 40, costType: CostType.MP, range: 5, aoe: 1, type: SkillType.SPECIAL, icon: ConstrictIcon, cooldown: 6 },
  { id: 'sp7', name: 'Construction', description: 'Create 3 random pillars in a 2-tile radius that block movement and line of sight. Lasts 3 turns.', cost: 50, costType: CostType.MP, range: 4, type: SkillType.SPECIAL, icon: ConstructionIcon, cooldown: 6, aoe: 2 },
  { id: 'sp8', name: 'Twin Echo', description: 'Buff yourself for 1 turn. If your Primary and Follow-up skills are the same, their cost is 0. You take 2x damage next turn.', cost: 30, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: TwinEchoIcon, cooldown: 6 },
  { id: 'sp9', name: 'Rage Out', description: 'Unleash an explosion around you, dealing damage equal to 50% of your missing HP to all units in a 2-tile radius. Drains all remaining Stamina.', cost: 0, costType: CostType.STAMINA, range: 0, type: SkillType.SPECIAL, icon: RageOutIcon, cooldown: 6, aoe: 2 },
  { id: 's16', name: 'Ice Shard', description: 'Fire a shard of ice that deals damage and slows the target.', cost: 25, costType: CostType.MP, range: 5, damage: 12, type: SkillType.ATTACK, icon: FreezeIcon },
  { id: 's18', name: 'Scorch', description: 'Mid-range fire attack that leaves the ground burning for 2 turns.', cost: 30, costType: CostType.MP, range: 3, damage: 15, type: SkillType.ATTACK, icon: BurningIcon },
  { id: 'sp11', name: 'Fire Wall', description: 'Create a wall of fire 3 tiles long that damages anyone who passes through.', cost: 40, costType: CostType.MP, range: 4, type: SkillType.SPECIAL, icon: FireIcon, cooldown: 5 },
  { id: 's19', name: 'Stone Fist', description: 'A slow but powerful punch.', cost: 35, costType: CostType.STAMINA, range: 1, damage: 22, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 'sp12', name: 'Taunt', description: 'Force the opponent to target you for 2 turns.', cost: 35, costType: CostType.STAMINA, range: 5, type: SkillType.SPECIAL, icon: TauntIcon, cooldown: 4 },
  { id: 's21', name: 'Poison Dart', description: 'Deals minor damage and applies Poison for 3 turns.', cost: 25, costType: CostType.MP, range: 4, damage: 8, type: SkillType.ATTACK, icon: PoisonIcon },
  { id: 'sp13', name: 'Acid Bomb', description: 'AOE attack that makes targets Vulnerable, causing them to take 50% increased damage for 2 turns.', cost: 35, costType: CostType.MP, range: 4, aoe: 1, damage: 12, type: SkillType.SPECIAL, icon: PoisonIcon, cooldown: 4 },
  { id: 'sp14', name: 'Time Slip', description: 'Teleport to any empty tile within range.', cost: 30, costType: CostType.MP, range: 3, type: SkillType.MOVE, icon: BootIcon, cooldown: 3 },
  { id: 'sp15', name: 'Mirror Image', description: 'Summon 2 decoys with 1 HP. Costs 15% Max HP.', cost: 15, costType: CostType.HP, range: 2, type: SkillType.SPECIAL, icon: SummonIcon, cooldown: 6 },
  { id: 's24', name: 'Longshot', description: 'A very long-range arrow shot.', cost: 30, costType: CostType.STAMINA, range: 8, damage: 20, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 'sp16', name: 'Barbed Trap', description: 'Place a hidden trap that Immobilizes and damages the first enemy to step on it.', cost: 25, costType: CostType.STAMINA, range: 2, type: SkillType.SPECIAL, icon: TrapIcon, cooldown: 3 },
  { id: 'sp17', name: 'Chain Lightning', description: 'Lightning strikes a target, then jumps to one other nearby unit.', cost: 40, costType: CostType.MP, range: 5, damage: 18, type: SkillType.SPECIAL, icon: ChainLightningIcon, cooldown: 4 },
  { id: 's26', name: 'Gale Force', description: 'Push all units in a 3-tile line away from you by 2 tiles.', cost: 25, costType: CostType.MP, range: 3, type: SkillType.ATTACK, icon: PushIcon },
  { id: 's27', name: 'Bone Spear', description: 'Hurl a spear of bone that pierces defenses.', cost: 25, costType: CostType.MP, range: 4, damage: 18, type: SkillType.ATTACK, icon: SwordIcon },
  { id: 'sp18', name: 'Summon Skeleton', description: 'Summon a weak skeleton warrior that lasts 3 turns.', cost: 35, costType: CostType.MP, range: 2, type: SkillType.SPECIAL, icon: SummonSkeletonIcon, cooldown: 5 },
  { id: 'sp20', name: 'Unstoppable', description: 'Become immune to all debuffs for 2 turns.', cost: 45, costType: CostType.MP, range: 0, type: SkillType.SPECIAL, icon: UnstoppableIcon, cooldown: 6 },
  { id: 'b1', name: 'Abyssal Cleave', description: 'A huge cleaving attack in a cone.', cost: 25, costType: CostType.STAMINA, range: 2, damage: 25, aoe: 2, type: SkillType.ATTACK, icon: AbyssalBladeIcon },
  { id: 'b2', name: 'Void Grasp', description: 'Pulls the target 3 tiles closer and deals damage.', cost: 30, costType: CostType.MP, range: 6, damage: 18, type: SkillType.ATTACK, icon: AbyssalBladeIcon },
  { id: 'bsp1', name: 'Annihilation', description: 'Charges for 1 turn, then unleashes a massive 4-tile radius AOE attack.', cost: 55, costType: CostType.MP, range: 0, aoe: 4, damage: 55, type: SkillType.SPECIAL, icon: AbyssalBladeIcon, cooldown: 6 },
  { id: 'bsp2', name: 'Summon Rift', description: 'Summons a rift that spawns 2 Skeletons.', cost: 45, costType: CostType.MP, range: 3, type: SkillType.SPECIAL, icon: SummonSkeletonIcon, cooldown: 5 },
];

const getSkill = (id: string): Skill => {
    const skill = MASTER_SKILLS_LIST.find(s => s.id === id);
    if (!skill) throw new Error(`FATAL: Skill with id '${id}' not found.`);
    return skill;
};

export const STAY_SKILL = getSkill('s0');
export const ALL_GAME_SKILLS = MASTER_SKILLS_LIST.filter(s => s.id !== 's0');
// Keep original exports for any potential external dependencies, though they are now redundant internally
export const SKILLS = MASTER_SKILLS_LIST.filter(s => s.id.startsWith('s') && s.id !== 's0');
export const SPECIAL_SKILLS = MASTER_SKILLS_LIST.filter(s => s.id.startsWith('sp'));
export const UTILITY_SKILLS = MASTER_SKILLS_LIST.filter(s => s.id === 'sp21' || s.id === 'sp22');


// Challenger Movesets (All updated to 9 skills: 1 Stay, >=1 Move, >=1 Special, built from master list)
const p1Skills = [getSkill('s0'), getSkill('s15'), getSkill('s1'), getSkill('s2'), getSkill('s3'), getSkill('s8'), getSkill('s4'), getSkill('s7'), getSkill('sp1')];
const p2Skills = [getSkill('s0'), getSkill('s2'), getSkill('s3'), getSkill('s102'), getSkill('s15'), getSkill('s100'), getSkill('s106'), getSkill('s4'), getSkill('sp10')];
const p3Skills = [getSkill('s0'), getSkill('s5'), getSkill('s6'), getSkill('s105'), getSkill('s101'), getSkill('s14'), getSkill('s106'), getSkill('s8'), getSkill('sp2')];
const p4Skills = [getSkill('s0'), getSkill('s9'), getSkill('s31'), getSkill('s10'), getSkill('s15'), getSkill('s8'), getSkill('s106'), getSkill('sp3'), getSkill('sp22')];
const p5Skills = [getSkill('s0'), getSkill('s11'), getSkill('s30'), getSkill('s12'), getSkill('s3'), getSkill('s29'), getSkill('sp4'), getSkill('sp21'), getSkill('s1')];
const p6Skills = [getSkill('s0'), getSkill('s1'), getSkill('s6'), getSkill('s13'), getSkill('s14'), getSkill('s8'), getSkill('s102'), getSkill('s106'), getSkill('sp5')];
const p7Skills = [getSkill('s0'), getSkill('s22'), getSkill('s101'), getSkill('s7'), getSkill('s3'), getSkill('s29'), getSkill('s1'), getSkill('s100'), getSkill('sp6')];
const p8Skills = [getSkill('s0'), getSkill('s15'), getSkill('s30'), getSkill('s7'), getSkill('s100'), getSkill('s2'), getSkill('s103'), getSkill('s106'), getSkill('sp7')];
const p9Skills = [getSkill('s0'), getSkill('s5'), getSkill('s1'), getSkill('s3'), getSkill('s105'), getSkill('s100'), getSkill('s101'), getSkill('s14'), getSkill('sp8')];
const p10Skills = [getSkill('s0'), getSkill('s11'), getSkill('s30'), getSkill('s3'), getSkill('s29'), getSkill('s12'), getSkill('s1'), getSkill('sp9'), getSkill('s14')];
const p11Skills = [getSkill('s0'), getSkill('s16'), getSkill('s15'), getSkill('s100'), getSkill('s106'), getSkill('s4'), getSkill('s2'), getSkill('s102'), getSkill('sp10')];
const p12Skills = [getSkill('s0'), getSkill('s18'), getSkill('s2'), getSkill('s3'), getSkill('s4'), getSkill('s104'), getSkill('s102'), getSkill('s103'), getSkill('sp11')];
const p13Skills = [getSkill('s0'), getSkill('s19'), getSkill('s30'), getSkill('s7'), getSkill('s8'), getSkill('s15'), getSkill('s1'), getSkill('s29'), getSkill('sp12')];
const p14Skills = [getSkill('s0'), getSkill('s21'), getSkill('s15'), getSkill('s3'), getSkill('s106'), getSkill('s102'), getSkill('s6'), getSkill('s101'), getSkill('sp13')];
const p15Skills = [getSkill('s0'), getSkill('sp14'), getSkill('s106'), getSkill('s102'), getSkill('s100'), getSkill('s4'), getSkill('s22'), getSkill('s2'), getSkill('sp22')];
const p16Skills = [getSkill('s0'), getSkill('s5'), getSkill('s105'), getSkill('s3'), getSkill('s1'), getSkill('s102'), getSkill('s106'), getSkill('sp1'), getSkill('sp15')];
const p17Skills = [getSkill('s0'), getSkill('s24'), getSkill('s104'), getSkill('s3'), getSkill('s29'), getSkill('s101'), getSkill('s15'), getSkill('s100'), getSkill('sp16')];
const p18Skills = [getSkill('s0'), getSkill('sp17'), getSkill('s26'), getSkill('s102'), getSkill('s3'), getSkill('s4'), getSkill('s106'), getSkill('s2'), getSkill('s103')];
const p19Skills = [getSkill('s0'), getSkill('s27'), getSkill('s6'), getSkill('s106'), getSkill('s8'), getSkill('s102'), getSkill('s103'), getSkill('sp22'), getSkill('sp18')];
const p20Skills = [getSkill('s0'), getSkill('s29'), getSkill('s24'), getSkill('s3'), getSkill('s7'), getSkill('s1'), getSkill('s15'), getSkill('s12'), getSkill('sp20')];
const bossSkills = [getSkill('s0'), getSkill('b1'), getSkill('b2'), getSkill('bsp1'), getSkill('bsp2'), getSkill('s8'), getSkill('s30'), getSkill('s27'), getSkill('s6')];

export const PLAYER_1_INITIAL: Player = { id: 1, name: 'Player 1', hp: 100, maxHp: 100, mp: 50, maxMp: 50, stamina: 80, maxStamina: 80, position: { x: 1, y: 5 }, stats: { strength: 12, dexterity: 10, intelligence: 8, speed: 10, defense: 10, endurance: 8, luck: 5 }, skills: p1Skills, color: 'bg-blue-600', isAi: false, statusEffects: [], };

export const OPPONENTS: Player[] = [
  { id: 2, name: 'Player 2', hp: 100, maxHp: 100, mp: 60, maxMp: 60, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 8, dexterity: 10, intelligence: 12, speed: 9, defense: 8, endurance: 10, luck: 5 }, skills: p2Skills, color: 'bg-red-600', isAi: false, statusEffects: [], },
  { id: 3, name: 'Player 3', hp: 120, maxHp: 120, mp: 80, maxMp: 80, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 10, dexterity: 14, intelligence: 10, speed: 13, defense: 7, endurance: 9, luck: 8 }, skills: p3Skills, color: 'bg-purple-700', isAi: true, statusEffects: [], },
  { id: 4, name: 'Paladin Leo', hp: 130, maxHp: 130, mp: 90, maxMp: 90, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 10, dexterity: 8, intelligence: 14, speed: 8, defense: 12, endurance: 10, luck: 6 }, skills: p4Skills, color: 'bg-yellow-500', isAi: true, statusEffects: [], },
  { id: 5, name: 'Berserker Bjorn', hp: 110, maxHp: 110, mp: 40, maxMp: 40, stamina: 110, maxStamina: 110, position: { x: 9, y: 5 }, stats: { strength: 15, dexterity: 11, intelligence: 5, speed: 11, defense: 6, endurance: 12, luck: 7 }, skills: p5Skills, color: 'bg-orange-600', isAi: true, statusEffects: [], },
  { id: 6, name: 'Blood Knight Valerius', hp: 140, maxHp: 140, mp: 90, maxMp: 90, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 12, dexterity: 9, intelligence: 12, speed: 9, defense: 7, endurance: 14, luck: 5 }, skills: p6Skills, color: 'bg-rose-700', isAi: true, statusEffects: [], },
  { id: 7, name: 'Warden Kael', hp: 120, maxHp: 120, mp: 80, maxMp: 80, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 11, dexterity: 12, intelligence: 8, speed: 10, defense: 13, endurance: 9, luck: 6 }, skills: p7Skills, color: 'bg-teal-600', isAi: true, statusEffects: [], },
  { id: 8, name: 'Architect Zahra', hp: 125, maxHp: 125, mp: 100, maxMp: 100, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 8, dexterity: 10, intelligence: 15, speed: 9, defense: 11, endurance: 10, luck: 7 }, skills: p8Skills, color: 'bg-stone-500', isAi: true, statusEffects: [], },
  { id: 9, name: 'Echo Knight Kai', hp: 115, maxHp: 115, mp: 70, maxMp: 70, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 13, dexterity: 13, intelligence: 7, speed: 12, defense: 8, endurance: 9, luck: 8 }, skills: p9Skills, color: 'bg-cyan-500', isAi: true, statusEffects: [], },
  { id: 10, name: 'Marauder Jax', hp: 150, maxHp: 150, mp: 40, maxMp: 40, stamina: 120, maxStamina: 120, position: { x: 9, y: 5 }, stats: { strength: 14, dexterity: 10, intelligence: 6, speed: 10, defense: 8, endurance: 15, luck: 7 }, skills: p10Skills, color: 'bg-red-800', isAi: true, statusEffects: [], },
  { id: 11, name: 'Cryomancer Iris', hp: 130, maxHp: 130, mp: 110, maxMp: 110, stamina: 60, maxStamina: 60, position: { x: 9, y: 5 }, stats: { strength: 7, dexterity: 11, intelligence: 16, speed: 10, defense: 9, endurance: 8, luck: 7 }, skills: p11Skills, color: 'bg-sky-400', isAi: true, statusEffects: [], },
  { id: 12, name: 'Pyromancer Kaelen', hp: 120, maxHp: 120, mp: 120, maxMp: 120, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 8, dexterity: 12, intelligence: 17, speed: 11, defense: 7, endurance: 9, luck: 6 }, skills: p12Skills, color: 'bg-orange-500', isAi: true, statusEffects: [], },
  { id: 13, name: 'Stoneheart Golem', hp: 180, maxHp: 180, mp: 30, maxMp: 30, stamina: 110, maxStamina: 110, position: { x: 9, y: 5 }, stats: { strength: 16, dexterity: 5, intelligence: 5, speed: 6, defense: 18, endurance: 14, luck: 5 }, skills: p13Skills, color: 'bg-gray-500', isAi: true, statusEffects: [], },
  { id: 14, name: 'Alchemist Fiora', hp: 125, maxHp: 125, mp: 100, maxMp: 100, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 9, dexterity: 13, intelligence: 14, speed: 12, defense: 8, endurance: 10, luck: 9 }, skills: p14Skills, color: 'bg-lime-500', isAi: true, statusEffects: [], },
  { id: 15, name: 'Chronomancer Silas', hp: 110, maxHp: 110, mp: 130, maxMp: 130, stamina: 70, maxStamina: 70, position: { x: 9, y: 5 }, stats: { strength: 8, dexterity: 14, intelligence: 15, speed: 14, defense: 8, endurance: 8, luck: 8 }, skills: p15Skills, color: 'bg-indigo-400', isAi: true, statusEffects: [], },
  { id: 16, name: 'Illusionist Lyra', hp: 115, maxHp: 115, mp: 110, maxMp: 110, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 9, dexterity: 15, intelligence: 13, speed: 13, defense: 9, endurance: 9, luck: 10 }, skills: p16Skills, color: 'bg-fuchsia-500', isAi: true, statusEffects: [], },
  { id: 17, name: 'Phantom Ranger Vex', hp: 120, maxHp: 120, mp: 60, maxMp: 60, stamina: 100, maxStamina: 100, position: { x: 9, y: 5 }, stats: { strength: 11, dexterity: 16, intelligence: 8, speed: 12, defense: 8, endurance: 11, luck: 9 }, skills: p17Skills, color: 'bg-green-600', isAi: true, statusEffects: [], },
  { id: 18, name: 'Stormcaller Raiden', hp: 130, maxHp: 130, mp: 110, maxMp: 110, stamina: 80, maxStamina: 80, position: { x: 9, y: 5 }, stats: { strength: 10, dexterity: 12, intelligence: 15, speed: 11, defense: 9, endurance: 10, luck: 8 }, skills: p18Skills, color: 'bg-blue-400', isAi: true, statusEffects: [], },
  { id: 19, name: 'Dreadlich Malakor', hp: 140, maxHp: 140, mp: 140, maxMp: 140, stamina: 60, maxStamina: 60, position: { x: 9, y: 5 }, stats: { strength: 9, dexterity: 9, intelligence: 18, speed: 8, defense: 10, endurance: 12, luck: 6 }, skills: p19Skills, color: 'bg-gray-800', isAi: true, statusEffects: [], },
  { id: 20, name: 'Champion Aurelia', hp: 160, maxHp: 160, mp: 90, maxMp: 90, stamina: 110, maxStamina: 110, position: { x: 9, y: 5 }, stats: { strength: 15, dexterity: 12, intelligence: 10, speed: 12, defense: 14, endurance: 13, luck: 8 }, skills: p20Skills, color: 'bg-amber-400', isAi: true, statusEffects: [], },
  { id: 21, name: 'Abyssal Tyrant', hp: 300, maxHp: 300, mp: 200, maxMp: 200, stamina: 150, maxStamina: 150, position: { x: 9, y: 5 }, stats: { strength: 18, dexterity: 10, intelligence: 18, speed: 10, defense: 16, endurance: 20, luck: 10 }, skills: bossSkills, color: 'bg-black', isAi: true, statusEffects: [], },
];

export const INITIAL_PLAYERS: Player[] = [
  PLAYER_1_INITIAL,
  OPPONENTS[0],
];
