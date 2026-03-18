"use client";

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
  Layout,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { AyatFrame } from '@/components/quran/AyatFrame';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isReading = (viewMode === 'surah' && selectedSurah !== null) || 
                    (viewMode === 'juz' && selectedJuz !== null) || 
                    (viewMode === 'page' && selectedPage !== null);

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

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
          return { surahNumber: s.surahNumber, name: s.name, englishName: s.englishName, ayats };
        }).filter(c => c.ayats.length > 0).sort((a, b) => (a.surahNumber || 0) - (b.surahNumber || 0));
        setContent(mergedContent);
      } catch (e) { console.error("Fetch error", e); } finally { setLoadingContent(false); }
    }
    fetchReaderData();
  }, [isReading, viewMode, selectedSurah, selectedJuz, selectedPage, db, localSettings.preferredTranslationId, localSettings.preferredTransliterationId]);

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/quran?${nextParams.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-32 lg:pb-8 max-w-6xl">
      {/* Header Controls */}
      <header className="sticky top-0 lg:top-[4.5rem] z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {isReading ? (
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={() => navigateTo({ mode: 'surah', surah: null, juz: null, page: null })}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="bg-primary text-primary-foreground p-2 rounded-xl">
                <BookOpen className="h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isReading ? (viewMode === 'surah' ? content[0]?.englishName : viewMode === 'juz' ? `Juz ${selectedJuz}` : `Page ${selectedPage}`) : "The Noble Quran"}
              </h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                {isReading ? (content[0]?.name) : "Divine Revelations"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isReading && (
              <div className="bg-muted rounded-full p-1 flex gap-1">
                {(['surah', 'juz', 'page'] as const).map(m => (
                  <Button 
                    key={m} 
                    variant={viewMode === m ? 'default' : 'ghost'} 
                    size="sm" 
                    className="rounded-full text-xs font-bold uppercase tracking-wider px-4 h-8"
                    onClick={() => navigateTo({ mode: m })}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            )}
            <Button variant="outline" size="icon" asChild className="rounded-full h-10 w-10">
              <Link href="/quran/settings"><Settings className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {!isReading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isMetaLoading ? (
            <div className="col-span-full py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-muted-foreground" /></div>
          ) : viewMode === 'surah' ? (
            metadata?.surahs?.references?.map((s: any) => (
              <Card key={s.number} className="group cursor-pointer border-none bg-muted/30 transition-all hover:bg-muted/50 hover:ring-1 hover:ring-primary" onClick={() => navigateTo({ mode: 'surah', surah: s.number.toString() })}>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-background rounded-lg flex items-center justify-center font-bold text-xs border border-muted shadow-sm">{s.number}</div>
                    <div>
                      <h3 className="font-bold text-sm leading-tight">{s.englishName}</h3>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{s.numberOfAyahs} Verses</p>
                    </div>
                  </div>
                  <span className="text-xl font-arabic text-muted-foreground group-hover:text-foreground transition-colors">{s.name}</span>
                </CardContent>
              </Card>
            ))
          ) : viewMode === 'juz' ? (
            Array.from({ length: 30 }).map((_, i) => (
              <Card key={i} className="cursor-pointer border-none bg-muted/30 hover:bg-muted/50 transition-all" onClick={() => navigateTo({ mode: 'juz', juz: (i + 1).toString() })}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <AyatFrame number={i + 1} size="sm" />
                    <span className="font-bold">Juz {i + 1}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
              {Array.from({ length: 604 }).map((_, i) => (
                <Button key={i} variant="outline" size="sm" className="h-12 bg-muted/30 border-none font-bold text-xs hover:bg-primary hover:text-primary-foreground" onClick={() => navigateTo({ mode: 'page', page: (i + 1).toString() })}>
                  {i + 1}
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-12 pb-20">
          {loadingContent ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">Preparing Script...</p>
            </div>
          ) : (
            content.map((surah) => (
              <div key={surah.surahNumber} className="space-y-8 animate-in fade-in duration-1000">
                {surah.surahNumber !== 9 && surah.ayats.some(a => a.numberInSurah === 1) && (
                  <div className="text-center py-16">
                    <span className="text-4xl md:text-6xl font-arabic text-foreground">{BISMILLAH_TEXT}</span>
                  </div>
                )}
                
                <div className="space-y-16">
                  {surah.ayats.map((ayat, aIdx) => (
                    <div key={`${ayat.number}-${aIdx}`} className="group relative flex flex-col items-center space-y-8 py-8 px-4 md:px-12 border-b last:border-b-0">
                      {/* Ayat Control Bar */}
                      <div className="w-full flex items-center justify-between max-w-4xl border-b border-muted pb-4">
                        <Badge variant="outline" className="font-mono text-[10px] tracking-widest border-muted-foreground/20">
                          {surah.surahNumber}:{ayat.numberInSurah}
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-primary hover:text-primary-foreground transition-all" onClick={() => playAudio(ayat.number)}>
                            {playingAyat === ayat.number ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                          </Button>
                        </div>
                      </div>

                      {/* Arabic Text */}
                      <p 
                        className="text-right font-arabic leading-[2.5] text-foreground text-3xl md:text-5xl max-w-4xl w-full" 
                        dir="rtl"
                      >
                        {ayat.text}
                        <span className="inline-block mr-6 align-middle">
                          <AyatFrame number={ayat.numberInSurah} frameId={localSettings.ayatFrameId} size="md" />
                        </span>
                      </p>

                      {/* Translations */}
                      <div className="w-full max-w-4xl space-y-4 pt-4">
                        {localSettings.showTransliteration && ayat.transliterationText && (
                          <p className="text-muted-foreground font-medium leading-relaxed italic text-sm md:text-base border-l-2 border-primary/20 pl-6">
                            {ayat.transliterationText}
                          </p>
                        )}
                        {localSettings.showTranslation && ayat.translationText && (
                          <p className="text-foreground font-medium leading-relaxed text-base md:text-xl text-justify">
                            {ayat.translationText}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          
          {/* Reader Pagination (for Page mode) */}
          {viewMode === 'page' && selectedPage && (
            <div className="flex items-center justify-between border-t pt-12">
              <Button variant="outline" size="lg" className="rounded-full px-8 font-bold" onClick={() => navigateTo({ page: (selectedPage - 1).toString() })} disabled={selectedPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous Page
              </Button>
              <Badge variant="secondary" className="px-6 py-2 text-sm font-bold uppercase tracking-widest rounded-full">Page {selectedPage}</Badge>
              <Button variant="outline" size="lg" className="rounded-full px-8 font-bold" onClick={() => navigateTo({ page: (selectedPage + 1).toString() })} disabled={selectedPage === 604}>
                Next Page <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
