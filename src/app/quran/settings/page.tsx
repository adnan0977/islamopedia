
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
  FilterX,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
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
  const [langFilter, setLangFilter] = useState('all');

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

  const filteredEditions = useMemo(() => {
    if (!editions) return [];
    return editions.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(editionSearch.toLowerCase()) || 
                           e.englishName.toLowerCase().includes(editionSearch.toLowerCase());
      const matchesLang = langFilter === 'all' || e.language === langFilter;
      return matchesSearch && matchesLang;
    });
  }, [editions, editionSearch, langFilter]);

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
        <p className="text-zinc-500 font-medium">Loading preferences...</p>
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
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Personalize Recitation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
           <CheckCircle2 className="w-3 h-3 text-emerald-500" />
           Auto-saved locally
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-zinc-500" />
                Available Languages
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                   <button
                     onClick={() => setLangFilter('all')}
                     className={cn(
                       "shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border transition-all",
                       langFilter === 'all' ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-900 hover:border-zinc-700"
                     )}
                   >
                     All
                   </button>
                   {languages.map(l => (
                     <button
                       key={l}
                       onClick={() => setLangFilter(l)}
                       className={cn(
                         "shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border transition-all",
                         langFilter === l ? "bg-white text-black border-white" : "text-zinc-500 border-zinc-900 hover:border-zinc-700"
                       )}
                     >
                       {l}
                     </button>
                   ))}
                </div>
              </ScrollArea>

              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Select Edition for {langFilter === 'all' ? 'any language' : langFilter}</Label>
                <ScrollArea className="h-64 border border-zinc-900 rounded-2xl bg-zinc-900/20">
                  <div className="p-2 space-y-1">
                    {filteredEditions.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setLocalSettings(prev => ({ ...prev, preferredTranslationId: t.id }))}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group",
                          localSettings.preferredTranslationId === t.id ? "bg-zinc-100 text-black shadow-lg" : "text-zinc-400 hover:bg-zinc-900"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{t.name}</span>
                          <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest">{t.language} • {t.type}</span>
                        </div>
                        {localSettings.preferredTranslationId === t.id && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

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
                  <Label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black">Arabic Font Size</Label>
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
                  <Label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black">Translation Font Size</Label>
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
        </div>

        <div className="space-y-6">
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
                        ? "bg-zinc-900 border-zinc-500 shadow-lg" 
                        : "bg-zinc-950 border-zinc-900 hover:border-zinc-700"
                    )}
                  >
                    <AyatFrame number={7} frameId={frame.id} size="sm" />
                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-tight">{frame.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl sticky top-32">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="space-y-6">
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
                      size="md"
                    />
                  </span>
                </p>
                <p 
                  className="font-medium leading-relaxed italic border-l border-zinc-900 pl-4 transition-all duration-300 text-left text-zinc-400"
                  style={{ fontSize: `${localSettings.translationFontSize}px` }}
                >
                  {currentEdition?.type === 'transliteration' ? 'al-ḥamdu lillāhi rabbi l-ʿālamīn' : '[All] praise is [due] to Allah, Lord of the worlds -'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
