
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection, useDoc } from '@/firebase';
import { query, collection, where, doc } from 'firebase/firestore';
import { 
  Settings, 
  ArrowLeft, 
  Type, 
  Languages, 
  Hash, 
  Loader2, 
  Sparkles,
  BookOpen,
  CheckCircle2,
  Search,
  FilterX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AYAT_FRAMES, AyatFrame } from '@/components/quran/AyatFrame';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function QuranSettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [localSettings, setLocalSettings] = useState({
    arabicFontSize: 40,
    translationFontSize: 16,
    preferredTranslationId: 'en.sahih',
    ayatFrameId: 'royal-ornate'
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [editionSearch, setEditionSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'translation' | 'transliteration'>('all');

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'quran_editions'), 
    where('isActive', '==', true),
    where('dataSync', '==', 'yes')
  ), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const filteredEditions = useMemo(() => {
    if (!editions) return [];
    return editions.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(editionSearch.toLowerCase()) || 
                           e.englishName.toLowerCase().includes(editionSearch.toLowerCase());
      const matchesType = typeFilter === 'all' || e.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [editions, editionSearch, typeFilter]);

  const appSettingsRef = useMemoFirebase(() => doc(db, 'settings', 'app_config'), [db]);
  const { data: appSettings } = useDoc(appSettingsRef);

  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setLocalSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse local quran settings", e);
      }
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    localStorage.setItem(storageKey, JSON.stringify(localSettings));
  }, [localSettings, isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-medium">Loading local preferences...</p>
      </div>
    );
  }

  const currentEdition = editions?.find(e => e.id === localSettings.preferredTranslationId);
  const customFrames = appSettings?.savedCustomFrames || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10 pb-32">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()}
            className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-headline font-bold text-white">Quran Settings</h1>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Device-Specific Preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
           <CheckCircle2 className="w-3 h-3 text-emerald-500" />
           Changes saved instantly
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-zinc-500" />
                Typography
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-zinc-400 text-xs uppercase tracking-widest font-black">Arabic Font Size</Label>
                  <span className="text-xs font-mono text-zinc-500">{localSettings.arabicFontSize}px</span>
                </div>
                <Slider 
                  value={[localSettings.arabicFontSize]} 
                  min={24} 
                  max={80} 
                  step={2}
                  onValueChange={([val]) => setLocalSettings(prev => ({ ...prev, arabicFontSize: val }))}
                  className="py-4"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-zinc-400 text-xs uppercase tracking-widest font-black">Translation Font Size</Label>
                  <span className="text-xs font-mono text-zinc-500">{localSettings.translationFontSize}px</span>
                </div>
                <Slider 
                  value={[localSettings.translationFontSize]} 
                  min={12} 
                  max={32} 
                  step={1}
                  onValueChange={([val]) => setLocalSettings(prev => ({ ...prev, translationFontSize: val }))}
                  className="py-4"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Languages className="w-4 h-4 text-zinc-500" />
                Selected Edition
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between bg-zinc-900 border-zinc-800 rounded-xl h-14 text-white hover:bg-zinc-900/80">
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs font-bold">{currentEdition?.name || 'Select Edition'}</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{currentEdition?.language || 'Language'} • {currentEdition?.type || 'Type'}</span>
                    </div>
                    <Languages className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-zinc-950 border-zinc-800 p-0 rounded-2xl overflow-hidden shadow-2xl z-[100]">
                  <div className="p-4 border-b border-zinc-900 bg-zinc-900/50 space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <Input 
                        placeholder="Search translations..." 
                        className="bg-zinc-950 border-zinc-800 h-9 pl-9 text-xs rounded-lg"
                        value={editionSearch}
                        onChange={(e) => setEditionSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      {['all', 'translation', 'transliteration'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t as any)}
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-md border",
                            typeFilter === t ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-800"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                      {filteredEditions.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setLocalSettings(prev => ({ ...prev, preferredTranslationId: t.id }))}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                            localSettings.preferredTranslationId === t.id ? "bg-white text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-900"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{t.name}</span>
                            <span className="text-[9px] text-zinc-500">{t.language}</span>
                          </div>
                          {localSettings.preferredTranslationId === t.id && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-zinc-500" />
                Verse Frame Style
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {AYAT_FRAMES.map(frame => (
                  <button
                    key={frame.id}
                    onClick={() => setLocalSettings(prev => ({ ...prev, ayatFrameId: frame.id }))}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      localSettings.ayatFrameId === frame.id 
                        ? "bg-zinc-900 border-zinc-500" 
                        : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                    )}
                  >
                    <AyatFrame number={7} frameId={frame.id} size="sm" />
                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-tight">{frame.name}</span>
                  </button>
                ))}
                {customFrames.map((frame: any) => (
                  <button
                    key={frame.id}
                    onClick={() => setLocalSettings(prev => ({ ...prev, ayatFrameId: frame.id }))}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                      localSettings.ayatFrameId === frame.id 
                        ? "bg-zinc-900 border-zinc-500" 
                        : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                    )}
                  >
                    <AyatFrame 
                      number={7} 
                      customPath={frame.path} 
                      customImageUrl={frame.imageUrl}
                      size="sm" 
                    />
                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-tight truncate w-full px-1">{frame.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl sticky top-32">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" />
                  Live Preview
                </CardTitle>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
                <p 
                  className="text-right font-arabic leading-relaxed text-zinc-100 transition-all duration-300" 
                  style={{ fontSize: `${localSettings.arabicFontSize}px` }}
                  dir="rtl"
                >
                  بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                </p>
                <p 
                  className="text-right font-arabic leading-relaxed text-zinc-100 transition-all duration-300" 
                  style={{ fontSize: `${localSettings.arabicFontSize}px` }}
                  dir="rtl"
                >
                  ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ
                  <span className="inline-block ms-4 align-middle">
                    <AyatFrame 
                      number={2} 
                      frameId={localSettings.ayatFrameId} 
                      customPath={appSettings?.savedCustomFrames?.find((f: any) => f.id === localSettings.ayatFrameId)?.path}
                      customImageUrl={appSettings?.savedCustomFrames?.find((f: any) => f.id === localSettings.ayatFrameId)?.imageUrl}
                      size="md"
                    />
                  </span>
                </p>
                <p 
                  className={cn(
                    "font-medium leading-relaxed italic border-l border-zinc-900 pl-4 transition-all duration-300 text-left",
                    currentEdition?.type === 'transliteration' ? "text-zinc-500" : "text-zinc-400"
                  )}
                  style={{ fontSize: `${localSettings.translationFontSize}px` }}
                >
                  {currentEdition?.type === 'transliteration' ? 'al-ḥamdu lillāhi rabbi l-ʿālamīn' : '[All] praise is [due] to Allah, Lord of the worlds -'}
                </p>
              </div>

              <div className="h-px bg-zinc-900 w-full" />

              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                 <div className="w-12 h-12 bg-zinc-900/50 rounded-full flex items-center justify-center border border-zinc-900">
                    <BookOpen className="w-6 h-6 text-zinc-700" />
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Reading Context</p>
                   <p className="text-xs text-zinc-500 font-medium italic">Previewing {currentEdition?.englishName}, Verse 2</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

