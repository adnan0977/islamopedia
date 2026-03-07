
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
  Globe,
  Book
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
import { ScrollArea } from "@/components/area";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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

  const editionsForSelectedLang = useMemo(() => {
    if (!editions) return [];
    if (langFilter === 'all') return editions;
    return editions.filter(e => e.language === langFilter);
  }, [editions, langFilter]);

  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(parsed);
      } catch (e) {
        console.error("Failed to parse local quran settings", e);
      }
    }
    setIsLoaded(true);
  }, [user]);

  // When editions load, if we have a preferred ID, try to set the lang filter correctly
  useEffect(() => {
    if (editions && localSettings.preferredTranslationId && langFilter === 'all') {
      const current = editions.find(e => e.id === localSettings.preferredTranslationId);
      if (current) {
        setLangFilter(current.language);
      }
    }
  }, [editions, localSettings.preferredTranslationId]);

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
                Language & Translation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">1. Select Language</Label>
                <Select value={langFilter} onValueChange={setLangFilter}>
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue placeholder="Choose Language" />
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
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">2. Select Edition</Label>
                <Select 
                  value={localSettings.preferredTranslationId} 
                  onValueChange={(val) => setLocalSettings(prev => ({ ...prev, preferredTranslationId: val }))}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue placeholder="Choose Edition" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {editionsForSelectedLang.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.type})
                      </SelectItem>
                    ))}
                    {editionsForSelectedLang.length === 0 && (
                      <div className="p-4 text-center text-xs text-zinc-500">No editions available for this language</div>
                    )}
                  </SelectContent>
                </Select>
                {currentEdition && (
                   <p className="text-[10px] text-zinc-600 font-medium italic mt-2">
                     Current: {currentEdition.englishName} ({currentEdition.language})
                   </p>
                )}
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
