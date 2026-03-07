
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { query, collection, where } from 'firebase/firestore';
import { 
  Settings, 
  ArrowLeft, 
  Type, 
  Loader2, 
  CheckCircle2,
  Globe,
  Eye,
  DownloadCloud,
  Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { AYAT_FRAMES } from '@/components/quran/AyatFrame';
import { AyatFrame } from '@/components/quran/AyatFrame';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getFullQuran } from '@/lib/api';
import { saveOfflineSurah, getOfflineEditionStatus } from '@/lib/offline-db';
import { Progress } from '@/components/ui/progress';

export default function QuranSettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [localSettings, setLocalSettings] = useState({
    arabicFontSize: 40,
    translationFontSize: 16,
    preferredLanguage: 'English',
    preferredTranslationId: 'none',
    preferredTransliterationId: 'none',
    preferredAudioId: 'none',
    ayatFrameId: 'royal-ornate',
    showTranslation: true,
    showTransliteration: true,
    showAudio: true
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'quran_editions'), 
    where('isActive', '==', true)
  ), [db]);
  const { data: editions } = useCollection(editionsQuery);

  const languages = useMemo(() => {
    if (!editions) return [];
    const langs = Array.from(new Set(editions.map(e => e.language))).sort();
    return langs;
  }, [editions]);

  const translationOptions = useMemo(() => {
    if (!editions) return [];
    return editions.filter(e => e.language === localSettings.preferredLanguage && e.type === 'translation');
  }, [editions, localSettings.preferredLanguage]);

  const transliterationOptions = useMemo(() => {
    if (!editions) return [];
    return editions.filter(e => e.language === localSettings.preferredLanguage && e.type === 'transliteration');
  }, [editions, localSettings.preferredLanguage]);

  const audioOptions = useMemo(() => {
    if (!editions) return [];
    return editions.filter(e => e.format === 'audio' || e.type === 'audio');
  }, [editions]);

  useEffect(() => {
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLocalSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setIsLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;
    const storageKey = user ? `vlognest_quran_settings_${user.uid}` : 'vlognest_quran_settings_guest';
    localStorage.setItem(storageKey, JSON.stringify(localSettings));
  }, [localSettings, isLoaded, user]);

  const downloadEdition = async (editionId: string) => {
    if (!editionId || editionId === 'none') return;
    
    const isSynced = await getOfflineEditionStatus(editionId);
    if (isSynced) return;

    setIsDownloading(true);
    setDownloadProgress(10);
    try {
      const payload = await getFullQuran(editionId);
      const surahs = payload.data.surahs;
      
      for (let i = 0; i < surahs.length; i++) {
        const surah = surahs[i];
        await saveOfflineSurah({
          id: `${editionId}_surah_${surah.number}`,
          editionId,
          number: surah.number,
          data: surah
        });
        setDownloadProgress(Math.round(10 + ((i + 1) / surahs.length) * 90));
      }
      
      toast({ title: "Sync Complete", description: `${editionId} is now available offline.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Sync Failed", description: "Could not download edition for offline use." });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
        <p className="text-zinc-500 font-medium">Loading preferences...</p>
      </div>
    );
  }

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
           Offline Ready
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
                <Select 
                  value={localSettings.preferredLanguage} 
                  onValueChange={(val) => setLocalSettings(prev => ({ ...prev, preferredLanguage: val }))}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">2. Selected Translation</Label>
                <Select 
                  value={localSettings.preferredTranslationId} 
                  onValueChange={(val) => {
                    setLocalSettings(prev => ({ ...prev, preferredTranslationId: val }));
                    downloadEdition(val);
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {translationOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">3. Selected Transliteration</Label>
                <Select 
                  value={localSettings.preferredTransliterationId} 
                  onValueChange={(val) => {
                    setLocalSettings(prev => ({ ...prev, preferredTransliterationId: val }));
                    downloadEdition(val);
                  }}
                >
                  <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {transliterationOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
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
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {audioOptions.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.language})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {isDownloading && (
                <div className="space-y-3 pt-4 border-t border-zinc-900">
                  <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2">
                       <DownloadCloud className="w-3 h-3 animate-bounce" /> Offline Syncing...
                     </span>
                     <span className="text-xs font-mono text-zinc-500">{downloadProgress}%</span>
                  </div>
                  <Progress value={downloadProgress} className="h-1 bg-zinc-900" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-500" />
                Display Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <Label className="text-sm font-bold text-zinc-300">Show Translation</Label>
                <Switch 
                  checked={localSettings.showTranslation}
                  onCheckedChange={(val) => setLocalSettings(prev => ({ ...prev, showTranslation: val }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <Label className="text-sm font-bold text-zinc-300">Show Transliteration</Label>
                <Switch 
                  checked={localSettings.showTransliteration}
                  onCheckedChange={(val) => setLocalSettings(prev => ({ ...prev, showTransliteration: val }))}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                <Label className="text-sm font-bold text-zinc-300">Show Audio Controls</Label>
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
                  min={24} max={80} step={2}
                  onValueChange={([val]) => setLocalSettings(prev => ({ ...prev, arabicFontSize: val }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black">Text Font Size</Label>
                  <span className="text-xs font-mono text-zinc-500">{localSettings.translationFontSize}px</span>
                </div>
                <Slider 
                  value={[localSettings.translationFontSize]} 
                  min={12} max={32} step={1}
                  onValueChange={([val]) => setLocalSettings(prev => ({ ...prev, translationFontSize: val }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl sticky top-32">
            <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40 text-center">
               <Database className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Recitation Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <p 
                className="text-right font-arabic leading-relaxed text-zinc-100" 
                style={{ fontSize: `${localSettings.arabicFontSize}px` }}
                dir="rtl"
              >
                ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ
                <span className="inline-block mr-4 align-middle">
                  <AyatFrame number={2} frameId={localSettings.ayatFrameId} size="md" />
                </span>
              </p>
              <div className="space-y-4">
                {localSettings.showTransliteration && localSettings.preferredTransliterationId !== 'none' && (
                  <p 
                    className="font-medium leading-relaxed italic text-zinc-500"
                    style={{ fontSize: `${localSettings.translationFontSize - 2}px` }}
                  >
                    al-ḥamdu lillāhi rabbi l-ʿālamīn
                  </p>
                )}
                {localSettings.showTranslation && localSettings.preferredTranslationId !== 'none' && (
                  <p 
                    className="font-medium leading-relaxed italic text-zinc-400"
                    style={{ fontSize: `${localSettings.translationFontSize}px` }}
                  >
                    [All] praise is [due] to Allah, Lord of the worlds -
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
