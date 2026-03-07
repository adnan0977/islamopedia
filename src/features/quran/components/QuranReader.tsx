
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Loader2, BookOpen, LayoutList, ChevronLeft, ChevronRight, List, Grid3X3, Layers } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function QuranReader() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URL Params for initial state
  const initialMode = searchParams.get('mode') as 'ayat' | 'page' | 'index' || 'page';
  const initialIndexType = searchParams.get('type') as 'surah' | 'juz' || 'surah';
  const initialPage = parseInt(searchParams.get('page') || '1');

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'ayat' | 'page' | 'index'>(initialMode);
  const [indexType, setIndexType] = useState<'surah' | 'juz'>(initialIndexType);
  const [loadingContent, setLoadingContent] = useState(false);
  const [quranData, setQuranData] = useState<{ arabic: any[], trans: any[] }>({ arabic: [], trans: [] });
  const [selectedEdition, setSelectedEdition] = useState('en.sahih');

  // Handle URL updates when state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', viewMode);
    if (viewMode === 'index') {
      params.set('type', indexType);
    } else {
      params.delete('type');
      params.set('page', currentPage.toString());
    }
    router.replace(`/quran?${params.toString()}`, { scroll: false });
  }, [viewMode, indexType, currentPage, router, searchParams]);

  const editionsRef = useMemoFirebase(() => collection(db, 'quran_editions'), [db]);
  const { data: editions } = useCollection(editionsRef);

  // Fetch Global Metadata for Indexing
  const metaRef = useMemoFirebase(() => doc(db, 'quran_metadata', 'global'), [db]);
  const { data: metadata, isLoading: isMetaLoading } = useDoc(metaRef);

  // Fetch global settings for Ayat Frame style
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

        snapshots.forEach(doc => {
          const s = doc.data();
          s.ayats.forEach((a: any) => {
            if (a.page === currentPage) {
              if (s.editionId === 'quran-uthmani') pageArabic.push({ ...a, surah: { number: s.surahNumber, name: s.name, englishName: s.englishName } });
              if (s.editionId === selectedEdition) pageTrans.push(a);
            }
          });
        });
        
        pageArabic.sort((a, b) => (a.numberInSurah - b.numberInSurah));
        setQuranData({ arabic: pageArabic, trans: pageTrans });
      } catch (e) { console.error(e); } finally { setLoadingContent(false); }
    }
    fetchPage();
  }, [currentPage, selectedEdition, viewMode, db]);

  const groupedAyats = useMemo(() => {
    const groups: any[] = [];
    quranData.arabic.forEach((ayat, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.surah.number !== ayat.surah.number) {
        groups.push({ surah: ayat.surah, ayats: [{ ...ayat, trans: quranData.trans[idx]?.translationText }] });
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
    // Basic heuristic to find the start page of a surah from metadata if available
    const surahRef = metadata?.surahs?.references?.find((s: any) => s.number === surahNum);
    // If metadata doesn't have page mapping yet, we'd need a more complex lookup
    // For now, let's assume we navigate to surah view mode or first page of surah
    // Since we browse by page primarily, we'd need metadata to have startPage
    // If not, we fetch the surah doc from 'quran' collection
    setLoadingContent(true);
    getDocs(query(collection(db, 'quran'), where('editionId', '==', 'quran-uthmani'), where('surahNumber', '==', surahNum)))
      .then(snap => {
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (data.pages && data.pages.length > 0) {
            setCurrentPage(data.pages[0]);
            setViewMode('page');
          }
        }
      })
      .finally(() => setLoadingContent(false));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 h-[calc(100vh-120px)] flex flex-col space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-950 p-6 rounded-[2rem] border border-zinc-900 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <AyatFrame 
            number={viewMode === 'index' ? (indexType === 'surah' ? '١' : '٣٠') : (groupedAyats[0]?.surah.number || currentPage)} 
            frameId={ayatFrameId} 
            customPath={customAyatFramePath} 
            customImageUrl={frameImageUrl}
            size="md" 
          />
          <div>
            <h1 className="text-2xl font-headline font-bold text-white">
              {viewMode === 'index' 
                ? (indexType === 'surah' ? 'Surah Index' : 'Juz Index') 
                : (groupedAyats[0]?.surah.englishName || 'Quran Reader')}
            </h1>
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">
              {viewMode === 'index' ? 'Navigation Hub' : `Page ${currentPage} / 604`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-2xl border border-zinc-900">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('index')} 
            className={cn("rounded-xl font-bold h-10 px-4", viewMode === 'index' ? "bg-zinc-800 text-white" : "text-zinc-500")}
          >
            <List className="w-4 h-4 mr-2" /> Index
          </Button>
          <div className="w-px h-6 bg-zinc-800 mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('page')} 
            className={cn("rounded-xl font-bold h-10 px-4", viewMode === 'page' ? "bg-zinc-800 text-white" : "text-zinc-500")}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Page
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setViewMode('ayat')} 
            className={cn("rounded-xl font-bold h-10 px-4", viewMode === 'ayat' ? "bg-zinc-800 text-white" : "text-zinc-500")}
          >
            <LayoutList className="w-4 h-4 mr-2" /> Verses
          </Button>
        </div>

        {viewMode !== 'index' && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl border-zinc-800 h-10 w-10"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="bg-zinc-900 px-4 h-10 flex items-center justify-center rounded-xl font-bold text-xs text-zinc-400 min-w-[80px] border border-zinc-800">
              {currentPage} / ٦٠٤
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl border-zinc-800 h-10 w-10"
              onClick={() => setCurrentPage(prev => Math.min(604, prev + 1))} 
              disabled={currentPage >= 604}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <Card className="flex-1 bg-zinc-950 border-zinc-900 overflow-hidden shadow-2xl rounded-[2.5rem] flex flex-col">
        {viewMode === 'index' ? (
          <ScrollArea className="flex-1">
            <div className="p-8 md:p-12 space-y-12">
              <div className="flex gap-4">
                <Button 
                  variant={indexType === 'surah' ? 'default' : 'outline'} 
                  onClick={() => setIndexType('surah')}
                  className="rounded-xl font-bold"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" /> Surah List
                </Button>
                <Button 
                  variant={indexType === 'juz' ? 'default' : 'outline'} 
                  onClick={() => setIndexType('juz')}
                  className="rounded-xl font-bold"
                >
                  <Layers className="w-4 h-4 mr-2" /> Juz List
                </Button>
              </div>

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
                          <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">{surah.numberOfAyahs} Verses • {surah.revelationType}</p>
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
                      onClick={() => handleJumpToPage(juz.ayah || 1)} // Juz metadata usually maps to a page/ayah
                      className="group flex items-center justify-between p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-5">
                        <AyatFrame number={idx + 1} size="sm" frameId={ayatFrameId} customPath={customAyatFramePath} customImageUrl={frameImageUrl} />
                        <div>
                          <h3 className="font-bold text-zinc-200">Juz {idx + 1}</h3>
                          <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Starting at Surah {juz.surah}, Ayah {juz.ayah}</p>
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
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                        <div className="flex items-center gap-4">
                          <AyatFrame 
                            number={group.surah.number} 
                            frameId={ayatFrameId} 
                            customPath={customAyatFramePath} 
                            customImageUrl={frameImageUrl}
                            size="md" 
                          />
                          <h2 className="text-xl font-headline font-bold text-zinc-400 uppercase tracking-widest">{group.surah.englishName}</h2>
                        </div>
                        <span className="text-2xl font-arabic text-zinc-600">{group.surah.name}</span>
                      </div>
                      
                      {group.ayats.map((a: any) => (
                        <div key={a.number} className="flex gap-8 group">
                          <div className="w-12 pt-2 shrink-0">
                            <AyatFrame 
                              number={a.numberInSurah} 
                              frameId={ayatFrameId} 
                              customPath={customAyatFramePath} 
                              customImageUrl={frameImageUrl}
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
                  {quranData.arabic.map(a => (
                    <span key={a.number} className="hover:text-white transition-colors">
                      {a.text} 
                      <span className="inline-flex mx-2">
                        <AyatFrame 
                          number={a.numberInSurah} 
                          size="lg" 
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
