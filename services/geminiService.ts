import { GoogleGenAI, Type } from "@google/genai";
import { AnimeData, QuizQuestion, QuizSettings, QuestionType, Language, AIPersona, StoryNode, Difficulty } from '../types';
import { cleanDescription } from './aniListService';
import { searchYouTubeVideo } from './youtubeService';

const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

async function generateWithFallback(ai: GoogleGenAI, params: any) {
  let lastError: any = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        ...params,
        model,
      });
      if (res && res.text) return res;
    } catch (e: any) {
      console.warn(`Model ${model} unavailable or error, trying fallback...`, e.message || e);
      lastError = e;
    }
  }
  throw lastError || new Error("All Gemini models failed to generate content.");
}

// --- Helper: Decode HTML Entities for OpenTDB ---
const decodeHtml = (html: string) => {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&rsquo;/g, "'");
};

// --- OpenTDB Integration ---
const fetchOpenTDBQuestions = async (count: number, difficulty: Difficulty): Promise<QuizQuestion[]> => {
  if (count <= 0) return [];

  // Map Difficulty to OpenTDB format
  const diffMap = {
    [Difficulty.EASY]: 'easy',
    [Difficulty.MEDIUM]: 'medium',
    [Difficulty.HARD]: 'hard',
  };
  const diffParam = diffMap[difficulty] || 'medium';

  try {
    // Category 31 is Anime & Manga
    const url = `https://opentdb.com/api.php?amount=${count}&category=31&difficulty=${diffParam}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.response_code !== 0 || !data.results) {
      console.warn("OpenTDB returned no results or error code:", data.response_code);
      return [];
    }

    return data.results.map((item: any, idx: number) => {
      // Shuffle options including correct answer
      const allOptions = [...item.incorrect_answers, item.correct_answer].sort(() => Math.random() - 0.5);
      
      // Determine type
      const qType = item.type === 'boolean' ? QuestionType.TRUE_FALSE : QuestionType.MULTIPLE_CHOICE;

      return {
        id: `otdb-${Date.now()}-${idx}`,
        text: decodeHtml(item.question),
        type: qType,
        options: allOptions.map(decodeHtml),
        correctAnswer: decodeHtml(item.correct_answer),
        explanation: "Answer provided by Open Trivia DB.", // OpenTDB doesn't provide explanations
        relatedAnimeTitle: "General Anime Trivia"
      } as QuizQuestion;
    });

  } catch (e) {
    console.warn("Failed to fetch from OpenTDB, falling back to full Gemini generation.", e);
    return [];
  }
};

const getPersonaInstruction = (persona: AIPersona, lang: Language): string => {
  const isArabic = lang === Language.ARABIC;
  
  switch (persona) {
    case AIPersona.DETECTIVE:
      return isArabic 
        ? "تقمص شخصية محقق عبقري وهادئ (مثل L أو كونان). استخدم كلمات مثل 'استنتاج'، 'تحليل'، 'المشتبه به'. اشرح الإجابة وكأنك تحل لغزاً."
        : "Act like a genius, analytical detective (like L from Death Note or Conan). Use words like 'deduction', 'probability', 'case closed'. Explain the answer as if solving a mystery.";
    case AIPersona.HERO:
      return isArabic
        ? "تقمص شخصية بطل شونين حماسي وصاخب (مثل أول مايت أو غوكو). استخدم الكثير من علامات التعجب، وتحدث عن 'العدالة'، 'القوة'، و'تجاوز الحدود'. اشرح بحماس شديد!"
        : "Act like a loud, energetic Shonen Hero (like All Might or Goku). Use caps lock for emphasis, talk about 'JUSTICE', 'POWER', and 'GOING BEYOND'. Explain with intense passion!";
    case AIPersona.TSUNDERE:
      return isArabic
        ? "تقمص شخصية 'تسونديري' (مثل أسوكا أو رين). تصرف ببرود وانزعاج في البداية، ونادِ المستخدم بـ 'باكا' (أحمق)، لكن اشرح الإجابة بشكل مفيد في النهاية لأنك 'لا تفعل ذلك من أجلهم أو شيء من هذا القبيل'."
        : "Act like a Tsundere. Be harsh and call the user 'Baka' or 'Idiot', acting like you don't care, but still explain the answer correctly because 'it's not like you did it for them'.";
    case AIPersona.VILLAIN:
      return isArabic
        ? "تقمص شخصية شرير متغطرس وقوي (مثل مادارا أو آيزن). تحدث بفوقية، ونادِ المستخدم بـ 'الضعيف' أو 'المجرد من القوة'. اشرح الإجابة وكأنها حقيقة لا يدركها إلا الأقوياء."
        : "Act like an arrogant, god-complex Villain (like Madara or Aizen). Talk down to the user, refer to them as 'weakling' or 'mortal'. Explain the answer as a truth only the strong can grasp.";
    case AIPersona.CHUUNIBYOU:
      return isArabic
        ? "تقمص شخصية 'تشونيب يو' (مثل ريكا أو ميغومين). تحدث بغموض عن 'القوى المظلمة' و'العين الشريرة'. استخدم لغة مسرحية ومبالغ فيها جداً. اشرح الإجابة وكأنها تعويذة محرمة."
        : "Act like a Chuunibyou (like Rikka Takanashi, Megumin, or Gundham Tanaka). Talk about 'Dark Forces', 'The Wicked Eye', and 'Sealed Powers'. Be overly theatrical and grandiose. Explain the answer as if revealing forbidden knowledge from the void.";
    default:
      return "";
  }
};

const getDifficultyInstruction = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case Difficulty.EASY:
      return "Focus on main protagonists, viral moments, iconic attacks (e.g., Kamehameha), and major plot summaries. Questions should be answerable by a casual viewer.";
    case Difficulty.MEDIUM:
      return "Focus on side characters, specific story arcs, ability mechanics, and character relationships. Questions require the user to have watched the series attentively.";
    case Difficulty.HARD:
      return "Focus on OBSCURE facts, DEEP lore, minor characters, specific chapter/episode details, and COMPARATIVE trivia (e.g., comparing stats, bounty amounts, or timeline events between characters). Questions must be challenging even for hardcore fans. Do NOT ask surface-level questions.";
    default:
      return "Mix of difficulties.";
  }
};

// --- Internal Gemini Generation Logic ---
const generateGeminiBatch = async (
  count: number,
  animeList: AnimeData[],
  settings: QuizSettings,
  apiKey: string
): Promise<QuizQuestion[]> => {
  if (count <= 0) return [];
  
  const ai = new GoogleGenAI({ apiKey });

  // Prepare Context
  const animeContext = animeList.map(a => ({
    title: a.title.english || a.title.romaji,
    genres: a.genres,
    characters: a.characters?.nodes?.map(c => ({ name: c.name.full, image: c.image.large })) || [],
    bannerImage: a.bannerImage,
    summary: cleanDescription(a.description || '').substring(0, 300) + '...',
  }));

  const langInstruction = settings.language === Language.ARABIC 
    ? "IMPORTANT: The output JSON content (question text, options, explanations) MUST be in ARABIC language." 
    : "The output content must be in English.";

  const personaInstruction = getPersonaInstruction(settings.aiPersona, settings.language);
  const difficultyInstruction = getDifficultyInstruction(settings.difficulty);
  
  const spoilerInstruction = settings.spoilerProtection
    ? "STRICTLY AVOID spoilers from the manga that have not been animated yet. Do not ask about character deaths or major plot twists that happen late in the series unless they are common knowledge. Focus on Season 1-2 content or general trivia."
    : "You may include questions about manga-only events if the Content Type is Manga, otherwise keep it balanced.";

  // Request a few extra to account for filtering
  const requestedCount = count + 2;

  const prompt = `
    You are an expert anime quiz master.
    Generate exactly ${requestedCount} distinct quiz questions based on the provided anime/manga data.
    
    Data Context:
    ${JSON.stringify(animeContext)}

    Rules:
    1. Difficulty: ${settings.difficulty}. INSTRUCTION: ${difficultyInstruction}
    2. Language: ${settings.language}. ${langInstruction}
    3. Generate a mix of the following Question Types. Try to include at least 1-2 visual/audio questions (${QuestionType.IMAGE_GUESS}, ${QuestionType.OP_ED_GUESS}, or ${QuestionType.VOICE_ACTOR_GUESS}) if data permits. ALSO include at least 1 ${QuestionType.EMOJI_GUESS}:
       - ${QuestionType.MULTIPLE_CHOICE}
       - ${QuestionType.TRUE_FALSE}
       - ${QuestionType.CHARACTER_GUESS} (Describe a character, user guesses name)
       - ${QuestionType.IMAGE_GUESS} (Show an image, user guesses character or anime)
       - ${QuestionType.QUOTE_GUESS} (Who said this quote?)
       - ${QuestionType.OP_ED_GUESS} (Trivia about Openings/Endings)
       - ${QuestionType.EMOJI_GUESS} (Represent an anime or character using ONLY emojis)
       - ${QuestionType.VOICE_ACTOR_GUESS} (Guess the Voice Actor from a character clip)
    
    4. **Image Guess Rules**: 
       - If you choose ${QuestionType.IMAGE_GUESS}, you MUST pick a valid URL from the provided 'characters' or 'bannerImage' data in the context.
       - Set the 'imageUrl' field to this URL.
       - If using a character image, the question should be "Who is this character?".
       - If using a banner image, the question should be "Which anime is this?" (Only use if the image doesn't obviously reveal the title).

    5. **Quote Guess Rules**:
       - If you choose ${QuestionType.QUOTE_GUESS}, use your internal knowledge to select a famous or memorable quote from the specific anime/manga in the context.
       - The Question Text must be formatted as: "Who said this quote? \"[Insert Quote Here]\""
       - Ensure the correct answer is the name of the character who said it.
       
    6. **Opening/Ending Guess Rules**:
       - If you choose ${QuestionType.OP_ED_GUESS}, you MUST provide a 'mediaQuery' field string.
       - The 'mediaQuery' should be a YouTube search string like "Attack on Titan Opening 1" or "Unravel Tokyo Ghoul Opening".
       - The question text can be: "Which anime features this opening song?", "Who is the artist of this ending?", or "What specific object appears at the end of this sequence?".

    7. **Voice Actor Guess Rules**:
       - If you choose ${QuestionType.VOICE_ACTOR_GUESS}, you MUST provide a 'mediaQuery' field string.
       - The 'mediaQuery' should be a YouTube search string for a character voice compilation or specific iconic scene (e.g., "Naruto Dattebayo voice clip" or "Jotaro Ora Ora").
       - The question text should be: "Who is the Voice Actor (Seiyuu) for this character?" or "Which character is speaking?".

    8. **Emoji Guess Rules**:
       - If you choose ${QuestionType.EMOJI_GUESS}, you MUST provide a string of 3 to 6 emojis in the 'emojiClue' field.
       - The emojis must abstractly represent the plot, power system, or main character of the anime (e.g., 🏴‍☠️👒🍖 for One Piece).
       - The question text should be "Guess the anime from these emojis".
    
    9. **AI Persona & Explanation**:
       - ${personaInstruction}
       - The 'explanation' field MUST be written in this persona's voice.
    
    9. **Spoiler Guard**:
       - ${spoilerInstruction}
    
    10. **General Rules**:
       - Ensure questions are factually accurate.
       - Do NOT reproduce large chunks of copyrighted text.
       - The output MUST be a valid JSON array.
       - For True/False questions, provide only 2 options.
       - Ensure the 'correctAnswer' matches exactly one of the 'options'.
  `;

  try {
    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              type: { type: Type.STRING, enum: [
                QuestionType.MULTIPLE_CHOICE, 
                QuestionType.TRUE_FALSE, 
                QuestionType.CHARACTER_GUESS,
                QuestionType.IMAGE_GUESS,
                QuestionType.QUOTE_GUESS,
                QuestionType.OP_ED_GUESS,
                QuestionType.EMOJI_GUESS,
                QuestionType.VOICE_ACTOR_GUESS
              ]},
              options: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              relatedAnimeTitle: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              mediaQuery: { type: Type.STRING },
              emojiClue: { type: Type.STRING }
            },
            required: ["id", "text", "type", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonText);
    const rawQuestions = Array.isArray(parsed) ? parsed : [];
    
    // Post-processing: Fetch YouTube Videos and Filter Invalid Media
    const processedQuestions = await Promise.all(rawQuestions.map(async (q: any) => {
        // Handle Video Questions (OP/ED or Voice Actor)
        if (q.type === QuestionType.OP_ED_GUESS || q.type === QuestionType.VOICE_ACTOR_GUESS) {
            if (q.mediaQuery) {
                const videoId = await searchYouTubeVideo(q.mediaQuery);
                if (videoId) {
                    return { ...q, videoId };
                }
            }
            // If video could not be fetched (API quota or error), convert gracefully to Multiple Choice trivia
            return {
                ...q,
                type: QuestionType.MULTIPLE_CHOICE,
            };
        }
        
        // Handle Image Questions
        if (q.type === QuestionType.IMAGE_GUESS) {
           if (!q.imageUrl) {
               // Convert to multiple choice instead of dropping
               return {
                   ...q,
                   type: QuestionType.MULTIPLE_CHOICE,
               };
           }
           return q;
        }

        return q;
    }));
    
    return processedQuestions.filter((q): q is QuizQuestion => q !== null);

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return []; // Return empty so logic can fallback or just use what we have
  }
};

export const generateQuizQuestions = async (
  animeList: AnimeData[],
  settings: QuizSettings,
  customApiKey?: string
): Promise<QuizQuestion[]> => {
  
  const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  const targetTotal = settings.questionCount;
  let geminiQuestions: QuizQuestion[] = [];
  let openTdbQuestions: QuizQuestion[] = [];

  // Determine split strategy
  // OpenTDB only supports English. If Arabic, use 100% Gemini.
  const useOpenTDB = settings.language === Language.ENGLISH;
  
  if (useOpenTDB) {
      // Aim for 50/50 split
      const openTdbCount = Math.floor(targetTotal / 2);
      const geminiCount = targetTotal - openTdbCount;

      console.log(`Fetching: ${openTdbCount} from OpenTDB, ${geminiCount} from Gemini`);

      // Execute in parallel
      const [otdbRes, geminiRes] = await Promise.all([
          fetchOpenTDBQuestions(openTdbCount, settings.difficulty),
          generateGeminiBatch(geminiCount, animeList, settings, apiKey)
      ]);

      openTdbQuestions = otdbRes;
      geminiQuestions = geminiRes;

      // If OpenTDB failed completely, fill gap with Gemini? 
      // For now, if OpenTDB fails, we just rely on whatever Gemini returned. 
      // If that's too few, we could trigger another Gemini call, 
      // but for simplicity and speed, we will just proceed with what we have 
      // or try to fetch more Gemini if OpenTDB returned 0.
      if (openTdbQuestions.length === 0 && geminiCount < targetTotal) {
          const remainder = targetTotal - geminiQuestions.length;
          if (remainder > 0) {
              const extraGemini = await generateGeminiBatch(remainder, animeList, settings, apiKey);
              geminiQuestions = [...geminiQuestions, ...extraGemini];
          }
      }

  } else {
      // 100% Gemini (Arabic or other constraint)
      geminiQuestions = await generateGeminiBatch(targetTotal, animeList, settings, apiKey);
  }

  // Combine
  let combined = [...openTdbQuestions, ...geminiQuestions];
  
  // Shuffle the final mix
  combined.sort(() => Math.random() - 0.5);

  // Ensure we don't exceed requested count (though unlikely to hurt)
  return combined.slice(0, targetTotal);
};

// --- Story Mode ---

export const generateStoryNode = async (
  genre: string,
  previousText: string = "",
  previousChoice: string = "",
  lang: Language = Language.ENGLISH
): Promise<StoryNode> => {
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    const ai = new GoogleGenAI({ apiKey });

    const isArabic = lang === Language.ARABIC;
    
    const systemInstruction = isArabic 
      ? `أنت راوي قصص تفاعلية (RPG Master) في عالم الأنمي. تصنيفك هو: ${genre}. اكتب فقرة قصيرة (50 كلمة) تصف الموقف الحالي، ثم قدم 3 خيارات للاعب.`
      : `You are an Interactive Fiction (RPG) Master set in an Anime world. Genre: ${genre}. Write a short paragraph (50 words) describing the current situation, then provide 3 options for the player.`;

    const prompt = `
      Previous Context: ${previousText}
      Player Chose: ${previousChoice}
      
      If this is the start, introduce the player as the protagonist (Isekai or Shonen style).
      If the player chose something, continue the story based on that choice.
      
      Generate a JSON response.
      'backgroundPrompt' should be a descriptive prompt to generate or find an image for the scene (e.g., "Cyberpunk city street at night, neon lights, anime style").
    `;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             text: { type: Type.STRING },
             options: { type: Type.ARRAY, items: { type: Type.STRING } },
             backgroundPrompt: { type: Type.STRING }
          },
          required: ["text", "options"]
        }
      }
    });
    
    const data = JSON.parse(response.text || '{}');
    return data as StoryNode;
};

// --- Chat Mode ---

export const createChatSession = (characterName: string, trait: string) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  const ai = new GoogleGenAI({ apiKey });
  
  const systemInstruction = `You are roleplaying as ${characterName} from anime. 
  Trait: ${trait}.
  Keep responses short (under 50 words). 
  Stay in character completely. Do not assist with non-anime tasks.
  If the user says something weird, react as the character would.`;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: { systemInstruction }
  });
};