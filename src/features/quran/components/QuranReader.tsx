
"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen,
  List,
  ArrowLeft,
  Database,
  Settings,
  Play,
  Square,
  Layout
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import Link from 'next/link';
import { useDoc } from '@/firebase';

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
  const modeParam = searchParams.get('mode') as QuranViewMode;
  const surahParam = searchParams.get('surah');
  const juzParam = searchParams.get('juz');
  const pageParam = searchParams.get('page');

  const [viewMode, setViewMode] = useState<QuranViewMode>(modeParam || 'surah');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(surahParam ? parseInt(surahParam) : null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(juzParam ? parseInt(juzParam) : null);
  const [selectedPage, setSelectedPage] = useState<number | null>(pageParam ? parseInt(pageParam) : null);

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
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);
  
  const ayatScrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isReading = (viewMode === 'surah' && selectedSurah !== null) || 
                    (viewMode === 'juz' && selectedJuz !== null) || 
                    (viewMode === 'page' && selectedPage !== null);

  const arabicFontSize = localSettings.arabicFontSize;
  const transFontSize = localSettings.translationFontSize;
  const ayatFrameId = localSettings.ayatFrameId || 'ornate-star';

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Sync State FROM URL
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

  const cleanAyatText = (text: string, surahNumber: number, ayatNumberInSurah: number) => {
    if (surahNumber !== 9 && ayatNumberInSurah === 1 && text.startsWith(BISMILLAH_TEXT)) {
      return text.substring(BISMILLAH_TEXT.length).trim() || text;
    }
    return text;
  };

  const playAudio = (globalNumber: number) => {
    if (playingAyat === globalNumber) {
      audioRef.current?.pause();
      setPlayingAyat(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalNumber}.mp3`;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAyat(globalNumber);
    
    audio.play().catch(e => {
      console.error("Audio playback failed", e);
      setPlayingAyat(null);
    });

    audio.onended = () => setPlayingAyat(null);
  };

  // Content Fetching
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
        
        for (const editionId of editionsToFetch) {
          let q;
          if (viewMode === 'surah' && selectedSurah) {
            q = query(collection(db, 'quran'), where('editionId', '==', editionId), where('surahNumber', '==', selectedSurah));
          } else if (viewMode === 'juz' && selectedJuz) {
            q = query(collection(db, 'quran'), where('editionId', '==', editionId));
          } else if (viewMode === 'page' && selectedPage) {
            q = query(collection(db, 'quran'), where('editionId', '==', editionId), where('pages', 'array-contains', selectedPage));
          }

          if (q) {
            const snap = await getDocs(q);
            results[editionId] = snap.docs.map(d => d.data());
          }
        }

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
        }).filter(c => c.ayats.length > 0).sort((a, b) => (a.surahNumber || 0) - (b.surahNumber || 0));

        setContent(mergedContent);
      } catch (e) {
        console.error("Fetch error", e);
      } finally {
        setLoadingContent(false);
      }
    }

    fetchReaderData();
  }, [isReading, viewMode, selectedSurah, selectedJuz, selectedPage, db, localSettings.preferredTranslationId, localSettings.preferredTransliterationId]);

  const handleModeToggle = (mode: QuranViewMode) => {
    const params = new URLSearchParams();
    params.set('mode', mode);
    router.push(`/quran?${params.toString()}`);
  };

  const selectSurah = (num: number) => {
    const params = new URLSearchParams();
    params.set('mode', 'surah');
    params.set('surah', num.toString());
    router.push(`/quran?${params.toString()}`);
  };

  const selectJuz = (num: number) => {
    const params = new URLSearchParams();
    params.set('mode', 'juz');
    params.set('juz', num.toString());
    router.push(`/quran?${params.toString()}`);
  };

  const selectPage = (num: number) => {
    const params = new URLSearchParams();
    params.set('mode', 'page');
    params.set('page', num.toString());
    router.push(`/quran?${params.toString()}`);
  };

  const goBackToIndex = () => {
    const params = new URLSearchParams();
    params.set('mode', viewMode === 'page' ? 'surah' : viewMode);
    router.push(`/quran?${params.toString()}`);
  };

  const navigatePage = (dir: 'next' | 'prev') => {
    if (viewMode !== 'page' || !selectedPage) return;
    const next = dir === 'next' ? selectedPage + 1 : selectedPage - 1;
    if (next < 1 || next > 604) return;
    selectPage(next);
  };

  const toggleReaderViewMode = () => {
    const params = new URLSearchParams();
    if (viewMode !== 'page') {
      const firstPage = content[0]?.ayats[0]?.page || 1;
      params.set('mode', 'page');
      params.set('page', firstPage.toString());
    } else {
      const firstSurah = content[0]?.surahNumber || 1;
      params.set('mode', 'surah');
      params.set('surah', firstSurah.toString());
    }
    router.push(`/quran?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col space-y-4">
      {/* Header */}
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
                    {viewMode === 'page' && `Mushaf (Page ${selectedPage})`}
                  </h1>
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                    {viewMode === 'surah' ? `${content[0]?.ayats.length || 0} Verses` : viewMode === 'page' ? 'Book Reading View' : `Juz Reading`}
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleModeToggle('page')} 
                  className={cn(
                    "rounded-xl font-bold h-10 px-6 transition-all border border-transparent", 
                    viewMode === 'page' ? "bg-zinc-800 text-white border-zinc-700 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  Page
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {viewMode === 'page' && (
                  <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-900">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-white" onClick={() => navigatePage('prev')} disabled={selectedPage === 1}><ChevronLeft className="w-4 h-4" /></Button>
                    <div className="px-2 font-mono text-[10px] text-zinc-600 uppercase font-black">{selectedPage}</div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-white" onClick={() => navigatePage('next')} disabled={selectedPage === 604}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleReaderViewMode}
                  className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
                  title={viewMode === 'page' ? "Switch to Ayat View" : "Switch to Book View"}
                >
                  {viewMode === 'page' ? <List className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </Button>
              </div>
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
            ) : viewMode === 'juz' ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                {Array.from({ length: 604 }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => selectPage(i + 1)}
                    className="aspect-square bg-zinc-900/30 rounded-xl border border-zinc-900 flex items-center justify-center text-[10px] font-black text-zinc-600 hover:border-zinc-500 hover:text-white transition-all"
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div ref={ayatScrollContainerRef} className="flex-1 overflow-y-auto scrollbar-hide">
            {loadingContent ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
                <p className="text-zinc-600 font-medium">Preparing spiritual text...</p>
              </div>
            ) : (
              <div className="p-0">
                {content.map((surah) => (
                  <div key={surah.surahNumber} className="space-y-0">
                    {surah.surahNumber !== 9 && surah.ayats.some(a => a.numberInSurah === 1) && (
                      <div className="w-full flex flex-col items-center justify-center py-12 bg-zinc-900/10 border-b border-zinc-900/30">
                        <span className="text-3xl md:text-5xl font-arabic text-zinc-100">{BISMILLAH_TEXT}</span>
                      </div>
                    )}
                    
                    {viewMode === 'page' ? (
                      <div className="p-10 md:p-24 text-right flex flex-col items-center" dir="rtl">
                        <div className="max-w-4xl w-full">
                          <p 
                            className="font-arabic leading-[3.2] text-zinc-100 text-justify" 
                            style={{ fontSize: `${arabicFontSize}px` }}
                          >
                            {surah.ayats.map((ayat) => (
                              <span key={ayat.number} className="inline">
                                {ayat.text}
                                <span className="inline-flex mx-4 align-middle">
                                  <AyatFrame 
                                    number={ayat.numberInSurah} 
                                    frameId={ayatFrameId} 
                                    size="lg" 
                                  />
                                </span>
                              </span>
                            ))}
                          </p>
                        </div>
                        {/* Page Footer Navigation */}
                        <div className="mt-20 flex items-center justify-between w-full max-w-4xl border-t border-zinc-900 pt-8" dir="ltr">
                           <Button variant="outline" className="rounded-xl border-zinc-800 h-12 px-8 font-bold" onClick={() => navigatePage('prev')} disabled={selectedPage === 1}>
                             <ChevronLeft className="w-4 h-4 mr-2" /> Previous Page
                           </Button>
                           <div className="text-center">
                             <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.3em]">Page {selectedPage}</p>
                           </div>
                           <Button variant="outline" className="rounded-xl border-zinc-800 h-12 px-8 font-bold" onClick={() => navigatePage('next')} disabled={selectedPage === 604}>
                             Next Page <ChevronRight className="w-4 h-4 ml-2" />
                           </Button>
                        </div>
                      </div>
                    ) : (
                      surah.ayats.map((ayat, aIdx) => (
                        <div key={`${ayat.number}-${aIdx}`} className="flex flex-col items-center justify-center border-b border-zinc-900/30 p-8 md:p-24 min-h-[40vh]">
                          <div className="w-full max-w-4xl space-y-12 text-center">
                            <div className="flex items-center justify-between w-full border-b border-zinc-900 pb-4 mb-8">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Verse {ayat.numberInSurah}</span>
                              <Button 
                                variant="ghost" size="icon" 
                                className="rounded-full h-10 w-10 bg-zinc-900/50 text-zinc-500 hover:text-white"
                                onClick={() => playAudio(ayat.number)}
                              >
                                {playingAyat === ayat.number ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                              </Button>
                            </div>
                             <p className="text-right font-arabic leading-relaxed text-zinc-100" style={{ fontSize: `${arabicFontSize}px` }} dir="rtl">
                              {ayat.text}
                              <span className="inline-block mr-4 align-middle">
                                <AyatFrame number={ayat.numberInSurah} frameId={ayatFrameId} size="md" />
                              </span>
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
                      ))
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
