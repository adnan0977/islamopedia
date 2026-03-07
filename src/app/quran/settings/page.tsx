
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
  Book,
  Volume2,
  Mic2,
  Languages as TransliterationIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    preferredTransliterationId: 'none',
    preferredAudioId: 'none',
    ayatFrameId: 'royal-ornate',
    showTranslation: true,
    showTransliteration: true,
    showAudio: true
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

  const translationEditions = useMemo(() => {
    return editionsForSelectedLang.filter(e => e.type === 'translation' && e.format === 'text');
  }, [editionsForSelectedLang]);

  const transliterationEditions = useMemo(() => {
    return editionsForSelectedLang.filter(e => e.type === 'transliteration' && e.format === 'text');
  }, [editionsForSelectedLang]);

  const audioEditions = useMemo(() => {
    return editionsForSelectedLang.filter(e => e.format === 'audio' || e.type === 'audio');
  }, [editionsForSelectedLang]);

  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ 
          ...prev, 
          ...parsed,
          preferredTranslationId: parsed.preferredTranslationId || 'en.sahih',
          preferredTransliterationId: parsed.preferredTransliterationId || 'none',
          preferredAudioId: parsed.preferredAudioId || 'none',
          showTranslation: parsed.showTranslation ?? true,
          showTransliteration: parsed.showTransliteration ?? true,
          showAudio: parsed.showAudio ?? true
        }));
      } catch (e) {
        console.error("Failed to parse local quran settings", e);
      }
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (editions && localSettings.preferredTranslationId && localSettings.preferredTranslationId !== 'none' && langFilter === 'all') {
      const current = editions.find(e => e.id === localSettings.preferredTranslationId);
      if (current) {
        setLangFilter(current.language);
      }
    }
  }, [editions, localSettings.preferredTranslationId, langFilter]);

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

  const currentTranslation = editions?.find(e => e.id === localSettings.preferredTranslationId);

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
                Language & Editions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">1. Available Languages</Label>
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
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">2. Translation Edition</Label>
                <Select 
                  value={localSettings.preferredTranslationId} 
                  onValueChange={(val) => setLocalSettings(prev => ({ ...prev, preferredTranslationId: val }))}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue placeholder="Choose Translation" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {translationEditions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                    {translationEditions.length === 0 && (
                      <div className="p-4 text-center text-xs text-zinc-500">No translations found for this language</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">3. Transliteration Edition</Label>
                <Select 
                  value={localSettings.preferredTransliterationId} 
                  onValueChange={(val) => setLocalSettings(prev => ({ ...prev, preferredTransliterationId: val }))}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue placeholder="Choose Transliteration" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {transliterationEditions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">4. Audio Recitation</Label>
                <Select 
                  value={localSettings.preferredAudioId} 
                  onValueChange={(val) => setLocalSettings(prev => ({ ...prev, preferredAudioId: val }))}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue placeholder="Choose Qari" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {audioEditions.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-500" />
                Display Toggles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-zinc-300">Show Translation</Label>
                  <p className="text-[10px] text-zinc-500 font-medium">Display English meanings</p>
                </div>
                <Switch 
                  checked={localSettings.showTranslation}
                  onCheckedChange={(val) => setLocalSettings(prev => ({ ...prev, showTranslation: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-zinc-300">Show Transliteration</Label>
                  <p className="text-[10px] text-zinc-500 font-medium">Display phonetic guide</p>
                </div>
                <Switch 
                  checked={localSettings.showTransliteration}
                  onCheckedChange={(val) => setLocalSettings(prev => ({ ...prev, showTransliteration: val }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-zinc-300">Show Audio Player</Label>
                  <p className="text-[10px] text-zinc-500 font-medium">Display recitation controls</p>
                </div>
                <Switch 
                  checked={localSettings.showAudio}
                  onCheckedChange={(val) => setLocalSettings(prev => ({ ...prev, showAudio: val }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

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
                  <Label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black">Text Font Size</Label>
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
                <div className="space-y-4">
                  {localSettings.showTransliteration && localSettings.preferredTransliterationId !== 'none' && (
                    <p 
                      className="font-medium leading-relaxed italic transition-all duration-300 text-left text-zinc-500"
                      style={{ fontSize: `${localSettings.translationFontSize - 2}px` }}
                    >
                      al-ḥamdu lillāhi rabbi l-ʿālamīn
                    </p>
                  )}
                  {localSettings.showTranslation && (
                    <p 
                      className="font-medium leading-relaxed italic transition-all duration-300 text-left text-zinc-400"
                      style={{ fontSize: `${localSettings.translationFontSize}px` }}
                    >
                      {currentTranslation?.type === 'transliteration' ? 'al-ḥamdu lillāhi rabbi l-ʿālamīn' : '[All] praise is [due] to Allah, Lord of the worlds -'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
