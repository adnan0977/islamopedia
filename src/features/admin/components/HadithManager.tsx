
'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, writeBatch, where, limit, orderBy } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Trash2, 
  BookOpen, 
  Hash,
  RefreshCw,
  Library,
  ScrollText,
  Database,
  ChevronRight,
  ArrowLeft,
  Languages,
  CloudDownload,
  CheckCircle2,
  Table as TableIcon,
  Search,
  FilterX,
  FileText,
  DatabaseZap,
  BookMarked,
  Link2
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { fetchHadithRegistry, fetchHadithEditionContent, FawazEdition, FawazRegistry } from '@/services/hadith-api';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const ALLOWED_SLUGS = [
  'abudawud', 'bukhari', 'dehlawi', 'ibnmajah', 'malik', 
  'muslim', 'nasai', 'nawawi', 'qudsi', 'tirmidhi'
];

/**
 * Level 1: Primary Registry View (Master Books)
 */
export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isSeeding, setIsSeeding] = useState(false);

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('bookName', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  const handleSeedRegistry = async () => {
    setIsSeeding(true);
    try {
      const registry = await fetchHadithRegistry();
      const batch = writeBatch(db);
      
      ALLOWED_SLUGS.forEach(slug => {
        if (registry[slug]) {
          const bookRef = doc(db, 'hadith_books', slug);
          batch.set(bookRef, {
            id: slug,
            bookName: registry[slug].name,
            editionCount: registry[slug].collection.length,
            lastSyncedAt: new Date().toISOString()
          }, { merge: true });
        }
      });

      await batch.commit();
      toast({ title: "Registry Seeded", description: "Primary collections have been updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seeding Failed", description: e.message });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2rem] border border-zinc-900 shadow-xl border-t border-white/5">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Library className="w-6 h-6 text-zinc-500" />
            <h2 className="text-2xl font-headline font-bold text-white">Hadith Studio Library</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage master collections and their global language editions.</p>
        </div>

        <Button 
          variant="outline"
          className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95"
          onClick={handleSeedRegistry}
          disabled={isSeeding}
        >
          {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
          <span>Seed Registry</span>
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Hydrating library nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden group hover:border-zinc-500 transition-all flex flex-col shadow-2xl border-t border-white/5 cursor-pointer"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">{book.bookName}</CardTitle>
                    <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">{book.id}</p>
                  </div>
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0 shadow-inner">
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 flex-1">
                <div className="flex items-center gap-3 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900">
                  <Languages className="w-5 h-5 text-zinc-600" />
                  <div className="flex flex-col">
                    <span className="text-xl font-headline font-bold text-zinc-300">{book.editionCount || 0}</span>
                    <span className="text-[9px] font-black uppercase text-zinc-600 tracking-widest">Available Translations</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 bg-zinc-900/10 border-t border-zinc-900 flex items-center justify-between">
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-3 py-1 rounded-full uppercase">Master Collection</Badge>
                <span className="text-[10px] font-mono text-zinc-700">{book.id}.json</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Level 2: Book Specific Editions Grid
 */
export function HadithBookDetailView({ bookId, onBack, onSelectEdition }: { bookId: string, onBack: () => void, onSelectEdition: (id: string) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncingEditions, setIsSyncingEditions] = useState(false);
  
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    progress: 0,
    status: 'idle',
    targetEdition: ''
  });

  const bookRef = useMemoFirebase(() => doc(db, 'hadith_books', bookId), [db, bookId]);
  const { data: book } = useDoc(bookRef);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', bookId)
  ), [db, bookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  const filteredEditions = editions?.filter(e => 
    e.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSyncEditionsList = async () => {
    setIsSyncingEditions(true);
    try {
      const registry = await fetchHadithRegistry();
      const bookData = registry[bookId];
      if (!bookData) throw new Error(`Collection '${bookId}' not found in registry.`);

      const batch = writeBatch(db);
      bookData.collection.forEach((ed) => {
        const editionRef = doc(db, 'hadith_editions', ed.name);
        batch.set(editionRef, {
          ...ed,
          id: ed.name,
          bookId: bookId,
          dataSync: editions?.find(existing => existing.id === ed.name)?.dataSync || 'no'
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Editions Indexed", description: `Updated ${bookData.collection.length} language versions for ${bookId}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Edition Sync Failed", description: e.message });
    } finally {
      setIsSyncingEditions(false);
    }
  };

  const handleDeepSyncContent = async (edition: FawazEdition) => {
    setSyncState({ isSyncing: true, progress: 0, status: 'fetching payload', targetEdition: edition.name });
    
    try {
      const data = await fetchHadithEditionContent(edition.linkmin);
      const { metadata, hadiths } = data;

      // 1. Index Chapters
      setSyncState(prev => ({ ...prev, status: 'indexing chapters' }));
      const indexBatch = writeBatch(db);
      if (metadata.sections) {
        Object.entries(metadata.sections).forEach(([num, name]) => {
          const indexId = `${edition.name}_ch_${num}`;
          indexBatch.set(doc(db, 'hadith_index', indexId), {
            id: indexId,
            bookSlug: bookId,
            editionId: edition.name,
            chapterNumber: num,
            chapterName: name as string,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
      }
      await indexBatch.commit();

      // 2. Ingest Records
      setSyncState(prev => ({ ...prev, status: 'mapping records' }));
      const batchSize = 25; 
      for (let i = 0; i < hadiths.length; i += batchSize) {
        const chunk = hadiths.slice(i, i + batchSize);
        const dataBatch = writeBatch(db);
        
        chunk.forEach((h: any) => {
          const hId = `${edition.name}_h_${h.hadithnumber}`;
          dataBatch.set(doc(db, 'hadith_data', hId), {
            id: hId,
            editionId: edition.name,
            bookId: bookId,
            hadithNumber: h.hadithnumber,
            translatedText: h.text,
            chapterName: metadata.sections[h.reference.book] || 'General',
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Reference Indexing
          const refId = `${bookId}_ref_${h.reference.book}_${h.reference.hadith}`;
          dataBatch.set(doc(db, 'hadith_reference', `${edition.name}_${refId}`), {
            id: `${edition.name}_${refId}`,
            hadithId: hId,
            bookId: bookId,
            editionId: edition.name,
            refBook: h.reference.book,
            refHadith: h.reference.hadith
          }, { merge: true });
        });

        await dataBatch.commit();
        setSyncState(prev => ({ ...prev, progress: Math.round(((i + chunk.length) / hadiths.length) * 100) }));
      }

      updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { dataSync: 'yes' });
      toast({ title: "Content Indexing Complete" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Deep Sync Failed", description: e.message });
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-12 outline-none shadow-2xl max-w-lg border-t border-white/5">
          <DialogHeader className="text-center">
             <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl mx-auto mb-6">
               <DatabaseZap className="w-10 h-10 text-white animate-bounce" />
             </div>
             <DialogTitle className="text-2xl font-headline font-bold">Deep Data Ingestion</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm">Indexing {syncState.targetEdition} into the platform feed.</DialogDescription>
          </DialogHeader>

          <div className="w-full space-y-6 mt-8">
             <div className="space-y-3">
               <div className="flex justify-between items-end">
                 <span className="text-[10px] font-black uppercase text-zinc-600">{syncState.status}...</span>
                 <span className="text-3xl font-headline font-bold text-white tabular-nums">{syncState.progress}%</span>
               </div>
               <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                 <div className="h-full bg-white transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 shadow-xl border-t border-white/5">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white leading-tight">{book?.bookName}</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <ScrollText className="w-3 h-3" />
              <span>Edition Matrix</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input placeholder="Filter matrix..." className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-12" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-6 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all"
            onClick={handleSyncEditionsList}
            disabled={isSyncingEditions}
          >
            {isSyncingEditions ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Sync Editions</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredEditions?.map((ed) => {
          const isSynced = ed.dataSync === 'yes';
          return (
            <Card 
              key={ed.id} 
              className={cn(
                "bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all shadow-xl relative border-t border-white/5",
                isSynced ? "cursor-pointer hover:border-zinc-500" : "opacity-90"
              )}
              onClick={() => isSynced && onSelectEdition(ed.id)}
            >
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-zinc-600 transition-colors">
                    <Languages className={cn("w-6 h-6", ed.direction === 'rtl' ? "text-amber-500" : "text-zinc-500")} />
                  </div>
                  <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isSynced ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>
                    {isSynced ? 'In System' : 'Indexed'}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">{ed.language} Edition</CardTitle>
                <CardDescription className="text-[10px] font-mono text-zinc-600 uppercase mt-1">{ed.name}</CardDescription>
              </CardHeader>
              
              <CardContent className="p-8 flex-1 space-y-4">
                <div className="space-y-2">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Primary Author</span>
                  <p className="text-sm font-bold text-zinc-300 line-clamp-1">{ed.author}</p>
                </div>
                <div className="pt-4 border-t border-zinc-900">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em]">Source Metadata</span>
                  <p className="text-[10px] text-zinc-500 truncate mt-1 italic">{ed.source}</p>
                </div>
              </CardContent>

              <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-xl font-bold h-12 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all flex items-center justify-center gap-2"
                  onClick={() => handleDeepSyncContent(ed)}
                >
                  <DatabaseZap className="w-4 h-4" />
                  {isSynced ? 'Resync' : 'Ingest Content'}
                </Button>
                {isSynced && (
                  <Button variant="ghost" size="icon" onClick={() => onSelectEdition(ed.id)} className="rounded-xl h-12 w-12 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Level 3: Granular Data Table Inspector
 */
export function HadithDataView({ editionId, onBack }: { editionId: string, onBack: () => void }) {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const dataQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_data'),
    where('editionId', '==', editionId),
    limit(100)
  ), [db, editionId]);
  const { data: hadiths, isLoading } = useCollection(dataQuery);

  const filteredHadiths = useMemo(() => {
    if (!hadiths) return [];
    return hadiths.filter(h => 
      h.hadithNumber?.toString().includes(searchTerm) || 
      h.translatedText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.chapterName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [hadiths, searchTerm]);

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 border-t border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 flex items-center justify-center transition-all">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight">{edition?.language} Content View</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <FileText className="w-3 h-3" />
              <span>Prophetic Registry Inspector</span>
            </div>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search within source..." 
            className="pl-12 bg-zinc-900 border-zinc-800 text-white rounded-2xl h-14" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl border-t border-white/5">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="py-8 pl-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-32">Number</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Section</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Translation Preview</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-96 text-center"><Loader2 className="animate-spin h-10 w-10 text-zinc-800 mx-auto" /></TableCell></TableRow>
            ) : filteredHadiths?.map((h) => (
              <TableRow key={h.id} className="border-zinc-900 h-32 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-10 font-mono text-xs text-zinc-600">
                  <Badge variant="outline" className="border-zinc-800 text-zinc-500 bg-black/50">#{h.hadithNumber}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col max-w-[200px]">
                    <span className="text-sm font-bold text-zinc-100 truncate">{h.chapterName}</span>
                    <span className="text-[9px] text-zinc-600 uppercase font-black mt-0.5">Structural Node</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic pr-10">{h.translatedText}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
