import React, { useState, useEffect } from 'react';

const TRIVIA_FACTS = [
  "Did you know? The longest-running anime is Sazae-san, airing since 1969.",
  "Did you know? Spirited Away was the first anime film to win an Academy Award.",
  "Did you know? Pokémon is an abbreviation of Pocket Monsters.",
  "Did you know? The name 'Gundam' is a combination of 'Gun' and 'Freedom'.",
  "Did you know? Code Geass sponsored the creation of a real-life pizza.",
  "Did you know? In Sailor Moon, all of the Sailor Scouts are named after planets.",
  "Did you know? The Titans in Attack on Titan are modeled after drunk people.",
  "Did you know? Dragon Ball's Goku has only ever killed two villains.",
  "Did you know? Naruto's favorite ramen shop, Ichiraku Ramen, exists in real life.",
  "Did you know? Anime accounts for about 60% of the world's animation-based entertainment."
];

const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Summoning Knowledge..." }) => {
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(prev => (prev + 1) % TRIVIA_FACTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in text-center px-4">
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
      
      <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent animate-pulse tracking-widest uppercase mb-4">
        {message}
      </p>

      <div className="h-16 flex items-center justify-center">
         <p className="text-sm text-gray-400 max-w-md animate-fade-in-up transition-opacity duration-500 italic">
            {TRIVIA_FACTS[factIndex]}
         </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;