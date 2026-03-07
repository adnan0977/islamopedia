"use client";

import { useEffect, useState } from 'react';
import { getQuranSurahs, getSurahDetails } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Book, Loader2, PlayCircle, PauseCircle, ArrowLeft, Sparkles, MapPin, Languages, LayoutList, BookOpen } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = 'ayat' | 'page';

export default function QuranPage() {
  const db = useFirestore();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ayat');
  
  // Translation State
  const translationsRef = useMemoFirebase(() => collection(db, 'quran_translations'), [db]);
  const { data: activatedTranslations, isLoading: isTranslationsLoading } = useCollection(translationsRef);
  const [selectedEdition, setSelectedEdition] = useState<string>('en.sahih');

  // Fallback translation if none activated
  const displayTranslations = activatedTranslations && activatedTranslations.length > 0 
    ? activatedTranslations 
    : [{ id: 'en.sahih', name: 'Sahih International', language: 'English' }];

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

  // Update surah content if translation or Surah selection changes
  const selectSurah = async (id: number) => {
    setLoadingDetails(true);
    setAiContext(null);
    try {
      const data = await getSurahDetails(id, selectedEdition);
      const surahInfo = surahs.find(s => s.number === id);
      setSelectedSurah({
        info: surahInfo,
        ayats: data.data[0].ayahs,
        translation: data.data[1].ayahs,
        audio: data.data[2].ayahs
      });
      
      fetchAiContext(id, surahInfo.englishName);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedSurah) {
      selectSurah(selectedSurah.info.number);
    }
  }, [selectedEdition]);

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

  // AI Context State
  const [aiContext, setAiContext] = useState<SurahContextOutput | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const filteredSurahs = surahs.filter(s => 
    s.englishName.toLowerCase().includes(search.toLowerCase()) || 
    s.name.includes(search)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 h-auto md:h-[calc(100vh-120px)] flex flex-col space-y-6 pb-24 md:pb-0">
      {/* Dynamic Header Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-3">
          {selectedSurah && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden" 
              onClick={() => setSelectedSurah(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-zinc-100">
              {selectedSurah ? selectedSurah.info.englishName : 'Quran Majeed'}
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm">
              {selectedSurah 
                ? `${selectedSurah.info.englishNameTranslation} • ${selectedSurah.info.numberOfAyahs} Ayahs` 
                : 'Read, listen, and contemplate the Word of Allah.'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Translation Selection Trigger */}
          <div className="relative">
            <Select value={selectedEdition} onValueChange={setSelectedEdition} disabled={isTranslationsLoading}>
              <SelectTrigger className="bg-zinc-950 border-zinc-900 h-11 rounded-xl text-white min-w-[140px] md:min-w-[180px] shadow-lg hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <Languages className="w-4 h-4 text-zinc-500 shrink-0" />
                  <SelectValue placeholder="Translation" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800">
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
          </div>

          {/* Search Trigger/Input */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder="Search Surah..." 
              className="pl-10 bg-zinc-950 border-zinc-900 h-11 rounded-xl text-white shadow-lg focus:border-zinc-700 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Surah List Column */}
        <div className={cn(
          "md:col-span-4 flex flex-col space-y-4 h-full",
          selectedSurah ? "hidden md:flex" : "flex"
        )}>
          <ScrollArea className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-900 p-2 shadow-inner">
            {loading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
            ) : (
              <div className="space-y-1">
                {filteredSurahs.map((surah) => (
                  <button
                    key={surah.number}
                    onClick={() => selectSurah(surah.number)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl transition-all hover:bg-zinc-900 text-left group",
                      selectedSurah?.info?.number === surah.number ? "bg-zinc-900 ring-1 ring-zinc-700 shadow-lg" : ""
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center font-bold text-xs border border-zinc-800 group-hover:border-zinc-700 text-zinc-400">
                        {surah.number}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-200">{surah.englishName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-black h-4 px-1 border-zinc-800 text-zinc-500">
                            {surah.revelationType === 'Meccan' ? 'Macci' : 'Madina'}
                          </Badge>
                          <span className="text-[10px] text-zinc-600 font-bold">{surah.numberOfAyahs} Ayahs</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-arabic text-zinc-400 group-hover:text-zinc-100 transition-colors">{surah.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Content Viewer Column */}
        <div className={cn(
          "md:col-span-8 flex flex-col min-h-0 h-full",
          selectedSurah ? "flex" : "hidden md:flex"
        )}>
          <Card className="flex-1 bg-zinc-950 border-zinc-900 flex flex-col overflow-hidden shadow-2xl rounded-2xl">
            {!selectedSurah ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 space-y-4 p-8">
                <Book className="w-16 h-16 opacity-10" />
                <p className="text-center text-sm font-medium">Select a surah to begin reading.</p>
              </div>
            ) : (
              <>
                <CardHeader className="border-b border-zinc-900 bg-zinc-950/50 p-4 md:p-6 shrink-0">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl md:text-2xl text-zinc-100">{selectedSurah.info.englishName}</CardTitle>
                        <Badge className={cn(
                          "uppercase tracking-[0.2em] font-black text-[9px] px-3 h-6",
                          selectedSurah.info.revelationType === 'Meccan' ? "bg-zinc-800 text-zinc-300" : "bg-zinc-100 text-zinc-900"
                        )}>
                          {selectedSurah.info.revelationType === 'Meccan' ? 'Macci' : 'Madina'}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs md:text-sm text-zinc-500">{selectedSurah.info.englishNameTranslation}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-2xl md:text-3xl font-arabic text-zinc-100">{selectedSurah.info.name}</p>
                      
                      {/* View Mode Switcher Moved Inside Ayat Page */}
                      <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)} className="mt-2">
                        <TabsList className="bg-zinc-900 border border-zinc-800 h-9 p-1 rounded-lg">
                          <TabsTrigger value="ayat" className="h-7 rounded-md data-[state=active]:bg-zinc-800 text-[10px] font-bold gap-1.5 px-3">
                            <LayoutList className="w-3.5 h-3.5" />
                            Ayat
                          </TabsTrigger>
                          <TabsTrigger value="page" className="h-7 rounded-md data-[state=active]:bg-zinc-800 text-[10px] font-bold gap-1.5 px-3">
                            <BookOpen className="w-3.5 h-3.5" />
                            Page
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </div>
                </CardHeader>
                
                <ScrollArea className="flex-1">
                  <div className="p-4 md:p-6 space-y-10">
                    
                    {/* AI Historical Insight Section */}
                    <div className="bg-zinc-900/40 rounded-3xl border border-zinc-900 p-6 md:p-8 space-y-6">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center">
                             <Sparkles className="w-5 h-5 text-zinc-500" />
                           </div>
                           <h3 className="font-bold text-lg text-zinc-100">Historical Context</h3>
                        </div>
                        {aiContext && (
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                             <MapPin className="w-3 h-3" />
                             {aiContext.historicalPeriod}
                          </div>
                        )}
                      </div>

                      {loadingAi ? (
                        <div className="py-8 flex flex-col items-center justify-center space-y-4">
                           <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
                           <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Generating Revelation Narrative...</p>
                        </div>
                      ) : aiContext ? (
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
                      ) : (
                        <p className="text-xs text-zinc-600 text-center italic">Failed to load historical insights.</p>
                      )}
                    </div>

                    {loadingDetails ? (
                      <div className="p-12 flex flex-col items-center justify-center space-y-4">
                          <Loader2 className="animate-spin text-zinc-700 w-8 h-8" />
                          <p className="text-sm text-zinc-600">Syncing verses...</p>
                      </div>
                    ) : viewMode === 'ayat' ? (
                      /* Ayat Reading View */
                      <div className="space-y-12">
                        {selectedSurah.ayats.map((ayat: any, idx: number) => (
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
                                        const audio = new Audio(selectedSurah.audio[idx].audio);
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
                                  {selectedSurah.translation[idx].text}
                                </p>
                              </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Page Reading View */
                      <div className="py-8 px-4 md:px-12 bg-zinc-950 rounded-[3rem] border border-zinc-900 shadow-inner">
                        <div 
                          className="text-right font-arabic leading-[2.5] text-3xl md:text-5xl text-zinc-100 space-x-1 space-x-reverse"
                          style={{ textAlign: 'justify', direction: 'rtl' }}
                        >
                          {selectedSurah.ayats.map((ayat: any) => (
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
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
