
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, writeBatch, query, where, collection, limit } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trash2, 
  Loader2, 
  Search, 
  Download, 
  AlertCircle,
  CheckCircle2,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Database,
  Power,
  PowerOff,
  CloudDownload,
  RefreshCw,
  Type as TypeIcon,
  Mic,
  FilterX,
  Globe,
  Pencil,
  ArrowLeft,
  Table as TableIcon,
  FileText
} from 'lucide-react';
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
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
import { Progress } from "@/components/ui/progress";

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-zinc-950/90 border-zinc-900 text-white rounded-[2.5rem] p-12 outline-none shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] backdrop-blur-2xl max-w-lg border-t border-white/5">
          <div className="flex flex-col items-center text-center space-y-8">
             <div className="relative group">
               <div className="absolute inset-0 bg-white/5 rounded-full scale-150 blur-2xl group-hover:bg-white/10 transition-all duration-1000 animate-pulse" />
               <div className="relative w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                 <Database className="w-10 h-10 text-white relative z-10 animate-bounce" />
                 <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 animate-pulse" />
               </div>
               <div className="absolute -inset-4 border border-zinc-800 rounded-full animate-[spin_10s_linear_infinite] opacity-50" />
               <div className="absolute -inset-8 border border-zinc-900 rounded-full animate-[spin_15s_linear_infinite] opacity-30" />
             </div>

             <DialogHeader className="space-y-3">
               <DialogTitle className="text-2xl font-headline font-bold tracking-tight">Syncing Spiritual Repository</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm max-w-[280px] mx-auto leading-relaxed">Inducting verses into the local feed. This ensures zero-latency access for creators.</DialogDescription>
             </DialogHeader>

             <div className="w-full space-y-6">
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <div className="flex flex-col items-start gap-1">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Batch Progress</span>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-xs font-mono text-zinc-400 capitalize">{syncState.status}...</span>
                     </div>
                   </div>
                   <span className="text-3xl font-headline font-bold text-white tabular-nums">{syncState.progress}%</span>
                 </div>
                 <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50 p-0.5">
                   <div 
                     className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                     style={{ width: `${syncState.progress}%` }}
                   />
                 </div>
               </div>
               
               <div className="pt-4 border-t border-zinc-900 flex justify-center">
                 <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.3em]">System Level Sync Active</p>
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isStandardSynced && !syncState.isSyncing && (
        <Alert className="bg-amber-500/5 border-amber-500/20 text-amber-200/80 rounded-3xl p-8 shadow-2xl flex items-start gap-6">
          <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
            <AlertCircle className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <AlertTitle className="font-headline font-bold text-xl text-amber-500">Foundation Required</AlertTitle>
              <p className="text-sm leading-relaxed opacity-70">The central Arabic Uthmani text hasn't been synchronized. This is required for cross-reference consistency.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => performSync('quran-uthmani')} 
              className="border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-black font-bold rounded-xl h-11 px-8 transition-all"
            >
              <CloudDownload className="mr-2 h-4 w-4" /> Sync Standard Arabic
            </Button>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1.5 rounded-2xl h-14 border border-zinc-900/50 mb-10">
          <TabsTrigger value="directory" className="px-10 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-zinc-500">Edition Directory</TabsTrigger>
          <TabsTrigger value="viewer" className="px-10 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-zinc-500">Full Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} performSync={performSync} syncing={syncState.isSyncing} />
        </TabsContent>
        <TabsContent value="viewer">
          <Card className="bg-zinc-950 border-zinc-900 rounded-[3rem] overflow-hidden shadow-2xl border-t border-white/5">
            <div className="py-32 px-10 text-center space-y-8">
              <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-zinc-800 shadow-2xl">
                <BookOpen className="w-10 h-10 text-zinc-700" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-headline font-bold text-white">Select an edition to begin inspection.</h3>
                <p className="text-zinc-500 max-w-sm mx-auto">Use the directory to select a synchronized language version for granular data management.</p>
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
  const [dirSearch, setDirSearch] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const languages = useMemo(() => Array.from(new Set(editions.map(e => e.language).filter(Boolean))).sort(), [editions]);
  const formats = useMemo(() => Array.from(new Set(editions.map(e => e.format).filter(Boolean))).sort(), [editions]);
  const types = useMemo(() => Array.from(new Set(editions.map(e => e.type).filter(Boolean))).sort(), [editions]);

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

  const filteredEditions = useMemo(() => editions.filter(e => {
    const matchesSearch = e.name?.toLowerCase().includes(dirSearch.toLowerCase()) || e.id?.toLowerCase().includes(dirSearch.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || e.language === filterLanguage;
    const matchesFormat = filterFormat === 'all' || e.format === filterFormat;
    const matchesType = filterType === 'all' || e.type === filterType;
    let matchesStatus = true;
    if (filterStatus === 'active') matchesStatus = e.isActive;
    else if (filterStatus === 'inactive') matchesStatus = !e.isActive;
    else if (filterStatus === 'synced') matchesStatus = e.dataSync === 'yes';
    return matchesSearch && matchesLanguage && matchesFormat && matchesType && matchesStatus;
  }), [editions, dirSearch, filterLanguage, filterFormat, filterStatus, filterType]);

  const paginatedEditions = useMemo(() => filteredEditions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredEditions, currentPage]);
  const totalPages = Math.ceil(filteredEditions.length / itemsPerPage);

  const handleCardClick = (id: string, isSynced: boolean) => {
    if (isSynced) {
      router.push(`/admin/quran?editionId=${id}`);
    } else {
      toast({ title: "Sync Required", description: "Please synchronize this edition first to view its data." });
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2rem] border border-zinc-900 shadow-xl border-t border-white/5">
        <div className="space-y-2">
          <h3 className="font-headline font-bold text-2xl text-white">Platform Registry</h3>
          <p className="text-sm text-zinc-500">Manage and filter {editions.length} indexed Quranic editions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={fetchAndSeedMetadata} disabled={metaLoading} className="rounded-xl h-12 px-8 font-bold border-zinc-800 text-zinc-400 hover:border-white hover:text-white transition-all">
            {metaLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />} Sync Metadata
          </Button>
          <Button variant="outline" onClick={fetchAndSeedRegistry} disabled={loading} className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black transition-all shadow-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CloudDownload className="w-4 h-4 mr-2" />} Seed Registry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input placeholder="Search registry..." className="bg-zinc-950 border-zinc-900 h-14 pl-12 rounded-2xl text-white" value={dirSearch} onChange={(e) => setDirSearch(e.target.value)} />
        </div>
        <Select value={filterLanguage} onValueChange={setFilterLanguage}><SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white"><SelectValue placeholder="Language" /></SelectTrigger><SelectContent className="bg-zinc-950 border-zinc-800 text-white"><SelectItem value="all">All Languages</SelectItem>{languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent></Select>
        <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent className="bg-zinc-950 border-zinc-800 text-white"><SelectItem value="all">All Types</SelectItem>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Button variant="ghost" onClick={() => { setDirSearch(''); setFilterLanguage('all'); setFilterType('all'); }} className="h-14 px-6 rounded-2xl text-zinc-500 hover:text-white transition-all"><FilterX className="w-5 h-5 mr-2" /> Reset Filters</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedEditions.map((t) => {
          const isSynced = t.dataSync === 'yes';
          return (
            <Card key={t.id} className={cn("bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all shadow-xl relative border-t border-white/5", isSynced ? "cursor-pointer hover:border-zinc-500" : "opacity-80")} onClick={() => handleCardClick(t.id, isSynced)}>
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-zinc-600 transition-colors">
                    {t.format === 'text' ? <TypeIcon className="w-6 h-6 text-zinc-500" /> : <Mic className="w-6 h-6 text-zinc-500" />}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", t.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>{t.isActive ? 'Active' : 'Off'}</Badge>
                    <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isSynced ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500/50")}>{isSynced ? 'Synced' : 'Pending'}</Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-white line-clamp-1 transition-colors">{t.name}</CardTitle>
                <CardDescription className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter mt-1">{t.id}</CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center"><span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">Language</span><span className="text-xs font-bold text-zinc-300">{t.language}</span></div>
                  <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center"><span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">Type</span><span className="text-xs font-bold text-zinc-300 capitalize">{t.type}</span></div>
                </div>
              </CardContent>
              <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" disabled={syncing || !t.isActive} onClick={() => performSync(t.id)} className="flex-1 rounded-xl font-bold h-12 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all border border-transparent hover:border-zinc-800"><RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} /> Sync</Button>
                <Button variant="ghost" size="icon" onClick={() => toggleActivation(t.id, !!t.isActive)} className={cn("rounded-xl h-12 w-12 border border-zinc-900 bg-zinc-900/30", t.isActive ? "text-amber-500" : "text-emerald-500")}>{t.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}</Button>
                <Button variant="ghost" size="icon" onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} className="text-destructive hover:bg-destructive/10 rounded-xl h-12 w-12 border border-zinc-900 bg-zinc-900/30"><Trash2 className="w-4 h-4" /></Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 pt-12">
          <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl border-zinc-800 text-white h-12 px-8 font-bold hover:bg-white hover:text-black">Previous</Button>
          <div className="h-12 px-8 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center font-bold text-[10px] text-zinc-500 uppercase tracking-[0.3em] shadow-inner">Page {currentPage} / {totalPages}</div>
          <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl border-zinc-800 text-white h-12 px-8 font-bold hover:bg-white hover:text-black">Next</Button>
        </div>
      )}
    </div>
  );
}

