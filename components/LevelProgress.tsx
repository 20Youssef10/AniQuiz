import React from 'react';
import { getUserStats } from '../services/levelService';
import { Language } from '../types';

interface LevelProgressProps {
  language: Language;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ language }) => {
  const stats = getUserStats(language);
  
  // Calculate progress to next rank
  // Needs to be relative to the current bracket. 
  // Simplified: Just showing raw progress might be confusing if gaps are large.
  // Let's use percentage relative to nextLevelXp from 0? No, from current rank base.
  
  // Re-fetch ranks logic slightly to get prev rank for progress bar math
  const RANKS_XP = [0, 100, 500, 1500, 3000, 6000, 10000, 15000, 25000, 50000, 100000];
  let prevXp = 0;
  for(let x of RANKS_XP) {
      if (stats.xp >= x) prevXp = x;
  }
  
  const totalInBracket = stats.nextLevelXp - prevXp;
  const currentInBracket = stats.xp - prevXp;
  const percentage = Math.min(100, Math.max(0, (currentInBracket / totalInBracket) * 100));

  const isArabic = language === Language.ARABIC;

  return (
    <div className="w-full max-w-md mx-auto mb-8 animate-fade-in-up">
      <div className="flex justify-between items-end mb-2 px-1">
        <div className="flex flex-col">
           <span className="text-xs text-gray-400 uppercase tracking-widest">{isArabic ? 'الرتبة الحالية' : 'Current Rank'}</span>
           <span className="text-xl font-bold text-anime-secondary">{stats.title}</span>
        </div>
        <div className="flex flex-col items-end">
           <span className="text-xs text-gray-500">LVL {stats.level}</span>
           <span className="text-sm font-mono text-anime-primary">{stats.xp} <span className="text-gray-500">/ {stats.nextLevelXp} XP</span></span>
        </div>
      </div>
      
      <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
        <div 
          className="h-full bg-gradient-to-r from-anime-primary to-anime-accent shadow-[0_0_10px_rgba(99,102,241,0.5)]"
          style={{ width: `${percentage}%`, transition: 'width 1s ease-out' }}
        ></div>
      </div>
    </div>
  );
};

export default LevelProgress;