import React, { useState, useMemo, useCallback } from 'react';
import { produce } from 'immer';
import { Skill, Position, SkillType, Player, Decoy, Obstacle, StatusEffect, StatusEffectType, PlayerStats, CostType, EffectZone, EffectZoneType, SelectedMove, Skeleton, Trap, DamagingTile, Rift } from '../types';

const TEST_GRID_SIZE = 9;

const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
};

const hasLineOfSight = (start: Position, end: Position, obstacles: {position: Position}[], effectZones: EffectZone[]): boolean => {
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

const calculateDamage = (attacker: Player, target: Player, skill: Skill): { finalDamage: number } => {
    if (!skill.damage) return { finalDamage: 0 };
    let baseDamage = skill.damage;

    if (skill.id === 's14') { // Jab
        const missingHpPercent = (attacker.maxHp - attacker.hp) / attacker.maxHp;
        baseDamage += Math.floor(missingHpPercent * 30);
        const targetHasBuff = target.statusEffects.some(e => e.type.endsWith('_BUFF'));
        if (targetHasBuff) baseDamage *= 1.5;
    }

    let modifiedDamage = baseDamage;
    if (skill.costType === CostType.MP) modifiedDamage += attacker.stats.intelligence * 0.75;
    else modifiedDamage += attacker.stats.strength * 0.5;

    const strengthBuff = attacker.statusEffects.find(e => e.type === StatusEffectType.STRENGTH_BUFF);
    if (strengthBuff) modifiedDamage *= strengthBuff.potency || 1.5;

    const vanishBuff = attacker.statusEffects.find(e => e.type === StatusEffectType.VANISHED);
    if (vanishBuff) modifiedDamage *= 1.5;

    const dist = getDistance(attacker.position, target.position);
    if (skill.range > 1) {
        if (dist === 1) modifiedDamage *= 0.7;
        else if (dist >= skill.range - 1) modifiedDamage *= 1.2;
    }

    let defenseValue = target.stats.defense;
    const parryStance = target.statusEffects.find(e => e.type === StatusEffectType.PARRY_STANCE);
    if (parryStance) modifiedDamage *= 0.25;

    const vulnerableDebuff = target.statusEffects.find(e => e.type === StatusEffectType.VULNERABLE_DEBUFF);
    if (vulnerableDebuff) modifiedDamage *= vulnerableDebuff.potency || 1.5;

    let finalDamage = Math.max(1, modifiedDamage - defenseValue * 0.3);

    const lastStand = target.statusEffects.find(e => e.type === StatusEffectType.LAST_STAND_BUFF);
    if (lastStand && target.hp - finalDamage <= 0) {
        finalDamage = Math.max(0, target.hp - 1);
    }
    return { finalDamage: Math.round(finalDamage) };
};

interface TestFloatingText {
    id: number;
    text: string;
    color: string;
    position: Position;
}

interface SkillAnimation {
    key: number;
    skill: Skill;
    source: Position;
    target: Position;
}

interface TestState {
    players: Player[];
    decoys: Decoy[];
    skeletons: Skeleton[];
    obstacles: Obstacle[];
    traps: Trap[];
    damagingTiles: DamagingTile[];
    effectZones: EffectZone[];
    rifts: Rift[];
    skillCooldowns: { [playerId: number]: { [skillId: string]: number } };
}

const initialPlayerStats: PlayerStats = { strength: 10, dexterity: 10, intelligence: 10, speed: 10, defense: 10, endurance: 10, luck: 5 };
const initialTester: Player = { id: 1, name: 'Tester', hp: 100, maxHp: 100, mp: 100, maxMp: 100, stamina: 100, maxStamina: 100, position: { x: 1, y: 4 }, stats: initialPlayerStats, skills: [], color: 'bg-blue-500', isAi: false, statusEffects: [] };
const initialDummy: Player = { id: 2, name: 'Dummy', hp: 100, maxHp: 100, stamina: 100, maxStamina: 100, mp: 100, maxMp: 100, position: { x: 7, y: 4 }, stats: initialPlayerStats, skills: [], color: 'bg-red-500', isAi: true, statusEffects: [] };

const getInitialTestState = (): TestState => ({
    players: [
        { ...initialTester, hp: initialTester.maxHp, mp: initialTester.maxMp, stamina: initialTester.maxStamina, statusEffects: [], position: { x: 1, y: 4 } },
        { ...initialDummy, hp: initialDummy.maxHp, mp: initialDummy.maxMp, stamina: initialDummy.maxStamina, statusEffects: [], position: { x: 7, y: 4 } }
    ],
    decoys: [],
    skeletons: [],
    obstacles: [{ position: { x: 4, y: 2 }, duration: 99 }, { position: { x: 4, y: 6 }, duration: 99 }],
    traps: [],
    damagingTiles: [],
    effectZones: [],
    rifts: [],
    skillCooldowns: { 1: {}, 2: {} },
});

interface SkillTestingPanelProps {
    skillsToShow: Skill[];
}

const StatBar: React.FC<{ value: number; maxValue: number; color: string; }> = ({ value, maxValue, color }) => (
    <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={color} style={{ width: `${(value / maxValue) * 100}%`, height: '100%', borderRadius: 'inherit', transition: 'width 0.3s ease-in-out' }}></div>
    </div>
);

const PlayerStatus: React.FC<{ player: Player }> = ({ player }) => (
    <div className="bg-gray-800 p-2 rounded-md">
        <h4 className={`font-bold ${player.id === 1 ? 'text-blue-400' : 'text-red-400'}`}>{player.name}</h4>
        <div className="space-y-1 mt-1 text-xs">
            <div className="flex justify-between"><span>HP</span><span>{Math.ceil(player.hp)}/{player.maxHp}</span></div>
            <StatBar value={player.hp} maxValue={player.maxHp} color="bg-red-500" />
            <div className="flex justify-between"><span>MP</span><span>{Math.ceil(player.mp)}/{player.maxMp}</span></div>
            <StatBar value={player.mp} maxValue={player.maxMp} color="bg-blue-500" />
            <div className="flex justify-between"><span>STA</span><span>{Math.ceil(player.stamina)}/{player.maxStamina}</span></div>
            <StatBar value={player.stamina} maxValue={player.maxStamina} color="bg-green-500" />
        </div>
        <div className="mt-2 text-xs h-8 overflow-y-auto">
            {player.statusEffects.length > 0 ? player.statusEffects.map(e => (
                <p key={e.type} className="text-yellow-300">{e.type.replace(/_/g, ' ')} ({e.duration}t)</p>
            )) : <p className="text-gray-500">No active effects.</p>}
        </div>
    </div>
);

const SkillTestingPanel: React.FC<SkillTestingPanelProps> = ({ skillsToShow }) => {
    const [testState, setTestState] = useState<TestState>(getInitialTestState);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
    const [floatingTexts, setFloatingTexts] = useState<TestFloatingText[]>([]);
    const [setupMode, setSetupMode] = useState(false);
    const [movingEntity, setMovingEntity] = useState<'tester' | 'dummy' | null>(null);
    const [skillAnimation, setSkillAnimation] = useState<SkillAnimation | null>(null);

    const { players, obstacles, decoys, skeletons, effectZones } = testState;
    const tester = players.find(p => p.id === 1)!;
    const dummy = players.find(p => p.id === 2)!;

    const addFloatingText = useCallback((text: string, color: string, position: Position) => {
        const newText = { id: Date.now() + Math.random(), text, color, position };
        setFloatingTexts(prev => [...prev, newText]);
        setTimeout(() => {
            setFloatingTexts(current => current.filter(t => t.id !== newText.id));
        }, 1400);
    }, []);

    const triggerAnimation = useCallback((skill: Skill, source: Position, target: Position) => {
        const newAnim = { key: Date.now(), skill, source, target };
        setSkillAnimation(newAnim);
        setTimeout(() => {
            setSkillAnimation(currentAnim => (currentAnim?.key === newAnim.key ? null : currentAnim));
        }, 600);
    }, []);

    const executeTestMove = useCallback((draft: TestState, playerId: number, move: SelectedMove): { logs: string[] } => {
        const logs: string[] = [];
        let player = draft.players.find(p => p.id === playerId);
        if (!player || !move.skill || !move.target) return { logs };

        const allBlockers = [...draft.obstacles, ...draft.players.map(p => ({ position: p.position })), ...draft.decoys.map(d => ({ position: d.position })), ...draft.skeletons.map(s => ({ position: s.position }))];
        let sourcePos = player.position;

        if (getDistance(sourcePos, move.target) > move.skill.range) { logs.push("Out of range"); return { logs }; }
        if (move.skill.type !== SkillType.MOVE && !hasLineOfSight(sourcePos, move.target, allBlockers, draft.effectZones)) { logs.push("No LoS"); return { logs }; }

        const costType = move.skill.costType;
        const cost = costType === CostType.HP ? player.maxHp * (move.skill.cost / 100) : move.skill.cost;
        if ((costType === CostType.MP && player.mp < cost) || (costType === CostType.STAMINA && player.stamina < cost) || (costType === CostType.HP && player.hp <= cost)) { logs.push("Cannot afford"); return { logs }; }
        
        if (costType === CostType.MP) player.mp -= cost;
        else if (costType === CostType.STAMINA) player.stamina -= cost;
        else if (costType === CostType.HP) player.hp -= cost;
        if (cost > 0) addFloatingText(`-${Math.ceil(cost)} ${costType}`, 'text-gray-300', player.position);

        const allTargets = [...draft.players, ...draft.decoys, ...draft.skeletons];

        if (move.skill.type === SkillType.MOVE) {
            const isOccupied = allTargets.some(p => p.id !== player!.id && p.position.x === move.target!.x && p.position.y === move.target!.y) || draft.obstacles.some(o => o.position.x === move.target!.x && o.position.y === move.target!.y);
            if (!isOccupied || move.skill.id === 's105') {
                player.position = move.target;
            }
        } else if (['Attack', 'Special', 'Debuff'].includes(move.skill.type)) {
            const targetsHit: (Player | Decoy | Skeleton)[] = [];
            if (move.skill.aoe && move.skill.aoe > 0) {
                allTargets.forEach(t => { if(getDistance(t.position, move.target!) <= move.skill.aoe!) targetsHit.push(t); })
            } else {
                 const singleTarget = allTargets.find(t => t.position.x === move.target?.x && t.position.y === move.target?.y);
                 if(singleTarget) targetsHit.push(singleTarget);
            }
            targetsHit.forEach(target => {
                if ('stats' in target) { // Is a Player
                    const { finalDamage } = calculateDamage(player!, target, move.skill!);
                    if (finalDamage > 0) {
                        target.hp = Math.max(0, target.hp - finalDamage);
                        addFloatingText(`-${finalDamage}`, 'text-red-500 font-bold', target.position);
                    }
                    if (move.skill.id === 's106') target.statusEffects.push({ type: StatusEffectType.SILENCE_DEBUFF, duration: 3 });
                    if (move.skill.id === 's29') target.statusEffects.push({ type: StatusEffectType.IMMOBILIZED_DEBUFF, duration: 2 });
                } else { // Is a Decoy or Skeleton
                     let damage = move.skill!.damage || 0;
                     if(damage > 0) {
                        target.hp = Math.max(0, target.hp - damage);
                        addFloatingText(`-${damage}`, 'text-red-500', target.position);
                     }
                }
            });
            if (move.skill.id === 'sp1') draft.decoys.push({ id: Date.now(), playerId: player.id, hp: 30, maxHp: 30, position: move.target, turnsRemaining: 4, color: player.color });
            if (move.skill.id === 'sp2') player.statusEffects.push({ type: StatusEffectType.VANISHED, duration: 2 });

        } else if (move.skill.type === SkillType.BUFF) {
            if (move.skill.id === 's7') player.statusEffects.push({ type: StatusEffectType.PARRY_STANCE, duration: 2 });
            addFloatingText(`${move.skill.name}!`, 'text-yellow-400', player.position);
        }
        return { logs };
    }, [addFloatingText]);
    
    const handleSkillSelection = (skill: Skill) => {
        setSelectedSkill(skill);
        if(setupMode) setSetupMode(false);

        const currentTester = testState.players.find(p => p.id === 1)!;
        const currentDummy = testState.players.find(p => p.id === 2)!;
        const allBlockers = [...testState.obstacles, {position: currentTester.position}];

        if(skill.range > 0 && skill.type !== SkillType.MOVE) {
            if (getDistance(currentTester.position, currentDummy.position) > skill.range || !hasLineOfSight(currentTester.position, currentDummy.position, allBlockers, testState.effectZones)) {
                // Try to find a valid position for the dummy
                let newDummyPos: Position | null = null;
                const searchRadius = skill.range;
                
                // Prioritize straight lines
                const directions = [{x:1, y:0}, {x:-1, y:0}, {x:0, y:1}, {x:0, y:-1}];
                for (const dir of directions) {
                    const pos = {x: currentTester.position.x + dir.x * searchRadius, y: currentTester.position.y + dir.y * searchRadius};
                     if (pos.x >= 0 && pos.x < TEST_GRID_SIZE && pos.y >= 0 && pos.y < TEST_GRID_SIZE) {
                        if (!allBlockers.some(b => b.position.x === pos.x && b.position.y === pos.y) && hasLineOfSight(currentTester.position, pos, testState.obstacles.map(o=>({position:o.position})), testState.effectZones)) {
                            newDummyPos = pos;
                            break;
                        }
                     }
                }

                if(newDummyPos) {
                     setTestState(prev => produce(prev, draft => {
                        draft.players.find(p => p.id === 2)!.position = newDummyPos!;
                     }));
                }
            }
        }
    };

    const handleCellClick = (pos: Position) => {
        if (setupMode) {
             const isTesterPos = tester.position.x === pos.x && tester.position.y === pos.y;
             const isDummyPos = dummy.position.x === pos.x && dummy.position.y === pos.y;
             const isObstacle = obstacles.some(o => o.position.x === pos.x && o.position.y === pos.y);
             
             if(movingEntity) {
                if(!isTesterPos && !isDummyPos && !isObstacle) {
                    setTestState(prev => produce(prev, draft => {
                        const entity = draft.players.find(p => p.id === (movingEntity === 'tester' ? 1 : 2))!;
                        entity.position = pos;
                    }));
                    setMovingEntity(null);
                }
             } else {
                 if (isTesterPos) { setMovingEntity('tester'); return; }
                 if (isDummyPos) { setMovingEntity('dummy'); return; }
                 setTestState(prev => produce(prev, draft => {
                    const obsIndex = draft.obstacles.findIndex(o => o.position.x === pos.x && o.position.y === pos.y);
                    if (obsIndex > -1) draft.obstacles.splice(obsIndex, 1);
                    else draft.obstacles.push({ position: pos, duration: 99 });
                 }));
             }
            return;
        }

        if (!selectedSkill) return;
        triggerAnimation(selectedSkill, tester.position, pos);

        setTimeout(() => {
            setTestState(prev => produce(prev, draft => {
                executeTestMove(draft, 1, { skill: selectedSkill, target: pos });
            }));
        }, 500);
    };
    
    const renderAnimationLayer = () => {
        if (!skillAnimation) return null;
        const CELL_SIZE_REM = 3;
        const { skill, source, target } = skillAnimation;
        const animationElements: React.ReactNode[] = [];
        let targetAnimClass = '';
        switch (skill.type) { case SkillType.ATTACK: case SkillType.DEBUFF: targetAnimClass = 'animation-target-attack'; break; case SkillType.MOVE: targetAnimClass = 'animation-target-move'; break; case SkillType.BUFF: targetAnimClass = 'animation-target-buff'; break; case SkillType.SPECIAL: targetAnimClass = 'animation-target-special'; break; default: targetAnimClass = 'animation-target-attack'; }
        animationElements.push(<div key="source" className={`animation-tile animation-source absolute w-12 h-12`} style={{ top: `${source.y * CELL_SIZE_REM}rem`, left: `${source.x * CELL_SIZE_REM}rem` }} />);
        if (skill.aoe && skill.aoe > 0 && (['Attack', 'Special', 'Debuff'].includes(skill.type))) {
            for (let y = 0; y < TEST_GRID_SIZE; y++) for (let x = 0; x < TEST_GRID_SIZE; x++) if (getDistance({x, y}, target) <= skill.aoe) animationElements.push(<div key={`aoe-${x}-${y}`} className={`animation-tile ${targetAnimClass} absolute w-12 h-12`} style={{ top: `${y * CELL_SIZE_REM}rem`, left: `${x * CELL_SIZE_REM}rem` }} />);
        } else {
            animationElements.push(<div key="target" className={`animation-tile ${targetAnimClass} absolute w-12 h-12`} style={{ top: `${target.y * CELL_SIZE_REM}rem`, left: `${target.x * CELL_SIZE_REM}rem` }} />);
        }
        return <React.Fragment key={skillAnimation.key}>{animationElements}</React.Fragment>;
    };

    const renderGrid = () => {
        const cells = [];
        for (let y = 0; y < TEST_GRID_SIZE; y++) for (let x = 0; x < TEST_GRID_SIZE; x++) {
            const pos = { x, y };
            let cellStyle = 'bg-gray-700/30 border border-gray-600/30';
            if (setupMode) { /* ... setup styles ... */ }
            else if (selectedSkill) {
                const inRange = getDistance(tester.position, pos) <= selectedSkill.range;
                if (['Attack', 'Special', 'Debuff'].includes(selectedSkill.type)) {
                     const los = hasLineOfSight(tester.position, pos, [...obstacles.map(o=>({position:o.position})), dummy], effectZones);
                     if (inRange) cellStyle = los ? 'bg-green-500/30 border-green-400/50 cursor-pointer' : 'bg-orange-500/30 border-orange-400/50 cursor-not-allowed';
                     else cellStyle = 'bg-yellow-500/20 border-yellow-400/40';
                } else if(selectedSkill.type === SkillType.MOVE && inRange) {
                    cellStyle = 'bg-green-500/30 border-green-400/50 cursor-pointer';
                }
                if (hoveredCell && (selectedSkill.aoe || 0) > 0 && ['Attack', 'Special', 'Debuff'].includes(selectedSkill.type)) if (getDistance(pos, hoveredCell) <= selectedSkill.aoe!) cellStyle += ' outline outline-2 outline-red-400 outline-offset-[-2px]';
            }
            cells.push(<div key={`${x}-${y}`} className={`w-12 h-12 ${cellStyle} transition-colors`} onClick={() => handleCellClick(pos)} onMouseEnter={() => setHoveredCell(pos)} onMouseLeave={() => setHoveredCell(null)} />);
        }
        return cells;
    };


    return (
        <div className="bg-gray-900/50 p-4 rounded-lg flex flex-col md:flex-row gap-4">
            <div className="flex-grow flex flex-col items-center">
                 <div className="grid grid-cols-2 gap-2 w-full max-w-sm mb-2">
                    <PlayerStatus player={tester} />
                    <PlayerStatus player={dummy} />
                </div>
                <div className="grid relative" style={{ gridTemplateColumns: `repeat(${TEST_GRID_SIZE}, 3rem)`, gridTemplateRows: `repeat(${TEST_GRID_SIZE}, 3rem)` }}>
                    {renderGrid()}
                    {renderAnimationLayer()}
                     {obstacles.map((obs, i) => <div key={`obs-${i}`} className="absolute w-12 h-12 flex items-center justify-center pointer-events-none" style={{ top: `${obs.position.y * 3}rem`, left: `${obs.position.x * 3}rem` }}><div className="w-10 h-10 bg-gray-600 shadow-md border-2 border-gray-500"></div></div>)}
                    <div className="absolute w-12 h-12 flex items-center justify-center pointer-events-none" style={{ top: `${tester.position.y * 3}rem`, left: `${tester.position.x * 3}rem`, transition: 'all 0.3s ease' }}>
                        <div className={`w-8 h-8 rounded-full bg-blue-500 shadow-lg flex items-center justify-center font-bold relative transition-opacity ${tester.statusEffects.some(e => e.type === StatusEffectType.VANISHED) ? 'opacity-50' : 'opacity-100'}`}>P</div>
                    </div>
                    <div className="absolute w-12 h-12 flex items-center justify-center pointer-events-none" style={{ top: `${dummy.position.y * 3}rem`, left: `${dummy.position.x * 3}rem`, transition: 'all 0.3s ease' }}>
                        <div className="w-8 h-8 rounded-lg bg-red-500 shadow-lg flex items-center justify-center font-bold relative">D</div>
                    </div>
                    {decoys.map(d => <div key={d.id} className="absolute w-12 h-12 flex items-center justify-center pointer-events-none" style={{ top: `${d.position.y * 3}rem`, left: `${d.position.x * 3}rem`}}><div className="w-6 h-6 rounded-md bg-blue-500 shadow-md opacity-70 flex items-center justify-center font-bold">d</div></div>)}
                    {floatingTexts.map(ft => <div key={ft.id} className={`floating-text absolute pointer-events-none text-lg font-bold z-10 ${ft.color}`} style={{ top: `${ft.position.y * 3}rem`, left: `${ft.position.x * 3}rem`, width: `3rem`, textAlign: 'center', transform: 'translateZ(20px)'}}><div className="player-token-inner inline-block">{ft.text}</div></div>)}
                </div>
            </div>
            <div className="md:w-64 flex-shrink-0 flex flex-col">
                <div className="grid grid-cols-2 gap-2 mb-2">
                     <button onClick={() => { setSetupMode(!setupMode); setMovingEntity(null); }} className={`w-full p-2 rounded font-bold transition-colors ${setupMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500'}`}>{setupMode ? 'Exit Setup' : 'Setup Mode'}</button>
                     <button onClick={() => setTestState(getInitialTestState())} className="w-full p-2 rounded font-bold bg-red-800 hover:bg-red-700">Reset Sandbox</button>
                </div>
                {setupMode && <div className="text-center text-xs text-yellow-300 bg-yellow-900/30 p-2 rounded mb-2">{movingEntity ? `Click an empty tile to place the ${movingEntity}.` : 'Click units to move them or empty tiles to toggle obstacles.'}</div>}
                <div className="bg-gray-800/50 p-2 rounded-md flex-grow">
                    <h4 className="text-center font-bold mb-2 text-white">All Skills</h4>
                    <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                        {skillsToShow.map(skill => <button key={skill.id} onClick={() => handleSkillSelection(skill)} className={`w-full p-1.5 text-left rounded transition-colors flex items-center space-x-2 ${selectedSkill?.id === skill.id && !setupMode ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}><skill.icon className="w-5 h-5 flex-shrink-0" /><div><span className="font-semibold text-sm">{skill.name}</span><p className="text-xs text-gray-400">{skill.cost} {skill.costType}</p></div></button>)}
                    </div>
                </div>
                {selectedSkill && !setupMode && <div className="mt-2 p-2 bg-gray-900 rounded-md flex-grow"><h5 className="font-bold text-cyan-400">{selectedSkill.name}</h5><p className="text-sm text-gray-300 mt-1">{selectedSkill.description}</p><div className="text-xs text-gray-400 mt-2"><span>Cost: {selectedSkill.cost} {selectedSkill.costType}</span><span className="mx-2">|</span><span>Range: {selectedSkill.range}</span>{selectedSkill.damage && <><span className="mx-2">|</span><span>Dmg: {selectedSkill.damage}</span></>}</div></div>}
            </div>
        </div>
    );
};

export default SkillTestingPanel;
