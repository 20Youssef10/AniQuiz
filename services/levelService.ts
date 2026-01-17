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

const XP_STORAGE_KEY = 'aniquiz_user_xp';

export const getUserStats = (lang: 'English' | 'Arabic' = 'English'): UserStats => {
  const storedXp = localStorage.getItem(XP_STORAGE_KEY);
  const xp = storedXp ? parseInt(storedXp, 10) : 0;

  // Find Rank
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i].xp) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || { xp: xp * 2, title: "Max Level", titleAr: "مستوى أقصى" };
    }
  }

  const title = lang === 'Arabic' ? currentRank.titleAr : currentRank.title;
  
  // Simple level formula derived from total XP (e.g., sqrt curve or just brackets)
  // Let's just use a calculated level based on 100xp increments roughly
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