import React, { useState, useEffect } from 'react';
import { QuizState, Difficulty, QuizSettings, Language, ContentType, GameMode, AIPersona } from './types';
import { fetchMediaData } from './services/aniListService';
import { generateQuizQuestions } from './services/geminiService';
import QuestionCard from './components/QuestionCard';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ScoreBoard from './components/ScoreBoard';
import Timer from './components/Timer';
import { playSound } from './utils/sound';

// Constants
const QUESTION_TIMER_SECONDS = 15; // Time per question in Time Attack

// Initial State
const INITIAL_STATE: QuizState = {
  status: 'idle',
  questions: [],
  currentIndex: 0,
  score: 0,
  settings: {
    difficulty: Difficulty.MEDIUM,
    questionCount: 5,
    topic: 'All',
    language: Language.ENGLISH,
    contentType: ContentType.ANIME,
    searchQuery: '',
    gameMode: GameMode.CLASSIC,
    aiPersona: AIPersona.DEFAULT,
    spoilerProtection: false,
  },
  answers: {},
  timeLeft: QUESTION_TIMER_SECONDS,
};

const TOPICS = ['All', 'Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life'];
const QUESTION_COUNTS = [5, 10, 15, 20];

export default function App() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  // --- Timer Logic for Time Attack ---
  useEffect(() => {
    let timer: any;
    
    if (
      state.status === 'playing' && 
      state.settings.gameMode === GameMode.TIME_ATTACK &&
      !isAnswerRevealed &&
      (state.timeLeft || 0) > 0
    ) {
      timer = setInterval(() => {
        setState(prev => {
          if ((prev.timeLeft || 0) <= 1) {
            // Time is up!
            clearInterval(timer);
            handleTimeUp();
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: (prev.timeLeft || 0) - 1 };
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [state.status, state.settings.gameMode, isAnswerRevealed, state.timeLeft]);

  const handleTimeUp = () => {
    playSound('wrong');
    setIsAnswerRevealed(true);
    // In Time Attack, running out of time counts as a wrong answer (no score increase)
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentIndex]: 'TIMEOUT' }
    }));
  };

  // --- Game Start ---
  const startGame = async () => {
    if (state.settings.contentType === ContentType.SPECIFIC && !searchInput.trim()) {
      setState(prev => ({ ...prev, error: "Please enter an anime name." }));
      return;
    }

    playSound('click');
    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      error: undefined,
      settings: { ...prev.settings, searchQuery: searchInput },
      themeImage: undefined
    }));
    
    try {
      const mediaData = await fetchMediaData({
        ...state.settings,
        searchQuery: searchInput
      });
      
      const questions = await generateQuizQuestions(
        mediaData,
        state.settings
      );

      // Determine Theme Image
      // If Specific Content, use banner/cover from first result
      // If General, leave undefined (default dark theme) or use a random one
      let themeImage = undefined;
      if (state.settings.contentType === ContentType.SPECIFIC && mediaData.length > 0) {
        themeImage = mediaData[0].bannerImage || mediaData[0].coverImage?.large;
      }

      playSound('start');

      setState(prev => ({
        ...prev,
        status: 'playing',
        questions,
        currentIndex: 0,
        score: 0,
        answers: {},
        timeLeft: QUESTION_TIMER_SECONDS, // Reset timer
        themeImage,
      }));
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err.message || "Failed to start quiz",
      }));
    }
  };

  // --- Answer Handling ---
  const handleAnswer = (answer: string) => {
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    
    if (isCorrect) playSound('correct');
    else playSound('wrong');

    setIsAnswerRevealed(true);

    setState(prev => {
      // Survival Logic: If wrong, game is effectively over (though we show explanation first)
      return {
        ...prev,
        answers: { ...prev.answers, [prev.currentIndex]: answer },
        score: isCorrect ? prev.score + 1 : prev.score
      };
    });
  };

  // --- Navigation / Next Question ---
  const nextQuestion = () => {
    playSound('click');
    
    // Check Survival Mode Condition
    const currentQuestion = state.questions[state.currentIndex];
    const userAnswer = state.answers[state.currentIndex];
    const isCorrect = userAnswer === currentQuestion.correctAnswer;

    if (state.settings.gameMode === GameMode.SURVIVAL && !isCorrect) {
      setState(prev => ({ ...prev, status: 'completed' }));
      return;
    }

    setIsAnswerRevealed(false);
    
    if (state.currentIndex < state.questions.length - 1) {
      setState(prev => ({ 
        ...prev, 
        currentIndex: prev.currentIndex + 1,
        timeLeft: QUESTION_TIMER_SECONDS // Reset timer for next question
      }));
    } else {
      setState(prev => ({ ...prev, status: 'completed' }));
    }
  };

  const restartGame = () => {
    playSound('click');
    setState(prev => ({ 
      ...INITIAL_STATE, 
      settings: prev.settings, // Keep user settings
      status: 'idle'
    }));
    setIsAnswerRevealed(false);
  };

  const isArabic = state.settings.language === Language.ARABIC;
  const fontClass = isArabic ? 'font-arabic' : 'font-sans';
  const direction = isArabic ? 'rtl' : 'ltr';

  // --- Render Helpers ---
  const renderGameModeDesc = (mode: GameMode) => {
    if (isArabic) {
      switch(mode) {
        case GameMode.CLASSIC: return 'أجب عن جميع الأسئلة بلا ضغوط.';
        case GameMode.SURVIVAL: return 'خطأ واحد وتنتهي اللعبة!';
        case GameMode.TIME_ATTACK: return 'لديك 15 ثانية فقط لكل سؤال!';
      }
    } else {
      switch(mode) {
        case GameMode.CLASSIC: return 'Standard quiz mode.';
        case GameMode.SURVIVAL: return 'Game Over on first wrong answer.';
        case GameMode.TIME_ATTACK: return '15s timer per question.';
      }
    }
  };

  const renderPersonaDesc = (p: AIPersona) => {
      if (isArabic) {
        switch(p) {
            case AIPersona.DEFAULT: return 'عادي';
            case AIPersona.DETECTIVE: return 'محقق (ذكي)';
            case AIPersona.HERO: return 'بطل (حماسي)';
            case AIPersona.TSUNDERE: return 'تسون (مزعج)';
            case AIPersona.VILLAIN: return 'شرير (متغطرس)';
        }
      }
      return p;
  };

  // --- Main Render ---
  return (
    <div className={`min-h-screen relative bg-anime-dark text-white overflow-hidden ${fontClass}`} dir={direction}>
      
      {/* Dynamic Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out opacity-20"
        style={{ 
          backgroundImage: state.themeImage ? `url(${state.themeImage})` : 'none',
          filter: 'blur(20px) brightness(0.5)'
        }}
      />
      {/* Gradient Overlay to ensure text readability */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-anime-dark/80 to-anime-dark"></div>

      {/* Content */}
      <div className="relative z-10">
        <header className="p-6 flex justify-between items-center border-b border-white/5 bg-anime-dark/50 backdrop-blur-md sticky top-0 z-50">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent cursor-pointer hover:scale-105 transition-transform" onClick={() => window.location.reload()}>
            AniQuiz AI
          </h1>
          {state.status === 'playing' && (
            <div className="flex items-center gap-4">
              <div className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full border border-white/10">
                 {isArabic ? 'النقاط' : 'Score'}: <span className="text-anime-primary">{state.score}</span>
              </div>
              <div className="text-sm font-mono text-gray-400">
                Q: {state.currentIndex + 1} / {state.questions.length}
              </div>
            </div>
          )}
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12">
          {state.status === 'error' && (
            <div className="text-center p-8 glass-panel rounded-xl max-w-md mx-auto mb-8 animate-fade-in">
               <div className="text-red-400 text-5xl mb-4">⚠</div>
               <p className="mb-6">{state.error}</p>
               <Button onClick={() => setState(prev => ({ ...prev, status: 'idle', error: undefined }))}>
                  {isArabic ? 'حاول مرة أخرى' : 'Try Again'}
               </Button>
            </div>
          )}

          {state.status === 'idle' && (
            <div className="max-w-2xl mx-auto animate-fade-in-up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center drop-shadow-lg">
                {isArabic ? 'اختبر معلوماتك في الأنمي' : 'Test Your Anime Knowledge'}
              </h2>
              <p className="text-gray-300 text-center mb-8 text-lg">
                {isArabic 
                  ? 'أسئلة ذكية يتم إنشاؤها بواسطة Gemini AI. اختر إعداداتك وابدأ التحدي!' 
                  : 'AI-generated quizzes powered by Gemini. Select your settings and challenge yourself!'}
              </p>
              
              <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-8 shadow-2xl ring-1 ring-white/10">
                
                {/* Game Mode Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                    {isArabic ? 'نمط اللعب' : 'Game Mode'}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.values(GameMode).map(mode => (
                      <button
                        key={mode}
                        onClick={() => {
                          playSound('click');
                          setState(prev => ({ ...prev, settings: { ...prev.settings, gameMode: mode } }));
                        }}
                        className={`relative py-3 px-2 rounded-xl text-sm font-medium transition-all border border-transparent flex flex-col items-center justify-center gap-1 ${
                          state.settings.gameMode === mode
                            ? 'bg-anime-primary text-white shadow-lg shadow-anime-primary/30 scale-105 z-10 ring-2 ring-anime-primary ring-offset-2 ring-offset-anime-dark' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <span className="font-bold text-base">
                           {isArabic && mode === GameMode.CLASSIC ? 'كلاسيكي' : 
                            isArabic && mode === GameMode.SURVIVAL ? 'البقاء' : 
                            isArabic && mode === GameMode.TIME_ATTACK ? 'سباق الزمن' : mode}
                        </span>
                        <span className="text-[10px] opacity-70 px-2 text-center leading-tight">
                           {renderGameModeDesc(mode)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 1: Language & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                       {isArabic ? 'اللغة' : 'Language'}
                     </label>
                     <div className="flex gap-2">
                       {Object.values(Language).map(lang => (
                          <button
                            key={lang}
                            onClick={() => {
                              playSound('click');
                              setState(prev => ({ ...prev, settings: { ...prev.settings, language: lang } }));
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors border border-transparent ${
                              state.settings.language === lang 
                                ? 'bg-anime-primary text-white shadow-lg shadow-anime-primary/20' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                            }`}
                          >
                            {lang === Language.ENGLISH ? 'English' : 'العربية'}
                          </button>
                       ))}
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                       {isArabic ? 'المستوى' : 'Difficulty'}
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                      {Object.values(Difficulty).map(d => (
                        <button
                          key={d}
                          onClick={() => {
                            playSound('click');
                            setState(prev => ({ ...prev, settings: { ...prev.settings, difficulty: d } }));
                          }}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                            state.settings.difficulty === d 
                              ? 'bg-anime-primary text-white' 
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {isArabic && d === 'Easy' ? 'سهل' : isArabic && d === 'Medium' ? 'متوسط' : isArabic && d === 'Hard' ? 'صعب' : d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Content Type & Search (Collapsed for brevity but kept functional) */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                    {isArabic ? 'نوع المحتوى' : 'Content Type'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.values(ContentType).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          playSound('click');
                          setState(prev => ({ ...prev, settings: { ...prev.settings, contentType: type } }));
                        }}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          state.settings.contentType === type
                            ? 'bg-anime-accent text-white' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {isArabic && type === 'Specific Title' ? 'عنوان محدد' : 
                         isArabic && type === 'Anime' ? 'أنمي' : 
                         isArabic && type === 'Manga' ? 'مانجا' : 
                         isArabic && type === 'Manhwa' ? 'مانهوا' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {state.settings.contentType === ContentType.SPECIFIC ? (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                      {isArabic ? 'اسم الأنمي / المانجا' : 'Anime / Manga Name'}
                    </label>
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder={isArabic ? 'مثال: One Piece' : 'e.g., One Piece, Naruto'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-anime-primary transition-all"
                    />
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                      {isArabic ? 'التصنيف' : 'Topic / Genre'}
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {TOPICS.map(t => (
                        <button
                          key={t}
                          onClick={() => {
                            playSound('click');
                            setState(prev => ({ ...prev, settings: { ...prev.settings, topic: t } }));
                          }}
                          className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                            state.settings.topic === t
                              ? 'bg-anime-secondary text-white' 
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Persona & Spoiler Guard */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-4">
                   <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                        {isArabic ? 'شخصية الذكاء الاصطناعي (الشرح)' : 'AI Host Persona (Explanation Style)'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(AIPersona).map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              playSound('click');
                              setState(prev => ({ ...prev, settings: { ...prev.settings, aiPersona: p } }));
                            }}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                              state.settings.aiPersona === p
                                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/20' 
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {renderPersonaDesc(p)}
                          </button>
                        ))}
                      </div>
                   </div>

                   <div>
                      <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                         {isArabic ? 'إعدادات إضافية' : 'Extra Settings'}
                      </label>
                      <button
                          onClick={() => {
                            playSound('click');
                            setState(prev => ({ ...prev, settings: { ...prev.settings, spoilerProtection: !prev.settings.spoilerProtection } }));
                          }}
                          className={`w-full py-3 rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                            state.settings.spoilerProtection
                              ? 'bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                              : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {state.settings.spoilerProtection ? '🛡️ ' : '🔓 '}
                          {isArabic ? 'حماية من حرق المانجا' : 'Spoiler Guard (No Manga Spoilers)'}
                      </button>
                   </div>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">
                    {isArabic ? 'عدد الأسئلة' : 'Number of Questions'}
                  </label>
                  <div className="flex gap-2">
                    {QUESTION_COUNTS.map(count => (
                      <button
                        key={count}
                        onClick={() => {
                          playSound('click');
                          setState(prev => ({ ...prev, settings: { ...prev.settings, questionCount: count } }));
                        }}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          state.settings.questionCount === count
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button fullWidth onClick={startGame}>
                    {isArabic ? 'ابدأ الاختبار' : 'Start Quiz'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {state.status === 'loading' && (
             <LoadingSpinner message={isArabic ? "جاري استدعاء المعلومات..." : "Summoning Knowledge..."} />
          )}

          {state.status === 'playing' && state.questions.length > 0 && (
            <div className="space-y-6">
              
              {/* Show Timer only in Time Attack mode */}
              {state.settings.gameMode === GameMode.TIME_ATTACK && (
                <Timer timeLeft={state.timeLeft || 0} maxTime={QUESTION_TIMER_SECONDS} />
              )}

              <QuestionCard 
                question={state.questions[state.currentIndex]} 
                onAnswer={handleAnswer}
                selectedAnswer={state.answers[state.currentIndex]}
                isRevealed={isAnswerRevealed}
              />
              {isAnswerRevealed && (
                <div className="flex justify-center animate-fade-in">
                  <Button onClick={nextQuestion} variant={
                    // Make the button red if Survival mode and answer was wrong
                    (state.settings.gameMode === GameMode.SURVIVAL && 
                     state.answers[state.currentIndex] !== state.questions[state.currentIndex].correctAnswer) 
                     ? 'secondary' : 'primary'
                  }>
                    {(() => {
                      // Logic for button text based on Game Mode and Result
                      const isLast = state.currentIndex === state.questions.length - 1;
                      const isSurvival = state.settings.gameMode === GameMode.SURVIVAL;
                      const isWrong = state.answers[state.currentIndex] !== state.questions[state.currentIndex].correctAnswer;
                      const isArabic = state.settings.language === Language.ARABIC;

                      if (isSurvival && isWrong) return isArabic ? 'انتهت اللعبة (عرض النتائج)' : 'Game Over (View Results)';
                      if (isLast) return isArabic ? 'إنهاء الاختبار' : 'Finish Quiz';
                      return isArabic ? 'السؤال التالي' : 'Next Question';
                    })()}
                  </Button>
                </div>
              )}
            </div>
          )}

          {state.status === 'completed' && (
            <ScoreBoard state={state} onRestart={restartGame} />
          )}
        </main>

         {/* Footer */}
         <footer className="fixed bottom-4 right-4 text-xs text-gray-600 pointer-events-none hidden md:block">
          Powered by AniList & Gemini
        </footer>
      </div>
    </div>
  );
}