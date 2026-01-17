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
}

export enum GameMode {
  CLASSIC = 'Classic',
  SURVIVAL = 'Survival',
  TIME_ATTACK = 'Time Attack',
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
  name: {
    full: string;
  };
  image: {
    large: string;
  };
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