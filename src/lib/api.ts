
export async function getQuranSurahs() {
  const res = await fetch('https://api.alquran.cloud/v1/surah');
  if (!res.ok) throw new Error('Failed to fetch surahs');
  return res.json();
}

export async function getSurahDetails(id: number) {
  const res = await fetch(`https://api.alquran.cloud/v1/surah/${id}/editions/quran-uthmani,en.sahih,ar.alafasy`);
  if (!res.ok) throw new Error('Failed to fetch surah details');
  return res.json();
}

export async function getPrayerTimes(city: string, country: string) {
  const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=2`);
  if (!res.ok) throw new Error('Failed to fetch prayer times');
  return res.json();
}
