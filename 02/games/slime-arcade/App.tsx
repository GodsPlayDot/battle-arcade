import React, { useState, useCallback, useEffect } from 'react';
import type { Slime, SlimeStats, Ability, SlimeStat, BattleEnvironment } from './types';
import { BASE_SLIME_STATS, EVOLUTION_STAGES, ABILITIES, EXP_TO_LEVEL_UP, STAT_TOKEN_COST, TOKENS_PER_LEVEL, MAX_ABILITIES, MAX_LEVEL, MAX_STAT_VALUE, BATTLE_ENVIRONMENTS } from './constants';
import { generateOpponent } from './services/geminiService';

import Header from './components/Header';
import SlimeCard from './components/SlimeCard';
import StatUpgrade from './components/StatUpgrade';
import TrainingGrounds from './components/TrainingGrounds';
import BattleArena from './components/BattleArena';
import AdventureMode from './components/AdventureMode';
import Modal from './components/Modal';
import GameRunner from './components/GameRunner';
import Settings from './components/Settings';

type View = 'main' | 'training' | 'stats' | 'battle' | 'settings';

const HIGHSCORE_STORAGE_KEY = 'slimeArcadeHighScores';

function App() {
  const [slime, setSlime] = useState<Slime | null>(null);
  const [opponentSlime, setOpponentSlime] = useState<Slime | null>(null);
  const [currentView, setCurrentView] = useState<View>('main');
  const [isLoading, setIsLoading] = useState(false);
  const [newSlimeName, setNewSlimeName] = useState('');
  const [activeMiniGame, setActiveMiniGame] = useState<string | null>(null);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [currentEnvironment, setCurrentEnvironment] = useState<BattleEnvironment | null>(null);

  useEffect(() => {
    try {
        const storedScores = localStorage.getItem(HIGHSCORE_STORAGE_KEY);
        if (storedScores) {
            setHighScores(JSON.parse(storedScores));
        }
    } catch (error) {
        console.error("Failed to load high scores from localStorage:", error);
    }
  }, []);

  const expToNextLevel = slime ? EXP_TO_LEVEL_UP(slime.level) : 0;

  const handleCreateSlime = () => {
    const trimmedName = newSlimeName.trim();
    if (trimmedName === '') return;

    if (trimmedName.toLowerCase() === 'max out') {
      const maxedStats: SlimeStats = {
        HP: 999,
        ATK: MAX_STAT_VALUE,
        DEF: MAX_STAT_VALUE,
        SPD: MAX_STAT_VALUE,
        LUK: MAX_STAT_VALUE,
      };
      const devSlime: Slime = {
        name: 'Dev Slime',
        level: MAX_LEVEL,
        exp: 0,
        quarters: 99,
        upgradeTokens: 9999,
        ap: 40,
        stats: maxedStats,
        currentHp: maxedStats.HP,
        evolutionStage: EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1],
        abilities: ABILITIES,
        equippedAbilities: ABILITIES.slice(0, MAX_ABILITIES),
      };
      setSlime(devSlime);
    } else {
      const initialSlime: Slime = {
        name: trimmedName,
        level: 1,
        exp: 0,
        quarters: 5,
        upgradeTokens: 0,
        ap: 0,
        stats: { ...BASE_SLIME_STATS },
        currentHp: BASE_SLIME_STATS.HP,
        evolutionStage: EVOLUTION_STAGES[0],
        abilities: [],
        equippedAbilities: [],
      };
      setSlime(initialSlime);
    }
  };

  const updateSlime = useCallback((updater: (prevSlime: Slime) => Slime) => {
    setSlime(prevSlime => {
      if (!prevSlime) return null;
      const updated = updater(prevSlime);
      const currentStage = updated.evolutionStage;
      const highestStage = EVOLUTION_STAGES.slice().reverse().find(stage => updated.level >= stage.levelReq);
      if (highestStage && highestStage.levelReq > currentStage.levelReq) {
        updated.evolutionStage = highestStage;
      }
      return updated;
    });
  }, []);
  
  const handleLevelUp = () => {
    updateSlime(s => {
      if (s.exp < EXP_TO_LEVEL_UP(s.level) || s.level >= MAX_LEVEL) return s;
      const remainingExp = s.exp - EXP_TO_LEVEL_UP(s.level);
      const newLevel = s.level + 1;
      const hpIncrease = 5 + Math.floor(newLevel / 2);
      const apGained = (newLevel % 5 === 0) ? 1 : 0;
      const newStats = { ...s.stats, HP: s.stats.HP + hpIncrease };

      if (Math.random() < 0.25) {
          const otherStats: SlimeStat[] = ['ATK', 'DEF', 'SPD', 'LUK'];
          const randomStatIndex = Math.floor(Math.random() * otherStats.length);
          const statToIncrease = otherStats[randomStatIndex];
          if (newStats[statToIncrease] < MAX_STAT_VALUE) {
              newStats[statToIncrease]++;
          }
      }

      return {
        ...s,
        level: newLevel,
        exp: remainingExp,
        upgradeTokens: s.upgradeTokens + TOKENS_PER_LEVEL(),
        ap: s.ap + apGained,
        stats: newStats,
        currentHp: s.currentHp + hpIncrease
      };
    });
  };

  const handleUpgradeStat = (stat: SlimeStat) => {
    if (!slime || (stat !== 'HP' && slime.stats[stat] >= MAX_STAT_VALUE)) return;
    const cost = STAT_TOKEN_COST(slime.stats[stat]);
    if (slime.upgradeTokens < cost) return;
    updateSlime(s => ({
      ...s,
      upgradeTokens: s.upgradeTokens - cost,
      stats: { ...s.stats, [stat]: s.stats[stat] + 1 },
      currentHp: stat === 'HP' ? s.currentHp + 1 : s.currentHp,
    }));
  };
  
  const handleLearnAbility = (ability: Ability) => {
    // An ability can only be learned once. Without this guard a player could
    // accidentally spend AP again and duplicate the same move in their loadout.
    if (!slime || slime.ap < ability.apCost || slime.abilities.some(a => a.name === ability.name)) return;
    updateSlime(s => {
        const newLearnedAbilities = [...s.abilities, ability];
        let newEquippedAbilities = [...s.equippedAbilities];
        if (newEquippedAbilities.length < MAX_ABILITIES) {
            newEquippedAbilities.push(ability);
        }
        return { ...s, ap: s.ap - ability.apCost, abilities: newLearnedAbilities, equippedAbilities: newEquippedAbilities };
    });
  };

  const handleUnlearnAbility = (ability: Ability) => {
    if (!slime) return;
    const abilityToUnlearn = ABILITIES.find(a => a.name === ability.name);
    if (!abilityToUnlearn) return;
    updateSlime(s => ({
        ...s,
        ap: s.ap + abilityToUnlearn.apCost,
        abilities: s.abilities.filter(a => a.name !== ability.name),
        equippedAbilities: s.equippedAbilities.filter(a => a.name !== ability.name),
    }));
  };

  const handleToggleEquipAbility = (ability: Ability) => {
    if (!slime) return;
    updateSlime(s => {
        const isCurrentlyEquipped = s.equippedAbilities.some(a => a.name === ability.name);
        let newEquippedAbilities: Ability[];
        if (isCurrentlyEquipped) {
            newEquippedAbilities = s.equippedAbilities.filter(a => a.name !== ability.name);
        } else {
            if (s.equippedAbilities.length >= MAX_ABILITIES) return s;
            newEquippedAbilities = [...s.equippedAbilities, ability];
        }
        return { ...s, equippedAbilities: newEquippedAbilities };
    });
  };

  const handleStartBattle = async (isPC: boolean = false) => {
    if (!slime) return;
    setIsLoading(true);
    try {
      const environment = BATTLE_ENVIRONMENTS[Math.floor(Math.random() * BATTLE_ENVIRONMENTS.length)];
      setCurrentEnvironment(environment);

      let opponentData;
      let pcAbilities: Ability[] = [];
      if (isPC) {
        opponentData = { name: "PC", stats: { ...slime.stats, HP: Math.floor(slime.stats.HP * 0.8), ATK: Math.max(1, Math.floor(slime.stats.ATK * 0.8)) }};
        pcAbilities = ABILITIES.filter(a => ['Gooey Pound', 'Slime Wall', 'Dodge Roll', 'Brace'].includes(a.name));
      } else {
        opponentData = await generateOpponent(slime);
      }
      
      const newOpponent: Slime = {
        name: opponentData.name,
        stats: opponentData.stats,
        level: slime.level, exp: 0, quarters: 0, upgradeTokens: 0, ap: 0,
        currentHp: opponentData.stats.HP,
        evolutionStage: EVOLUTION_STAGES[0],
        abilities: pcAbilities,
        equippedAbilities: pcAbilities,
      };
      setOpponentSlime(newOpponent);
      setCurrentView('battle');
    } catch (error) {
      console.error("Failed to start battle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBattleEnd = (playerWon: boolean) => {
    if (!slime) return;
    if (playerWon) {
      const expGained = Math.floor((opponentSlime?.stats.HP ?? 20) / 2) + 10;
      const quartersGained = Math.floor(Math.random() * 3) + 1;
      updateSlime(s => ({ ...s, exp: s.exp + expGained, quarters: s.quarters + quartersGained }));
    }
    updateSlime(s => ({ ...s, currentHp: s.stats.HP }));
    setCurrentView('main');
    setOpponentSlime(null);
    setCurrentEnvironment(null);
  };

  const handleStartTrainingGame = (gameName: string) => {
      if (!slime || slime.quarters <= 0) return;
      updateSlime(s => ({...s, quarters: s.quarters - 1}));
      setActiveMiniGame(gameName);
  };

  const handleTrainingGameEnd = (expGained: number, refund: boolean = false) => {
      if (!slime || !activeMiniGame) return;

      if (expGained > 0) {
          updateSlime(s => ({ ...s, exp: s.exp + expGained }));
          const currentHighScore = highScores[activeMiniGame] || 0;
          if (expGained > currentHighScore) {
              const newHighScores = { ...highScores, [activeMiniGame]: expGained };
              setHighScores(newHighScores);
              localStorage.setItem(HIGHSCORE_STORAGE_KEY, JSON.stringify(newHighScores));
          }
      }
      if (refund) {
          updateSlime(s => ({ ...s, quarters: s.quarters + 1 }));
      }
      setActiveMiniGame(null);
  };

  if (!slime) {
    return ( <Modal onClose={() => {}}> <div className="text-center"> <h2 className="text-2xl mb-4">Welcome to Slime Pet!</h2> <p className="mb-4">Give your first slime a name:</p> <input type="text" value={newSlimeName} onChange={(e) => setNewSlimeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateSlime()} className="pixel-border bg-black p-2 w-full mb-4 text-center" placeholder="Goopy" maxLength={20} autoFocus /> <button onClick={handleCreateSlime} disabled={newSlimeName.trim() === ''} className="pixel-border p-2 w-full hover:bg-green-400 hover:text-black disabled:opacity-50 transition-colors duration-200" > Create Slime </button> </div> </Modal> );
  }

  if (activeMiniGame) {
      return ( <div className="container mx-auto p-4 font-mono bg-black text-green-400 min-h-screen"> <Header slime={slime} expToNextLevel={expToNextLevel} currentView={currentView} /> <GameRunner gameName={activeMiniGame} onGameEnd={handleTrainingGameEnd} /> </div> );
  }
  
  const renderView = () => {
    switch (currentView) {
      case 'training':
        return <TrainingGrounds slime={slime} highScores={highScores} onStartGame={handleStartTrainingGame} />;
      case 'stats':
        return <StatUpgrade slime={slime} onUpgradeStat={handleUpgradeStat} onLevelUp={handleLevelUp} onLearnAbility={handleLearnAbility} onUnlearnAbility={handleUnlearnAbility} onToggleEquipAbility={handleToggleEquipAbility} expToNextLevel={expToNextLevel} />;
      case 'battle':
        if (opponentSlime) {
          return <BattleArena playerSlime={slime} opponentSlime={opponentSlime} setPlayerSlime={setSlime} onBattleEnd={handleBattleEnd} environment={currentEnvironment} />;
        }
        return null;
      case 'settings':
        return <Settings />;
      case 'main':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SlimeCard slime={slime} />
              <div className="space-y-4">
                  <button onClick={() => setCurrentView('stats')} className="pixel-border p-4 w-full text-xl hover:bg-yellow-400 hover:text-black transition-colors duration-200">
                      UPGRADE & LEVEL UP
                  </button>
                  <button onClick={() => setCurrentView('training')} className="pixel-border p-4 w-full text-xl hover:bg-blue-500 hover:text-black transition-colors duration-200">
                      TRAINING GROUNDS
                  </button>
                  <AdventureMode onStartBattle={() => handleStartBattle(false)} onStartPCOpponentBattle={() => handleStartBattle(true)} isLoading={isLoading} />
                  <button onClick={() => setCurrentView('settings')} className="pixel-border p-4 w-full text-xl hover:bg-gray-500 hover:text-black transition-colors duration-200">
                      AI & GAME SETTINGS
                  </button>
              </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 font-mono bg-black text-green-400 min-h-screen">
      <Header slime={slime} expToNextLevel={expToNextLevel} currentView={currentView} />
      <main>
        {currentView !== 'main' && (
          <button onClick={() => setCurrentView('main')} className="pixel-border p-2 mb-4 hover:bg-gray-700 transition-colors duration-200">
            &lt; Back to Main Menu
          </button>
        )}
        {renderView()}
      </main>
    </div>
  );
}

export default App;
