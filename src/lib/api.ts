
export async function getQuranSurahs() {
  const res = await fetch('https://api.alquran.cloud/v1/surah');
  if (!res.ok) throw new Error('Failed to fetch surahs');
  return res.json();
}

/**
 * Fetches surah details with specific editions.
 * @param id Surah number
 * @param translationEdition The identifier of the translation edition (e.g., 'en.sahih')
 */
export async function getSurahDetails(id: number, translationEdition: string = 'en.sahih') {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/editions/quran-uthmani,${translationEdition},ar.alafasy`);
  if (!res.ok) throw new Error('Failed to fetch surah details');
  return res.json();
}

/**
 * Fetches Quran content by page number with specific editions.
 * @param pageNumber Page number (1-604)
 * @param translationEdition The identifier of the translation edition (e.g., 'en.sahih')
 */
export async function getPageDetails(pageNumber: number, translationEdition: string = 'en.sahih') {
  // Use the combined editions endpoint for reading and indexing
  const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNumber}/editions/quran-uthmani,${translationEdition},ar.alafasy`);
  if (!res.ok) throw new Error('Failed to fetch page details');
  return res.json();
}

/**
 * Fetches a single translation edition for a specific page.
 * @param pageNumber Page number (1-604)
 * @param edition The identifier of the translation edition (e.g., 'en.asad')
 */
export async function getPageEdition(pageNumber: number, edition: string) {
  const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNumber}/${edition}`);
  if (!res.ok) throw new Error('Failed to fetch page edition data');
  return res.json();
}

export async function getPrayerTimes(city: string, country: string) {
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=2`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  return res.json();
}

/**
 * Fetches all available translation editions from AlQuran Cloud API.
 */
export async function getAvailableTranslations() {
  const res = await fetch('https://api.alquran.cloud/v1/edition?type=translation');
  if (!res.ok) throw new Error('Failed to fetch translations');
  return res.json();
}
