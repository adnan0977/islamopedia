
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { 
  collection, 
  query, 
  doc, 
  writeBatch, 
  where, 
  limit, 
  orderBy, 
  getDocs, 
  getDoc,
  getCountFromServer 
} from 'firebase/firestore';
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
  Hash,
  CheckCircle2
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

function isDataDifferent(newData: any, existingData: any): boolean {
  if (!existingData) return true;
  for (const key in newData) {
    if (key === 'updatedAt') continue;
    if (JSON.stringify(newData[key]) !== JSON.stringify(existingData[key])) {
      return true;
    }
  }
  return false;
}

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

          if (isDataDifferent(bookPayload, existingBook)) {
            const bookRef = doc(db, 'hadith_books', slug);
            batch.set(bookRef, { ...bookPayload, lastSyncedAt: new Date().toISOString() }, { merge: true });
            updatesCount++;
          }

          bookData.collection.forEach((ed) => {
            const existingEd = existingEditions.get(ed.name);
            const edPayload = {
              ...ed,
              id: ed.name,
              bookId: slug,
            };

            if (isDataDifferent(edPayload, existingEd)) {
              const editionRef = doc(db, 'hadith_editions', ed.name);
              batch.set(editionRef, {
                ...edPayload,
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Library className="w-6 h-6 text-zinc-400" />
            <h2 className="text-2xl font-headline font-bold text-zinc-900">Hadith Studio Library</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage master collections and their global language editions.</p>
        </div>

        <Button 
          className="rounded-xl h-12 px-8 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-lg flex items-center gap-2 transition-all active:scale-95"
          onClick={handleSeedRegistry}
          disabled={isSeeding}
        >
          {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
          <span>Seed Registry</span>
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-200" />
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Hydrating library nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="bg-white border-zinc-200 rounded-[2.5rem] overflow-hidden group hover:border-zinc-400 hover:shadow-xl transition-all flex flex-col cursor-pointer"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="p-8 border-b border-zinc-50 bg-zinc-50/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors">{book.bookName}</CardTitle>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">{book.id}</p>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-zinc-200 shrink-0 shadow-sm">
                    <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 flex-1">
                <div className="flex items-center gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <Languages className="w-5 h-5 text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-xl font-headline font-bold text-zinc-900">{book.editionCount || 0}</span>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Translations</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
                <Badge className="bg-zinc-100 text-zinc-500 border-none text-[8px] font-black px-3 py-1 rounded-full uppercase">Master Collection</Badge>
                <span className="text-[10px] font-mono text-zinc-300">{book.id}.json</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

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
      setSyncState(prev => ({ ...prev, status: 'comparing', progress: 50 }));
      const indexRef = doc(db, 'hadith_index', edition.name);
      const existingSnap = await getDoc(indexRef);
      const existingData = existingSnap.exists() ? existingSnap.data() : null;
      const totalCount = hadiths?.length || 0;
      const payload = { id: edition.name, editionId: edition.name, bookSlug: bookId, name: metadata.name || '', totalHadiths: totalCount, sections: metadata.sections || {}, sectionDetails: metadata.section_details || {} };
      if (isDataDifferent(payload, existingData)) {
        setDocumentNonBlocking(indexRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { indexSynced: 'yes', totalHadiths: totalCount });
        toast({ title: "Index Synchronized" });
      } else { toast({ title: "Index Up to Date" }); }
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) { toast({ variant: "destructive", title: "Index Sync Failed", description: e.message }); } finally { setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500); }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-white border-zinc-200 rounded-[2.5rem] p-12 outline-none shadow-2xl max-w-lg">
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="w-20 h-20 bg-zinc-50 rounded-[2rem] flex items-center justify-center border border-zinc-100 shadow-inner">
               <DatabaseZap className="w-10 h-10 text-zinc-900 animate-bounce" />
             </div>
             <DialogHeader className="space-y-2">
               <DialogTitle className="text-2xl font-headline font-bold">Index Extraction</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm">Structural analysis for {syncState.targetEdition}.</DialogDescription>
             </DialogHeader>
             <div className="w-full space-y-3">
               <div className="flex justify-between items-end">
                 <span className="text-[10px] font-black uppercase text-zinc-400">{syncState.status}...</span>
                 <span className="text-2xl font-headline font-bold text-zinc-900">{syncState.progress}%</span>
               </div>
               <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                 <div className="h-full bg-zinc-900 transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-12 w-12 transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-zinc-900 leading-tight">{book?.bookName}</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-400 tracking-widest">
              <ScrollText className="w-3 h-3" />
              <span>Edition Matrix</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        "bg-white border-zinc-200 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all shadow-sm relative",
        isSynced ? "cursor-pointer hover:border-zinc-400 hover:shadow-md" : "opacity-90"
      )}
      onClick={() => isSynced && onSelect(edition.id)}
    >
      <CardHeader className="p-8 border-b border-zinc-50 bg-zinc-50/50">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm group-hover:border-zinc-400 transition-colors">
            <Languages className={cn("w-6 h-6", edition.direction === 'rtl' ? "text-amber-600" : "text-zinc-400")} />
          </div>
          <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isSynced ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
            {isSynced ? 'Indexed' : 'Pending'}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors">{edition.language} Edition</CardTitle>
        <CardDescription className="text-[10px] font-mono text-zinc-400 uppercase mt-1">{edition.name}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 flex-1 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase block mb-1 tracking-widest">Total</span>
            <span className="text-xs font-mono font-bold text-zinc-900">{edition.totalHadiths || '---'}</span>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase block mb-1 tracking-widest">Synced</span>
            <span className="text-xs font-mono font-bold text-emerald-600">{syncedCount ?? '...'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 bg-zinc-50/50 border-t border-zinc-100 flex justify-between gap-3" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl font-bold h-11 border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-all flex items-center justify-center gap-2 shadow-sm"
          onClick={() => onSyncIndex(edition)}
        >
          <ListTree className="w-4 h-4" />
          {isSynced ? 'Resync' : 'Sync Index'}
        </Button>
        {isSynced && (
          <Button variant="ghost" size="icon" onClick={() => onSelect(edition.id)} className="rounded-xl h-11 w-11 border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 transition-all">
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function HadithDataView({ editionId, onBack, onViewSection }: { editionId: string, onBack: () => void, onViewSection: (num: string) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [syncState, setSyncState] = useState({ isSyncing: false, progress: 0, status: 'idle', targetSection: '' });
  const indexRef = useMemoFirebase(() => doc(db, 'hadith_index', editionId), [db, editionId]);
  const { data: indexDoc, isLoading } = useDoc(indexRef);
  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const sections = useMemo(() => {
    if (!indexDoc?.sections) return [];
    return Object.entries(indexDoc.sections).filter(([num]) => num !== '0').map(([num, name]) => {
      const details = indexDoc.sectionDetails?.[num] || {};
      return { number: num, name: name as string, start_hadith_number: details.hadithnumber_first ?? 0, last_hadith_number: details.hadithnumber_last ?? 0, isSynced: !!indexDoc.syncedSections?.[num] };
    }).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [indexDoc]);

  const handleSyncSectionContent = async (section: any) => {
    if (!edition?.linkmin) { toast({ variant: "destructive", title: "Missing Source" }); return; }
    setSyncState({ isSyncing: true, progress: 0, status: 'initializing', targetSection: section.name });
    try {
      const payload = await fetchHadithEditionContent(edition.linkmin);
      const allHadiths = payload.hadiths || [];
      const inRange = allHadiths.filter((h: any) => { const hNum = parseFloat(h.hadithnumber); return hNum >= section.start_hadith_number && hNum <= section.last_hadith_number; });
      if (inRange.length === 0) { toast({ title: "No Matching Records" }); setSyncState(prev => ({ ...prev, isSyncing: false })); return; }
      const existingSnap = await getDocs(query(collection(db, 'hadith_data'), where('editionId', '==', editionId), where('sectionNumber', '==', section.number)));
      const existingMap = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
      const batch = writeBatch(db);
      let updatesCount = 0;
      inRange.forEach((h: any) => {
        const hadithId = `${editionId}_h_${h.hadithnumber}`;
        const existing = existingMap.get(hadithId);
        const hPayload = { ...h, id: hadithId, editionId, bookSlug: indexDoc?.bookSlug, sectionNumber: section.number };
        if (isDataDifferent(hPayload, existing)) { batch.set(doc(db, 'hadith_data', hadithId), { ...hPayload, updatedAt: new Date().toISOString() }, { merge: true }); updatesCount++; }
      });
      if (updatesCount > 0) { await batch.commit(); toast({ title: "Section Ingested", description: `Updated ${updatesCount} records.` }); } else { toast({ title: "Section Up to Date" }); }
      if (!indexDoc?.syncedSections?.[section.number]) { const syncedMap = indexDoc?.syncedSections || {}; syncedMap[section.number] = true; updateDocumentNonBlocking(indexRef, { syncedSections: syncedMap }); }
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) { toast({ variant: "destructive", title: "Sync Failed", description: e.message }); } finally { setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500); }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-white border-zinc-200 rounded-[2.5rem] p-12 outline-none shadow-2xl max-w-lg">
          <div className="flex flex-col items-center text-center space-y-6">
             <div className="w-20 h-20 bg-amber-50 rounded-[2rem] flex items-center justify-center border border-amber-100 shadow-inner">
               <Zap className="w-10 h-10 text-amber-600 animate-pulse" />
             </div>
             <DialogTitle className="text-2xl font-headline font-bold">Section Ingestion</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm">Pulling granular records for {syncState.targetSection}.</DialogDescription>
             <div className="w-full space-y-3">
               <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase text-zinc-400">{syncState.status}...</span><span className="text-2xl font-headline font-bold text-zinc-900">{syncState.progress}%</span></div>
               <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${syncState.progress}%` }} /></div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-12 w-12 flex items-center justify-center transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-zinc-900 tracking-tight">{indexDoc?.name || 'Edition'} Analysis</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-400 tracking-widest">
              <DatabaseIcon className="w-3 h-3" />
              <span>Section Data Control</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-200" />
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">Indexing section nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sections.map((s) => (
            <Card key={s.number} className="bg-white border-zinc-200 rounded-[2.5rem] overflow-hidden group hover:border-zinc-400 transition-all flex flex-col shadow-sm">
              <CardHeader className="p-8 border-b border-zinc-50 bg-zinc-50/50 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-sm font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors leading-relaxed line-clamp-2 min-h-[2.5rem]">
                    {s.name}
                  </CardTitle>
                  <span className="text-[10px] font-black text-zinc-300 mt-1 shrink-0">#{s.number}</span>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-100">
                  <Badge variant="outline" className={cn("border-none text-[8px] font-black uppercase tracking-[0.1em] shrink-0 px-2 py-0.5 rounded-full", s.isSynced ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
                    {s.isSynced ? 'SYNCED' : 'PENDING'}
                  </Badge>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-900">{s.start_hadith_number}</span>
                    <div className="w-1.5 h-[1px] bg-zinc-200" />
                    <span className="text-[10px] font-mono font-bold text-zinc-400">{s.last_hadith_number}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardFooter className="p-6 bg-white border-t border-zinc-50 flex items-center gap-3">
                <Button 
                  variant="outline" 
                  disabled={syncState.isSyncing}
                  onClick={() => handleSyncSectionContent(s)}
                  className="flex-1 rounded-xl font-bold h-11 border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Zap className="w-4 h-4" />
                  <span>{s.isSynced ? 'Resync' : 'Sync'}</span>
                </Button>
                {s.isSynced && (
                  <Button 
                    variant="ghost" 
                    onClick={() => onViewSection(s.number)}
                    className="flex-1 rounded-xl font-bold h-11 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
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
    limit(200)
  ), [db, bookId, editionId, sectionNumber]);

  const { data: rawRecords, isLoading } = useCollection(recordsQuery);

  const sortedRecords = useMemo(() => {
    if (!rawRecords) return [];
    return [...rawRecords].sort((a, b) => parseFloat(a.hadithnumber) - parseFloat(b.hadithnumber));
  }, [rawRecords]);

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
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-12 w-12 flex items-center justify-center transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-zinc-900 tracking-tight">Section {sectionNumber} Explorer</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-400 tracking-widest">
              <TableIcon className="w-3 h-3" />
              <span>Granular Record Auditor</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl border-zinc-200 bg-white text-zinc-500 font-bold shadow-sm">
          {sortedRecords?.length || 0} Records Loaded
        </Badge>
      </div>

      <Card className="bg-white border-zinc-200 rounded-[2.5rem] overflow-hidden shadow-sm">
        <Table className="w-full">
          <TableHeader className="bg-zinc-50">
            <TableRow className="border-zinc-100 h-16">
              <TableHead className="pl-10 text-[9px] font-black uppercase text-zinc-400 w-32 tracking-[0.2em]">Index ID</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em]">Text Content</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-400 text-right pr-10 tracking-[0.2em]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-64 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-200" /></TableCell></TableRow>
            ) : sortedRecords?.map((r) => (
              <TableRow key={r.id} className="border-zinc-100 h-32 hover:bg-zinc-50/50 transition-colors">
                <TableCell className="pl-10">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3 h-3 text-zinc-200" />
                    <span className="text-xs font-mono font-bold text-zinc-900">{r.hadithnumber}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-4xl py-4">
                    <p className="text-sm text-zinc-600 line-clamp-3 leading-relaxed font-medium">
                      {r.text || 'No textual content found.'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r)} className="h-10 px-5 text-zinc-400 hover:text-zinc-900 transition-all border border-transparent hover:bg-zinc-100 rounded-xl">
                    <Pencil className="w-4 h-4 mr-2" />
                    <span className="font-bold text-xs uppercase tracking-widest">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-4xl bg-white border-zinc-200 text-zinc-900 rounded-[2.5rem] p-0 outline-none overflow-hidden shadow-2xl flex flex-col h-[85vh]">
          <DialogHeader className="p-8 border-b border-zinc-100 bg-zinc-50 shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-zinc-400" />
              Edit Record Content
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-1">Direct modification of Prophetic text or translation.</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-8 overflow-y-auto flex-1">
            <div className="space-y-4 h-full flex flex-col">
              <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <Type className="w-3 h-3" /> Text Content
              </Label>
              <Textarea 
                className="bg-zinc-50 border-zinc-200 flex-1 min-h-[500px] text-lg text-zinc-900 rounded-2xl leading-relaxed p-8 focus:ring-zinc-900 focus:bg-white transition-all shadow-inner"
                value={editingRecord?.text || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
              />
            </div>
          </div>

          <div className="p-8 bg-zinc-50 border-t border-zinc-100 shrink-0 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold text-zinc-400">Cancel</Button>
            <Button 
              className="rounded-xl h-12 px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg"
              onClick={handleSaveEdit}
            >
              <Save className="w-4 h-4" /> Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
