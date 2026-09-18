import { Achievement, UserProfile } from "../types";

export interface UserStats {
  xp: number;
  level: number;
  title: string;
  nextLevelXp: number;
}

const RANKS = [
  { xp: 0, title: "Civilian", titleAr: "مواطن" },
  { xp: 100, title: "Academy Student", titleAr: "طالب أكاديمية" },
  { xp: 500, title: "Genin", titleAr: "جينين" },
  { xp: 1500, title: "Chunin", titleAr: "تشونين" },
  { xp: 3000, title: "Jonin", titleAr: "جونين" },
  { xp: 6000, title: "Anbu Captain", titleAr: "قائد أنبو" },
  { xp: 10000, title: "Sannin", titleAr: "سانين" },
  { xp: 15000, title: "Kage", titleAr: "كاغي" },
  { xp: 25000, title: "Yonko", titleAr: "يونكو" },
  { xp: 50000, title: "Pirate King", titleAr: "ملك القراصنة" },
  { xp: 100000, title: "Anime God", titleAr: "حاكم الأنمي" },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Play your first game.', icon: 'swords' },
  { id: 'sharpshooter', title: 'Sharpshooter', description: 'Get 100% correct in a game.', icon: 'target' },
  { id: 'survivor', title: 'Survivor', description: 'Score 10+ in Survival Mode.', icon: 'shield' },
  { id: 'speedster', title: 'Speedster', description: 'Score 10+ in Time Attack Mode.', icon: 'zap' },
  { id: 'otaku', title: 'True Otaku', description: 'Reach Level 10.', icon: 'glasses' },
  { id: 'veteran', title: 'Veteran', description: 'Play 50 games.', icon: 'award' },
];

const XP_STORAGE_KEY = 'aniquiz_user_xp';

// Used for Guest/Local storage fallback
export const getUserStats = (lang: 'English' | 'Arabic' = 'English'): UserStats => {
  const storedXp = localStorage.getItem(XP_STORAGE_KEY);
  const xp = storedXp ? parseInt(storedXp, 10) : 0;

  return calculateStatsFromXp(xp, lang);
};

export const calculateStatsFromXp = (xp: number, lang: 'English' | 'Arabic' = 'English'): UserStats => {
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || { xp: xp * 2, title: "Max Level", titleAr: "مستوى أقصى" };
    }
  }

  const title = lang === 'Arabic' ? currentRank.titleAr : currentRank.title;
  // Level = sqrt(xp) approximation
  const level = Math.floor(Math.sqrt(xp));

  return {
    xp,
    level,
    title,
    nextLevelXp: nextRank.xp
  };
};

export const addXp = (amount: number): UserStats => {
  const currentStats = getUserStats();
  const newXp = currentStats.xp + amount;
  localStorage.setItem(XP_STORAGE_KEY, newXp.toString());
  return getUserStats();
};

export const checkNewAchievements = (
  profile: UserProfile | null, 
  currentScore: number, 
  totalQuestions: number,
  mode: string
): string[] => {
  if (!profile) return [];
  
  const unlockedIds = new Set(profile.achievements);
  const newUnlocks: string[] = [];

  // Check: First Blood
  if (!unlockedIds.has('first_blood')) {
    newUnlocks.push('first_blood');
  }

  // Check: Sharpshooter
  if (!unlockedIds.has('sharpshooter') && currentScore === totalQuestions && totalQuestions >= 5) {
    newUnlocks.push('sharpshooter');
  }

  // Check: Survivor
  if (!unlockedIds.has('survivor') && mode === 'Survival' && currentScore >= 10) {
    newUnlocks.push('survivor');
  }

  // Check: Speedster
  if (!unlockedIds.has('speedster') && mode === 'Time Attack' && currentScore >= 10) {
    newUnlocks.push('speedster');
  }

  // Check: Otaku (Level 10 approx 100xp) - Let's say level 10 = 100 XP for simplicity in math above, 
  // actually sqrt(100) = 10. So XP needed is 100.
  if (!unlockedIds.has('otaku') && profile.level >= 10) {
    newUnlocks.push('otaku');
  }

  // Check: Veteran
  if (!unlockedIds.has('veteran') && profile.gamesPlayed >= 49) { // 49 + this one
    newUnlocks.push('veteran');
  }

  return newUnlocks;
};