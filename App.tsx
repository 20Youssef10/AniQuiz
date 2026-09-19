import { useState, useEffect } from 'react';
import { QuizState, Difficulty, Language, ContentType, GameMode, AIPersona, Room, UserProfile, MatchRecord, QuizSettings } from './types';
import { fetchMediaData } from './services/aniListService';
import { generateQuizQuestions } from './services/geminiService';
import { 
  getChallenge, 
  createRoom, 
  joinRoom, 
  listenToRoom, 
  startRoomGame, 
  auth, 
  subscribeToUserProfile, 
  logout, 
  saveGameResultToProfile 
} from './services/firebase';
import { checkNewAchievements } from './services/levelService';
import { onAuthStateChanged } from 'firebase/auth';

import { Suspense, lazy } from 'react';
import QuestionCard from './components/QuestionCard';
import QuestionSkeleton from './components/QuestionSkeleton';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import Timer from './components/Timer';
import LevelProgress from './components/LevelProgress';
import AuthModal from './components/AuthModal';
import { playSound, isAudioMuted, toggleAudioMute } from './utils/sound';
import { Copy, Crown, Volume2, VolumeX, Gamepad2, Sparkles, X, Languages } from 'lucide-react';
import { t } from './services/i18n';

const ArcadeHub = lazy(() => import('./components/ArcadeHub'));
const GameSettings = lazy(() => import('./components/GameSettings'));
const UserProfileView = lazy(() => import('./components/UserProfile'));
const GachaSystem = lazy(() => import('./components/GachaSystem'));
const StoryMode = lazy(() => import('./components/StoryMode'));
const ScoreBoard = lazy(() => import('./components/ScoreBoard'));
const MemoryGame = lazy(() => import('./components/MiniGames').then(m => ({ default: m.MemoryGame })));
const WhackGame = lazy(() => import('./components/MiniGames').then(m => ({ default: m.WhackGame })));
const SilhouetteGame = lazy(() => import('./components/MiniGames').then(m => ({ default: m.SilhouetteGame })));
const ChatGame = lazy(() => import('./components/MiniGames').then(m => ({ default: m.ChatGame })));
const TypingGame = lazy(() => import('./components/MiniGames').then(m => ({ default: m.TypingGame })));

// Constants
const QUESTION_TIMER_SECONDS = 15;

const DEFAULT_SETTINGS = {
  difficulty: Difficulty.MEDIUM,
  questionCount: 5,
  topic: 'All',
  language: Language.ENGLISH,
  contentType: ContentType.ANIME,
  searchQuery: '',
  gameMode: GameMode.CLASSIC,
  aiPersona: AIPersona.DEFAULT,
  spoilerProtection: false,
};

