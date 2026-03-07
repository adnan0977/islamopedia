
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trash2, 
  Loader2, 
  Search, 
  Languages, 
  Download, 
  Book 
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getAvailableTranslations, getFullQuran } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface QuranHubProps {
  editions: any[];
  syncing: boolean;
  setSyncing: (val: boolean) => void;
  setProgress: (val: number) => void;
  setSyncStatus: (val: any) => void;
}

const languageNameMap: Record<string, string> = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', fr: 'French', es: 'Spanish', de: 'German', id: 'Indonesian', tr: 'Turkish',
  zh: 'Chinese', ru: 'Russian', fa: 'Persian', bn: 'Bengali', hi: 'Hindi', ml: 'Malayalam', ta: 'Tamil', te: 'Telugu',
};

export function QuranHub({ editions, syncing, setSyncing, setProgress, setSyncStatus }: QuranHubProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="directory" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Edition Directory</TabsTrigger>
          <TabsTrigger value="sync" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Database Sync</TabsTrigger>
          <TabsTrigger value="viewer" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Data Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} />
        </TabsContent>
        <TabsContent value="sync">
          <SyncTool 
            editions={editions} 
            syncing={syncing} 
            setSyncing={setSyncing} 
            setProgress={setProgress} 
            setSyncStatus={setSyncStatus} 
          />
        </TabsContent>
        <TabsContent value="viewer">
          <DatabaseViewer editions={editions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditionDirectory({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAvailable = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTranslations();
      setAvailable(data.data || []);
    } catch (e) {
      toast({ variant: "destructive", title: "API Error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (openAdd && available.length === 0) fetchAvailable();
  }, [openAdd]);

  const toggleEdition = (edition: any) => {
    const existing = editions.find(t => t.id === edition.identifier);
    if (existing) {
      deleteDocumentNonBlocking(doc(db, 'quran_editions', edition.identifier));
      toast({ title: "Edition Deactivated" });
    } else {
      setDocumentNonBlocking(doc(db, 'quran_editions', edition.identifier), {
        id: edition.identifier,
        name: edition.name,
        language: languageNameMap[edition.language] || edition.language.toUpperCase(),
        languageCode: edition.language,
        isActive: true,
        isDefault: editions.length === 0,
        dataSync: 'no'
      }, { merge: true });
      toast({ title: "Edition Activated" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Edition Directory</h3>
          <p className="text-xs text-zinc-500 font-medium">Control translation editions available on the platform.</p>
        </div>
        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <Button className="rounded-xl h-11 px-6 font-bold bg-white text-black hover:bg-zinc-200">
              Browse API Editions
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[700px] p-0 h-[80vh] flex flex-col rounded-3xl">
            <DialogHeader className="p-6 border-b border-zinc-800 shrink-0">
              <DialogTitle className="text-white font-bold text-xl">Available Editions</DialogTitle>
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                  placeholder="Search API directory..." 
                  className="pl-10 bg-zinc-900 border-zinc-800 text-white rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 p-6">
              <div className="grid gap-2">
                {loading ? <Loader2 className="animate-spin text-zinc-500 mx-auto" /> : available.filter(a => a.name.toLowerCase().includes(search.toLowerCase())).map((item) => {
                  const isActivated = editions.some(t => t.id === item.identifier);
                  return (
                    <div key={item.identifier} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-sm">{item.name}</span>
                        <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">{languageNameMap[item.language] || item.language}</span>
                      </div>
                      <Button size="sm" variant={isActivated ? "destructive" : "secondary"} className="rounded-xl font-bold min-w-[100px]" onClick={() => toggleEdition(item)}>
                        {isActivated ? <Trash2 className="w-4 h-4" /> : 'Activate'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-3xl shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-6 text-zinc-500 pl-8">Edition Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Language</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Synced</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-zinc-500 pr-8">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editions.map((t) => (
              <TableRow key={t.id} className="hover:bg-zinc-900/40 transition-all border-zinc-900 h-20">
                <TableCell className="font-bold text-white pl-8">{t.name}</TableCell>
                <TableCell className="text-zinc-500 font-medium">{t.language}</TableCell>
                <TableCell>
                  {t.dataSync === 'yes' ? <Badge className="bg-emerald-500/10 text-emerald-500 border-none rounded-lg text-[9px] font-black uppercase">Yes</Badge> : <Badge variant="outline" className="border-zinc-800 text-zinc-600 rounded-lg text-[9px] font-black uppercase">No</Badge>}
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} className="text-destructive hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SyncTool({ editions, syncing, setSyncing, setProgress, setSyncStatus }: QuranHubProps) {
  const db = useFirestore();
  const { toast } = useToast();
  const [selectedEdition, setSelectedEdition] = useState('');

  const handleSync = async () => {
    if (!selectedEdition) return;
    setSyncing(true);
    setSyncStatus('fetching');
    setProgress(0);
    
    try {
      const isArabic = selectedEdition === 'quran-uthmani';
      const arabicPayload = await getFullQuran('quran-uthmani');
      const transPayload = isArabic ? arabicPayload : await getFullQuran(selectedEdition);

      setSyncStatus('saving');
      const arabicSurahs = arabicPayload.data.surahs;
      const transSurahs = transPayload.data.surahs;

      const batchSize = 10;
      for (let i = 0; i < arabicSurahs.length; i += batchSize) {
        const chunk = arabicSurahs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach((s: any, idx: number) => {
          const sNum = s.number;
          const tSurah = transSurahs[i + idx];
          const surahId = `${selectedEdition}_surah_${sNum}`;
          
          const ayats = s.ayahs.map((a: any, aIdx: number) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
            translationText: isArabic ? null : tSurah.ayahs[aIdx].text,
            page: a.page,
            juz: a.juz
          }));

          batch.set(doc(db, 'quran', surahId), {
            id: surahId, editionId: selectedEdition, surahNumber: sNum, name: s.name, englishName: s.englishName, ayats, pages: Array.from(new Set(ayats.map((a: any) => a.page))), updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / arabicSurahs.length) * 100));
      }

      updateDocumentNonBlocking(doc(db, 'quran_editions', selectedEdition), { dataSync: 'yes' });
      setSyncStatus('success');
      toast({ title: "Sync Complete" });
    } catch (e) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
      <div className="flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Edition</Label>
          <Select value={selectedEdition} onValueChange={setSelectedEdition}>
            <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-xl h-12 text-white">
              <SelectValue placeholder="Select edition to sync..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              {editions.map((t) => (
                <SelectItem key={t.id} value={t.id} disabled={t.dataSync === 'yes'}>
                  {t.name} {t.dataSync === 'yes' && '✓'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-8 font-bold" onClick={handleSync} disabled={syncing || !selectedEdition}>
          <Download className="mr-2 w-4 h-4" /> Start Sync
        </Button>
      </div>
    </Card>
  );
}

function DatabaseViewer({ editions }: { editions: any[] }) {
  const db = useFirestore();
  const [selectedEdition, setSelectedEdition] = useState('');
  const [filterMode, setFilterMode] = useState<'surah' | 'page'>('surah');
  const [currentNumber, setCurrentNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [surahData, setSurahData] = useState<any[]>([]);

  const fetchFromDB = async () => {
    if (!selectedEdition) return;
    setIsLoading(true);
    try {
      if (filterMode === 'surah') {
        const snap = await getDoc(doc(db, 'quran', `${selectedEdition}_surah_${currentNumber}`));
        setSurahData(snap.exists() ? [snap.data()] : []);
      } else {
        const q = query(collection(db, 'quran'), where('editionId', '==', selectedEdition), where('pages', 'array-contains', currentNumber));
        const snap = await getDocs(q);
        setSurahData(snap.docs.map(d => d.data()).sort((a, b) => a.surahNumber - b.surahNumber));
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchFromDB(); }, [selectedEdition, currentNumber, filterMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 bg-zinc-950 p-6 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-white">Database Viewer</h3>
          <p className="text-xs text-zinc-500 font-medium">Inspect synchronized data directly from Firestore.</p>
        </div>
        <div className="flex gap-4 w-full md:auto">
          <Select value={selectedEdition} onValueChange={setSelectedEdition}><SelectTrigger className="bg-zinc-900 text-white rounded-xl"><SelectValue placeholder="Edition"/></SelectTrigger><SelectContent className="bg-zinc-950 text-white">{editions.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
          <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}><SelectTrigger className="bg-zinc-900 text-white rounded-xl"><SelectValue/></SelectTrigger><SelectContent className="bg-zinc-950 text-white"><SelectItem value="surah">Surah</SelectItem><SelectItem value="page">Page</SelectItem></SelectContent></Select>
          <Input type="number" value={currentNumber} onChange={(e) => setCurrentNumber(parseInt(e.target.value) || 1)} className="bg-zinc-900 border-zinc-800 text-white rounded-xl w-24" />
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 rounded-3xl overflow-hidden shadow-2xl min-h-[400px]">
        {isLoading ? <div className="flex items-center justify-center h-full py-20"><Loader2 className="animate-spin text-zinc-500" /></div> : surahData.length > 0 ? (
          <ScrollArea className="h-[500px] p-8">
            {surahData.map(s => (
              <div key={s.id} className="space-y-6 mb-12">
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 border-b border-zinc-900 pb-2">Surah {s.surahNumber}. {s.englishName}</h4>
                <div className="space-y-6">{s.ayats.filter((a: any) => filterMode === 'surah' || a.page === currentNumber).map((a: any, i: number) => (
                  <div key={i} className="p-6 bg-zinc-900/30 rounded-2xl border border-zinc-900 space-y-4">
                    <div className="flex justify-between items-start"><Badge variant="outline" className="text-[9px] font-black border-zinc-800 text-zinc-600">AYAT {a.numberInSurah}</Badge><p className="flex-1 text-right text-2xl font-arabic text-zinc-100">{a.text}</p></div>
                    {a.translationText && <p className="text-zinc-500 text-sm italic">{a.translationText}</p>}
                  </div>
                ))}</div>
              </div>
            ))}
          </ScrollArea>
        ) : <div className="flex items-center justify-center py-20 text-zinc-600">No synchronized data found.</div>}
      </Card>
    </div>
  );
}
