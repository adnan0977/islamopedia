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
  DialogDescription,
  DialogFooter
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
        toast({ title: "Registry Updated", description: `${updatesCount} nodes refreshed.` });
      } else {
        toast({ title: "Database Sync Complete" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Seeding Failed", description: e.message });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Hadith Library</h1>
          <p className="text-sm text-muted-foreground">Manage canonical master collections and verified editions.</p>
        </div>
        <Button 
          onClick={handleSeedRegistry}
          disabled={isSeeding}
          className="gap-2"
        >
          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          Seed Registry
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Hydrating Collections...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="cursor-pointer transition-colors hover:bg-muted/50 group border-border shadow-sm"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-muted rounded-lg group-hover:bg-background transition-colors">
                    <Library className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <CardTitle className="text-lg leading-tight">{book.bookName}</CardTitle>
                <CardDescription className="text-xs uppercase font-bold tracking-tight">{book.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold leading-none">{book.editionCount || 0}</span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase mt-1">Editions Available</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0 pb-4 flex items-center justify-between text-muted-foreground">
                <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest px-2 py-0">Master Feed</Badge>
                <span className="text-[10px] font-mono opacity-50">{book.id}.db</span>
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
      } else {
        toast({ title: "Index Up to Date" });
      }
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Index Sync Failed", description: e.message });
    } finally {
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500);
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
             <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border animate-pulse">
               <DatabaseZap className="w-6 h-6 text-primary" />
             </div>
             <DialogHeader>
               <DialogTitle>Index Extraction</DialogTitle>
               <DialogDescription>Structural mapping analysis for {syncState.targetEdition}.</DialogDescription>
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

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight">{book?.bookName}</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Edition Registry</p>
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
        "flex flex-col group transition-all border shadow-sm",
        isSynced ? "cursor-pointer hover:border-primary/50" : "opacity-90"
      )}
      onClick={() => isSynced && onSelect(edition.id)}
    >
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-muted p-2 rounded-lg">
            <Languages className={cn("w-5 h-5", edition.direction === 'rtl' ? "text-primary" : "text-muted-foreground")} />
          </div>
          <Badge variant={isSynced ? "default" : "secondary"} className="text-[9px] font-bold uppercase tracking-widest">
            {isSynced ? 'Indexed' : 'Pending'}
          </Badge>
        </div>
        <CardTitle className="text-base leading-tight group-hover:text-primary transition-colors">{edition.language} Edition</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase opacity-50">{edition.name}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted/50 rounded-lg text-center border">
            <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Total</span>
            <span className="text-xs font-mono font-bold">{edition.totalHadiths || '---'}</span>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center border">
            <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Synced</span>
            <span className="text-xs font-mono font-bold text-primary">{syncedCount ?? '...'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0 pb-4 gap-2" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 h-8 text-[10px] font-bold uppercase tracking-widest"
          onClick={() => onSyncIndex(edition)}
        >
          <ListTree className="w-3 h-3 mr-2" />
          {isSynced ? 'Resync' : 'Sync'}
        </Button>
        {isSynced && (
          <Button variant="outline" size="icon" onClick={() => onSelect(edition.id)} className="h-8 w-8">
            <ChevronRight className="w-4 h-4" />
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
      return { 
        number: num, 
        name: name as string, 
        start_hadith_number: details.hadithnumber_first ?? 0, 
        last_hadith_number: details.hadithnumber_last ?? 0, 
        isSynced: !!indexDoc.syncedSections?.[num] 
      };
    }).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [indexDoc]);

  const handleSyncSectionContent = async (section: any) => {
    if (!edition?.linkmin) { toast({ variant: "destructive", title: "Missing Source" }); return; }
    setSyncState({ isSyncing: true, progress: 0, status: 'initializing', targetSection: section.name });
    try {
      const payload = await fetchHadithEditionContent(edition.linkmin);
      const allHadiths = payload.hadiths || [];
      const inRange = allHadiths.filter((h: any) => { 
        const hNum = parseFloat(h.hadithnumber); 
        return hNum >= section.start_hadith_number && hNum <= section.last_hadith_number; 
      });
      
      if (inRange.length === 0) { 
        toast({ title: "No Matching Records" }); 
        setSyncState(prev => ({ ...prev, isSyncing: false })); 
        return; 
      }

      const existingSnap = await getDocs(query(
        collection(db, 'hadith_data'), 
        where('editionId', '==', editionId), 
        where('sectionNumber', '==', section.number)
      ));
      const existingMap = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
      
      const batch = writeBatch(db);
      let updatesCount = 0;
      
      inRange.forEach((h: any) => {
        const hadithId = `${editionId}_h_${h.hadithnumber}`;
        const existing = existingMap.get(hadithId);
        const hPayload = { ...h, id: hadithId, editionId, bookSlug: indexDoc?.bookSlug, sectionNumber: section.number };
        
        if (isDataDifferent(hPayload, existing)) { 
          batch.set(doc(db, 'hadith_data', hadithId), { ...hPayload, updatedAt: new Date().toISOString() }, { merge: true }); 
          updatesCount++; 
        }
      });

      if (updatesCount > 0) { 
        await batch.commit(); 
        toast({ title: "Section Sync complete", description: `${updatesCount} nodes updated.` }); 
      } else { 
        toast({ title: "Section Up to Date" }); 
      }

      if (!indexDoc?.syncedSections?.[section.number]) { 
        const syncedMap = indexDoc?.syncedSections || {}; 
        syncedMap[section.number] = true; 
        updateDocumentNonBlocking(indexRef, { syncedSections: syncedMap }); 
      }
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Sync Failed", description: e.message }); 
    } finally { 
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500); 
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
             <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border animate-pulse">
               <Zap className="w-6 h-6 text-primary" />
             </div>
             <DialogHeader>
               <DialogTitle>Section Ingestion</DialogTitle>
               <DialogDescription>Ingesting records for {syncState.targetSection}.</DialogDescription>
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

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight">{indexDoc?.name || 'Edition'} Analysis</h2>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Section Inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sections.map((s) => (
          <Card key={s.number} className="flex flex-col group border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-4">
                <CardTitle className="text-sm font-bold leading-tight line-clamp-2 min-h-[2.5rem]">{s.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono opacity-50 shrink-0">#{s.number}</Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Badge variant={s.isSynced ? "default" : "secondary"} className="text-[8px] font-bold uppercase tracking-widest">
                  {s.isSynced ? 'Synced' : 'Pending'}
                </Badge>
                <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                  <span className="font-bold text-foreground">{s.start_hadith_number}</span>
                  <span>-</span>
                  <span className="font-bold text-foreground">{s.last_hadith_number}</span>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="pt-0 pb-4 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-[10px] font-bold uppercase tracking-widest"
                onClick={() => handleSyncSectionContent(s)}
              >
                <Zap className="w-3 h-3 mr-2" />
                {s.isSynced ? 'Resync' : 'Sync'}
              </Button>
              {s.isSynced && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-8 text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => onViewSection(s.number)}
                >
                  <Eye className="w-3 h-3 mr-2" />
                  View
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-0.5">
            <h2 className="text-xl font-bold tracking-tight">Section {sectionNumber} Explorer</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Granular Audit</p>
          </div>
        </div>
        <Badge variant="secondary" className="px-4 py-1 font-mono text-[10px]">
          {sortedRecords?.length || 0} Records Loaded
        </Badge>
      </div>

      <Card className="overflow-hidden border shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-24 text-[10px] font-bold uppercase tracking-widest pl-6">Ref</TableHead>
              <TableHead className="text-[10px] font-bold uppercase tracking-widest">Content Narrative</TableHead>
              <TableHead className="w-32 text-right text-[10px] font-bold uppercase tracking-widest pr-6">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="h-64 text-center text-muted-foreground text-xs uppercase font-bold tracking-widest">Indexing Viewport...</TableCell></TableRow>
            ) : sortedRecords?.map((r) => (
              <TableRow key={r.id} className="h-24 hover:bg-muted/30 transition-colors">
                <TableCell className="pl-6">
                  <Badge variant="outline" className="font-mono text-[10px]">#{r.hadithnumber}</Badge>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed font-medium max-w-2xl py-4">
                    {r.text || '---'}
                  </p>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(r)} className="h-8 gap-2 px-4 hover:bg-background border border-transparent hover:border-border">
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background border rounded-lg">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle>Edit Prophetic Record</DialogTitle>
                <DialogDescription>Refine textual content or correct translation errors.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Narrative Text</Label>
              <Textarea 
                className="min-h-[500px] text-base leading-relaxed font-medium p-6 resize-none focus-visible:ring-primary"
                value={editingRecord?.text || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="p-6 border-t bg-muted/30 shrink-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button className="px-8" onClick={handleSaveEdit}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
