
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, writeBatch, where, limit, orderBy, getDocs, getCountFromServer } from 'firebase/firestore';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Trash2, 
  Library,
  ScrollText,
  Database,
  ChevronRight,
  ArrowLeft,
  Languages,
  CloudDownload,
  Table as TableIcon,
  DatabaseZap,
  ListTree,
  Database as DatabaseIcon,
  Zap,
  Eye,
  Pencil,
  Save,
  Type,
  Hash
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { fetchHadithRegistry, fetchHadithEditionContent, FawazEdition } from '@/services/hadith-api';
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
      
      const editionsSnap = await getDocs(collection(db, 'hadith_editions'));
      const existingEditions = new Map(editionsSnap.docs.map(d => [d.id, d.data()]));
      const existingBooksMap = new Map(books?.map(b => [b.id, b]) || []);

      const batch = writeBatch(db);
      let updatesCount = 0;

      ALLOWED_SLUGS.forEach(slug => {
        if (registry[slug]) {
          const bookData = registry[slug];
          const existingBook = existingBooksMap.get(slug);
          
          const bookPayload = {
            id: slug,
            bookName: bookData.name,
            editionCount: bookData.collection.length
          };

          if (!existingBook || existingBook.bookName !== bookPayload.bookName || existingBook.editionCount !== bookPayload.editionCount) {
            const bookRef = doc(db, 'hadith_books', slug);
            batch.set(bookRef, { ...bookPayload, lastSyncedAt: new Date().toISOString() }, { merge: true });
            updatesCount++;
          }

          bookData.collection.forEach((ed) => {
            const existingEd = existingEditions.get(ed.name);
            const isChanged = !existingEd || 
              existingEd.author !== ed.author || 
              existingEd.language !== ed.language || 
              existingEd.linkmin !== ed.linkmin ||
              existingEd.bookId !== slug;

            if (isChanged) {
              const editionRef = doc(db, 'hadith_editions', ed.name);
              batch.set(editionRef, {
                ...ed,
                id: ed.name,
                bookId: slug,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              updatesCount++;
            }
          });
        }
      });

      if (updatesCount > 0) {
        await batch.commit();
        toast({ title: "Registry Synchronized", description: `Applied ${updatesCount} updates.` });
      } else {
        toast({ title: "Database Up to Date" });
      }
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
 * Level 2: Edition Matrix with Sync Stats
 */
export function HadithBookDetailView({ bookId, onBack, onSelectEdition }: { bookId: string, onBack: () => void, onSelectEdition: (id: string) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
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

  const handleSyncIndex = async (edition: FawazEdition) => {
    setSyncState({ isSyncing: true, progress: 0, status: 'fetching structure', targetEdition: edition.name });
    
    try {
      const data = await fetchHadithEditionContent(edition.linkmin);
      const { metadata, hadiths } = data;

      setSyncState(prev => ({ ...prev, status: 'mapping nodes', progress: 50 }));
      
      const indexRef = doc(db, 'hadith_index', edition.name);
      const totalCount = hadiths?.length || 0;

      const payload = {
        id: edition.name,
        editionId: edition.name,
        bookSlug: bookId,
        name: metadata.name || '',
        totalHadiths: totalCount,
        sections: metadata.sections || {},
        sectionDetails: metadata.section_details || {},
        updatedAt: new Date().toISOString()
      };

      setDocumentNonBlocking(indexRef, payload, { merge: true });
      updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { 
        indexSynced: 'yes',
        totalHadiths: totalCount
      });

      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
      toast({ title: "Index Synchronized" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Index Sync Failed", description: e.message });
    } finally {
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-12 outline-none shadow-2xl max-lg border-t border-white/5">
          <DialogHeader className="text-center">
             <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl mx-auto mb-6">
               <DatabaseZap className="w-10 h-10 text-white animate-bounce" />
             </div>
             <DialogTitle className="text-2xl font-headline font-bold text-center">Index Extraction</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm text-center">Structural analysis for {syncState.targetEdition}.</DialogDescription>
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

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 shadow-xl border-t border-white/5">
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {editions?.map((ed) => (
          <EditionCard key={ed.id} edition={ed} onSelect={onSelectEdition} onSyncIndex={handleSyncIndex} />
        ))}
      </div>
    </div>
  );
}

function EditionCard({ edition, onSelect, onSyncIndex }: { edition: any, onSelect: (id: string) => void, onSyncIndex: (ed: any) => void }) {
  const db = useFirestore();
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const isSynced = edition.indexSynced === 'yes';

  useEffect(() => {
    const q = query(collection(db, 'hadith_data'), where('editionId', '==', edition.id));
    getCountFromServer(q).then(snapshot => setSyncedCount(snapshot.data().count));
  }, [db, edition.id]);

  return (
    <Card 
      className={cn(
        "bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all shadow-xl relative border-t border-white/5",
        isSynced ? "cursor-pointer hover:border-zinc-500" : "opacity-90"
      )}
      onClick={() => isSynced && onSelect(edition.id)}
    >
      <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-zinc-600 transition-colors">
            <Languages className={cn("w-6 h-6", edition.direction === 'rtl' ? "text-amber-500" : "text-zinc-500")} />
          </div>
          <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isSynced ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>
            {isSynced ? 'Indexed' : 'Pending'}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">{edition.language} Edition</CardTitle>
        <CardDescription className="text-[10px] font-mono text-zinc-600 uppercase mt-1">{edition.name}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center">
            <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">Total</span>
            <span className="text-xs font-mono font-bold text-zinc-300">{edition.totalHadiths || '---'}</span>
          </div>
          <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center">
            <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">Synced</span>
            <span className="text-xs font-mono font-bold text-emerald-500">{syncedCount ?? '...'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-3" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl font-bold h-12 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all flex items-center justify-center gap-2"
          onClick={() => onSyncIndex(edition)}
        >
          <ListTree className="w-4 h-4" />
          {isSynced ? 'Resync' : 'Sync Index'}
        </Button>
        {isSynced && (
          <Button variant="ghost" size="icon" onClick={() => onSelect(edition.id)} className="rounded-xl h-12 w-12 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white transition-all">
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/**
 * Level 3: Section Grid
 */
export function HadithDataView({ editionId, onBack, onViewSection }: { editionId: string, onBack: () => void, onViewSection: (num: string) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const [syncState, setSyncState] = useState({
    isSyncing: false,
    progress: 0,
    status: 'idle',
    targetSection: ''
  });
  
  const indexRef = useMemoFirebase(() => doc(db, 'hadith_index', editionId), [db, editionId]);
  const { data: indexDoc, isLoading } = useDoc(indexRef);

  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const sections = useMemo(() => {
    if (!indexDoc?.sections) return [];
    return Object.entries(indexDoc.sections)
      .filter(([num]) => num !== '0')
      .map(([num, name]) => {
        const details = indexDoc.sectionDetails?.[num] || {};
        return {
          number: num,
          name: name as string,
          start_hadith_number: details.hadithnumber_first ?? 0,
          last_hadith_number: details.hadithnumber_last ?? 0,
          isSynced: !!indexDoc.syncedSections?.[num]
        };
      })
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [indexDoc]);

  const handleSyncSectionContent = async (section: any) => {
    if (!edition?.linkmin) {
      toast({ variant: "destructive", title: "Missing Source" });
      return;
    }

    setSyncState({ isSyncing: true, progress: 0, status: 'initializing', targetSection: section.name });
    
    try {
      setSyncState(prev => ({ ...prev, status: 'fetching pool', progress: 20 }));
      const payload = await fetchHadithEditionContent(edition.linkmin);
      const allHadiths = payload.hadiths || [];
      
      setSyncState(prev => ({ ...prev, status: 'filtering', progress: 40 }));
      const inRange = allHadiths.filter((h: any) => {
        const hNum = parseFloat(h.hadithnumber);
        return hNum >= section.start_hadith_number && hNum <= section.last_hadith_number;
      });

      if (inRange.length === 0) {
        toast({ title: "No Matching Records" });
        setSyncState(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      setSyncState(prev => ({ ...prev, status: 'committing', progress: 60 }));
      const batch = writeBatch(db);
      inRange.forEach((h: any) => {
        const hadithId = `${editionId}_h_${h.hadithnumber}`;
        const hRef = doc(db, 'hadith_data', hadithId);
        batch.set(hRef, {
          ...h,
          id: hadithId,
          editionId,
          bookSlug: indexDoc?.bookSlug,
          sectionNumber: section.number,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      const syncedMap = indexDoc?.syncedSections || {};
      syncedMap[section.number] = true;
      batch.update(indexRef, { syncedSections: syncedMap });

      setSyncState(prev => ({ ...prev, status: 'finalizing', progress: 90 }));
      await batch.commit();
      
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
      toast({ title: "Section Ingested" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500);
    }
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-12 outline-none shadow-2xl max-w-lg border-t border-white/5">
          <DialogHeader className="text-center">
             <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl mx-auto mb-6">
               <Zap className="w-10 h-10 text-amber-500 animate-pulse" />
             </div>
             <DialogTitle className="text-2xl font-headline font-bold text-center">Section Ingestion</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm text-center">Pulling granular records for {syncState.targetSection}.</DialogDescription>
          </DialogHeader>
          <div className="w-full space-y-6 mt-8">
             <div className="space-y-3">
               <div className="flex justify-between items-end">
                 <span className="text-[10px] font-black uppercase text-zinc-600">{syncState.status}...</span>
                 <span className="text-3xl font-headline font-bold text-white tabular-nums">{syncState.progress}%</span>
               </div>
               <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50">
                 <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 border-t border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 flex items-center justify-center transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight">{indexDoc?.name || 'Edition'} Analysis</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <DatabaseIcon className="w-3 h-3" />
              <span>Section Data Control</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Indexing section nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sections.map((s) => (
            <Card key={s.number} className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden group hover:border-zinc-500 transition-all flex flex-col shadow-2xl border-t border-white/5">
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shadow-inner">
                    <span className="text-xs font-black text-zinc-500">#{s.number}</span>
                  </div>
                  <Badge variant="outline" className={cn("border-zinc-800 text-[8px] font-black uppercase tracking-widest", s.isSynced ? "text-emerald-500" : "text-zinc-600")}>
                    {s.isSynced ? 'SYNCED' : 'PENDING'}
                  </Badge>
                </div>
                <CardTitle className="text-sm font-bold text-zinc-100 group-hover:text-white transition-colors leading-relaxed line-clamp-2 min-h-[2.5rem]">{s.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="p-8 flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center">
                    <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">Start</span>
                    <span className="text-xs font-mono font-bold text-emerald-500">{s.start_hadith_number}</span>
                  </div>
                  <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 text-center">
                    <span className="text-[8px] font-black text-zinc-600 uppercase block mb-1 tracking-widest">End</span>
                    <span className="text-xs font-mono font-bold text-zinc-400">{s.last_hadith_number}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  disabled={syncState.isSyncing}
                  onClick={() => handleSyncSectionContent(s)}
                  className="w-full rounded-xl font-bold h-12 border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{s.isSynced ? 'Resync' : 'Sync Data'}</span>
                </Button>
                {s.isSynced && (
                  <Button 
                    variant="ghost" 
                    onClick={() => onViewSection(s.number)}
                    className="w-full rounded-xl font-bold h-12 bg-zinc-900/50 text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 border border-zinc-800"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Data</span>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Level 4: Tabular Record Inspector
 */
export function HadithSectionRecordsView({ bookId, editionId, sectionNumber, onBack }: { bookId: string, editionId: string, sectionNumber: string, onBack: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const recordsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_data'),
    where('bookSlug', '==', bookId),
    where('editionId', '==', editionId),
    where('sectionNumber', '==', sectionNumber),
    orderBy('hadithnumber', 'asc'),
    limit(200)
  ), [db, bookId, editionId, sectionNumber]);

  const { data: records, isLoading } = useCollection(recordsQuery);

  const handleEdit = (record: any) => {
    setEditingRecord({ ...record });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateDocumentNonBlocking(doc(db, 'hadith_data', editingRecord.id), {
      text: editingRecord.text,
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Record Updated" });
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 border-t border-white/5 shadow-2xl">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 flex items-center justify-center transition-all active:scale-90">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight">Section {sectionNumber} Explorer</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <TableIcon className="w-3 h-3" />
              <span>Granular Record Auditor</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl border-zinc-800 text-zinc-500 font-bold">
          {records?.length || 0} Records Loaded
        </Badge>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-t border-white/5">
        <Table className="w-full">
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900 h-16">
              <TableHead className="pl-10 text-[9px] font-black uppercase text-zinc-600 w-32">Index ID</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600">Text Content</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-600 text-right pr-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-800" /></TableCell></TableRow>
            ) : records?.map((r) => (
              <TableRow key={r.id} className="border-zinc-900 h-32 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-10">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-zinc-700" />
                    <span className="text-xs font-mono font-bold text-zinc-500">{r.hadithnumber}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-4xl py-4">
                    <p className="text-sm text-zinc-300 line-clamp-3 leading-relaxed font-medium">
                      {r.text || 'No textual content found.'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r)} className="h-10 px-5 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 rounded-xl">
                    <Pencil className="w-4 h-4 mr-2" />
                    <span className="font-bold">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl bg-zinc-950 border-zinc-900 text-white rounded-[2.5rem] p-0 outline-none overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <DialogHeader className="p-8 border-b border-zinc-900 bg-zinc-900/40 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-zinc-500" />
              Edit Record Content
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">Direct modification of Prophetic text or translation.</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-8 overflow-y-auto flex-1">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">
                <Type className="w-3 h-3" /> Text Content
              </Label>
              <Textarea 
                className="bg-zinc-900 border-zinc-800 min-h-[300px] text-base text-zinc-300 rounded-2xl leading-relaxed"
                value={editingRecord?.text || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
              />
            </div>
          </div>

          <div className="p-8 bg-zinc-900/20 border-t border-zinc-900 shrink-0 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold text-zinc-500">Cancel</Button>
            <Button 
              variant="outline" 
              onClick={handleSaveEdit}
              className="rounded-xl h-12 px-10 font-bold border-white text-white hover:bg-white hover:text-black transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
