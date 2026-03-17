
'use server';

/**
 * @fileOverview Service for interacting with fawazahmed0 Hadith API
 */

const REGISTRY_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.min.json';

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

export async function fetchHadithRegistry(): Promise<FawazEdition[]> {
  try {
    const res = await fetch(REGISTRY_URL);
    if (!res.ok) throw new Error('Failed to fetch Hadith registry');
    const data = await res.json();
    return data.editions || [];
  } catch (error: any) {
    console.error('Hadith Registry Error:', error);
    throw new Error(error.message || 'Network error fetching registry');
  }
}

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
