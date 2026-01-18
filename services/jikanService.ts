
// Service to interact with Jikan API (MyAnimeList)
// Used primarily as a fallback for missing images

export const fetchMalCharacterImage = async (characterName: string): Promise<string | null> => {
  try {
    // Search for the character by name
    const response = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(characterName)}&limit=1`);
    
    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      // Return the main JPG image URL
      return data.data[0].images?.jpg?.image_url || null;
    }
    
    return null;
  } catch (e) {
    console.warn("Jikan API Fallback Error:", e);
    return null;
  }
};
