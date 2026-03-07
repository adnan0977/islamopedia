
"use client";

import { useEffect, useState, useRef, useMemo } from 'react';
import { getQuranSurahs, getFullQuran } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Sparkles, MapPin, Languages, LayoutList, BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { getSurahContext, type SurahContextOutput } from '@/ai/flows/quran-context-flow';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

type ViewMode = 'ayat' | 'page';

export default function QuranPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchPage, setSearchPage] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState('page' as ViewMode);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Full Quran data states
  const [fullArabic, setFullArabic] = useState<any>(null);
  const [fullTranslation, setFullTranslation] = useState<any>(null);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const translationsRef = useMemoFirebase(() => collection(db, 'quran_translations'), [db]);
  const { data: activatedTranslations } = useCollection(translationsRef);
  const [selectedEdition, setSelectedEdition] = useState<string>('en.sahih');

  useEffect(() => {
    if (userProfile?.lastReadPage) {
      setCurrentPage(userProfile.lastReadPage);
    }
    if (userProfile?.preferredTranslationId) {
      setSelectedEdition(userProfile.preferredTranslationId);
    } else if (activatedTranslations && activatedTranslations.length > 0) {
      const defaultTrans = activatedTranslations.find(t => t.isDefault) || activatedTranslations[0];
      setSelectedEdition(defaultTrans.id);
    }
  }, [userProfile, activatedTranslations]);

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
        setLoadingSurahs(false);
      }
    }
    init();
  }, []);

  // Fetch full Quran content when selectedEdition changes
  useEffect(() => {
    async function fetchFullContent() {
      if (!selectedEdition) return;
      setLoadingContent(true);
      try {
        // Fetch Arabic base and selected Translation in parallel
        const [arabicRes, transRes] = await Promise.all([
          getFullQuran('quran-uthmani'),
          getFullQuran(selectedEdition)
        ]);
        setFullArabic(arabicRes.data);
        setFullTranslation(transRes.data);
      } catch (error) {
        console.error("Failed to fetch full Quran content", error);
      } finally {
        setLoadingContent(false);
      }
    }
    fetchFullContent();
  }, [selectedEdition]);

  // Derive page data from full Quran content
  const selectedPageData = useMemo(() => {
    if (!fullArabic || !fullTranslation) return null;

    const pageAyahsArabic: any[] = [];
    const pageAyahsTrans: any[] = [];

    // Filter ayahs for the current page from all surahs
    fullArabic.surahs.forEach((surah: any) => {
      surah.ayahs.forEach((ayah: any) => {
        if (ayah.page === currentPage) {
          pageAyahsArabic.push({ ...ayah, surah: { number: surah.number, name: surah.name, englishName: surah.englishName } });
        }
      });
    });

    fullTranslation.surahs.forEach((surah: any) => {
      surah.ayahs.forEach((ayah: any) => {
        if (ayah.page === currentPage) {
          pageAyahsTrans.push(ayah);
        }
      });
    });

    return {
      number: currentPage,
      ayats: pageAyahsArabic,
      translation: pageAyahsTrans
    };
  }, [fullArabic, fullTranslation, currentPage]);

  useEffect(() => {
    if (selectedPageData?.ayats?.[0]?.surah) {
      const primarySurah = selectedPageData.ayats[0].surah;
      fetchAiContext(primarySurah.number, primarySurah.englishName);
    }

    if (userProfileRef) {
      updateDocumentNonBlocking(userProfileRef, {
        lastReadPage: currentPage,
        preferredTranslationId: selectedEdition
      });
    }
  }, [currentPage, selectedPageData]);

  const [aiContext, setAiContext] = useState<SurahContextOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const fetchAiContext = async (number: number, name: string) => {
    setLoadingAi(true);
    setAiContext(null);
    try {
      const result = await getSurahContext({ surahNumber: number, surahName: name });
      setAiContext(result);
    } catch (error) {
      console.error("AI Context Error:", error);
    } finally {
      setLoadingAi(false);
    }
  };

  const groupedAyats = useMemo(() => {
    if (!selectedPageData?.ayats) return [];
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

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 h-auto md:h-[calc(100vh-120px)] flex flex-col space-y-6 pb-24 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-3">
             <h1 className="text-2xl md:text-3xl font-headline font-bold text-zinc-100 whitespace-nowrap">
              {selectedPageData?.ayats?.[0]?.surah?.englishName || 'Quran Majeed'}
            </h1>
            <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-500 font-black tracking-widest text-[10px] h-6 px-3">
              PAGE {currentPage}
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs md:text-sm truncate mt-1">
            Edition: {displayTranslations.find(t => t.id === selectedEdition)?.name || selectedEdition}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
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
            <div className="px-3 text-[10px] font-black text-zinc-600 border-x border-zinc-900/50">
              {currentPage} / 604
            </div>
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
            onClick={() => setViewMode(viewMode === 'ayat' ? 'page' : 'ayat')}
            className="w-10 h-10 bg-zinc-950 border-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg transition-colors"
          >
            {viewMode === 'ayat' ? <BookOpen className="w-5 h-5" /> : <LayoutList className="w-5 h-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className="w-10 h-10 bg-zinc-950 border-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg transition-colors"
              >
                <Languages className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-950 border-zinc-800 text-zinc-300 w-56">
              <DropdownMenuLabel>Translation Edition</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuRadioGroup value={selectedEdition} onValueChange={setSelectedEdition}>
                {displayTranslations.map((t) => (
                  <DropdownMenuRadioItem key={t.id} value={t.id} className="focus:bg-zinc-900">
                    <div className="flex flex-col py-0.5">
                      <span className="text-xs font-bold">{t.name}</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{t.language}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className={cn(
            "relative transition-all duration-300 flex items-center",
            isSearchExpanded ? "w-40 md:w-64" : "w-10"
          )}>
            {isSearchExpanded ? (
              <div className="flex items-center w-full bg-zinc-950 border border-zinc-900 rounded-xl h-10 shadow-lg animate-in slide-in-from-right-2 duration-300">
                <Search className="ml-2 w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <Input 
                  ref={searchInputRef}
                  placeholder="Page (1-604)..." 
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
                  onClick={() => { setIsSearchExpanded(false); setSearchPage(''); }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button 
                onClick={() => setIsSearchExpanded(true)}
                variant="outline"
                size="icon"
                className="w-10 h-10 bg-zinc-950 border-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 hover:text-white shadow-lg transition-colors"
              >
                <Search className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="md:col-span-3 lg:col-span-2 flex flex-col space-y-4 h-full hidden md:flex">
          <ScrollArea className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-900 p-2 shadow-inner">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 604 }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-lg transition-all hover:bg-zinc-900 text-[10px] font-bold",
                    currentPage === pageNum ? "bg-zinc-900 ring-1 ring-zinc-700 text-white" : "text-zinc-600"
                  )}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="md:col-span-9 lg:col-span-10 flex flex-col min-h-0 h-full">
          <Card className="flex-1 bg-zinc-950 border-zinc-900 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
            {loadingContent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-800 space-y-4">
                <Loader2 className="animate-spin w-12 h-12" />
                <p className="text-sm font-black uppercase tracking-widest">Loading Quran Content...</p>
              </div>
            ) : selectedPageData ? (
              <ScrollArea className="flex-1">
                <div className="p-4 md:p-8 space-y-12">
                  {aiContext && (
                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-900 p-6 md:p-10 space-y-8 animate-in fade-in duration-1000">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                             <Sparkles className="w-6 h-6 text-zinc-500" />
                           </div>
                           <h3 className="font-bold text-xl text-zinc-100">Historical Insights</h3>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 border-zinc-800 px-4 h-8 flex items-center gap-2">
                           <MapPin className="w-3.5 h-3.5" />
                           {aiContext.historicalPeriod}
                        </Badge>
                      </div>
                      <p className="text-sm md:text-lg leading-relaxed text-zinc-400 font-medium italic border-l-2 border-zinc-800 pl-8">
                        {aiContext.revelationStory}
                      </p>
                      <div className="flex flex-wrap gap-3 pt-4">
                        {aiContext.keyThemes.map((theme, i) => (
                          <Badge key={i} className="bg-zinc-800/50 text-zinc-500 border-none px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewMode === 'ayat' ? (
                    <div className="space-y-16">
                      {groupedAyats.map((group) => (
                        <div key={group.surah.number} className="space-y-10">
                          <div className="flex items-center gap-4 border-b border-zinc-900 pb-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Surah {group.surah.number}. {group.surah.englishName}</span>
                            <div className="flex-1 h-px bg-zinc-900" />
                          </div>
                          {group.ayats.map((ayat: any) => (
                            <div key={ayat.number} className="group space-y-10 pb-16 border-b border-zinc-900/50 last:border-none">
                                <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                                  <div className="flex md:flex-col gap-4 shrink-0">
                                    <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-[8px] font-black text-zinc-600">
                                      <span className="leading-none">{ayat.numberInSurah}</span>
                                      <span className="text-[6px] opacity-40 mt-1 uppercase">Page {currentPage}</span>
                                    </div>
                                  </div>
                                  <p className="flex-1 text-right text-3xl md:text-5xl font-arabic leading-[1.8] text-zinc-100">
                                    {ayat.text}
                                  </p>
                                </div>
                                <div className="bg-zinc-900/20 p-8 rounded-[2rem] border border-zinc-900/50">
                                  <p className="text-sm md:text-xl text-zinc-400 leading-relaxed font-medium">
                                    {selectedPageData.translation?.[ayat.originalIdx]?.text}
                                  </p>
                                </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 px-6 md:px-20 bg-zinc-950 rounded-[4rem] border border-zinc-900 shadow-inner">
                      <div 
                        className="text-right font-arabic leading-[2.5] text-3xl md:text-6xl text-zinc-100"
                        style={{ textAlign: 'justify', direction: 'rtl' }}
                      >
                        {selectedPageData?.ayats?.map((ayat: any) => (
                          <span key={ayat.number} className="inline group cursor-pointer hover:text-white transition-colors">
                            {ayat.text}
                            <span className="inline-flex items-center justify-center w-12 h-12 mx-3 text-sm border border-zinc-900 rounded-full text-zinc-700 font-sans font-black group-hover:border-zinc-600 group-hover:text-zinc-400 transition-all">
                              {ayat.numberInSurah}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
