'use server';

/**
 * @fileOverview Service for interacting with HadithAPI.com
 */

const HADITH_API_KEY = '$2y$10$zBKMN41uis6ihOJnGbQGqOMvAugri3bY191hZlhdFtsfPjiCYO';

/**
 * Fetches the list of books from the premium HadithAPI.com service.
 */
export async function fetchHadithApiBooks(): Promise<any> {
  try {
    const url = `https://hadithapi.com/api/books?apiKey=${HADITH_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch books from HadithAPI');
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('HadithAPI Books Error:', error);
    throw new Error(error.message || 'Network error fetching HadithAPI registry');
  }
}

/**
 * Fetches the chapters for a specific book from HadithAPI.com.
 */
export async function fetchHadithApiChapters(bookSlug: string): Promise<any> {
  try {
    const url = `https://hadithapi.com/api/${bookSlug}/chapters?apiKey=${HADITH_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chapters from HadithAPI');
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('HadithAPI Chapters Error:', error);
    throw new Error(error.message || 'Network error fetching chapters');
  }
}

/**
 * Fetches Hadiths for a specific book and chapter from HadithAPI.com.
 * Uses the public endpoint as requested for deep data ingestion.
 */
export async function fetchHadithApiData(bookSlug: string, chapterNumber: string): Promise<any> {
  try {
    const url = `https://hadithapi.com/public/api/hadiths?apiKey=${HADITH_API_KEY}&book=${bookSlug}&chapter=${chapterNumber}&paginate=1000`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch hadiths from HadithAPI');
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('HadithAPI Data Error:', error);
    throw new Error(error.message || 'Network error fetching hadith data');
  }
}
