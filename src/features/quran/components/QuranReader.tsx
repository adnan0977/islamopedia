
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Grid3X3, 
  Layers, 
  Type, 
  Book as BookIcon,
  ArrowLeft,
  Database,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import Link from 'next/link';

const BISMILLAH_TEXT = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

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
    preferredTranslationId: 'en.sahih',
    preferredTransliterationId: 'none',
    preferredAudioId: 'none',
    ayatFrameId: 'royal-ornate',
    showTranslation: true,
    showTransliteration: true,
    showAudio: true
  });

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'ayat' | 'page' | 'index'>(initialMode);
  const [indexType, setIndexType] = useState<'surah' | 'juz'>(initialIndexType);
  const [loadingContent, setLoadingContent] = useState(false);
  const [quranData, setQuranData] = useState<{ arabic: any[], trans: any[], translit: any[] }>({ arabic: [], trans: [], translit: [] });

  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ 
          ...prev, 
          ...parsed,
          showTranslation: parsed.showTranslation ?? true,
          showTransliteration: parsed.showTransliteration ?? true,
          showAudio: parsed.showAudio ?? true
        }));
      } catch (e) {
        console.error("Error parsing local quran settings", e);
      }
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', viewMode);
    
    if (viewMode === 'index') {
      params.set('type', indexType);
      params.delete('page');
    } else {
      params.delete('type');
      params.set('page', currentPage.toString());
    }
    router.replace(`/quran?${params.toString()}`, { scroll: false });
  }, [viewMode, indexType, currentPage, router, searchParams]);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'quran_editions'), 
    where('isActive', '==', true),
    where('dataSync', '==', 'yes')
  ), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const metaRef = useMemoFirebase(() => doc(db, 'quran_metadata', 'global'), [db]);
  const { data: metadata, isLoading: isMetaLoading } = useDoc(metaRef);

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: globalAppSettings } = useDoc(settingsRef);
  
  const arabicFontSize = localSettings.arabicFontSize;
  const transFontSize = localSettings.translationFontSize;
  const ayatFrameId = localSettings.ayatFrameId || globalAppSettings?.ayatFrameId || 'ornate-star';
  const customAyatFramePath = globalAppSettings?.customAyatFramePath;
  const frameImageUrl = globalAppSettings?.frameImageUrl;

  const cleanAyatText = (text: string, surahNumber: number, ayatNumberInSurah: number) => {
    if (surahNumber !== 9 && ayatNumberInSurah === 1) {
      if (text.startsWith(BISMILLAH_TEXT)) {
        const cleaned = text.substring(BISMILLAH_TEXT.length).trim();
        return cleaned || text; 
      }
    }
    return text;
  };

  useEffect(() => {
    async function fetchPage() {
      if (viewMode === 'index') return;
      setLoadingContent(true);
      try {
        const q = query(collection(db, 'quran'), where('pages', 'array-contains', currentPage));
        const snapshots = await getDocs(q);
        const pageArabic: any[] = [];
        const pageTrans: any[] = [];
        const pageTranslit: any[] = [];

        const docsByEdition: Record<string, any> = {};
        snapshots.forEach(doc => {
          const data = doc.data();
          docsByEdition[data.editionId] = data;
        });

        const arabicSurahDocs = snapshots.docs
          .map(d => d.data())
          .filter(d => d.editionId === 'quran-uthmani');

        arabicSurahDocs.forEach(s => {
          s.ayats.forEach((a: any) => {
            if (a.page === currentPage) {
              pageArabic.push({ 
                ...a, 
                text: cleanAyatText(a.text, s.surahNumber, a.numberInSurah),
                surah: { number: s.surahNumber, name: s.name, englishName: s.englishName } 
              });
              
              if (viewMode === 'ayat') {
                const transSurah = docsByEdition[localSettings.preferredTranslationId];
                if (transSurah) {
                  const matchingAyat = transSurah.ayats.find((ta: any) => ta.number === a.number);
                  if (matchingAyat) pageTrans.push(matchingAyat);
                }

                if (localSettings.preferredTransliterationId && localSettings.preferredTransliterationId !== 'none') {
                  const translitSurah = docsByEdition[localSettings.preferredTransliterationId];
                  if (translitSurah) {
                    const matchingAyat = translitSurah.ayats.find((ta: any) => ta.number === a.number);
                    if (matchingAyat) pageTranslit.push(matchingAyat);
                  }
                }
              }
            }
          });
        });
        
        pageArabic.sort((a, b) => a.number - b.number);
        const alignedTrans = viewMode === 'ayat' ? pageArabic.map(aa => pageTrans.find(tt => tt.number === aa.number)) : [];
        const alignedTranslit = viewMode === 'ayat' ? pageArabic.map(aa => pageTranslit.find(tt => tt.number === aa.number)) : [];

        setQuranData({ arabic: pageArabic, trans: alignedTrans, translit: alignedTranslit });
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoadingContent(false); 
      }
    }
    fetchPage();
  }, [currentPage, localSettings.preferredTranslationId, localSettings.preferredTransliterationId, viewMode, db]);

  const groupedAyats = useMemo(() => {
    const groups: any[] = [];
    quranData.arabic.forEach((ayat, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.surah.number !== ayat.surah.number) {
        groups.push({ 
          surah: ayat.surah, 
          ayats: [{ 
            ...ayat, 
            trans: quranData.trans[idx]?.translationText,
            translit: quranData.translit[idx]?.translationText 
          }] 
        });
      } else {
        last.ayats.push({ 
          ...ayat, 
          trans: quranData.trans[idx]?.translationText,
          translit: quranData.translit[idx]?.translationText
        });
      }
    });
    return groups;
  }, [quranData]);

  const isReading = viewMode !== 'index';

  const BismillahHeader = () => (
    <div className="w-full flex flex-col items-center justify-center py-6 mb-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />
      <span className="text-3xl md:text-5xl font-arabic text-zinc-100 select-none relative">
        {BISMILLAH_TEXT}
      </span>
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
                 <h1 className="text-lg md:text-2xl font-headline font-bold text-white tracking-tight">Recitation Index</h1>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
                  onClick={() => setViewMode('index')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex flex-col justify-center">
                  <h1 className="text-sm md:text-xl font-headline font-bold text-white leading-tight">
                    {groupedAyats[0]?.surah.englishName || 'Reciting...'}
                  </h1>
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                    Page {currentPage} / 604
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isReading ? (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIndexType('surah')} 
                  className={cn("rounded-xl font-bold h-10 px-4 md:px-6 transition-all", indexType === 'surah' ? "bg-white text-black shadow-lg" : "text-zinc-500")}
                >
                  <Grid3X3 className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Surah</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIndexType('juz')} 
                  className={cn("rounded-xl font-bold h-10 px-4 md:px-6 transition-all", indexType === 'juz' ? "bg-white text-black shadow-lg" : "text-zinc-500")}
                >
                  <Layers className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Juz</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 md:gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewMode(prev => prev === 'ayat' ? 'page' : 'ayat')} 
                  className="rounded-xl font-bold h-10 px-3 md:px-4 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
                  title={viewMode === 'ayat' ? "Switch to Page View" : "Switch to Ayat View"}
                >
                  {viewMode === 'ayat' ? <BookIcon className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                </Button>
              </div>
            )}
            <Link href="/quran/settings">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="flex-1 bg-zinc-950 border-zinc-900 overflow-hidden shadow-2xl rounded-[2.5rem] mt-4 min-h-[60vh]">
        {viewMode === 'index' ? (
          <div className="p-8 md:p-12 space-y-8">
            {isMetaLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="animate-spin text-zinc-800 w-10 h-10" />
              </div>
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
                          const data = snap.docs[0].data();
                          setCurrentPage(data.pages[0]);
                          setViewMode('ayat');
                        }
                      }).finally(() => setLoadingContent(false));
                    }}
                    className="group flex items-center justify-between p-5 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-950 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                        <span className="text-[10px] font-black text-zinc-600 group-hover:text-zinc-400">{surah.number}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-200">{surah.englishName}</h3>
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{surah.numberOfAyahs} Verses</p>
                      </div>
                    </div>
                    <span className="text-xl font-arabic text-zinc-500 group-hover:text-zinc-200 transition-colors">{surah.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metadata?.juzs?.references?.map((juz: any, idx: number) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setCurrentPage(juz.ayah || 1);
                      setViewMode('page');
                    }}
                    className="group flex items-center justify-between p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-5">
                      <AyatFrame number={idx + 1} size="sm" frameId={ayatFrameId} />
                      <div>
                        <h3 className="font-bold text-zinc-200">Juz {idx + 1}</h3>
                        <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Starts at Surah {juz.surah}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-400 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : loadingContent ? (
          <div className="flex items-center justify-center h-96 py-20">
            <Loader2 className="animate-spin text-zinc-800 w-12 h-12" />
          </div>
        ) : (
          <div className="p-8 md:p-16">
            <div className="space-y-12">
              {groupedAyats.map(group => (
                <div key={group.surah.number} className="space-y-8">
                  {/* Surah Header for the page */}
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-8">
                    <div className="flex items-center gap-3">
                      <AyatFrame number={group.surah.number} size="sm" frameId={ayatFrameId} />
                      <h2 className="font-bold text-lg text-zinc-200">{group.surah.englishName}</h2>
                    </div>
                    <span className="text-2xl font-arabic text-zinc-500">{group.surah.name}</span>
                  </div>

                  {group.ayats[0]?.numberInSurah === 1 && group.surah.number !== 9 && <BismillahHeader />}
                  
                  {viewMode === 'page' ? (
                    /* Page View: Continuous Arabic Text Flow */
                    <div className="text-right leading-[2.5] md:leading-[3] animate-in fade-in duration-700" dir="rtl">
                      {group.ayats.map((a: any) => (
                        <span key={a.number} className="inline transition-all duration-300">
                          <span className="text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }}>
                            {a.text}
                          </span>
                          <span className="inline-block mx-4 align-middle select-none">
                            <AyatFrame 
                              number={a.numberInSurah} 
                              frameId={ayatFrameId} 
                              size="md"
                            />
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    /* Ayat View: Vertical study layout with translations */
                    <div className="space-y-12 animate-in fade-in duration-700">
                      {group.ayats.map((a: any) => (
                        <div key={a.number} className="space-y-4">
                          <div className="text-left">
                            <span className="text-[10px] font-black text-zinc-700 tracking-widest uppercase">
                              {group.surah.number}:{a.numberInSurah}
                            </span>
                          </div>
                          
                          <p className="text-right font-arabic leading-relaxed text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }} dir="rtl">
                            {a.text}
                            <span className="inline-block ms-6 align-middle select-none">
                              <AyatFrame 
                                number={a.numberInSurah} 
                                frameId={ayatFrameId} 
                                size="md"
                              />
                            </span>
                          </p>
                          
                          <div className="space-y-2">
                            {localSettings.showTransliteration && a.translit && (
                              <p 
                                className="text-left max-w-3xl text-zinc-500 font-medium leading-relaxed italic border-l border-zinc-900 pl-4" 
                                style={{ fontSize: `${transFontSize - 2}px` }}
                              >
                                {a.translit}
                              </p>
                            )}
                            {localSettings.showTranslation && a.trans && (
                              <p 
                                className="text-left max-w-3xl text-zinc-400 font-medium leading-relaxed italic border-l border-zinc-900 pl-4" 
                                style={{ fontSize: `${transFontSize}px` }}
                              >
                                {a.trans}
                              </p>
                            )}
                          </div>
                          
                          <div className="h-px bg-zinc-900 w-full mt-8" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Audio Section */}
      {isReading && localSettings.showAudio && localSettings.preferredAudioId !== 'none' && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in slide-in-from-bottom-8 duration-500">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl p-4 shadow-2xl flex items-center gap-6">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shrink-0 border border-zinc-800">
               <Volume2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-bold text-white truncate">Reciting: {editions?.find(e => e.id === localSettings.preferredAudioId)?.name || 'Selected Reciter'}</p>
               <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button className="h-12 w-12 rounded-2xl bg-white text-black hover:bg-zinc-200">
                 <Mic2 className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-white">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {isReading && (
        <div className="flex items-center justify-between px-6 md:px-10 pb-32 md:pb-4">
          <Button 
            variant="ghost" 
            className="rounded-xl h-10 md:h-12 px-3 md:px-6 gap-2 text-zinc-500 hover:text-white font-bold text-xs md:text-sm"
            onClick={() => {
              setCurrentPage(prev => Math.max(1, prev - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" /> Next Page
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-xl h-10 md:h-12 px-3 md:px-6 gap-2 text-zinc-500 hover:text-white font-bold text-xs md:text-sm"
            onClick={() => {
              setCurrentPage(prev => Math.min(604, prev + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={currentPage >= 604}
          >
            Prev Page <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
