import React from 'react';
import { SpecialDefinition, PlayerProgression } from '../types';
import { PLAYER_SPECIALS } from '../constants';
import { Shield, Zap, Target, Brain, Save, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoadoutProps {
  progression: PlayerProgression;
  onSave: (progression: PlayerProgression) => void;
  onClose: () => void;
}

const Loadout: React.FC<LoadoutProps> = ({ progression, onSave, onClose }) => {
  const [localProgression, setLocalProgression] = React.useState<PlayerProgression>(progression);
  const [lastEquipped, setLastEquipped] = React.useState<{ id: string, slot: number } | null>(null);

  const unlockedSpecials = PLAYER_SPECIALS.filter(s => localProgression.unlockedSpecialIds.includes(s.id));

  const handleEquip = (specialId: string, slotIndex: number) => {
    const newEquipped = [...localProgression.equippedSpecialIds] as [string | null, string | null];
    
    // Check if already equipped in other slot
    const otherSlot = slotIndex === 0 ? 1 : 0;
    if (newEquipped[otherSlot] === specialId) {
      newEquipped[otherSlot] = null;
    }
    
    newEquipped[slotIndex] = specialId;
    
    // Validate Power Budget
    const totalPower = newEquipped.reduce((sum, id) => {
      if (!id) return sum;
      const spec = PLAYER_SPECIALS.find(s => s.id === id);
      return sum + (spec?.powerCost || 0);
    }, 0);

    if (totalPower > 10) {
      // Small shake or feedback instead of alert?
      return;
    }

    setLocalProgression(prev => ({ ...prev, equippedSpecialIds: newEquipped }));
    setLastEquipped({ id: specialId, slot: slotIndex });
    setTimeout(() => setLastEquipped(null), 1000);
  };

  const currentPower = localProgression.equippedSpecialIds.reduce((sum, id) => {
    if (!id) return sum;
    const spec = PLAYER_SPECIALS.find(s => s.id === id);
    return sum + (spec?.powerCost || 0);
  }, 0);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Movement': return <Zap size={16} />;
      case 'Rotation': return <Shield size={16} />;
      case 'Collision': return <Target size={16} />;
      case 'Control': return <Brain size={16} />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter italic">Special Loadout</h2>
            <p className="text-neutral-500 text-sm">Configure your active abilities. Power Budget: {currentPower}/10</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors text-neutral-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Slots */}
          <div className="w-full md:w-80 p-6 border-r border-neutral-800 space-y-6 bg-neutral-950/30">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active Slots</h3>
            <div className="space-y-4">
              {[0, 1].map(i => {
                const specId = localProgression.equippedSpecialIds[i];
                const spec = PLAYER_SPECIALS.find(s => s.id === specId);
                const isRecentlyEquipped = lastEquipped?.slot === i;

                return (
                  <motion.div 
                    key={i} 
                    animate={isRecentlyEquipped ? { scale: [1, 1.05, 1] } : {}}
                    className={`relative p-4 rounded-2xl border-2 transition-all ${spec ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/5' : 'bg-neutral-800/50 border-neutral-700 border-dashed'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Slot {i + 1}</p>
                      {spec && <span className="text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full font-bold">{spec.powerCost} pts</span>}
                    </div>
                    
                    <AnimatePresence mode="wait">
                      {spec ? (
                        <motion.div 
                          key={spec.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <div className="text-cyan-400">{getCategoryIcon(spec.category)}</div>
                            <span className="font-bold text-white text-sm">{spec.name}</span>
                          </div>
                          <p className="text-[10px] text-neutral-400 line-clamp-1">{spec.description}</p>
                          <button 
                            onClick={() => {
                              const newEquipped = [...localProgression.equippedSpecialIds] as [string | null, string | null];
                              newEquipped[i] = null;
                              setLocalProgression(prev => ({ ...prev, equippedSpecialIds: newEquipped }));
                            }}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold mt-2 uppercase tracking-widest"
                          >
                            Remove
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-4 text-center"
                        >
                          <p className="text-xs text-neutral-600 italic">Empty Slot</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            <div className="pt-4">
              <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase mb-2">
                <span>Power Usage</span>
                <span className={currentPower > 10 ? 'text-red-500' : 'text-cyan-400'}>{currentPower} / 10</span>
              </div>
              <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(currentPower / 10) * 100}%` }}
                  className={`h-full transition-colors duration-500 ${currentPower > 10 ? 'bg-red-500' : 'bg-cyan-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Unlocked List */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-neutral-900/20">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Unlocked Arsenal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unlockedSpecials.map(spec => {
                const isEquippedS1 = localProgression.equippedSpecialIds[0] === spec.id;
                const isEquippedS2 = localProgression.equippedSpecialIds[1] === spec.id;
                const isEquipped = isEquippedS1 || isEquippedS2;

                return (
                  <div 
                    key={spec.id} 
                    className={`relative bg-neutral-800/50 border p-4 rounded-2xl transition-all group ${isEquipped ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-neutral-700 hover:border-neutral-600'}`}
                  >
                    {isEquipped && (
                      <div className="absolute -top-2 -right-2 bg-cyan-500 text-white p-1 rounded-full shadow-lg z-10">
                        <CheckCircle2 size={14} />
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isEquipped ? 'bg-cyan-500 text-white' : 'bg-neutral-700 text-cyan-400'}`}>
                          {getCategoryIcon(spec.category)}
                        </div>
                        <span className="font-bold text-white text-sm">{spec.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-neutral-500">{spec.powerCost} PTS</span>
                    </div>
                    
                    <p className="text-[10px] text-neutral-400 mb-4 line-clamp-2 leading-relaxed">{spec.description}</p>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEquip(spec.id, 0)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-tighter ${
                          isEquippedS1 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {isEquippedS1 ? 'Slot 1 Active' : 'Equip S1'}
                      </button>
                      <button 
                        onClick={() => handleEquip(spec.id, 1)}
                        className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-tighter ${
                          isEquippedS2 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        {isEquippedS2 ? 'Slot 2 Active' : 'Equip S2'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-center">
          <button 
            onClick={() => {
              onSave(localProgression);
              onClose();
            }}
            className="bg-white hover:bg-cyan-400 text-black font-black py-4 px-16 rounded-2xl transition-all shadow-xl shadow-white/5 flex items-center gap-3 uppercase tracking-tighter text-lg"
          >
            <Save size={20} /> Save Configuration
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Loadout;
