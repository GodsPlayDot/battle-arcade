import React, { useEffect, useState } from 'react';
import { sounds } from '../audio/soundEffects';

interface ReadyCountdownProps {
  countdownStep: number | 'BEGIN' | null; // 3, 2, 1, 'BEGIN', or null if inactive
  boardName: string;
  armyName: string;
  combatName: string;
  playerModeName?: string;
}

export const ReadyCountdown: React.FC<ReadyCountdownProps> = React.memo(({
  countdownStep,
  boardName,
  armyName,
  combatName,
  playerModeName,
}) => {
  if (countdownStep === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md pointer-events-auto select-none animate-in fade-in duration-150">
      {/* Top Banner showing configuration being locked */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono uppercase tracking-widest">
          Match Starting · System Locked
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-wider uppercase">
          {boardName}
        </h2>
        <p className="text-sm font-medium text-slate-300">
          <span className="text-sky-400 font-semibold">{armyName}</span>
          <span className="mx-2 text-slate-500">·</span>
          <span className="text-rose-400 font-semibold">{combatName}</span>
          {playerModeName && (
            <>
              <span className="mx-2 text-slate-500">·</span>
              <span className="text-emerald-400 font-semibold">{playerModeName}</span>
            </>
          )}
        </p>
      </div>

      {/* Main Countdown Display */}
      <div className="relative flex items-center justify-center w-48 h-48">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-amber-500/30 animate-ping opacity-60 pointer-events-none" />
        <div className="absolute inset-2 rounded-full border border-slate-700/80 bg-slate-900/80 shadow-2xl backdrop-blur-xl flex items-center justify-center">
          {countdownStep === 'BEGIN' ? (
            <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 tracking-wider animate-pulse">
              BEGIN
            </span>
          ) : (
            <span className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_25px_rgba(251,191,36,0.6)] animate-in zoom-in duration-200">
              {countdownStep}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 text-xs font-mono text-slate-400 tracking-wide uppercase">
        {countdownStep === 'BEGIN' ? 'White Moves First' : 'Positioning Units & Validating Rules...'}
      </div>
    </div>
  );
});
