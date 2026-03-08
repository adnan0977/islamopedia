
export async function getQuranSurahs() {
  const res = await fetch('https://api.alquran.cloud/v1/surah');
  if (!res.ok) throw new Error('Failed to fetch surahs');
  return res.json();
}

/**
 * Fetches the complete Quran for a specific edition.
 * @param edition The identifier of the edition (e.g., 'en.sahih', 'quran-uthmani')
 */
export async function getFullQuran(edition: string) {
  const res = await fetch(`https://api.alquran.cloud/v1/quran/${edition}`);
  if (!res.ok) throw new Error(`Failed to fetch Quran for edition: ${edition}`);
  return res.json();
}

export async function getPrayerTimes(city: string, country: string) {
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=2`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  return res.json();
}

/**
 * Fetches all available editions (translations, recitations, etc.) from AlQuran Cloud API.
 */
export async function getAllAlQuranEditions() {
  const res = await fetch('https://api.alquran.cloud/v1/edition');
  if (!res.ok) throw new Error('Failed to fetch editions from registry');
  return res.json();
}

/**
 * Fetches the metadata about the Quran structure.
 */
export async function getQuranMetadata() {
  const res = await fetch('https://api.alquran.cloud/v1/meta');
  if (!res.ok) throw new Error('Failed to fetch Quran metadata');
  return res.json();
}

/**
 * Fetches available translation editions from AlQuran Cloud API.
 */
export async function getAvailableTranslations() {
  const res = await fetch('https://api.alquran.cloud/v1/edition?type=translation');
  if (!res.ok) throw new Error('Failed to fetch translations');
  return res.json();
}

/**
 * Fetches all available Hadith editions from the Fawaz Ahmed Hadith API.
 */
export async function getAllHadithEditions() {
  const res = await fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions.json');
  if (!res.ok) throw new Error('Failed to fetch Hadith editions');
  return res.json();
}
