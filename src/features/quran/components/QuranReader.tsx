
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
  Languages,
  ArrowLeft,
  Database,
  Check,
  Settings,
  Search,
  FilterX,
  Globe,
  ChevronDown,
  Volume2,
  Mic2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
  const initialTrans = searchParams.get('trans') || 'en.sahih';
  const initialAudio = searchParams.get('audio') || '';

  // Local settings state
  const [localSettings, setLocalSettings] = useState({
    arabicFontSize: 40,
    translationFontSize: 16,
    preferredTranslationId: initialTrans,
    preferredAudioId: initialAudio,
    ayatFrameId: 'royal-ornate'
  });

  // State
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<'ayat' | 'page' | 'index'>(initialMode);
  const [indexType, setIndexType] = useState<'surah' | 'juz'>(initialIndexType);
  const [loadingContent, setLoadingContent] = useState(false);
  const [quranData, setQuranData] = useState<{ arabic: any[], trans: any[] }>({ arabic: [], trans: [] });
  const [selectedEditionId, setSelectedEditionId] = useState(initialTrans);
  const [selectedAudioId, setSelectedAudioId] = useState(initialAudio);
  
  // Selection UI Filters
  const [langFilter, setLangFilter] = useState('all');

  // Load from local storage on mount
  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(parsed);
        if (parsed.preferredTranslationId && !searchParams.get('trans')) {
          setSelectedEditionId(parsed.preferredTranslationId);
        }
        if (parsed.preferredAudioId && !searchParams.get('audio')) {
          setSelectedAudioId(parsed.preferredAudioId);
        }
      } catch (e) {
        console.error("Error parsing local quran settings", e);
      }
    }
  }, [user, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', viewMode);
    params.set('trans', selectedEditionId);
    if (selectedAudioId) params.set('audio', selectedAudioId);
    if (viewMode === 'index') {
      params.set('type', indexType);
      params.delete('page');
    } else {
      params.delete('type');
      params.set('page', currentPage.toString());
    }
    router.replace(`/quran?${params.toString()}`, { scroll: false });
  }, [viewMode, indexType, currentPage, selectedEditionId, selectedAudioId, router, searchParams]);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'quran_editions'), 
    where('isActive', '==', true),
    where('dataSync', '==', 'yes')
  ), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const languages = useMemo(() => {
    if (!editions) return [];
    return Array.from(new Set(editions.map(e => e.language))).sort();
  }, [editions]);

  const editionsForSelectedLang = useMemo(() => {
    if (!editions) return [];
    if (langFilter === 'all') return editions;
    return editions.filter(e => e.language === langFilter);
  }, [editions, langFilter]);

  const textEditions = useMemo(() => {
    return editionsForSelectedLang.filter(e => e.format === 'text' || e.type !== 'audio');
  }, [editionsForSelectedLang]);

  const audioEditions = useMemo(() => {
    return editionsForSelectedLang.filter(e => e.format === 'audio' || e.type === 'audio');
  }, [editionsForSelectedLang]);

  useEffect(() => {
    if (editions && selectedEditionId && langFilter === 'all') {
      const current = editions.find(e => e.id === selectedEditionId);
      if (current) setLangFilter(current.language);
    }
  }, [editions, selectedEditionId]);

  const metaRef = useMemoFirebase(() => doc(db, 'quran_metadata', 'global'), [db]);
  const { data: metadata, isLoading: isMetaLoading } = useDoc(metaRef);

  const settingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: settings } = useDoc(settingsRef);
  
  const arabicFontSize = localSettings.arabicFontSize;
  const transFontSize = localSettings.translationFontSize;
  const ayatFrameId = localSettings.ayatFrameId || settings?.ayatFrameId || 'ornate-star';
  const customAyatFramePath = settings?.customAyatFramePath;
  const frameImageUrl = settings?.frameImageUrl;

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
              
              const transSurah = docsByEdition[selectedEditionId];
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
  }, [currentPage, selectedEditionId, viewMode, db]);

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
      {/* Sticky Header */}
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="rounded-xl h-10 px-3 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all">
                      <Languages className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest">Recitation Hub</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-6 rounded-2xl shadow-2xl z-[100] space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">1. Select Language</span>
                      </div>
                      <Select value={langFilter} onValueChange={setLangFilter}>
                        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 h-11 text-xs rounded-xl text-white">
                          <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="all">All Languages</SelectItem>
                          {languages.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Type className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">2. Text Edition</span>
                      </div>
                      <Select value={selectedEditionId} onValueChange={setSelectedEditionId}>
                        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 h-11 text-xs rounded-xl text-white">
                          <SelectValue placeholder="Translation/Translit" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          {textEditions.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                          {textEditions.length === 0 && (
                            <div className="p-4 text-center text-xs text-zinc-700">None found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">3. Audio Reciter</span>
                      </div>
                      <Select value={selectedAudioId} onValueChange={setSelectedAudioId}>
                        <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 h-11 text-xs rounded-xl text-white">
                          <SelectValue placeholder="Choose Qari" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          {audioEditions.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                          {audioEditions.length === 0 && (
                            <div className="p-4 text-center text-xs text-zinc-700">None found</div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewMode(prev => prev === 'ayat' ? 'page' : 'ayat')} 
                  className="rounded-xl font-bold h-10 px-3 md:px-4 border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
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
                <div key={group.surah.number} className="space-y-12">
                  {group.ayats[0]?.numberInSurah === 1 && group.surah.number !== 9 && <BismillahHeader />}
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
                      
                      {a.trans && (
                        <div className="py-1">
                          <p 
                            className="text-left max-w-3xl text-zinc-400 font-medium leading-relaxed italic border-l border-zinc-900 pl-4" 
                            style={{ fontSize: `${transFontSize}px` }}
                          >
                            {a.trans}
                          </p>
                        </div>
                      )}
                      
                      <div className="h-px bg-zinc-900 w-full mt-8" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {isReading && (
        <div className="flex items-center justify-between px-6 md:px-10 pb-20 md:pb-4">
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
