"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, writeBatch, query, collection, limit, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Loader2, 
  AlertCircle,
  BookOpen,
  ChevronRight,
  Database,
  Power,
  PowerOff,
  CloudDownload,
  RefreshCw,
  Type as TypeIcon,
  Mic,
  ArrowLeft,
  Table as TableIcon,
  FileText,
  Pencil,
  Languages
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { getAllAlQuranEditions, getFullQuran, getQuranMetadata } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface QuranHubProps {
  editions: any[];
}

const languageNameMap: Record<string, string> = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', fr: 'French', es: 'Spanish', de: 'German', id: 'Indonesian', tr: 'Turkish',
  zh: 'Chinese', ru: 'Russian', fa: 'Persian', bn: 'Bengali', hi: 'Hindi', ml: 'Malayalam', ta: 'Tamil', te: 'Telugu',
};

export function QuranHub({ editions }: QuranHubProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const [syncState, setSyncState] = useState({
    isSyncing: false,
    progress: 0,
    status: 'idle'
  });

  const standardEdition = editions.find(e => e.id === 'quran-uthmani');
  const isStandardSynced = standardEdition?.dataSync === 'yes';

  const performSync = async (editionId: string) => {
    if (!editionId) return;
    setSyncState({ isSyncing: true, progress: 0, status: 'fetching' });
    try {
      const isArabic = editionId === 'quran-uthmani';
      const payload = await getFullQuran(editionId);
      if (!payload?.data?.surahs) throw new Error(`Failed to fetch edition ${editionId}.`);

      setSyncState(prev => ({ ...prev, status: 'saving' }));
      const surahs = payload.data.surahs;
      const batchSize = 5; 

      for (let i = 0; i < surahs.length; i += batchSize) {
        const chunk = surahs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach((s: any) => {
          const sNum = s.number;
          const surahId = `${editionId}_surah_${sNum}`;
          const ayats = s.ayahs.map((a: any) => ({
            number: a.number, numberInSurah: a.numberInSurah, text: a.text,
            translationText: isArabic ? null : a.text, page: a.page, juz: a.juz
          }));
          batch.set(doc(db, 'quran', surahId), {
            id: surahId, editionId: editionId, surahNumber: sNum, name: s.name, 
            englishName: s.englishName, ayats, pages: Array.from(new Set(ayats.map((a: any) => a.page))), 
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
        await batch.commit();
        const currentProgress = Math.round(((i + chunk.length) / surahs.length) * 100);
        setSyncState(prev => ({ ...prev, progress: currentProgress }));
      }
      updateDocumentNonBlocking(doc(db, 'quran_editions', editionId), { dataSync: 'yes' });
      toast({ title: "Sync Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
             <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border animate-pulse">
               <Database className="w-6 h-6 text-primary" />
             </div>
             <DialogHeader>
               <DialogTitle>Repository Sync</DialogTitle>
               <DialogDescription>Inducting scripture into the platform engine.</DialogDescription>
             </DialogHeader>
             <div className="w-full space-y-2">
               <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                 <span>{syncState.status}...</span>
                 <span>{syncState.progress}%</span>
               </div>
               <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                 <div className="h-full bg-primary transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isStandardSynced && !syncState.isSyncing && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
          <AlertCircle className="h-4 w-4 !text-amber-600" />
          <AlertTitle className="font-bold">Foundation Required</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-xs">Arabic Uthmani text must be synced for cross-reference consistency.</span>
            <Button size="sm" variant="outline" className="h-7 border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white" onClick={() => performSync('quran-uthmani')}>Sync Arabic</Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="directory">Editions</TabsTrigger>
          <TabsTrigger value="viewer">Inspector</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} performSync={performSync} syncing={syncState.isSyncing} />
        </TabsContent>
        <TabsContent value="viewer">
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border rounded-xl bg-muted/30">
            <BookOpen className="w-8 h-8 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Select an edition to begin granular auditing.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EditionDirectory({ editions, performSync, syncing }: { editions: any[], performSync: (id: string) => Promise<void>, syncing: boolean }) {
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchRegistry = async () => {
    setLoading(true);
    try {
      const payload = await getAllAlQuranEditions();
      const batch = writeBatch(db);
      payload.data?.forEach((item: any) => {
        const docRef = doc(db, 'quran_editions', item.identifier);
        batch.set(docRef, {
          id: item.identifier, name: item.name, englishName: item.englishName, type: item.type,
          language: languageNameMap[item.language] || item.language.toUpperCase(), format: item.format,
          isActive: editions.find(e => e.id === item.identifier)?.isActive ?? (item.identifier === 'quran-uthmani'),
          dataSync: editions.find(e => e.id === item.identifier)?.dataSync || 'no'
        }, { merge: true });
      });
      await batch.commit();
      toast({ title: "Registry Updated" });
    } catch (e: any) { toast({ variant: "destructive", title: "Seed Failed", description: e.message }); } finally { setLoading(false); }
  };

  const toggleActivation = (id: string, current: boolean) => {
    updateDocumentNonBlocking(doc(db, 'quran_editions', id), { isActive: !current });
    toast({ title: !current ? "Activated" : "Deactivated" });
  };

  const paginated = editions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(editions.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Global Registry</h3>
        <Button size="sm" onClick={fetchRegistry} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
          Seed Registry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {paginated.map((t) => {
          const isSynced = t.dataSync === 'yes';
          return (
            <Card key={t.id} className={cn("group transition-all border shadow-sm flex flex-col", isSynced ? "cursor-pointer hover:border-primary/50" : "opacity-80")} onClick={() => isSynced && router.push(`/admin/quran?editionId=${t.id}`)}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-muted p-2 rounded-lg">
                    {t.format === 'text' ? <TypeIcon className="w-5 h-5 text-muted-foreground" /> : <Mic className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={t.isActive ? "default" : "secondary"} className="text-[8px] font-bold uppercase py-0">{t.isActive ? 'Active' : 'Off'}</Badge>
                    <Badge variant={isSynced ? "outline" : "secondary"} className="text-[8px] font-bold uppercase py-0">{isSynced ? 'Synced' : 'Pending'}</Badge>
                  </div>
                </div>
                <CardTitle className="text-sm leading-tight line-clamp-1">{t.name}</CardTitle>
                <CardDescription className="text-[9px] font-bold uppercase opacity-50">{t.id}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-muted/50 rounded-lg border">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Language</span>
                    <span className="text-[10px] font-bold truncate block">{t.language}</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg border">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase block mb-0.5">Type</span>
                    <span className="text-[10px] font-bold capitalize block">{t.type}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" disabled={syncing || !t.isActive} onClick={() => performSync(t.id)} className="flex-1 h-8 text-[10px] font-bold uppercase">
                  <RefreshCw className={cn("w-3 h-3 mr-2", syncing && "animate-spin")} /> 
                  Sync
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleActivation(t.id, !!t.isActive)} className={cn("h-8 w-8", t.isActive ? "text-amber-500" : "text-emerald-500")}>
                  {t.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8">
          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Page {currentPage} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

export function QuranEditionDataView({ editionId, onBack }: { editionId: string, onBack: () => void }) {
  const db = useFirestore();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const editionRef = useMemoFirebase(() => doc(db, 'quran_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const dataQuery = useMemoFirebase(() => query(collection(db, 'quran'), where('editionId', '==', editionId), limit(114)), [db, editionId]);
  const { data: surahs, isLoading } = useCollection(dataQuery);

  const allAyats = useMemo(() => {
    if (!surahs) return [];
    return surahs.flatMap(s => s.ayats.map((a: any) => ({
      ...a, surahNumber: s.surahNumber, surahName: s.englishName, globalId: `${s.id}_${a.numberInSurah}`
    }))).sort((a, b) => a.number - b.number);
  }, [surahs]);

  const paginated = allAyats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(allAyats.length / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight">{edition?.name || 'Inspection'}</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Scripture Audit</p>
        </div>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-24 text-[10px] font-bold uppercase tracking-widest pl-6">Ref</TableHead>
              <TableHead className="w-40 text-[10px] font-bold uppercase tracking-widest">Chapter</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-12">Original</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Translation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-64 text-center text-muted-foreground text-xs font-bold uppercase">Indexing Viewport...</TableCell></TableRow>
            ) : paginated.map((a) => (
              <TableRow key={a.globalId} className="h-32 hover:bg-muted/30 transition-colors">
                <TableCell className="pl-6">
                  <Badge variant="outline" className="font-mono text-[10px]">#{a.number}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{a.surahName}</span>
                    <span className="text-[9px] text-muted-foreground font-bold uppercase">Verse {a.numberInSurah}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-12">
                  <p className="font-arabic text-2xl text-foreground leading-relaxed" dir="rtl">{a.text}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-muted-foreground line-clamp-3 italic font-medium max-w-sm">{a.translationText || '---'}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="bg-muted/30 border-t p-6 flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
