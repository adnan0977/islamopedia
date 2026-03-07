"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { getQuranSurahs, getPageDetails } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Book, Loader2, PlayCircle, PauseCircle, ArrowLeft, Sparkles, MapPin, Languages, LayoutList, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getSurahContext, type SurahContextOutput } from '@/ai/flows/quran-context-flow';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ViewMode = 'ayat' | 'page';

export default function QuranPage() {
  const db = useFirestore();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchPage, setSearchPage] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPageData, setSelectedPageData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('page');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Translation State
  const translationsRef = useMemoFirebase(() => collection(db, 'quran_translations'), [db]);
  const { data: activatedTranslations, isLoading: isTranslationsLoading } = useCollection(translationsRef);
  const [selectedEdition, setSelectedEdition] = useState<string>('en.sahih');

  // Fallback translation if none activated
  const displayTranslations = useMemo(() => {
    return activatedTranslations && activatedTranslations.length > 0 
      ? activatedTranslations 
      : [{ id: 'en.sahih', name: 'Sahih International', language: 'English' }];
  }, [activatedTranslations]);

  useEffect(() => {
    async function init() {
      try {
        const data = await getQuranSurahs();
        setSurahs(data.data);
      } catch (e) {
        console.error("Failed to fetch surahs", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchPage = async (page: number) => {
    setLoadingDetails(true);
    setAiContext(null);
    try {
      const data = await getPageDetails(page, selectedEdition);
      const ayahs = data.data[0].ayahs;
      const translation = data.data[1].ayahs;
      const audio = data.data[2].ayahs;

      setSelectedPageData({
        number: page,
        ayats: ayahs,
        translation: translation,
        audio: audio
      });
      
      // Determine the primary surah on this page for context
      const primarySurah = ayahs[0]?.surah;
      if (primarySurah) {
        fetchAiContext(primarySurah.number, primarySurah.englishName);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage, selectedEdition]);

  const fetchAiContext = async (number: number, name: string) => {
    setLoadingAi(true);
    try {
      const result = await getSurahContext({ surahNumber: number, surahName: name });
      setAiContext(result);
    } catch (error) {
      console.error("AI Context Error:", error);
    } finally {
      setLoadingAi(false);
    }
  };

  const [aiContext, setAiContext] = useState<SurahContextOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Group ayats by Surah on the current page
  const groupedAyats = useMemo(() => {
    if (!selectedPageData) return [];
    const groups: any[] = [];
    selectedPageData.ayats.forEach((ayat: any, idx: number) => {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.surah.number !== ayat.surah.number) {
        groups.push({
          surah: ayat.surah,
          ayats: [{ ...ayat, originalIdx: idx }]
        });
      } else {
        lastGroup.ayats.push({ ...ayat, originalIdx: idx });
      }
    });
    return groups;
  }, [selectedPageData]);

  const handlePageSelect = (page: number) => {
    if (page >= 1 && page <= 604) {
      setCurrentPage(page);
    }
  };

  const jumpToSurahPage = (surahNumber: number) => {
    const surah = surahs.find(s => s.number === surahNumber);
    // Find where the surah starts. This logic is an approximation without a direct mapping, 
    // but the API v1/surah returns the starting ayah index which we can use to guess or 
    // we can use a lookup if we had one. For now, selecting a surah in the sidebar will
    // navigate to its first page if we can fetch it.
    // In a real app, you'd have a mapping of Surah -> Start Page.
    // For now, let's keep the sidebar as pages since the user wants "always page wise".
  };

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 h-auto md:h-[calc(100vh-120px)] flex flex-col space-y-6 pb-24 md:pb-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500 flex-1 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-headline font-bold text-zinc-100 whitespace-nowrap flex items-center gap-3">
                Page {currentPage}
                <span className="text-zinc-600 text-lg font-medium hidden md:inline">/ 604</span>
              </h1>
              <p className="text-zinc-500 text-xs md:text-sm truncate">
                {selectedPageData?.ayats?.[0]?.surah?.englishName || 'Loading...'} 
                {groupedAyats.length > 1 && ` & ${groupedAyats[groupedAyats.length-1].surah.englishName}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Pagination Controls */}
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 rounded-xl p-1 shadow-lg mr-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                  onClick={() => handlePageSelect(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                  onClick={() => handlePageSelect(currentPage + 1)}
                  disabled={currentPage >= 604}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 bg-zinc-950 border-zinc-900 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all shadow-lg shrink-0"
                onClick={() => setViewMode(viewMode === 'ayat' ? 'page' : 'ayat')}
              >
                {viewMode === 'ayat' ? <BookOpen className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
              </Button>

              <Select value={selectedEdition} onValueChange={setSelectedEdition} disabled={isTranslationsLoading}>
                <SelectTrigger className="w-10 h-10 p-0 bg-zinc-950 border-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg hover:border-zinc-700 transition-colors">
                  <Languages className="w-5 h-5 shrink-0" />
                </SelectTrigger>
                <SelectContent align="end" className="bg-zinc-950 border-zinc-800">
                  {displayTranslations.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-300 focus:bg-zinc-900">
                      <div className="flex flex-col py-0.5">
                        <span className="font-bold text-xs">{t.name}</span>
                        <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{t.language}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className={cn(
                "relative transition-all duration-300 flex items-center",
                isSearchExpanded ? "w-40 md:w-64" : "w-10"
              )}>
                {isSearchExpanded ? (
                  <div className="flex items-center w-full bg-zinc-950 border border-zinc-900 rounded-xl h-10 shadow-lg animate-in slide-in-from-right-2 duration-300">
                    <Search className="ml-2 w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <Input 
                      ref={searchInputRef}
                      placeholder="Go to page (1-604)..." 
                      className="bg-transparent border-none focus-visible:ring-0 text-white placeholder:text-zinc-600 h-full w-full text-xs"
                      value={searchPage}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setSearchPage(val);
                          const pageNum = parseInt(val);
                          if (pageNum >= 1 && pageNum <= 604) {
                            setCurrentPage(pageNum);
                          }
                        }
                      }}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-full w-8 text-zinc-600 hover:text-white"
                      onClick={() => {
                        setIsSearchExpanded(false);
                        setSearchPage('');
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={() => setIsSearchExpanded(true)}
                    variant="outline"
                    size="icon"
                    className="w-10 h-10 bg-zinc-950 border-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg hover:border-zinc-700 transition-colors"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Page List Column */}
        <div className="md:col-span-4 flex flex-col space-y-4 h-full hidden md:flex">
          <ScrollArea className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-900 p-2 shadow-inner">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {Array.from({ length: 604 }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "flex items-center justify-center p-3 rounded-xl transition-all hover:bg-zinc-900 text-xs font-bold",
                      currentPage === pageNum ? "bg-zinc-900 ring-1 ring-zinc-700 text-white shadow-lg" : "text-zinc-500"
                    )}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Content View Column */}
        <div className="md:col-span-8 flex flex-col min-h-0 h-full">
          <Card className="flex-1 bg-zinc-950 border-zinc-900 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
            {loadingDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-4 p-8">
                <Loader2 className="animate-spin text-zinc-700 w-12 h-12" />
                <p className="text-center text-sm font-medium uppercase tracking-widest">Loading Page {currentPage}...</p>
              </div>
            ) : !selectedPageData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-4 p-8">
                <Book className="w-16 h-16 opacity-10" />
                <p className="text-center text-sm font-medium">Unable to load page data.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 md:p-6 space-y-10">
                  {/* Historical Context Card */}
                  {aiContext && (
                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-900 p-6 md:p-8 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
                             <Sparkles className="w-5 h-5 text-zinc-500" />
                           </div>
                           <h3 className="font-bold text-lg text-zinc-100">Revelation Insights</h3>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                           <MapPin className="w-3 h-3" />
                           {aiContext.historicalPeriod}
                        </div>
                      </div>
                      <div className="space-y-6 animate-in fade-in duration-700">
                         <div className="space-y-4">
                            <p className="text-sm md:text-base leading-relaxed text-zinc-400 font-medium italic border-l-2 border-zinc-800 pl-6">
                              {aiContext.revelationStory}
                            </p>
                         </div>
                         <div className="flex flex-wrap gap-2 pt-4">
                            {aiContext.keyThemes.map((theme, i) => (
                              <Badge key={i} variant="secondary" className="bg-zinc-800/50 text-zinc-400 hover:text-zinc-100 border-none px-4 py-1 rounded-lg text-[10px] font-bold">
                                {theme}
                              </Badge>
                            ))}
                         </div>
                      </div>
                    </div>
                  )}

                  {viewMode === 'ayat' ? (
                    /* Ayat View */
                    <div className="space-y-12">
                      {groupedAyats.map((group) => (
                        <div key={group.surah.number} className="space-y-8">
                          <div className="flex items-center gap-4 py-4 border-b border-zinc-900">
                            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-xs font-black text-zinc-600">
                              {group.surah.number}
                            </div>
                            <h2 className="text-xl font-headline font-bold text-zinc-300">
                              Surah {group.surah.englishName}
                            </h2>
                          </div>
                          {group.ayats.map((ayat: any) => (
                            <div key={ayat.number} className="group space-y-8 pb-10 border-b border-zinc-900/50 last:border-none">
                                <div className="flex items-start justify-between gap-6">
                                  <div className="flex flex-col gap-3">
                                    <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[10px] font-black text-zinc-600">
                                      {ayat.numberInSurah}
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-10 w-10 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900 rounded-xl border border-zinc-900 transition-all"
                                      onClick={() => {
                                          const audioUrl = selectedPageData.audio[ayat.originalIdx].audio;
                                          const audio = new Audio(audioUrl);
                                          if (playingAyat === ayat.number) {
                                            setPlayingAyat(null);
                                          } else {
                                            setPlayingAyat(ayat.number);
                                            audio.play();
                                            audio.onended = () => setPlayingAyat(null);
                                          }
                                      }}
                                    >
                                      {playingAyat === ayat.number ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                                    </Button>
                                  </div>
                                  <p className="flex-1 text-right text-3xl md:text-4xl font-arabic leading-[1.8] text-zinc-100">
                                    {ayat.text}
                                  </p>
                                </div>
                                <div className="max-w-3xl bg-zinc-900/30 p-6 rounded-3xl border border-zinc-900/50">
                                  <p className="text-sm md:text-lg text-zinc-400 leading-relaxed font-medium">
                                    {selectedPageData.translation[ayat.originalIdx].text}
                                  </p>
                                </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Page View */
                    <div className="py-8 px-4 md:px-12 bg-zinc-950 rounded-[3rem] border border-zinc-900 shadow-inner">
                      <div 
                        className="text-right font-arabic leading-[2.5] text-3xl md:text-5xl text-zinc-100 space-x-1 space-x-reverse"
                        style={{ textAlign: 'justify', direction: 'rtl' }}
                      >
                        {selectedPageData.ayats.map((ayat: any) => (
                          <span key={ayat.number} className="inline group cursor-pointer hover:text-white transition-colors">
                            {ayat.text}
                            <span className="inline-flex items-center justify-center w-10 h-10 mx-2 text-xs border border-zinc-800 rounded-full text-zinc-600 font-sans font-bold group-hover:border-zinc-500 group-hover:text-zinc-300">
                              {ayat.numberInSurah}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
