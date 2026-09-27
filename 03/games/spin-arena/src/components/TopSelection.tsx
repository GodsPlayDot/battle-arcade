import React from 'react';
import type { TopDefinition } from '../types';

interface TopSelectionProps {
  tops: TopDefinition[];
  onSelect: (top: TopDefinition) => void;
  onCustomize: () => void;
  onShowHelp: () => void;
  onShowSettings: () => void;
  onShowLoadout: () => void;
  systemLogs: string[];
  setSystemLogs: React.Dispatch<React.SetStateAction<string[]>>;
}

const TopSelection: React.FC<TopSelectionProps> = ({ tops, onSelect, onCustomize, onShowHelp, onShowSettings, onShowLoadout, systemLogs, setSystemLogs }) => {
  return (
    <div className="text-center text-white w-full max-w-4xl">
      <h2 className="text-3xl font-bold mb-6 italic tracking-tighter uppercase">Hangar Bay</h2>
      
      {/* Hangar Diagnostics */}
      {systemLogs.length > 0 && (
        <div className="mb-8 bg-slate-950/60 backdrop-blur-md border border-slate-800 rounded-xl p-4 text-left shadow-2xl">
          <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              Hangar System Diagnostics
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-500 font-mono">STATUS: MONITORING</span>
              <button 
                onClick={() => setSystemLogs([])}
                className="text-[9px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest transition-colors"
              >
                [ Clear Logs ]
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
            {systemLogs.map((log, i) => (
              <div key={i} className="text-[10px] text-slate-300 font-mono leading-relaxed flex gap-3">
                <span className="text-cyan-500/50 shrink-0">[{systemLogs.length - i}]</span>
                <p>{log}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/50 text-[9px] text-slate-500 italic">
            * Emergency events from previous matches are logged here for analysis.
          </div>
        </div>
      )}

      {/* System Status Indicator */}
      <div className="mb-6 flex justify-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Physics Engine: OK</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arena Gravity: READY</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Boost Tiles: ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {tops.map((top) => (
          <button 
            key={top.name}
            type="button"
            className="p-6 text-left bg-slate-800 rounded-xl border-2 border-slate-700 hover:border-cyan-400 focus-visible:border-cyan-300 focus-visible:ring-4 focus-visible:ring-cyan-400/35 cursor-pointer transition-all group relative overflow-hidden"
            onClick={() => onSelect(top)}
            aria-label={`Select ${top.name}: speed ${top.baseSpeed.toFixed(1)}, armor ${top.hp} HP`}
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/10 blur-2xl rounded-full group-hover:bg-cyan-500/20 transition-all" />
            <h3 className="text-2xl font-black text-white mb-4 italic tracking-tighter uppercase group-hover:text-cyan-400 transition-colors">{top.name}</h3>
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Speed</span>
                <span className="text-sm font-black text-emerald-400">{top.baseSpeed.toFixed(1)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Armor</span>
                <span className="text-sm font-black text-cyan-400">{top.hp} HP</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      <button 
        onClick={onCustomize}
        className="px-6 py-3 bg-slate-600 hover:bg-slate-700 font-bold rounded-lg"
      >
        Customize Tops
      </button>
      <button 
        onClick={onShowHelp}
        className="ml-4 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-lg"
      >
        Help
      </button>
      <button 
        onClick={onShowLoadout}
        className="ml-4 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 font-bold rounded-lg"
      >
        Loadout
      </button>
      <button 
        onClick={onShowSettings}
        className="ml-4 px-6 py-3 bg-gray-600 hover:bg-gray-700 font-bold rounded-lg"
      >
        Settings
      </button>
    </div>
  );
};

export default TopSelection;
