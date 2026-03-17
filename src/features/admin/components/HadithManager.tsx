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
  'abudawud', 'bukhari', 'ibnmajah', 'malik', 
  'muslim', 'nasai', 'tirmidhi'
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
    <div className="space-y-10 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-4">
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center border border-zinc-100 shadow-inner">
              <Library className="w-6 h-6 text-zinc-400" />
            </div>
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">Hadith Studio Hub</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium max-w-lg">Manage canonical master collections and their verified global language editions.</p>
        </div>

        <Button 
          className="rounded-2xl h-14 px-10 font-bold bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl flex items-center gap-3 transition-all active:scale-95"
          onClick={handleSeedRegistry}
          disabled={isSeeding}
        >
          {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
          <span className="text-sm uppercase tracking-widest">Seed Registry</span>
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-6">
          <Loader2 className="w-14 h-14 animate-spin text-zinc-200" />
          <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.3em]">Hydrating library nodes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="bg-white border-zinc-200 rounded-[3rem] overflow-hidden group hover:border-zinc-400 hover:shadow-2xl transition-all flex flex-col cursor-pointer border-t-4 border-t-transparent hover:border-t-zinc-900"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="p-10 border-b border-zinc-50 bg-zinc-50/30">
                <div className="flex items-start justify-between gap-6">
                  <div className="space-y-2">
                    <CardTitle className="text-xl font-bold text-zinc-900 leading-snug group-hover:text-zinc-600 transition-colors">{book.bookName}</CardTitle>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{book.id}</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-zinc-100 shrink-0 shadow-sm group-hover:bg-zinc-900 group-hover:border-zinc-900 transition-all">
                    <ChevronRight className="w-6 h-6 text-zinc-300 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 flex-1">
                <div className="flex items-center gap-4 p-6 bg-zinc-50 rounded-3xl border border-zinc-100 shadow-inner group-hover:bg-white group-hover:border-zinc-200 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-100 flex items-center justify-center">
                    <Languages className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-2xl font-headline font-bold text-zinc-900 leading-none">{book.editionCount || 0}</span>
                    <span className="text-[9px] font-black uppercase text-zinc-400 tracking-[0.2em] mt-1">Available Editions</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-8 bg-zinc-50/30 border-t border-zinc-100 flex items-center justify-between">
                <Badge className="bg-zinc-900 text-white border-none text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Master Feed</Badge>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Database className="w-3 h-3" />
                  <span className="text-[9px] font-mono">{book.id}.db</span>
                </div>
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
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-white border-zinc-200 rounded-[3rem] p-16 outline-none shadow-2xl max-w-xl">
          <div className="flex flex-col items-center text-center space-y-8">
             <div className="w-24 h-24 bg-zinc-50 rounded-[2.5rem] flex items-center justify-center border border-zinc-100 shadow-inner">
               <DatabaseZap className="w-12 h-12 text-zinc-900 animate-bounce" />
             </div>
             <DialogHeader className="space-y-3">
               <DialogTitle className="text-3xl font-headline font-bold text-zinc-900">Index Extraction</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm max-w-xs mx-auto">Structural mapping analysis for {syncState.targetEdition}.</DialogDescription>
             </DialogHeader>
             <div className="w-full space-y-4">
               <div className="flex justify-between items-end">
                 <span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{syncState.status}...</span>
                 <span className="text-3xl font-headline font-bold text-zinc-900 tabular-nums">{syncState.progress}%</span>
               </div>
               <div className="h-3 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 p-0.5">
                 <div className="h-full bg-zinc-900 rounded-full transition-all duration-500 ease-out" style={{ width: `${syncState.progress}%` }} />
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-8">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-2xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 h-14 w-14 transition-all shadow-sm group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">{book?.bookName}</h2>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Edition Matrix Directory</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
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
        "bg-white border-zinc-200 rounded-[3rem] overflow-hidden flex flex-col group transition-all shadow-sm relative border-t-4 border-t-transparent",
        isSynced ? "cursor-pointer hover:border-zinc-400 hover:shadow-2xl hover:border-t-emerald-500" : "opacity-90 hover:border-zinc-300"
      )}
      onClick={() => isSynced && onSelect(edition.id)}
    >
      <CardHeader className="p-10 border-b border-zinc-50 bg-zinc-50/30">
        <div className="flex justify-between items-start mb-8">
          <div className="bg-white p-5 rounded-2xl border border-zinc-100 shadow-sm group-hover:border-zinc-200 transition-colors">
            <Languages className={cn("w-7 h-7", edition.direction === 'rtl' ? "text-amber-600" : "text-zinc-400")} />
          </div>
          <Badge className={cn("border-none text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full", isSynced ? "bg-emerald-50 text-emerald-600 shadow-sm" : "bg-zinc-100 text-zinc-400")}>
            {isSynced ? 'Indexed' : 'Pending'}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors leading-tight">{edition.language} Edition</CardTitle>
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter mt-2">{edition.name}</p>
      </CardHeader>
      
      <CardContent className="p-10 flex-1 space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center shadow-inner group-hover:bg-white transition-colors">
            <span className="text-[9px] font-black text-zinc-400 uppercase block mb-2 tracking-widest">Total</span>
            <span className="text-sm font-mono font-bold text-zinc-900">{edition.totalHadiths || '---'}</span>
          </div>
          <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100 text-center shadow-inner group-hover:bg-white transition-colors">
            <span className="text-[9px] font-black text-zinc-400 uppercase block mb-2 tracking-widest">Synced</span>
            <span className="text-sm font-mono font-bold text-emerald-600">{syncedCount ?? '...'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 bg-zinc-50/30 border-t border-zinc-100 flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          className="flex-1 rounded-xl font-bold h-12 border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:border-zinc-900 transition-all flex items-center justify-center gap-3 shadow-sm"
          onClick={() => onSyncIndex(edition)}
        >
          <ListTree className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest">{isSynced ? 'Resync' : 'Sync Index'}</span>
        </Button>
        {isSynced && (
          <Button variant="ghost" size="icon" onClick={() => onSelect(edition.id)} className="rounded-xl h-12 w-12 border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm group/btn">
            <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
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
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-white border-zinc-200 rounded-[3rem] p-16 outline-none shadow-2xl max-w-xl">
          <div className="flex flex-col items-center text-center space-y-8">
             <div className="w-24 h-24 bg-amber-50 rounded-[2.5rem] flex items-center justify-center border border-amber-100 shadow-inner">
               <Zap className="w-12 h-12 text-amber-600 animate-pulse" />
             </div>
             <DialogTitle className="text-3xl font-headline font-bold text-zinc-900">Section Ingestion</DialogTitle>
             <DialogDescription className="text-zinc-500 text-sm max-w-xs mx-auto">Ingesting Prophetic records for {syncState.targetSection}.</DialogDescription>
             <div className="w-full space-y-4">
               <div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">{syncState.status}...</span><span className="text-3xl font-headline font-bold text-zinc-900 tabular-nums">{syncState.progress}%</span></div>
               <div className="h-3 w-full bg-zinc-50 rounded-full overflow-hidden border border-zinc-100 p-0.5"><div className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(245,158,11,0.3)]" style={{ width: `${syncState.progress}%` }} /></div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-8">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-2xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-14 w-14 flex items-center justify-center transition-all shadow-sm group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">{indexDoc?.name || 'Edition'} Analysis</h2>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">
              <DatabaseIcon className="w-3.5 h-3.5" />
              <span>Section Inventory Control</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {sections.map((s) => (
          <Card key={s.number} className="bg-white border-zinc-200 rounded-[3rem] overflow-hidden group hover:border-zinc-400 transition-all flex flex-col shadow-sm border-t-4 border-t-transparent hover:border-t-amber-500">
            <CardHeader className="p-10 border-b border-zinc-50 bg-zinc-50/30 space-y-6">
              <div className="flex items-start justify-between gap-6">
                <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors leading-relaxed line-clamp-2 min-h-[3rem]">
                  {s.name}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center shadow-inner">
                  <span className="text-[10px] font-black text-zinc-300">#{s.number}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-6 border-t border-zinc-100">
                <Badge variant="outline" className={cn("border-none text-[9px] font-black uppercase tracking-[0.15em] shrink-0 px-4 py-1.5 rounded-full shadow-sm", s.isSynced ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
                  {s.isSynced ? 'SYNCED' : 'PENDING'}
                </Badge>
                
                <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-full border border-zinc-100 shadow-inner">
                  <span className="text-[10px] font-mono font-bold text-zinc-900">{s.start_hadith_number}</span>
                  <div className="w-2 h-[1px] bg-zinc-200" />
                  <span className="text-[10px] font-mono font-bold text-zinc-400">{s.last_hadith_number}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardFooter className="p-8 bg-zinc-50/30 border-t border-zinc-100 flex items-center gap-4">
              <Button 
                variant="outline" 
                disabled={syncState.isSyncing}
                onClick={() => handleSyncSectionContent(s)}
                className="flex-1 rounded-xl font-bold h-12 border-zinc-200 bg-white text-zinc-600 hover:text-amber-600 hover:border-amber-600 transition-all flex items-center justify-center gap-3 shadow-sm"
              >
                <Zap className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest">{s.isSynced ? 'Resync' : 'Sync'}</span>
              </Button>
              {s.isSynced && (
                <Button 
                  variant="ghost" 
                  onClick={() => onViewSection(s.number)}
                  className="flex-1 rounded-xl font-bold h-12 bg-zinc-100 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest">View</span>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
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
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-10 rounded-[3rem] border border-zinc-200 shadow-sm gap-8">
        <div className="flex items-center gap-8">
          <Button variant="outline" size="icon" onClick={onBack} className="rounded-2xl border-zinc-200 bg-white text-zinc-400 hover:text-zinc-900 h-14 w-14 flex items-center justify-center transition-all shadow-sm group">
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-headline font-bold text-zinc-900 tracking-tight">Section {sectionNumber} Explorer</h2>
            <div className="flex items-center gap-3 text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Granular Record Auditor</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="h-12 px-8 rounded-2xl border-zinc-200 bg-zinc-50 text-zinc-500 font-bold shadow-inner uppercase tracking-widest text-[10px]">
          {sortedRecords?.length || 0} Records Loaded
        </Badge>
      </div>

      <Card className="bg-white border-zinc-200 rounded-[3rem] overflow-hidden shadow-sm">
        <Table className="w-full">
          <TableHeader className="bg-zinc-50/50">
            <TableRow className="border-zinc-100 h-24">
              <TableHead className="pl-12 text-[10px] font-black uppercase text-zinc-400 w-40 tracking-[0.2em]">Index ID</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Narrative Content</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-zinc-400 text-right pr-12 tracking-[0.2em]">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="w-10 h-10 animate-spin text-zinc-200" /><p className="text-[10px] font-black uppercase text-zinc-300 tracking-[0.2em]">Indexing viewport...</p></div></TableCell></TableRow>
            ) : sortedRecords?.map((r) => (
              <TableRow key={r.id} className="border-zinc-100 h-40 hover:bg-zinc-50/50 transition-colors">
                <TableCell className="pl-12">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-100 shadow-inner">
                      <Hash className="w-3.5 h-3.5 text-zinc-200" />
                    </div>
                    <span className="text-xs font-mono font-bold text-zinc-900">{r.hadithnumber}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-5xl py-8">
                    <p className="text-sm text-zinc-600 line-clamp-4 leading-relaxed font-medium">
                      {r.text || 'No textual content detected.'}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-12">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r)} className="h-12 px-8 text-zinc-400 hover:text-zinc-900 transition-all border border-transparent hover:bg-white hover:border-zinc-200 hover:shadow-sm rounded-xl">
                    <Pencil className="w-4 h-4 mr-3" />
                    <span className="font-bold text-[10px] uppercase tracking-[0.2em]">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-5xl bg-white border-zinc-200 text-zinc-900 rounded-[3rem] p-0 outline-none overflow-hidden shadow-2xl flex flex-col h-[85vh]">
          <DialogHeader className="p-10 border-b border-zinc-100 bg-zinc-50 shrink-0">
            <DialogTitle className="text-2xl font-headline font-bold flex items-center gap-4">
              <div className="w-10 h-10 bg-white border border-zinc-100 rounded-xl flex items-center justify-center shadow-sm">
                <Pencil className="w-5 h-5 text-zinc-400" />
              </div>
              Edit Prophetic Record
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-sm mt-2">Refine textual content or correct translation errors.</DialogDescription>
          </DialogHeader>
          
          <div className="p-10 space-y-10 overflow-y-auto flex-1 bg-white">
            <div className="space-y-6 h-full flex flex-col">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-zinc-50 rounded-lg flex items-center justify-center border border-zinc-100 shadow-inner">
                  <Type className="w-4 h-4 text-zinc-400" />
                </div>
                <Label className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Narrative Text</Label>
              </div>
              <Textarea 
                className="bg-zinc-50 border-zinc-200 flex-1 min-h-[500px] text-lg text-zinc-900 rounded-[2rem] leading-[1.8] p-10 focus:ring-zinc-900 focus:bg-white transition-all shadow-inner border-dashed border-2"
                value={editingRecord?.text || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
              />
            </div>
          </div>

          <div className="p-10 bg-zinc-50 border-t border-zinc-100 shrink-0 flex justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl h-14 px-8 font-bold text-zinc-400 hover:text-zinc-900">Cancel</Button>
            <Button 
              className="rounded-2xl h-14 px-12 font-bold bg-zinc-900 text-white hover:bg-zinc-800 transition-all flex items-center gap-3 shadow-xl active:scale-95"
              onClick={handleSaveEdit}
            >
              <Save className="w-5 h-5" />
              <span className="text-sm uppercase tracking-widest">Save Changes</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
