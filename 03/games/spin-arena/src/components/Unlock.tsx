import React from 'react';
import { SpecialDefinition, PlayerProgression } from '../types';
import { PLAYER_SPECIALS } from '../constants';
import { Sparkles, Zap, Shield, Target, Brain, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface UnlockProps {
  progression: PlayerProgression;
  onChoice: (specialId: string, replaceSlot: 0 | 1) => void;
}

const Unlock: React.FC<UnlockProps> = ({ progression, onChoice }) => {
  const [options, setOptions] = React.useState<SpecialDefinition[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const locked = PLAYER_SPECIALS.filter(s => !progression.unlockedSpecialIds.includes(s.id));
    
    // Difficulty Scaling: Higher wins = higher chance for high powerCost specials
    // We'll weight the selection based on totalWins
    const tier = Math.min(3, Math.floor(progression.totalWins / 6)); // 0-3 tier
    
    const weighted = [...locked].sort((a, b) => {
      // Calculate score for each special based on current tier
      const getScore = (s: SpecialDefinition) => {
        const cost = s.powerCost;
        if (tier === 0) return Math.random(); // Pure random early on
        if (tier === 1) return (cost >= 5 ? 2 : 1) * Math.random(); 
        if (tier === 2) return (cost >= 7 ? 3 : 1) * Math.random();
        return cost * Math.random(); // Late game favors high cost
      };
      return getScore(b) - getScore(a);
    });

    setOptions(weighted.slice(0, 3));
  }, [progression.unlockedSpecialIds, progression.totalWins]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Movement': return <Zap size={24} />;
      case 'Rotation': return <Shield size={24} />;
      case 'Collision': return <Target size={24} />;
      case 'Control': return <Brain size={24} />;
      default: return null;
    }
  };

  if (options.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
      <div className="max-w-5xl w-full space-y-12 text-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-cyan-500/20 rounded-full text-cyan-400 animate-pulse">
              <Sparkles size={48} />
            </div>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">New Ability Unlocked</h2>
          <p className="text-neutral-400 text-lg">Choose a special, then replace an active slot so it is ready for your next match.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((spec, idx) => (
            <motion.div
              key={spec.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedId(spec.id)}
              className={`relative p-8 rounded-3xl border-2 transition-all cursor-pointer group ${
                selectedId === spec.id 
                  ? 'bg-cyan-500/20 border-cyan-500 shadow-2xl shadow-cyan-500/20' 
                  : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="absolute top-4 right-4 text-[10px] font-bold bg-neutral-800 text-neutral-400 px-3 py-1 rounded-full uppercase tracking-widest">
                {spec.powerCost} Power
              </div>
              
              <div className={`mb-6 flex justify-center transition-transform group-hover:scale-110 ${selectedId === spec.id ? 'text-cyan-400' : 'text-neutral-500'}`}>
                {getCategoryIcon(spec.category)}
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{spec.name}</h3>
              <p className="text-neutral-500 text-sm mb-6 h-12 line-clamp-2">{spec.description}</p>
              
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 uppercase font-bold">Category</span>
                  <span className="text-cyan-400 font-bold">{spec.category}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-600 uppercase font-bold">Stats</span>
                  <span className="text-white font-medium">{spec.stats}</span>
                </div>
                {spec.risk && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 uppercase font-bold">Risk</span>
                    <span className="text-red-400 font-medium">{spec.risk}</span>
                  </div>
                )}
              </div>

              {selectedId === spec.id && (
                <motion.div 
                  layoutId="check"
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white p-2 rounded-full shadow-lg"
                >
                  <Check size={20} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedId ? 1 : 0 }}
          className="pt-8"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Equip the chosen ability into</span>
            <div className="flex gap-3">
              {[0, 1].map(slot => (
                <button
                  key={slot}
                  disabled={!selectedId}
                  onClick={() => selectedId && onChoice(selectedId, slot as 0 | 1)}
                  className="bg-white text-black font-black py-4 px-8 rounded-2xl uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-white/10"
                >
                  Replace Slot {slot + 1}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Unlock;
