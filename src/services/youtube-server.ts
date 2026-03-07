
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
 * Fetches multiple YouTube channels details by their IDs.
 */
export async function fetchYouTubeChannels(ids: string[]): Promise<YouTubeChannelData[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY is not configured in environment variables.');
  }

  const idString = ids.join(',');
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${idString}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      externalUrl: `https://www.youtube.com/channel/${item.id}`,
      subscribersCount: parseInt(item.statistics.subscriberCount) || 0,
      videoCount: parseInt(item.statistics.videoCount) || 0,
      viewCount: parseInt(item.statistics.viewCount) || 0,
    }));
  } catch (error) {
    console.error('Error fetching YouTube channels:', error);
    throw new Error('Failed to fetch data from YouTube API.');
  }
}
