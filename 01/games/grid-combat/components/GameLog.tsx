import React, { useRef, useEffect } from 'react';

interface GameLogProps {
  logs: string[];
  isBattleRoyale?: boolean;
}

const GameLog: React.FC<GameLogProps> = ({ logs, isBattleRoyale = false }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-full h-32 bg-gray-900/80 border-t-2 border-gray-700 p-2 overflow-hidden">
      <h3 className="text-sm font-bold text-gray-400 mb-1">
        {isBattleRoyale ? "AI Battle Analysis" : "Combat Log"}
      </h3>
      <div ref={logContainerRef} className="h-full overflow-y-auto text-sm">
        {logs.map((log, index) => (
          <p key={index} className="text-gray-300" dangerouslySetInnerHTML={{ __html: log }} />
        ))}
      </div>
    </div>
  );
};

export default GameLog;