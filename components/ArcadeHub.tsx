import React from 'react';
import Button from './Button';
import { QuizSettings, Difficulty, QuestionType, GameMode, ContentType, Language, AIPersona } from '../types';

interface ArcadeHubProps {
  onSelectPreset: (settings: QuizSettings) => void;
  onSelectMiniGame: (game: 'memory' | 'whack' | 'story') => void;
  onBack: () => void;
}

const ArcadeHub: React.FC<ArcadeHubProps> = ({ onSelectPreset, onSelectMiniGame, onBack }) => {

  const presets = [
    {
      title: "Trivia Master",
      desc: "50 Hard Questions. No Mercy.",
      icon: "🧠",
      settings: {
        difficulty: Difficulty.HARD,
        questionCount: 50,
        gameMode: GameMode.CLASSIC,
        type: QuestionType.MULTIPLE_CHOICE, // Hint for logic
        contentType: ContentType.ANIME
      }
    },
    {
      title: "Guess the Anime",
      desc: "Images, Emojis & OPs only.",
      icon: "🖼️",
      settings: {
        difficulty: Difficulty.MEDIUM,
        questionCount: 10,
        gameMode: GameMode.CLASSIC,
        // Logic in generation will favor Image/Emoji based on this presets context 
        // We handle this by passing specific flags or just handling it in App.tsx
        // For simplicity, we assume standard settings but the user expects visual questions.
        contentType: ContentType.ANIME
      }
    },
    {
      title: "Character Quiz",
      desc: "Who is this? Who said that?",
      icon: "👤",
      settings: {
        difficulty: Difficulty.MEDIUM,
        questionCount: 15,
        gameMode: GameMode.TIME_ATTACK,
        contentType: ContentType.ANIME
      }
    }
  ];

  const handlePreset = (preset: any) => {
    // Construct full settings object
    const s: QuizSettings = {
       difficulty: preset.settings.difficulty,
       questionCount: preset.settings.questionCount,
       language: Language.ENGLISH,
       contentType: preset.settings.contentType,
       gameMode: preset.settings.gameMode,
       aiPersona: AIPersona.DEFAULT,
       spoilerProtection: true,
       topic: 'All'
    };
    onSelectPreset(s);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">ARCADE ZONE</h2>
        <Button variant="ghost" onClick={onBack}>Back to Home</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Section 1: Mini Games */}
        <div className="space-y-4">
           <h3 className="text-xl font-bold text-gray-300 border-b border-white/10 pb-2">Mini Games</h3>
           
           <div onClick={() => onSelectMiniGame('story')} className="group cursor-pointer glass-panel p-6 rounded-2xl hover:bg-white/10 transition-all border-l-4 border-purple-500">
              <div className="text-4xl mb-2">📖</div>
              <h4 className="text-xl font-bold group-hover:text-purple-400 transition-colors">Story Mode (AI)</h4>
              <p className="text-sm text-gray-400">Choose your own adventure in an endless AI-generated RPG.</p>
           </div>

           <div onClick={() => onSelectMiniGame('memory')} className="group cursor-pointer glass-panel p-6 rounded-2xl hover:bg-white/10 transition-all border-l-4 border-blue-500">
              <div className="text-4xl mb-2">🃏</div>
              <h4 className="text-xl font-bold group-hover:text-blue-400 transition-colors">Character Match</h4>
              <p className="text-sm text-gray-400">Flip cards and match your favorite characters.</p>
           </div>

           <div onClick={() => onSelectMiniGame('whack')} className="group cursor-pointer glass-panel p-6 rounded-2xl hover:bg-white/10 transition-all border-l-4 border-green-500">
              <div className="text-4xl mb-2">🔨</div>
              <h4 className="text-xl font-bold group-hover:text-green-400 transition-colors">Whack-a-Slime</h4>
              <p className="text-sm text-gray-400">Test your reflexes against the slime army.</p>
           </div>
        </div>

        {/* Section 2: Quiz Challenges */}
        <div className="space-y-4">
           <h3 className="text-xl font-bold text-gray-300 border-b border-white/10 pb-2">Quiz Challenges</h3>
           
           {presets.map((p, i) => (
             <div key={i} onClick={() => handlePreset(p)} className="group cursor-pointer glass-panel p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-all">
                <div className="text-3xl bg-black/20 p-3 rounded-lg">{p.icon}</div>
                <div>
                   <h4 className="font-bold group-hover:text-anime-primary transition-colors">{p.title}</h4>
                   <p className="text-xs text-gray-400">{p.desc}</p>
                </div>
             </div>
           ))}
        </div>

      </div>
    </div>
  );
};

export default ArcadeHub;
