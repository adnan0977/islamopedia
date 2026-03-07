
'use server';

/**
 * @fileOverview Server-side service for interacting with the YouTube Data API.
 */

interface YouTubeChannelData {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  externalUrl: string;
  subscribersCount: number;
  videoCount: number;
  viewCount: number;
}

/**
 * Common mapper for YouTube API items to our internal format.
 */
function mapChannelItem(item: any): YouTubeChannelData {
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    externalUrl: `https://www.youtube.com/channel/${item.id}`,
    subscribersCount: parseInt(item.statistics.subscriberCount) || 0,
    videoCount: parseInt(item.statistics.videoCount) || 0,
    viewCount: parseInt(item.statistics.viewCount) || 0,
  };
}

/**
 * Fetches multiple YouTube channels details by their IDs.
 */
export async function fetchYouTubeChannels(ids: string[]): Promise<YouTubeChannelData[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    throw new Error('YOUTUBE_API_KEY is not configured. Please add a valid key to your .env file.');
  }

  const idString = ids.join(',');
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${idString}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API Error:', data.error);
      throw new Error(`YouTube API Error: ${data.error.message || 'Unknown error'}`);
    }

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map(mapChannelItem);
  } catch (error: any) {
    console.error('Error fetching YouTube channels by ID:', error);
    throw new Error(error.message || 'Failed to fetch data from YouTube API.');
  }
}

/**
 * Fetches a single YouTube channel detail by its Handle (@handle).
 */
export async function fetchYouTubeChannelByHandle(handle: string): Promise<YouTubeChannelData | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
    throw new Error('YOUTUBE_API_KEY is not configured.');
  }

  // Ensure handle starts with @
  const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(formattedHandle)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API Error (Handle):', data.error);
      throw new Error(`YouTube API Error: ${data.error.message || 'Unknown error'}`);
    }

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return mapChannelItem(data.items[0]);
  } catch (error: any) {
    console.error('Error fetching YouTube channel by handle:', error);
    throw new Error(error.message || 'Failed to fetch handle from YouTube API.');
  }
}
