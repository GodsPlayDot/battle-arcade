/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Help from './components/Help';
import Game from './components/Game';
import TopSelection from './components/TopSelection';
import TopCustomizer from './components/TopCustomizer';
import Settings from './components/Settings';
import LevelSelection from './components/LevelSelection';
import Loadout from './components/Loadout';
import Unlock from './components/Unlock';
import type { TopDefinition, GameSettings, Level, PlayerProgression } from './types';
import { DEFAULT_TOPS, DEFAULT_SETTINGS, LEVELS, PLAYER_SPECIALS } from './constants';
import { generateLevel } from './services/levelGenerator';

type GameView = 'selection' | 'level_selection' | 'game' | 'customizer';

export default function App() {
  const [tops, setTops] = useState<TopDefinition[]>([]);
  const [selectedTop, setSelectedTop] = useState<TopDefinition | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [view, setView] = useState<GameView>('selection');
  const [levels, setLevels] = useState<Level[]>(LEVELS);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLoadout, setShowLoadout] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [progression, setProgression] = useState<PlayerProgression>(() => {
    const initialUnlocked = ['bounce_shield', 'dash_burst', 'overdrive_spin', 'shockwave', 'magnetic_gravity'];
    const randomSecond = initialUnlocked[Math.floor(Math.random() * (initialUnlocked.length - 1)) + 1];
    
    return {
      totalWins: 0,
      unlockedSpecialIds: initialUnlocked,
      equippedSpecialIds: ['bounce_shield', randomSecond],
      passiveSpecialId: null
    };
  });

  useEffect(() => {
    try {
      const savedTops = localStorage.getItem('customTops');
      if (savedTops) {
        setTops(JSON.parse(savedTops));
      } else {
        setTops(DEFAULT_TOPS);
      }
    } catch (error) {
      console.error("Failed to load tops from localStorage", error);
      setTops(DEFAULT_TOPS);
    }

    try {
      const savedSettings = localStorage.getItem('gameSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setGameSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setGameSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
      setGameSettings(DEFAULT_SETTINGS);
    }

    try {
      const savedProgression = localStorage.getItem('playerProgression');
      if (savedProgression) {
        setProgression(JSON.parse(savedProgression));
      }
    } catch (error) {
      console.error("Failed to load progression from localStorage", error);
    }
  }, []);

  const handleSaveProgression = (newProgression: PlayerProgression) => {
    setProgression(newProgression);
    try {
      localStorage.setItem('playerProgression', JSON.stringify(newProgression));
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] Loadout updated and saved.`, ...prev].slice(0, 5));
    } catch (error) {
      console.error("Failed to save progression to localStorage", error);
    }
  };

  const handleSaveSettings = (newSettings: GameSettings) => {
    setGameSettings(newSettings);
    try {
      localStorage.setItem('gameSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save settings to localStorage", error);
    }
  };

  const handleSaveTops = (newTops: TopDefinition[]) => {
    setTops(newTops);
    try {
      localStorage.setItem('customTops', JSON.stringify(newTops));
    } catch (error) {
      console.error("Failed to save tops to localStorage", error);
    }
  };

  const handleTopSelect = (top: TopDefinition) => {
    setSelectedTop(top);
    setView('level_selection');
  };

  const handleLevelSelect = (level: Level) => {
    setSelectedLevel(level);
    setView('game');
  };

  const handleLevelWin = (levelId: number) => {
    const newTotalWins = progression.totalWins + 1;
    const shouldUnlock = newTotalWins % 3 === 0;
    
    handleSaveProgression({
      ...progression,
      totalWins: newTotalWins
    });

    if (shouldUnlock) {
      setShowUnlock(true);
    }

    const nextLevelId = levelId + 1;
    let nextLevel = levels.find(l => l.id === nextLevelId);
    
    // If next level doesn't exist, generate it
    let updatedLevels = [...levels];
    if (!nextLevel) {
      nextLevel = generateLevel(nextLevelId);
      updatedLevels.push(nextLevel);
    } else {
      // Unlock next level if it was locked
      updatedLevels = levels.map(l => 
        l.id === nextLevelId ? { ...l, unlocked: true } : l
      );
    }
    
    setLevels(updatedLevels);
    
    if (nextLevel) {
      setSelectedLevel(nextLevel);
      // Game component has key={selectedLevel?.id}, so it will remount automatically
    } else {
      setView('level_selection');
    }
  };

  const handleGenerateRandom = () => {
    const nextId = levels.length + 1;
    const newLevel = generateLevel(nextId);
    setLevels([...levels, newLevel]);
    setSelectedLevel(newLevel);
    setView('game');
  };

  const renderContent = () => {
    switch (view) {
      case 'game':
        return <Game 
          key={selectedLevel?.id} 
          playerTop={selectedTop!} 
          level={selectedLevel!} 
          allTops={tops} 
          settings={gameSettings} 
          progression={progression}
          onBack={() => setView('level_selection')} 
          onWin={handleLevelWin}
          systemLogs={systemLogs}
          setSystemLogs={setSystemLogs}
        />;
      case 'level_selection':
        return <LevelSelection levels={levels} onSelect={handleLevelSelect} onBack={() => setView('selection')} onGenerateRandom={handleGenerateRandom} />;
      case 'customizer':
        return <TopCustomizer initialTops={tops} onSave={handleSaveTops} onBack={() => setView('selection')} />;
      case 'selection':
      default:
        return <TopSelection 
          tops={tops} 
          onSelect={handleTopSelect} 
          onCustomize={() => setView('customizer')} 
          onShowHelp={() => setShowHelp(true)} 
          onShowSettings={() => setShowSettings(true)}
          onShowLoadout={() => setShowLoadout(true)}
          systemLogs={systemLogs}
          setSystemLogs={setSystemLogs}
        />;
    }
  };

  return (
    <main className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center py-8">
      <h1 className="text-4xl font-bold mb-4">Spinning Top Arena</h1>
      {renderContent()}
      {showHelp && <Help onClose={() => setShowHelp(false)} />}
      {showSettings && <Settings initialSettings={gameSettings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
      {showLoadout && <Loadout progression={progression} onSave={handleSaveProgression} onClose={() => setShowLoadout(false)} />}
      {showUnlock && (
        <Unlock 
          progression={progression} 
          onChoice={(id, replaceSlot) => {
            const equippedSpecialIds = [...progression.equippedSpecialIds] as [string | null, string | null];
            equippedSpecialIds[replaceSlot] = id;
            // An unlock must be usable immediately. If the replacement would
            // exceed the power limit, free the other slot instead of rejecting it.
            const totalPower = equippedSpecialIds.reduce((total, specialId) =>
              total + (PLAYER_SPECIALS.find(special => special.id === specialId)?.powerCost ?? 0), 0);
            if (totalPower > 10) equippedSpecialIds[replaceSlot === 0 ? 1 : 0] = null;
            handleSaveProgression({
              ...progression,
              unlockedSpecialIds: [...progression.unlockedSpecialIds, id],
              equippedSpecialIds
            });
            setShowUnlock(false);
          }} 
        />
      )}
    </main>
  );
}
