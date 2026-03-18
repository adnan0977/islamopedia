'use server';

/**
 * @fileOverview Service for interacting with Hadith APIs (fawazahmed0 and hadithapi.com)
 */

const REGISTRY_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json';
const HADITH_API_KEY = '$2y$10$zBKMN41uis6ihOJnGbQGqOMvAugri3bY191hZlhdFtsfPjiCYO';

export interface FawazEdition {
  name: string;
  book: string;
  author: string;
  language: string;
  has_sections: boolean;
  direction: 'ltr' | 'rtl';
  source: string;
  comments: string;
  link: string;
  linkmin: string;
}

export interface FawazBook {
  name: string;
  collection: FawazEdition[];
}

export type FawazRegistry = Record<string, FawazBook>;

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
 * Legacy support for fetching edition metadata (useful for specific translations).
 */
export async function fetchHadithRegistry(): Promise<FawazRegistry> {
  try {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error('Failed to fetch Hadith registry');
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error('Hadith Registry Error:', error);
    throw new Error(error.message || 'Network error fetching registry');
  }
}

/**
 * Fetches the content of a specific edition from the fawazahmed0 API.
 */
export async function fetchHadithEditionContent(linkmin: string): Promise<any> {
  try {
    const res = await fetch(linkmin);
    if (!res.ok) throw new Error('Failed to fetch edition content');
    return res.json();
  } catch (error: any) {
    console.error('Hadith Content Error:', error);
    throw new Error(error.message || 'Network error fetching content');
  }
}
