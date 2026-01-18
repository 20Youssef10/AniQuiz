import { GoogleGenAI, Type } from "@google/genai";
import { AnimeData, QuizQuestion, QuizSettings, QuestionType, Language, AIPersona, StoryNode } from '../types';
import { cleanDescription } from './aniListService';
import { searchYouTubeVideo } from './youtubeService';

const MODEL_NAME = 'gemini-2.5-flash';

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
    default:
      return "";
  }
};

export const generateQuizQuestions = async (
  animeList: AnimeData[],
  settings: QuizSettings,
  customApiKey?: string
): Promise<QuizQuestion[]> => {
  
  const apiKey = customApiKey || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide a valid Gemini API Key.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare Context
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
  
  const spoilerInstruction = settings.spoilerProtection
    ? "STRICTLY AVOID spoilers from the manga that have not been animated yet. Do not ask about character deaths or major plot twists that happen late in the series unless they are common knowledge. Focus on Season 1-2 content or general trivia."
    : "You may include questions about manga-only events if the Content Type is Manga, otherwise keep it balanced.";

  // Request extra questions (buffer) to allow filtering out invalid media questions without falling short
  const requestedCount = settings.questionCount + 3;

  const prompt = `
    You are an expert anime quiz master.
    Generate exactly ${requestedCount} distinct quiz questions based on the provided anime/manga data.
    
    Data Context:
    ${JSON.stringify(animeContext)}

    Rules:
    1. Difficulty: ${settings.difficulty}.
    2. Language: ${settings.language}. ${langInstruction}
    3. Generate a mix of the following Question Types. Try to include at least 1-2 visual/audio questions (${QuestionType.IMAGE_GUESS} or ${QuestionType.OP_ED_GUESS}) if data permits. ALSO include at least 1 ${QuestionType.EMOJI_GUESS}:
       - ${QuestionType.MULTIPLE_CHOICE}
       - ${QuestionType.TRUE_FALSE}
       - ${QuestionType.CHARACTER_GUESS} (Describe a character, user guesses name)
       - ${QuestionType.IMAGE_GUESS} (Show an image, user guesses character or anime)
       - ${QuestionType.QUOTE_GUESS} (Who said this quote?)
       - ${QuestionType.OP_ED_GUESS} (Trivia about Openings/Endings)
       - ${QuestionType.EMOJI_GUESS} (Represent an anime or character using ONLY emojis)
    
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
       
    7. **Emoji Guess Rules**:
       - If you choose ${QuestionType.EMOJI_GUESS}, you MUST provide a string of 3 to 6 emojis in the 'emojiClue' field.
       - The emojis must abstractly represent the plot, power system, or main character of the anime (e.g., 🏴‍☠️👒🍖 for One Piece).
       - The question text should be "Guess the anime from these emojis".
    
    8. **AI Persona & Explanation**:
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
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
                QuestionType.EMOJI_GUESS
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
        // Handle Video Questions
        if (q.type === QuestionType.OP_ED_GUESS) {
            if (!q.mediaQuery) return null;
            const videoId = await searchYouTubeVideo(q.mediaQuery);
            if (!videoId) return null; // Filter out if video not found (API quota or error)
            return { ...q, videoId };
        }
        
        // Handle Image Questions
        if (q.type === QuestionType.IMAGE_GUESS) {
           if (!q.imageUrl) return null; // Filter out if no image URL
           return q;
        }

        return q;
    }));
    
    // Remove nulls (failed media questions)
    const validQuestions = processedQuestions.filter(q => q !== null);
    
    // Return requested amount
    return validQuestions.slice(0, settings.questionCount);

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    const message = error.message || "Unknown API Error";
    throw new Error(`AI Gen Error: ${message}.`);
  }
};

// --- Story Mode ---

export const generateStoryNode = async (
  genre: string,
  previousText: string = "",
  previousChoice: string = "",
  lang: Language = Language.ENGLISH
): Promise<StoryNode> => {
    
    const apiKey = process.env.API_KEY;
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

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
