
"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Trash2, 
  Loader2, 
  Search, 
  Download, 
  AlertCircle,
  CheckCircle2
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const db = useFirestore();
  const { toast } = useToast();

  const standardEdition = editions.find(e => e.id === 'quran-uthmani');
  const isStandardSynced = standardEdition?.dataSync === 'yes';

  const handleStandardSync = async () => {
    if (!standardEdition) {
      setDocumentNonBlocking(doc(db, 'quran_editions', 'quran-uthmani'), {
        id: 'quran-uthmani',
        name: 'Standard Arabic (Uthmani)',
        language: 'Arabic',
        languageCode: 'ar',
        isActive: true,
        isDefault: true,
        dataSync: 'no'
      }, { merge: true });
    }
    await performSync('quran-uthmani');
  };

  const performSync = async (editionId: string) => {
    setSyncing(true);
    setSyncStatus('fetching');
    setProgress(0);
    
    try {
      const isArabic = editionId === 'quran-uthmani';
      const arabicPayload = await getFullQuran('quran-uthmani');
      const transPayload = isArabic ? arabicPayload : await getFullQuran(editionId);

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
          const surahId = `${editionId}_surah_${sNum}`;
          
          const ayats = s.ayahs.map((a: any, aIdx: number) => ({
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
            translationText: isArabic ? null : tSurah.ayahs[aIdx].text,
            page: a.page,
            juz: a.juz
          }));

          batch.set(doc(db, 'quran', surahId), {
            id: surahId, 
            editionId: editionId, 
            surahNumber: sNum, 
            name: s.name, 
            englishName: s.englishName, 
            ayats, 
            pages: Array.from(new Set(ayats.map((a: any) => a.page))), 
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        await batch.commit();
        setProgress(Math.round(((i + chunk.length) / arabicSurahs.length) * 100));
      }

      updateDocumentNonBlocking(doc(db, 'quran_editions', editionId), { dataSync: 'yes' });
      setSyncStatus('success');
      toast({ title: "Sync Complete", description: `${editionId} is now live.` });
    } catch (e) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!isStandardSynced && !syncing && (
        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-200 rounded-3xl p-6">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="font-bold text-lg mb-2">Standard Quran Missing</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-amber-200/70 text-sm">
              The foundational Arabic Uthmani text has not been synchronized. This is required for the platform to function correctly.
            </p>
            <Button 
              onClick={handleStandardSync}
              className="bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl h-11 px-6 shrink-0"
            >
              <Download className="mr-2 h-4 w-4" /> Sync Standard Arabic
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isStandardSynced && (
         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Standard Arabic Text Ready</span>
         </div>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="directory" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Edition Directory</TabsTrigger>
          <TabsTrigger value="sync" className="px-8 rounded-xl h-full data-[state=active]:bg-white data-[state=active]:text-black transition-all font-bold">Database Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} />
        </TabsContent>
        <TabsContent value="sync">
          <SyncTool 
            editions={editions} 
            syncing={syncing} 
            performSync={performSync}
            handleStandardSync={handleStandardSync}
            isStandardSynced={isStandardSynced}
          />
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
          <p className="text-xs text-zinc-500 font-medium">Manage translation editions available for sync.</p>
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

function SyncTool({ editions, syncing, performSync, handleStandardSync, isStandardSynced }: { 
  editions: any[], 
  syncing: boolean, 
  performSync: (id: string) => Promise<void>,
  handleStandardSync: () => Promise<void>,
  isStandardSynced: boolean
}) {
  const [selectedEdition, setSelectedEdition] = useState('');

  return (
    <div className="space-y-6">
      {!isStandardSynced && (
        <Card className="bg-amber-500/5 border-amber-500/20 p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="space-y-2">
                <h4 className="font-bold text-white">Initialize Foundation</h4>
                <p className="text-sm text-zinc-500">The Standard Arabic (Uthmani) text is required before translations can be effectively used.</p>
             </div>
             <Button 
                onClick={handleStandardSync}
                disabled={syncing}
                className="bg-amber-500 text-black hover:bg-amber-400 font-bold rounded-xl h-12 px-8"
              >
                <Download className="mr-2 h-4 w-4" /> Sync Standard Now
             </Button>
          </div>
        </Card>
      )}

      <Card className="bg-zinc-950 border-zinc-900 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Available Editions</Label>
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
          <Button 
            className="bg-white text-black hover:bg-zinc-200 rounded-xl h-12 px-8 font-bold" 
            onClick={() => performSync(selectedEdition)} 
            disabled={syncing || !selectedEdition}
          >
            <Download className="mr-2 w-4 h-4" /> Start Sync
          </Button>
        </div>
      </Card>
    </div>
  );
}
