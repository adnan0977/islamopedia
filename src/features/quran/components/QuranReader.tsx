
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
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import Link from 'next/link';
import { getOfflineSurah } from '@/lib/offline-db';

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

interface PageContent {
  pageNumber: number;
  arabic: any[];
  trans: any[];
  translit: any[];
}

export function QuranReader() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  
  const initialMode = (searchParams.get('mode') as 'ayat' | 'page' | 'index') || 'index';
  const initialIndexType = (searchParams.get('type') as 'surah' | 'juz') || 'surah';
  const initialPage = parseInt(searchParams.get('page') || '1');

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

  const [visiblePage, setVisiblePage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'ayat' | 'page' | 'index'>(initialMode);
  const [indexType, setIndexType] = useState<'surah' | 'juz'>(initialIndexType);
  const [loadingContent, setLoadingContent] = useState(false);
  const [pagedData, setPagedData] = useState<PageContent[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [currentAyatIndex, setCurrentAyatIndex] = useState(0);
  
  const ayatScrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load settings
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

  const flattenedAyats = useMemo(() => {
    const ayats: any[] = [];
    pagedData.forEach(page => {
      page.arabic.forEach((a, idx) => {
        ayats.push({
          ...a,
          trans: page.trans[idx]?.text || page.trans[idx]?.translationText,
          translit: page.translit[idx]?.text || page.translit[idx]?.translationText,
          pageNumber: a.page || page.pageNumber
        });
      });
    });
    return ayats;
  }, [pagedData]);

  // Update URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('mode', viewMode);
    if (viewMode === 'index') {
      params.set('type', indexType);
      params.delete('page');
    } else {
      params.delete('type');
      params.set('page', visiblePage.toString());
    }
    const newUrl = `/quran?${params.toString()}`;
    if (window.location.search !== `?${params.toString()}`) {
      router.replace(newUrl, { scroll: false });
    }
  }, [viewMode, indexType, visiblePage, router, searchParams]);

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

  const fetchPageData = async (pageNum: number) => {
    if (pageNum < 1 || pageNum > 604) return null;
    
    try {
      const preferredIds = ['quran-uthmani', localSettings.preferredTranslationId, localSettings.preferredTransliterationId]
        .filter(id => id && id !== 'none');
      
      let currentIsOffline = false;
      const docsByEdition: Record<string, any> = {};

      const q = query(collection(db, 'quran'), where('pages', 'array-contains', pageNum));
      const snapshots = await getDocs(q);
      
      const surahNumbersOnPage = Array.from(new Set(snapshots.docs.map(d => d.data().surahNumber)));

      for (const editionId of preferredIds) {
        docsByEdition[editionId] = [];
        for (const sNum of surahNumbersOnPage) {
          const offlineSurah = await getOfflineSurah(`${editionId}_surah_${sNum}`);
          if (offlineSurah) {
            docsByEdition[editionId].push(offlineSurah);
            currentIsOffline = true;
          }
        }
      }

      let arabicData: any[] = [];
      let transData: any[] = [];
      let translitData: any[] = [];

      if (currentIsOffline && docsByEdition['quran-uthmani']?.length > 0) {
        setIsOfflineMode(true);
        const uthmaniDocs = docsByEdition['quran-uthmani'];
        uthmaniDocs.forEach((s: any) => {
          const ayats = s.ayahs || s.ayats || [];
          ayats.forEach((a: any) => {
            if (a.page === pageNum) {
              arabicData.push({ ...a, text: cleanAyatText(a.text, s.number || s.surahNumber, a.numberInSurah), surah: { number: s.number || s.surahNumber, name: s.name, englishName: s.englishName } });
            }
          });
        });
        
        arabicData.sort((a, b) => a.number - b.number);
        arabicData.forEach(aa => {
          const trSurah = docsByEdition[localSettings.preferredTranslationId]?.find((s: any) => (s.number || s.surahNumber) === aa.surah.number);
          const trAyats = trSurah?.ayahs || trSurah?.ayats || [];
          const trAyat = trAyats.find((ta: any) => ta.number === aa.number);
          transData.push(trAyat || null);

          const tlSurah = docsByEdition[localSettings.preferredTransliterationId]?.find((s: any) => (s.number || s.surahNumber) === aa.surah.number);
          const tlAyats = tlSurah?.ayahs || tlSurah?.ayats || [];
          const tlAyat = tlAyats.find((ta: any) => ta.number === aa.number);
          translitData.push(tlAyat || null);
        });
      } else {
        const firestoreDocs: Record<string, any> = {};
        snapshots.forEach(d => {
          const data = d.data();
          if (!firestoreDocs[data.editionId]) firestoreDocs[data.editionId] = [];
          firestoreDocs[data.editionId].push(data);
        });

        const arabicSurahs = firestoreDocs['quran-uthmani'] || [];
        arabicSurahs.forEach(s => {
          s.ayats.forEach((a: any) => {
            if (a.page === pageNum) {
              arabicData.push({ ...a, text: cleanAyatText(a.text, s.surahNumber, a.numberInSurah), surah: { number: s.surahNumber, name: s.name, englishName: s.englishName } });
              
              const trSurah = firestoreDocs[localSettings.preferredTranslationId]?.find(ts => ts.surahNumber === s.surahNumber);
              transData.push(trSurah?.ayats.find((ta: any) => ta.number === a.number) || null);

              const tlSurah = firestoreDocs[localSettings.preferredTransliterationId]?.find(ts => ts.surahNumber === s.surahNumber);
              translitData.push(tlSurah?.ayats.find((ta: any) => ta.number === a.number) || null);
            }
          });
        });
      }

      arabicData.sort((a, b) => a.number - b.number);
      return { pageNumber: pageNum, arabic: arabicData, trans: transData, translit: translitData };
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const loadMorePages = useCallback(async () => {
    if (loadingContent) return;
    const lastPage = pagedData[pagedData.length - 1]?.pageNumber;
    if (!lastPage || lastPage >= 604) return;

    const nextPage = lastPage + 1;
    setLoadingContent(true);
    const data = await fetchPageData(nextPage);
    if (data) {
      setPagedData(prev => {
        if (prev.some(p => p.pageNumber === data.pageNumber)) return prev;
        return [...prev, data];
      });
    }
    setLoadingContent(false);
  }, [loadingContent, pagedData, localSettings.preferredTranslationId, localSettings.preferredTransliterationId]);

  useEffect(() => {
    if (viewMode === 'index') {
      setPagedData([]);
      setCurrentAyatIndex(0);
      return;
    }
    
    async function initFetch() {
      setLoadingContent(true);
      const data = await fetchPageData(initialPage);
      if (data) {
        setPagedData([data]);
        setVisiblePage(initialPage);
        setCurrentAyatIndex(0);
      }
      setLoadingContent(false);
    }
    initFetch();
  }, [viewMode, initialPage, localSettings.preferredTranslationId, localSettings.preferredTransliterationId]);

  useEffect(() => {
    if (viewMode !== 'ayat' || !ayatScrollContainerRef.current || pagedData.length === 0) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const ayatIndex = parseInt(entry.target.getAttribute('data-ayat-index') || '0');
          setCurrentAyatIndex(ayatIndex);
          
          if (ayatIndex >= flattenedAyats.length - 3) {
            loadMorePages();
          }
        }
      });
    }, { 
      root: ayatScrollContainerRef.current,
      threshold: 0.5
    });

    const blocks = ayatScrollContainerRef.current.querySelectorAll('.ayat-block');
    blocks.forEach(b => observerRef.current?.observe(b));

    return () => observerRef.current?.disconnect();
  }, [viewMode, pagedData, loadMorePages, flattenedAyats.length]);

  const scrollToAyat = (index: number) => {
    const target = ayatScrollContainerRef.current?.querySelector(`[data-ayat-index="${index}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isReading = viewMode !== 'index';

  const BismillahHeader = () => (
    <div className="w-full flex flex-col items-center justify-center py-6 mb-4">
      <span className="text-3xl md:text-5xl font-arabic text-zinc-100">{BISMILLAH_TEXT}</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col space-y-4">
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
                  onClick={() => {
                    setViewMode('index');
                    setPagedData([]);
                    setCurrentAyatIndex(0);
                  }}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-xl font-headline font-bold text-white leading-tight">
                    {flattenedAyats[currentAyatIndex]?.surah?.englishName || 'Quran'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Page {visiblePage}</p>
                    {isOfflineMode && <WifiOff className="w-2.5 h-2.5 text-zinc-600" />}
                  </div>
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
                  onClick={() => setIndexType('surah')} 
                  className={cn(
                    "rounded-xl font-bold h-10 px-6 transition-all border border-transparent", 
                    indexType === 'surah' ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Surah
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIndexType('juz')} 
                  className={cn(
                    "rounded-xl font-bold h-10 px-6 transition-all border border-transparent", 
                    indexType === 'juz' ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Juz
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" size="sm" 
                onClick={() => {
                  const newMode = viewMode === 'ayat' ? 'page' : 'ayat';
                  setViewMode(newMode);
                }} 
                className="rounded-xl font-bold h-10 border-zinc-800 bg-zinc-900 text-zinc-400"
              >
                {viewMode === 'ayat' ? <BookIcon className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
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
        {viewMode === 'index' ? (
          <div className="p-8 md:p-12 space-y-8">
            {isMetaLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-zinc-800 w-10 h-10" /></div>
            ) : indexType === 'surah' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {metadata?.surahs?.references?.map((surah: any) => (
                  <button 
                    key={surah.number}
                    onClick={() => {
                      setLoadingContent(true);
                      const q = query(collection(db, 'quran'), where('editionId', '==', 'quran-uthmani'), where('surahNumber', '==', surah.number));
                      getDocs(q).then(snap => {
                        if (!snap.empty) {
                          const startPage = snap.docs[0].data().pages[0];
                          setVisiblePage(startPage);
                          setCurrentAyatIndex(0);
                          setViewMode('ayat');
                        }
                      }).finally(() => setLoadingContent(false));
                    }}
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
                    onClick={() => { 
                      setVisiblePage(juz.ayah || 1); 
                      setCurrentAyatIndex(0);
                      setViewMode('page'); 
                    }}
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
        ) : viewMode === 'ayat' ? (
          <div 
            ref={ayatScrollContainerRef}
            className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
          >
            <div className="p-0">
              {flattenedAyats.map((ayat, idx) => (
                <div 
                  key={`${ayat.number}-${idx}`} 
                  data-ayat-index={idx}
                  data-page-number={ayat.pageNumber}
                  className="ayat-block snap-start min-h-[60vh] flex flex-col items-center justify-center p-8 md:p-24 border-b border-zinc-900/30"
                >
                  <div className="w-full max-w-4xl space-y-12">
                    {ayat.numberInSurah === 1 && ayat.surah.number !== 9 && <BismillahHeader />}
                    <div className="space-y-12 text-center">
                       <p className="text-right font-arabic leading-relaxed text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }} dir="rtl">
                        {ayat.text}
                        <span className="inline-block mr-4 align-middle"><AyatFrame number={ayat.numberInSurah} frameId={ayatFrameId} size="md" /></span>
                      </p>
                      <div className="space-y-6 text-left">
                        {localSettings.showTransliteration && ayat.translit && (
                          <p className="text-zinc-500 font-medium leading-relaxed italic" style={{ fontSize: `${transFontSize - 2}px` }}>{ayat.translit}</p>
                        )}
                        {localSettings.showTranslation && ayat.trans && (
                          <p className="text-zinc-400 font-medium leading-relaxed italic" style={{ fontSize: `${transFontSize}px` }}>{ayat.trans}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loadingContent && (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 md:p-16">
            <div className="space-y-12">
              {pagedData.map((page, index) => (
                <div 
                  key={`page-${page.pageNumber}-${index}`} 
                  data-page={page.pageNumber}
                  className="space-y-12 mb-16"
                >
                  <div className="text-right leading-[3]" dir="rtl">
                    {page.arabic.map((a: any) => (
                      <span key={a.number} className="inline transition-all">
                        <span className="text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }}>{a.text}</span>
                        <span className="inline-block mx-4 align-middle"><AyatFrame number={a.numberInSurah} frameId={ayatFrameId} size="md" /></span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isReading && viewMode === 'ayat' && (
        <div className="flex items-center justify-between px-6 pb-32">
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 px-6 gap-2 text-zinc-500 font-bold" 
            onClick={() => scrollToAyat(currentAyatIndex + 1)}
            disabled={currentAyatIndex >= flattenedAyats.length - 1}
          >
            Next Ayat <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
          <div className="text-zinc-600 font-black text-[10px] uppercase tracking-widest">
            {currentAyatIndex + 1} / {flattenedAyats.length}
          </div>
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 px-6 gap-2 text-zinc-500 font-bold" 
            onClick={() => scrollToAyat(currentAyatIndex - 1)}
            disabled={currentAyatIndex <= 0}
          >
            <ChevronUp className="w-4 h-4 mr-2" /> Previous Ayat
          </Button>
        </div>
      )}

      {isReading && viewMode === 'page' && (
        <div className="flex items-center justify-between px-6 pb-32">
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 px-6 gap-2 text-zinc-500 font-bold" 
            onClick={() => {
              const nextVal = Math.min(604, visiblePage + 1);
              setVisiblePage(nextVal);
              setCurrentAyatIndex(0);
              setPagedData([]);
            }} 
            disabled={visiblePage >= 604}
          >
            Next Page <ChevronLeft className="w-4 h-4 ml-2" />
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-xl h-12 px-6 gap-2 text-zinc-500 font-bold" 
            onClick={() => {
              const prev = Math.max(1, visiblePage - 1);
              setVisiblePage(prev);
              setCurrentAyatIndex(0);
              setPagedData([]); 
            }} 
            disabled={visiblePage <= 1}
          >
            <ChevronRight className="w-4 h-4 mr-2" /> Previous Page
          </Button>
        </div>
      )}

      {isReading && localSettings.showAudio && localSettings.preferredAudioId !== 'none' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-4 shadow-2xl flex items-center gap-6">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-800"><Volume2 className="w-6 h-6 text-white" /></div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-white truncate">Reciter Mode</p>
               <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Available Offline</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400" onClick={() => scrollToAyat(currentAyatIndex - 1)}><ChevronUp className="w-5 h-5" /></Button>
              <Button className="h-12 w-12 rounded-2xl bg-white text-black"><Mic2 className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400" onClick={() => scrollToAyat(currentAyatIndex + 1)}><ChevronDown className="w-5 h-5" /></Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
