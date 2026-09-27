import React, { useState } from 'react';
import { Player, PlayerActions, Skill, SkillType, CostType } from '../types';

interface BattleRoyaleStatusProps {
    players: Player[];
    playerActions: { [playerId: number]: PlayerActions };
}

const StatBar: React.FC<{ value: number; maxValue: number; color: string; }> = ({ value, maxValue, color }) => (
    <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={color} style={{ width: `${(value / maxValue) * 100}%`, height: '100%', borderRadius: 'inherit', transition: 'width 0.5s ease-in-out' }}></div>
    </div>
);

const PlayerDetails: React.FC<{ player: Player; actions: PlayerActions }> = ({ player, actions }) => {
    return (
        <div className="bg-gray-800/50 p-2 space-y-2 mt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                    <div className="flex justify-between"><span>MP</span><span>{Math.ceil(player.mp)}/{player.maxMp}</span></div>
                    <StatBar value={player.mp} maxValue={player.maxMp} color="bg-blue-500" />
                </div>
                <div>
                    <div className="flex justify-between"><span>STA</span><span>{Math.ceil(player.stamina)}/{player.maxStamina}</span></div>
                    <StatBar value={player.stamina} maxValue={player.maxStamina} color="bg-green-500" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs bg-gray-900/30 p-1 rounded">
                <div className="text-center"><span className="font-bold text-gray-400">STR:</span> {player.stats.strength}</div>
                <div className="text-center"><span className="font-bold text-gray-400">DEF:</span> {player.stats.defense}</div>
                <div className="text-center"><span className="font-bold text-gray-400">SPD:</span> {player.stats.speed}</div>
                <div className="text-center"><span className="font-bold text-gray-400">INT:</span> {player.stats.intelligence}</div>
                <div className="text-center"><span className="font-bold text-gray-400">END:</span> {player.stats.endurance}</div>
                <div className="text-center"><span className="font-bold text-gray-400">LCK:</span> {player.stats.luck}</div>
            </div>
            <div className="text-xs space-y-1">
                <p><span className="font-bold text-gray-400">Primary:</span> {actions.primary.skill?.name ?? 'Choosing...'}</p>
                <p><span className="font-bold text-gray-400">Follow-up:</span> {actions.followup.skill?.name ?? 'Choosing...'}</p>
            </div>
            <div>
                <h4 className="text-xs font-bold text-gray-400 mb-1">Skills</h4>
                <div className="flex flex-wrap gap-1">
                    {player.skills.map(skill => (
                        <div key={skill.id} className="p-1 rounded bg-gray-700 text-xs flex items-center space-x-1" title={skill.description}>
                            <skill.icon className="w-3 h-3" />
                            <span>{skill.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const BattleRoyaleStatus: React.FC<BattleRoyaleStatusProps> = ({ players, playerActions }) => {
    const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);
    const livingPlayers = players.filter(p => p.hp > 0);
    const sortedPlayers = [...players].sort((a,b) => {
        if (a.hp <= 0 && b.hp > 0) return 1;
        if (a.hp > 0 && b.hp <= 0) return -1;
        return b.hp - a.hp;
    });

    return (
        <div className="flex flex-col border-2 rounded-lg p-4 space-y-3 w-full h-full border-red-500 bg-gray-800/50">
            <h2 className="text-2xl font-bold text-red-400 text-center">BATTLE ROYALE</h2>
            <div className="text-center">
                <span className="text-xl font-bold text-white">{livingPlayers.length}</span>
                <span className="text-gray-400"> / {players.length} Combatants Remaining</span>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 space-y-2">
                {sortedPlayers.map(player => {
                    const isAlive = player.hp > 0;
                    const actions = playerActions[player.id];

                    return (
                        <div key={player.id} className={`rounded-lg transition-all duration-300 ${isAlive ? 'bg-gray-900/50' : 'bg-gray-900/50 opacity-50'}`}>
                            <button
                                onClick={() => isAlive && setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                                disabled={!isAlive}
                                className="w-full p-2 text-left disabled:cursor-not-allowed"
                            >
                                <div className="flex justify-between items-center text-sm">
                                    <span className={`font-bold ${!isAlive ? 'text-gray-500 line-through' : player.color.replace('bg-', 'text-').replace('-600', '-400')}`}>{player.name}</span>
                                    {isAlive ? (
                                        <span className="font-semibold">{Math.ceil(player.hp)} / {player.maxHp} HP</span>
                                    ) : (
                                        <span className="font-bold text-red-500">DEFEATED</span>
                                    )}
                                </div>
                                {isAlive && <StatBar value={player.hp} maxValue={player.maxHp} color={player.color.replace('-600', '-500').replace('-700', '-600').replace('-800', '-700')} />}
                            </button>
                            {isAlive && expandedPlayerId === player.id && actions && <PlayerDetails player={player} actions={actions} />}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default BattleRoyaleStatus;