import { AnimeData, ContentType, AnimeCharacter, QuizSettings } from '../types';

const ANILIST_API_URL = 'https://graphql.anilist.co';

const FALLBACK_ANIME_DATA: AnimeData[] = [
  {
    id: 21,
    title: { english: 'One Piece', romaji: 'One Piece', native: 'ONE PIECE' },
    description: 'Gol D. Roger was known as the "Pirate King", the strongest and most infamous being to have sailed the Grand Line. Monkey D. Luffy sets out to find the legendary treasure One Piece.',
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    averageScore: 88,
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJ2Zqd.jpg',
    coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-Y2nuhPnuH59B.jpg' },
    characters: {
      nodes: [
        { id: 1, name: { full: 'Monkey D. Luffy' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-q0Wea65t838s.png' } },
        { id: 7, name: { full: 'Roronoa Zoro' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-H6h51336d15D.png' } },
        { id: 13, name: { full: 'Nami' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b724-4f8Nl7cRzP9h.png' } },
        { id: 14, name: { full: 'Sanji' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b305-jXyL8k8p4k5g.png' } },
      ]
    }
  },
  {
    id: 16498,
    title: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin', native: '進撃の巨人' },
    description: 'Centuries ago, mankind was slaughtered to near extinction by monstrous humanoid creatures called Titans. Eren Yeager vows to cleanse the earth of the giant Titans.',
    genres: ['Action', 'Fantasy', 'Mystery', 'Drama'],
    averageScore: 86,
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
    coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-buLd7z9iXqXW.jpg' },
    characters: {
      nodes: [
        { id: 5, name: { full: 'Levi Ackerman' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-p5F1v2Q0W1kC.png' } },
        { id: 15, name: { full: 'Eren Yeager' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-sQ5u2o5T0z4m.png' } },
        { id: 16, name: { full: 'Mikasa Ackerman' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-8J7YtM1o0c8W.png' } },
      ]
    }
  },
  {
    id: 20,
    title: { english: 'Naruto', romaji: 'Naruto', native: 'NARUTO -ナルト-' },
    description: 'Moments prior to Naruto Uzumaki’s birth, a huge demon known as the Kyuubi, the Nine-Tailed Fox, attacked Konohagakure. Naruto dreams of becoming Hokage.',
    genres: ['Action', 'Adventure', 'Fantasy'],
    averageScore: 80,
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD1ng.jpg',
    coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx20-YJvLbgHtyd0n.jpg' },
    characters: {
      nodes: [
        { id: 2, name: { full: 'Naruto Uzumaki' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-aX50nIPtQ510.png' } },
        { id: 17, name: { full: 'Sasuke Uchiha' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b13-Q7W6Zp8u4o8R.png' } },
        { id: 18, name: { full: 'Kakashi Hatake' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b85-gD5Y5j7P9z8m.png' } },
      ]
    }
  },
  {
    id: 113415,
    title: { english: 'Jujutsu Kaisen', romaji: 'Jujutsu Kaisen', native: '呪術廻戦' },
    description: 'Idly indulging in paranormal activities with the Occult Club, high schooler Yuuji Itadori spends his days either at the clubroom or his bedridden grandfather’s hospital room.',
    genres: ['Action', 'Fantasy', 'Supernatural'],
    averageScore: 87,
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
    coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4pEFseh.jpg' },
    characters: {
      nodes: [
        { id: 10, name: { full: 'Satoru Gojo' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b127271-O8280326.png' } },
        { id: 19, name: { full: 'Yuji Itadori' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b127272-iHqGg7UuV8X8.png' } },
        { id: 20, name: { full: 'Megumi Fushiguro' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b127273-0w3qC5xM4c5N.png' } },
      ]
    }
  },
  {
    id: 101922,
    title: { english: 'Demon Slayer: Kimetsu no Yaiba', romaji: 'Kimetsu no Yaiba', native: '鬼滅の刃' },
    description: 'It is the Taisho Period in Japan. Tanjiro, a kindhearted boy who sells charcoal for a living, finds his family slaughtered by a demon.',
    genres: ['Action', 'Fantasy', 'Historical', 'Supernatural'],
    averageScore: 85,
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhhrXBj5th.jpg',
    coverImage: { large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-PEn1CTDYxTr2.jpg' },
    characters: {
      nodes: [
        { id: 8, name: { full: 'Tanjiro Kamado' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-hu01362d16.png' } },
        { id: 21, name: { full: 'Nezuko Kamado' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b126072-kL5mZ8a9X0wR.png' } },
        { id: 22, name: { full: 'Zenitsu Agatsuma' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b126073-nN7wQ9yU5m0T.png' } },
      ]
    }
  }
];

const getFallbackAnimeData = (settings: QuizSettings): AnimeData[] => {
  if (settings.searchQuery) {
    const q = settings.searchQuery.toLowerCase();
    const matched = FALLBACK_ANIME_DATA.filter(a => 
      a.title.english.toLowerCase().includes(q) || 
      a.title.romaji.toLowerCase().includes(q)
    );
    if (matched.length > 0) return matched;
  }

  if (settings.topic && settings.topic !== 'All') {
    const matched = FALLBACK_ANIME_DATA.filter(a => a.genres.includes(settings.topic!));
    if (matched.length > 0) return matched;
  }

  return FALLBACK_ANIME_DATA;
};

// Robust fallback data with real character images (Using AniList CDN to avoid hotlink blocks from MAL)
const FALLBACK_CHARS: AnimeCharacter[] = [
  { id: 1, name: { full: 'Monkey D. Luffy' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-q0Wea65t838s.png' } },
  { id: 2, name: { full: 'Naruto Uzumaki' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-aX50nIPtQ510.png' } },
  { id: 3, name: { full: 'Son Goku' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b246-t90e1t2R5p3N.png' } },
  { id: 4, name: { full: 'L Lawliet' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-4m9u20d3Lh5F.png' } },
  { id: 5, name: { full: 'Levi Ackerman' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-p5F1v2Q0W1kC.png' } },
  { id: 6, name: { full: 'Ichigo Kurosaki' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b5-d14k1213f3g.png' } },
  { id: 7, name: { full: 'Roronoa Zoro' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-H6h51336d15D.png' } },
  { id: 8, name: { full: 'Tanjiro Kamado' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-hu01362d16.png' } },
  { id: 9, name: { full: 'Saitama' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b73935-v125136.png' } },
  { id: 10, name: { full: 'Satoru Gojo' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b127271-O8280326.png' } },
  { id: 11, name: { full: 'Killua Zoldyck' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b27-Jjfe012643.png' } },
  { id: 12, name: { full: 'Itachi Uchiha' }, image: { large: 'https://s4.anilist.co/file/anilistcdn/character/large/b14-An15136.png' } },
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
      console.warn(`AniList Media Fetch Error: ${response.status}. Using fallback anime dataset.`);
      return getFallbackAnimeData(settings);
    }

    const data = await response.json();
    const media = data?.data?.Page?.media;
    
    if (!media || media.length === 0) {
      console.warn('No content returned by AniList, using fallback anime dataset.');
      return getFallbackAnimeData(settings);
    }

    return media;
  } catch (error) {
    console.warn('Error fetching data from AniList, gracefully using fallback anime dataset:', error);
    return getFallbackAnimeData(settings);
  }
};

export const fetchTopCharacters = async (page: number = 1, perPage: number = 50): Promise<AnimeCharacter[]> => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        characters(sort: FAVOURITES_DESC) {
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
    const characters = data?.data?.Page?.characters;
    
    if (Array.isArray(characters) && characters.length > 0) return characters;
    
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