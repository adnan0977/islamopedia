"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, writeBatch, query, collection, limit } from 'firebase/firestore';
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
      if (!payload?.data?.surahs) {
        throw new Error(`Failed to fetch edition ${editionId} from API.`);
      }

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
            number: a.number,
            numberInSurah: a.numberInSurah,
            text: a.text,
            translationText: isArabic ? null : a.text,
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
        const currentProgress = Math.round(((i + chunk.length) / surahs.length) * 100);
        setSyncState(prev => ({ ...prev, progress: currentProgress }));
      }

      const editionRef = doc(db, 'quran_editions', editionId);
      updateDocumentNonBlocking(editionRef, { dataSync: 'yes' });
      
      setSyncState(prev => ({ ...prev, status: 'success' }));
      toast({ title: "Synchronization Complete", description: `Successfully indexed ${editionId}.` });
    } catch (e: any) {
      setSyncState(prev => ({ ...prev, status: 'error' }));
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "An unexpected error occurred." });
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-white border-zinc-200 rounded-[3rem] p-16 outline-none shadow-2xl max-w-xl">
          <div className="flex flex-col items-center text-center space-y-10">
             <div className="relative group">
               <div className="absolute inset-0 bg-emerald-500/10 rounded-full scale-150 blur-3xl group-hover:bg-emerald-500/20 transition-all duration-1000 animate-pulse" />
               <div className="relative w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center border border-zinc-100 shadow-xl overflow-hidden">
                 <Database className="w-10 h-10 text-emerald-600 relative z-10 animate-bounce" />
               </div>
             </div>

             <DialogHeader className="space-y-3">
               <DialogTitle className="text-3xl font-headline font-bold tracking-tight text-zinc-900">Verse Repository Sync</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm max-w-[280px] mx-auto leading-relaxed">Inducting scripture into the platform engine. This ensures low-latency access.</DialogDescription>
             </DialogHeader>

             <div className="w-full space-y-6">
               <div className="space-y-4">
                 <div className="flex justify-between items-end">
                   <div className="flex flex-col items-start gap-1">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Sync Pipeline</span>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-xs font-mono text-zinc-600 capitalize">{syncState.status}...</span>
                     </div>
                   </div>
                   <span className="text-4xl font-headline font-bold text-zinc-900 tabular-nums">{syncState.progress}%</span>
                 </div>
                 <div className="h-3 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 p-0.5">
                   <div 
                     className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-out"
                     style={{ width: `${syncState.progress}%` }}
                   />
                 </div>
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isStandardSynced && !syncState.isSyncing && (
        <Alert className="bg-amber-50/50 border-amber-200 text-amber-900 rounded-[2.5rem] p-10 shadow-sm flex items-start gap-8">
          <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <AlertTitle className="font-headline font-bold text-2xl text-zinc-900">Foundation Required</AlertTitle>
              <AlertDescription className="text-sm leading-relaxed text-zinc-600">The central Arabic Uthmani text hasn't been synchronized. This is a system-critical requirement for cross-reference consistency.</AlertDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => performSync('quran-uthmani')} 
              className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white font-bold rounded-xl h-14 px-10 transition-all shadow-xl active:scale-95 flex items-center gap-3"
            >
              <CloudDownload className="h-5 w-5" /> 
              <span className="text-xs uppercase tracking-widest">Sync Arabic Foundation</span>
            </Button>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-white p-2 rounded-2xl h-16 border border-zinc-200 shadow-sm mb-12">
          <TabsTrigger value="directory" className="px-12 rounded-xl h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white transition-all font-bold text-zinc-400 text-sm">Edition Directory</TabsTrigger>
          <TabsTrigger value="viewer" className="px-12 rounded-xl h-full data-[state=active]:bg-zinc-900 data-[state=active]:text-white transition-all font-bold text-zinc-400 text-sm">Full Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} performSync={performSync} syncing={syncState.isSyncing} />
        </TabsContent>
        <TabsContent value="viewer">
          <Card className="bg-white border-zinc-200 rounded-[3rem] overflow-hidden shadow-sm">
            <div className="py-40 px-10 text-center space-y-8">
              <div className="w-24 h-24 bg-zinc-50 rounded-3xl flex items-center justify-center mx-auto border border-zinc-100 shadow-inner">
                <BookOpen className="w-10 h-10 text-zinc-200" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-headline font-bold text-zinc-900">Scripture Inspector</h3>
                <p className="text-zinc-500 max-w-sm mx-auto font-medium">Select an edition from the directory to begin granular data auditing.</p>
              </div>
            </div>
          </Card>
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
  const [metaLoading, setMetaLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchAndSeedRegistry = async () => {
    setLoading(true);
    try {
      const payload = await getAllAlQuranEditions();
      const batch = writeBatch(db);
      payload.data?.forEach((item: any) => {
        const docRef = doc(db, 'quran_editions', item.identifier);
        batch.set(docRef, {
          id: item.identifier, name: item.name, englishName: item.englishName, type: item.type,
          language: languageNameMap[item.language] || item.language.toUpperCase(), languageCode: item.language, format: item.format,
          isActive: editions.find(e => e.id === item.identifier)?.isActive ?? (item.identifier === 'quran-uthmani'),
          dataSync: editions.find(e => e.id === item.identifier)?.dataSync || 'no'
        }, { merge: true });
      });
      await batch.commit();
      toast({ title: "Registry Seeded" });
    } catch (e: any) { toast({ variant: "destructive", title: "Seed Failed", description: e.message }); } finally { setLoading(false); }
  };

  const fetchAndSeedMetadata = async () => {
    setMetaLoading(true);
    try {
      const payload = await getQuranMetadata();
      const metaRef = doc(db, 'quran_metadata', 'global');
      setDocumentNonBlocking(metaRef, { ...payload.data, updatedAt: new Date().toISOString() }, { merge: true });
      toast({ title: "Metadata Updated" });
    } catch (e: any) { toast({ variant: "destructive", title: "Metadata Sync Failed", description: e.message }); } finally { setMetaLoading(false); }
  };

  const toggleActivation = (editionId: string, currentStatus: boolean) => {
    updateDocumentNonBlocking(doc(db, 'quran_editions', editionId), { isActive: !currentStatus });
    toast({ title: !currentStatus ? "Activated" : "Deactivated" });
  };

  const paginatedEditions = useMemo(() => editions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [editions, currentPage]);
  const totalPages = Math.ceil(editions.length / itemsPerPage);

  const handleCardClick = (id: string, isSynced: boolean) => {
    if (isSynced) {
      router.push(`/admin/quran?editionId=${id}`);
    } else {
      toast({ title: "Sync Required", description: "Please synchronize this edition first to view its data." });
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-inner">
              <Languages className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="font-headline font-bold text-3xl text-zinc-900 tracking-tight">Global Registry</h3>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage and oversee {editions.length} localized spiritual feeds.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={fetchAndSeedMetadata} disabled={metaLoading} className="rounded-2xl h-14 px-10 font-bold border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all bg-white shadow-sm">
            {metaLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <FileText className="w-5 h-5 mr-3" />} 
            <span className="text-xs uppercase tracking-widest">Metadata Sync</span>
          </Button>
          <Button onClick={fetchAndSeedRegistry} disabled={loading} className="rounded-2xl h-14 px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl transition-all active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <CloudDownload className="w-5 h-5 mr-3" />} 
            <span className="text-xs uppercase tracking-widest">Seed Registry</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {paginatedEditions.map((t) => {
          const isSynced = t.dataSync === 'yes';
          return (
            <Card key={t.id} className={cn("bg-white border-zinc-200 rounded-[3rem] overflow-hidden flex flex-col group transition-all shadow-sm relative border-t-4 border-t-transparent", isSynced ? "cursor-pointer hover:border-zinc-400 hover:shadow-2xl hover:border-t-zinc-900" : "opacity-80 hover:border-zinc-300")} onClick={() => handleCardClick(t.id, isSynced)}>
              <CardHeader className="p-10 border-b border-zinc-50 bg-zinc-50/30">
                <div className="flex justify-between items-start mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm group-hover:border-zinc-200 transition-colors">
                    {t.format === 'text' ? <TypeIcon className="w-7 h-7 text-zinc-400" /> : <Mic className="w-7 h-7 text-zinc-400" />}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm", t.isActive ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>{t.isActive ? 'Active' : 'Off'}</Badge>
                    <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-sm", isSynced ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600/50")}>{isSynced ? 'Synced' : 'Pending'}</Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors line-clamp-1 leading-tight">{t.name}</CardTitle>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mt-2">{t.id}</p>
              </CardHeader>
              <CardContent className="p-10 flex-1">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center shadow-inner group-hover:bg-white transition-colors">
                    <span className="text-[9px] font-black text-zinc-400 uppercase block mb-2 tracking-widest">Language</span>
                    <span className="text-xs font-bold text-zinc-900">{t.language}</span>
                  </div>
                  <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center shadow-inner group-hover:bg-white transition-colors">
                    <span className="text-[9px] font-black text-zinc-400 uppercase block mb-2 tracking-widest">Type</span>
                    <span className="text-xs font-bold text-zinc-900 capitalize">{t.type}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-zinc-50/30 border-t border-zinc-100 flex justify-between gap-4" onClick={(e) => e.stopPropagation()}>
                <Button variant="outline" size="sm" disabled={syncing || !t.isActive} onClick={() => performSync(t.id)} className="flex-1 rounded-xl font-bold h-12 border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm">
                  <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} /> 
                  <span className="text-[10px] uppercase tracking-widest">Sync</span>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleActivation(t.id, !!t.isActive)} className={cn("rounded-xl h-12 w-12 border border-zinc-200 bg-white shadow-sm transition-all", t.isActive ? "text-amber-500" : "text-emerald-500")}>
                  {t.isActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-12 w-12 border border-zinc-200 bg-white shadow-sm transition-all">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-10 pt-16">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-2xl border-zinc-200 text-zinc-600 h-14 px-10 font-bold hover:bg-zinc-900 hover:text-white transition-all shadow-sm">Previous</Button>
          <div className="h-14 px-10 bg-white border border-zinc-200 rounded-2xl flex items-center font-bold text-[11px] text-zinc-400 uppercase tracking-[0.4em] shadow-inner">Page {currentPage} / {totalPages}</div>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-2xl border-zinc-200 text-zinc-600 h-14 px-10 font-bold hover:bg-zinc-900 hover:text-white transition-all shadow-sm">Next</Button>
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

  const paginatedAyats = useMemo(() => allAyats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [allAyats, currentPage]);
  const totalPages = Math.ceil(allAyats.length / itemsPerPage);

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-8">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-2xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-14 w-14 flex items-center justify-center transition-all shadow-sm group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">{edition?.name || 'Inspection Mode'}</h2>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Granular Scripture Auditor</span>
            </div>
          </div>
        </div>
      </div>

      <Card className="bg-white border-zinc-200 overflow-hidden rounded-[3rem] shadow-sm">
        <Table className="w-full">
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="border-zinc-100 h-24">
              <TableHead className="py-8 pl-12 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 w-40">System ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Chapter Origin</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right pr-12">Original Script</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Translation Feed</TableHead>
              <TableHead className="text-right pr-12 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-96 text-center"><div className="flex flex-col items-center gap-6"><Loader2 className="animate-spin h-14 w-14 text-zinc-100" /><p className="text-[10px] font-black uppercase text-zinc-300 tracking-[0.3em]">Indexing Viewport...</p></div></TableCell></TableRow>
            ) : paginatedAyats.map((a) => (
              <TableRow key={a.globalId} className="border-zinc-100 h-40 hover:bg-zinc-50/50 transition-colors">
                <TableCell className="pl-12 font-mono text-xs text-zinc-400">
                  <Badge variant="outline" className="border-zinc-100 text-zinc-400 bg-zinc-50 px-3 py-1 shadow-inner">#{a.number}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900">{a.surahName}</span>
                    <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest mt-1">Verse {a.numberInSurah}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-12">
                  <p className="font-arabic text-3xl text-zinc-900 leading-relaxed" dir="rtl">{a.text}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-500 line-clamp-4 leading-[1.8] italic max-w-sm font-medium">{a.translationText || '---'}</p>
                </TableCell>
                <TableCell className="text-right pr-12">
                  <Button variant="ghost" size="sm" className="h-12 px-8 text-zinc-400 hover:text-zinc-900 transition-all border border-transparent hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl">
                    <Pencil className="w-4 h-4 mr-3" />
                    <span className="font-bold text-[10px] uppercase tracking-widest">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="bg-zinc-50/50 border-t border-zinc-100 p-12 flex justify-between items-center">
            <span className="text-[11px] text-zinc-400 font-black uppercase tracking-[0.4em]">Section Viewport {currentPage} / {totalPages}</span>
            <div className="flex gap-4">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-2xl border-zinc-200 bg-white text-zinc-600 h-14 px-10 font-bold hover:bg-zinc-900 hover:text-white transition-all shadow-sm">Prev</Button>
              <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-2xl border-zinc-200 bg-white text-zinc-600 h-14 px-10 font-bold hover:bg-zinc-900 hover:text-white transition-all shadow-sm">Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
