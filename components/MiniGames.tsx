import React, { useState, useEffect, useRef } from 'react';
import { fetchTopCharacters } from '../services/aniListService';
import { fetchMalCharacterImage } from '../services/jikanService'; // Import fallback service
import { createChatSession } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';
import Button from './Button';
import { playSound } from '../utils/sound';

// --- Silhouette Game ---

interface SilhouetteRound {
  targetChar: {
    id: number;
    name: string;
    image: string;
  };
  options: string[];
}

export const SilhouetteGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [loading, setLoading] = useState(true);
  const [rounds, setRounds] = useState<SilhouetteRound[]>([]);
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [brightness, setBrightness] = useState(0); // 0 to 100
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Image State for Fallback handling
  const [currentImgSrc, setCurrentImgSrc] = useState<string>('');

  useEffect(() => {
    loadGameData();
  }, []);

  // Update image source when round changes
  useEffect(() => {
    if (rounds.length > 0 && rounds[currentRoundIdx]) {
        setCurrentImgSrc(rounds[currentRoundIdx].targetChar.image);
    }
  }, [currentRoundIdx, rounds]);

  const loadGameData = async () => {
    setLoading(true);
    try {
      // Fetch a pool of characters (Page 1-3 for popularity)
      const page = Math.floor(Math.random() * 3) + 1;
      const chars = await fetchTopCharacters(page, 50);
      
      if (!chars || chars.length < 4) {
        alert("Not enough data to start.");
        onExit();
        return;
      }

      // Create 10 rounds
      const newRounds: SilhouetteRound[] = [];
      const usedIndices = new Set<number>();

      for (let i = 0; i < 10; i++) {
        // Pick target
        let targetIdx = Math.floor(Math.random() * chars.length);
        while (usedIndices.has(targetIdx)) {
           targetIdx = Math.floor(Math.random() * chars.length);
        }
        usedIndices.add(targetIdx);
        const target = chars[targetIdx];

        // Pick 3 distractors
        const options = [target.name.full];
        while (options.length < 4) {
           const dIdx = Math.floor(Math.random() * chars.length);
           const name = chars[dIdx].name.full;
           if (!options.includes(name)) {
             options.push(name);
           }
        }

        // Shuffle options
        options.sort(() => Math.random() - 0.5);

        newRounds.push({
          targetChar: {
             id: target.id,
             name: target.name.full,
             image: target.image.large
          },
          options
        });
      }

      setRounds(newRounds);
      setCurrentRoundIdx(0);
      setScore(0);
      resetRound();
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const resetRound = () => {
    setBrightness(0);
    setIsRevealed(false);
    setSelectedOption(null);
  };

  const handleOptionClick = (option: string) => {
    if (isRevealed) return;

    setSelectedOption(option);
    setIsRevealed(true);
    setBrightness(100); // Fully reveal

    if (option === rounds[currentRoundIdx].targetChar.name) {
      setScore(s => s + 1);
      playSound('correct');
    } else {
      playSound('wrong');
    }
  };

  const handleHint = () => {
    if (isRevealed || brightness >= 40) return;
    setBrightness(prev => prev + 10);
    // Optional: Deduct potential score for hints?
  };

  const nextRound = () => {
    if (currentRoundIdx < rounds.length - 1) {
      setCurrentRoundIdx(prev => prev + 1);
      resetRound();
    } else {
      // End game
      setIsRevealed(true); // Ensure final state is visible
    }
  };

  // Fallback handler
  const handleImageError = async () => {
      const charName = rounds[currentRoundIdx].targetChar.name;
      console.log(`Image failed for ${charName}, trying Jikan fallback...`);
      
      const fallbackUrl = await fetchMalCharacterImage(charName);
      if (fallbackUrl && fallbackUrl !== currentImgSrc) {
          setCurrentImgSrc(fallbackUrl);
      } else {
          // If fallback fails too, use generic
          setCurrentImgSrc("https://cdn.myanimelist.net/images/characters/10/246479.jpg");
      }
  };

  if (loading) return <div className="text-center p-12 animate-pulse">Summoning Shadows...</div>;

  const currentRound = rounds[currentRoundIdx];
  const isFinished = currentRoundIdx === rounds.length - 1 && isRevealed;

  return (
    <div className="flex flex-col items-center animate-fade-in w-full max-w-2xl mx-auto">
      <div className="flex justify-between w-full mb-6 items-center">
         <h2 className="text-2xl font-bold">Silhouette Challenge</h2>
         <div className="bg-white/10 px-4 py-1 rounded-full text-sm">
            {currentRoundIdx + 1} / {rounds.length}
         </div>
      </div>

      {isFinished ? (
         <div className="text-center py-12 glass-panel w-full rounded-2xl">
            <h3 className="text-4xl mb-4">Challenge Complete!</h3>
            <p className="text-xl mb-8">Score: {score} / {rounds.length}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={loadGameData}>Play Again</Button>
              <Button variant="secondary" onClick={onExit}>Exit</Button>
            </div>
         </div>
      ) : (
         <div className="w-full">
            {/* Image Container */}
            <div className="relative w-64 h-64 mx-auto mb-8 bg-white/5 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
               <img 
                  src={currentImgSrc} 
                  onError={handleImageError}
                  alt="Who is that?" 
                  className="w-full h-full object-cover transition-all duration-700"
                  style={{ 
                    filter: `brightness(${brightness}%) grayscale(${isRevealed ? 0 : 100}%) contrast(1.2)` 
                  }}
               />
               {!isRevealed && (
                  <div className="absolute top-2 right-2">
                     <button 
                       onClick={handleHint} 
                       disabled={brightness >= 40}
                       className="bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300 text-xs px-2 py-1 rounded border border-yellow-500/50 transition-colors disabled:opacity-50"
                     >
                       💡 Hint
                     </button>
                  </div>
               )}
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
               {currentRound.options.map((opt, idx) => {
                 let btnVariant: 'primary' | 'secondary' = 'secondary';
                 let extraClass = '';
                 
                 if (isRevealed) {
                    if (opt === currentRound.targetChar.name) {
                       btnVariant = 'primary';
                       extraClass = '!bg-green-600 !border-green-400';
                    } else if (opt === selectedOption) {
                       extraClass = '!bg-red-500 !border-red-500';
                    } else {
                       extraClass = 'opacity-50';
                    }
                 }

                 return (
                   <Button 
                      key={idx} 
                      variant={btnVariant}
                      onClick={() => handleOptionClick(opt)}
                      disabled={isRevealed}
                      className={extraClass}
                   >
                      {opt}
                   </Button>
                 );
               })}
            </div>
            
            {/* Next Button */}
            {isRevealed && (
               <div className="flex justify-center animate-fade-in-up">
                  <Button onClick={nextRound} className="px-12">
                     Next
                  </Button>
               </div>
            )}
         </div>
      )}
    </div>
  );
};

// --- Memory Game ---

interface Card {
  id: string; // Unique ID for key
  charId: number;
  image: string;
  name: string; // Added name for fallback
  isFlipped: boolean;
  isMatched: boolean;
}

const GENERIC_SILHOUETTE = "https://cdn.myanimelist.net/images/characters/10/246479.jpg"; 

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
                    onError={async (e) => {
                      const target = e.currentTarget;
                      // Check if we already tried the fallback to prevent loops
                      if (target.getAttribute('data-tried-mal') === 'true') {
                         if (target.src !== GENERIC_SILHOUETTE) target.src = GENERIC_SILHOUETTE;
                         return;
                      }
                      
                      target.setAttribute('data-tried-mal', 'true');
                      
                      // Try Jikan
                      const malUrl = await fetchMalCharacterImage(card.name);
                      if (malUrl) {
                          target.src = malUrl;
                      } else {
                          target.src = GENERIC_SILHOUETTE;
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

// --- Chat Simulator ---

const CHARACTERS = [
  { id: 'luffy', name: 'Luffy', trait: 'Hungry, simple-minded, pirate king ambition, energetic', avatar: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-q0Wea65t838s.png' },
  { id: 'l', name: 'L', trait: 'Analytical, weird posture, sugar addict, monotone', avatar: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-4m9u20d3Lh5F.png' },
  { id: 'makima', name: 'Makima', trait: 'Manipulative, calm, soft-spoken, scary undertones', avatar: 'https://s4.anilist.co/file/anilistcdn/character/large/b137079-1Ze12yE8wW0i.png' },
  { id: 'naruto', name: 'Naruto', trait: 'Believe it!, friendship, never give up, loud', avatar: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-aX50nIPtQ510.png' }
];

export const ChatGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [selectedChar, setSelectedChar] = useState<typeof CHARACTERS[0] | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const startChat = (char: typeof CHARACTERS[0]) => {
    setSelectedChar(char);
    chatSessionRef.current = createChatSession(char.name, char.trait);
    setMessages([]);
    // Initial greeting simulation
    setIsTyping(true);
    setTimeout(async () => {
        try {
            const result = await chatSessionRef.current?.sendMessage({ message: "Hello!" });
            setMessages([{ role: 'model', text: result?.text || "..." }]);
        } catch(e) { console.error(e); }
        setIsTyping(false);
    }, 1000);
  };

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: result.text || "..." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "(Connection Error)" }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center animate-fade-in w-full max-w-2xl mx-auto">
       {!selectedChar ? (
         <div className="w-full">
            <h2 className="text-3xl font-bold mb-6 text-center">Select Character</h2>
            <div className="grid grid-cols-2 gap-4">
               {CHARACTERS.map(char => (
                 <div key={char.id} onClick={() => startChat(char)} className="glass-panel p-4 rounded-xl cursor-pointer hover:bg-white/10 transition-all flex flex-col items-center gap-3">
                    <img src={char.avatar} className="w-20 h-20 rounded-full object-cover border-2 border-white/20" alt={char.name} />
                    <h3 className="font-bold text-lg">{char.name}</h3>
                 </div>
               ))}
            </div>
            <Button variant="ghost" onClick={onExit} fullWidth className="mt-8">Back</Button>
         </div>
       ) : (
         <div className="w-full flex flex-col h-[500px] glass-panel rounded-2xl overflow-hidden relative">
            {/* Header */}
            <div className="p-4 bg-black/40 border-b border-white/10 flex items-center justify-center relative">
               <button onClick={() => setSelectedChar(null)} className="absolute left-4 text-xs text-gray-400 hover:text-white">Back</button>
               <div className="flex items-center gap-3">
                  <img src={selectedChar.avatar} className="w-8 h-8 rounded-full object-cover" alt="Avatar" />
                  <span className="font-bold">{selectedChar.name}</span>
               </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
               {messages.map((m, i) => (
                 <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-anime-primary text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                       {m.text}
                    </div>
                 </div>
               ))}
               {isTyping && (
                 <div className="flex justify-start">
                    <div className="bg-white/10 px-4 py-2 rounded-xl rounded-tl-none text-xs text-gray-400 animate-pulse">
                       typing...
                    </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-black/40 border-t border-white/10 flex gap-2">
               <input 
                 type="text" 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 placeholder="Say something..."
                 className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-anime-primary"
               />
               <Button onClick={handleSend} className="!py-2">Send</Button>
            </div>
         </div>
       )}
    </div>
  );
};

// --- Typing Game ---

const ATTACKS = ["KAMEHAMEHA", "RASENGAN", "BANKAI", "GUM GUM PISTOL", "DETROIT SMASH", "Getsuga Tensho", "Spirit Gun", "Amaterasu", "Chidori", "Domain Expansion"];

export const TypingGame: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [words, setWords] = useState<{ id: number, text: string, x: number, y: number }[]>([]);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number, text: string, x: number, y: number }[]>([]);
  
  // Refs for loop
  const requestRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(5);
  const wordsRef = useRef<{ id: number, text: string, x: number, y: number }[]>([]);

  useEffect(() => {
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const spawnWord = () => {
    const text = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
    const id = Date.now();
    const x = Math.random() * 80 + 10; // 10% to 90% width
    const newWord = { id, text, x, y: -10 };
    wordsRef.current.push(newWord);
    setWords([...wordsRef.current]); // Trigger render
  };

  const gameLoop = (time: number) => {
    if (livesRef.current <= 0) {
      setGameOver(true);
      return;
    }

    // Spawn Logic (approx every 2 seconds, gets faster)
    const spawnRate = Math.max(500, 2000 - (scoreRef.current * 50));
    if (time - lastSpawnRef.current > spawnRate) {
      spawnWord();
      lastSpawnRef.current = time;
    }

    // Move Logic
    const speed = 0.2 + (scoreRef.current * 0.01);
    wordsRef.current = wordsRef.current.map(w => ({ ...w, y: w.y + speed }));

    // Check Hits (Bottom)
    const survivors = [];
    let damage = 0;
    for (let w of wordsRef.current) {
       if (w.y > 100) {
          damage++;
       } else {
          survivors.push(w);
       }
    }

    if (damage > 0) {
      livesRef.current -= damage;
      setLives(livesRef.current);
      playSound('wrong');
    }
    
    wordsRef.current = survivors;
    setWords([...wordsRef.current]);

    requestRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setLives(5);
    setWords([]);
    setInput('');
    
    scoreRef.current = 0;
    livesRef.current = 5;
    wordsRef.current = [];
    lastSpawnRef.current = performance.now();
    
    requestRef.current = requestAnimationFrame(gameLoop);
    playSound('start');
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    const matchIndex = wordsRef.current.findIndex(w => w.text.toLowerCase() === val.toLowerCase());
    if (matchIndex !== -1) {
       // Visual Feedback
       const matchedWord = wordsRef.current[matchIndex];
       const floatId = Date.now();
       setFloatingTexts(prev => [...prev, { id: floatId, text: "+10", x: matchedWord.x, y: matchedWord.y }]);
       setTimeout(() => {
          setFloatingTexts(prev => prev.filter(f => f.id !== floatId));
       }, 1000);

       // Destroy
       wordsRef.current.splice(matchIndex, 1);
       setWords([...wordsRef.current]);
       
       scoreRef.current += 10;
       setScore(scoreRef.current);
       setInput('');
       playSound('click');
    }
  };

  return (
    <div className="h-full flex flex-col items-center animate-fade-in w-full max-w-2xl mx-auto relative overflow-hidden min-h-[500px]">
       {!gameStarted || gameOver ? (
         <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
            <h2 className="text-4xl font-black mb-2 text-red-500 font-mono tracking-widest">{gameOver ? "GAME OVER" : "TYPING DEFENDER"}</h2>
            {gameOver && <p className="text-2xl text-white mb-6">Score: {score}</p>}
            <p className="text-gray-400 mb-8 max-w-sm">Defend the village! Type the attack names before they hit the bottom.</p>
            <div className="flex gap-4">
              <Button onClick={startGame} className="!bg-red-600 px-8">{gameOver ? "Retry" : "Start Mission"}</Button>
              <Button onClick={onExit} variant="ghost">Exit</Button>
            </div>
         </div>
       ) : null}

       {/* Game Area */}
       <div className="w-full flex-1 relative bg-gray-900/50 border-x border-white/10">
          {/* Lives & Score */}
          <div className="absolute top-4 left-4 text-red-400 font-bold">HP: {'♥'.repeat(lives)}</div>
          <div className="absolute top-4 right-4 text-white font-mono text-xl">PTS: {score}</div>
          
          {/* Falling Words */}
          {words.map(w => (
            <div 
              key={w.id} 
              className="absolute text-center transform -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${w.x}%`, top: `${w.y}%` }}
            >
               <div className="text-xs text-yellow-500 animate-pulse">▼</div>
               <div className="bg-red-900/80 px-2 py-1 rounded text-white font-bold text-sm border border-red-500 shadow-lg">
                  {w.text}
               </div>
            </div>
          ))}
          
          {/* Floating Texts for Feedback */}
          {floatingTexts.map(f => (
             <div
               key={f.id}
               className="absolute text-green-400 font-black text-xl drop-shadow-md animate-fade-in-up transform -translate-x-1/2 -translate-y-full"
               style={{ left: `${f.x}%`, top: `${f.y}%` }}
             >
                {f.text}
             </div>
          ))}

          {/* Danger Zone Line */}
          <div className="absolute bottom-[60px] w-full h-px bg-red-500/50 border-t border-dashed border-red-500"></div>
       </div>

       {/* Input Area */}
       <div className="w-full p-4 bg-black/80 border-t border-white/20 z-10">
          <input 
            autoFocus
            type="text" 
            value={input}
            onChange={handleInput}
            placeholder="TYPE TO ATTACK..."
            className="w-full bg-black border-2 border-red-500/50 rounded-xl px-4 py-3 text-center uppercase tracking-widest text-xl outline-none focus:border-red-500 text-white placeholder-gray-600"
          />
       </div>
    </div>
  );
};