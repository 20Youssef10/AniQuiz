import React from 'react';

interface TimerProps {
  timeLeft: number;
  maxTime: number;
}

const Timer: React.FC<TimerProps> = ({ timeLeft, maxTime }) => {
  const percentage = (timeLeft / maxTime) * 100;
  
  // Color logic: Green -> Yellow -> Red
  let colorClass = 'bg-green-500';
  if (percentage < 50) colorClass = 'bg-yellow-500';
  if (percentage < 20) colorClass = 'bg-red-500';

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      <div className="flex justify-between items-end mb-1 px-1">
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Time Left</span>
        <span className={`text-xl font-mono font-bold ${percentage < 20 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-linear`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default Timer;