const YOUTUBE_API_KEY = 'AIzaSyBcoHE4l3UtUTS9EjcrmHHMluDWxhREPzE';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export const searchYouTubeVideo = async (query: string): Promise<string | undefined> => {
  try {
    const url = new URL(YOUTUBE_API_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('maxResults', '1');
    url.searchParams.append('q', query);
    url.searchParams.append('type', 'video');
    url.searchParams.append('videoEmbeddable', 'true');
    url.searchParams.append('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
        console.warn('YouTube API Limit or Error:', response.statusText);
        return undefined;
    }

    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      return data.items[0].id.videoId;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error fetching YouTube video:', error);
    return undefined;
  }
};