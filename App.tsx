import { useState, useEffect } from 'react';
import { QuizState, Difficulty, Language, ContentType, GameMode, AIPersona, Room } from './types';
import { fetchMediaData } from './services/aniListService';
import { generateQuizQuestions } from './services/geminiService';
import { getChallenge, createRoom, joinRoom, listenToRoom, startRoomGame } from './services/firebase';
import QuestionCard from './components/QuestionCard';
import Button from './components/Button';
import LoadingSpinner from './components/LoadingSpinner';
import ScoreBoard from './components/ScoreBoard';
import Timer from './components/Timer';
import LevelProgress from './components/LevelProgress';
import { playSound } from './utils/sound';

// Constants
const QUESTION_TIMER_SECONDS = 15;

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

export default function App() {
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  
  // View State Management
  const [view, setView] = useState<'home' | 'single_setup' | 'room_setup' | 'join_room' | 'lobby' | 'game'>('home');
  
  // Room State
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [hostApiKey, setHostApiKey] = useState(process.env.API_KEY || '');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // --- Initialize & Async Challenge Loading ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('c');
    
    if (challengeId) {
      loadChallenge(challengeId);
    }
  }, []);

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
      // Use the hostApiKey state (which defaults to env var)
      const questions = await generateQuizQuestions(mediaData, state.settings, hostApiKey); 

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
        timeLeft: QUESTION_TIMER_SECONDS,
        themeImage,
      }));
      setView('game');
    } catch (err: any) {
      setState(prev => ({ ...prev, status: 'error', error: err.message }));
    }
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

  const restartGame = () => {
    playSound('click');
    // Clean URL
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
    <div className="glass-panel p-6 md:p-8 rounded-2xl space-y-8 shadow-2xl ring-1 ring-white/10 animate-fade-in">
       {/* (Settings UI Code from previous implementation - reused) */}
       {/* Game Mode */}
       <div>
          <label className="block text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">{isArabic ? 'نمط اللعب' : 'Game Mode'}</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(GameMode).map(mode => (
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
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="e.g. One Piece" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
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
       
       {/* Host Extra Inputs */}
       {isRoomSetup && (
         <div className="pt-4 border-t border-white/10 space-y-4">
            <div>
               <label className="block text-sm font-semibold mb-2 text-green-400">Host Name</label>
               <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
            </div>
            <div>
               <label className="block text-sm font-semibold mb-2 text-green-400">Gemini API Key (Required for Host)</label>
               <input type="password" value={hostApiKey} onChange={e => setHostApiKey(e.target.value)} placeholder="AIza..." className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
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
                 value={hostApiKey} 
                 onChange={e => setHostApiKey(e.target.value)} 
                 placeholder="Leave empty to use default..." 
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm" 
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

  // --- Main Render Switch ---

  return (
    <div className={`min-h-screen relative bg-anime-dark text-white overflow-hidden ${fontClass}`} dir={direction}>
       {/* Background */}
       <div className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out opacity-20" style={{ backgroundImage: state.themeImage ? `url(${state.themeImage})` : 'none', filter: 'blur(20px) brightness(0.5)' }} />
       <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-anime-dark/80 to-anime-dark"></div>

       <div className="relative z-10">
          {/* Header */}
          <header className="p-6 flex justify-between items-center border-b border-white/5 bg-anime-dark/50 backdrop-blur-md sticky top-0 z-50">
             <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent cursor-pointer" onClick={() => restartGame()}>AniQuiz AI</h1>
             {view === 'game' && <div className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full">Score: {state.score}</div>}
          </header>

          <main className="container mx-auto px-4 py-8 md:py-12">
             
             {/* Loading State */}
             {(state.status === 'loading') && <LoadingSpinner message={isArabic ? "جاري التحميل..." : "Loading..."} />}
             
             {/* Error State */}
             {state.status === 'error' && (
                <div className="text-center p-8 glass-panel rounded-xl max-w-md mx-auto">
                   <div className="text-red-400 text-5xl mb-4">⚠</div>
                   <p className="mb-6">{state.error}</p>
                   <Button onClick={() => setState(prev => ({ ...prev, status: 'idle', error: undefined }))}>Dismiss</Button>
                </div>
             )}

             {state.status !== 'loading' && state.status !== 'error' && (
               <>
                 {/* 1. Home View */}
                 {view === 'home' && (
                    <div className="max-w-4xl mx-auto flex flex-col items-center animate-fade-in-up">
                       <LevelProgress language={state.settings.language} />
                       <h2 className="text-4xl md:text-6xl font-black mb-4 text-center tracking-tight">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-secondary">Master</span> the Anime World
                       </h2>
                       <p className="text-gray-400 text-lg mb-12 text-center max-w-xl">
                          Challenge yourself or battle friends in real-time with AI-generated quizzes.
                       </p>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                          {/* Single Player */}
                          <button onClick={() => setView('single_setup')} className="group glass-panel p-8 rounded-3xl hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-anime-primary/50 text-left relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl">👤</div>
                             <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-anime-primary transition-colors">Solo Play</h3>
                             <p className="text-gray-400 text-sm">Challenge the AI alone and climb the ranks.</p>
                          </button>

                          {/* Create Room */}
                          <button onClick={() => setView('room_setup')} className="group glass-panel p-8 rounded-3xl hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-green-500/50 text-left relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl">⚔️</div>
                             <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-green-400 transition-colors">Create Room</h3>
                             <p className="text-gray-400 text-sm">Host a lobby, set the rules, and invite friends.</p>
                          </button>

                          {/* Join Room */}
                          <button onClick={() => setView('join_room')} className="group glass-panel p-8 rounded-3xl hover:bg-white/5 transition-all duration-300 border border-white/10 hover:border-anime-accent/50 text-left relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-6xl">🚪</div>
                             <h3 className="text-2xl font-bold mb-2 text-white group-hover:text-anime-accent transition-colors">Join Room</h3>
                             <p className="text-gray-400 text-sm">Enter a code to join an existing party.</p>
                          </button>
                       </div>
                    </div>
                 )}

                 {/* 2. Setup Views */}
                 {view === 'single_setup' && <div className="max-w-2xl mx-auto">{renderSettings(false)}</div>}
                 {view === 'room_setup' && <div className="max-w-2xl mx-auto">{renderSettings(true)}</div>}

                 {/* 3. Join Room View */}
                 {view === 'join_room' && (
                    <div className="max-w-md mx-auto glass-panel p-8 rounded-3xl animate-fade-in">
                       <h2 className="text-2xl font-bold mb-6 text-center">Join Party</h2>
                       <div className="space-y-4">
                          <div>
                             <label className="block text-sm font-semibold mb-2 text-gray-400">Your Name</label>
                             <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3" />
                          </div>
                          <div>
                             <label className="block text-sm font-semibold mb-2 text-gray-400">Room Code</label>
                             <input type="text" value={roomCodeInput} onChange={e => setRoomCodeInput(e.target.value.toUpperCase())} placeholder="ABCD12" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 tracking-widest font-mono text-center text-xl uppercase" />
                          </div>
                          <Button fullWidth onClick={handleJoinRoom} className="!bg-anime-accent">Join Room</Button>
                          <Button fullWidth variant="ghost" onClick={() => setView('home')}>Back</Button>
                       </div>
                    </div>
                 )}

                 {/* 4. Lobby View */}
                 {view === 'lobby' && room && (
                    <div className="max-w-2xl mx-auto glass-panel p-8 rounded-3xl animate-fade-in text-center">
                       <div className="mb-6">
                          <p className="text-gray-400 uppercase tracking-widest text-xs mb-2">Room Code</p>
                          <div className="text-5xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-anime-primary to-anime-accent">{room.code || '...'}</div>
                       </div>
                       
                       {!room.settings || !room.players ? (
                          <div className="py-8">
                              <LoadingSpinner message={isArabic ? "جاري الانضمام..." : "Joining Room..."} />
                          </div>
                       ) : (
                          <>
                            <div className="mb-8">
                                <h3 className="text-xl font-bold mb-4 flex items-center justify-center gap-2">
                                  Players <span className="bg-white/10 text-xs px-2 py-1 rounded-full">{room.players.length}</span>
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                  {room.players.map(p => (
                                      <div key={p.id} className={`p-3 rounded-xl border ${p.isHost ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10 bg-white/5'} flex items-center justify-between`}>
                                        <span className="font-bold">{p.name}</span>
                                        {p.isHost && <span className="text-xs text-yellow-500">HOST</span>}
                                      </div>
                                  ))}
                                </div>
                            </div>

                            <div className="bg-black/30 p-4 rounded-xl mb-6 text-left">
                                <p className="text-xs text-gray-500 mb-2 uppercase">Settings</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs bg-white/10 px-2 py-1 rounded">{room.settings.difficulty}</span>
                                  <span className="text-xs bg-white/10 px-2 py-1 rounded">{room.settings.gameMode}</span>
                                  <span className="text-xs bg-white/10 px-2 py-1 rounded">{room.settings.questionCount} Qs</span>
                                </div>
                            </div>

                            {room.hostId === playerId ? (
                                <div className="space-y-3">
                                  <Button fullWidth onClick={handleStartRoomGame} className="!bg-green-600 text-lg py-4">Start Game</Button>
                                  <p className="text-xs text-gray-500">This will generate questions and start for everyone.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4">
                                  <LoadingSpinner message="Waiting for host to start..." />
                                </div>
                            )}
                          </>
                       )}
                    </div>
                 )}

                 {/* 5. Game View */}
                 {view === 'game' && state.questions && state.questions.length > 0 && (
                   <div className="space-y-6">
                      {state.settings.gameMode === GameMode.TIME_ATTACK && <Timer timeLeft={state.timeLeft || 0} maxTime={QUESTION_TIMER_SECONDS} />}
                      <QuestionCard 
                        question={state.questions[state.currentIndex]} 
                        onAnswer={handleAnswer} 
                        selectedAnswer={state.answers[state.currentIndex]} 
                        isRevealed={isAnswerRevealed} 
                      />
                      {isAnswerRevealed && state.status !== 'completed' && (
                        <div className="flex justify-center animate-fade-in">
                          <Button onClick={nextQuestion} variant={(state.settings.gameMode === GameMode.SURVIVAL && state.answers[state.currentIndex] !== state.questions[state.currentIndex].correctAnswer) ? 'secondary' : 'primary'}>
                             {state.questions && state.currentIndex === state.questions.length - 1 ? (isArabic ? 'إنهاء' : 'Finish') : (isArabic ? 'التالي' : 'Next Question')}
                          </Button>
                        </div>
                      )}
                      
                      {state.status === 'completed' && <ScoreBoard state={state} onRestart={restartGame} />}
                   </div>
                 )}
               </>
             )}
          </main>
       </div>
    </div>
  );
}