const loadSavedSettings = () => {
  try {
    const saved = localStorage.getItem('aniquiz_settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch (e) {
    console.warn("Failed to load settings:", e);
  }
  return DEFAULT_SETTINGS;
};

// Initial State
const INITIAL_STATE: QuizState = {
  status: 'idle',
  questions: [],
  currentIndex: 0,
  score: 0,
  settings: loadSavedSettings(),
  answers: {},
  timeLeft: QUESTION_TIMER_SECONDS,
};

export default function App() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  // Visual state for Score Animation
  const [scoreBump, setScoreBump] = useState(false);

  // View State Management
  const [view, setView] = useState<'home' | 'single_setup' | 'room_setup' | 'join_room' | 'lobby' | 'game' | 'arcade' | 'story' | 'memory' | 'whack' | 'silhouette' | 'chat' | 'typing'>('home');
  
  // Room State
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [hostApiKey, setHostApiKey] = useState(process.env.API_KEY || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Auth & Profile State
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [guestProfile, setGuestProfile] = useState<UserProfile>(() => {
    try {
      const stored = localStorage.getItem('aniquiz_guest_profile');
      if (stored) {
        return {
          uid: 'guest',
          displayName: 'Guest Otaku',
          email: '',
          photoURL: '',
          xp: 0,
          gamesPlayed: 0,
          achievements: [],
          matchHistory: [],
          inventory: [],
          lastGachaDate: 0,
          ...JSON.parse(stored)
        };
      }
    } catch (e) {}
    return {
      uid: 'guest',
      displayName: 'Guest Otaku',
      email: '',
      photoURL: '',
      xp: 0,
      gamesPlayed: 0,
      achievements: [],
      matchHistory: [],
      inventory: [],
      lastGachaDate: 0
    };
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGacha, setShowGacha] = useState(false);

  const activeProfile = userProfile || guestProfile;

  // Audio State
  const [isMuted, setIsMuted] = useState(isAudioMuted());

  // --- Dynamic SEO: Title Updates ---
  useEffect(() => {
    let title = "AniQuiz AI";
    switch (view) {
      case 'home': title = "AniQuiz AI - Home"; break;
      case 'arcade': title = "AniQuiz AI - Arcade Zone"; break;
      case 'game': title = `AniQuiz AI - Playing ${state.settings.gameMode}`; break;
      case 'story': title = "AniQuiz AI - Story Mode"; break;
      case 'room_setup': 
      case 'lobby': title = "AniQuiz AI - Multiplayer"; break;
      case 'memory': title = "AniQuiz AI - Memory Match"; break;
      case 'silhouette': title = "AniQuiz AI - Silhouette Challenge"; break;
      case 'whack': title = "AniQuiz AI - Whack-a-Slime"; break;
      default: title = "AniQuiz AI";
    }
    document.title = title;
  }, [view, state.settings.gameMode]);

  // --- Settings Persistence ---
  useEffect(() => {
    try {
      localStorage.setItem('aniquiz_settings', JSON.stringify(state.settings));
    } catch (e) {
      console.warn("Failed to save settings:", e);
    }
  }, [state.settings]);

  // --- Initialize Auth & Async Challenge Loading ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('c');
    
    if (challengeId) {
      loadChallenge(challengeId);
    }

    // Listen to Firebase Auth
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
       setUser(currentUser);
       if (currentUser && !currentUser.isAnonymous) {
          // Real user: Subscribe to profile updates
          const unsubProfile = subscribeToUserProfile(currentUser.uid, (profile) => {
             setUserProfile(profile);
          });
          return () => unsubProfile();
       } else {
         setUserProfile(null);
       }
    });

    return () => unsubscribeAuth();
  }, []);

  // --- Trigger Score Animation ---
  useEffect(() => {
    if (state.score > 0) {
      setScoreBump(true);
      const t = setTimeout(() => setScoreBump(false), 300);
      return () => clearTimeout(t);
    }
  }, [state.score]);

  // --- Room Listener ---
  useEffect(() => {
    if (room?.id) {
      const unsubscribe = listenToRoom(room.id, (updatedRoom) => {
        setRoom(updatedRoom);
        
        // If game started, transition to game view
        if (updatedRoom.status === 'playing' && view === 'lobby') {
           if (updatedRoom.questions && updatedRoom.questions.length > 0) {
             setState(prev => ({
               ...prev,
               status: 'playing',
               questions: updatedRoom.questions || [],
               settings: updatedRoom.settings || prev.settings,
               currentIndex: 0,
               score: 0,
               answers: {},
               timeLeft: QUESTION_TIMER_SECONDS
             }));
             setView('game');
             playSound('start');
           }
        }
      });
      return () => unsubscribe();
    }
  }, [room?.id, view]);

  // --- Logic ---

  const loadChallenge = async (id: string) => {
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const challengeData = await getChallenge(id);
      if (challengeData) {
        setState(prev => ({
          ...prev,
          status: 'idle',
          questions: challengeData.questions || [],
          settings: challengeData.settings,
        }));
        setView('single_setup'); // Go to setup but with pre-loaded data logic handled in render
      } else {
        setState(prev => ({ ...prev, status: 'error', error: "Challenge not found." }));
      }
    } catch (e) {
      setState(prev => ({ ...prev, status: 'error', error: "Failed to load challenge." }));
    }
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      alert("Please enter your name.");
      return;
    }
    
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const { roomId, playerId: pid, code } = await createRoom(playerName, state.settings);
      setPlayerId(pid);
      // Room listener will update the room state
      setRoom({ id: roomId, code, hostId: pid, players: [], status: 'waiting', settings: state.settings, createdAt: Date.now() }); 
      setView('lobby');
      setState(prev => ({ ...prev, status: 'idle' }));
    } catch (e) {
      setState(prev => ({ ...prev, status: 'error', error: "Failed to create room." }));
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !roomCodeInput.trim()) {
      alert("Please enter Name and Room Code.");
      return;
    }

    setState(prev => ({ ...prev, status: 'loading' }));
    try {
      const { roomId, playerId: pid } = await joinRoom(roomCodeInput, playerName);
      setPlayerId(pid);
      setRoom({ id: roomId } as Room); // Listener will fill data
      setView('lobby');
      setState(prev => ({ ...prev, status: 'idle' }));
    } catch (e: any) {
      setState(prev => ({ ...prev, status: 'error', error: e.message }));
      setTimeout(() => setState(prev => ({ ...prev, status: 'idle', error: undefined })), 3000);
    }
  };

  const handleStartRoomGame = async () => {
    if (!room) return;
    
    // Generate questions using Host's API Key or fallback
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
       const effectiveKey = hostApiKey.trim() || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
       // Fetch Data
       const mediaData = await fetchMediaData({
          ...state.settings,
          searchQuery: state.settings.searchQuery || searchInput
       });
       
       // Generate Questions with Key
       const questions = await generateQuizQuestions(mediaData, state.settings, effectiveKey);
       
       // Push to Firebase
       await startRoomGame(room.id, questions);
       // Listener will switch view to 'game'
    } catch (err: any) {
       setState(prev => ({ ...prev, status: 'error', error: err.message }));
    }
  };

  const startGameSinglePlayer = async (customSettings?: QuizSettings, customSearch?: string) => {
    // If questions pre-loaded (Challenge Link)
    if (state.questions && state.questions.length > 0 && state.status !== 'playing') {
       playSound('start');
       setState(prev => ({
         ...prev,
         status: 'playing',
         score: 0,
         currentIndex: 0,
         answers: {},
         timeLeft: QUESTION_TIMER_SECONDS
       }));
       setView('game');
       return;
    }

    const activeSettings = customSettings || state.settings;
    const effectiveSearch = customSearch !== undefined ? customSearch : (activeSettings.searchQuery || searchInput);

    if (activeSettings.contentType === ContentType.SPECIFIC && !effectiveSearch.trim()) {
      setState(prev => ({ ...prev, error: "Please enter an anime name." }));
      return;
    }

    playSound('click');
    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      error: undefined,
      settings: { ...activeSettings, searchQuery: effectiveSearch },
      themeImage: undefined
    }));
    
    try {
      const mediaData = await fetchMediaData({ ...activeSettings, searchQuery: effectiveSearch });

      let themeImage = undefined;
      if (activeSettings.contentType === ContentType.SPECIFIC && mediaData.length > 0) {
        themeImage = mediaData[0].bannerImage || mediaData[0].coverImage?.large;
      }

      let questions: any[] = [];
      let retries = 3;
      let lastErr: any;
      const effectiveKey = hostApiKey.trim() || process.env.GEMINI_API_KEY || process.env.API_KEY || '';

      while (retries > 0 && questions.length === 0) {
          try {
             questions = await generateQuizQuestions(mediaData, activeSettings, effectiveKey);
             if (questions.length === 0) {
                throw new Error("Generation returned empty. Retrying...");
             }
             break; // Success!
          } catch (e) {
             console.warn(`Generation failed, retrying... (${retries} left)`, e);
             lastErr = e;
             retries--;
          }
      }

      if (questions.length === 0) {
         throw lastErr || new Error("Failed to generate questions after multiple attempts. Please try again.");
      }

      playSound('start');
      setState(prev => ({
        ...prev,
        status: 'playing',
        questions,
        currentIndex: 0,
        score: 0,
        answers: {},
        timeLeft: QUESTION_TIMER_SECONDS,
        themeImage,
      }));
      setView('game');
    } catch (err: any) {
      setState(prev => ({ ...prev, status: 'error', error: err.message }));
    }
  };

  // --- Arcade Handlers ---
  const handleArcadePreset = (presetSettings: QuizSettings) => {
    setState(prev => ({ ...prev, settings: presetSettings }));
    startGameSinglePlayer(presetSettings, presetSettings.searchQuery || '');
  };

  // --- Timer ---
  useEffect(() => {
    let timer: any;
    if (
      view === 'game' &&
      state.settings.gameMode === GameMode.TIME_ATTACK &&
      !isAnswerRevealed &&
      (state.timeLeft || 0) > 0
    ) {
      timer = setInterval(() => {
        setState(prev => {
          if ((prev.timeLeft || 0) <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: (prev.timeLeft || 0) - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, state.settings.gameMode, isAnswerRevealed, state.timeLeft]);

  const handleTimeUp = () => {
    playSound('wrong');
    setIsAnswerRevealed(true);
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentIndex]: 'TIMEOUT' }
    }));
  };

  const handleAnswer = (answer: string) => {
    const currentQuestion = state.questions[state.currentIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    if (isCorrect) playSound('correct'); else playSound('wrong');

    setIsAnswerRevealed(true);
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, [prev.currentIndex]: answer },
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  };

  const nextQuestion = () => {
    playSound('click');
    const isCorrect = state.answers[state.currentIndex] === state.questions[state.currentIndex].correctAnswer;

    if (state.settings.gameMode === GameMode.SURVIVAL && !isCorrect) {
      setState(prev => ({ ...prev, status: 'completed' }));
      return;
    }

    setIsAnswerRevealed(false);
    if (state.questions && state.currentIndex < state.questions.length - 1) {
      setState(prev => ({ 
        ...prev, 
        currentIndex: prev.currentIndex + 1,
        timeLeft: QUESTION_TIMER_SECONDS
      }));
    } else {
      setState(prev => ({ ...prev, status: 'completed' }));
    }
  };

  const handleSaveStats = async (record: MatchRecord) => {
     if (user && !user.isAnonymous && userProfile) {
        // Calculate Achievements
        const newUnlocks = checkNewAchievements(
          userProfile, 
          record.score, 
          record.totalQuestions, 
          record.mode
        );

        if (newUnlocks.length > 0) {
           console.log("Unlocked Achievements:", newUnlocks);
        }

        await saveGameResultToProfile(user.uid, record, newUnlocks);
     } else {
        // Save to guest profile
        const newUnlocks = checkNewAchievements(
          guestProfile,
          record.score,
          record.totalQuestions,
          record.mode
        );
        setGuestProfile(prev => {
           const updated: UserProfile = {
              ...prev,
              xp: prev.xp + record.xpEarned,
              gamesPlayed: prev.gamesPlayed + 1,
              achievements: Array.from(new Set([...prev.achievements, ...newUnlocks])),
              matchHistory: [...(prev.matchHistory || []), record]
           };
           try {
              localStorage.setItem('aniquiz_guest_profile', JSON.stringify(updated));
           } catch (e) {}
           return updated;
        });
     }
  };

  const restartGame = () => {
    playSound('click');
    window.history.replaceState({}, '', window.location.pathname);
    setState({ ...INITIAL_STATE, status: 'idle' });
    setRoom(null);
    setPlayerId(null);
    setView('home');
    setIsAnswerRevealed(false);
  };

  const isArabic = state.settings.language === Language.ARABIC;
  const fontClass = isArabic ? 'font-arabic' : 'font-sans';
  const direction = isArabic ? 'rtl' : 'ltr';

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = direction;
      document.documentElement.lang = isArabic ? 'ar' : 'en';
    }
  }, [direction, isArabic]);

  const toggleLanguage = () => {
    const nextLang = state.settings.language === Language.ENGLISH ? Language.ARABIC : Language.ENGLISH;
    setState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        language: nextLang
      }
    }));
    playSound('click');
  };

  // --- Render Components ---

  // Main Render
  if (state.status === 'loading') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex items-center justify-center`}>
        {/* Use Skeleton if we were expecting a game or in setup, else Spinner */}
        {view === 'game' || view === 'single_setup' ? (
          <div className="w-full max-w-2xl px-4">
            <QuestionSkeleton />
            <p className="text-center mt-4 text-gray-400 animate-pulse">
              {isArabic ? 'جاري تحضير الأسئلة...' : 'Summoning Questions...'}
            </p>
          </div>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    );
  }

  if (view === 'arcade') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} p-4`}>
         <Suspense fallback={<LoadingSpinner />}>
           <ArcadeHub
             onSelectPreset={handleArcadePreset}
             onSelectMiniGame={(game) => {
               setView(game);
               playSound('click');
             }}
             onBack={() => setView('home')}
             language={state.settings.language}
           />
         </Suspense>
      </div>
    );
  }

  if (['memory', 'whack', 'silhouette', 'chat', 'typing'].includes(view)) {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} p-4 flex items-center justify-center`}>
         <Suspense fallback={<LoadingSpinner />}>
           {view === 'memory' && <MemoryGame onExit={() => setView('arcade')} />}
           {view === 'whack' && <WhackGame onExit={() => setView('arcade')} />}
           {view === 'silhouette' && <SilhouetteGame onExit={() => setView('arcade')} />}
           {view === 'chat' && <ChatGame onExit={() => setView('arcade')} />}
           {view === 'typing' && <TypingGame onExit={() => setView('arcade')} />}
         </Suspense>
      </div>
    );
  }

  if (view === 'story') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
         <Suspense fallback={<LoadingSpinner />}>
           <StoryMode onClose={() => setView('arcade')} />
         </Suspense>
      </div>
    );
  }

  if (view === 'lobby' && room) {
     const isHost = room.hostId === playerId;
     const players = room.players || [];
     const currentLang = state.settings.language;
     return (
        <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex items-center justify-center p-4`}>
           <div className="glass-panel p-8 rounded-3xl max-w-lg w-full text-center space-y-6 animate-fade-in">
              <h2 className="text-3xl font-bold mb-2">{t('lobby', currentLang)}</h2>
              <div className="bg-white/10 p-4 rounded-xl mb-4">
                 <p className="text-xs uppercase text-gray-400 tracking-widest mb-1">{t('roomCodeLabel', currentLang)}</p>
                 <p className="text-4xl font-mono font-black text-anime-primary tracking-widest">{room.code}</p>
                 <button
                    onClick={() => {
                       navigator.clipboard?.writeText(room.code);
                       alert(t('copied', currentLang));
                    }}
                    className="mt-2 text-xs text-anime-accent hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                 >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{t('copyCode', currentLang)}</span>
                 </button>
              </div>

              <div className="space-y-2 text-left">
                 <p className="text-sm font-bold text-gray-400">{t('players', currentLang)} ({players.length})</p>
                 {players.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-black/20 p-3 rounded-lg">
                       <div className="w-8 h-8 rounded-full bg-anime-secondary flex items-center justify-center text-xs font-bold">
                          {p.name.charAt(0)}
                       </div>
                       <span className="text-sm flex items-center gap-1">
                          {p.name}
                          {p.isHost && <Crown className="w-4 h-4 text-yellow-400 inline" />}
                       </span>
                    </div>
                 ))}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                 {isHost ? (
                    <Button fullWidth onClick={handleStartRoomGame} className="animate-pulse">{t('startGame', currentLang)}</Button>
                 ) : (
                    <p className="text-sm text-gray-400 animate-pulse">{t('waitingHost', currentLang)}</p>
                 )}
                 <Button fullWidth variant="ghost" onClick={() => { setRoom(null); setView('home'); }}>{t('leaveRoom', currentLang)}</Button>
              </div>
           </div>
        </div>
     );
  }

  if (state.status === 'error') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex flex-col items-center justify-center p-4`}>
        <div className="glass-panel p-8 rounded-3xl max-w-lg w-full text-center space-y-6">
           <h2 className="text-3xl font-bold text-red-400 mb-2">Error</h2>
           <p className="text-gray-300 text-lg">{state.error || "Something went wrong."}</p>
           <Button fullWidth onClick={() => {
              setView('home');
              setState(prev => ({ ...prev, status: 'idle', error: undefined }));
           }}>
             Return Home
           </Button>
        </div>
      </div>
    );
  }

  if (state.status === 'completed') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex items-center justify-center`}>
        <Suspense fallback={<LoadingSpinner />}>
          <ScoreBoard state={state} onRestart={restartGame} onSaveStats={handleSaveStats} />
        </Suspense>
      </div>
    );
  }

  if (state.status === 'playing' || view === 'game') {
    const currentQuestion = state.questions[state.currentIndex];
    
    // Safety check if questions aren't loaded yet but status is playing
    if (!currentQuestion) return <LoadingSpinner />;

    return (
      <div 
        className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex flex-col items-center p-4 transition-all duration-1000`}
        style={{
           backgroundImage: state.themeImage ? `linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95)), url(${state.themeImage})` : 'none',
           backgroundSize: 'cover',
           backgroundPosition: 'center'
        }}
      >
        <div className="w-full max-w-4xl flex justify-between items-center py-4 mb-4">
           <Button variant="ghost" aria-label="Exit game" onClick={() => {
              if (confirm(isArabic ? "هل تريد الخروج؟ ستفقد تقدمك الحالي." : "Exit game? Progress will be lost.")) restartGame();
           }} className="inline-flex items-center gap-1.5">
             <X className="w-4 h-4" />
             <span>{t('exit', state.settings.language)}</span>
           </Button>
           <div className={`text-2xl font-bold transition-transform ${scoreBump ? 'scale-125 text-green-400' : ''}`}>
             {t('score', state.settings.language)}: {state.score}
           </div>
        </div>

        {state.settings.gameMode === GameMode.TIME_ATTACK && (
           <Timer timeLeft={state.timeLeft || 0} maxTime={QUESTION_TIMER_SECONDS} />
        )}

        {/* Progress Bar */}
        <div className="w-full max-w-2xl bg-white/10 h-1 rounded-full mb-8">
           <div 
             className="h-full bg-anime-primary transition-all duration-500" 
             style={{ width: `${((state.currentIndex + 1) / state.questions.length) * 100}%` }}
           ></div>
        </div>

        <QuestionCard
          question={currentQuestion}
          selectedAnswer={state.answers[state.currentIndex]}
          onAnswer={handleAnswer}
          isRevealed={isAnswerRevealed}
        />

        {isAnswerRevealed && (
          <div className="fixed bottom-8 animate-fade-in-up z-20">
            <Button onClick={nextQuestion} className="px-12 py-4 text-lg shadow-xl shadow-anime-primary/20">
              {state.currentIndex < state.questions.length - 1 ? t('nextQuestion', state.settings.language) : t('finishQuiz', state.settings.language)}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Fallback: Home View
  const homeLang = state.settings.language;

  return (
    <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} overflow-x-hidden`}>
      
      {/* Top Nav */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
         <h1 className="text-2xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-anime-primary to-anime-accent cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded" onClick={() => setView('home')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('home'); } }}>
            {t('appTitle', homeLang)}<span className="text-white">{t('appSubtitle', homeLang)}</span>
         </h1>
         <div className="flex gap-3 items-center">
            <button
               onClick={toggleLanguage}
               className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 cursor-pointer text-gray-200"
               aria-label="Toggle language"
               title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
            >
               <Languages className="w-3.5 h-3.5 text-anime-primary" />
               <span>{isArabic ? 'English' : 'العربية'}</span>
            </button>
            <button
               onClick={() => setIsMuted(toggleAudioMute())}
               className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
               aria-label={isMuted ? t('unmute', homeLang) : t('mute', homeLang)}
               title={isMuted ? t('unmute', homeLang) : t('mute', homeLang)}
            >
               {isMuted ? <VolumeX className="w-5 h-5 text-gray-400" /> : <Volume2 className="w-5 h-5 text-anime-accent" />}
            </button>
            {user ? (
               <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-full pr-4" onClick={() => setShowProfile(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(true); } }}>
                  <div className="text-right hidden md:block">
                     <div className="text-sm font-bold">{user.displayName}</div>
                     <div className="text-xs text-anime-secondary">{t('level', homeLang)} {userProfile?.level || 1}</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-anime-primary to-anime-secondary p-0.5">
                     {user.photoURL ? (
                        <img src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="Profile" />
                     ) : (
                        <div className="w-full h-full bg-black rounded-full flex items-center justify-center font-bold">
                           {user.displayName?.charAt(0) || 'U'}
                        </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setShowProfile(true)} className="!py-2 text-xs text-gray-300">
                     {t('collection', homeLang)} ({guestProfile.inventory?.length || 0})
                  </Button>
                  <Button variant="outline" onClick={() => setShowAuthModal(true)} className="!py-2">{t('login', homeLang)}</Button>
               </div>
            )}
         </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center p-4 pt-10 pb-20 text-center relative">
         <div className="absolute top-0 left-1/4 w-64 h-64 bg-anime-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
         <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-anime-accent/20 rounded-full blur-[100px] pointer-events-none"></div>

         <div className="mb-4 inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-anime-secondary animate-fade-in">
            {t('heroBadge', homeLang)}
         </div>
         
         <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-fade-in-up">
            {t('heroTitle1', homeLang)} <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-anime-primary via-anime-secondary to-anime-accent animate-shimmer bg-[length:200%_auto]">
               {t('heroTitle2', homeLang)}
            </span>
         </h1>
         
         <p className="max-w-xl text-gray-400 text-lg mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {t('heroSubtitle', homeLang)}
         </p>

         <div className="flex flex-col md:flex-row gap-4 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button fullWidth className="text-lg py-4" onClick={() => setView('single_setup')}>
               {t('soloChallenge', homeLang)}
            </Button>
            <Button fullWidth variant="secondary" className="text-lg py-4 flex items-center justify-center gap-2" onClick={() => setView('arcade')}>
               <Gamepad2 className="w-5 h-5" />
               <span>{t('arcadeZone', homeLang)}</span>
            </Button>
         </div>
         
         <div className="mt-4 flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button variant="ghost" className="text-sm" onClick={() => setView('room_setup')}>{t('createRoom', homeLang)}</Button>
            <Button variant="ghost" className="text-sm" onClick={() => setView('join_room')}>{t('joinRoom', homeLang)}</Button>
         </div>
         
         <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
             <Button variant="outline" className="text-sm border-yellow-500 text-yellow-500 hover:bg-yellow-500/10 flex items-center gap-2" onClick={() => setShowGacha(true)}>
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>{t('dailyGacha', homeLang)}</span>
             </Button>
         </div>
      </div>

      {/* Render View Content for Setups */}
      {(view === 'single_setup' || view === 'room_setup') && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <Suspense fallback={<LoadingSpinner />}>
                  <GameSettings
                    settings={state.settings}
                    onChange={(settings) => setState(prev => ({ ...prev, settings }))}
                    isRoomSetup={view === 'room_setup'}
                    playerName={playerName}
                    onPlayerNameChange={setPlayerName}
                    hostApiKey={hostApiKey}
                    onHostApiKeyChange={setHostApiKey}
                    searchInput={searchInput}
                    onSearchInputChange={setSearchInput}
                    onCreateRoom={handleCreateRoom}
                    onStartSinglePlayer={startGameSinglePlayer}
                    onCancel={() => setView('home')}
                  />
                </Suspense>
             </div>
         </div>
      )}

      {/* Join Room Modal */}
      {view === 'join_room' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl max-w-sm w-full space-y-4">
               <h2 className="text-2xl font-bold mb-4">{t('joinParty', homeLang)}</h2>
               <input type="text" aria-label="Your Name" placeholder={t('yourName', homeLang)} value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
               <input type="text" aria-label="Room Code" placeholder={t('roomCode', homeLang)} value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono tracking-widest uppercase text-white" maxLength={6} />
               {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
               <Button fullWidth onClick={handleJoinRoom}>{t('enterRoom', homeLang)}</Button>
               <Button fullWidth variant="ghost" onClick={() => { setView('home'); setState(p => ({...p, error: undefined})); }}>{t('cancel', homeLang)}</Button>
            </div>
         </div>
      )}

      {/* Stats / Level Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
         <LevelProgress language={state.settings.language} />
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={(u) => { setUser(u); setShowAuthModal(false); }} />}
      {showProfile && activeProfile && (
        <Suspense fallback={<LoadingSpinner />}>
          <UserProfileView 
            profile={activeProfile} 
            onClose={() => setShowProfile(false)} 
            onLogout={() => { 
              if (user) logout(); 
              setShowProfile(false); 
              setUser(null); 
            }} 
          />
        </Suspense>
      )}
      {showGacha && activeProfile && (
        <Suspense fallback={<LoadingSpinner />}>
          <GachaSystem 
            user={activeProfile} 
            language={state.settings.language}
            onClose={() => setShowGacha(false)} 
            onCardPulled={(card) => {
              if (userProfile) {
                setUserProfile(prev => prev ? ({
                  ...prev,
                  inventory: [...(prev.inventory || []), card],
                  lastGachaDate: Date.now()
                }) : null);
              } else {
                setGuestProfile(prev => {
                  const updated = {
                    ...prev,
                    inventory: [...(prev.inventory || []), card],
                    lastGachaDate: Date.now()
                  };
                  try {
                    localStorage.setItem('aniquiz_guest_profile', JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
}