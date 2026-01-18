
export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  CHARACTER_GUESS = 'character_guess', // Text-based
  IMAGE_GUESS = 'image_guess', // Visual
  QUOTE_GUESS = 'quote_guess',
  OP_ED_GUESS = 'op_ed_guess',
  EMOJI_GUESS = 'emoji_guess', // New Type
}

export enum GameMode {
  CLASSIC = 'Classic',
  SURVIVAL = 'Survival',
  TIME_ATTACK = 'Time Attack',
  STORY = 'Story Mode', // New
}

export enum Language {
  ENGLISH = 'English',
  ARABIC = 'Arabic',
}

export enum ContentType {
  ANIME = 'Anime',
  MANGA = 'Manga',
  MANHWA = 'Manhwa',
  SPECIFIC = 'Specific Title',
}

export enum AIPersona {
  DEFAULT = 'Default',
  DETECTIVE = 'Detective', // L / Conan style
  HERO = 'Hero', // All Might / Goku style
  TSUNDERE = 'Tsundere', // Asuka / Rin style
  VILLAIN = 'Villain', // Madara / Aizen style
}

export interface AnimeCharacter {
  id: number;
  name: {
    full: string;
  };
  image: {
    large: string;
  };
  siteUrl?: string;
}

export interface AnimeData {
  id: number;
  title: {
    romaji: string;
    english: string;
    native: string;
  };
  description: string;
  genres: string[];
  averageScore: number;
  characters?: {
    nodes: AnimeCharacter[];
  };
  coverImage: {
    large: string;
  };
  bannerImage?: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  relatedAnimeTitle?: string;
  imageUrl?: string; // Optional image for the question
  mediaQuery?: string; // Search query for YouTube
  videoId?: string; // YouTube Video ID
  emojiClue?: string; // String containing emojis
}

export interface QuizSettings {
  difficulty: Difficulty;
  questionCount: number;
  topic?: string; // e.g., "Action", "Romance"
  language: Language;
  contentType: ContentType;
  searchQuery?: string; // For specific title search
  gameMode: GameMode;
  aiPersona: AIPersona;
  spoilerProtection: boolean;
}

export interface QuizState {
  status: 'idle' | 'loading' | 'playing' | 'completed' | 'error';
  questions: QuizQuestion[];
  currentIndex: number;
  score: number;
  settings: QuizSettings;
  error?: string;
  answers: Record<number, string>; // Index -> Selected Answer
  timeLeft?: number; // For Time Attack
  themeImage?: string; // Background image URL for dynamic theming
}

// Multiplayer Types
export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
}

export interface Room {
  id: string;
  code: string; // Short code for joining
  hostId: string;
  status: 'waiting' | 'playing' | 'completed';
  settings: QuizSettings;
  players: Player[];
  questions?: QuizQuestion[];
  createdAt: number;
}

// User Profile & Achievements
export interface MatchRecord {
  date: number;
  score: number;
  totalQuestions: number;
  mode: GameMode;
  difficulty: Difficulty;
  xpEarned: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number; // Timestamp if unlocked
}

export interface GachaCard {
  id: number;
  name: string;
  image: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  obtainedAt: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  xp: number;
  level: number;
  title: string;
  gamesPlayed: number;
  achievements: string[]; // List of Achievement IDs
  matchHistory: MatchRecord[];
  inventory: GachaCard[];
  lastGachaDate?: number; // Timestamp
}

// Story Mode Type
export interface StoryNode {
  text: string;
  options: string[];
  backgroundPrompt?: string; // Suggestion for background
  backgroundImage?: string; // Filled by client
}
