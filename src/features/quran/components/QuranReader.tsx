
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
  Languages
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';

export function QuranReader() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialMode = searchParams.get('mode') as 'ayat' | 'page' | 'index' || 'index';
  const initialIndexType = searchParams.get('type') as 'surah' | 'juz' || 'surah';
  const initialPage = parseInt(searchParams.get('page') || '1');
  const initialTrans = searchParams.get('trans') || 'en.sahih';

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'ayat' | 'page' | 'index'>(initialMode);
  const [indexType, setIndexType] = useState<'surah' | 'juz'>(initialIndexType);
  const [loadingContent, setLoadingContent] = useState(false);
  const [quranData, setQuranData] = useState<{ arabic: any[], trans: any[] }>({ arabic: [], trans: [] });
  const [selectedTranslation, setSelectedTranslation] = useState(initialTrans);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', viewMode);
    params.set('trans', selectedTranslation);
    if (viewMode === 'index') {
      params.set('type', indexType);
      params.delete('page');
    } else {
      params.delete('type');
      params.set('page', currentPage.toString());
    }
    router.replace(`/quran?${params.toString()}`, { scroll: false });
  }, [viewMode, indexType, currentPage, selectedTranslation, router, searchParams]);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'quran_editions'), 
    where('isActive', '==', true),
    where('dataSync', '==', 'yes')
  ), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const translations = useMemo(() => {
    return editions?.filter(e => e.type === 'translation' || e.id !== 'quran-uthmani') || [];
  }, [editions]);

  const metaRef = useMemoFirebase(() => doc(db, 'quran_metadata', 'global'), [db]);
  const { data: metadata, isLoading: isMetaLoading } = useDoc(metaRef);

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings } = useDoc(settingsRef);
  const ayatFrameId = settings?.ayatFrameId || 'royal-ornate';
  const customAyatFramePath = settings?.customAyatFramePath;
  const frameImageUrl = settings?.frameImageUrl;

  useEffect(() => {
    async function fetchPage() {
      if (viewMode === 'index') return;
      setLoadingContent(true);
      try {
        const q = query(collection(db, 'quran'), where('pages', 'array-contains', currentPage));
        const snapshots = await getDocs(q);
        const pageArabic: any[] = [];
        const pageTrans: any[] = [];

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
                surah: { number: s.surahNumber, name: s.name, englishName: s.englishName } 
              });
              
              const transSurah = docsByEdition[selectedTranslation];
              if (transSurah) {
                const matchingAyat = transSurah.ayats.find((ta: any) => ta.number === a.number);
                if (matchingAyat) {
                  pageTrans.push(matchingAyat);
                }
              }
            }
          });
        });
        
        pageArabic.sort((a, b) => a.number - b.number);
        const alignedTrans = pageArabic.map(aa => pageTrans.find(tt => tt.number === aa.number));

        setQuranData({ arabic: pageArabic, trans: alignedTrans });
      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoadingContent(false); 
      }
    }
    fetchPage();
  }, [currentPage, selectedTranslation, viewMode, db]);

  const groupedAyats = useMemo(() => {
    const groups: any[] = [];
    quranData.arabic.forEach((ayat, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.surah.number !== ayat.surah.number) {
        groups.push({ 
          surah: ayat.surah, 
          ayats: [{ ...ayat, trans: quranData.trans[idx]?.translationText }] 
        });
      } else {
        last.ayats.push({ ...ayat, trans: quranData.trans[idx]?.translationText });
      }
    });
    return groups;
  }, [quranData]);

  const handleJumpToPage = (page: number) => {
    setCurrentPage(page);
    setViewMode('page'); 
  };

  const handleJumpToSurah = (surahNum: number) => {
    setLoadingContent(true);
    getDocs(query(collection(db, 'quran'), where('editionId', '==', 'quran-uthmani'), where('surahNumber', '==', surahNum)))
      .then(snap => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.pages && data.pages.length > 0) {
            setCurrentPage(data.pages[0]);
            setViewMode('ayat'); 
          }
        }
      })
      .finally(() => setLoadingContent(false));
  };

  const toggleIndex = (type: 'surah' | 'juz') => {
    setIndexType(type);
    setViewMode('index');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col space-y-6">
      {/* Primary Header */}
      <div className="flex flex-row justify-between items-center bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl gap-4">
        <div className="flex flex-col justify-center">
          <h1 className="text-xl md:text-2xl font-headline font-bold text-white">
            {viewMode === 'index' ? 'Quran' : (groupedAyats[0]?.surah.englishName || 'Quran')}
          </h1>
          {viewMode !== 'index' && (
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">
              Page {currentPage} / 604
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-2xl border border-zinc-900">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toggleIndex('surah')} 
            className={cn("rounded-xl font-bold h-10 px-4 md:px-6", (viewMode === 'index' && indexType === 'surah') ? "bg-zinc-800 text-white" : "text-zinc-500")}
          >
            <Grid3X3 className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Surah List</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toggleIndex('juz')} 
            className={cn("rounded-xl font-bold h-10 px-4 md:px-6", (viewMode === 'index' && indexType === 'juz') ? "bg-zinc-800 text-white" : "text-zinc-500")}
          >
            <Layers className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Juz List</span>
          </Button>
        </div>
      </div>

      {/* Reading Controls Bar - Visible only when not in index mode */}
      {viewMode !== 'index' && (
        <div className="flex flex-wrap items-center justify-between bg-zinc-950/50 backdrop-blur-md p-4 rounded-3xl border border-zinc-900 gap-4">
          <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-2xl border border-zinc-900">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('ayat')} 
              className={cn("rounded-xl font-bold h-9 px-4 md:px-6", (viewMode === 'ayat') ? "bg-zinc-800 text-white" : "text-zinc-500")}
            >
              <Type className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Ayat View</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setViewMode('page')} 
              className={cn("rounded-xl font-bold h-9 px-4 md:px-6", (viewMode === 'page') ? "bg-zinc-800 text-white" : "text-zinc-500")}
            >
              <BookIcon className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Page View</span>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-40 md:w-56">
              <Select value={selectedTranslation} onValueChange={setSelectedTranslation}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 h-10 rounded-xl text-zinc-300 text-[10px] md:text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <Languages className="w-3 h-3 text-zinc-500" />
                    <SelectValue placeholder="Translation" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                  {translations.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl border-zinc-800 h-10 w-10 shrink-0"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="bg-zinc-900 px-3 h-10 flex items-center justify-center rounded-xl font-bold text-[10px] text-zinc-400 min-w-[50px] border border-zinc-800 shrink-0">
                {currentPage}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl border-zinc-800 h-10 w-10 shrink-0"
                onClick={() => setCurrentPage(prev => Math.min(604, prev + 1))} 
                disabled={currentPage >= 604}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <Card className="flex-1 bg-zinc-950 border-zinc-900 overflow-hidden shadow-2xl rounded-[2.5rem] flex flex-col">
        {viewMode === 'index' ? (
          <ScrollArea className="flex-1">
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
                      onClick={() => handleJumpToSurah(surah.number)}
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
                      <span className="text-lg font-arabic text-zinc-500 group-hover:text-zinc-200 transition-colors">{surah.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metadata?.juzs?.references?.map((juz: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => handleJumpToPage(juz.ayah || 1)}
                      className="group flex items-center justify-between p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-5">
                        <AyatFrame number={idx + 1} size="sm" frameId={ayatFrameId} customPath={customAyatFramePath} customImageUrl={frameImageUrl} />
                        <div>
                          <h3 className="font-bold text-zinc-200">Juz {idx + 1}</h3>
                          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Starting at Surah {juz.surah}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-400 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        ) : loadingContent ? (
          <div className="flex items-center justify-center h-full py-20">
            <Loader2 className="animate-spin text-zinc-800 w-12 h-12" />
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-10 md:p-20">
              {viewMode === 'ayat' ? (
                <div className="space-y-16">
                  {groupedAyats.map(group => (
                    <div key={group.surah.number} className="space-y-12">
                      {group.ayats.map((a: any) => (
                        <div key={a.number} className="flex gap-8 group">
                          <div className="w-10 pt-2 shrink-0 flex justify-center">
                            <AyatFrame 
                              number={a.numberInSurah} 
                              frameId={ayatFrameId} 
                              customPath={customAyatFramePath} 
                              customImageUrl={frameImageUrl}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 space-y-8">
                            <p className="text-right text-4xl md:text-6xl font-arabic leading-[2] text-zinc-100" dir="rtl">
                              {a.text}
                            </p>
                            {a.trans && (
                              <p className="text-zinc-500 text-xl font-medium border-l-2 border-zinc-900 pl-8 italic">
                                {a.trans}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-right font-arabic leading-[3] text-4xl md:text-7xl text-zinc-100" style={{ direction: 'rtl' }}>
                  {quranData.arabic.map((a, idx) => (
                    <span key={a.number} className="hover:text-white transition-colors group relative inline-block">
                      {a.text} 
                      <span className="inline-flex mx-2 align-middle">
                        <AyatFrame 
                          number={a.numberInSurah} 
                          size="md" 
                          frameId={ayatFrameId} 
                          customPath={customAyatFramePath} 
                          customImageUrl={frameImageUrl}
                        />
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
