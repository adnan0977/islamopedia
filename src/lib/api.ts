
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

export async function getPrayerTimes(city: string, country: string, adjustment: number = 0) {
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=2&adjustment=${adjustment}`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  return res.json();
}

/**
 * Fetches prayer times based on GPS coordinates.
 */
export async function getPrayerTimesByCoords(lat: number, lon: number, adjustment: number = 0) {
  const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=2&adjustment=${adjustment}`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  return res.json();
}

/**
 * Resolves a city name from GPS coordinates.
 */
export async function getCityFromCoords(lat: number, lon: number) {
  const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
  if (!res.ok) throw new Error('Failed to fetch city name');
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