export function QuranEditionDataView({ editionId, onBack }: { editionId: string, onBack: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredAyats = useMemo(() => allAyats.filter(a => a.text?.toLowerCase().includes(searchTerm.toLowerCase()) || a.translationText?.toLowerCase().includes(searchTerm.toLowerCase()) || a.surahName?.toLowerCase().includes(searchTerm.toLowerCase())), [allAyats, searchTerm]);
  const paginatedAyats = useMemo(() => filteredAyats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredAyats, currentPage]);
  const totalPages = Math.ceil(filteredAyats.length / itemsPerPage);

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2rem] border border-zinc-900 border-t border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 flex items-center justify-center transition-all"><ArrowLeft className="w-5 h-5" /></Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight">{edition?.name || 'Inspection Mode'}</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <TableIcon className="w-3 h-3" />
              <span>Granular Verse Registry</span>
            </div>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input placeholder="Search within edition..." className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl border-t border-white/5">
        <Table className="w-full">
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="py-8 pl-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-32">Global ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Source Chapter</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-right pr-10">Arabic Script</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Language Mapping</TableHead>
              <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-zinc-800" /><p className="text-xs font-black uppercase text-zinc-700 tracking-widest">Indexing Viewport...</p></div></TableCell></TableRow>
            ) : paginatedAyats.map((a) => (
              <TableRow key={a.globalId} className="border-zinc-900 h-32 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-10 font-mono text-xs text-zinc-600">
                  <Badge variant="outline" className="border-zinc-800 text-zinc-500 bg-black/50">#{a.number}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-100">{a.surahName}</span>
                    <span className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter mt-0.5">Verse {a.numberInSurah}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <p className="font-arabic text-2xl text-zinc-300 leading-relaxed" dir="rtl">{a.text}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic max-w-sm">{a.translationText || '---'}</p>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <Button variant="ghost" size="sm" className="h-10 px-5 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 rounded-xl" onClick={() => toast({ title: "Granular Edit Tool Incoming" })}>
                    <Pencil className="w-4 h-4 mr-2" />
                    <span className="font-bold">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-10 flex justify-between items-center">
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Viewport {currentPage} / {totalPages}</span>
            <div className="flex gap-3">
              <Button variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="rounded-xl border-zinc-800 text-white h-12 px-8 font-bold">Prev</Button>
              <Button variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="rounded-xl border-zinc-800 text-white h-12 px-8 font-bold">Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
