import React from 'react';
import Button from './Button';
import { QuizSettings, Difficulty, QuestionType, GameMode, ContentType, Language, AIPersona } from '../types';
import { Brain, Image as ImageIcon, User, Eye, BookOpen, MessageSquare, Keyboard, Gamepad2, Hammer, ArrowLeft } from 'lucide-react';
import { t } from '../services/i18n';

interface ArcadeHubProps {
  onSelectPreset: (settings: QuizSettings) => void;
  onSelectMiniGame: (game: 'memory' | 'whack' | 'story' | 'silhouette' | 'chat' | 'typing') => void;
  onBack: () => void;
  language?: Language;
}

const ArcadeHub: React.FC<ArcadeHubProps> = ({ onSelectPreset, onSelectMiniGame, onBack, language = Language.ENGLISH }) => {
  const isArabic = language === Language.ARABIC;

  const presets = [
    {
      title: isArabic ? "خبير المعلومات" : "Trivia Master",
      desc: isArabic ? "50 سؤالاً صعباً بدون رحمة" : "50 Hard Questions. No Mercy.",
      icon: <Brain className="w-7 h-7 text-yellow-400" />,
      settings: {
        difficulty: Difficulty.HARD,
        questionCount: 50,
        gameMode: GameMode.CLASSIC,
        type: QuestionType.MULTIPLE_CHOICE,
        contentType: ContentType.ANIME
      }
    },
    {
      title: isArabic ? "خمّن الأنمي" : "Guess the Anime",
      desc: isArabic ? "صور، شارات وتلميحات بصرية" : "Images, Emojis & OPs only.",
      icon: <ImageIcon className="w-7 h-7 text-pink-400" />,
      settings: {
        difficulty: Difficulty.MEDIUM,
        questionCount: 10,
        gameMode: GameMode.CLASSIC,
        contentType: ContentType.ANIME
      }
    },
    {
      title: isArabic ? "اختبار الشخصيات" : "Character Quiz",
      desc: isArabic ? "من هذه الشخصية؟ ومن قال هذا الاقتباس؟" : "Who is this? Who said that?",
      icon: <User className="w-7 h-7 text-cyan-400" />,
      settings: {
        difficulty: Difficulty.MEDIUM,
        questionCount: 15,
        gameMode: GameMode.TIME_ATTACK,
        contentType: ContentType.ANIME
      }
    }
  ];

  const handlePreset = (preset: any) => {
    const s: QuizSettings = {
       difficulty: preset.settings.difficulty,
       questionCount: preset.settings.questionCount,
       language: language,
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
        <h2 className="text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          {t('arcadeTitle', language)}
        </h2>
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back', language)}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Section 1: Mini Games */}
        <div className="space-y-4">
           <h3 className="text-xl font-bold text-gray-300 border-b border-white/10 pb-2">
             {t('miniGames', language)}
           </h3>
           
           <div className="grid grid-cols-2 gap-4">
              <div onClick={() => onSelectMiniGame('silhouette')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-gray-100 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('silhouette'); } }}>
                  <Eye className="w-8 h-8 mb-2 text-gray-200 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-gray-300">{t('silhouetteTitle', language)}</h4>
              </div>

              <div onClick={() => onSelectMiniGame('story')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-purple-500 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('story'); } }}>
                  <BookOpen className="w-8 h-8 mb-2 text-purple-400 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-purple-400">{t('storyTitle', language)}</h4>
              </div>

              <div onClick={() => onSelectMiniGame('chat')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-pink-500 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('chat'); } }}>
                  <MessageSquare className="w-8 h-8 mb-2 text-pink-400 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-pink-400">{t('chatTitle', language)}</h4>
              </div>

              <div onClick={() => onSelectMiniGame('typing')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-red-500 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('typing'); } }}>
                  <Keyboard className="w-8 h-8 mb-2 text-red-400 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-red-400">{t('typingTitle', language)}</h4>
              </div>

              <div onClick={() => onSelectMiniGame('memory')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-blue-500 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('memory'); } }}>
                  <Gamepad2 className="w-8 h-8 mb-2 text-blue-400 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-blue-400">{t('memoryMatchTitle', language)}</h4>
              </div>

              <div onClick={() => onSelectMiniGame('whack')} className="group cursor-pointer glass-panel p-4 rounded-2xl hover:bg-white/10 transition-all border-b-4 border-green-500 flex flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectMiniGame('whack'); } }}>
                  <Hammer className="w-8 h-8 mb-2 text-green-400 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-sm group-hover:text-green-400">{t('whackTitle', language)}</h4>
              </div>
           </div>
        </div>

        {/* Section 2: Quiz Challenges */}
        <div className="space-y-4">
           <h3 className="text-xl font-bold text-gray-300 border-b border-white/10 pb-2">
             {t('quickPresets', language)}
           </h3>
           
           {presets.map((p, i) => (
             <div key={i} onClick={() => handlePreset(p)} className="group cursor-pointer glass-panel p-4 rounded-xl flex items-center gap-4 hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePreset(p); } }}>
                <div className="bg-black/30 p-3 rounded-lg flex items-center justify-center shrink-0">{p.icon}</div>
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