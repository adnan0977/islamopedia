
'use server';

/**
 * @fileOverview Service for interacting with HadithAPI.com
 */

const API_KEY = '$2y$10$zBKMN41uis6ihOJnGbQGqOMvAugri3bY191hZlhdFtsfPjiCYO';
const BASE_URL = 'https://hadithapi.com/api';

export interface HadithApiBook {
  id: number;
  bookName: string;
  bookSlug: string;
  writerName: string;
  writerDeath: string;
  hadiths_count: string;
  chapters_count: string;
}

export async function fetchHadithBooks(): Promise<HadithApiBook[]> {
  try {
    const response = await fetch(`${BASE_URL}/books?apiKey=${API_KEY}`);
    const data = await response.json();
    
    if (data.status !== 200) {
      throw new Error(data.message || 'Failed to fetch books from HadithAPI');
    }
    
    return data.books || [];
  } catch (error: any) {
    console.error('HadithAPI Error:', error);
    throw new Error(error.message || 'Network error fetching Hadith books');
  }
}
