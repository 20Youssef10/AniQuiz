import React from 'react';
import { QuizSettings, Difficulty, Language, GameMode, ContentType, AIPersona } from '../types';
import Button from './Button';

interface GameSettingsProps {
  settings: QuizSettings;
  onChange: (settings: QuizSettings) => void;
  isRoomSetup?: boolean;
  playerName?: string;
  onPlayerNameChange?: (name: string) => void;
  hostApiKey?: string;
  onHostApiKeyChange?: (key: string) => void;
  searchInput?: string;
  onSearchInputChange?: (query: string) => void;
  onCreateRoom?: () => void;
  onStartSinglePlayer?: () => void;
  onCancel?: () => void;
}

const TOPICS = ['All', 'Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life'];

const GameSettings: React.FC<GameSettingsProps> = ({
  settings,
  onChange,
  isRoomSetup = false,
  playerName = '',
  onPlayerNameChange = () => {},
  hostApiKey = '',
  onHostApiKeyChange = () => {},
  searchInput = '',
  onSearchInputChange = () => {},
  onCreateRoom = () => {},
  onStartSinglePlayer = () => {},
  onCancel = () => {}
}) => {
  const isArabic = settings.language === Language.ARABIC;

  return (
    <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-8 shadow-2xl ring-1 ring-white/10 animate-fade-in-up">
       {/* Game Mode */}
       <div>
          <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'نمط اللعب' : 'Game Mode'}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(GameMode).filter(m => m !== GameMode.STORY).map(mode => (
              <button key={mode} onClick={() => onChange({ ...settings, gameMode: mode })}
                className={`py-3 px-2 rounded-xl text-sm font-bold border border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.gameMode === mode ? 'bg-anime-primary text-white shadow-lg scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                {mode}
              </button>
            ))}
          </div>
       </div>

       {/* Language & Difficulty */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'اللغة' : 'Language'}</label>
            <div className="flex gap-2">
              {Object.values(Language).map(lang => (
                 <button key={lang} onClick={() => onChange({...settings, language: lang})}
                   className={`flex-1 py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.language === lang ? 'bg-anime-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                   {lang === Language.ENGLISH ? 'English' : 'العربية'}
                 </button>
              ))}
            </div>
         </div>
         <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'المستوى' : 'Difficulty'}</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(Difficulty).map(d => (
                <button key={d} onClick={() => onChange({...settings, difficulty: d})}
                   className={`py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.difficulty === d ? 'bg-anime-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                   {d}
                </button>
              ))}
            </div>
         </div>
       </div>

       {/* Question Count */}
       <div>
          <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'عدد الأسئلة' : 'Number of Questions'}</label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 20].map(num => (
              <button key={num} onClick={() => onChange({...settings, questionCount: num})}
                 className={`py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.questionCount === num ? 'bg-anime-secondary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                 {num}
              </button>
            ))}
          </div>
       </div>

       {/* Content Type */}
       <div>
         <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'نوع المحتوى' : 'Content Type'}</label>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.values(ContentType).map(type => (
               <button key={type} onClick={() => onChange({...settings, contentType: type})}
                  className={`py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.contentType === type ? 'bg-anime-accent text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {type}
               </button>
            ))}
         </div>
       </div>

       {settings.contentType === ContentType.SPECIFIC ? (
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'اسم الأنمي' : 'Name'}</label>
            <input type="text" value={searchInput} onChange={(e) => onSearchInputChange(e.target.value)} aria-label="Search Query" placeholder="e.g. One Piece" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white outline-none" />
          </div>
       ) : (
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'التصنيف' : 'Genre'}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOPICS.map(t => (
                 <button key={t} onClick={() => onChange({...settings, topic: t})}
                    className={`py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.topic === t ? 'bg-anime-secondary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                    {t}
                 </button>
              ))}
            </div>
          </div>
       )}

       {/* AI Persona */}
       <div>
         <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'شخصية الذكاء الاصطناعي' : 'AI Persona'}</label>
         <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.values(AIPersona).map(persona => (
               <button key={persona} onClick={() => onChange({...settings, aiPersona: persona})}
                  className={`py-2 rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 ${settings.aiPersona === persona ? 'bg-anime-accent text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                  {persona}
               </button>
            ))}
         </div>
       </div>

       {/* Host Extra Inputs */}
       {isRoomSetup && (
         <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
               <label className="block text-sm font-semibold mb-2 text-green-400">Host Name</label>
               <input type="text" aria-label="Player Name" value={playerName} onChange={e => onPlayerNameChange(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" />
            </div>
            <div>
               <label className="block text-sm font-semibold mb-2 text-green-400">Gemini API Key (Required for Host)</label>
               <input type="password" aria-label="Host API Key" value={hostApiKey} onChange={e => onHostApiKeyChange(e.target.value)} placeholder="AIza..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" />
               <p className="text-xs text-gray-500 mt-1">The key is used only to generate questions and is not stored.</p>
            </div>
            <Button fullWidth onClick={onCreateRoom} className="!bg-green-600">Create Room & Lobby</Button>
            <Button fullWidth variant="ghost" onClick={onCancel}>Cancel</Button>
         </div>
       )}

       {!isRoomSetup && (
         <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
               <label className="block text-sm font-semibold mb-2 text-gray-400">{isArabic ? 'مفتاح API (اختياري)' : 'Gemini API Key (Optional)'}</label>
               <input
                 type="password"
                 aria-label="Gemini API Key"
                 value={hostApiKey}
                 onChange={e => onHostApiKeyChange(e.target.value)}
                 placeholder="Leave empty to use default..."
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm transition-all focus:border-anime-primary outline-none"
               />
               <p className="text-xs text-gray-500 mt-1">
                 {isArabic
                   ? 'اتركه فارغاً لاستخدام المفتاح الافتراضي، أو استخدم مفتاحك الخاص لسرعة أعلى.'
                   : 'Leave empty to use the default server key, or use your own for higher rate limits.'}
               </p>
            </div>
            <Button fullWidth onClick={onStartSinglePlayer}>{isArabic ? 'ابدأ' : 'Start Quiz'}</Button>
            <Button fullWidth variant="ghost" onClick={onCancel} className="mt-2">Back</Button>
         </div>
       )}
    </div>
  );
};

export default GameSettings;
