
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  Book as BookIcon,
  ArrowLeft,
  Database,
  Settings,
  Volume2,
  Mic2,
  WifiOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc, orderBy } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import Link from 'next/link';
import { getOfflineSurah } from '@/lib/offline-db';

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

interface PageContent {
  surahNumber?: number;
  name?: string;
  englishName?: string;
  ayats: any[];
}

type QuranViewMode = 'surah' | 'juz' | 'page';

export function QuranReader() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  
  // 1. Initialize State from URL
  const [viewMode, setViewMode] = useState<QuranViewMode>((searchParams.get('mode') as QuranViewMode) || 'surah');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(searchParams.get('surah') ? parseInt(searchParams.get('surah')!) : null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(searchParams.get('juz') ? parseInt(searchParams.get('juz')!) : null);
  const [selectedPage, setSelectedPage] = useState<number | null>(searchParams.get('page') ? parseInt(searchParams.get('page')!) : null);

  const isReading = (viewMode === 'surah' && selectedSurah !== null) || 
                    (viewMode === 'juz' && selectedJuz !== null) || 
                    (viewMode === 'page' && selectedPage !== null);

  const [localSettings, setLocalSettings] = useState({
    arabicFontSize: 40,
    translationFontSize: 16,
    preferredTranslationId: 'none',
    preferredTransliterationId: 'none',
    preferredAudioId: 'none',
    ayatFrameId: 'royal-ornate',
    showTranslation: true,
    showTransliteration: true,
    showAudio: true
  });

  const [loadingContent, setLoadingContent] = useState(false);
  const [content, setContent] = useState<PageContent[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentAyatIndex, setCurrentAyatIndex] = useState(0);
  
  const ayatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Load settings from LocalStorage
  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error parsing settings", e);
      }
    }
  }, [user]);

  // Sync State FROM URL (Handle browser navigation)
  useEffect(() => {
    const mode = (searchParams.get('mode') as QuranViewMode) || 'surah';
    const surah = searchParams.get('surah') ? parseInt(searchParams.get('surah')!) : null;
    const juz = searchParams.get('juz') ? parseInt(searchParams.get('juz')!) : null;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : null;

    setViewMode(mode);
    setSelectedSurah(surah);
    setSelectedJuz(juz);
    setSelectedPage(page);
  }, [searchParams]);

  const metaRef = useMemoFirebase(() => doc(db, 'quran_metadata', 'global'), [db]);
  const { data: metadata, isLoading: isMetaLoading } = useDoc(metaRef);

  const arabicFontSize = localSettings.arabicFontSize;
  const transFontSize = localSettings.translationFontSize;
  const ayatFrameId = localSettings.ayatFrameId || 'ornate-star';

  const cleanAyatText = (text: string, surahNumber: number, ayatNumberInSurah: number) => {
    if (surahNumber !== 9 && ayatNumberInSurah === 1 && text.startsWith(BISMILLAH_TEXT)) {
      return text.substring(BISMILLAH_TEXT.length).trim() || text;
    }
    return text;
  };

  // Content Fetching Logic (Container Based)
  useEffect(() => {
    if (!isReading) {
      setContent([]);
      return;
    }

    async function fetchReaderData() {
      setLoadingContent(true);
      try {
        const editionsToFetch = ['quran-uthmani', localSettings.preferredTranslationId, localSettings.preferredTransliterationId]
          .filter(id => id && id !== 'none');

        const results: Record<string, any[]> = {};
        
        // Fetch all required editions
        for (const editionId of editionsToFetch) {
          let q;
          if (viewMode === 'surah' && selectedSurah) {
            q = query(collection(db, 'quran'), where('editionId', '==', editionId), where('surahNumber', '==', selectedSurah));
          } else if (viewMode === 'juz' && selectedJuz) {
            // For Juz, we fetch surahs that overlap with the juz pages
            const juzMap: Record<number, number[]> = { 1: [1, 21], 2: [22, 41], 3: [42, 61], 4: [62, 81], 5: [82, 101], 6: [102, 120], 7: [121, 141], 8: [142, 161], 9: [162, 181], 10: [182, 200], 11: [201, 221], 12: [222, 241], 13: [242, 261], 14: [262, 281], 15: [282, 301], 16: [302, 321], 17: [322, 341], 18: [342, 361], 19: [362, 381], 20: [382, 401], 21: [402, 421], 22: [422, 441], 23: [442, 461], 24: [462, 481], 25: [482, 501], 26: [502, 521], 27: [522, 541], 28: [542, 561], 29: [562, 581], 30: [582, 604] };
            const [start, end] = juzMap[selectedJuz] || [1, 604];
            
            // Note: This is an approximation fetching Surahs by page overlap
            q = query(collection(db, 'quran'), where('editionId', '==', editionId), where('pages', 'array-contains-any', Array.from({length: end - start + 1}, (_, i) => start + i)));
          } else if (viewMode === 'page' && selectedPage) {
            q = query(collection(db, 'quran'), where('editionId', '==', editionId), where('pages', 'array-contains', selectedPage));
          }

          if (q) {
            const snap = await getDocs(q);
            results[editionId] = snap.docs.map(d => d.data()).sort((a, b) => a.surahNumber - b.surahNumber);
          }
        }

        // Process and Merge
        const uthmaniSurahs = results['quran-uthmani'] || [];
        const mergedContent: PageContent[] = uthmaniSurahs.map(s => {
          const ayats = s.ayats.filter((a: any) => {
            if (viewMode === 'juz') return a.juz === selectedJuz;
            if (viewMode === 'page') return a.page === selectedPage;
            return true;
          }).map((a: any) => {
            const trans = results[localSettings.preferredTranslationId]?.find(ts => ts.surahNumber === s.surahNumber)?.ayats.find((ta: any) => ta.number === a.number);
            const translit = results[localSettings.preferredTransliterationId]?.find(ts => ts.surahNumber === s.surahNumber)?.ayats.find((ta: any) => ta.number === a.number);
            
            return {
              ...a,
              text: cleanAyatText(a.text, s.surahNumber, a.numberInSurah),
              translationText: trans?.text || trans?.translationText,
              transliterationText: translit?.text || translit?.translationText
            };
          });

          return {
            surahNumber: s.surahNumber,
            name: s.name,
            englishName: s.englishName,
            ayats
          };
        }).filter(c => c.ayats.length > 0);

        setContent(mergedContent);
        setCurrentAyatIndex(0);
      } catch (e) {
        console.error("Fetch error", e);
      } finally {
        setLoadingContent(false);
      }
    }

    fetchReaderData();
  }, [isReading, viewMode, selectedSurah, selectedJuz, selectedPage, db, localSettings.preferredTranslationId, localSettings.preferredTransliterationId]);

  const flattenedAyats = useMemo(() => {
    return content.flatMap(c => c.ayats.map(a => ({ ...a, surahName: c.englishName })));
  }, [content]);

  const scrollToAyat = (index: number) => {
    const target = ayatScrollContainerRef.current?.querySelector(`[data-ayat-index="${index}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      setCurrentAyatIndex(index);
    }
  };

  const handleModeToggle = (mode: QuranViewMode) => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    router.push(`/quran?${params.toString()}`);
  };

  const selectSurah = (num: number) => {
    router.push(`/quran?mode=surah&surah=${num}`);
  };

  const selectJuz = (num: number) => {
    router.push(`/quran?mode=juz&juz=${num}`);
  };

  const selectPage = (num: number) => {
    router.push(`/quran?mode=page&page=${num}`);
  };

  const goBackToIndex = () => {
    const params = new URLSearchParams();
    params.set('mode', viewMode === 'page' ? 'surah' : viewMode);
    router.push(`/quran?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col space-y-4">
      {/* Dynamic Reader Header */}
      <div className="sticky top-0 md:top-24 z-50 bg-background -mx-4 px-4 py-3">
        <div className="flex flex-row justify-between items-center bg-zinc-950 p-4 rounded-[2rem] border border-zinc-900 shadow-2xl gap-4">
          <div className="flex items-center gap-4">
            {!isReading ? (
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                    <Database className="w-5 h-5 text-zinc-500" />
                 </div>
                 <h1 className="text-lg md:text-2xl font-headline font-bold text-white tracking-tight">Quran</h1>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" size="icon" 
                  className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
                  onClick={goBackToIndex}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-xl font-headline font-bold text-white leading-tight">
                    {viewMode === 'surah' && (content[0]?.englishName || 'Loading...')}
                    {viewMode === 'juz' && `Juz ${selectedJuz}`}
                    {viewMode === 'page' && `Page ${selectedPage}`}
                  </h1>
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                    {viewMode === 'surah' ? `${content[0]?.ayats.length || 0} Verses` : `Reading Mode`}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isReading ? (
              <div className="flex items-center gap-1 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-900 shadow-inner">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleModeToggle('surah')} 
                  className={cn(
                    "rounded-xl font-bold h-10 px-6 transition-all border border-transparent", 
                    viewMode === 'surah' ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Surah
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleModeToggle('juz')} 
                  className={cn(
                    "rounded-xl font-bold h-10 px-6 transition-all border border-transparent", 
                    viewMode === 'juz' ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Juz
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" size="sm" 
                onClick={() => setViewMode(viewMode === 'page' ? 'surah' : 'page')} 
                className="rounded-xl font-bold h-10 border-zinc-800 bg-zinc-900 text-zinc-400"
              >
                {viewMode === 'page' ? <BookIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
              </Button>
            )}
            <Link href="/quran/settings">
              <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="flex-1 bg-zinc-950 border-zinc-900 overflow-hidden shadow-2xl rounded-[2.5rem] mt-4 min-h-[60vh] flex flex-col">
        {!isReading ? (
          <div className="p-8 md:p-12 space-y-8">
            {isMetaLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-zinc-800 w-10 h-10" /></div>
            ) : viewMode === 'surah' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {metadata?.surahs?.references?.map((surah: any) => (
                  <button 
                    key={surah.number}
                    onClick={() => selectSurah(surah.number)}
                    className="group flex items-center justify-between p-5 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800"><span className="text-[10px] font-black text-zinc-600">{surah.number}</span></div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-200">{surah.englishName}</h3>
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{surah.numberOfAyahs} Ayats</p>
                      </div>
                    </div>
                    <span className="text-xl font-arabic text-zinc-500 group-hover:text-zinc-200">{surah.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metadata?.juzs?.references?.map((juz: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => selectJuz(idx + 1)}
                    className="group flex items-center justify-between p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 transition-all text-left"
                  >
                    <div className="flex items-center gap-5">
                      <AyatFrame number={idx + 1} size="sm" />
                      <div><h3 className="font-bold text-zinc-200">Juz {idx + 1}</h3></div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-800" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div 
            ref={ayatScrollContainerRef}
            className="flex-1 overflow-y-auto scrollbar-hide"
          >
            {loadingContent ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
                <p className="text-zinc-600 font-medium">Preparing spiritual text...</p>
              </div>
            ) : (
              <div className="p-0">
                {content.map((surah, sIdx) => (
                  <div key={surah.surahNumber} className="space-y-0">
                    {/* Bismillah for start of Surahs except Surah 9 */}
                    {(viewMode === 'surah' || (viewMode === 'juz' && surah.ayats[0].numberInSurah === 1)) && surah.surahNumber !== 9 && (
                      <div className="w-full flex flex-col items-center justify-center py-12 bg-zinc-900/10 border-b border-zinc-900/30">
                        <span className="text-3xl md:text-5xl font-arabic text-zinc-100">{BISMILLAH_TEXT}</span>
                      </div>
                    )}
                    
                    {surah.ayats.map((ayat, aIdx) => (
                      <div 
                        key={`${ayat.number}-${aIdx}`} 
                        data-ayat-index={flattenedAyats.findIndex(f => f.number === ayat.number)}
                        className="ayat-block flex flex-col items-center justify-center p-8 md:p-24 border-b border-zinc-900/30 min-h-[40vh]"
                      >
                        <div className="w-full max-w-4xl space-y-12 text-center">
                           <p className="text-right font-arabic leading-relaxed text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }} dir="rtl">
                            {ayat.text}
                            <span className="inline-block mr-4 align-middle"><AyatFrame number={ayat.numberInSurah} frameId={ayatFrameId} size="md" /></span>
                          </p>
                          <div className="space-y-6 text-left">
                            {localSettings.showTransliteration && ayat.transliterationText && (
                              <p className="text-zinc-500 font-medium leading-relaxed italic" style={{ fontSize: `${transFontSize - 2}px` }}>{ayat.transliterationText}</p>
                            )}
                            {localSettings.showTranslation && ayat.translationText && (
                              <p className="text-zinc-400 font-medium leading-relaxed italic" style={{ fontSize: `${transFontSize}px` }}>{ayat.translationText}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {isReading && (
        <div className="flex items-center justify-between px-6 pb-32">
          <div className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">
            {viewMode === 'surah' ? 'Full Surah View' : viewMode === 'juz' ? 'Juz Content' : 'Page View'}
          </div>
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 px-6 gap-2 text-zinc-500 font-bold" 
            onClick={goBackToIndex}
          >
            Back to Quran Index
          </Button>
        </div>
      )}
    </div>
  );
}
