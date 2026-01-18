import React, { useState, useEffect } from 'react';
import { fetchTopCharacters } from '../services/aniListService';
import Button from './Button';
import { playSound } from '../utils/sound';

// --- Memory Game ---

interface Card {
  id: string; // Unique ID for key
  charId: number;
  image: string;
  name: string; // Added name for fallback
  isFlipped: boolean;
  isMatched: boolean;
}

const GENERIC_SILHOUETTE = "https://cdn.myanimelist.net/images/characters/10/246479.jpg"; // Using L as a safe fallback or a generic silhouette URL if preferred

export const MemoryGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // Indices
  const [moves, setMoves] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = async () => {
    setLoading(true);
    setCards([]); // Reset
    try {
      const chars = await fetchTopCharacters(Math.floor(Math.random() * 5) + 1, 6);
      
      if (!chars || chars.length === 0) {
        setLoading(false);
        return;
      }

      // Duplicate and shuffle
      const deck = [...chars, ...chars]
        .sort(() => Math.random() - 0.5)
        .map((c, i) => ({
          id: `${c.id}-${i}`,
          charId: c.id,
          image: c.image.large,
          name: c.name.full,
          isFlipped: false,
          isMatched: false
        }));
      setCards(deck);
      setFlipped([]);
      setMoves(0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    playSound('click');
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].charId === cards[second].charId) {
        // Match
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === first || i === second ? { ...c, isMatched: true, isFlipped: true } : c
          ));
          setFlipped([]);
          playSound('correct');
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === first || i === second ? { ...c, isFlipped: false } : c
          ));
          setFlipped([]);
        }, 1000);
      }
    }
  };

  const isWin = cards.length > 0 && cards.every(c => c.isMatched);

  if (loading) return <div className="text-center p-12">Shuffling Deck...</div>;

  return (
    <div className="flex flex-col items-center animate-fade-in w-full">
      <div className="flex justify-between w-full max-w-2xl mb-4 items-center px-4">
         <h2 className="text-2xl font-bold">Memory Match</h2>
         <div className="text-gray-400">Moves: {moves}</div>
      </div>

      {cards.length === 0 && !loading ? (
        <div className="text-center py-12">
           <h3 className="text-xl mb-4 text-red-400">Failed to load cards.</h3>
           <div className="flex gap-4 justify-center">
             <Button onClick={startNewGame}>Retry</Button>
             <Button variant="secondary" onClick={onExit}>Exit</Button>
           </div>
        </div>
      ) : isWin ? (
        <div className="text-center py-12">
           <h3 className="text-4xl mb-4">You Won! 🎉</h3>
           <div className="flex gap-4 justify-center">
             <Button onClick={startNewGame}>Play Again</Button>
             <Button variant="secondary" onClick={onExit}>Exit</Button>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl p-2 perspective-[1000px]">
          {cards.map((card, i) => (
            <div 
              key={card.id} 
              onClick={() => handleCardClick(i)}
              className={`w-20 h-28 md:w-28 md:h-40 rounded-xl cursor-pointer transition-all duration-500 transform [transform-style:preserve-3d] relative ${card.isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
               {/* Back */}
               <div className={`absolute inset-0 bg-anime-card border-2 border-white/10 rounded-xl flex items-center justify-center [backface-visibility:hidden] z-10 ${card.isFlipped ? 'opacity-0' : 'opacity-100'}`}>
                  <span className="text-2xl">?</span>
               </div>
               {/* Front */}
               <div className={`absolute inset-0 bg-gray-800 rounded-xl overflow-hidden [transform:rotateY(180deg)] [backface-visibility:hidden] ${card.isFlipped ? 'opacity-100' : 'opacity-0'}`}>
                  <img 
                    src={card.image} 
                    className={`w-full h-full object-cover ${card.isMatched ? 'grayscale opacity-50' : ''}`} 
                    alt={card.name}
                    onError={(e) => {
                      // Fallback logic
                      const target = e.currentTarget;
                      // If we haven't already tried the generic silhouette
                      if (target.src !== GENERIC_SILHOUETTE) {
                         target.src = GENERIC_SILHOUETTE;
                      } else {
                         // If even silhouette fails (unlikely), fallback to text
                         target.style.display = 'none';
                         target.parentElement?.classList.add('flex', 'items-center', 'justify-center', 'text-center', 'p-1', 'text-xs');
                         if (target.parentElement) target.parentElement.innerText = card.name;
                      }
                    }}
                  />
               </div>
            </div>
          ))}
        </div>
      )}
      {!isWin && cards.length > 0 && <Button variant="ghost" onClick={onExit} className="mt-8">Quit Game</Button>}
    </div>
  );
};

// --- Whack-A-Slime ---

export const WhackGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [score, setScore] = useState(0);
  const [activeHole, setActiveHole] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    let timer: any;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setGameActive(false);
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);

  useEffect(() => {
    let moleTimer: any;
    if (gameActive) {
      const cycle = () => {
        const randomHole = Math.floor(Math.random() * 9);
        setActiveHole(randomHole);
        const duration = Math.random() * 800 + 400; // Random speed
        moleTimer = setTimeout(cycle, duration);
      };
      cycle();
    }
    return () => clearTimeout(moleTimer);
  }, [gameActive]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    playSound('start');
  };

  const whack = (index: number) => {
    if (index === activeHole) {
       setScore(s => s + 10);
       setActiveHole(null); // Hide immediately
       playSound('click');
    } else {
       setScore(s => Math.max(0, s - 5));
    }
  };

  return (
    <div className="flex flex-col items-center animate-fade-in max-w-lg mx-auto">
       <div className="flex justify-between w-full mb-6 items-end">
          <div>
            <h2 className="text-2xl font-bold">Whack-a-Slime</h2>
            <p className="text-xs text-gray-400">Hit the blue slimes!</p>
          </div>
          <div className="text-right">
             <div className="text-3xl font-mono font-bold text-anime-primary">{score}</div>
             <div className="text-sm text-gray-400">{timeLeft}s</div>
          </div>
       </div>

       {!gameActive && timeLeft === 0 ? (
          <div className="text-center py-12 glass-panel w-full rounded-2xl">
             <h3 className="text-3xl mb-2">Time's Up!</h3>
             <p className="text-xl mb-6">Final Score: {score}</p>
             <div className="flex gap-4 justify-center">
                <Button onClick={startGame}>Play Again</Button>
                <Button variant="secondary" onClick={onExit}>Exit</Button>
             </div>
          </div>
       ) : (
          <div className="grid grid-cols-3 gap-4 w-full">
             {Array.from({ length: 9 }).map((_, i) => (
                <div 
                  key={i} 
                  onClick={() => gameActive && whack(i)}
                  className="aspect-square bg-white/5 rounded-full border border-white/10 relative overflow-hidden cursor-pointer active:scale-95 transition-transform"
                >
                   {/* Hole */}
                   <div className="absolute bottom-0 inset-x-2 h-1/3 bg-black/40 rounded-full blur-sm"></div>
                   
                   {/* Slime */}
                   <div className={`absolute inset-x-2 bottom-2 h-2/3 transition-transform duration-100 ${activeHole === i ? 'translate-y-0' : 'translate-y-full'}`}>
                      <div className="w-full h-full bg-blue-400 rounded-t-full relative flex justify-center items-center shadow-[0_0_15px_rgba(96,165,250,0.6)]">
                         <div className="flex gap-4 mb-2">
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                            <div className="w-2 h-2 bg-black rounded-full"></div>
                         </div>
                      </div>
                   </div>
                </div>
             ))}
          </div>
       )}
       
       {!gameActive && timeLeft === 30 && (
         <div className="mt-8 flex gap-4">
             <Button onClick={startGame} className="!bg-green-600">Start Game</Button>
             <Button variant="ghost" onClick={onExit}>Back</Button>
         </div>
       )}
    </div>
  );
};
