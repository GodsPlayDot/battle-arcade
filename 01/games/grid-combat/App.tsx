import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import GameBoard from './components/GameBoard';
import PlayerUI from './components/PlayerUI';
import GameLog from './components/GameLog';
import GameRules from './components/GameRules';
import StrategyBook from './components/StrategyBook';
import OpponentMeter from './components/OpponentMeter';
import UpgradeScreen from './components/UpgradeScreen';
import AICombatBook from './components/AICombatBook';
import AdminChecklist from './components/AdminChecklist';
import BattleRoyaleStatus from './components/BattleRoyaleStatus';
import { GameState, Player, Position, Skill, GamePhase, PlayerActions, SelectedMove, CostType, SkillType, FloatingText, Decoy, StatusEffectType, Obstacle, PlayerStats, Skeleton, Trap, DamagingTile, AdminSettings, Rift, EffectZone, EffectZoneType, AiArchetype, AiLearningProfile, BattleReplayFrame } from './types';
import { INITIAL_PLAYERS, DEFAULT_GRID_SIZE, PLAYER_1_INITIAL, OPPONENTS, STAY_SKILL, ALL_GAME_SKILLS, SPECIAL_SKILLS, SKILLS } from './constants';
import { produce } from 'immer';

const AI_MEMORY_STORAGE_KEY = 'isometric-grid-ai-memory-v1';
const AI_ARCHETYPES: AiArchetype[] = ['Aggressor', 'Stalker', 'Breaker', 'Zoner'];

const emptyAiProfile = (): AiLearningProfile => ({
    battles: 0,
    wins: 0,
    losses: 0,
    archetypeScores: { Aggressor: 0, Stalker: 0, Breaker: 0, Zoner: 0 },
    skillScores: {},
});

const loadAiMemory = (): { report: string[]; learning: Record<number, AiLearningProfile> } => {
    try {
        const raw = localStorage.getItem(AI_MEMORY_STORAGE_KEY);
        if (!raw) return { report: [], learning: {} };
        const saved = JSON.parse(raw);
        return {
            report: Array.isArray(saved.report) ? saved.report.slice(-240) : [],
            learning: saved.learning && typeof saved.learning === 'object' ? saved.learning : {},
        };
    } catch {
        return { report: [], learning: {} };
    }
};

const initialAiMemory = loadAiMemory();
const initialAiReport: string[] = initialAiMemory.report;

const captureReplayFrame = (draft: GameState, headline: string) => {
    const lastResolve = draft.log.lastIndexOf('--- Resolving Combat ---');
    const events = draft.log.slice(Math.max(0, lastResolve)).filter(line => /hits|uses|moves|summons|defeated|stalemate/i.test(line)).slice(-6);
    const frame: BattleReplayFrame = {
        turn: draft.turn,
        headline,
        events: events.length ? events : ['Both sides repositioned and prepared their next plan.'],
        players: draft.players.map(player => ({
            id: player.id, name: player.name, hp: Math.max(0, Math.round(player.hp)), maxHp: player.maxHp,
            position: { ...player.position }, color: player.color,
        })),
    };
    const previous = draft.battleReplay[draft.battleReplay.length - 1];
    if (previous?.turn === frame.turn) draft.battleReplay[draft.battleReplay.length - 1] = frame;
    else draft.battleReplay.push(frame);
    draft.battleReplay = draft.battleReplay.slice(-12);
};

const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

const hasLineOfSight = (start: Position, end: Position, obstacles: (Obstacle | {position: Position})[], effectZones: EffectZone[]): boolean => {
    const smokeClouds = effectZones.filter(z => z.type === EffectZoneType.SMOKE_CLOUD);
    const allBlockers = [
        ...obstacles.map(o => o.position),
        ...smokeClouds.flatMap(z => {
            const tiles: Position[] = [];
            for (let y_offset = -z.radius; y_offset <= z.radius; y_offset++) {
                for (let x_offset = -z.radius; x_offset <= z.radius; x_offset++) {
                    if(getDistance({x:0, y:0}, {x: x_offset, y: y_offset}) <= z.radius) {
                        tiles.push({ x: z.position.x + x_offset, y: z.position.y + y_offset });
                    }
                }
            }
            return tiles;
        })
    ];
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    
    if (steps <= 1) return true;

    const x_inc = dx / steps;
    const y_inc = dy / steps;

    let x = start.x;
    let y = start.y;

    for (let i = 1; i < steps; i++) {
        x += x_inc;
        y += y_inc;
        const currentPos = { x: Math.round(x), y: Math.round(y) };
        if (allBlockers.some(o => o.x === currentPos.x && o.y === currentPos.y)) {
            return false;
        }
    }
    return true;
}

const calculateDamage = (attacker: Player, target: Player, skill: Skill): { finalDamage: number, lifeSteal: number, recoil: number, reflectedDamage: number } => {
    if (!skill.damage) return { finalDamage: 0, lifeSteal: 0, recoil: 0, reflectedDamage: 0 };

    let baseDamage = skill.damage;

    // --- Special Damage Calculations ---
    if (skill.id === 's14') { // Jab
        const missingHpPercent = (attacker.maxHp - attacker.hp) / attacker.maxHp;
        baseDamage += Math.floor(missingHpPercent * 30); // Bonus damage based on missing health
        const targetHasBuff = target.statusEffects.some(e => e.type.endsWith('_BUFF'));
        if (targetHasBuff) {
            baseDamage *= 1.5;
        }
    }

    // --- Attacker Modifiers ---
    let modifiedDamage = baseDamage;

    // Stat Scaling
    if (skill.costType === CostType.MP || skill.id === 's9') { // Holy Smite or MP-based skills use INT
        modifiedDamage += attacker.stats.intelligence * 0.75;
    } else {
        modifiedDamage += attacker.stats.strength * 0.5;
    }

    // Buffs
    const strengthBuff = attacker.statusEffects.find(e => e.type === StatusEffectType.STRENGTH_BUFF);
    if (strengthBuff) modifiedDamage *= strengthBuff.potency || 1.5;

    const rampageBuff = attacker.statusEffects.find(e => e.type === StatusEffectType.RAMPAGE_BUFF);
    if (rampageBuff) modifiedDamage *= 1.25;

    const vanishBuff = attacker.statusEffects.find(e => e.type === StatusEffectType.VANISHED);
    if (vanishBuff) modifiedDamage *= 1.5;
    
    // Proximity Damage Modifiers for ranged skills
    const dist = getDistance(attacker.position, target.position);
    if (skill.range > 1) {
        if (dist === 1) {
             modifiedDamage *= 0.7; // 30% damage reduction
        } else if (dist >= skill.range -1) {
            modifiedDamage *= 1.2; // 20% damage boost for max range
        }
    }
    
    // --- Target Modifiers ---
    let defenseValue = target.stats.defense;
    
    // Parry Stance
    const parryStance = target.statusEffects.find(e => e.type === StatusEffectType.PARRY_STANCE);
    if (parryStance) {
        modifiedDamage *= 0.25; // 75% damage reduction
    }


    // Defense Buffs/Debuffs from Status Effects
    const defenseBuff = target.statusEffects.find(e => e.type === StatusEffectType.DEFENSE_BUFF);
    if (defenseBuff) defenseValue *= defenseBuff.potency || 1.5;

    const statDebuff = target.statusEffects.find(e => e.type === StatusEffectType.STAT_DEBUFF);
    if (statDebuff) defenseValue *= statDebuff.potency || 0.5;

    // Vulnerability
    const vulnerableDebuff = target.statusEffects.find(e => e.type === StatusEffectType.VULNERABLE_DEBUFF);
    if (vulnerableDebuff) modifiedDamage *= vulnerableDebuff.potency || 1.5;

    // Final Calculation (Damage reduced by a percentage of defense)
    let finalDamage = Math.max(1, modifiedDamage - defenseValue * 0.3);

    // --- Special Skill Properties ---
    let lifeSteal = 0;
    if (skill.id === 's6') { // Life Drain
        lifeSteal = Math.round(finalDamage * 0.75);
    }

    let recoil = 0;
    if (skill.id === 's11') { // Reckless Swing
        recoil = 5;
    }
    
    let reflectedDamage = 0;
    const retributionAura = target.statusEffects.find(e => e.type === StatusEffectType.RETRIBUTION_AURA);
    if(retributionAura) {
        reflectedDamage = Math.round(finalDamage * 2.0);
    }

    const lastStand = target.statusEffects.find(e => e.type === StatusEffectType.LAST_STAND_BUFF);
    if (lastStand && target.hp - finalDamage <= 0) {
        finalDamage = Math.max(0, target.hp - 1);
    }

    return { finalDamage: Math.round(finalDamage), lifeSteal, recoil, reflectedDamage };
}


const cloneMove = (move: SelectedMove): SelectedMove => {
    if (!move.skill) return { skill: null, target: null };
    return {
        skill: move.skill,
        target: move.target ? { x: move.target.x, y: move.target.y } : null
    };
};

const getInitialState = (
    p1Buffs: { str: number; int: number; end: number; } = { str: 0, int: 0, end: 0 },
    existingReport: string[] = initialAiReport,
    challengers: Player[] = OPPONENTS,
    opponentIndex: number = 0,
    aiLearning: Record<number, AiLearningProfile> = initialAiMemory.learning,
): GameState => {
    const p1WithBuffs = produce(PLAYER_1_INITIAL, draft => {
        draft.stats.strength += p1Buffs.str;
        draft.stats.intelligence += p1Buffs.int;
        draft.stats.endurance += p1Buffs.end;
        // Also buff max values
        draft.maxHp += p1Buffs.end * 5;
        draft.maxMp += p1Buffs.int * 2;
        draft.maxStamina += p1Buffs.end * 3;
        if (p1Buffs.str > 0) {
            draft.name = `Player 1+${p1Buffs.str}`;
        }
    });

    const initialActions: { [playerId: number]: PlayerActions } = {};
    const initialCooldowns: { [playerId: number]: { [skillId: string]: number } } = {};
    const players: Player[] = [
      { ...p1WithBuffs, statusEffects: [], hp: p1WithBuffs.maxHp, mp: p1WithBuffs.maxMp, stamina: p1WithBuffs.maxStamina, position: { x: 1, y: 5 }},
      { ...challengers[opponentIndex], statusEffects: [] }
    ];
    players.forEach(p => {
        initialActions[p.id] = {
            primary: { skill: STAY_SKILL, target: p.position },
            followup: { skill: null, target: null },
            confirmed: false
        };
        initialCooldowns[p.id] = {};
    });
    return {
        players: players,
        challengers: challengers,
        decoys: [],
        skeletons: [],
        obstacles: [],
        traps: [],
        damagingTiles: [],
        effectZones: [],
        rifts: [],
        projectiles: [],
        turn: 1,
        phase: GamePhase.SELECTING_MOVES,
        playerActions: initialActions,
        skillCooldowns: initialCooldowns,
        log: ["Welcome to Isometric Combat! Player 1's turn."],
        winner: null,
        activePlayerId: 1,
        activeMoveSlot: 'primary',
        floatingTexts: [],
        countdown: null,
        currentOpponentIndex: opponentIndex,
        skillAnimation: null,
        extraLives: 0,
        adminSettings: {
          hideUnownedSkills: false,
          singleOpponentMode: false,
          player1IsAi: false,
        },
        aiBattleReport: existingReport,
        aiLearning,
        aiArchetypes: {},
        aiMatchSkills: {},
        battleReplay: [],
        p1AiStatBuffs: p1Buffs,
        gridSize: DEFAULT_GRID_SIZE,
        inactivityCounter: 0,
        generatedChallenger: null,
        shrinkLevel: 0,
    };
};



