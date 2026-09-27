import React from 'react';
import { LEVELS } from '../constants';
import type { Level } from '../types';
import { motion } from 'motion/react';

interface LevelSelectionProps {
  levels: Level[];
  onSelect: (level: Level) => void;
  onBack: () => void;
  onGenerateRandom: () => void;
}

const LevelSelection: React.FC<LevelSelectionProps> = ({ levels, onSelect, onBack, onGenerateRandom }) => {
  return (
    <div className="w-full max-w-5xl px-4">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Select Arena</h2>
        <div className="flex gap-4">
          <button 
            onClick={onGenerateRandom}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors uppercase text-xs tracking-widest shadow-lg shadow-cyan-900/20"
          >
            Generate Random Arena
          </button>
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-lg transition-colors uppercase text-xs tracking-widest"
          >
            Back to Hangar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {levels.map((level) => (
          <motion.button
            key={level.id}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(level)}
            disabled={!level.unlocked}
            aria-label={level.unlocked
              ? `Select level ${level.id}: ${level.name}. Guardian ${level.enemy.name}.`
              : `Level ${level.id}: ${level.name}, locked.`}
            className={`relative w-full p-6 text-left rounded-2xl border-2 transition-all cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/50 ${
              level.unlocked 
                ? 'bg-slate-800/50 border-slate-700 hover:border-cyan-500 shadow-xl' 
                : 'bg-slate-900/50 border-slate-800 opacity-50 grayscale cursor-not-allowed'
            }`}
          >
            {/* Background Accent */}
            <div 
              className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full"
              style={{ backgroundColor: level.arenaColor }}
            />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{level.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">{level.description}</p>
                </div>
                <div className="px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Level {level.id}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Guardian</span>
                  <span className="text-sm font-bold text-cyan-400 uppercase">{level.enemy.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Specialty</span>
                  <span className="text-sm font-bold text-orange-400 uppercase">{level.enemy.special.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
                <span className="rounded bg-slate-950/70 py-2 text-rose-300">HP {level.enemy.baseHp}</span>
                <span className="rounded bg-slate-950/70 py-2 text-cyan-300">SPD {level.enemy.baseSpeed}</span>
                <span className="rounded bg-slate-950/70 py-2 text-amber-300">SPIN {level.enemy.baseRotation}</span>
              </div>
              <p className="mt-3 text-xs text-slate-300 border-l-2 border-cyan-400 pl-3"><b>Battle read:</b> {level.enemy.activeDesc}</p>

              {!level.unlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
                  <span className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-widest">Locked</span>
                </div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelection;
