import React, { useState, useEffect } from 'react';
import { QuizState, Language, MatchRecord } from '../types';
import Button from './Button';
import { createChallenge } from '../services/firebase';
import { addXp, getUserStats } from '../services/levelService';

interface ScoreBoardProps {
  state: QuizState;
  onRestart: () => void;
  onSaveStats?: (record: MatchRecord) => void; // Callback to parent
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ state, onRestart, onSaveStats }) => {
  const [challengeLink, setChallengeLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  
  // Legacy local stats for display if not logged in
  const [localStats, setLocalStats] = useState(getUserStats(state.settings.language));

  const isArabic = state.settings.language === Language.ARABIC;

  useEffect(() => {
    // XP Formula
    const correctCount = state.score;
    let multiplier = 1;
    if (state.settings.difficulty === 'Medium') multiplier = 1.5;
    if (state.settings.difficulty === 'Hard') multiplier = 2;
    if (state.settings.gameMode === 'Survival') multiplier *= 1.2;
    if (state.settings.gameMode === 'Time Attack') multiplier *= 1.2;

    const xp = Math.round(correctCount * 10 * multiplier);
    setEarnedXp(xp);

    // Save Logic
    if (xp > 0) {
       // 1. Local Fallback (Always run for immediate feedback/guest)
       addXp(xp);
       setLocalStats(getUserStats(state.settings.language));

       // 2. Cloud Save (via Parent)
       if (onSaveStats) {
         onSaveStats({
            date: Date.now(),
            score: state.score,
            totalQuestions: state.questions.length,
            mode: state.settings.gameMode,
            difficulty: state.settings.difficulty,
            xpEarned: xp
         });
       }
    }
  }, []);

  const handleCreateChallenge = async () => {
    setIsGeneratingLink(true);
    try {
      const id = await createChallenge(state.questions, state.settings);
      const url = `${window.location.origin}?c=${id}`;
      setChallengeLink(url);
    } catch (error) {
      console.error(error);
      alert("Failed to create challenge link.");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = () => {
    if (challengeLink) {
      navigator.clipboard.writeText(challengeLink);
      alert(isArabic ? "تم نسخ الرابط!" : "Link copied to clipboard!");
    }
  };

  const percentage = Math.round((state.score / state.questions.length) * 100);
  
  let message = isArabic ? "استمر في المشاهدة!" : "Keep Watching!";
  if (percentage >= 80) message = isArabic ? "ملك الأوتاكو! 👑" : "Otaku King! 👑";
  else if (percentage >= 50) message = isArabic ? "متابع جيد!" : "Casual Fan!";

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden">
        
        {/* Rank Badge at top right (Visual only) */}
        <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
           {localStats.title}
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">{message}</h2>
        <p className="text-gray-400 mb-8">{isArabic ? "اكتمل الاختبار" : "Quiz Completed"}</p>

        <div className="mb-6 relative">
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 36 36">
            <path
              className="text-gray-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="text-anime-accent"
              strokeDasharray={`${percentage}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <span className="text-4xl font-bold text-white">{state.score}</span>
            <span className="text-gray-400 text-sm block">/ {state.questions.length}</span>
          </div>
        </div>

        {/* XP Gained Animation */}
        <div className="mb-8 p-4 bg-anime-dark/50 rounded-xl border border-white/10">
           <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">{isArabic ? "الخبرة المكتسبة" : "XP GAINED"}</div>
           <div className="text-3xl font-extrabold text-green-400 drop-shadow-md">+{earnedXp} XP</div>
        </div>

        <div className="space-y-4">
          {!challengeLink ? (
            <Button onClick={handleCreateChallenge} disabled={isGeneratingLink} fullWidth variant="secondary">
               {isGeneratingLink ? (isArabic ? "جاري الإنشاء..." : "Creating...") : (isArabic ? "تحدي صديق ⚔️" : "Challenge a Friend ⚔️")}
            </Button>
          ) : (
            <div className="bg-white/10 p-4 rounded-xl border border-anime-primary animate-fade-in">
               <p className="text-sm text-gray-300 mb-2">{isArabic ? "شارك هذا الرابط:" : "Share this link:"}</p>
               <input readOnly aria-label="Share Link" value={challengeLink} className="w-full bg-black/50 text-white p-2 rounded text-xs mb-2 border border-white/10" />
               <Button onClick={copyToClipboard} fullWidth variant="primary" className="text-sm py-2">
                 {isArabic ? "نسخ الرابط" : "Copy Link"}
               </Button>
            </div>
          )}

          <Button onClick={onRestart} fullWidth variant="outline">
            {isArabic ? "العب مجدداً" : "Play Again"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;