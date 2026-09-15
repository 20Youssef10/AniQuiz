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

import QuestionCard from './components/QuestionCard';
import QuestionSkeleton from './components/QuestionSkeleton';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ScoreBoard from './components/ScoreBoard';
import Timer from './components/Timer';
import LevelProgress from './components/LevelProgress';
import AuthModal from './components/AuthModal';
import UserProfileView from './components/UserProfile';
import ArcadeHub from './components/ArcadeHub';
import GachaSystem from './components/GachaSystem';
import StoryMode from './components/StoryMode';
import { MemoryGame, WhackGame, SilhouetteGame, ChatGame, TypingGame } from './components/MiniGames';
import { playSound } from './utils/sound';

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

const TOPICS = ['All', 'Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Slice of Life'];

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGacha, setShowGacha] = useState(false);

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
    if (!playerName.trim() || !hostApiKey.trim()) {
      alert("Please enter your name and Gemini API Key.");
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
    
    // Generate questions using Host's API Key
    setState(prev => ({ ...prev, status: 'loading' }));
    try {
       // Fetch Data
       const mediaData = await fetchMediaData({
          ...state.settings,
          searchQuery: state.settings.searchQuery || searchInput
       });
       
       // Generate Questions with CUSTOM KEY
       const questions = await generateQuizQuestions(mediaData, state.settings, hostApiKey);
       
       // Push to Firebase
       await startRoomGame(room.id, questions);
       // Listener will switch view to 'game'
    } catch (err: any) {
       setState(prev => ({ ...prev, status: 'error', error: err.message }));
    }
  };

  const startGameSinglePlayer = async () => {
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
      const mediaData = await fetchMediaData({ ...state.settings, searchQuery: searchInput });

      let themeImage = undefined;
      if (state.settings.contentType === ContentType.SPECIFIC && mediaData.length > 0) {
        themeImage = mediaData[0].bannerImage || mediaData[0].coverImage?.large;
      }

      let questions: any[] = [];
      let retries = 3;
      let lastErr: any;

      while (retries > 0 && questions.length === 0) {
          try {
             // Use the hostApiKey state (which defaults to env var)
             questions = await generateQuizQuestions(mediaData, state.settings, hostApiKey);
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
    // Immediately start loading for this preset
    setTimeout(() => startGameSinglePlayer(), 100);
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

  // --- Render Components ---

  const renderSettings = (isRoomSetup = false) => (
    <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-8 shadow-2xl ring-1 ring-white/10 animate-fade-in-up">
       {/* Game Mode */}
       <div>
          <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'نمط اللعب' : 'Game Mode'}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(GameMode).filter(m => m !== GameMode.STORY).map(mode => (
              <button key={mode} onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, gameMode: mode } }))}
                className={`py-3 px-2 rounded-xl text-sm font-bold border border-transparent transition-all ${state.settings.gameMode === mode ? 'bg-anime-primary text-white shadow-lg scale-105' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
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
                 <button key={lang} onClick={() => setState(p => ({...p, settings: {...p.settings, language: lang}}))}
                   className={`flex-1 py-2 rounded-lg text-sm font-medium ${state.settings.language === lang ? 'bg-anime-primary text-white' : 'bg-white/5 text-gray-400'}`}>
                   {lang === Language.ENGLISH ? 'English' : 'العربية'}
                 </button>
              ))}
            </div>
         </div>
         <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'المستوى' : 'Difficulty'}</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(Difficulty).map(d => (
                <button key={d} onClick={() => setState(p => ({...p, settings: {...p.settings, difficulty: d}}))}
                   className={`py-2 rounded-lg text-sm font-medium ${state.settings.difficulty === d ? 'bg-anime-primary text-white' : 'bg-white/5 text-gray-400'}`}>
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
              <button key={num} onClick={() => setState(p => ({...p, settings: {...p.settings, questionCount: num}}))}
                 className={`py-2 rounded-lg text-sm font-medium ${state.settings.questionCount === num ? 'bg-anime-secondary text-white' : 'bg-white/5 text-gray-400'}`}>
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
               <button key={type} onClick={() => setState(p => ({...p, settings: {...p.settings, contentType: type}}))}
                  className={`py-2 rounded-lg text-sm font-medium ${state.settings.contentType === type ? 'bg-anime-accent text-white' : 'bg-white/5 text-gray-400'}`}>
                  {type}
               </button>
            ))}
         </div>
       </div>

       {state.settings.contentType === ContentType.SPECIFIC ? (
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'اسم الأنمي' : 'Name'}</label>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search Query" placeholder="e.g. One Piece" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white transition-all focus:border-anime-primary outline-none" />
          </div>
       ) : (
          <div>
            <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'التصنيف' : 'Genre'}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TOPICS.map(t => (
                 <button key={t} onClick={() => setState(p => ({...p, settings: {...p.settings, topic: t}}))}
                    className={`py-2 rounded-lg text-sm font-medium ${state.settings.topic === t ? 'bg-anime-secondary text-white' : 'bg-white/5 text-gray-400'}`}>
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
               <button key={persona} onClick={() => setState(p => ({...p, settings: {...p.settings, aiPersona: persona}}))}
                  className={`py-2 rounded-lg text-sm font-medium ${state.settings.aiPersona === persona ? 'bg-anime-accent text-white' : 'bg-white/5 text-gray-400'}`}>
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
               <input type="text" aria-label="Player Name" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
            </div>
            <div>
               <label className="block text-sm font-semibold mb-2 text-green-400">Gemini API Key (Required for Host)</label>
               <input type="password" aria-label="Host API Key" value={hostApiKey} onChange={e => setHostApiKey(e.target.value)} placeholder="AIza..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
               <p className="text-xs text-gray-500 mt-1">The key is used only to generate questions and is not stored.</p>
            </div>
            <Button fullWidth onClick={handleCreateRoom} className="!bg-green-600">Create Room & Lobby</Button>
            <Button fullWidth variant="ghost" onClick={() => setView('home')}>Cancel</Button>
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
                 onChange={e => setHostApiKey(e.target.value)} 
                 placeholder="Leave empty to use default..." 
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm transition-all focus:border-anime-primary outline-none" 
               />
               <p className="text-xs text-gray-500 mt-1">
                 {isArabic 
                   ? 'اتركه فارغاً لاستخدام المفتاح الافتراضي، أو استخدم مفتاحك الخاص لسرعة أعلى.' 
                   : 'Leave empty to use the default server key, or use your own for higher rate limits.'}
               </p>
            </div>
            <Button fullWidth onClick={startGameSinglePlayer}>{isArabic ? 'ابدأ' : 'Start Quiz'}</Button>
            <Button fullWidth variant="ghost" onClick={() => setView('home')} className="mt-2">Back</Button>
         </div>
       )}
    </div>
  );

  // Main Render
  if (state.status === 'loading') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex items-center justify-center`}>
        {/* Use Skeleton if we were expecting a game or in setup, else Spinner */}
        {view === 'game' || view === 'single_setup' ? (
          <div className="w-full max-w-2xl px-4">
            <QuestionSkeleton />
            <p className="text-center mt-4 text-gray-400 animate-pulse">Summoning Questions...</p>
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
         <ArcadeHub 
           onSelectPreset={handleArcadePreset} 
           onSelectMiniGame={(game) => {
             setView(game);
             playSound('click');
           }}
           onBack={() => setView('home')} 
         />
      </div>
    );
  }

  if (['memory', 'whack', 'silhouette', 'chat', 'typing'].includes(view)) {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} p-4 flex items-center justify-center`}>
         {view === 'memory' && <MemoryGame onExit={() => setView('arcade')} />}
         {view === 'whack' && <WhackGame onExit={() => setView('arcade')} />}
         {view === 'silhouette' && <SilhouetteGame onExit={() => setView('arcade')} />}
         {view === 'chat' && <ChatGame onExit={() => setView('arcade')} />}
         {view === 'typing' && <TypingGame onExit={() => setView('arcade')} />}
      </div>
    );
  }

  if (view === 'story') {
    return (
      <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'}`}>
         <StoryMode onClose={() => setView('arcade')} />
      </div>
    );
  }

  if (view === 'lobby' && room) {
     const isHost = room.hostId === playerId;
     return (
        <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} flex items-center justify-center p-4`}>
           <div className="glass-panel p-8 rounded-3xl max-w-lg w-full text-center space-y-6">
              <h2 className="text-3xl font-bold mb-2">Lobby</h2>
              <div className="bg-white/10 p-4 rounded-xl mb-4">
                 <p className="text-xs uppercase text-gray-400 tracking-widest">Room Code</p>
                 <p className="text-4xl font-mono font-black text-anime-primary tracking-widest">{room.code}</p>
              </div>

              <div className="space-y-2 text-left">
                 <p className="text-sm font-bold text-gray-400">Players ({room.players.length})</p>
                 {room.players.map(p => (
                    <div key={p.id} className="flex items-center gap-2 bg-black/20 p-3 rounded-lg">
                       <div className="w-8 h-8 rounded-full bg-anime-secondary flex items-center justify-center text-xs font-bold">
                          {p.name.charAt(0)}
                       </div>
                       <span>{p.name} {p.isHost && '👑'}</span>
                    </div>
                 ))}
              </div>

              {isHost ? (
                <div className="pt-4 border-t border-white/10">
                   <Button fullWidth onClick={handleStartRoomGame} className="animate-pulse">Start Game</Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 animate-pulse">Waiting for host to start...</p>
              )}
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
        <ScoreBoard state={state} onRestart={restartGame} onSaveStats={handleSaveStats} />
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
              if (confirm("Exit game? Progress will be lost.")) restartGame();
           }}>
             ✕ Exit
           </Button>
           <div className={`text-2xl font-bold transition-transform ${scoreBump ? 'scale-125 text-green-400' : ''}`}>
             Score: {state.score}
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
              {state.currentIndex < state.questions.length - 1 ? (isArabic ? 'السؤال التالي' : 'Next Question') : (isArabic ? 'إنهاء' : 'Finish')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Fallback: Home View
  return (
    <div className={`min-h-screen bg-anime-dark text-white ${fontClass} ${direction === 'rtl' ? 'rtl' : 'ltr'} overflow-x-hidden`}>
      
      {/* Top Nav */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
         <h1 className="text-2xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-anime-primary to-anime-accent cursor-pointer" onClick={() => setView('home')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setView('home'); } }}>
            ANIQUIZ<span className="text-white">AI</span>
         </h1>
         <div className="flex gap-4">
            {user ? (
               <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowProfile(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowProfile(true); } }}>
                  <div className="text-right hidden md:block">
                     <div className="text-sm font-bold">{user.displayName}</div>
                     <div className="text-xs text-anime-secondary">LVL {userProfile?.level || 1}</div>
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
               <Button variant="outline" onClick={() => setShowAuthModal(true)} className="!py-2">Login</Button>
            )}
         </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center p-4 pt-10 pb-20 text-center relative">
         <div className="absolute top-0 left-1/4 w-64 h-64 bg-anime-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
         <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-anime-accent/20 rounded-full blur-[100px] pointer-events-none"></div>

         <div className="mb-4 inline-block px-4 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold tracking-widest text-anime-secondary animate-fade-in">
            POWERED BY GEMINI AI
         </div>
         
         <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight animate-fade-in-up">
            TEST YOUR <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-anime-primary via-anime-secondary to-anime-accent animate-shimmer bg-[length:200%_auto]">
               ANIME KNOWLEDGE
            </span>
         </h1>
         
         <p className="max-w-xl text-gray-400 text-lg mb-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Challenge yourself with infinite AI-generated quizzes from your favorite series. 
            Rank up, unlock achievements, and prove you are the ultimate Otaku.
         </p>

         <div className="flex flex-col md:flex-row gap-4 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button fullWidth className="text-lg py-4" onClick={() => setView('single_setup')}>
               Solo Challenge
            </Button>
            <Button fullWidth variant="secondary" className="text-lg py-4" onClick={() => setView('arcade')}>
               Arcade Zone 🕹️
            </Button>
         </div>
         
         <div className="mt-4 flex gap-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Button variant="ghost" className="text-sm" onClick={() => setView('room_setup')}>Create Room</Button>
            <Button variant="ghost" className="text-sm" onClick={() => setView('join_room')}>Join Room</Button>
         </div>
         
         <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
             <Button variant="outline" className="text-sm border-yellow-500 text-yellow-500 hover:bg-yellow-500/10" onClick={() => setShowGacha(true)}>
                🎁 Daily Gacha Summon
             </Button>
         </div>
      </div>

      {/* Render View Content for Setups */}
      {(view === 'single_setup' || view === 'room_setup') && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                {renderSettings(view === 'room_setup')}
             </div>
         </div>
      )}

      {/* Join Room Modal */}
      {view === 'join_room' && (
         <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel p-8 rounded-2xl max-w-sm w-full space-y-4">
               <h2 className="text-2xl font-bold mb-4">Join Party</h2>
               <input type="text" aria-label="Your Name" placeholder="Your Name" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
               <input type="text" aria-label="Room Code" placeholder="Room Code (e.g. A1B2C3)" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono tracking-widest uppercase" maxLength={6} />
               {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
               <Button fullWidth onClick={handleJoinRoom}>Enter Room</Button>
               <Button fullWidth variant="ghost" onClick={() => { setView('home'); setState(p => ({...p, error: undefined})); }}>Cancel</Button>
            </div>
         </div>
      )}

      {/* Stats / Level Footer */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
         <LevelProgress language={state.settings.language} />
      </div>

      {/* Modals */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onLoginSuccess={(u) => { setUser(u); setShowAuthModal(false); }} />}
      {showProfile && userProfile && <UserProfileView profile={userProfile} onClose={() => setShowProfile(false)} onLogout={() => { logout(); setShowProfile(false); setUser(null); }} />}
      {showGacha && userProfile && <GachaSystem user={userProfile} onClose={() => setShowGacha(false)} />}
    </div>
  );
}