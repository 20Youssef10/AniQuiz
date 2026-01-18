import { AnimeData, ContentType, AnimeCharacter, QuizSettings } from '../types';

const ANILIST_API_URL = 'https://graphql.anilist.co';

// Robust fallback data with real character images (using MyAnimeList CDN for stability)
const FALLBACK_CHARS: AnimeCharacter[] = [
  { id: 1, name: { full: 'Monkey D. Luffy' }, image: { large: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg' } },
  { id: 2, name: { full: 'Naruto Uzumaki' }, image: { large: 'https://cdn.myanimelist.net/images/characters/9/131317.jpg' } },
  { id: 3, name: { full: 'Son Goku' }, image: { large: 'https://cdn.myanimelist.net/images/characters/6/277964.jpg' } },
  { id: 4, name: { full: 'L Lawliet' }, image: { large: 'https://cdn.myanimelist.net/images/characters/10/246479.jpg' } },
  { id: 5, name: { full: 'Levi Ackerman' }, image: { large: 'https://cdn.myanimelist.net/images/characters/2/241413.jpg' } },
  { id: 6, name: { full: 'Ichigo Kurosaki' }, image: { large: 'https://cdn.myanimelist.net/images/characters/2/255555.jpg' } },
  { id: 7, name: { full: 'Roronoa Zoro' }, image: { large: 'https://cdn.myanimelist.net/images/characters/3/100534.jpg' } },
  { id: 8, name: { full: 'Tanjiro Kamado' }, image: { large: 'https://cdn.myanimelist.net/images/characters/8/382094.jpg' } },
  { id: 9, name: { full: 'Saitama' }, image: { large: 'https://cdn.myanimelist.net/images/characters/11/294388.jpg' } },
  { id: 10, name: { full: 'Satoru Gojo' }, image: { large: 'https://cdn.myanimelist.net/images/characters/16/413000.jpg' } },
  { id: 11, name: { full: 'Killua Zoldyck' }, image: { large: 'https://cdn.myanimelist.net/images/characters/2/327426.jpg' } },
  { id: 12, name: { full: 'Itachi Uchiha' }, image: { large: 'https://cdn.myanimelist.net/images/characters/3/131319.jpg' } },
];

const getFallbackCharacters = (count: number): AnimeCharacter[] => {
  // Shuffle and slice
  const shuffled = [...FALLBACK_CHARS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

export const fetchMediaData = async (settings: QuizSettings): Promise<AnimeData[]> => {
  const isSpecific = settings.contentType === ContentType.SPECIFIC;
  
  // 1. Build Query Variables and Arguments dynamically
  const variables: Record<string, any> = {
    page: 1,
    perPage: isSpecific ? 1 : 10,
  };

  const variableDefinitions: string[] = [
    '$page: Int', 
    '$perPage: Int'
  ];
  
  const mediaArguments: string[] = [
    'sort: POPULARITY_DESC', 
    'isAdult: false'
  ];

  // --- Type Handling ---
  let typeStr = 'ANIME';
  if (settings.contentType === ContentType.MANGA || settings.contentType === ContentType.MANHWA) {
    typeStr = 'MANGA';
  }
  
  variables.type = typeStr;
  variableDefinitions.push('$type: MediaType');
  mediaArguments.push('type: $type');

  // --- Country Handling ---
  if (settings.contentType === ContentType.MANHWA) {
    variables.country = 'KR';
    variableDefinitions.push('$country: CountryCode'); // Fixed type here
    mediaArguments.push('countryOfOrigin: $country');
  }

  // --- Genre Handling ---
  if (!isSpecific && settings.topic && settings.topic !== 'All') {
    variables.genre = settings.topic;
    variableDefinitions.push('$genre: String');
    mediaArguments.push('genre: $genre');
  }

  // --- Search Handling ---
  if (isSpecific && settings.searchQuery) {
    variables.search = settings.searchQuery;
    variableDefinitions.push('$search: String');
    mediaArguments.push('search: $search');
  }

  // 2. Construct Query String
  const query = `
    query (${variableDefinitions.join(', ')}) {
      Page (page: $page, perPage: $perPage) {
        media (
          ${mediaArguments.join(',\n          ')}
        ) {
          id
          title {
            romaji
            english
            native
          }
          description
          genres
          averageScore
          bannerImage
          coverImage {
            large
          }
          characters(sort: ROLE, perPage: 10) {
            nodes {
              name {
                full
              }
              image {
                large
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      console.warn(`AniList Media Fetch Error: ${response.status}`);
      throw new Error(`AniList API Error`);
    }

    const data = await response.json();
    const media = data?.data?.Page?.media;
    
    if (!media || media.length === 0) {
      throw new Error('No content found matching these settings.');
    }

    return media;
  } catch (error) {
    console.error('Error fetching data from AniList:', error);
    throw error;
  }
};

export const fetchTopCharacters = async (page: number = 1, perPage: number = 50): Promise<AnimeCharacter[]> => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
          nodes {
            id
            name {
              full
            }
            image {
              large
            }
            siteUrl
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { page, perPage },
      }),
    });

    if (!response.ok) {
        console.warn(`AniList API returned ${response.status}. Using fallback data.`);
        return getFallbackCharacters(perPage);
    }

    const data = await response.json();
    const nodes = data?.data?.Page?.characters?.nodes;
    
    if (nodes && nodes.length > 0) return nodes;
    
    console.warn("AniList returned empty characters list. Using fallback data.");
    return getFallbackCharacters(perPage);

  } catch (e) {
    console.warn("Network/API error when fetching characters. Using fallback data.");
    return getFallbackCharacters(perPage);
  }
};

export const cleanDescription = (desc: string): string => {
  return desc ? desc.replace(/<br>/g, '\n').replace(/<i>/g, '').replace(/<\/i>/g, '') : '';
};
