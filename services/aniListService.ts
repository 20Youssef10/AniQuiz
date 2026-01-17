import { AnimeData, ContentType, QuizSettings } from '../types';

const ANILIST_API_URL = 'https://graphql.anilist.co';

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
      const errorText = await response.text();
      console.error('AniList Error Response:', errorText);
      
      // Try to parse JSON error to be more helpful
      try {
          const errorJson = JSON.parse(errorText);
          const msg = errorJson.errors?.map((e: any) => e.message).join(', ') || 'Unknown API Error';
          throw new Error(`AniList API Error: ${msg}`);
      } catch (e) {
          if (e instanceof Error && e.message.startsWith('AniList API Error')) throw e;
          throw new Error(`Network Error: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    const media = data.data.Page.media;
    
    if (!media || media.length === 0) {
      throw new Error('No content found matching these settings.');
    }

    return media;
  } catch (error) {
    console.error('Error fetching data from AniList:', error);
    throw error;
  }
};

export const cleanDescription = (desc: string): string => {
  return desc ? desc.replace(/<br>/g, '\n').replace(/<i>/g, '').replace(/<\/i>/g, '') : '';
};