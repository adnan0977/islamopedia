
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, writeBatch, query, where, getDocs, collection, limit } from 'firebase/firestore';
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
  Layers,
  FileText,
  Globe,
  CheckCircle,
  Pencil,
  ArrowLeft,
  Table as TableIcon
} from 'lucide-react';
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
  syncing: boolean;
  setSyncing: (val: boolean) => void;
  progress: number;
  setProgress: (val: number) => void;
  status: string;
  setSyncStatus: (val: any) => void;
}

const languageNameMap: Record<string, string> = {
  ar: 'Arabic', en: 'English', ur: 'Urdu', fr: 'French', es: 'Spanish', de: 'German', id: 'Indonesian', tr: 'Turkish',
  zh: 'Chinese', ru: 'Russian', fa: 'Persian', bn: 'Bengali', hi: 'Hindi', ml: 'Malayalam', ta: 'Tamil', te: 'Telugu',
};

export function QuranHub({ editions, syncing, setSyncing, progress, setProgress, status, setSyncStatus }: QuranHubProps) {
  const db = useFirestore();
  const { toast } = useToast();

  const standardEdition = editions.find(e => e.id === 'quran-uthmani');
  const isStandardSynced = standardEdition?.dataSync === 'yes';

  const handleStandardSync = async () => {
    await performSync('quran-uthmani');
  };

  const performSync = async (editionId: string) => {
    if (!editionId) return;
    
    setSyncing(true);
    setSyncStatus('fetching');
    setProgress(0);
    
    try {
      const isArabic = editionId === 'quran-uthmani';
      const payload = await getFullQuran(editionId);
      if (!payload?.data?.surahs) {
        throw new Error(`Failed to fetch edition ${editionId} from API.`);
      }

      setSyncStatus('saving');
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
        setProgress(currentProgress);
      }

      const editionRef = doc(db, 'quran_editions', editionId);
      updateDocumentNonBlocking(editionRef, { dataSync: 'yes' });
      
      setSyncStatus('success');
      toast({ title: "Synchronization Complete", description: `Successfully indexed ${editionId}.` });
    } catch (e: any) {
      setSyncStatus('error');
      toast({ variant: "destructive", title: "Sync Failed", description: e.message || "An unexpected error occurred." });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Global Sync Progress Dialog */}
      <Dialog open={syncing}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-3xl p-10 outline-none shadow-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-6">
             <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 animate-pulse">
               <Database className="w-8 h-8 text-white" />
             </div>
             <div className="space-y-2">
               <DialogTitle className="text-xl font-bold">Synchronizing Edition</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm">Indexing spiritual content into local storage. Please do not close this window.</DialogDescription>
             </div>
          </DialogHeader>
          <div className="w-full space-y-6 py-6">
               <div className="space-y-2">
                 <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-zinc-500">
                   <span>Progress</span>
                   <span>{progress}%</span>
                 </div>
                 <Progress value={progress} className="h-2 bg-zinc-900" />
               </div>
               <div className="flex items-center justify-center gap-2">
                 <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
                 <p className="text-center text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                   Status: {status}...
                 </p>
               </div>
          </div>
        </DialogContent>
      </Dialog>

      {!isStandardSynced && !syncing && (
        <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-200 rounded-3xl p-6 shadow-2xl">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertTitle className="font-bold text-lg mb-2">Standard Quran Missing</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-amber-200/70 text-sm">
                The foundational Arabic Uthmani text has not been synchronized.
              </p>
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-500/50">Required for platform operations</p>
            </div>
            <Button 
              variant="outline"
              onClick={handleStandardSync}
              className="border-white text-white hover:bg-white hover:text-black font-bold rounded-xl h-11 px-6 shrink-0 transition-all shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" /> Sync Standard Arabic
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isStandardSynced && (
         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-4 flex items-center gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Standard Arabic Text Ready</span>
         </div>
      )}

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="directory" className="px-8 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-white">Edition Directory</TabsTrigger>
          <TabsTrigger value="viewer" className="px-8 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-white">Full Viewer</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <EditionDirectory editions={editions} performSync={performSync} syncing={syncing} />
        </TabsContent>
        <TabsContent value="viewer">
          <FullQuranViewer editions={editions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FullQuranViewer({ editions }: { editions: any[] }) {
  return (
    <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <div className="p-20 text-center space-y-6">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800 shadow-inner">
          <BookOpen className="w-10 h-10 text-zinc-700" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Quran Content Viewer</h3>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
            This module allows you to inspect the synchronized ayats for each surah. Select a synced edition from the Directory tab to view its content in detail.
          </p>
        </div>
      </div>
    </Card>
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

  const languages = useMemo(() => {
    const unique = new Set(editions.map(e => e.language).filter(Boolean));
    return Array.from(unique).sort();
  }, [editions]);

  const formats = useMemo(() => {
    const unique = new Set(editions.map(e => e.format).filter(Boolean));
    return Array.from(unique).sort();
  }, [editions]);

  const types = useMemo(() => {
    const unique = new Set(editions.map(e => e.type).filter(Boolean));
    return Array.from(unique).sort();
  }, [editions]);

  const fetchAndSeedRegistry = async () => {
    setLoading(true);
    try {
      const payload = await getAllAlQuranEditions();
      const availableList = payload.data || [];

      const batch = writeBatch(db);
      availableList.forEach((item: any) => {
        const docRef = doc(db, 'quran_editions', item.identifier);
        batch.set(docRef, {
          id: item.identifier,
          name: item.name,
          englishName: item.englishName,
          type: item.type,
          language: languageNameMap[item.language] || item.language.toUpperCase(),
          languageCode: item.language,
          format: item.format,
          isActive: editions.find(e => e.id === item.identifier)?.isActive ?? (item.identifier === 'quran-uthmani'),
          dataSync: editions.find(e => e.id === item.identifier)?.dataSync || 'no',
          isDefault: item.identifier === 'quran-uthmani'
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Registry Seeded", description: `Successfully stored ${availableList.length} editions in database.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seed Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchAndSeedMetadata = async () => {
    setMetaLoading(true);
    try {
      const payload = await getQuranMetadata();
      const metaData = payload.data;
      if (!metaData) throw new Error("Failed to fetch metadata from API.");

      const metaRef = doc(db, 'quran_metadata', 'global');
      setDocumentNonBlocking(metaRef, {
        ...metaData,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Metadata Updated", description: "Structural metadata for surahs and juzs successfully cached." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Metadata Sync Failed", description: e.message });
    } finally {
      setMetaLoading(false);
    }
  };

  const toggleActivation = (editionId: string, currentStatus: boolean) => {
    const editionRef = doc(db, 'quran_editions', editionId);
    updateDocumentNonBlocking(editionRef, { isActive: !currentStatus });
    toast({ 
      title: !currentStatus ? "Edition Activated" : "Edition Deactivated",
      description: !currentStatus ? "This edition is now ready for synchronization." : "This edition is no longer active."
    });
  };

  const resetFilters = () => {
    setDirSearch('');
    setFilterFormat('all');
    setFilterLanguage('all');
    setFilterStatus('all');
    setFilterType('all');
    setCurrentPage(1);
  };

  const filteredEditions = useMemo(() => {
    return editions.filter(e => {
      const matchesSearch = e.name?.toLowerCase().includes(dirSearch.toLowerCase()) || 
                           e.englishName?.toLowerCase().includes(dirSearch.toLowerCase()) ||
                           e.id?.toLowerCase().includes(dirSearch.toLowerCase());
      
      const matchesLanguage = filterLanguage === 'all' || e.language === filterLanguage;
      const matchesFormat = filterFormat === 'all' || e.format === filterFormat;
      const matchesType = filterType === 'all' || e.type === filterType;
      
      let matchesStatus = true;
      if (filterStatus === 'active') matchesStatus = e.isActive;
      else if (filterStatus === 'inactive') matchesStatus = !e.isActive;
      else if (filterStatus === 'synced') matchesStatus = e.dataSync === 'yes';
      else if (filterStatus === 'pending-sync') matchesStatus = e.dataSync === 'no' && e.isActive;

      return matchesSearch && matchesLanguage && matchesFormat && matchesType && matchesStatus;
    });
  }, [editions, dirSearch, filterLanguage, filterFormat, filterStatus, filterType]);

  const paginatedEditions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEditions.slice(start, start + itemsPerPage);
  }, [filteredEditions, currentPage]);

  const totalPages = Math.ceil(filteredEditions.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [dirSearch, filterFormat, filterLanguage, filterStatus, filterType]);

  const handleCardClick = (id: string, isSynced: boolean) => {
    if (isSynced) {
      router.push(`/admin/quran/${id}`);
    } else {
      toast({ title: "Action Required", description: "Please synchronize this edition first to view its data." });
    }
  };

  return (
    <div className="space-y-10">
      {/* Registry Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-2">
          <h3 className="font-bold text-xl text-white">Platform Registry</h3>
          <p className="text-sm text-zinc-500 font-medium">Manage and filter {editions.length} indexed Quranic editions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={fetchAndSeedMetadata} 
            disabled={metaLoading} 
            className="rounded-xl h-11 px-6 font-bold border-white text-white hover:bg-white hover:text-black transition-all shadow-md"
          >
            {metaLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            Sync Metadata
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchAndSeedRegistry} 
            disabled={loading} 
            className="rounded-xl h-11 px-6 font-bold border-white text-white hover:bg-white hover:text-black transition-all shadow-md"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CloudDownload className="w-4 h-4 mr-2" />}
            Seed Registry
          </Button>
        </div>
      </div>

      {/* Filters Hub */}
      <div className="space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search name, English name, or ID..." 
            className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-2xl h-14 shadow-inner w-full"
            value={dirSearch}
            onChange={(e) => setDirSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
          <Select value={filterFormat} onValueChange={setFilterFormat}>
            <SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white flex-1 shadow-sm">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="all">All Formats</SelectItem>
              {formats.map(f => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterLanguage} onValueChange={setFilterLanguage}>
            <SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white flex-1 shadow-sm">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="all">All Languages</SelectItem>
              {languages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white flex-1 shadow-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="all">All Types</SelectItem>
              {types.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-zinc-950 border-zinc-900 h-14 rounded-2xl text-white flex-1 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
              <SelectItem value="pending-sync">Pending Sync</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={resetFilters} 
            className="h-14 w-14 shrink-0 rounded-2xl border-zinc-900 bg-zinc-950 text-white hover:text-white shadow-sm"
            title="Reset Filters"
          >
            <FilterX className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Grid of Editions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedEditions.map((t) => {
          const isSynced = t.dataSync === 'yes';
          return (
            <Card 
              key={t.id} 
              className={cn(
                "bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden flex flex-col group transition-all shadow-xl",
                isSynced ? "cursor-pointer hover:border-zinc-500 hover:shadow-zinc-500/5" : "opacity-80"
              )}
              onClick={() => handleCardClick(t.id, isSynced)}
            >
              <CardHeader className="p-6 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 shadow-inner">
                    {t.format === 'text' ? <TypeIcon className="w-5 h-5 text-zinc-500" /> : <Mic className="w-5 h-5 text-zinc-500" />}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5", t.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5", isSynced ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500/50")}>
                      {isSynced ? 'Synced' : 'Pending Sync'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">{t.name}</CardTitle>
                    {isSynced && <TableIcon className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />}
                  </div>
                  <CardDescription className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter">{t.id}</CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 p-3 bg-zinc-900/30 rounded-xl border border-zinc-900">
                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Language</span>
                    <span className="text-xs font-bold text-zinc-300">{t.language}</span>
                  </div>
                  <div className="flex flex-col gap-1 p-3 bg-zinc-900/30 rounded-xl border border-zinc-900">
                    <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Type</span>
                    <span className="text-xs font-bold text-zinc-300 capitalize">{t.type}</span>
                  </div>
                </div>
                {t.englishName && (
                  <div className="flex items-center gap-2 text-zinc-500 text-xs italic bg-zinc-900/30 p-3 rounded-xl border border-zinc-900/50">
                    <Globe className="w-3 h-3 shrink-0" />
                    <span className="truncate">{t.englishName}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-6 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled={syncing || !t.isActive}
                  onClick={() => performSync(t.id)} 
                  className="flex-1 rounded-xl font-bold h-11 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
                >
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  {syncing ? 'Syncing...' : 'Sync Data'}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => toggleActivation(t.id, !!t.isActive)} 
                  className={cn("rounded-xl h-11 px-3 transition-all", t.isActive ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10")}
                >
                  {t.isActive ? <PowerOff className="w-4 h-4 mr-2" /> : <Power className="w-4 h-4 mr-2" />}
                  <span>{t.isActive ? 'Disable' : 'Set Live'}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteDocumentNonBlocking(doc(db, 'quran_editions', t.id))} 
                  className="text-destructive hover:bg-destructive/10 rounded-xl h-11 px-3 transition-all"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Remove</span>
                </Button>
              </CardFooter>
            </Card>
          );
        })}

        {paginatedEditions.length === 0 && (
          <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[3rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-6">
             <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 shadow-inner">
               <BookOpen className="w-10 h-10 text-zinc-800" />
             </div>
             <div className="space-y-2">
               <p className="text-zinc-600 font-bold">No editions found matching your criteria.</p>
               <Button variant="link" onClick={resetFilters} className="text-zinc-500 hover:text-white font-bold">Clear all filters</Button>
             </div>
          </div>
        )}
      </div>
      
      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-6 pt-12 border-t border-zinc-900">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="rounded-xl border-zinc-800 bg-zinc-950 h-12 px-8 font-bold text-white transition-all hover:bg-white hover:text-black shadow-md" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Previous
            </Button>
            <div className="px-8 h-12 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center min-w-[120px] shadow-inner">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            <Button 
              variant="outline" 
              className="rounded-xl border-zinc-800 bg-zinc-950 h-12 px-8 font-bold text-white transition-all hover:bg-white hover:text-black shadow-md" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <p className="text-[10px] font-black uppercase text-zinc-700 tracking-[0.2em]">Showing {paginatedEditions.length} of {filteredEditions.length} Editions</p>
        </div>
      )}
    </div>
  );
}

export function QuranEditionDataView({ editionId, onBack }: { editionId: string, onBack: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const editionRef = useMemoFirebase(() => doc(db, 'quran_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const dataQuery = useMemoFirebase(() => query(
    collection(db, 'quran'),
    where('editionId', '==', editionId),
    limit(114) // Quran has 114 surahs
  ), [db, editionId]);
  const { data: surahs, isLoading } = useCollection(dataQuery);

  const allAyats = useMemo(() => {
    if (!surahs) return [];
    return surahs.flatMap(s => s.ayats.map((a: any) => ({
      ...a,
      surahNumber: s.surahNumber,
      surahName: s.englishName,
      globalId: `${s.id}_${a.numberInSurah}`
    }))).sort((a, b) => a.number - b.number);
  }, [surahs]);

  const filteredAyats = useMemo(() => {
    return allAyats.filter(a => 
      a.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.translationText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.surahName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.number.toString() === searchTerm
    );
  }, [allAyats, searchTerm]);

  const paginatedAyats = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAyats.slice(start, start + itemsPerPage);
  }, [filteredAyats, currentPage]);

  const totalPages = Math.ceil(filteredAyats.length / itemsPerPage);

  const handleEditAyat = (ayat: any) => {
    const newText = prompt(`Edit Translation for Verse ${ayat.numberInSurah} of ${ayat.surahName}:`, ayat.translationText || ayat.text);
    if (newText !== null) {
      toast({ title: "Note", description: "Granular ayat editing requires complex array manipulation. Functionality placeholder." });
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-headline font-bold text-white">{edition?.name} Content</h2>
            <p className="text-sm text-zinc-500">Inspecting indexed Quranic verses and structural metadata.</p>
          </div>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search verses, surahs..." 
            className="pl-12 bg-zinc-950 border-zinc-900 text-white rounded-xl h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="py-6 pl-8 text-[9px] font-black uppercase text-zinc-500 w-[10%]">Global #</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-500 w-[15%]">Surah</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-500 w-[35%]">Arabic Text</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-500 w-[30%]">Translation/Preview</TableHead>
              <TableHead className="text-right pr-8 text-[9px] font-black uppercase text-zinc-500 w-[10%]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-64 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-zinc-800" /></TableCell></TableRow>
            ) : paginatedAyats.map((a) => (
              <TableRow key={a.globalId} className="border-zinc-900 h-24 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-8 font-mono text-[10px] text-zinc-500">#{a.number}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-100">{a.surahName}</span>
                    <span className="text-[9px] text-zinc-600 uppercase font-black">Verse {a.numberInSurah}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-arabic text-lg text-zinc-300 line-clamp-1 text-right pr-4" dir="rtl">{a.text}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed italic">{a.translationText || '---'}</p>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-zinc-500 hover:text-white" onClick={() => handleEditAyat(a)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    <span>Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {paginatedAyats.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Database className="w-12 h-12 text-zinc-900" />
                    <p className="text-zinc-600 font-medium">No verses found matching "{searchTerm}"</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="bg-zinc-900/30 border-t border-zinc-900 p-6 flex items-center justify-between">
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl border-zinc-800 bg-zinc-950 h-10 px-6 font-bold text-white transition-all hover:bg-white hover:text-black" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4 mr-2" /> Prev</Button>
              <Button variant="outline" className="rounded-xl border-zinc-800 bg-zinc-950 h-10 px-6 font-bold text-white transition-all hover:bg-white hover:text-black" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next <ChevronRight className="w-4 h-4 ml-2" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