const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(() => getInitialState());
    const [userInteracted, setUserInteracted] = useState(false);
    const restartTimerRef = useRef<number | null>(null);
    const [replayIndex, setReplayIndex] = useState(0);

    // Create a ref to hold the latest game state to prevent stale closures in callbacks.
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    // The Combat Book is a real memory now: keep compact outcomes and learned
    // strategy weights across rematches and browser reloads.
    useEffect(() => {
        try {
            localStorage.setItem(AI_MEMORY_STORAGE_KEY, JSON.stringify({
                report: gameState.aiBattleReport.slice(-240),
                learning: gameState.aiLearning,
            }));
        } catch {
            // The battle remains playable if storage is unavailable.
        }
    }, [gameState.aiBattleReport, gameState.aiLearning]);

    useEffect(() => {
        if (gameState.phase !== GamePhase.GAME_OVER || gameState.battleReplay.length < 2) return;
        setReplayIndex(0);
        const timer = window.setInterval(() => {
            setReplayIndex(current => (current + 1) % gameState.battleReplay.length);
        }, 1500);
        return () => window.clearInterval(timer);
    }, [gameState.phase, gameState.battleReplay.length]);

    const playSoundEffect = useCallback((skill: Skill) => {
        if (!userInteracted) return;

        let soundId = '';
        const skillName = skill.name.toLowerCase();

        if (skillName.includes('fire') || skillName.includes('scorch') || skillName.includes('burning') || skillName.includes('explosion')) {
            soundId = 'sfx-fireball';
        } else {
            switch (skill.type) {
                case SkillType.ATTACK:
                    soundId = 'sfx-attack';
                    break;
                case SkillType.MOVE:
                    soundId = 'sfx-move';
                    break;
                case SkillType.BUFF:
                    soundId = 'sfx-buff';
                    break;
                case SkillType.SPECIAL:
                case SkillType.DEBUFF:
                    soundId = 'sfx-special';
                    break;
            }
        }

        if (soundId) {
            const sound = document.getElementById(soundId) as HTMLAudioElement;
            if (sound) {
                sound.currentTime = 0;
                sound.volume = 0.4;
                sound.play().catch(error => console.error(`SFX [${soundId}] play failed:`, error));
            }
        }
    }, [userInteracted]);

    useEffect(() => {
        const bgMusic = document.getElementById('bg-music') as HTMLAudioElement;
        if (userInteracted && bgMusic) {
            if (gameState.phase === GamePhase.SELECTING_MOVES || gameState.phase === GamePhase.RESOLVING_COMBAT || gameState.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
                bgMusic.volume = 0.15;
                const playPromise = bgMusic.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {});
                }
            } else {
                bgMusic.pause();
            }
        }
    }, [userInteracted, gameState.phase]);


    const handleSkillSelect = (playerId: number, skill: Skill) => {
        setGameState(prev => {
            if (prev.playerActions[playerId]?.confirmed || prev.activePlayerId !== playerId) {
                return prev;
            }
            
            return produce(prev, draft => {
                const currentSlot = draft.activeMoveSlot;
                draft.playerActions[playerId][currentSlot].skill = skill;
                 if (skill.range === 0) {
                    const player = draft.players.find(p => p.id === playerId);
                    if (player) {
                        draft.playerActions[playerId][currentSlot].target = player.position;
                    }
                } else {
                    draft.playerActions[playerId][currentSlot].target = null;
                }
            });
        });
    };
    
    const handleCellClick = (pos: Position) => {
        setGameState(prev => produce(prev, draft => {
            const player = draft.players.find(p => p.id === draft.activePlayerId);
            if (!player || player.isAi || draft.playerActions[player.id]?.confirmed) return;
            
            const actions = draft.playerActions[draft.activePlayerId];
            if (!actions) return;
            
            const currentSlot = draft.activeMoveSlot;
            const move = actions[currentSlot];
            if (move.skill) {
                move.target = pos;
            }
        }));
    };

    const handleSetActiveMoveSlot = (playerId: number, slot: 'primary' | 'followup') => {
        setGameState(prev => {
            if (prev.activePlayerId !== playerId || prev.playerActions[playerId]?.confirmed) {
                return prev;
            }
            return produce(prev, draft => {
                draft.activeMoveSlot = slot;
            });
        });
    };

    const handleConfirmMoves = (playerId: number) => {
        setGameState(prev => produce(prev, draft => {
            if (!draft.playerActions[playerId] || draft.playerActions[playerId].confirmed) return;
            draft.playerActions[playerId].confirmed = true;

            // In Battle Royale, we just confirm and wait. The main loop handles the rest.
            if (draft.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
                return;
            }
            
            // In 1v1 mode, check if we need to switch active player
            const allPlayers = draft.players;
            const humanPlayers = allPlayers.filter(p => !p.isAi);

            // If there's more than one human player, we might need to switch turns
            if (humanPlayers.length > 1) {
                const nextHumanPlayer = humanPlayers.find(p => !draft.playerActions[p.id]?.confirmed);

                if (nextHumanPlayer) {
                    // There's another human player who hasn't confirmed yet. Switch to them.
                    draft.activePlayerId = nextHumanPlayer.id;
                    draft.activeMoveSlot = 'primary';
                    const confirmingPlayer = allPlayers.find(p => p.id === playerId);
                    draft.log.push(`${confirmingPlayer?.name || 'A player'} confirmed. It's now ${nextHumanPlayer.name}'s turn.`);
                }
                // If no next human player is found, it means all humans have confirmed their moves.
                // The main useEffect will then trigger the AI turns / countdown.
            }
        }));
    };

    const handleToggleAI = (playerId: number, isAi: boolean) => {
        setGameState(prev => {
             const playerIndex = prev.players.findIndex(p => p.id === playerId);
             if (playerIndex === -1) return prev;

            if ((prev.phase !== GamePhase.SELECTING_MOVES && prev.phase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS) || prev.playerActions[playerId]?.confirmed) {
                return prev;
            }
            return produce(prev, draft => {
                draft.players[playerIndex].isAi = isAi;
                draft.log.push(`${draft.players[playerIndex].name} is now controlled by: ${isAi ? 'AI' : 'Human'}.`);
            });
        });
    };
    
    const handleAdminSettingsChange = (setting: keyof AdminSettings, value: boolean) => {
        setGameState(prev => produce(prev, draft => {
            draft.adminSettings[setting] = value;
            if (setting === 'player1IsAi') {
                const p1 = draft.players.find(p => p.id === 1);
                if (p1) {
                    p1.isAi = value;
                    draft.log.push(`Player 1 is now controlled by: ${value ? 'AI' : 'Human'}.`);
                }
            }
        }));
    };

    const handleStartBattleRoyale = () => {
        setGameState(prev => produce(prev, draft => {
            setupBattleRoyale(draft);
        }));
    };

    const handleReturnToCampaign = () => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        setGameState(getInitialState(gameState.p1AiStatBuffs, gameState.aiBattleReport, gameState.challengers, 0, gameState.aiLearning));
    };

    const handleConfirmUpgrade = (
        statIncreases: Partial<PlayerStats>,
        skillToRemoveId: string | null,
        skillToAdd: Skill | null,
    ) => {
        setGameState(prev => produce(prev, draft => {
            const player = draft.players.find(p => p.id === 1)!;
            
            let statLog = [];
            for (const stat in statIncreases) {
                const key = stat as keyof PlayerStats;
                const amount = statIncreases[key]!;
                if (amount > 0) {
                    player.stats[key] += amount;
                    statLog.push(`+${amount} ${key.toUpperCase()}`);

                    // Update max resources based on new stats
                    if (key === 'endurance') {
                        player.maxHp += amount * 5;
                        player.maxStamina += amount * 3;
                    }
                    if (key === 'intelligence') {
                        player.maxMp += amount * 2;
                    }
                }
            }

            if (statLog.length > 0) {
                 draft.log.push(`${player.name} grows stronger! ${statLog.join(', ')}.`);
            }

            // Apply skill swap
            if (skillToRemoveId && skillToAdd) {
                const skillIndex = player.skills.findIndex(s => s.id === skillToRemoveId);
                if (skillIndex !== -1) {
                    const forgottenSkillName = player.skills[skillIndex].name;
                    player.skills[skillIndex] = skillToAdd;
                    draft.log.push(`${player.name} learned ${skillToAdd.name}, forgetting ${forgottenSkillName}.`);
                }
            } else {
                draft.log.push(`${player.name} chooses to keep their current skills.`);
            }

            setupNextBattle(draft);
        }));
    };
    
    // --- COMBAT HELPER FUNCTIONS ---
    // Memoizing these functions makes them stable references, preventing stale closures.
    const executeMove = useCallback((draft: GameState, playerId: number, move: SelectedMove, moveType: string): { logs: string[], floatingTextsData: { text: string; color: string; position: Position; }[], damageDealt: number } => {
        const logs: string[] = [];
        const floatingTextsData: { text: string; color: string; position: Position; }[] = [];
        let damageDealt = 0;
        
        let player = draft.players.find(p => p.id === playerId);
        if (!player) return { logs, floatingTextsData, damageDealt };
        
        if (player.statusEffects.some(e => e.type === StatusEffectType.FROZEN_DEBUFF)) {
            logs.push(`${player.name} is frozen and cannot act!`);
            return { logs, floatingTextsData, damageDealt };
        }

        if (!move.skill || !move.target) {
            logs.push(`${player.name}'s ${moveType} move fizzles.`);
            return { logs, floatingTextsData, damageDealt };
        }
        
        if (move.skill.id === STAY_SKILL.id) {
            return { logs, floatingTextsData, damageDealt };
        }
        
        if (move.skill.range === 0) {
            move.target = player.position;
        }

        const allBlockers = [...draft.obstacles, ...draft.players.map(p => ({ position: p.position })), ...draft.decoys.map(d => ({ position: d.position })), ...draft.skeletons.map(s => ({ position: s.position }))];
        
        let sourcePos = player.position;
        const activePlayerDecoy = draft.decoys.find(d => d.playerId === player!.id);
        const isFollowupAfterSummon = moveType === 'follow-up' && draft.playerActions[player.id].primary.skill?.id === 'sp1';

        if (isFollowupAfterSummon) {
            const primaryTarget = draft.playerActions[player.id].primary.target;
            if (primaryTarget) {
                sourcePos = primaryTarget;
                logs.push(`<span class="text-cyan-300">(${player.name} casts from newly summoned decoy)</span>`);
            }
        } else if (activePlayerDecoy && move.skill && move.skill.type !== SkillType.MOVE && move.target) {
            const isTargetInRangeFromPlayer = getDistance(player.position, move.target) <= (move.skill.range || 0);
            const hasLoSFromPlayer = hasLineOfSight(player.position, move.target, allBlockers, draft.effectZones);
            const isTargetInRangeFromDecoy = getDistance(activePlayerDecoy.position, move.target) <= (move.skill.range || 0);
            const hasLoSFromDecoy = hasLineOfSight(activePlayerDecoy.position, move.target, allBlockers, draft.effectZones);

            const isPlayerPathValid = isTargetInRangeFromPlayer && hasLoSFromPlayer;
            const isDecoyPathValid = isTargetInRangeFromDecoy && hasLoSFromDecoy;

            if (isDecoyPathValid && !isPlayerPathValid) {
                sourcePos = activePlayerDecoy.position;
                logs.push(`<span class="text-cyan-300">(${player.name} casts from decoy)</span>`);
            } else if (isDecoyPathValid && isPlayerPathValid) {
                if (getDistance(activePlayerDecoy.position, move.target) < getDistance(player.position, move.target)) {
                    sourcePos = activePlayerDecoy.position;
                     logs.push(`<span class="text-cyan-300">(${player.name} casts from decoy)</span>`);
                }
            }
        }


        const isConstricted = player.statusEffects.some(e => e.type === StatusEffectType.CONSTRICTED_DEBUFF);
        const isSlowed = player.statusEffects.some(e => e.type === StatusEffectType.SLOW_DEBUFF);
        
        let effectiveRange = move.skill.range;
        if (isConstricted) {
            effectiveRange = Math.max(0, effectiveRange - 2);
        }
        if (isSlowed && move.skill.type === SkillType.MOVE) {
            effectiveRange = Math.max(0, Math.floor(effectiveRange / 2));
        }

        if (getDistance(sourcePos, move.target) > effectiveRange) {
            logs.push(`<span class="text-yellow-400">${player.name}'s ${move.skill.name} failed: Target moved out of range!</span>`);
            return { logs, floatingTextsData, damageDealt };
        }

        if (move.skill.type !== SkillType.MOVE && !hasLineOfSight(sourcePos, move.target, allBlockers, draft.effectZones)) {
             logs.push(`<span class="text-yellow-400">${player.name}'s ${move.skill.name} failed: Line of sight is blocked!</span>`);
             return { logs, floatingTextsData, damageDealt };
        }

        const rampageBuff = player.statusEffects.find(e => e.type === StatusEffectType.RAMPAGE_BUFF);
        const bloodPactBuff = player.statusEffects.find(e => e.type === StatusEffectType.BLOOD_PACT_BUFF);
        const twinEchoBuff = player.statusEffects.find(e => e.type === StatusEffectType.TWIN_ECHO_BUFF);
        const lastStandBuff = player.statusEffects.find(e => e.type === StatusEffectType.LAST_STAND_BUFF);
        const playerActions = draft.playerActions[playerId];
        const isEchoedMove = twinEchoBuff && playerActions.primary.skill?.id === playerActions.followup.skill?.id && playerActions.primary.skill?.id !== STAY_SKILL.id;
        const costType = move.skill.costType;
        let cost = costType === CostType.HP ? player.maxHp * (move.skill.cost / 100) : move.skill.cost;
        if (rampageBuff && costType === CostType.STAMINA) cost = Math.ceil(cost / 2);
        if (bloodPactBuff && (costType === CostType.MP || costType === CostType.STAMINA)) cost = Math.ceil(cost / 2);
        if (isEchoedMove) cost = 0;
        if (lastStandBuff) cost = 0;
        
        const parryStance = player.statusEffects.find(e => e.type === StatusEffectType.PARRY_STANCE);
        if (parryStance && costType === CostType.STAMINA && move.skill.range <= 1 && ['Attack', 'Special'].includes(move.skill.type)) {
            cost = 0; // Costs 0 stamina
            player.statusEffects = player.statusEffects.filter(e => e.type !== StatusEffectType.PARRY_STANCE);
            logs.push(`${player.name}'s Parry sets up a swift repost!`);
        }
        
        let canAfford = true;
        const isSilenced = player.statusEffects.some(e => e.type === StatusEffectType.SILENCE_DEBUFF);

        if (costType === CostType.MP) { if(player.mp < cost || isSilenced) canAfford = false; else player.mp -= cost; } 
        else if(costType === CostType.STAMINA) { if(player.stamina < cost) canAfford = false; else player.stamina -= cost; } 
        else if(costType === CostType.HP) { if(player.hp <= cost) canAfford = false; else player.hp -= cost; }

        if (!canAfford) {
             const reason = isSilenced ? "is silenced" : `does not have enough ${costType}`;
             logs.push(`<span class="text-red-400">${player.name} ${reason} for ${move.skill.name}!</span>`);
             return { logs, floatingTextsData, damageDealt };
        }
        if (cost > 0) floatingTextsData.push({ text: `-${Math.ceil(cost)} ${costType}`, color: costType === CostType.MP ? 'text-blue-400' : costType === CostType.STAMINA ? 'text-green-400' : 'text-red-400', position: player.position });
        
        if (move.skill.cooldown) draft.skillCooldowns[player.id][move.skill.id] = move.skill.cooldown + 1;
        
        const allTargets = [...draft.players, ...draft.decoys, ...draft.skeletons];

        if (move.skill.type === SkillType.MOVE) {
            if (player.statusEffects.some(e => e.type === StatusEffectType.IMMOBILIZED_DEBUFF)) {
                logs.push(`${player.name} is immobilized and cannot move!`);
                return { logs, floatingTextsData, damageDealt };
            }

            const isOccupied = allTargets.some(p => p.id !== player.id && p.position.x === move.target!.x && p.position.y === move.target!.y) || draft.obstacles.some(o => o.position.x === move.target!.x && o.position.y === move.target!.y);
            if (isOccupied && move.skill.id !== 's105') { // s105 is Phase Shift
                 logs.push(`${player.name}'s path is blocked!`);
            } else { 
                player.position = move.target; 
                logs.push(`${player.name} moves to (${move.target.x}, ${move.target.y}).`); 
            }
        
        } else if (['Attack', 'Special', 'Debuff'].includes(move.skill.type)) {
            logs.push(`${player.name} uses ${move.skill.name}!`);
            const targetsHit: (Player | Decoy | Skeleton)[] = [];
            if (move.skill.aoe && move.skill.aoe > 0) {
                allTargets.forEach(t => { if(getDistance(t.position, move.target!) <= move.skill.aoe!) targetsHit.push(t); })
            } else {
                 const singleTarget = allTargets.find(t => t.position.x === move.target?.x && t.position.y === move.target?.y);
                 if(singleTarget) targetsHit.push(singleTarget);
            }

            if (targetsHit.length > 0) {
                targetsHit.forEach(target => {
                    const isVanished = 'statusEffects' in target && target.statusEffects.some(e => e.type === StatusEffectType.VANISHED);
                    if(isVanished && (!move.skill.aoe || move.skill.aoe === 0)) {
                        logs.push(`${player.name}'s attack misses as ${target.name} has vanished!`);
                        return; // like continue
                    }

                    if ('stats' in target) { // Target is a Player
                        const targetPlayer = draft.players.find(p => p.id === target.id)!;
                        
                        const { finalDamage, lifeSteal, recoil, reflectedDamage } = calculateDamage(player, targetPlayer, move.skill!);
                        
                        if (finalDamage > 0) {
                            let damageToDeal = finalDamage;
                            
                            const shield = targetPlayer.statusEffects.find(e => e.type === StatusEffectType.AEGIS_SHIELD);
                            if (shield) {
                                const absorbed = Math.min(shield.potency!, damageToDeal);
                                shield.potency! -= absorbed;
                                damageToDeal -= absorbed;
                                logs.push(`<span class="text-cyan-400">${targetPlayer.name}'s shield absorbs ${absorbed} damage!</span>`);
                                floatingTextsData.push({ text: `Absorbed!`, color: 'text-cyan-300', position: targetPlayer.position });
                                if(shield.potency! <= 0) {
                                    logs.push(`${targetPlayer.name}'s Aegis Shield breaks!`);
                                    targetPlayer.statusEffects = targetPlayer.statusEffects.filter(e => e.type !== StatusEffectType.AEGIS_SHIELD);
                                }
                            }

                            if (damageToDeal > 0) {
                                targetPlayer.hp = Math.max(0, targetPlayer.hp - damageToDeal);
                                damageDealt += damageToDeal;
                                floatingTextsData.push({ text: `-${damageToDeal}`, color: 'text-red-500 font-bold', position: targetPlayer.position });
                                logs.push(`${player.name} hits ${targetPlayer.name} for ${damageToDeal} damage!`);
                            }
                        }
                        
                        if (lifeSteal > 0) {
                            player.hp = Math.min(player.maxHp, player.hp + lifeSteal);
                            floatingTextsData.push({ text: `+${lifeSteal}`, color: 'text-green-400', position: player.position });
                            logs.push(`${player.name} drains ${lifeSteal} life!`);
                        }
                        if (recoil > 0) {
                            player.hp = Math.max(0, player.hp - recoil);
                            floatingTextsData.push({ text: `-${recoil}`, color: 'text-orange-500', position: player.position });
                            logs.push(`${player.name} takes ${recoil} recoil damage!`);
                        }
                        if (reflectedDamage > 0) {
                            player.hp = Math.max(0, player.hp - reflectedDamage);
                            floatingTextsData.push({ text: `-${reflectedDamage}`, color: 'text-purple-400', position: player.position });
                            logs.push(`${player.name} suffers ${reflectedDamage} reflected damage from Retribution Aura!`);
                        }
                        if (move.skill.id === 'sp13') { targetPlayer.statusEffects.push({ type: StatusEffectType.VULNERABLE_DEBUFF, duration: 3, potency: 1.5 }); logs.push(`${targetPlayer.name} becomes vulnerable!`); }
                         if (move.skill.id === 's101') { // Trip
                            targetPlayer.statusEffects.push({ type: StatusEffectType.SLOW_DEBUFF, duration: 3 });
                            logs.push(`${targetPlayer.name} is slowed!`);
                        }
                        if (move.skill.id === 's29') { // Hamstring
                            targetPlayer.statusEffects.push({ type: StatusEffectType.IMMOBILIZED_DEBUFF, duration: 2 });
                            logs.push(`${targetPlayer.name} is immobilized!`);
                        }
                        if (move.skill.id === 's14') { // Jab buff removal
                            const buffIndex = targetPlayer.statusEffects.findIndex(e => e.type.endsWith('_BUFF'));
                            if (buffIndex > -1) {
                                const removedBuff = targetPlayer.statusEffects[buffIndex].type;
                                logs.push(`${player.name}'s Jab removes ${removedBuff.replace('_', ' ')} from ${targetPlayer.name}!`);
                                targetPlayer.statusEffects.splice(buffIndex, 1);
                            }
                        }
                        if (move.skill.id === 's106') { // Silence
                            targetPlayer.statusEffects.push({ type: StatusEffectType.SILENCE_DEBUFF, duration: 3 });
                            logs.push(`${targetPlayer.name} is silenced for 2 turns!`);
                        }

                    } else { // Target is Decoy or Skeleton
                        let damage = move.skill.damage || 0;
                        if (damage > 0) {
                            target.hp = Math.max(0, target.hp - damage);
                            damageDealt += damage;
                            floatingTextsData.push({ text: `-${Math.round(damage)}`, color: 'text-red-500 font-bold', position: target.position });
                        }
                    }
                    if (move.skill.id === 's15' && 'stats' in target) { // Push skill
                        const targetPlayer = draft.players.find(p => p.id === target.id)!;
                        const dx = targetPlayer.position.x - player.position.x;
                        const dy = targetPlayer.position.y - player.position.y;
                        const pushDir = { x: dx === 0 ? 0 : Math.sign(dx), y: dy === 0 ? 0 : Math.sign(dy) };
                         if (pushDir.x === 0 && pushDir.y === 0) { pushDir.x = 1; }
                        const pushToPos = { x: targetPlayer.position.x + pushDir.x, y: targetPlayer.position.y + pushDir.y };
                        const isOutOfBounds = pushToPos.x < 0 || pushToPos.x >= draft.gridSize || pushToPos.y < 0 || pushToPos.y >= draft.gridSize;
                        const isOccupied = allTargets.some(e => e.position.x === pushToPos.x && e.position.y === pushToPos.y) || draft.obstacles.some(o => o.position.x === pushToPos.x && o.position.y === pushToPos.y);

                        if (!isOutOfBounds && !isOccupied) {
                            targetPlayer.position = pushToPos;
                            logs.push(`${targetPlayer.name} is pushed back to (${pushToPos.x}, ${pushToPos.y})!`);
                            const followupMove = draft.playerActions[targetPlayer.id]?.followup;
                            if (followupMove && followupMove.skill && followupMove.target && followupMove.skill.id !== STAY_SKILL.id) {
                                if (getDistance(pushToPos, followupMove.target) > followupMove.skill.range) {
                                    logs.push(`<span class="text-yellow-400">${targetPlayer.name}'s follow-up move (${followupMove.skill.name}) aim is thrown off!</span>`);
                                    draft.playerActions[targetPlayer.id].followup = { skill: STAY_SKILL, target: targetPlayer.position };
                                }
                            }
                        } else { logs.push(`${targetPlayer.name} resists the push!`); }
                    }
                })
            }
            
            // Consume buffs
            if (player.statusEffects.some(e => e.type === StatusEffectType.STRENGTH_BUFF)) {
                logs.push(`${player.name}'s Focus bonus was consumed.`);
                player.statusEffects = player.statusEffects.filter(e => e.type !== StatusEffectType.STRENGTH_BUFF);
            }
            if (player.statusEffects.some(e => e.type === StatusEffectType.VANISHED)) {
                logs.push(`${player.name}'s Vanish bonus was consumed.`);
                player.statusEffects = player.statusEffects.filter(e => e.type !== StatusEffectType.VANISHED);
            }
            
            if (move.skill.id === 'sp1') { draft.decoys.push({ id: Date.now(), playerId: player.id, hp: 30, maxHp: 30, position: move.target, turnsRemaining: 4, color: player.color }); logs.push(`${player.name} summons a decoy!`); }
            if (move.skill.id === 'sp2') { player.statusEffects.push({ type: StatusEffectType.VANISHED, duration: 2 }); logs.push(`${player.name} vanishes from sight!`); }
            if (move.skill.id === 'sp10') { targetsHit.forEach(t => 'stats' in t && t.statusEffects.push({ type: StatusEffectType.FROZEN_DEBUFF, duration: 2 })); logs.push(`Enemies are frozen solid!`); }
            else if (move.skill.id === 's16') { targetsHit.forEach(t => 'stats' in t && t.statusEffects.push({ type: StatusEffectType.SLOW_DEBUFF, duration: 3 })); logs.push(`Enemies are slowed!`); }
            else if (move.skill.id === 's18') { draft.damagingTiles.push({ position: move.target, playerId: player.id, duration: 3, damage: 5, color: 'bg-orange'}); logs.push(`The ground burns at (${move.target.x},${move.target.y})!`); }
            else if (move.skill.id === 'sp18') { draft.skeletons.push({ id: Date.now(), playerId: player.id, hp: 20, maxHp: 20, position: move.target, turnsRemaining: 4 }); logs.push(`${player.name} summons a skeleton!`); }
            else if (move.skill.id === 'bsp1') { player.statusEffects.push({ type: StatusEffectType.CHARGING_ATTACK, duration: 2, potency: move.skill.damage }); logs.push(`${player.name} begins to channel immense power!`); }
            else if (move.skill.id === 'sp12') { // Taunt
                targetsHit.forEach(t => {
                    if ('stats' in t) {
                        const targetPlayer = draft.players.find(p => p.id === t.id)!;
                        targetPlayer.statusEffects = targetPlayer.statusEffects.filter(e => e.type !== StatusEffectType.TAUNTED_DEBUFF); // Remove old taunt
                        targetPlayer.statusEffects.push({ type: StatusEffectType.TAUNTED_DEBUFF, duration: 3, sourceId: player.id });
                        logs.push(`${targetPlayer.name} is taunted by ${player.name}!`);
                    }
                });
            } else if (move.skill.id === 'sp16') { // Barbed Trap
                draft.traps.push({ position: move.target, playerId: player.id, duration: 4, damage: 15 });
                logs.push(`${player.name} places a hidden trap!`);
            } else if (move.skill.id === 'sp15') { // Mirror Image
                const emptyTiles = [];
                for(let i = -1; i <= 1; i++) {
                    for(let j = -1; j <= 1; j++) {
                        if(i === 0 && j === 0) continue;
                        const pos = {x: move.target.x + i, y: move.target.y + j};
                        if (pos.x >=0 && pos.x < draft.gridSize && pos.y >= 0 && pos.y < draft.gridSize) {
                            const isOccupied = [...draft.players, ...draft.decoys, ...draft.skeletons, ...draft.obstacles].some(o => o.position.x === pos.x && o.position.y === pos.y);
                            if (!isOccupied) emptyTiles.push(pos);
                        }
                    }
                }
                if(emptyTiles.length > 0) draft.decoys.push({ id: Date.now(), playerId: player.id, hp: 1, maxHp: 1, position: emptyTiles[0], turnsRemaining: 4, color: player.color });
                if(emptyTiles.length > 1) draft.decoys.push({ id: Date.now() + 1, playerId: player.id, hp: 1, maxHp: 1, position: emptyTiles[1], turnsRemaining: 4, color: player.color });
                logs.push(`${player.name} creates mirror images!`);
            } else if (move.skill.id === 'sp11') { // Fire Wall
                 const dx = move.target.x - player.position.x;
                 const dy = move.target.y - player.position.y;
                 const isVertical = Math.abs(dy) > Math.abs(dx);
                 for(let i = -1; i <= 1; i++) {
                     const wallPos = isVertical ? {x: move.target.x, y: move.target.y + i} : {x: move.target.x + i, y: move.target.y};
                     if (wallPos.x >=0 && wallPos.x < draft.gridSize && wallPos.y >= 0 && wallPos.y < draft.gridSize) {
                        draft.damagingTiles.push({ position: wallPos, playerId: player.id, duration: 4, damage: 10, color: 'bg-orange' });
                     }
                 }
                logs.push(`${player.name} erects a wall of fire!`);
            } else if (move.skill.id === 'bsp2') { // Summon Rift
                 draft.rifts.push({ id: Date.now(), playerId: player.id, position: move.target, duration: 4, spawnCounter: 2 });
                 logs.push(`${player.name} tears open a rift to the abyss!`);
            } else if (move.skill.id === 'sp7') { // Construction
                for (let i = 0; i < 3; i++) {
                    const randomAngle = Math.random() * 2 * Math.PI;
                    const randomDist = Math.random() * 2;
                    const pos = {
                        x: Math.round(move.target.x + Math.cos(randomAngle) * randomDist),
                        y: Math.round(move.target.y + Math.sin(randomAngle) * randomDist)
                    };
                    if (pos.x >=0 && pos.x < draft.gridSize && pos.y >= 0 && pos.y < draft.gridSize) {
                        const isOccupied = [...draft.players, ...draft.decoys, ...draft.skeletons, ...draft.obstacles].some(o => o.position.x === pos.x && o.position.y === pos.y);
                        if (!isOccupied) {
                            draft.obstacles.push({position: pos, duration: 4, playerId: player.id });
                        }
                    }
                }
                logs.push(`${player.name} constructs a barricade!`);
            } else if (move.skill.id === 'sp21') { // Kinetic Conversion
                const mpCost = Math.floor(player.mp * 0.5);
                player.mp -= mpCost;
                const staminaGain = Math.floor(mpCost * 1.5);
                player.stamina = Math.min(player.maxStamina, player.stamina + staminaGain);
                logs.push(`${player.name} converts ${mpCost} MP into ${staminaGain} Stamina!`);
                floatingTextsData.push({ text: `+${staminaGain} STA`, color: 'text-green-400', position: player.position });
            } else if (move.skill.id === 'sp22') { // Arcane Surge
                const staCost = Math.floor(player.stamina * 0.5);
                player.stamina -= staCost;
                const mpGain = Math.floor(staCost * 0.5);
                player.mp = Math.min(player.maxMp, player.mp + mpGain);
                logs.push(`${player.name} converts ${staCost} Stamina into ${mpGain} MP!`);
                floatingTextsData.push({ text: `+${mpGain} MP`, color: 'text-blue-400', position: player.position });
            }
            
        } else if (move.skill.type === SkillType.BUFF) {
             logs.push(`${player.name} uses ${move.skill.name}!`);
             if (move.skill.id === 's4') player.statusEffects.push({ type: StatusEffectType.STRENGTH_BUFF, duration: 2, potency: 1.5 });
             if (move.skill.id === 's7') player.statusEffects.push({ type: StatusEffectType.PARRY_STANCE, duration: 2 });
             if (move.skill.id === 's12') {
                 player.statusEffects.push({ type: StatusEffectType.STRENGTH_BUFF, duration: 3, potency: 1.5 });
                 player.statusEffects.push({ type: StatusEffectType.STAT_DEBUFF, duration: 3, potency: 0.5 });
             }
             if (move.skill.id === 's17') player.statusEffects.push({ type: StatusEffectType.DEFENSE_BUFF, duration: 3, potency: 1.5 });
             if (move.skill.id === 's20') {
                 player.statusEffects.push({ type: StatusEffectType.DEFENSE_BUFF, duration: 2, potency: 3.0 });
                 player.statusEffects.push({ type: StatusEffectType.IMMOBILIZED_DEBUFF, duration: 2 });
             }
             if (move.skill.id === 's22') player.statusEffects.push({ type: StatusEffectType.HASTE_BUFF, duration: 4, potency: 1.5 });
             if (move.skill.id === 's13') player.statusEffects.push({ type: StatusEffectType.RETRIBUTION_AURA, duration: 3 });
             if (move.skill.id === 'sp3') player.statusEffects.push({ type: StatusEffectType.AEGIS_SHIELD, duration: 3, potency: 35 });
             if (move.skill.id === 'sp4') player.statusEffects.push({ type: StatusEffectType.RAMPAGE_BUFF, duration: 2 });
             if (move.skill.id === 'sp5') player.statusEffects.push({ type: StatusEffectType.BLOOD_PACT_BUFF, duration: 4 });
             if (move.skill.id === 'sp8') player.statusEffects.push({ type: StatusEffectType.TWIN_ECHO_BUFF, duration: 2 });
             if (move.skill.id === 'sp20') player.statusEffects.push({ type: StatusEffectType.UNSTOPPABLE_BUFF, duration: 3 });
             if (move.skill.id === 's10') {
                 const healAmount = 20 + player.stats.intelligence * 0.5;
                 player.hp = Math.min(player.maxHp, player.hp + healAmount);
                 floatingTextsData.push({text: `+${Math.round(healAmount)}`, color: 'text-green-400', position: player.position});
             }
             if (move.skill.id === 's103') { // Meditate
                const staminaGain = 20;
                player.stamina = Math.min(player.maxStamina, player.stamina + staminaGain);
                logs.push(`${player.name} meditates, recovering ${staminaGain} Stamina.`);
                floatingTextsData.push({ text: `+${staminaGain} STA`, color: 'text-green-400', position: player.position });
            }
        }
        return { logs, floatingTextsData, damageDealt };
    }, []);

    const runP1AiUpgrade = useCallback((draft: GameState) => {
        const player = draft.players.find(p => p.id === 1)!;
        draft.log.push(`--- ${player.name} (AI) is preparing for the next challenge... ---`);
        
        // 1. Reset loss streak buffs
        draft.p1AiStatBuffs = { str: 0, int: 0, end: 0 };
        player.name = 'Player 1';
        draft.log.push(`${player.name}'s victory streak resets its adaptation bonus.`);

        // 2. Allocate stat points
        const primaryOffensive = player.stats.intelligence > player.stats.strength ? 'intelligence' : 'strength';
        const primaryDefensive = player.stats.endurance > player.stats.defense ? 'endurance' : 'defense';
        player.stats[primaryOffensive]++;
        player.stats[primaryDefensive]++;
        player.maxHp += 5; // From endurance
        player.maxStamina += 3; // From endurance
        if (primaryOffensive === 'intelligence') {
            player.maxMp += 2;
        }

        draft.log.push(`${player.name} grows stronger! +1 ${primaryOffensive.toUpperCase()}, +1 ${primaryDefensive.toUpperCase()}.`);

        // 3. Strategic Skill Swap
        const scoreSkill = (skill: Skill, p: Player) => {
            let score = (skill.damage || 0) * (1 + (skill.aoe || 0) * 0.5);
            score += skill.range * 2;
            if (skill.type === SkillType.BUFF) score += 20;
            if (skill.type === SkillType.SPECIAL) score += 30;
            if (skill.cooldown) score -= skill.cooldown * 3;
            if (skill.costType === CostType.MP) score *= (1 + p.stats.intelligence / 20);
            if (skill.costType === CostType.STAMINA) score *= (1 + p.stats.strength / 20);
            return score;
        };

        const playerSkillIds = new Set(player.skills.map(s => s.id));
        const availableSkills = ALL_GAME_SKILLS.filter(s => !playerSkillIds.has(s.id));
        let bestAvailableSkill: Skill | null = null;
        let bestScore = -Infinity;

        availableSkills.forEach(s => {
            const currentScore = scoreSkill(s, player);
            if(currentScore > bestScore) {
                bestScore = currentScore;
                bestAvailableSkill = s;
            }
        });
        
        const ownedSkills = player.skills.filter(s => s.id !== STAY_SKILL.id);
        const ownedMovementSkills = ownedSkills.filter(s => s.type === SkillType.MOVE);

        let swappableSkills = [...ownedSkills];

        // Ensure the AI doesn't swap away its only movement skill unless it's for another movement skill.
        if (ownedMovementSkills.length === 1 && bestAvailableSkill?.type !== SkillType.MOVE) {
            swappableSkills = swappableSkills.filter(s => s.type !== SkillType.MOVE);
        }
        
        if (swappableSkills.length === 0) {
            draft.log.push(`${player.name} is content with its current skills.`);
            return; // Exit if no valid skills to swap
        }

        let worstOwnedSkill = swappableSkills[0];
        let worstScore = scoreSkill(worstOwnedSkill, player);
        swappableSkills.forEach(s => {
            const currentScore = scoreSkill(s, player);
            if(currentScore < worstScore) {
                worstScore = currentScore;
                worstOwnedSkill = s;
            }
        });

        if (bestAvailableSkill && worstOwnedSkill && bestScore > worstScore * 1.25) {
            const skillIndex = player.skills.findIndex(s => s.id === worstOwnedSkill.id);
            if(skillIndex !== -1) {
                player.skills[skillIndex] = bestAvailableSkill;
                draft.log.push(`${player.name} learned ${bestAvailableSkill.name}, forgetting ${worstOwnedSkill.name}.`);
            }
        } else {
            draft.log.push(`${player.name} is content with its current skills.`);
        }
    }, []);

    const setupNextBattle = useCallback((draft: GameState) => {
        // Robustly find and clean up the old opponent's data to prevent crashes and memory leaks
        const p1 = draft.players.find(p => p.id === 1)!;
        const oldOpponent = draft.players.find(p => p.id !== 1);
        if (oldOpponent) {
            delete draft.playerActions[oldOpponent.id];
            delete draft.skillCooldowns[oldOpponent.id];
        }
    
        const nextOpponentIndex = draft.currentOpponentIndex + 1;
        const newOpponentData = draft.challengers[nextOpponentIndex];
    
        // Guard against running out of challengers
        if (!newOpponentData) {
            draft.phase = GamePhase.GAME_OVER;
            draft.winner = 1;
            draft.log.push("ALL CHALLENGERS DEFEATED! You are the champion!");
            return;
        }
        
        // Reset Player 1 for the next fight
        p1.statusEffects = [];
        p1.hp = p1.maxHp;
        p1.mp = p1.maxMp;
        p1.stamina = p1.maxStamina;
        p1.position = { x: 1, y: 5 };
        
        const newOpponent = { ...newOpponentData, statusEffects: [] };
        
        draft.players = [p1, newOpponent];
        draft.currentOpponentIndex = nextOpponentIndex;
    
        draft.playerActions[newOpponent.id] = { primary: { skill: STAY_SKILL, target: newOpponent.position }, followup: { skill: STAY_SKILL, target: newOpponent.position }, confirmed: false };
        draft.skillCooldowns[newOpponent.id] = {};
        draft.skillCooldowns[1] = {};
    
        draft.decoys = [];
        draft.skeletons = [];
        draft.obstacles = [];
        draft.traps = [];
        draft.damagingTiles = [];
        draft.effectZones = [];
        draft.rifts = [];
        draft.projectiles = [];
        draft.aiMatchSkills = {};
        draft.aiArchetypes = {};
    
        draft.turn = 1;
        draft.phase = GamePhase.SELECTING_MOVES;
        draft.activePlayerId = 1;
        draft.activeMoveSlot = 'primary';
        draft.playerActions[1].confirmed = false;
        draft.log.push(`--- Turn ${draft.turn}: Player 1 vs ${newOpponent.name}! ---`);
    }, []);

    const generateMatchSummary = useCallback((draft: GameState, winnerId: number) => {
        const p1 = draft.players.find(p => p.id === 1);
        const p2 = draft.players.find(p => p.id !== 1);
        if (!(p1 && p2 && p1.isAi && p2.isAi)) return;

        const winner = draft.players.find(p => p.id === winnerId)!;
        const loser = draft.players.find(p => p.id !== winnerId)!;
        
        const summary = [
            `--- Match Summary (Turn ${draft.turn}) ---`,
            `Winner: ${winner.name} (P${winner.id})`,
            `Loser: ${loser.name} (P${loser.id})`,
            `Final State (${winner.name}): ${Math.round(winner.hp)}/${winner.maxHp} HP | ${Math.round(winner.mp)}/${winner.maxMp} MP | ${Math.round(winner.stamina)}/${winner.maxStamina} STA`,
            `Final State (${loser.name}): ${Math.round(loser.hp)}/${loser.maxHp} HP | ${Math.round(loser.mp)}/${loser.maxMp} MP | ${Math.round(loser.stamina)}/${loser.maxStamina} STA`,
        ];

        // Learn from the actual outcome, not a random preference. A winning
        // approach earns weight; a losing one is softened, so later simulations
        // favor the archetypes and skills that have worked for that fighter.
        for (const player of [p1, p2]) {
            const profile = draft.aiLearning[player.id] || emptyAiProfile();
            const archetype = draft.aiArchetypes[player.id] || 'Stalker';
            const actions = draft.playerActions[player.id];
            const didWin = player.id === winnerId;
            profile.battles += 1;
            if (didWin) profile.wins += 1;
            else profile.losses += 1;
            profile.archetypeScores[archetype] = Math.max(-12, Math.min(18, (profile.archetypeScores[archetype] || 0) + (didWin ? 4 : -2)));

            // Learn from the whole plan, not just the final turn. Repeated
            // choices are weighted more strongly because they reveal the
            // strategy the AI actually committed to during the fight.
            const matchSkills = draft.aiMatchSkills[player.id] || [actions?.primary.skill?.id, actions?.followup.skill?.id].filter(Boolean) as string[];
            matchSkills.filter(skillId => skillId && skillId !== STAY_SKILL.id).forEach(skillId => {
                profile.skillScores[skillId] = Math.max(-10, Math.min(14, (profile.skillScores[skillId] || 0) + (didWin ? 1.5 : -0.8)));
            });
            draft.aiLearning[player.id] = profile;

            const winRate = Math.round((profile.wins / profile.battles) * 100);
            summary.push(`Learning: ${player.name} used ${archetype} — ${didWin ? '+4' : '-2'} strategy weight · ${profile.wins}W/${profile.losses}L (${winRate}% win rate) · ${matchSkills.length} decisions reviewed`);
        }

        draft.aiBattleReport.push(...summary);
        draft.aiBattleReport = draft.aiBattleReport.slice(-240);
    }, []);

    const setupBattleRoyale = useCallback((draft: GameState) => {
        draft.log = ["--- BONUS BATTLE ROYALE! ---", "The Challengers fight to the last one standing!"];
        draft.phase = GamePhase.BATTLE_ROYALE_IN_PROGRESS;
        draft.gridSize = 22;
    
        const p1 = draft.players.find(p => p.id === 1)!;
        
        const p1ForRoyale = produce(p1, p1Draft => {
            p1Draft.hp = p1.maxHp;
            p1Draft.mp = p1.maxMp;
            p1Draft.stamina = p1.maxStamina;
            p1Draft.statusEffects = [];
            p1Draft.isAi = draft.adminSettings.player1IsAi;
        });
        
        const opponentChallengers = draft.challengers.map(opp => ({ ...opp, isAi: true, hp: opp.maxHp, mp: opp.maxMp, stamina: opp.maxStamina, statusEffects: [] }));
        const allChallengers = [p1ForRoyale, ...opponentChallengers];
    
        const occupied = new Set<string>();
        allChallengers.forEach(p => {
            let pos: Position;
            do {
                pos = {
                    x: Math.floor(Math.random() * draft.gridSize),
                    y: Math.floor(Math.random() * draft.gridSize)
                };
            } while (occupied.has(`${pos.x},${pos.y}`));
            p.position = pos;
            occupied.add(`${pos.x},${pos.y}`);
        });
    
        draft.players = allChallengers;
        
        const initialActions: { [playerId: number]: PlayerActions } = {};
        const initialCooldowns: { [playerId: number]: { [skillId: string]: number } } = {};
        allChallengers.forEach(p => {
            initialActions[p.id] = { primary: { skill: STAY_SKILL, target: p.position }, followup: { skill: STAY_SKILL, target: p.position }, confirmed: false };
            initialCooldowns[p.id] = {};
        });
        draft.playerActions = initialActions;
        draft.skillCooldowns = initialCooldowns;
    
        draft.turn = 1;
        draft.activePlayerId = 1; // For UI focus
        draft.winner = null;
        draft.decoys = [];
        draft.skeletons = [];
        draft.obstacles = [];
        draft.traps = [];
        draft.damagingTiles = [];
        draft.effectZones = [];
        draft.rifts = [];
        draft.projectiles = [];
        draft.aiMatchSkills = {};
        draft.aiArchetypes = {};
        draft.inactivityCounter = 0;
        draft.shrinkLevel = 0;
    }, []);

    const resolveCombat = useCallback(() => {
        let totalDamageThisTurn = 0;
        
        setGameState(prev => produce(prev, draft => {
            draft.log.push("--- Resolving Combat ---");
        }));

        const runAsyncMoves = async () => {
            const applyResults = (draft: GameState, results: { logs: string[], floatingTextsData: { text: string; color: string; position: Position; }[], damageDealt: number }) => {
                draft.log.push(...results.logs);
                totalDamageThisTurn += results.damageDealt;
                results.floatingTextsData.forEach(ft => {
                    const newText = { ...ft, id: Date.now() + Math.random() };
                    draft.floatingTexts.push(newText);
                    setTimeout(() => setGameState(prev => produce(prev, d => { d.floatingTexts = d.floatingTexts.filter(t => t.id !== newText.id); })), 1400);
                });
            };
            
            // Use a ref to get the absolute latest state, preventing stale closures.
            const currentState = gameStateRef.current;
            const p1 = currentState.players.find(p => p.id === 1)!;
            const p2 = currentState.players.find(p => p.id !== 1);

            if (!p2) {
                 console.error("Opponent not found at start of combat resolution.");
                 return;
            }

            const p1Actions = currentState.playerActions[p1.id];
            const p2Actions = currentState.playerActions[p2.id];

            const primaryMoves = [
                { player: p1, move: cloneMove(p1Actions.primary) },
                { player: p2, move: cloneMove(p2Actions.primary) }
            ].sort((a, b) => b.player.stats.speed - a.player.stats.speed);

            // --- PRIMARY MOVE PHASE ---
            setGameState(prev => produce(prev, draft => {
                primaryMoves.forEach(({ player, move }) => {
                    if (move.skill && move.skill.id !== STAY_SKILL.id && move.target) {
                        playSoundEffect(move.skill);
                        const isRanged = move.skill.range > 1 && move.skill.type !== SkillType.MOVE && move.skill.type !== SkillType.BUFF;
                        if (isRanged) {
                             draft.projectiles.push({ id: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target });
                        } else {
                            draft.skillAnimation = { key: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target };
                        }
                    }
                });
            }));
            await new Promise(r => setTimeout(r, 600));

            setGameState(prev => produce(prev, draft => {
                draft.skillAnimation = null;
                draft.projectiles = [];
                 primaryMoves.forEach(({ player, move }) => {
                    const currentPlayerInDraft = draft.players.find(p => p.id === player.id);
                    if (currentPlayerInDraft && currentPlayerInDraft.hp > 0) {
                        const results = executeMove(draft, player.id, move, 'primary');
                        applyResults(draft, results);
                    }
                });
            }));
            await new Promise(r => setTimeout(r, 400));
            
            if (gameStateRef.current.players.some(p => p.hp <= 0)) { /* end early */ } 
            else {
                // Refresh state for followup moves
                const stateAfterPrimary = gameStateRef.current;
                const p1AfterPrimary = stateAfterPrimary.players.find(p => p.id === 1)!;
                const p2AfterPrimary = stateAfterPrimary.players.find(p => p.id !== 1);

                if (!p2AfterPrimary) {
                    console.error("Opponent disappeared mid-turn.");
                    return; 
                }

                const followupMoves = [
                    { player: p1AfterPrimary, move: cloneMove(p1Actions.followup) },
                    { player: p2AfterPrimary, move: cloneMove(p2Actions.followup) }
                ].sort((a, b) => b.player.stats.speed - a.player.stats.speed);

                // --- FOLLOW-UP MOVE PHASE ---
                setGameState(prev => produce(prev, draft => {
                    followupMoves.forEach(({ player, move }) => {
                        if (move.skill && move.skill.id !== STAY_SKILL.id && move.target) {
                             playSoundEffect(move.skill);
                            const isRanged = move.skill.range > 1 && move.skill.type !== SkillType.MOVE && move.skill.type !== SkillType.BUFF;
                            if (isRanged) {
                                draft.projectiles.push({ id: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target });
                            } else {
                                draft.skillAnimation = { key: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target };
                            }
                        }
                    });
                }));
                await new Promise(r => setTimeout(r, 600));

                setGameState(prev => produce(prev, draft => {
                    draft.skillAnimation = null;
                    draft.projectiles = [];
                    followupMoves.forEach(({ player, move }) => {
                        const currentPlayerInDraft = draft.players.find(p => p.id === player.id);
                        if (currentPlayerInDraft && currentPlayerInDraft.hp > 0) {
                            const results = executeMove(draft, player.id, move, 'follow-up');
                            applyResults(draft, results);
                        }
                    });
                }));
            }
            
            await new Promise(r => setTimeout(r, 500));
            
            setGameState(prev => produce(prev, draft => {
                draft.decoys = draft.decoys.filter(d => d.hp > 0 && d.turnsRemaining > 1).map(d => ({...d, turnsRemaining: d.turnsRemaining - 1}));
                draft.skeletons = draft.skeletons.filter(s => s.hp > 0 && s.turnsRemaining > 1).map(s => ({...s, turnsRemaining: s.turnsRemaining - 1}));
                draft.obstacles = draft.obstacles.filter(o => o.duration > 1).map(o => ({...o, duration: o.duration - 1}));
                draft.traps = draft.traps.filter(t => t.duration > 1).map(t => ({...t, duration: t.duration - 1}));
                draft.damagingTiles = draft.damagingTiles.filter(dt => dt.duration > 1).map(dt => ({...dt, duration: dt.duration - 1}));
                draft.rifts = draft.rifts.filter(r => r.duration > 1).map(r => ({...r, duration: r.duration - 1}));
                draft.effectZones = draft.effectZones.filter(z => z.duration > 1).map(z => ({...z, duration: z.duration - 1}));

                const player1 = draft.players.find(p => p.id === 1)!;
                const opponent = draft.players.find(p => p.id !== 1);

                if(!opponent) { // Opponent might have been removed if game ended
                    return;
                }

                if(totalDamageThisTurn === 0) {
                    draft.inactivityCounter++;
                } else {
                    draft.inactivityCounter = 0;
                }

                if(draft.inactivityCounter >= 5) {
                    draft.log.push(`--- Stalemate detected! Determining winner by health... ---`);
                    
                    const p1 = draft.players.find(p => p.id === 1)!;
                    
                    const p1HpPercent = p1.hp / p1.maxHp;
                    const opponentHpPercent = opponent.hp / opponent.maxHp;
                    
                    let loser;
                    if (p1HpPercent < opponentHpPercent) {
                        loser = p1;
                    } else if (opponentHpPercent < p1HpPercent) {
                        loser = opponent;
                    } else {
                        // Tie in percentage, check raw HP
                        if (p1.hp < opponent.hp) {
                           loser = p1;
                        } else if (opponent.hp < p1.hp) {
                           loser = opponent;
                        } else {
                           // Still a tie, opponent loses to prevent a draw.
                           loser = opponent;
                        }
                    }
                    
                    loser.hp = 0;
                    draft.log.push(`${loser.name} is declared defeated due to inactivity!`);
                }

                const opponentDefeated = opponent.hp <= 0;
                
                if (player1.hp <= 0) {
                    if (draft.extraLives > 0 && !draft.adminSettings.singleOpponentMode) {
                        draft.extraLives--;
                        const revivedHp = Math.ceil(player1.maxHp * 0.5);
                        player1.hp = revivedHp;
                        draft.log.push(`Player 1 uses an extra life and is revived with ${revivedHp} HP!`);
                    } else {
                        captureReplayFrame(draft, `${opponent.name} closes the match`);
                        if (player1.isAi) {
                            draft.p1AiStatBuffs.str++;
                            draft.p1AiStatBuffs.int++;
                            draft.p1AiStatBuffs.end++;
                            draft.log.push(`<span class="text-purple-400">Player 1 (AI) adapts to defeat, growing stronger...</span>`);
                            generateMatchSummary(draft, opponent.id);
                        }
                        draft.phase = GamePhase.GAME_OVER;
                        draft.winner = opponent.id;
                        draft.log.push(`--- Player 1 has been defeated! Game Over! ---`);
                        return;
                    }
                }

                if (opponentDefeated) {
                    captureReplayFrame(draft, `${player1.name} lands the finishing sequence`);
                    if (p1?.isAi) {
                        generateMatchSummary(draft, 1);
                    }
                    if (draft.adminSettings.singleOpponentMode || draft.currentOpponentIndex + 1 >= draft.challengers.length) {
                        draft.phase = GamePhase.GAME_OVER;
                        draft.winner = 1;
                        draft.log.push(`--- ${opponent.name} is defeated! You win the match! ---`);
                         if (draft.currentOpponentIndex + 1 >= draft.challengers.length) {
                             draft.log.push(`--- All challengers defeated! You can now generate new opponents in the AI Combat Book. ---`);
                         }
                    } else {
                        draft.extraLives++;
                        draft.log.push(`Player 1 gained an extra life! (Total: ${draft.extraLives})`);
                        if(player1.isAi) {
                            runP1AiUpgrade(draft);
                            setupNextBattle(draft);
                        } else {
                            draft.phase = GamePhase.UPGRADE_PHASE;
                        }
                        draft.log.push(`--- ${opponent.name} is defeated! ---`);
                    }
                    return;
                }

                draft.players.forEach(p => {
                    const playerActions = draft.playerActions[p.id];
                    if (!playerActions) return;

                    const isDoubleStay = playerActions.primary.skill?.id === STAY_SKILL.id && playerActions.followup.skill?.id === STAY_SKILL.id;
                    const isSingleStay = !isDoubleStay && (playerActions.primary.skill?.id === STAY_SKILL.id || playerActions.followup.skill?.id === STAY_SKILL.id);
            
                    let mpRestore = 0, staminaRestore = 0;
                    if (isDoubleStay) { mpRestore = p.maxMp * 0.25; staminaRestore = p.maxStamina * 0.25; }
                    else if (isSingleStay) { mpRestore = p.maxMp * 0.10; staminaRestore = p.maxStamina * 0.10; }
                    
                    if (mpRestore > 0 || staminaRestore > 0) {
                        p.mp = Math.min(p.maxMp, p.mp + mpRestore);
                        p.stamina = Math.min(p.maxStamina, p.stamina + staminaRestore);
                    }

                    if (![playerActions.primary.skill?.type, playerActions.followup.skill?.type].includes(SkillType.MOVE)) {
                        const staRegen = 5;
                        p.stamina = Math.min(p.maxStamina, p.stamina + staRegen);
                    }
                });

                draft.players.forEach(player => {
                    player.statusEffects.forEach(effect => { effect.duration--; });
                    // Special end-of-turn logic
                    if (player.statusEffects.some(e => e.type === StatusEffectType.LAST_STAND_BUFF && e.duration <= 1)) {
                        player.hp = 0; // Dies at the end of the effect
                        const logs: string[] = [];
                        logs.push(`${player.name}'s Last Stand ends!`);
                    }
                    player.statusEffects = player.statusEffects.filter(effect => effect.duration > 0);
                    Object.keys(draft.skillCooldowns[player.id]).forEach(skillId => { if (draft.skillCooldowns[player.id][skillId] > 0) draft.skillCooldowns[player.id][skillId]--; });
                });

                captureReplayFrame(draft, `Turn ${draft.turn} tactical exchange`);
                draft.turn += 1;
                draft.phase = GamePhase.SELECTING_MOVES;
                draft.activePlayerId = 1;
                draft.activeMoveSlot = 'primary';
                Object.keys(draft.playerActions).forEach(playerIdStr => {
                    const playerId = Number(playerIdStr);
                    const player = draft.players.find(p => p.id === playerId);
                    if(player) {
                         draft.playerActions[playerId] = { confirmed: false, primary: { skill: STAY_SKILL, target: player.position }, followup: { skill: STAY_SKILL, target: player.position }};
                    }
                });
                draft.log.push(`--- Turn ${draft.turn} --- Player 1's turn.`);
            }));
        };
        
        runAsyncMoves();

    }, [playSoundEffect, executeMove, runP1AiUpgrade, setupNextBattle, generateMatchSummary]);

    const resolveBattleRoyaleCombat = useCallback(() => {
        let totalDamageThisTurn = 0;

        const runAsyncMoves = async () => {
            const applyResults = (draft: GameState, results: { logs: string[], floatingTextsData: { text: string; color: string; position: Position; }[], damageDealt: number }) => {
                draft.log.push(...results.logs.filter(l => l.trim() !== ''));
                totalDamageThisTurn += results.damageDealt;
                results.floatingTextsData.forEach(ft => {
                    const newText = { ...ft, id: Date.now() + Math.random() };
                    draft.floatingTexts.push(newText);
                    setTimeout(() => setGameState(prev => produce(prev, d => { d.floatingTexts = d.floatingTexts.filter(t => t.id !== newText.id); })), 1400);
                });
            };
    
            const currentState = gameStateRef.current;
    
            // --- PRIMARY MOVE PHASE ---
            let livingPlayers = currentState.players.filter(p => p.hp > 0);
            const primaryMoves = livingPlayers
                .map(p => ({ player: p, move: cloneMove(currentState.playerActions[p.id].primary) }))
                .sort((a, b) => b.player.stats.speed - a.player.stats.speed);
    
            setGameState(prev => produce(prev, draft => {
                primaryMoves.forEach(({ player, move }) => {
                    if (move.skill && move.skill.id !== STAY_SKILL.id && move.target) {
                        playSoundEffect(move.skill);
                        const isRanged = move.skill.range > 1 && move.skill.type !== SkillType.MOVE && move.skill.type !== SkillType.BUFF;
                        if (isRanged) {
                            draft.projectiles.push({ id: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target });
                        } else {
                            draft.skillAnimation = { key: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target };
                        }
                    }
                });
            }));
            await new Promise(r => setTimeout(r, 600));
    
            setGameState(prev => produce(prev, draft => {
                draft.skillAnimation = null;
                draft.projectiles = [];
                primaryMoves.forEach(({ player, move }) => {
                    const currentPlayer = draft.players.find(p => p.id === player.id);
                    if (currentPlayer && currentPlayer.hp > 0) {
                        const results = executeMove(draft, player.id, move, 'primary');
                        applyResults(draft, results);
                    }
                });
            }));
            await new Promise(r => setTimeout(r, 400));
            
            livingPlayers = gameStateRef.current.players.filter(p => p.hp > 0);
            if (livingPlayers.length > 1) {
                // --- FOLLOW-UP MOVE PHASE ---
                const followupMoves = livingPlayers
                    .map(p => ({ player: p, move: cloneMove(gameStateRef.current.playerActions[p.id].followup) }))
                    .sort((a, b) => b.player.stats.speed - a.player.stats.speed);
    
                setGameState(prev => produce(prev, draft => {
                    followupMoves.forEach(({ player, move }) => {
                        if (move.skill && move.skill.id !== STAY_SKILL.id && move.target) {
                            playSoundEffect(move.skill);
                            const isRanged = move.skill.range > 1 && move.skill.type !== SkillType.MOVE && move.skill.type !== SkillType.BUFF;
                            if (isRanged) {
                                draft.projectiles.push({ id: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target });
                            } else {
                                draft.skillAnimation = { key: Date.now() + Math.random(), skill: move.skill, source: player.position, target: move.target };
                            }
                        }
                    });
                }));
                await new Promise(r => setTimeout(r, 600));
    
                setGameState(prev => produce(prev, draft => {
                    draft.skillAnimation = null;
                    draft.projectiles = [];
                    followupMoves.forEach(({ player, move }) => {
                        const currentPlayer = draft.players.find(p => p.id === player.id);
                        if (currentPlayer && currentPlayer.hp > 0) {
                            const results = executeMove(draft, player.id, move, 'follow-up');
                            applyResults(draft, results);
                        }
                    });
                }));
            }
            
            await new Promise(r => setTimeout(r, 500));
            
            // --- END OF TURN / CLEANUP ---
            setGameState(prev => produce(prev, draft => {
                const newlyDefeatedIds = draft.players.filter(p => p.hp <= 0 && currentState.players.find(cp => cp.id === p.id)!.hp > 0).map(p => p.id);
                
                if (newlyDefeatedIds.length > 0) {
                    newlyDefeatedIds.forEach(defeatedId => {
                        const defeatedPlayer = currentState.players.find(p => p.id === defeatedId)!;
                        draft.log.push(`${defeatedPlayer.name} has been defeated!`);
                        draft.decoys = draft.decoys.filter(d => d.playerId !== defeatedId);
                        draft.skeletons = draft.skeletons.filter(s => s.playerId !== defeatedId);
                        draft.obstacles = draft.obstacles.filter(o => o.playerId !== defeatedId);
                        draft.traps = draft.traps.filter(t => t.playerId !== defeatedId);
                        draft.damagingTiles = draft.damagingTiles.filter(dt => dt.playerId !== defeatedId);
                        draft.rifts = draft.rifts.filter(r => r.playerId !== defeatedId);
                        draft.effectZones = draft.effectZones.filter(z => z.playerId !== defeatedId);
                    });
                }

                let currentLivingPlayers = draft.players.filter(p => p.hp > 0);
                if (currentLivingPlayers.length <= 1) {
                    return; // Winner will be determined by the main useEffect loop
                }

                // --- SHRINK ZONE LOGIC ---
                if (currentLivingPlayers.length <= 5) {
                    draft.shrinkLevel++;
                    draft.log.push('<span class="text-red-400 font-bold">The battlefield is shrinking!</span>');

                    currentLivingPlayers.forEach(player => {
                        const isUnsafe = player.position.x < draft.shrinkLevel ||
                                     player.position.x >= draft.gridSize - draft.shrinkLevel ||
                                     player.position.y < draft.shrinkLevel ||
                                     player.position.y >= draft.gridSize - draft.shrinkLevel;
                        
                        if (isUnsafe) {
                            const shrinkDamage = Math.ceil(player.maxHp * 0.10);
                            player.hp = Math.max(0, player.hp - shrinkDamage);
                            
                            const ft = { id: Date.now() + Math.random(), text: `-${shrinkDamage}`, color: 'text-purple-400 font-bold', position: player.position };
                            draft.floatingTexts.push(ft);
                            setTimeout(() => setGameState(prev => produce(prev, d => { d.floatingTexts = d.floatingTexts.filter(t => t.id !== ft.id); })), 1400);
                            
                            draft.log.push(`${player.name} takes ${shrinkDamage} damage from the shrinking zone!`);

                            if (player.hp <= 0) {
                                draft.log.push(`${player.name} has been eliminated by the zone!`);
                            }
                        }
                    });

                    // Re-check for winner immediately after zone damage
                    currentLivingPlayers = draft.players.filter(p => p.hp > 0);
                    if (currentLivingPlayers.length <= 1) {
                         draft.phase = GamePhase.GAME_OVER;
                         draft.winner = currentLivingPlayers.length > 0 ? currentLivingPlayers[0].id : -1;
                         return; // End turn resolution early
                    }
                }
    
                if(totalDamageThisTurn === 0) {
                    draft.inactivityCounter++;
                } else {
                    draft.inactivityCounter = 0;
                }

                if(draft.inactivityCounter >= 5) {
                    draft.phase = GamePhase.GAME_OVER;
                    // find winner by highest HP percentage
                    const winnerPlayer = currentLivingPlayers.sort((a,b) => (b.hp / b.maxHp) - (a.hp / a.maxHp))[0];
                    draft.winner = winnerPlayer.id;
                    draft.log.push(`--- Stalemate detected! ${winnerPlayer.name} wins with the most health remaining! ---`);
                    return;
                }

                currentLivingPlayers.forEach(player => {
                    const actions = currentState.playerActions[player.id];
                    if (actions) {
                        if (![actions.primary.skill?.type, actions.followup.skill?.type].includes(SkillType.MOVE)) {
                            player.stamina = Math.min(player.maxStamina, player.stamina + 5);
                        }
                        const isDoubleStay = actions.primary.skill?.id === STAY_SKILL.id && actions.followup.skill?.id === STAY_SKILL.id;
                        const isSingleStay = !isDoubleStay && (actions.primary.skill?.id === STAY_SKILL.id || actions.followup.skill?.id === STAY_SKILL.id);
                
                        let mpRestore = 0, staminaRestore = 0;
                        if (isDoubleStay) { mpRestore = player.maxMp * 0.25; staminaRestore = player.maxStamina * 0.25; } 
                        else if (isSingleStay) { mpRestore = player.maxMp * 0.10; staminaRestore = player.maxStamina * 0.10; }
                        
                        if (mpRestore > 0 || staminaRestore > 0) {
                            player.mp = Math.min(player.maxMp, player.mp + mpRestore);
                            player.stamina = Math.min(player.maxStamina, player.stamina + staminaRestore);
                        }
                    }
                    
                    player.statusEffects.forEach(effect => { effect.duration--; });
                    player.statusEffects = player.statusEffects.filter(effect => effect.duration > 0);
                    Object.keys(draft.skillCooldowns[player.id]).forEach(skillId => { if (draft.skillCooldowns[player.id][skillId] > 0) draft.skillCooldowns[player.id][skillId]--; });
                });
    
                draft.turn += 1;
                draft.log.push(`--- Turn ${draft.turn} ---`);
                draft.players.forEach(p => {
                    draft.playerActions[p.id].confirmed = false;
                    draft.playerActions[p.id].primary = { skill: STAY_SKILL, target: p.position };
                    draft.playerActions[p.id].followup = { skill: STAY_SKILL, target: p.position };
                });
            }));
        };
        
        runAsyncMoves();
    }, [playSoundEffect, executeMove]);

    const runAiTurn = useCallback((playerId: number, isBattleRoyale: boolean) => {
        
        const buildThreatHeatmap = (state: GameState, enemy: Player): number[][] => {
            const heatmap = Array(state.gridSize).fill(0).map(() => Array(state.gridSize).fill(0));
            const allBlockers = [...state.obstacles.map(o => ({position: o.position})), ...state.players, ...state.decoys, ...state.skeletons];

            for (let y = 0; y < state.gridSize; y++) {
                for (let x = 0; x < state.gridSize; x++) {
                    const tile = { x, y };
                    const dist = getDistance(tile, enemy.position);
                    
                    if (enemy.skills.some(s => ['Attack', 'Special', 'Debuff'].includes(s.type) && dist <= s.range)) {
                        heatmap[y][x] += 5;
                    }
                    if (getDistance(tile, {x: 5, y: 5}) <= 2) {
                        heatmap[y][x] += 2;
                    }
                    if (hasLineOfSight(enemy.position, tile, allBlockers, state.effectZones)) {
                        heatmap[y][x] += 3;
                    }
                    if (dist <= 1) {
                        heatmap[y][x] += 4;
                    }
                }
            }
            return heatmap;
        };

        const simulateMoveExecution = (initialState: GameState, pId: number, move: SelectedMove): GameState => {
            return produce(initialState, draft => {
                let player = draft.players.find(p => p.id === pId);
                if (!player || !move.skill || !move.target) return;
        
                const targetUnit = [...draft.players, ...draft.decoys, ...draft.skeletons].find(t => t.position.x === move.target?.x && t.position.y === move.target?.y);
        
                if (targetUnit && 'statusEffects' in targetUnit) {
                    const isTargetVanished = targetUnit.statusEffects.some(e => e.type === StatusEffectType.VANISHED) && (!move.skill.aoe || move.skill.aoe === 0);
                    if (isTargetVanished) return;
                }
        
                const allBlockers = [...draft.obstacles, ...draft.players.map(p => ({position: p.position})), ...draft.decoys.map(d => ({position: d.position}))];
                const activePlayerDecoy = draft.decoys.find(d => d.playerId === player!.id);
                let sourcePos = player.position;
                if (activePlayerDecoy && move.skill.type !== SkillType.MOVE) {
                    const distFromPlayer = getDistance(player.position, move.target);
                    const distFromDecoy = getDistance(activePlayerDecoy.position, move.target);
                    if (distFromDecoy < distFromPlayer) {
                        sourcePos = activePlayerDecoy.position;
                    }
                }
        
                const isConstricted = player.statusEffects.some(e => e.type === StatusEffectType.CONSTRICTED_DEBUFF);
                const isSlowed = player.statusEffects.some(e => e.type === StatusEffectType.SLOW_DEBUFF);
                
                let effectiveRange = move.skill.range;
                if(isConstricted) effectiveRange = Math.max(0, effectiveRange - 2);
                if(isSlowed && move.skill.type === SkillType.MOVE) effectiveRange = Math.max(0, Math.floor(effectiveRange / 2));

                if (getDistance(sourcePos, move.target) > effectiveRange) return;
                if (move.skill.type !== SkillType.MOVE && !hasLineOfSight(sourcePos, move.target, allBlockers, draft.effectZones)) return;
        
                const costType = move.skill.costType;
                let cost = costType === CostType.HP ? player.maxHp * (move.skill.cost / 100) : move.skill.cost;
                if ((costType === CostType.MP && player.mp < cost) || (costType === CostType.STAMINA && player.stamina < cost) || (costType === CostType.HP && player.hp <= cost)) return;
                
                if (costType === CostType.MP) player.mp -= cost;
                else if (costType === CostType.STAMINA) player.stamina -= cost;
                else if (costType === CostType.HP) player.hp -= cost;
        
                if (move.skill.type === SkillType.MOVE) {
                    player.position = move.target;
                } else if (['Attack', 'Special', 'Debuff'].includes(move.skill.type)) {
                    if (move.skill.id === 'sp1') {
                        draft.decoys = draft.decoys.filter(d => d.playerId !== player!.id);
                        draft.decoys.push({ id: Date.now(), playerId: player.id, hp: 30, maxHp: 30, position: move.target!, turnsRemaining: 4, color: player.color });
                    } else {
                        if (targetUnit && 'stats' in targetUnit) {
                            const { finalDamage } = calculateDamage(player, targetUnit, move.skill!);
                            if (finalDamage > 0) targetUnit.hp = Math.max(0, targetUnit.hp - finalDamage);
                        } else if (targetUnit) {
                            targetUnit.hp = Math.max(0, targetUnit.hp - (move.skill.damage || 0));
                        }
                    }
                } else if (move.skill.id === 'sp21') {
                    const mpCost = Math.floor(player.mp * 0.5);
                    player.mp -= mpCost;
                    player.stamina = Math.min(player.maxStamina, player.stamina + Math.floor(mpCost * 1.5));
                } else if (move.skill.id === 'sp22') {
                    const staCost = Math.floor(player.stamina * 0.5);
                    player.stamina -= staCost;
                    player.mp = Math.min(player.maxMp, player.mp + Math.floor(staCost * 0.5));
                }
            });
        };

        const evaluateCombo = (state: GameState, aiId: number, primary: SelectedMove, followup: SelectedMove, threatMap: number[][], archetype: AiArchetype) => {
            const ai = state.players.find(p => p.id === aiId)!;
            const opponents = state.players.filter(p => p.id !== aiId && p.hp > 0);

            if (opponents.length === 0) return 10000;
            if (ai.hp <= 0) return -10000;
    
            const avgOpponentHpRatio = opponents.reduce((sum, p) => sum + (p.hp / p.maxHp), 0) / (opponents.length || 1);

            let score = (ai.hp / ai.maxHp) * 150 - avgOpponentHpRatio * 250;
            const aiActionPotential = (ai.mp / ai.maxMp) * 0.6 + (ai.stamina / ai.maxStamina) * 0.4;
            score += aiActionPotential * 25;

            const resourceCost = [primary.skill, followup.skill].reduce((total, skill) => {
                if (!skill || skill.id === STAY_SKILL.id) return total;
                if (skill.costType === CostType.MP) return total + skill.cost / Math.max(1, ai.maxMp);
                if (skill.costType === CostType.STAMINA) return total + skill.cost / Math.max(1, ai.maxStamina);
                return total + skill.cost / 100;
            }, 0);
            // A plan that spends most of a resource bar needs a clear payoff.
            // This stops AI from repeatedly burning stamina or MP on weak turns.
            score -= resourceCost * 42;
            if (ai.stamina / ai.maxStamina < 0.25 && [primary.skill, followup.skill].some(skill => skill?.costType === CostType.STAMINA)) score -= 55;
            if (ai.mp / ai.maxMp < 0.20 && [primary.skill, followup.skill].some(skill => skill?.costType === CostType.MP)) score -= 55;

            let comboScore = 0;
            const primaryTarget = state.players.find(p => primary.target && p.position.x === primary.target.x && p.position.y === primary.target.y && p.id !== aiId);
            const followupTarget = state.players.find(p => followup.target && p.position.x === followup.target.x && p.position.y === followup.target.y && p.id !== aiId);

            const primaryDmg = primary.skill?.damage && primaryTarget ? calculateDamage(ai, primaryTarget, primary.skill).finalDamage : 0;
            const followupDmg = followup.skill?.damage && followupTarget ? calculateDamage(ai, followupTarget, followup.skill).finalDamage : 0;
            
            if (primaryTarget && primaryDmg >= primaryTarget.hp) comboScore += 50;
            if (followupTarget && followupDmg >= followupTarget.hp) comboScore += 50;
            if (primaryTarget && primaryDmg + followupDmg >= primaryTarget.hp) comboScore += 100;
            if(primary.skill?.type === SkillType.MOVE && ['Attack', 'Special'].includes(followup.skill?.type || '') && primaryTarget) {
               const dist = getDistance(primary.target!, primaryTarget.position);
               if (dist > 1 && followup.skill && dist >= followup.skill.range -1) comboScore += 40; 
            }
            if (primary.skill?.costType !== followup.skill?.costType) comboScore += 30;
            if (primary.skill?.id === 'sp21' && followup.skill?.costType === CostType.STAMINA && followup.skill.cost > ai.stamina) comboScore += 150;
            if (primary.skill?.id === 'sp22' && followup.skill?.costType === CostType.MP && followup.skill.cost > ai.mp) comboScore += 150;
            
            const opponentDecoys = state.decoys.filter(d => d.playerId !== ai.id);
            const opponentSkeletons = state.skeletons.filter(s => s.playerId !== ai.id);
            if (primary.skill?.damage && primary.target) {
                if (opponentDecoys.some(d => d.position.x === primary.target!.x && d.position.y === primary.target!.y)) comboScore += 60;
                if (opponentSkeletons.some(s => s.position.x === primary.target!.x && s.position.y === primary.target!.y)) comboScore += 40;
            }
            if (followup.skill?.damage && followup.target) {
                if (opponentDecoys.some(d => d.position.x === followup.target!.x && d.position.y === followup.target!.y)) comboScore += 60;
                if (opponentSkeletons.some(s => s.position.x === followup.target!.x && s.position.y === followup.target!.y)) comboScore += 40;
            }

            score += comboScore;
            const learnedSkills = state.aiLearning[aiId]?.skillScores || {};
            score += ((primary.skill ? learnedSkills[primary.skill.id] || 0 : 0) + (followup.skill ? learnedSkills[followup.skill.id] || 0 : 0)) * 8;
            let threatAtAIPosition = 0;
            const finalAIPosition = primary.skill?.type === 'Move' ? primary.target! : ai.position;
            if (finalAIPosition.y < threatMap.length && finalAIPosition.x < threatMap[0].length) {
                threatAtAIPosition = threatMap[finalAIPosition.y][finalAIPosition.x];
            }


            if(archetype === 'Aggressor') {
               score += (primaryDmg + followupDmg) * 2.5;
               score += threatAtAIPosition * 2.0; // Reward engaging
               if (primaryTarget && primaryDmg > 0 && primaryDmg >= primaryTarget.hp) score += 500;
               if (followupTarget && followupDmg > 0 && followupDmg >= followupTarget.hp) score += 500;
               if (primaryTarget && primaryDmg + followupDmg >= primaryTarget.hp) score += 800;
               if (primary.skill?.id === STAY_SKILL.id && followup.skill?.id === STAY_SKILL.id && aiActionPotential > 0.4) score -= 300;
            } else if (archetype === 'Stalker') {
                score -= threatAtAIPosition * 1.5; // Avoid danger
                const nearestDistance = Math.min(...opponents.map(opponent => getDistance(finalAIPosition, opponent.position)));
                score += nearestDistance >= 2 && nearestDistance <= 4 ? 32 : -Math.abs(nearestDistance - 3) * 8;
                if (ai.hp / ai.maxHp < 0.45 && primary.skill?.type === SkillType.MOVE) score += 45;
            } else if (archetype === 'Breaker') {
                score += (primaryDmg + followupDmg) * 1.35;
                if ([primary.skill?.type, followup.skill?.type].includes(SkillType.DEBUFF)) score += 38;
                if (opponents.some(opponent => opponent.statusEffects.some(effect => effect.type.endsWith('_BUFF'))) && (primaryDmg + followupDmg) > 0) score += 28;
            } else {
                // Zoners value safe ranged pressure and economical repositioning.
                score -= threatAtAIPosition * 2.1;
                if ((primary.skill?.range || 0) >= 3) score += 28;
                if ((followup.skill?.range || 0) >= 3) score += 20;
                if (primary.skill?.type === SkillType.MOVE && resourceCost < 0.25) score += 24;
            }

            if (ai.hp / ai.maxHp < 0.35) {
                if ([primary.skill?.type, followup.skill?.type].some(type => type === SkillType.MOVE || type === SkillType.BUFF)) score += 55;
                if (resourceCost > 0.7) score -= 35;
            }
            
            score += (Math.random() - 0.5) * 15;
            return score;
        };
        
        const generateAiMoves = (currentState: GameState, aiId: number, isBR: boolean) => {
            const aiPlayer = currentState.players.find(p => p.id === aiId)!;
            const opponents = currentState.players.filter(p => p.id !== aiId && p.hp > 0);
            if (opponents.length === 0) {
                return { primary: { skill: STAY_SKILL, target: aiPlayer.position }, followup: { skill: STAY_SKILL, target: aiPlayer.position }, archetype: 'Stalker' as AiArchetype };
            }

            let opponentPlayer = opponents[0];
            let bestTargetScore = -Infinity;
            for (const opp of opponents) {
                const dist = getDistance(aiPlayer.position, opp.position);
                const hpPercent = opp.hp / opp.maxHp;
                const score = (1 - hpPercent) * 2 - dist; // Prioritize low HP and close targets
                if (score > bestTargetScore) {
                    bestTargetScore = score;
                    opponentPlayer = opp;
                }
            }
            
            const allBlockers = [...currentState.obstacles, ...currentState.decoys.map(d=>({position: d.position, duration: 1})), ...currentState.skeletons.map(s=>({position: s.position, duration: 1}))];
            
            const learnedProfile = currentState.aiLearning[aiId] || emptyAiProfile();
            const archetype = isBR ? 'Aggressor' : AI_ARCHETYPES.reduce((best, candidate) => {
                const candidateScore = (learnedProfile.archetypeScores[candidate] || 0) + Math.random() * 0.35;
                const bestScore = (learnedProfile.archetypeScores[best] || 0) + Math.random() * 0.35;
                return candidateScore > bestScore ? candidate : best;
            }, AI_ARCHETYPES[0]);

            const threatMap = buildThreatHeatmap(currentState, opponentPlayer);

            let bestMovePair = { primary: { skill: STAY_SKILL, target: aiPlayer.position }, followup: { skill: STAY_SKILL, target: aiPlayer.position } };
            let bestScore = -Infinity;

            const getPossibleMoves = (player: Player, state: GameState, sourcePosOverride?: Position): SelectedMove[] => {
                let moves: SelectedMove[] = [];
                const skillCooldowns = state.skillCooldowns[player.id] || {};
                const currentOpponents = state.players.filter(p => p.id !== player.id && p.hp > 0);
                const activePlayerDecoy = state.decoys.find(d => d.playerId === player.id);
                const sourcePosition = sourcePosOverride || player.position;
                
                for(const skill of player.skills) {
                    if ((skillCooldowns[skill.id] || 0) > 0) continue;
                    const costType = skill.costType;
                    const cost = costType === CostType.HP ? player.maxHp * (skill.cost / 100) : skill.cost;
                    if ((costType === CostType.MP && player.mp < cost) || (costType === CostType.STAMINA && player.stamina < cost) || (costType === CostType.HP && player.hp <= cost)) continue;

                    if (skill.type === SkillType.MOVE) {
                        for(let y = 0; y < state.gridSize; y++) for(let x = 0; x < state.gridSize; x++) {
                            const targetPos = {x, y};
                            if (getDistance(sourcePosition, targetPos) > skill.range) continue;
                            const isOccupied = [...state.players, ...state.decoys, ...state.skeletons, ...state.obstacles].some(o => o.position.x === x && o.position.y === y);
                            if(!isOccupied || skill.id === 's105') moves.push({ skill, target: targetPos });
                        }
                    } else if (skill.range === 0) {
                        moves.push({ skill, target: player.position });
                    } else {
                        const potentialTargets: (Player | Decoy | Skeleton)[] = [...currentOpponents, ...state.decoys.filter(d => d.playerId !== player.id), ...state.skeletons.filter(s => s.playerId !== player.id)];
                        
                        for (const target of potentialTargets) {
                            const isVanished = 'statusEffects' in target && target.statusEffects.some(e => e.type === StatusEffectType.VANISHED) && (!skill.aoe || skill.aoe === 0);
                            if (isVanished) continue;
                            
                            let sources = [sourcePosition];
                            if(activePlayerDecoy && !sourcePosOverride) sources.push(activePlayerDecoy.position);
                
                            for(const source of sources) {
                                if(getDistance(source, target.position) <= skill.range && hasLineOfSight(source, target.position, allBlockers, state.effectZones)) {
                                    moves.push({ skill, target: target.position });
                                    break;
                                }
                            }
                        }
                    }
                }
                moves.push({ skill: STAY_SKILL, target: player.position });
                return moves;
            };

            const primaryMoves = getPossibleMoves(aiPlayer, currentState);

            for (const primaryMove of primaryMoves) {
                const stateAfterPrimary = simulateMoveExecution(currentState, aiPlayer.id, primaryMove);
                const aiAfterPrimary = stateAfterPrimary.players.find(p => p.id === aiId)!;
                
                const followupSource = primaryMove.skill?.type === SkillType.MOVE ? primaryMove.target : (primaryMove.skill?.id === 'sp1' ? primaryMove.target : undefined);

                const followupMoves = getPossibleMoves(aiAfterPrimary, stateAfterPrimary, followupSource);

                for (const followupMove of followupMoves) {
                    const stateAfterFollowup = simulateMoveExecution(stateAfterPrimary, aiId, followupMove);
                    const score = evaluateCombo(stateAfterFollowup, aiId, primaryMove, followupMove, threatMap, archetype);

                    if (score > bestScore) {
                        bestScore = score;
                        bestMovePair = { primary: primaryMove, followup: followupMove };
                    }
                }
            }
            return { ...bestMovePair, archetype };
        };

        setTimeout(() => {
            setGameState(prev => produce(prev, draft => {
                const aiPlayer = draft.players.find(p => p.id === playerId)!;
                if (!aiPlayer) return;
                const { primary, followup, archetype } = generateAiMoves(draft, playerId, isBattleRoyale);
                // Store the approach that produced this move pair. When the
                // match ends, it is rewarded or penalized in persistent memory.
                draft.aiArchetypes[playerId] = archetype;
                if(!draft.playerActions[aiPlayer.id]) return;
                draft.playerActions[aiPlayer.id].primary = primary;
                draft.playerActions[aiPlayer.id].followup = followup;
                draft.playerActions[aiPlayer.id].confirmed = true;
                const decisions = [primary.skill?.id, followup.skill?.id].filter((skillId): skillId is string => Boolean(skillId));
                draft.aiMatchSkills[playerId] = [...(draft.aiMatchSkills[playerId] || []), ...decisions].slice(-80);
                if (draft.phase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
                    draft.log.push(`${aiPlayer.name} (AI) has confirmed its moves.`);
                }
                
                if (draft.phase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
                    const opponent = draft.players.find(p => p.id !== playerId);
                    const p1 = draft.players.find(p => p.id === 1);
                    const p2 = draft.players.find(p => p.id !== 1);
                    if (p1 && p2 && p1.isAi && p2.isAi) {
                        const p1Actions = p1.id === playerId ? {primary, followup, confirmed: true} : draft.playerActions[p1.id];
                        const p2Actions = p2.id === playerId ? {primary, followup, confirmed: true} : draft.playerActions[p2.id];
                        if (p1Actions.confirmed && p2Actions.confirmed) {
                             draft.aiBattleReport.push(`--- Turn ${draft.turn} ---`);
                             draft.aiBattleReport.push(`P1 (${p1.name}) chose: ${p1Actions.primary.skill?.name} -> ${p1Actions.followup.skill?.name}`);
                             draft.aiBattleReport.push(`P2 (${p2.name}) chose: ${p2Actions.primary.skill?.name} -> ${p2Actions.followup.skill?.name}`);
                        }
                    }

                    if (draft.playerActions[1]?.confirmed && opponent && draft.playerActions[opponent.id]?.confirmed) {
                        draft.log.push(`Both players ready. Combat starting soon...`);
                        draft.countdown = 2;
                    }
                }
            }));
        }, 50);

    }, []);
    
    useEffect(() => {
        if (gameState.countdown === null || gameState.countdown < 0) return;
        if (gameState.countdown === 0) {
             if (gameState.phase === GamePhase.SELECTING_MOVES) {
                setGameState(prev => produce(prev, draft => { draft.phase = GamePhase.RESOLVING_COMBAT; draft.countdown = null; }));
            } else if (gameState.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
                setGameState(prev => produce(prev, draft => { draft.countdown = null; }));
            }
            return;
        }
        const timer = setTimeout(() => setGameState(prev => produce(prev, d => { if(d.countdown !== null) d.countdown -= 1; })), 1000);
        return () => clearTimeout(timer);
    }, [gameState.countdown, gameState.phase]);

    useEffect(() => {
        if (gameState.phase === GamePhase.RESOLVING_COMBAT) {
            resolveCombat();
        } else if (gameState.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS && gameState.countdown === 0) {
            resolveBattleRoyaleCombat();
        }
    }, [gameState.phase, gameState.countdown, resolveCombat, resolveBattleRoyaleCombat]);

    useEffect(() => {
        if (gameState.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
            const livingPlayers = gameState.players.filter(p => p.hp > 0);
    
            if (livingPlayers.length <= 1) {
                if (gameState.winner === null) {
                    setGameState(prev => produce(prev, draft => {
                        draft.phase = GamePhase.GAME_OVER;
                        const winnerPlayer = livingPlayers.length > 0 ? livingPlayers[0] : null;
                        draft.winner = winnerPlayer ? winnerPlayer.id : -1;
                        draft.log.push(`--- Battle Royale Concluded! ---`);
                        if (winnerPlayer) {
                             draft.log.push(`${winnerPlayer.name} is the champion!`);
                        } else {
                            draft.log.push('All combatants have been defeated!');
                        }
                        if (draft.winner === 1) {
                            draft.aiBattleReport.push(`--- BR Summary ---`, `Player 1 was the champion!`);
                        } else {
                             draft.aiBattleReport.push(`--- BR Summary ---`, `Player 1 was defeated.`);
                        }
                    }));
                    
                    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
                    restartTimerRef.current = window.setTimeout(() => {
                        handleReturnToCampaign();
                    }, 5000);
                }
                return;
            }

            const humanPlayers = livingPlayers.filter(p => !p.isAi);
            const allHumansConfirmed = humanPlayers.every(p => gameState.playerActions[p.id]?.confirmed);
    
            if (allHumansConfirmed) {
                const allLivingConfirmed = livingPlayers.every(p => gameState.playerActions[p.id]?.confirmed);
                if (allLivingConfirmed) {
                     if (gameState.countdown === null) {
                        setGameState(prev => produce(prev, draft => { draft.countdown = 2; }));
                    }
                } else {
                     livingPlayers.forEach(p => {
                        if (p.isAi && !gameState.playerActions[p.id]?.confirmed) {
                            runAiTurn(p.id, true);
                        }
                    });
                }
            }
            return;
        }

        const p1 = gameState.players.find(p => p.id === 1);
        const p2 = gameState.players.find(p => p.id !== 1);

        if (!p1 || !p2) return; // Not in 1v1 mode

        const p1Actions = gameState.playerActions[p1.id];
        const p2Actions = gameState.playerActions[p2.id];

        if (gameState.phase === GamePhase.SELECTING_MOVES) {
            if(p1.isAi && !p1Actions.confirmed) runAiTurn(p1.id, false);
            if(p2.isAi && !p2Actions.confirmed) runAiTurn(p2.id, false);

            if (p1Actions?.confirmed && p2Actions?.confirmed && gameState.countdown === null) {
                setGameState(prev => produce(prev, draft => { 
                    draft.countdown = 2; 
                }));
            }
        }
    }, [gameState.playerActions, gameState.players, gameState.phase, gameState.countdown, runAiTurn]);

    const handleGenerateChallenger = () => {
        const newId = Math.max(...gameState.challengers.map(c => c.id), 0) + 1;

        const moveSkills = SKILLS.filter(s => s.type === SkillType.MOVE && s.id !== STAY_SKILL.id);
        const specialSkills = ALL_GAME_SKILLS.filter(s => s.type === SkillType.SPECIAL);
        const otherSkills = ALL_GAME_SKILLS.filter(s => s.type !== SkillType.MOVE && s.type !== SkillType.SPECIAL);
    
        const skillSet = new Set<Skill>();
        skillSet.add(STAY_SKILL);
        skillSet.add(moveSkills[Math.floor(Math.random() * moveSkills.length)]);
        skillSet.add(specialSkills[Math.floor(Math.random() * specialSkills.length)]);

        while(skillSet.size < 9) {
            skillSet.add(otherSkills[Math.floor(Math.random() * otherSkills.length)]);
        }

        const newChallenger: Player = {
            id: newId,
            name: `Challenger #${newId - 1}`,
            hp: 100 + Math.floor(Math.random() * 50),
            maxHp: 100,
            mp: 50 + Math.floor(Math.random() * 50),
            maxMp: 50,
            stamina: 70 + Math.floor(Math.random() * 40),
            maxStamina: 70,
            position: { x: 9, y: 5 },
            stats: {
                strength: 8 + Math.floor(Math.random() * 8),
                dexterity: 8 + Math.floor(Math.random() * 8),
                intelligence: 8 + Math.floor(Math.random() * 8),
                speed: 8 + Math.floor(Math.random() * 8),
                defense: 8 + Math.floor(Math.random() * 8),
                endurance: 8 + Math.floor(Math.random() * 8),
                luck: 5 + Math.floor(Math.random() * 5),
            },
            skills: Array.from(skillSet),
            color: `bg-teal-600`,
            isAi: true,
            statusEffects: [],
        };
        newChallenger.maxHp = newChallenger.hp;
        newChallenger.maxMp = newChallenger.mp;
        newChallenger.maxStamina = newChallenger.stamina;

        setGameState(prev => produce(prev, draft => {
            draft.generatedChallenger = newChallenger;
        }));
    };

    const handleAddChallengerAndFight = () => {
        setGameState(prev => produce(prev, draft => {
            if (draft.generatedChallenger) {
                draft.challengers.push(draft.generatedChallenger);
                draft.currentOpponentIndex = draft.challengers.length - 2; // -1 for index, -1 to get to current before increment
                draft.generatedChallenger = null;
                setupNextBattle(draft);
            }
        }));
    };

    const activePlayer = useMemo(() => gameState.players.find(p => p.id === gameState.activePlayerId), [gameState.players, gameState.activePlayerId]);
    const activePlayerActions = useMemo(() => gameState.playerActions[gameState.activePlayerId] || null, [gameState.playerActions, gameState.activePlayerId]);
    const selectedSkill = useMemo(() => {
        const player = gameState.players.find(p => p.id === gameState.activePlayerId);
        if (!player || player.isAi) return null;
        return gameState.playerActions[gameState.activePlayerId]?.[gameState.activeMoveSlot]?.skill || null;
    }, [gameState.playerActions, gameState.activePlayerId, gameState.activeMoveSlot, gameState.players]);
    
    const calculateBattleRating = () => {
        const { turn, players, currentOpponentIndex } = gameState;
        const player = players[0];
        const hpPercent = (player.hp / player.maxHp) * 100;
        const turnsPerOpponent = turn / (currentOpponentIndex + 1);
        if (turnsPerOpponent <= 5 && hpPercent >= 80) return "S";
        if (turnsPerOpponent <= 8 && hpPercent >= 60) return "A";
        if (turnsPerOpponent <= 12 && hpPercent >= 40) return "B";
        return "C";
    };

    const handlePlayAgain = () => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        setGameState(getInitialState(gameState.p1AiStatBuffs, gameState.aiBattleReport, gameState.challengers, 0, gameState.aiLearning));
    };

    const restartAiVsAi = () => {
        if (restartTimerRef.current) {
            clearTimeout(restartTimerRef.current);
            restartTimerRef.current = null;
        }
        setGameState(produce(getInitialState(undefined, gameState.aiBattleReport, gameState.challengers, 0, gameState.aiLearning), (draft: GameState) => {
            draft.players[0].isAi = true;
            const opponent = draft.players.find(p => p.id !== 1);
            if (opponent) opponent.isAi = true;
            draft.adminSettings.player1IsAi = true;
        }));
    };

    const p1 = gameState.players.find(p => p.id === 1);
    const p2 = gameState.phase !== GamePhase.BATTLE_ROYALE_IN_PROGRESS ? gameState.players.find(p => p.id !== 1) : undefined;
    
    const isP1ToggleDisabled = gameState.phase !== GamePhase.SELECTING_MOVES || (p1 && gameState.playerActions[p1.id]?.confirmed);
    const isP2ToggleDisabled = gameState.phase !== GamePhase.SELECTING_MOVES || (p2 && gameState.playerActions[p2.id]?.confirmed);

    const opponentsToShow = useMemo(() => {
        if (gameState.adminSettings.singleOpponentMode) {
            return [gameState.challengers[0]];
        }
        return gameState.challengers;
    }, [gameState.adminSettings.singleOpponentMode, gameState.challengers]);

    const skillsForTesting = useMemo(() => {
        if (gameState.adminSettings.hideUnownedSkills) {
            return PLAYER_1_INITIAL.skills;
        }
        return ALL_GAME_SKILLS;
    }, [gameState.adminSettings.hideUnownedSkills]);

    if (gameState.phase === GamePhase.BATTLE_ROYALE_IN_PROGRESS) {
        const p1_br = gameState.players.find(p => p.id === 1);
        const p1_br_actions = p1_br ? gameState.playerActions[p1_br.id] : null;

        return (
             <div className="flex flex-col h-screen bg-gray-900 text-gray-200" onClick={() => !userInteracted && setUserInteracted(true)}>
                <header className="w-full p-2 border-b-2 border-gray-700/50">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex-grow lg:flex-grow-0 min-w-[150px] text-left">
                           <p className="font-bold text-lg text-gray-300">Turn: <span className="text-white">{gameState.turn}</span></p>
                        </div>
                        <h1 className="w-full text-center order-first lg:order-none lg:w-auto text-xl sm:text-2xl font-bold text-red-500 animate-pulse">
                            BATTLE ROYALE
                        </h1>
                        <div className="flex-grow lg:flex-grow-0 flex justify-end items-center space-x-1 sm:space-x-2">
                            <StrategyBook skillsForTesting={skillsForTesting} /> 
                            <GameRules /> 
                             <AdminChecklist />
                            <AICombatBook 
                                adminSettings={gameState.adminSettings} 
                                onSettingsChange={handleAdminSettingsChange} 
                                aiBattleReport={gameState.aiBattleReport} 
                                onStartBattleRoyale={handleStartBattleRoyale}
                                isBattleRoyaleMode={true}
                                onReturnToCampaign={handleReturnToCampaign}
                                onGenerateChallenger={handleGenerateChallenger}
                                generatedChallenger={gameState.generatedChallenger}
                                onAddChallengerAndFight={handleAddChallengerAndFight}
                            /> 
                        </div>
                    </div>
                </header>
                 <main className="flex-grow flex flex-col md:flex-row gap-2 p-1 sm:p-2 md:p-4 overflow-hidden">
                    {p1_br && p1_br.hp > 0 && p1_br_actions && (
                        <div className="w-full md:w-1/4 md:max-w-xs lg:max-w-sm flex-shrink-0 md:overflow-y-auto p-1">
                            <PlayerUI
                                player={p1_br}
                                actions={p1_br_actions}
                                skillCooldowns={gameState.skillCooldowns[1]}
                                onSkillSelect={(skill) => handleSkillSelect(1, skill)}
                                onConfirmMoves={() => handleConfirmMoves(1)}
                                isActive={!p1_br.isAi}
                                gamePhase={gameState.phase}
                                activeMoveSlot={gameState.activeMoveSlot}
                                onSetActiveMoveSlot={(slot) => handleSetActiveMoveSlot(1, slot)}
                                onToggleAI={(isAi) => handleToggleAI(1, isAi)}
                                isToggleAIDisabled={p1_br_actions.confirmed}
                            />
                        </div>
                    )}
                    <div className="flex-grow flex items-center justify-center relative overflow-hidden p-1">
                        <GameBoard gridSize={gameState.gridSize} players={gameState.players} decoys={gameState.decoys} skeletons={gameState.skeletons} obstacles={gameState.obstacles} traps={gameState.traps} damagingTiles={gameState.damagingTiles} effectZones={gameState.effectZones} rifts={gameState.rifts} projectiles={gameState.projectiles} selectedSkill={selectedSkill} onCellClick={handleCellClick} activePlayer={activePlayer!} activePlayerActions={activePlayerActions} activeMoveSlot={gameState.activeMoveSlot} floatingTexts={gameState.floatingTexts} skillAnimation={gameState.skillAnimation} shrinkLevel={gameState.shrinkLevel} />
                    </div>
                    <div className="w-full md:w-1/4 md:max-w-xs lg:max-w-sm flex-shrink-0 md:overflow-y-auto p-1">
                        <BattleRoyaleStatus players={gameState.players} playerActions={gameState.playerActions} />
                    </div>
                 </main>
                 <footer className="w-full"> <GameLog logs={gameState.log} isBattleRoyale={true} /> </footer>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-gray-200" onClick={() => !userInteracted && setUserInteracted(true)}>
            <header className="w-full p-2 border-b-2 border-gray-700/50">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex-grow lg:flex-grow-0">
                        <OpponentMeter opponents={opponentsToShow} currentOpponentIndex={gameState.currentOpponentIndex} />
                    </div>
                    <h1 className="w-full text-center order-first lg:order-none lg:w-auto text-xl sm:text-2xl font-bold text-yellow-300">
                        Isometric Grid Combat
                    </h1>
                    <div className="flex-grow lg:flex-grow-0 flex justify-end items-center space-x-1 sm:space-x-2">
                        <StrategyBook skillsForTesting={skillsForTesting} /> 
                        <GameRules /> 
                        <AdminChecklist />
                        <AICombatBook 
                            adminSettings={gameState.adminSettings} 
                            onSettingsChange={handleAdminSettingsChange} 
                            aiBattleReport={gameState.aiBattleReport} 
                            onStartBattleRoyale={handleStartBattleRoyale}
                            onGenerateChallenger={handleGenerateChallenger}
                            generatedChallenger={gameState.generatedChallenger}
                            onAddChallengerAndFight={handleAddChallengerAndFight}
                        /> 
                    </div>
                </div>
            </header>
            <main className="flex-grow flex flex-col md:flex-row gap-2 p-1 sm:p-2 md:p-4 overflow-hidden">
                {p1 &&
                <div className="w-full md:w-1/4 md:max-w-xs lg:max-w-sm flex-shrink-0 md:overflow-y-auto p-1">
                    <PlayerUI player={p1} opponent={p2} actions={gameState.playerActions[1]} skillCooldowns={gameState.skillCooldowns[1]} onSkillSelect={(skill) => handleSkillSelect(1, skill)} onConfirmMoves={() => handleConfirmMoves(1)} isActive={gameState.activePlayerId === 1 && gameState.phase === GamePhase.SELECTING_MOVES} gamePhase={gameState.phase} activeMoveSlot={gameState.activeMoveSlot} onSetActiveMoveSlot={(slot) => handleSetActiveMoveSlot(1, slot)} extraLives={gameState.extraLives} onToggleAI={(isAi) => handleToggleAI(1, isAi)} isToggleAIDisabled={isP1ToggleDisabled} />
                </div>
                }
                <div className="flex-grow flex items-center justify-center relative overflow-hidden p-1">
                   <GameBoard gridSize={gameState.gridSize} players={gameState.players} decoys={gameState.decoys} skeletons={gameState.skeletons} obstacles={gameState.obstacles} traps={gameState.traps} damagingTiles={gameState.damagingTiles} effectZones={gameState.effectZones} rifts={gameState.rifts} projectiles={gameState.projectiles} selectedSkill={selectedSkill} onCellClick={handleCellClick} activePlayer={activePlayer!} activePlayerActions={activePlayerActions} activeMoveSlot={gameState.activeMoveSlot} floatingTexts={gameState.floatingTexts} skillAnimation={gameState.skillAnimation} />
                </div>
                 {p2 &&
                <div className="w-full md:w-1/4 md:max-w-xs lg:max-w-sm flex-shrink-0 md:overflow-y-auto p-1">
                    <PlayerUI player={p2} opponent={p1} actions={gameState.playerActions[p2.id]} skillCooldowns={gameState.skillCooldowns[p2.id]} onSkillSelect={(skill) => handleSkillSelect(p2.id, skill)} onConfirmMoves={() => handleConfirmMoves(p2.id)} isActive={gameState.activePlayerId === p2.id && gameState.phase === GamePhase.SELECTING_MOVES} gamePhase={gameState.phase} activeMoveSlot={gameState.activeMoveSlot} onSetActiveMoveSlot={(slot) => handleSetActiveMoveSlot(p2.id, slot)} onToggleAI={(isAi) => handleToggleAI(p2.id, isAi)} isToggleAIDisabled={isP2ToggleDisabled} />
                </div>
                 }
            </main>
            {gameState.phase === GamePhase.UPGRADE_PHASE && p1 && (
                <UpgradeScreen player={p1} onConfirm={handleConfirmUpgrade} />
            )}
            {gameState.phase === GamePhase.GAME_OVER && (
                 <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
                     <div className="bg-gray-800 p-10 rounded-lg shadow-lg text-center space-y-4">
                         <h2 className="text-4xl font-bold text-yellow-400">Game Over</h2>
                         <p className="text-2xl mt-4">
                            {(() => {
                                const winnerPlayer = gameState.players.find(p => p.id === gameState.winner);
                                if (!winnerPlayer) return 'The battle has ended!';
                                const cameFromBR = gameState.players.length > 2 || gameState.gridSize > 11;
                                if (cameFromBR) return `${winnerPlayer.name} is the champion!`;
                                if (winnerPlayer.id === 1) return 'You are Victorious!';
                                return `${winnerPlayer.name} is Victorious!`;
                            })()}
                         </p>
                         {gameState.winner === 1 && gameState.players.length <=2 && !gameState.adminSettings.singleOpponentMode && ( <div className="bg-gray-900/50 p-4 rounded-lg"> <h3 className="text-xl font-bold text-gray-300">Battle Rating</h3> <p className="text-6xl font-bold text-cyan-400 my-2">{calculateBattleRating()}</p> </div> )}
                         {gameState.battleReplay.length > 0 && (() => {
                            const frame = gameState.battleReplay[Math.min(replayIndex, gameState.battleReplay.length - 1)];
                            return (
                                <div className="mx-auto w-full max-w-2xl rounded-xl border border-yellow-400/40 bg-gray-900/90 p-4 text-left shadow-2xl">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="font-bold uppercase tracking-widest text-yellow-300">Battle Replay</h3>
                                            <p className="text-xs text-gray-400">Turn {frame.turn}: {frame.headline}</p>
                                        </div>
                                        <span className="rounded bg-yellow-400/15 px-2 py-1 text-xs font-bold text-yellow-200">{replayIndex + 1}/{gameState.battleReplay.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_1.2fr]">
                                        <div className="grid aspect-square w-full overflow-hidden rounded border border-gray-600 bg-gray-950" style={{ gridTemplateColumns: `repeat(${gameState.gridSize}, minmax(0, 1fr))` }}>
                                            {Array.from({ length: gameState.gridSize * gameState.gridSize }, (_, index) => {
                                                const x = index % gameState.gridSize;
                                                const y = Math.floor(index / gameState.gridSize);
                                                const player = frame.players.find(entry => entry.position.x === x && entry.position.y === y);
                                                return <div key={index} className="relative border border-gray-800/70 bg-gray-900/40">{player && <span title={`${player.name}: ${player.hp}/${player.maxHp}`} className="absolute inset-0 flex items-center justify-center text-[8px] font-black" style={{ color: player.color }}>{player.id === 1 ? 'P1' : `P${player.id}`}</span>}</div>;
                                            })}
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Key moments</p>
                                            {frame.events.map((event, index) => <p key={index} className="rounded bg-white/5 px-2 py-1.5 text-xs text-gray-200">{event}</p>)}
                                            <div className="border-t border-gray-700 pt-2 text-xs text-gray-400">{frame.players.map(player => <p key={player.id}><span style={{ color: player.color }} className="font-bold">{player.name}</span> · {player.hp}/{player.maxHp} HP</p>)}</div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-between gap-2">
                                        <button onClick={() => setReplayIndex(index => Math.max(0, index - 1))} disabled={replayIndex === 0} className="rounded bg-gray-700 px-3 py-1 text-xs font-bold disabled:opacity-40">Previous</button>
                                        <button onClick={() => setReplayIndex(index => Math.min(gameState.battleReplay.length - 1, index + 1))} disabled={replayIndex === gameState.battleReplay.length - 1} className="rounded bg-yellow-500 px-3 py-1 text-xs font-bold text-gray-900 disabled:opacity-40">Next moment</button>
                                    </div>
                                </div>
                            );
                         })()}
                         <div className="flex flex-col sm:flex-row gap-2">
                             <button onClick={handlePlayAgain} className="w-full py-2 bg-yellow-500 text-gray-900 font-bold rounded hover:bg-yellow-400 transition-colors"> Play Again </button>
                             {p1?.isAi && p2?.isAi && (
                                <button onClick={restartAiVsAi} className="w-full py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-500 transition-colors"> Play Again (AI vs AI) </button>
                             )}
                         </div>
                     </div>
                 </div>
            )}
            {gameState.countdown !== null && gameState.countdown > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm pointer-events-none">
                    <div key={gameState.countdown} className="countdown-animation">
                         <div className="w-48 h-48 bg-black/30 rounded-full flex items-center justify-center">
                            <div className="text-9xl font-bold text-yellow-300" style={{textShadow: '0 0 20px rgba(255,255,100,0.7)'}}> {gameState.countdown} </div>
                        </div>
                    </div>
                </div>
            )}
            <footer className="w-full"> <GameLog logs={gameState.log} /> </footer>
        </div>
    );
};

export default App;
