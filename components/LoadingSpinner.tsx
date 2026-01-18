import React from 'react';

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Summoning Knowledge..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      {/* Magic Circle Container */}
      <div className="relative w-24 h-24 mb-8">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-anime-primary/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
        
        {/* Middle Ring (Reverse) */}
        <div className="absolute inset-2 border-2 border-anime-secondary/50 rounded-full border-t-transparent border-b-transparent animate-[spin_2s_linear_infinite_reverse]"></div>
        
        {/* Inner Core (Pulse) */}
        <div className="absolute inset-8 bg-anime-accent rounded-full animate-pulse shadow-[0_0_20px_rgba(236,72,153,0.6)]"></div>
        
        {/* Particles/Orbs */}
        <div className="absolute -top-2 left-1/2 w-2 h-2 bg-white rounded-full animate-ping opacity-75"></div>
        <div className="absolute top-1/2 -right-2 w-2 h-2 bg-anime-primary rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute -bottom-2 left-1/2 w-2 h-2 bg-anime-secondary rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent animate-pulse tracking-widest uppercase">
        {message}
      </p>
    </div>
  );
};

export default LoadingSpinner;