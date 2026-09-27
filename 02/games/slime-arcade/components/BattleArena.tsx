import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Slime, Ability, StatusEffect, BattleAbility, SlimeStat, SlimeStats, BattleEnvironment } from '../types';
import SlimeCard from './SlimeCard';
import { generateBattleSummary, getBattleCommentaryStream } from '../services/geminiService';
import Modal from './Modal';

interface BattleArenaProps {
    playerSlime: Slime;
    opponentSlime: Slime;
    setPlayerSlime: React.Dispatch<React.SetStateAction<Slime | null>>;
    onBattleEnd: (playerWon: boolean) => void;
    environment: BattleEnvironment | null;
}

interface BattleSlime extends Slime {
  battleAbilities: BattleAbility[];
  statusEffects: StatusEffect[];
  regenerationUses: number;
}

type Action = {
    type: 'Attack' | 'Defend' | 'Ability';
    ability?: Ability;
}

interface TurnBreakdownDetails {
    actorName: string;
    actionName: string;
    isAttack: boolean;
    roll: number;
    statValue: number;
    totalPower: number;
    targetDefense: number;
    damageCalcText: string;
    modifiers: string[];
    finalDamage: number;
    wasEvaded: boolean;
    wasCrit: boolean;
    healAmount: number;
    multiHitDetails: { hit: number; damage: number; evaded: boolean }[];
    counterAttackDamage: number;
    poisonDamage: number;
    envDamage: number;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const BattleArena: React.FC<BattleArenaProps> = ({ playerSlime, opponentSlime, setPlayerSlime, onBattleEnd, environment }) => {
    const initializeBattleSlime = (slime: Slime): BattleSlime => ({
        ...slime,
        currentHp: slime.stats.HP,
        battleAbilities: slime.equippedAbilities.map(ability => ({ ability, cooldown: 0, charge: 0 })),
        statusEffects: [],
        regenerationUses: 0,
    });

    const [player, setPlayer] = useState<BattleSlime>(initializeBattleSlime(playerSlime));
    const [opponent, setOpponent] = useState<BattleSlime>(initializeBattleSlime(opponentSlime));
    
    const [battleHistory, setBattleHistory] = useState<string[]>([]);
    const [turn, setTurn] = useState(1);
    const [winner, setWinner] = useState<string | null>(null);
    const [isResolvingTurn, setIsResolvingTurn] = useState(false);
    const [commentaryLog, setCommentaryLog] = useState<string[]>([]);
    const commentaryBoxRef = useRef<HTMLDivElement>(null);
    const [turnBreakdown, setTurnBreakdown] = useState<{player: Partial<TurnBreakdownDetails>, opponent: Partial<TurnBreakdownDetails>} | null>(null);
    const [playerHit, setPlayerHit] = useState(false);
    const [opponentHit, setOpponentHit] = useState(false);
    const [playerFeedback, setPlayerFeedback] = useState('');
    const [opponentFeedback, setOpponentFeedback] = useState('');
    const [playerAbilityAnimation, setPlayerAbilityAnimation] = useState<string | null>(null);
    const [opponentAbilityAnimation, setOpponentAbilityAnimation] = useState<string | null>(null);
    const [isAutoBattle, setIsAutoBattle] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [tooltipAbility, setTooltipAbility] = useState<Ability | {name: string, description: string, customDamageFormula: string, customDefenseFormula: string} | null>(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [summaryText, setSummaryText] = useState('');
    const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
    
    const addHistoryLog = useCallback((text: string) => {
        setBattleHistory(prev => [`Turn ${turn}: ${text}`, ...prev.slice(0, 49)]);
    }, [turn]);

    const showFeedback = useCallback((target: 'player' | 'opponent', text: string) => {
        if (target === 'player') { setPlayerHit(true); setPlayerFeedback(text); } 
        else { setOpponentHit(true); setOpponentFeedback(text); }
        setTimeout(() => {
            setPlayerHit(false); setOpponentHit(false);
            setPlayerFeedback(''); setOpponentFeedback('');
        }, 820);
    }, []);

    const streamCommentary = useCallback(async (prompt: string) => {
        const newEntryIndex = commentaryLog.length;
        setCommentaryLog(prev => [...prev, `Turn ${turn}: `]);
        try {
            const stream = await getBattleCommentaryStream(prompt);
            for await (const chunk of stream) {
                setCommentaryLog(prev => {
                    const newLog = [...prev];
                    newLog[newEntryIndex] = (newLog[newEntryIndex] || '') + chunk.text;
                    return newLog;
                });
            }
        } catch (error) {
            console.error("Failed to get battle commentary:", error);
            setCommentaryLog(prev => {
                const newLog = [...prev];
                newLog[newEntryIndex] = `Turn ${turn}: Barnaby seems to be having technical difficulties!`;
                return newLog;
            });
        }
    }, [turn, commentaryLog.length]);

    useEffect(() => {
        if (commentaryBoxRef.current) {
            commentaryBoxRef.current.scrollTop = commentaryBoxRef.current.scrollHeight;
        }
    }, [commentaryLog]);
    
    const getEffectiveStat = useCallback((slime: BattleSlime, stat: SlimeStat): number => {
        const baseValue = slime.stats[stat];
        
        let additiveModifiers = slime.statusEffects
            .filter(e => e.type === 'STAT_MODIFICATION' && e.stat === stat)
            .reduce((acc, e) => acc + (e.value ?? 0), 0);
        
        // Apply environment effect
        if (environment?.effect.type === 'STAT_MOD' && environment.effect.stat === stat) {
            additiveModifiers += environment.effect.value;
        }

        const multiplicativeModifiers = slime.statusEffects
            .filter(e => e.type === 'STAT_MULTIPLIER' && e.stat === stat)
            .reduce((acc, e) => acc * (e.value ?? 1), 1);

        const modifiedValue = (baseValue + additiveModifiers) * multiplicativeModifiers;
        return Math.max(0, Math.round(modifiedValue));
    }, [environment]);

    const resolveAttack = useCallback((attacker: BattleSlime, defender: BattleSlime, defenderAction: Action, attackAbility?: Ability ): { damage: number; summary: string; breakdown: Partial<TurnBreakdownDetails> } => {
        const breakdown: Partial<TurnBreakdownDetails> = { modifiers: [], wasCrit: false, wasEvaded: false };
        let summary = '';
        const guaranteedEvasion = defender.statusEffects.some(e => e.type === 'GUARANTEED_EVASION'); if (guaranteedEvasion) { summary = `${defender.name} completely evades the attack! `; breakdown.wasEvaded = true; return { damage: 0, summary, breakdown }; }
        const probabilisticEvasion = defender.statusEffects.find(e => e.type === 'PROBABILISTIC_EVASION'); if (probabilisticEvasion && (Math.random() * 100 < (probabilisticEvasion.value ?? 0))) { summary = `${defender.name} swiftly evades the attack! `; breakdown.wasEvaded = true; if (probabilisticEvasion.name === 'Gel Slide') { const counterBase = probabilisticEvasion.counterBaseDamage || 1; const counterMult = probabilisticEvasion.counterDamageMultiplier || 0.5; const counterDamage = Math.max(1, Math.round(counterBase + getEffectiveStat(defender, 'ATK') * counterMult)); breakdown.counterAttackDamage = counterDamage; summary += `and counters for ${counterDamage} damage!`; } return { damage: 0, summary, breakdown }; }
        const accuracyDiceRoll = Math.floor(Math.random() * 6) + 1; const luckBonus = Math.floor(getEffectiveStat(attacker, 'LUK') / 5); const speedPenalty = Math.floor(getEffectiveStat(defender, 'SPD') / 5); const hitScore = accuracyDiceRoll + luckBonus; const targetScore = 4 + speedPenalty;
        let isHit = hitScore >= targetScore; if (accuracyDiceRoll === 1) isHit = false; if (accuracyDiceRoll === 6) isHit = true;
        breakdown.modifiers!.push(`Hit Roll: D6(${accuracyDiceRoll}) + ${luckBonus} LUK ≥ ${targetScore} (4 + ${speedPenalty} SPD)`);
        if (!isHit) { summary = `${attacker.name}'s attack missed!`; breakdown.wasEvaded = true; return { damage: 0, summary, breakdown }; }
        let baseAttackPower = getEffectiveStat(attacker, 'ATK'); const damageDiceRoll = Math.floor(Math.random() * 6) + 1;
        if (attackAbility) { baseAttackPower += (attackAbility.baseDamage || 0); baseAttackPower = Math.round(baseAttackPower * (attackAbility.damageMultiplier || 1)); }
        const attackPower = baseAttackPower + damageDiceRoll; breakdown.roll = damageDiceRoll; breakdown.totalPower = attackPower; breakdown.statValue = getEffectiveStat(attacker, 'ATK');
        const defenseDiceRoll = defenderAction.type === 'Defend' ? (Math.floor(Math.random() * 6) + 1) : 0; let defensePower = getEffectiveStat(defender, 'DEF') + defenseDiceRoll; breakdown.targetDefense = defensePower;
        const baseCritChance = 5; const critResistEffect = defender.statusEffects.find(e => e.type === 'CRIT_CHANCE_REDUCTION'); const critResistance = critResistEffect?.value ?? 0; const critChance = Math.max(0, baseCritChance + (getEffectiveStat(attacker, 'LUK') * 0.5) - (getEffectiveStat(defender, 'LUK') * 0.25) - critResistance); const critRoll = Math.random() * 100; const isCrit = critRoll < critChance; let critMultiplier = 1;
        breakdown.modifiers!.push(`Crit Chance: ${critChance.toFixed(1)}%`);
        if (isCrit) { critMultiplier = 1.5; summary += 'A critical hit! '; breakdown.wasCrit = true; breakdown.modifiers!.push(`CRITICAL HIT! (1.5x Dmg)`); }
        let calculatedDamage = (attackPower - defensePower); breakdown.damageCalcText = `${attackPower} Power - ${defensePower} DEF = ${Math.max(0, calculatedDamage)}`;
        const damageReductionEffect = defender.statusEffects.find(e => e.type === 'DAMAGE_REDUCTION'); const damageReduction = damageReductionEffect?.value ?? 0; if (calculatedDamage > 0 && damageReduction > 0) { calculatedDamage *= (1 - damageReduction); breakdown.modifiers!.push(`Reduced by ${damageReduction*100}%`); }
        const finalDamage = Math.max(1, Math.round(calculatedDamage * critMultiplier)); breakdown.finalDamage = finalDamage; summary += `${attacker.name} attacks ${defender.name} for ${finalDamage} damage. `;
        return { damage: finalDamage, summary, breakdown };
    }, [getEffectiveStat]);

    const handlePlayerAction = useCallback(async (action: 'Basic' | Ability) => {
        setIsResolvingTurn(true);
        setTurnBreakdown(null);
        let playerDamageDealt = 0, opponentDamageDealt = 0;
        let playerHealAmount = 0, opponentHealAmount = 0;
        let summaryLog = '';
        let tempPlayerState = JSON.parse(JSON.stringify(player));
        let tempOpponentState = JSON.parse(JSON.stringify(opponent));
        let playerEnvDamage = 0, opponentEnvDamage = 0;

        let playerPoisonDamage = 0; let opponentPoisonDamage = 0;
        const playerPoison = tempPlayerState.statusEffects.find((e: StatusEffect) => e.type === 'POISON'); if (playerPoison) playerPoisonDamage = playerPoison.value ?? 0;
        const opponentPoison = tempOpponentState.statusEffects.find((e: StatusEffect) => e.type === 'POISON'); if (opponentPoison) opponentPoisonDamage = opponentPoison.value ?? 0;
        if (playerPoisonDamage > 0) summaryLog += `${player.name} takes ${playerPoisonDamage} poison damage. `;
        if (opponentPoisonDamage > 0) summaryLog += `${opponent.name} takes ${opponentPoisonDamage} poison damage. `;

        const playerBreakdown: Partial<TurnBreakdownDetails> = { actorName: player.name, isAttack: false, healAmount: 0, modifiers: [], multiHitDetails: [], counterAttackDamage: 0, poisonDamage: playerPoisonDamage, envDamage: 0 };
        const opponentBreakdown: Partial<TurnBreakdownDetails> = { actorName: opponent.name, isAttack: false, healAmount: 0, modifiers: [], multiHitDetails: [], counterAttackDamage: 0, poisonDamage: opponentPoisonDamage, envDamage: 0 };
        
        let playerAction: Action;
        if (action === 'Basic') { playerAction = { type: Math.random() < 0.5 ? 'Attack' : 'Defend' }; playerBreakdown.actionName = `Basic ${playerAction.type}`; } 
        else { playerAction = { type: 'Ability', ability: action }; playerBreakdown.actionName = action.name; }
        
        let opponentAction: Action;
        const usableOpponentAbilities = tempOpponentState.battleAbilities.filter((ba: BattleAbility) => ba.cooldown <= 0).map((ba: BattleAbility) => ba.ability);
        if (usableOpponentAbilities.length > 0 && Math.random() < 0.5) { const randomAbility = usableOpponentAbilities[Math.floor(Math.random() * usableOpponentAbilities.length)]; opponentAction = { type: 'Ability', ability: randomAbility }; opponentBreakdown.actionName = randomAbility.name; }
        else { opponentAction = { type: Math.random() < 0.6 ? 'Attack' : 'Defend' }; opponentBreakdown.actionName = `Basic ${opponentAction.type}`; }

        const resolveAbility = (user: BattleSlime, target: BattleSlime, tempUser: BattleSlime, tempTarget: BattleSlime, userAction: Action, targetAction: Action, ability: Ability, breakdown: Partial<TurnBreakdownDetails>) => {
            let damage = 0; let heal = 0; let abilitySummary = ''; if (!ability) return { damage, heal, abilitySummary };
            const isPlayer = user.name === player.name; if (isPlayer) { setPlayerAbilityAnimation(ability.name); setTimeout(() => setPlayerAbilityAnimation(null), 1000); } else { setOpponentAbilityAnimation(ability.name); setTimeout(() => setOpponentAbilityAnimation(null), 1000); }
            const abilityInState = tempUser.battleAbilities.find((ba: BattleAbility) => ba.ability.name === ability.name);
            if (abilityInState) {
                let cooldown = ability.cooldownTurns;
                if (environment?.name === 'Arcane Sanctuary') cooldown = Math.max(1, cooldown - 1);
                abilityInState.cooldown = cooldown + 1;
            }
            abilitySummary += `${user.name} uses ${ability.name}! `;
            if (ability.name === 'Ooze Barrage') { breakdown.isAttack = true; for (let i = 0; i < 3; i++) { const { damage: hitDamage, summary, breakdown: hitBreakdown } = resolveAttack(tempUser, tempTarget, targetAction, ability); damage += hitDamage; summaryLog += summary; breakdown.multiHitDetails!.push({ hit: i + 1, damage: hitDamage, evaded: hitBreakdown.wasEvaded ?? false }); } }
            else if (ability.type === 'ATTACK') { breakdown.isAttack = true; const { damage: attackDamage, summary, breakdown: attackBreakdown } = resolveAttack(tempUser, tempTarget, targetAction, ability); damage = attackDamage; abilitySummary += summary; Object.assign(breakdown, attackBreakdown); if (!attackBreakdown.wasEvaded) { if (ability.name === 'Slime Spit') tempTarget.statusEffects.push({ name: 'Poison', duration: 4, type: 'POISON', value: 1 }); if (ability.name === 'Leeching Ooze') { tempUser.statusEffects.push({ name: 'ATK Leech (Buff)', duration: 3, type: 'STAT_MODIFICATION', stat: 'ATK', value: 2 }); tempTarget.statusEffects.push({ name: 'ATK Leech (Debuff)', duration: 3, type: 'STAT_MODIFICATION', stat: 'ATK', value: -2 }); } if (ability.name === 'Corrosive Slime') { tempTarget.statusEffects.push({ name: 'Corroded', duration: 3, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 0.8 }); } } }
            else if (ability.type === 'DEFENSE') { if (ability.name === 'Regeneration') { const healAmount = 2 + Math.floor(getEffectiveStat(tempUser, 'DEF') * 0.5); heal = healAmount; breakdown.healAmount = healAmount; abilitySummary += ` It restores ${healAmount} HP! `; const penalty = -1 * Math.pow(2, tempUser.regenerationUses); tempUser.regenerationUses++; tempUser.statusEffects.push({ name: `Regen Sickness`, duration: 3, type: 'STAT_MODIFICATION', stat: 'DEF', value: penalty }); } else { let newEffect: StatusEffect | undefined; if (ability.name === 'Iron Slime') newEffect = { name: ability.name, duration: 3, type: 'DAMAGE_REDUCTION', value: 0.5 }; if (ability.name === 'Brace') newEffect = { name: 'Braced', duration: 3, type: 'STAT_MODIFICATION', stat: 'DEF', value: 3 }; if (ability.name === 'Slime Wall') newEffect = { name: ability.name, duration: 2, type: 'GUARANTEED_EVASION' }; if (ability.name === 'Hardened Carapace') { tempUser.statusEffects.push({ name: 'Hardened', duration: 4, type: 'STAT_MODIFICATION', stat: 'DEF', value: 2 }); tempUser.statusEffects.push({ name: 'Crit Resistant', duration: 4, type: 'CRIT_CHANCE_REDUCTION', value: 25 }); } if (newEffect) tempUser.statusEffects.push(newEffect); } }
            else if (ability.type === 'EVASION') { if (ability.name === 'Slime Blink') { tempUser.statusEffects.push({ name: ability.name, duration: 2, type: 'GUARANTEED_EVASION' }); tempUser.statusEffects.push({ name: 'Hasted', duration: 2, type: 'STAT_MODIFICATION', stat: 'SPD', value: 2 }); } if (ability.name === 'Dodge Roll') tempUser.statusEffects.push({ name: ability.name, duration: 2, type: 'PROBABILISTIC_EVASION', value: 50 }); if (ability.name === 'Gel Slide') tempUser.statusEffects.push({ name: ability.name, duration: 2, type: 'PROBABILISTIC_EVASION', value: 75, counterDamageMultiplier: 0.5, counterBaseDamage: 1 }); }
            else if (ability.type === 'ENVIRONMENT') { if (ability.name === 'Savage Stance') tempUser.statusEffects.push({ name: 'Savage', duration: 4, type: 'STAT_MULTIPLIER', stat: 'ATK', value: 1.15 }); if (ability.name === 'Resilient Stance') tempUser.statusEffects.push({ name: 'Resilient', duration: 4, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 1.15 }); if (ability.name === 'Quick Stance') tempUser.statusEffects.push({ name: 'Quick', duration: 4, type: 'STAT_MULTIPLIER', stat: 'SPD', value: 1.15 }); if (ability.name === 'Lucky Stance') tempUser.statusEffects.push({ name: 'Lucky', duration: 4, type: 'STAT_MULTIPLIER', stat: 'LUK', value: 1.15 }); if (ability.name === 'Overdrive') { tempUser.statusEffects.push({ name: 'Overdrive (ATK)', duration: 4, type: 'STAT_MULTIPLIER', stat: 'ATK', value: 1.25 }); tempUser.statusEffects.push({ name: 'Overdrive (DEF)', duration: 4, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 0.85 }); } if (ability.name === 'Adrenaline Rush') { tempUser.statusEffects.push({ name: 'Adrenaline (ATK)', duration: 4, type: 'STAT_MULTIPLIER', stat: 'ATK', value: 1.25 }); tempUser.statusEffects.push({ name: 'Adrenaline (SPD)', duration: 4, type: 'STAT_MULTIPLIER', stat: 'SPD', value: 1.25 }); } if (ability.name === 'Muddy Terrain') tempTarget.statusEffects.push({ name: 'Muddied', duration: 3, type: 'STAT_MODIFICATION', stat: 'SPD', value: -2 }); if (ability.name === 'Sticky Field') tempTarget.statusEffects.push({ name: 'Sticky', duration: 3, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 0.5 }); if (ability.name === 'Momentum Shift') { tempUser.statusEffects.push({ name: 'Offensive Stance', duration: 4, type: 'STAT_MULTIPLIER', stat: 'ATK', value: 1.5 }); tempUser.statusEffects.push({ name: 'Lowered Guard', duration: 4, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 0.75 }); } if (ability.name === 'Unstable Core') { tempUser.statusEffects.push({ name: 'Unstable ATK', duration: 999, type: 'STAT_MULTIPLIER', stat: 'ATK', value: 1.10 }); tempUser.statusEffects.push({ name: 'Unstable DEF', duration: 999, type: 'STAT_MULTIPLIER', stat: 'DEF', value: 0.90 }); } if (ability.name === 'Environmental Surprise') { const roll = Math.random() * 100; let randomEvent = ''; if (roll < 50) { const buffs = ['+2 ATK', '+2 SPD']; randomEvent = buffs[Math.floor(Math.random() * buffs.length)]; if (randomEvent === '+2 ATK') tempUser.statusEffects.push({name: 'Surprise Buff', duration: 2, type: 'STAT_MODIFICATION', stat: 'ATK', value: 2}); if (randomEvent === '+2 SPD') tempUser.statusEffects.push({name: 'Surprise Buff', duration: 2, type: 'STAT_MODIFICATION', stat: 'SPD', value: 2}); } else if (roll < 80) { randomEvent = 'Opponent Miss'; tempTarget.statusEffects.push({name: 'Distracted', duration: 2, type: 'GUARANTEED_EVASION'}); } else { randomEvent = '1-3 Damage'; const dmg = Math.floor(Math.random() * 3) + 1; damage += dmg; breakdown.finalDamage = (breakdown.finalDamage || 0) + dmg; } abilitySummary += ` A random event occurs: ${randomEvent}! `; } }
            return { damage, heal, abilitySummary };
        };
        
        if (opponentAction.type === 'Attack') { opponentBreakdown.isAttack = true; const { damage, summary, breakdown } = resolveAttack(tempOpponentState, tempPlayerState, playerAction); opponentDamageDealt = damage; summaryLog += summary; Object.assign(opponentBreakdown, breakdown); }
        if (playerAction.type === 'Attack') { playerBreakdown.isAttack = true; const { damage, summary, breakdown } = resolveAttack(tempPlayerState, tempOpponentState, opponentAction); playerDamageDealt = damage; summaryLog += summary; Object.assign(playerBreakdown, breakdown); }
        if(playerAction.ability) { const { damage, heal, abilitySummary } = resolveAbility(player, opponent, tempPlayerState, tempOpponentState, playerAction, opponentAction, playerAction.ability, playerBreakdown); playerDamageDealt += damage; playerHealAmount += heal; summaryLog += abilitySummary; }
        if(opponentAction.ability) { const { damage, heal, abilitySummary } = resolveAbility(opponent, player, tempOpponentState, tempPlayerState, opponentAction, playerAction, opponentAction.ability, opponentBreakdown); opponentDamageDealt += damage; opponentHealAmount += heal; summaryLog += abilitySummary; }
        if (opponentBreakdown.counterAttackDamage) opponentDamageDealt += opponentBreakdown.counterAttackDamage; if (playerBreakdown.counterAttackDamage) playerDamageDealt += playerBreakdown.counterAttackDamage;
        if (playerAction.type === 'Defend' && opponentAction.type === 'Defend') summaryLog = "Both slimes take a defensive stance! A tense standoff!";
        
        // --- 3. APPLY ENVIRONMENT & END OF TURN ---
        if (environment?.effect.type === 'DOT' && environment.effect.value > 0) {
            playerEnvDamage = environment.effect.value; opponentEnvDamage = environment.effect.value;
            summaryLog += `The ${environment.name} burns both slimes for ${playerEnvDamage} damage. `;
        }
        if (environment?.name === 'Overgrown Jungle' && Math.random() < 0.1) {
            if (Math.random() < 0.5) { tempPlayerState.statusEffects.push({ name: 'Ensnared', duration: 2, type: 'GUARANTEED_EVASION' }); summaryLog += `${player.name} got ensnared by vines and can't move! `;}
            else { tempOpponentState.statusEffects.push({ name: 'Ensnared', duration: 2, type: 'GUARANTEED_EVASION' }); summaryLog += `${opponent.name} got ensnared by vines and can't move! `;}
        }

        playerBreakdown.envDamage = playerEnvDamage; opponentBreakdown.envDamage = opponentEnvDamage;
        setTurnBreakdown({ player: playerBreakdown, opponent: opponentBreakdown });
        addHistoryLog(summaryLog.trim()); streamCommentary(summaryLog.trim());

        const newPlayerHp = Math.min(tempPlayerState.stats.HP, tempPlayerState.currentHp - opponentDamageDealt - playerPoisonDamage - playerEnvDamage + playerHealAmount);
        const newOpponentHp = Math.min(tempOpponentState.stats.HP, tempOpponentState.currentHp - playerDamageDealt - opponentPoisonDamage - opponentEnvDamage + opponentHealAmount);
        
        if (opponentDamageDealt > 0) showFeedback('player', `-${opponentDamageDealt}`);
        if (playerDamageDealt > 0) showFeedback('opponent', `-${playerDamageDealt}`);
        if (playerHealAmount > 0) showFeedback('player', `+${playerHealAmount}`);
        if (opponentHealAmount > 0) showFeedback('opponent', `+${opponentHealAmount}`);
        if (playerPoisonDamage > 0) showFeedback('player', `-${playerPoisonDamage}☣️`);
        if (opponentPoisonDamage > 0) showFeedback('opponent', `-${opponentPoisonDamage}☣️`);
        if (playerEnvDamage > 0) showFeedback('player', `-${playerEnvDamage}🔥`);
        if (opponentEnvDamage > 0) showFeedback('opponent', `-${opponentEnvDamage}🔥`);

        await delay(1000);

        const tickDown = (slime: BattleSlime): BattleSlime => ({ ...slime, statusEffects: slime.statusEffects.map(e => ({...e, duration: e.duration - 1})).filter(e => e.duration > 0), battleAbilities: slime.battleAbilities.map(ba => ({...ba, cooldown: Math.max(0, ba.cooldown - 1)})) });
        const finalPlayerState = tickDown({ ...tempPlayerState, currentHp: newPlayerHp });
        const finalOpponentState = tickDown({ ...tempOpponentState, currentHp: newOpponentHp });
        
        setPlayer(finalPlayerState); setOpponent(finalOpponentState);

        if (newPlayerHp <= 0 || newOpponentHp <= 0) {
            let winnerName = '';
            if (newPlayerHp <= 0 && newOpponentHp <= 0) { winnerName = 'Draw'; } 
            else if (newPlayerHp <= 0) { winnerName = opponent.name; } 
            else { winnerName = player.name; }
            setWinner(winnerName);
        } else {
             setTurn(t => t + 1); setIsResolvingTurn(false);
        }
    }, [player, opponent, turn, addHistoryLog, streamCommentary, showFeedback, resolveAttack, getEffectiveStat, environment]);
    
    useEffect(() => {
        if (isAutoBattle && !isResolvingTurn && !winner) {
            const autoPlayTimer = setTimeout(() => {
                const usableAbilities = player.battleAbilities.filter(ba => { if (ba.cooldown > 0 || ba.charge > 0) return false; if (ba.ability.name === 'Regeneration') return (player.currentHp / player.stats.HP) < 0.5; if (ba.ability.condition?.type === 'HP_BELOW_PERCENT') { if ((player.currentHp / player.stats.HP) >= ba.ability.condition.value) return false; } return true; }).map(ba => ba.ability);
                const possibleActions: Array<'Basic' | Ability> = ['Basic', ...usableAbilities]; const randomAction = possibleActions[Math.floor(Math.random() * possibleActions.length)]; handlePlayerAction(randomAction);
            }, 1500); return () => clearTimeout(autoPlayTimer);
        }
    }, [isAutoBattle, isResolvingTurn, winner, player, handlePlayerAction]);

    useEffect(() => {
        let initialLog = `Battle starts between ${player.name} and ${opponent.name}!`;
        if (environment) initialLog += `\nEnvironment: ${environment.name} - ${environment.description}`;
        addHistoryLog(initialLog);
        streamCommentary(initialLog);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { setPlayerSlime(p => p ? {...p, currentHp: player.currentHp } : null); }, [player.currentHp, setPlayerSlime]);

    useEffect(() => {
        if (winner) {
            const finalLog = battleHistory.join('\n');
            const triggerSummary = async () => {
                setIsGeneratingSummary(true);
                setShowSummaryModal(true);
                try {
                    const stream = await generateBattleSummary(player.name, finalLog);
                    let text = '';
                    for await (const chunk of stream) {
                        text += chunk.text;
                        setSummaryText(text);
                    }
                } catch (error) {
                    console.error("Failed to generate battle summary:", error);
                    setSummaryText("Barnaby is speechless! An unforgettable battle!");
                } finally {
                    setIsGeneratingSummary(false);
                }
            };
            triggerSummary();
        }
    }, [winner, battleHistory, player.name]);

    const AbilityTooltip = ({ ability }: { ability: any }) => (
        <div className="pixel-border p-3 bg-black text-green-400 max-w-xs text-left">
            <h4 className="text-lg font-bold text-yellow-300">{ability.name} <span className="text-sm font-normal text-gray-400">({ability.type})</span></h4>
            <p className="text-sm my-2">{ability.description}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs my-3 text-gray-300">
                {ability.chargeUpTurns > 0 && (<> <span className="font-bold">Charge:</span> <span>{ability.chargeUpTurns} turn(s)</span> </>)}
                {ability.cooldownTurns > 0 && (<> <span className="font-bold">Cooldown:</span> <span>{ability.cooldownTurns} turns</span> </>)}
                {ability.customDamageFormula || (ability.type === 'ATTACK' && (ability.baseDamage != null || ability.damageMultiplier != null)) ? ( <> <span className="font-bold">Damage:</span> <span> {ability.customDamageFormula ? ability.customDamageFormula : [ ability.baseDamage ? ability.baseDamage.toString() : null, ability.damageMultiplier ? `${ability.damageMultiplier}x ATK` : null ].filter(Boolean).join(' + ')} </span> </> ) : null}
                 {ability.customDefenseFormula ? ( <> <span className="font-bold">Defense:</span> <span>{ability.customDefenseFormula}</span> </> ) : null}
            </div>
             <p className="text-xs italic text-gray-400 mt-1">Hit Roll: D6 (1=Miss, 6=Hit) + (LUK - opp SPD) bonus.</p>
        </div>
    );
    const basicActionForTooltip = { name: 'Basic Action', description: 'A 50/50 chance to perform a basic Attack or a basic Defend.', type: 'ATTACK/DEFEND', customDamageFormula: 'ATK + 1-6 (Roll)', customDefenseFormula: 'DEF + 1-6 (Roll)' };
    const BeastmasterCommentary = () => (
        <div ref={commentaryBoxRef} className="pixel-border p-4 h-[calc(100vh-12rem)] overflow-y-auto bg-black/50">
             <h3 className="text-xl text-center mb-4 flicker text-yellow-400">BEASTMASTER'S BOOTH</h3>
             {environment && <p className="text-sm mb-2 text-center text-cyan-300">{environment.name}</p>}
             <div className="space-y-2 text-sm whitespace-pre-wrap"> {commentaryLog.map((entry, index) => ( <p key={index} className="border-t border-dashed border-gray-700 pt-2">{entry}</p> ))} </div>
        </div>
    );
// Fix: Implement TurnResolutionPanel to return JSX and display turn breakdown details.
    const TurnResolutionPanel = () => {
        if (!turnBreakdown) return null;

        const BreakdownDisplay = ({ details }: { details: Partial<TurnBreakdownDetails> }) => {
            if (!details || Object.keys(details).length === 0) return null;
            return (
                <div className="flex-1 pixel-border p-2 space-y-1 bg-black/30">
                    <h4 className="text-center text-lg">{details.actorName} uses {details.actionName}</h4>
                    {details.isAttack && (
                        <>
                            {details.wasEvaded ? (
                                <p className="text-center text-cyan-300">-- MISSED / EVADED --</p>
                            ) : (
                                <>
                                    <p>Damage: <span className="text-xl text-red-400">{details.finalDamage}</span> {details.wasCrit && <span className="text-yellow-400 flicker">(CRIT!)</span>}</p>
                                    <p className="text-xs text-gray-400">({details.damageCalcText})</p>
                                </>
                            )}
                            {details.modifiers?.map((mod, i) => <p key={i} className="text-xs text-gray-400">{mod}</p>)}
                            {details.multiHitDetails && details.multiHitDetails.length > 0 && (
                                <div className="text-xs">
                                    {details.multiHitDetails.map(hit => (
                                        <p key={hit.hit}>Hit {hit.hit}: {hit.evaded ? 'Evaded' : `${hit.damage} dmg`}</p>
                                    ))}
                                </div>
                            )}
                            {details.counterAttackDamage && details.counterAttackDamage > 0 && <p className="text-sm text-orange-400">Counter Damage: {details.counterAttackDamage}</p>}
                        </>
                    )}
                    {details.healAmount && details.healAmount > 0 && <p>Healed: <span className="text-xl text-green-300">{details.healAmount} HP</span></p>}
                    {details.poisonDamage && details.poisonDamage > 0 && <p className="text-sm text-purple-400">Poison Damage: {details.poisonDamage}</p>}
                    {details.envDamage && details.envDamage > 0 && <p className="text-sm text-red-600">Env. Damage: {details.envDamage}</p>}
                </div>
            );
        };
        
        return (
            <div className="pixel-border p-2 my-4 bg-black/50">
                <h3 className="text-center text-xl mb-2 text-yellow-300">Turn {turn - 1} Resolution</h3>
                <div className="flex gap-2">
                    <BreakdownDisplay details={turnBreakdown.player} />
                    <BreakdownDisplay details={turnBreakdown.opponent} />
                </div>
            </div>
        );
    };
    const HelpModal = () => (
         <Modal onClose={() => setShowHelp(false)}>
             <div className="flex flex-col h-[85vh]">
                <h2 className="text-2xl text-center mb-4">BATTLE ARENA – HOW TO FIGHT</h2>
                <div className="space-y-3 overflow-y-auto pr-2 text-sm">
                    <div>
                        <h3 className="text-lg text-yellow-300">🎯 The Goal</h3>
                        <p>Reduce your opponent’s HP to 0 before they do the same to you!</p>
                    </div>
                    <div>
                        <h3 className="text-lg text-yellow-300">🔄 Turn Basics</h3>
                        <p>Each turn, you and your opponent choose an action. Results are calculated and displayed in the Turn Resolution Panel. Speed (SPD) may let one slime act first.</p>
                    </div>
                    <div>
                        <h3 className="text-lg text-yellow-300">⚔️ Actions</h3>
                        <ul className="list-disc list-inside ml-2">
                            <li><strong>Basic Action:</strong> A 50/50 chance to either Attack or Defend.</li>
                            <li><strong>Attack:</strong> Deals damage based on ATK + a dice roll (1–6).</li>
                            <li><strong>Defend:</strong> Reduces incoming damage with DEF + a dice roll (1–6).</li>
                            <li><strong>Abilities:</strong> Powerful skills with unique effects. Each has a cooldown—use wisely!</li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="text-lg text-yellow-300">📊 Stats Explained</h3>
                         <ul className="list-disc list-inside ml-2">
                            <li><strong>HP (Health Points):</strong> Your slime’s life force. Reaches 0 → you lose.</li>
                            <li><strong>ATK (Attack):</strong> Base power for your damage.</li>
                            <li><strong>DEF (Defense):</strong> Reduces damage you receive.</li>
                            <li><strong>SPD (Speed):</strong> Penalizes the opponent's accuracy roll, making you harder to hit.</li>
                            <li><strong>LUK (Luck):</strong> Adds a bonus to your accuracy roll and increases your critical hit chance (1.5× damage on crits).</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-lg text-yellow-300">✨ Abilities & Status Effects</h3>
                        <p>Abilities can deal extra damage, apply buffs (positive boosts), or inflict debuffs (negative effects). Status Effects can alter stats temporarily, guarantee evasion, or apply ongoing effects like poison.</p>
                    </div>
                    <div>
                        <h3 className="text-lg text-yellow-300">🧮 Turn Resolution Panel</h3>
                        <p>This is a breakdown of the math for each turn:</p>
                        <ol className="list-decimal list-inside ml-2 space-y-1 mt-2">
                             <li>
                                <strong>Hit Check:</strong> A D6 dice is rolled. A 1 always misses, a 6 always hits.
                                <br />
                                <code>Roll (1-6) + Your LUK Bonus ≥ 4 + Opponent's SPD Penalty</code>
                            </li>
                            <li>
                                <strong>Damage Formula:</strong> If the attack hits, damage is calculated.
                                <br />
                                <code>(Your ATK + Roll) - (Opponent's DEF + Roll) = Damage</code>
                                <br/>
                                <em>(Minimum 1 damage on a successful hit)</em>
                            </li>
                            <li><strong>Critical Hit:</strong> Your Luck improves your chance to deal 1.5x damage.</li>
                            <li><strong>Effects:</strong> Finally, any buffs, debuffs, or special ability effects are applied.</li>
                        </ol>
                    </div>
                    <p className="text-center font-bold text-green-300 mt-4">Train hard, and may your slime reign supreme in the arena!</p>
                </div>
             </div>
         </Modal>
    );

    const SummaryModal = () => (
        <Modal onClose={() => onBattleEnd(winner === player.name)}>
            <div className="text-center">
                <h2 className="text-2xl mb-4 flicker text-yellow-400">Post-Battle Report</h2>
                {isGeneratingSummary ? (
                    <p className="text-lg animate-pulse">Barnaby is analyzing the tapes...</p>
                ) : (
                    <div className="text-left text-base whitespace-pre-wrap max-h-64 overflow-y-auto pixel-border p-2 bg-black/50">
                        {summaryText}
                    </div>
                )}
                <button 
                    onClick={() => onBattleEnd(winner === player.name)} 
                    disabled={isGeneratingSummary}
                    className="pixel-border p-2 mt-6 w-full hover:bg-green-400 hover:text-black transition-colors duration-200 disabled:opacity-50"
                >
                    Continue
                </button>
            </div>
        </Modal>
    );

    const playerEffectiveStats: SlimeStats = { HP: getEffectiveStat(player, 'HP'), ATK: getEffectiveStat(player, 'ATK'), DEF: getEffectiveStat(player, 'DEF'), SPD: getEffectiveStat(player, 'SPD'), LUK: getEffectiveStat(player, 'LUK') };
    const opponentEffectiveStats: SlimeStats = { HP: getEffectiveStat(opponent, 'HP'), ATK: getEffectiveStat(opponent, 'ATK'), DEF: getEffectiveStat(opponent, 'DEF'), SPD: getEffectiveStat(opponent, 'SPD'), LUK: getEffectiveStat(opponent, 'LUK') };
    const playerEquippedAbilities = player.battleAbilities.filter(ba => player.equippedAbilities.some(a => a.name === ba.ability.name));

    return (
        <div className={`transition-colors duration-500 ${environment ? environment.color : ''}`}>
            {showSummaryModal && <SummaryModal />}
            <h2 className="text-4xl text-center mb-4 flicker">BATTLE ARENA</h2>
            {showHelp && <HelpModal />}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SlimeCard slime={player} effectiveStats={playerEffectiveStats} isHit={playerHit} feedbackText={playerFeedback} statusEffects={player.statusEffects} abilityUsedName={playerAbilityAnimation} />
                        <SlimeCard slime={opponent} effectiveStats={opponentEffectiveStats} isOpponent={true} isHit={opponentHit} feedbackText={opponentFeedback} statusEffects={opponent.statusEffects} abilityUsedName={opponentAbilityAnimation} />
                    </div>
                    {turnBreakdown && !isResolvingTurn && <TurnResolutionPanel />}
                    {!winner && (
                        <div className="pixel-border p-4 relative">
                             {tooltipAbility && ( <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max z-20 pointer-events-none"> <AbilityTooltip ability={tooltipAbility} /> </div> )}
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => setShowHelp(true)} title="Help" className="pixel-border p-2 w-10 h-10 flex items-center justify-center text-xl hover:bg-gray-700 transition-colors duration-200">?</button>
                                <h3 className="text-2xl text-center"> {isResolvingTurn ? `RESOLVING TURN ${turn}...` : `TURN ${turn}: CHOOSE YOUR ACTION`} </h3>
                                <div className="flex justify-end items-center"> <label htmlFor="auto-battle-toggle" className="mr-2 text-sm cursor-pointer select-none">Auto-Battle</label> <input type="checkbox" id="auto-battle-toggle" checked={isAutoBattle} onChange={() => setIsAutoBattle(p => !p)} className="h-5 w-5 cursor-pointer" style={{imageRendering: 'pixelated'}} /> </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-center">
                                <button onClick={() => handlePlayerAction('Basic')} disabled={isResolvingTurn || isAutoBattle} className="pixel-border p-2 hover:bg-gray-400 hover:text-black disabled:opacity-50 col-span-2 md:col-span-1" onMouseEnter={() => setTooltipAbility(basicActionForTooltip)} onMouseLeave={() => setTooltipAbility(null)} > Perform Basic Action </button>
                                {playerEquippedAbilities.map(({ ability, cooldown }) => {
                                    const onCooldown = cooldown > 0;
                                    const isCharging = player.statusEffects.some(e => e.name === `Charging: ${ability.name}`);
                                    let conditionMet = true; if (ability.condition?.type === 'HP_BELOW_PERCENT') { conditionMet = (player.currentHp / player.stats.HP) < ability.condition.value; }
                                    const isDisabled = onCooldown || isCharging || isResolvingTurn || isAutoBattle || !conditionMet;
                                    return ( <button key={ability.name} disabled={isDisabled} onClick={() => handlePlayerAction(ability)} className="pixel-border p-2 hover:bg-yellow-400 hover:text-black disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 disabled:hover:bg-gray-800" onMouseEnter={() => setTooltipAbility(ability)} onMouseLeave={() => setTooltipAbility(null)} > {ability.name} {onCooldown && cooldown > 1 && ` (CD: ${cooldown - 1})`} {isCharging && ` (Charging)`} {!conditionMet && ` (HP Low)`} </button> );
                                })}
                            </div>
                        </div>
                    )}
                     <div> <div className="pixel-border p-4 h-48 overflow-y-auto flex flex-col-reverse bg-black/50 font-mono text-sm"> <h3 className="text-xl text-center mb-2 sticky top-0 bg-black/90 py-1 z-10">BATTLE HISTORY</h3> <ul className="relative z-0"> {battleHistory.map((entry, index) => ( <li key={index} className="text-gray-300">{entry}</li> ))} </ul> </div> </div>
                </div>
                <div className="lg:col-span-1"> <BeastmasterCommentary /> </div>
            </div>
        </div>
    );
};

export default BattleArena;