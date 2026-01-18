import React, { useState } from 'react';
import { generateStoryNode } from '../services/geminiService';
import { StoryNode } from '../types';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

const GENRES = ["Isekai Fantasy", "Cyberpunk Sci-Fi", "High School Romance", "Dark Horror", "Battle Shonen"];

const StoryMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [started, setStarted] = useState(false);
  const [genre, setGenre] = useState(GENRES[0]);
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]); // Keep text context

  const startStory = async () => {
    setLoading(true);
    setStarted(true);
    try {
      const node = await generateStoryNode(genre);
      setCurrentNode(node);
      setHistory([node.text]);
    } catch (e) {
      console.error(e);
      alert("Failed to start story.");
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (choice: string) => {
    if (!currentNode) return;
    setLoading(true);
    try {
      // Pass previous context (last 2 turns max to save tokens)
      const context = history.slice(-2).join("\n");
      const nextNode = await generateStoryNode(genre, context, choice);
      setCurrentNode(nextNode);
      setHistory(prev => [...prev, nextNode.text]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!started) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in text-center">
        <h2 className="text-4xl font-black mb-6 text-white">Choose Your Path</h2>
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full">
           <label className="block text-sm font-semibold mb-3 text-gray-300">Select Genre</label>
           <div className="grid grid-cols-1 gap-2 mb-6">
              {GENRES.map(g => (
                 <button key={g} onClick={() => setGenre(g)} className={`p-3 rounded-xl border text-left transition-all ${genre === g ? 'bg-anime-primary border-anime-accent' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    {g}
                 </button>
              ))}
           </div>
           <Button fullWidth onClick={startStory}>Begin Adventure</Button>
           <Button fullWidth variant="ghost" className="mt-2" onClick={onClose}>Exit</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
       {loading ? (
         <LoadingSpinner message="Weaving destiny..." />
       ) : (
         <div className="max-w-2xl w-full animate-fade-in">
            <div className="glass-panel p-8 md:p-12 rounded-3xl relative overflow-hidden min-h-[400px] flex flex-col justify-between">
               {/* Background Hint (Visual only, no real image generation in MVP) */}
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black opacity-80 z-0"></div>
               {currentNode?.backgroundPrompt && (
                   <div className="absolute top-0 right-0 p-2 opacity-10 text-[10px] w-1/2 text-right">
                      Scene: {currentNode.backgroundPrompt}
                   </div>
               )}

               <div className="relative z-10">
                  <p className="text-lg md:text-xl leading-relaxed text-gray-100 mb-8 font-serif">
                    {currentNode?.text}
                  </p>
               </div>

               <div className="relative z-10 grid gap-3">
                  {currentNode?.options.map((opt, idx) => (
                     <Button key={idx} variant="secondary" onClick={() => handleChoice(opt)} className="text-left py-4 hover:border-anime-primary">
                        {idx + 1}. {opt}
                     </Button>
                  ))}
               </div>
            </div>
            <div className="mt-4 text-center">
               <button onClick={onClose} className="text-sm text-gray-500 hover:text-white">End Story</button>
            </div>
         </div>
       )}
    </div>
  );
};

export default StoryMode;
