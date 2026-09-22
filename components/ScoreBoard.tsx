import React, { useState, useEffect } from 'react';
import { QuizState, MatchRecord } from '../types';
import Button from './Button';
import { createChallenge } from '../services/firebase';
import { addXp, getUserStats } from '../services/levelService';
import { Crown, Swords, Copy } from 'lucide-react';
import { t } from '../services/i18n';

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
      alert(t('linkCopied', state.settings.language));
    }
  };

  const totalQuestions = state.questions.length || 1;
  const percentage = Math.round((state.score / totalQuestions) * 100);
  const lang = state.settings.language;
  
  let message = t('keepWatching', lang);
  let showCrown = false;
  if (percentage >= 80) {
    message = t('otakuKing', lang);
    showCrown = true;
  } else if (percentage >= 50) {
    message = t('casualFan', lang);
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 animate-fade-in">
      <div className="glass-panel p-8 md:p-12 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden">
        
        {/* Rank Badge at top right */}
        <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
           {localStats.title}
        </div>

        <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <span>{message}</span>
          {showCrown && <Crown className="w-7 h-7 text-yellow-400 inline animate-bounce" />}
        </h2>
        <p className="text-gray-400 mb-8">{t('quizCompleted', lang)}</p>

        <div
          className="mb-6 relative"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Score Progress"
        >
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 36 36" aria-hidden="true">
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
           <div className="text-sm text-gray-400 uppercase tracking-widest mb-1">{t('xpGained', lang)}</div>
           <div className="text-3xl font-extrabold text-green-400 drop-shadow-md">+{earnedXp} XP</div>
        </div>

        <div className="space-y-4">
          {!challengeLink ? (
            <Button onClick={handleCreateChallenge} disabled={isGeneratingLink} fullWidth variant="secondary" className="flex items-center justify-center gap-2">
               {isGeneratingLink ? (
                 <span>{t('creating', lang)}</span>
               ) : (
                 <>
                   <Swords className="w-4 h-4" />
                   <span>{t('challengeFriend', lang)}</span>
                 </>
               )}
            </Button>
          ) : (
            <div className="bg-white/10 p-4 rounded-xl border border-anime-primary animate-fade-in">
               <p className="text-sm text-gray-300 mb-2">{t('shareLink', lang)}</p>
               <input readOnly aria-label="Share Link" value={challengeLink} className="w-full bg-black/50 text-white p-2 rounded text-xs mb-2 border border-white/10" />
               <Button onClick={copyToClipboard} fullWidth variant="primary" className="text-sm py-2 flex items-center justify-center gap-1.5">
                 <Copy className="w-3.5 h-3.5" />
                 <span>{t('copyLink', lang)}</span>
               </Button>
            </div>
          )}

          <Button onClick={onRestart} fullWidth variant="outline">
            {t('playAgain', lang)}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScoreBoard;