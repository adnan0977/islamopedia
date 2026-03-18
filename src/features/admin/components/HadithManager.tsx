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
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Library,
  ChevronRight,
  ArrowLeft,
  Languages,
  CloudDownload,
  ListTree,
  Zap,
  Eye,
  Pencil,
  Save,
  Plus,
  RefreshCcw,
  Database,
  CheckCircle2,
  AlertCircle,
  Trash2
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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { fetchHadithRegistry, fetchHadithEditionContent, fetchHadithApiBooks, FawazEdition } from '@/services/hadith-api';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

/**
 * Mapping for canonical book ordering from HadithAPI slugs.
 */
const BOOK_ORDER: Record<string, number> = {
  'sahih-bukhari': 1,
  'sahih-muslim': 2,
  'al-tirmidhi': 3,
  'sunan-abu-dawood': 4,
  'sunan-nasai': 5,
  'sunan-ibn-majah': 6,
  'mishkat-al-masabih': 7,
  'musnad-ahmad': 8,
  'al-muwatta': 9
};

function isDataDifferent(newData: any, existingData: any): boolean {
  if (!existingData) return true;
  for (const key in newData) {
    if (key === 'updatedAt' || key === 'syncedSections' || key === 'lastSyncedAt') continue;
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
    orderBy('orderKey', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  /**
   * Performs an overhaul of the Hadith collection using HadithAPI.com.
   * This wipes existing book metadata and repopulates from the premium source.
   */
  const handleOverhaulRegistry = async () => {
    setIsSeeding(true);
    try {
      // 1. Fetch new registry from HadithAPI.com
      const registryData = await fetchHadithApiBooks();
      if (!registryData.books || !Array.isArray(registryData.books)) {
        throw new Error("Invalid response from HadithAPI");
      }

      // 2. Fetch existing books to handle cleanup
      const existingSnap = await getDocs(collection(db, 'hadith_books'));
      const existingIds = existingSnap.docs.map(d => d.id);

      // 3. Batch process the overhaul
      const batch = writeBatch(db);
      
      // Clear legacy books that might have different slugs
      existingIds.forEach(id => {
        batch.delete(doc(db, 'hadith_books', id));
      });

      // Populate new books
      registryData.books.forEach((book: any) => {
        const slug = book.bookSlug;
        const bookRef = doc(db, 'hadith_books', slug);
        
        const payload = {
          id: slug,
          bookName: book.bookName,
          totalHadiths: parseInt(book.hadiths_count) || 0,
          editionCount: 1, // HadithAPI typically provides a unified view
          orderKey: BOOK_ORDER[slug] || 99,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        batch.set(bookRef, payload, { merge: true });
      });

      await batch.commit();
      toast({ title: "Registry Overhauled", description: `Successfully synced ${registryData.books.length} canonical collections.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Overhaul Failed", description: e.message });
    } finally {
      setIsSeeding(false);
    }
  };

  /**
   * Legacy logic for refreshing edition counts from the old source.
   */
  const handleSyncEditions = async () => {
    setIsSeeding(true);
    try {
      const registry = await fetchHadithRegistry();
      const batch = writeBatch(db);
      let count = 0;

      // We only update editions for books that exist in our new overhauled list
      const booksSnap = await getDocs(collection(db, 'hadith_books'));
      const activeSlugs = new Set(booksSnap.docs.map(d => d.id));

      Object.entries(registry).forEach(([slug, bookData]) => {
        // Attempt to find a matching slug in our system (either bukhari or sahih-bukhari)
        const match = Array.from(activeSlugs).find(s => s.includes(slug) || slug.includes(s));
        if (match) {
          bookData.collection.forEach((ed) => {
            const editionRef = doc(db, 'hadith_editions', ed.name);
            batch.set(editionRef, {
              ...ed,
              id: ed.name,
              bookId: match,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
          });
        }
      });

      if (count > 0) {
        await batch.commit();
        toast({ title: "Editions Updated", description: `${count} source translations linked.` });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-50 rounded-xl border">
              <Database className="w-5 h-5 text-zinc-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Hadith Studio</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-11">Managing canonical collections with premium API synchronization.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            variant="outline"
            onClick={handleSyncEditions}
            disabled={isSeeding}
            className="gap-2 flex-1 sm:flex-none h-12 rounded-xl font-bold border-zinc-200"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Sync Editions
          </Button>
          <Button 
            onClick={handleOverhaulRegistry}
            disabled={isSeeding}
            className="gap-2 flex-1 sm:flex-none h-12 rounded-xl font-bold bg-zinc-900 text-white shadow-xl shadow-zinc-200 hover:bg-black transition-all"
          >
            {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
            Overhaul Registry
          </Button>
        </div>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-200" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em] text-center">Hydrating Studio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-400 group border-zinc-200 shadow-sm rounded-[2rem] overflow-hidden"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-3 bg-zinc-50 rounded-2xl border group-hover:bg-white transition-colors">
                    <Library className="w-6 h-6 text-zinc-400" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-zinc-100 text-zinc-400">#{book.orderKey || '---'}</Badge>
                </div>
                <CardTitle className="text-xl leading-tight group-hover:text-zinc-900 transition-colors">{book.bookName}</CardTitle>
                <CardDescription className="text-[10px] uppercase font-black tracking-widest text-zinc-400 mt-1">{book.id}</CardDescription>
              </CardHeader>
              <CardContent className="px-8 py-6">
                <div className="flex items-center gap-6 p-4 bg-zinc-50/50 rounded-2xl border border-dashed">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black leading-none text-zinc-900">{book.editionCount || '0'}</span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">Editions</span>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-black leading-none text-zinc-900">
                      #{book.totalHadiths ? book.totalHadiths.toLocaleString() : '0'}
                    </span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">Registry</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-0 flex items-center justify-end">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
                  Open Studio
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardFooter>
            </Card>
          ))}
          {(!books || books.length === 0) && (
            <Card className="col-span-full py-20 border-dashed flex flex-col items-center justify-center space-y-4">
              <AlertCircle className="w-12 h-12 text-zinc-200" />
              <div className="text-center">
                <p className="font-bold text-zinc-400">No Collections Initialized</p>
                <p className="text-xs text-zinc-400 mt-1">Click "Overhaul Registry" to sync from HadithAPI.com</p>
              </div>
            </Card>
          )}
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

  // Structural index check
  const indexRef = useMemoFirebase(() => doc(db, 'hadith_index', bookId), [db, bookId]);
  const { data: indexDoc } = useDoc(indexRef);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', bookId)
  ), [db, bookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  const handleSyncIndex = async (edition: FawazEdition) => {
    setSyncState({ isSyncing: true, progress: 0, status: 'validating existing indices', targetEdition: edition.name });
    try {
      const indexRef = doc(db, 'hadith_index', bookId);
      const existingSnap = await getDoc(indexRef);
      const indexExists = existingSnap.exists();

      if (indexExists) {
        toast({ title: `Index already Synced for ${book?.bookName || bookId}` });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { indexSynced: 'yes' });
        setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
      } else {
        setSyncState(prev => ({ ...prev, status: 'fetching canonical structure', progress: 20 }));
        const data = await fetchHadithEditionContent(edition.linkmin);
        const { metadata, hadiths } = data;
        
        setSyncState(prev => ({ ...prev, status: 'analyzing metadata', progress: 50 }));
        
        const totalCount = hadiths?.length || 0;
        const payload = { 
          id: bookId, 
          bookSlug: bookId, 
          name: metadata.name || '', 
          totalHadiths: totalCount, 
          sections: metadata.sections || {}, 
          sectionDetails: metadata.section_details || {} 
        };
        
        setDocumentNonBlocking(indexRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { indexSynced: 'yes', totalHadiths: totalCount });
        
        toast({ title: "Master Index Generated", description: "Structural blueprint saved to cluster." });
        setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl border-zinc-200 hover:bg-zinc-900 hover:text-white transition-all">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{book?.bookName}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Edition Registry Control</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 bg-zinc-50/50 text-zinc-500">
          {editions?.length || 0} Editions Found
        </Badge>
      </header>

      {syncState.isSyncing && (
        <Card className="bg-zinc-900 text-white p-6 rounded-3xl border-none shadow-2xl animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-widest">{syncState.status}...</span>
            </div>
            <span className="text-xs font-mono">{syncState.progress}%</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {editions?.map((ed) => (
          <EditionCard 
            key={ed.id} 
            edition={ed} 
            masterIndexExists={!!indexDoc}
            onSelect={onSelectEdition} 
            onSyncIndex={handleSyncIndex} 
          />
        ))}
        {(!editions || editions.length === 0) && (
          <div className="col-span-full py-20 text-center space-y-4">
            <p className="text-sm font-medium text-zinc-400">No translations indexed for this collection.</p>
            <Button variant="outline" onClick={onBack} className="rounded-xl">Go Back</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EditionCard({ edition, masterIndexExists, onSelect, onSyncIndex }: { edition: any, masterIndexExists: boolean, onSelect: (id: string) => void, onSyncIndex: (ed: any) => void }) {
  const db = useFirestore();
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  
  const isInspectable = edition.indexSynced === 'yes' && masterIndexExists;

  useEffect(() => {
    const q = query(collection(db, 'hadith_data'), where('editionId', '==', edition.id));
    getCountFromServer(q).then(snapshot => setSyncedCount(snapshot.data().count));
  }, [db, edition.id]);

  return (
    <Card 
      className={cn(
        "flex flex-col group transition-all border shadow-sm rounded-[2rem] overflow-hidden bg-white",
        isInspectable ? "cursor-pointer hover:border-zinc-400" : "opacity-90"
      )}
      onClick={() => isInspectable && onSelect(edition.id)}
    >
      <CardHeader className="p-8 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-zinc-50 p-3 rounded-2xl border">
            <Languages className={cn("w-6 h-6", edition.direction === 'rtl' ? "text-zinc-900" : "text-zinc-400")} />
          </div>
          <Badge variant={isInspectable ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isInspectable ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
            {isInspectable ? 'AUDITED' : 'PENDING'}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold leading-tight group-hover:text-zinc-900 transition-colors">{edition.language} Edition</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">{edition.name}</CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 py-6 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-50 rounded-2xl border shadow-inner text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Registry</span>
            <span className="text-sm font-black text-zinc-900">
              #{edition.totalHadiths ? edition.totalHadiths.toLocaleString() : '0'}
            </span>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border shadow-inner text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Synced</span>
            <span className="text-sm font-black text-zinc-900">
              #{syncedCount !== null ? syncedCount.toLocaleString() : '0'}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 pt-0 gap-3" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200 hover:bg-zinc-900 hover:text-white transition-all"
          onClick={() => onSyncIndex(edition)}
        >
          <RefreshCcw className="w-3.5 h-3.5 mr-2" />
          {isInspectable ? 'Resync' : 'Audit'}
        </Button>
        {isInspectable && (
          <Button variant="outline" size="icon" onClick={() => onSelect(edition.id)} className="h-12 w-12 shrink-0 rounded-xl border-zinc-200">
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
  
  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const indexRef = useMemoFirebase(() => (edition?.bookId ? doc(db, 'hadith_index', edition.bookId) : null), [db, edition?.bookId]);
  const { data: indexDoc, isLoading } = useDoc(indexRef);

  const sections = useMemo(() => {
    if (!indexDoc?.sections) return [];
    return Object.entries(indexDoc.sections).map(([num, name]) => {
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
    setSyncState({ isSyncing: true, progress: 0, status: 'initializing section crawl', targetSection: section.name });
    try {
      const payload = await fetchHadithEditionContent(edition.linkmin);
      const allHadiths = payload.hadiths || [];
      const inRange = allHadiths.filter((h: any) => { 
        const hNum = parseFloat(h.hadithnumber); 
        return hNum >= section.start_hadith_number && hNum <= section.last_hadith_number; 
      });
      
      if (inRange.length === 0) { 
        toast({ title: "No Matching Records Found" }); 
        setSyncState(prev => ({ ...prev, isSyncing: false })); 
        return; 
      }

      setSyncState(prev => ({ ...prev, status: 'comparing local storage', progress: 30 }));
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
        const hPayload = { ...h, id: hadithId, editionId, bookSlug: edition.bookId, sectionNumber: section.number };
        
        if (isDataDifferent(hPayload, existing)) { 
          batch.set(doc(db, 'hadith_data', hadithId), { ...hPayload, updatedAt: new Date().toISOString() }, { merge: true }); 
          updatesCount++; 
        }
      });

      setSyncState(prev => ({ ...prev, status: 'committing changes', progress: 80 }));
      if (updatesCount > 0) { 
        await batch.commit(); 
        toast({ title: "Section Crawl Complete", description: `Synchronized ${updatesCount} prophetic records.` }); 
      } else { 
        toast({ title: "Section already in Sync" }); 
      }

      const syncedMap = { ...(indexDoc?.syncedSections || {}) }; 
      syncedMap[section.number] = true; 
      if (indexRef) {
        updateDocumentNonBlocking(indexRef, { syncedSections: syncedMap }); 
      }
      
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Crawl Failed", description: e.message }); 
    } finally { 
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500); 
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl border-zinc-200">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{indexDoc?.name || 'Edition'} Analysis</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Granular Section Inventory</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 bg-zinc-50/50 text-zinc-500">
          {sections.length} Chapters Cataloged
        </Badge>
      </header>

      {syncState.isSyncing && (
        <Card className="bg-zinc-900 text-white p-8 rounded-[2rem] border-none shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest">{syncState.status}...</span>
            </div>
            <Badge className="bg-white/10 text-white border-none font-mono">{syncState.progress}%</Badge>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${syncState.progress}%` }} />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {sections.map((s) => (
          <Card key={s.number} className="flex flex-col group border border-zinc-200 shadow-sm overflow-hidden rounded-[2rem] bg-white transition-all hover:border-zinc-400">
            <CardHeader className="p-8 pb-4 space-y-6">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-bold leading-tight line-clamp-2 min-h-[3rem] flex-1 pr-4">{s.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border-zinc-100 px-3 shrink-0">#{s.number}</Badge>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge variant={s.isSynced ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest w-fit px-3 py-1 rounded-full", s.isSynced ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
                    {s.isSynced ? 'AUDITED' : 'PENDING'}
                  </Badge>
                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-50 px-3 py-1 rounded-lg border">
                    <span>{s.start_hadith_number}</span>
                    <span className="opacity-30">/</span>
                    <span>{s.last_hadith_number}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardFooter className="p-8 pt-0 flex gap-3">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200 hover:bg-zinc-900 hover:text-white transition-all"
                onClick={() => handleSyncSectionContent(s)}
                disabled={syncState.isSyncing}
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                {s.isSynced ? 'Resync' : 'Audit'}
              </Button>
              {s.isSynced && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200"
                  onClick={() => onViewSection(s.number)}
                >
                  <Eye className="w-3.5 h-3.5 mr-2" />
                  Inspect
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

  const indexRef = useMemoFirebase(() => doc(db, 'hadith_index', bookId), [db, bookId]);
  const { data: indexDoc } = useDoc(indexRef);

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
    setEditingRecord(JSON.parse(JSON.stringify(record)));
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    updateDocumentNonBlocking(doc(db, 'hadith_data', editingRecord.id), {
      text: editingRecord.text,
      grades: editingRecord.grades || [],
      reference: editingRecord.reference || {},
      updatedAt: new Date().toISOString()
    });
    toast({ title: "Record Refined" });
    setIsEditDialogOpen(false);
  };

  const handleUpdateGrade = (index: number, field: 'name' | 'grade', value: string) => {
    if (!editingRecord) return;
    const newGrades = [...(editingRecord.grades || [])];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setEditingRecord({ ...editingRecord, grades: newGrades });
  };

  const handleAddGrade = () => {
    if (!editingRecord) return;
    const newGrades = [...(editingRecord.grades || []), { name: '', grade: '' }];
    setEditingRecord({ ...editingRecord, grades: newGrades });
  };

  const handleRemoveGrade = (index: number) => {
    if (!editingRecord) return;
    const newGrades = editingRecord.grades.filter((_: any, i: number) => i !== index);
    setEditingRecord({ ...editingRecord, grades: newGrades });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl border-zinc-200">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight truncate">
              {indexDoc?.sections?.[sectionNumber] || `Section ${sectionNumber}`}
            </h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Record Verification Studio</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 bg-zinc-50/50 text-zinc-500">
          {sortedRecords?.length || 0} Records Under Audit
        </Badge>
      </header>

      <Card className="overflow-hidden border border-zinc-200 shadow-sm bg-white rounded-[2rem]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="h-20">
                <TableHead className="w-24 text-[10px] font-black uppercase tracking-[0.2em] pl-10">Ref</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Hadith Content</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Scholarly Grades</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-[0.2em]">Reference</TableHead>
                <TableHead className="w-32 text-right text-[10px] font-black uppercase tracking-[0.2em] pr-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-96 text-center text-zinc-300 text-[10px] font-black uppercase tracking-[0.4em] animate-pulse">Scanning Shards...</TableCell></TableRow>
              ) : sortedRecords?.map((r) => (
                <TableRow key={r.id} className="h-28 hover:bg-zinc-50/50 transition-colors border-zinc-100">
                  <TableCell className="pl-10">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold border-zinc-200 bg-zinc-50 px-3">#{r.hadithnumber || r.id?.split('_h_').pop()}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed max-w-[450px]">
                      {r.text || '---'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {r.grades?.map((g: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[9px] font-black uppercase tracking-tight bg-white border-zinc-200 px-3 py-1 shadow-sm">
                          {g.name} : {g.grade}
                        </Badge>
                      )) || <span className="text-[10px] text-zinc-300 italic">No grades assigned</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {r.reference ? (
                      <div className="flex flex-col gap-1.5 min-w-[90px]">
                        <div className="flex items-center justify-between bg-zinc-50 px-2 py-0.5 rounded border">
                          <span className="text-[8px] font-black text-zinc-400 uppercase">Book</span>
                          <span className="text-[10px] font-black text-zinc-900">{r.reference.book}</span>
                        </div>
                        <div className="flex items-center justify-between bg-zinc-50 px-2 py-0.5 rounded border">
                          <span className="text-[8px] font-black text-zinc-400 uppercase">Num</span>
                          <span className="text-[10px] font-black text-zinc-900">{r.reference.hadith}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-medium text-zinc-300 italic">Unmapped</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="h-11 w-11 hover:bg-white border border-transparent hover:border-zinc-200 hover:shadow-sm rounded-xl">
                      <Pencil className="w-4 h-4 text-zinc-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden rounded-[3rem] border-zinc-200 shadow-2xl">
          <DialogHeader className="p-10 border-b bg-zinc-50 shrink-0">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white border border-zinc-200 rounded-[1.5rem] shadow-sm">
                <Pencil className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-2xl font-bold tracking-tight truncate">Record Refinement</DialogTitle>
                <DialogDescription className="text-sm text-zinc-500 truncate">Refining metadata for Hadith #{editingRecord?.hadithnumber}.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-6">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Canonical Mapping</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Book Vol</span>
                      <Input 
                        type="number" 
                        value={editingRecord?.reference?.book || ''} 
                        onChange={(e) => setEditingRecord({ ...editingRecord, reference: { ...(editingRecord.reference || {}), book: parseInt(e.target.value) } })}
                        className="bg-zinc-50 border-zinc-200 h-14 rounded-2xl focus:ring-zinc-900 shadow-inner font-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Record Num</span>
                      <Input 
                        type="number" 
                        value={editingRecord?.reference?.hadith || ''} 
                        onChange={(e) => setEditingRecord({ ...editingRecord, reference: { ...(editingRecord.reference || {}), hadith: parseInt(e.target.value) } })}
                        className="bg-zinc-50 border-zinc-200 h-14 rounded-2xl focus:ring-zinc-900 shadow-inner font-black"
                      />
                    </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Authenticity Verdicts</Label>
                    <Button variant="ghost" size="sm" onClick={handleAddGrade} className="h-8 px-4 text-[9px] font-black uppercase tracking-widest gap-2 hover:bg-zinc-50 border rounded-full">
                      <Plus className="w-3 h-3" /> Add Scholar
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {editingRecord?.grades?.map((g: any, i: number) => (
                      <div key={i} className="flex items-end gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 shadow-inner">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">Scholar</span>
                            <Input 
                              placeholder="e.g. Al-Albani"
                              value={g.name || ''}
                              onChange={(e) => handleUpdateGrade(i, 'name', e.target.value)}
                              className="bg-white border-zinc-200 h-10 text-xs rounded-xl shadow-sm font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">Verdict</span>
                            <Input 
                              placeholder="Sahih, Da'if"
                              value={g.grade || ''}
                              onChange={(e) => handleUpdateGrade(i, 'grade', e.target.value)}
                              className="bg-white border-zinc-200 h-10 text-xs rounded-xl shadow-sm font-bold"
                            />
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveGrade(i)} className="h-10 w-10 text-zinc-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {(!editingRecord?.grades || editingRecord.grades.length === 0) && (
                      <div className="py-10 text-center bg-zinc-50 rounded-[2rem] border border-dashed">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">No grades defined for this node.</p>
                      </div>
                    )}
                  </div>
               </div>
            </div>

            <div className="grid gap-6">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Prophetic Narration</Label>
              <Textarea 
                className="min-h-[400px] text-base leading-[2] font-medium p-10 bg-zinc-50 border-zinc-200 rounded-[2rem] resize-none focus-visible:ring-zinc-900 shadow-inner"
                value={editingRecord?.text || ''}
                onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="p-10 bg-zinc-50 border-t border-zinc-200 shrink-0 flex flex-row items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-14 px-8 font-bold text-zinc-400 hover:text-zinc-900">Discard</Button>
            <Button className="h-14 px-12 rounded-2xl bg-zinc-900 text-white font-bold shadow-xl active:scale-95 transition-all" onClick={handleSaveEdit}>
              <Save className="w-5 h-5 mr-3" />
              Commit Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
