
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
  Trash2,
  Globe
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
import { fetchHadithEditionContent, fetchHadithApiBooks, fetchHadithRegistry, FawazEdition } from '@/services/hadith-api';
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

const FAWAZ_MAPPING: Record<string, string> = {
  'sahih-bukhari': 'bukhari',
  'sahih-muslim': 'muslim',
  'al-tirmidhi': 'tirmidhi',
  'sunan-abu-dawood': 'abudawood',
  'sunan-nasai': 'nasai',
  'sunan-ibn-majah': 'ibnmajah',
  'musnad-ahmad': 'ahmad',
  'al-muwatta': 'malik',
  'mishkat-al-masabih': 'mishkat'
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

  const handleOverhaulRegistry = async () => {
    setIsSeeding(true);
    try {
      // 1. Fetch new registry from HadithAPI.com
      const registryData = await fetchHadithApiBooks();
      if (!registryData.books || !Array.isArray(registryData.books)) {
        throw new Error("Invalid response from HadithAPI");
      }

      // 2. Fetch Fawaz Registry for edition discovery
      const fawazData = await fetchHadithRegistry();

      // 3. Fetch existing books to handle cleanup
      const existingSnap = await getDocs(collection(db, 'hadith_books'));
      const existingIds = existingSnap.docs.map(d => d.id);

      const existingEditionsSnap = await getDocs(collection(db, 'hadith_editions'));
      const existingEditionIds = existingEditionsSnap.docs.map(d => d.id);

      // 4. Batch process the overhaul
      const batch = writeBatch(db);
      
      existingIds.forEach(id => batch.delete(doc(db, 'hadith_books', id)));
      existingEditionIds.forEach(id => batch.delete(doc(db, 'hadith_editions', id)));

      registryData.books.forEach((book: any) => {
        const slug = book.bookSlug;
        const bookRef = doc(db, 'hadith_books', slug);
        
        const payload = {
          id: slug,
          bookName: book.bookName,
          totalHadiths: parseInt(book.hadiths_count) || 0,
          editionCount: 0,
          orderKey: BOOK_ORDER[slug] || 99,
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        batch.set(bookRef, payload, { merge: true });

        // Discover editions from Fawaz
        const fawazKey = FAWAZ_MAPPING[slug];
        if (fawazKey && fawazData[fawazKey]) {
          const collection = fawazData[fawazKey].collection;
          let bookEditions = 0;
          collection.forEach(ed => {
            const edRef = doc(db, 'hadith_editions', ed.name);
            batch.set(edRef, {
              ...ed,
              id: ed.name,
              bookId: slug,
              indexSynced: 'no',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            bookEditions++;
          });
          batch.update(bookRef, { editionCount: bookEditions });
        }
      });

      await batch.commit();
      toast({ title: "Overhaul Complete", description: `Synced ${registryData.books.length} collections with editions.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Overhaul Failed", description: e.message });
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
        <Button 
          onClick={handleOverhaulRegistry}
          disabled={isSeeding}
          className="gap-2 h-12 rounded-xl font-bold bg-zinc-900 text-white shadow-xl shadow-zinc-200 hover:bg-black transition-all"
        >
          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          Overhaul Registry
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-200" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hydrating Studio...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="cursor-pointer transition-all hover:bg-zinc-50 hover:border-zinc-400 group border-zinc-200 shadow-sm rounded-[2rem] overflow-hidden bg-white"
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
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">Records</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-0 flex items-center justify-end">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
                  Configure Studio
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
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
  
  const [syncState, setSyncState] = useState({ isSyncing: false, progress: 0, status: 'idle', targetEdition: '' });

  const bookRef = useMemoFirebase(() => doc(db, 'hadith_books', bookId), [db, bookId]);
  const { data: book } = useDoc(bookRef);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', bookId)
  ), [db, bookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  const groupedEditions = useMemo(() => {
    if (!editions) return { Arabic: [], English: [], Urdu: [], Other: [] };
    return editions.reduce((acc: any, ed) => {
      const lang = ed.language || 'Other';
      if (['Arabic', 'English', 'Urdu'].includes(lang)) {
        acc[lang].push(ed);
      } else {
        acc.Other.push(ed);
      }
      return acc;
    }, { Arabic: [], English: [], Urdu: [], Other: [] });
  }, [editions]);

  const handleSyncIndex = async (edition: FawazEdition) => {
    setSyncState({ isSyncing: true, progress: 0, status: 'validating index shard', targetEdition: edition.name });
    try {
      const indexRef = doc(db, 'hadith_index', edition.name);
      const existingSnap = await getDoc(indexRef);

      if (existingSnap.exists()) {
        toast({ title: "Index Shard Active" });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { indexSynced: 'yes' });
      } else {
        setSyncState(prev => ({ ...prev, status: 'ingesting structural metadata', progress: 20 }));
        const data = await fetchHadithEditionContent(edition.linkmin);
        const { metadata, hadiths } = data;
        
        const totalCount = hadiths?.length || 0;
        const payload = { 
          id: edition.name, 
          editionId: edition.name,
          bookSlug: bookId, 
          name: metadata.name || '', 
          totalHadiths: totalCount, 
          sections: metadata.sections || {}, 
          sectionDetails: metadata.section_details || {} 
        };
        
        setDocumentNonBlocking(indexRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.name), { indexSynced: 'yes', totalHadiths: totalCount });
        
        toast({ title: "Shard Indexed", description: "Structural blueprint generated for this language." });
      }
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) {
      toast({ variant: "destructive", title: "Audit Failed", description: e.message });
    } finally {
      setTimeout(() => setSyncState(prev => ({ ...prev, isSyncing: false })), 500);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl border-zinc-200">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">{book?.bookName}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Multi-Language Edition Hub</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 bg-zinc-50/50 text-zinc-500">
          {editions?.length || 0} Translations Linked
        </Badge>
      </header>

      {syncState.isSyncing && (
        <Card className="bg-zinc-900 text-white p-6 rounded-3xl border-none shadow-2xl animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-widest">{syncState.status}...</span>
            </div>
            <span className="text-xs font-mono">{syncState.progress}%</span>
          </div>
        </Card>
      )}

      {['Arabic', 'English', 'Urdu', 'Other'].map((lang) => (
        groupedEditions[lang].length > 0 && (
          <section key={lang} className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-50 rounded-lg border">
                <Globe className="w-4 h-4 text-zinc-400" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">{lang} Editions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupedEditions[lang].map((ed: any) => (
                <EditionCard 
                  key={ed.id} 
                  edition={ed} 
                  onSelect={onSelectEdition} 
                  onSyncIndex={handleSyncIndex} 
                />
              ))}
            </div>
          </section>
        )
      ))}
    </div>
  );
}

function EditionCard({ edition, onSelect, onSyncIndex }: { edition: any, onSelect: (id: string) => void, onSyncIndex: (ed: any) => void }) {
  const db = useFirestore();
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [indexExists, setIndexExists] = useState<boolean | null>(null);
  
  useEffect(() => {
    const q = query(collection(db, 'hadith_data'), where('editionId', '==', edition.id));
    getCountFromServer(q).then(snapshot => setSyncedCount(snapshot.data().count));
    
    getDoc(doc(db, 'hadith_index', edition.id)).then(snap => setIndexExists(snap.exists()));
  }, [db, edition.id]);

  const isInspectable = edition.indexSynced === 'yes' && indexExists;

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
            <Languages className="w-6 h-6 text-zinc-400" />
          </div>
          <Badge variant={isInspectable ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isInspectable ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
            {isInspectable ? 'AUDITED' : 'PENDING'}
          </Badge>
        </div>
        <CardTitle className="text-lg font-bold leading-tight group-hover:text-zinc-900 transition-colors">{edition.author || edition.name}</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">{edition.name}</CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 py-6 flex-1">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-zinc-50 rounded-2xl border text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Registry</span>
            <span className="text-sm font-black text-zinc-900">#{edition.totalHadiths || '0'}</span>
          </div>
          <div className="p-4 bg-zinc-50 rounded-2xl border text-center">
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Synced</span>
            <span className="text-sm font-black text-zinc-900">#{syncedCount || '0'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 pt-0 gap-3" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl"
          onClick={() => onSyncIndex(edition)}
        >
          {indexExists ? <RefreshCcw className="w-3.5 h-3.5 mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
          {indexExists ? 'Resync' : 'Audit'}
        </Button>
        {isInspectable && (
          <Button variant="outline" size="icon" onClick={() => onSelect(edition.id)} className="h-12 w-12 rounded-xl">
            <Eye className="w-4 h-4" />
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
    }).sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
  }, [indexDoc]);

  const handleSyncSectionContent = async (section: any) => {
    const editionSnap = await getDoc(doc(db, 'hadith_editions', editionId));
    const edition = editionSnap.data();
    if (!edition?.linkmin) { toast({ variant: "destructive", title: "Missing Source" }); return; }

    setSyncState({ isSyncing: true, progress: 0, status: 'initiating section ingest', targetSection: section.name });
    try {
      const payload = await fetchHadithEditionContent(edition.linkmin);
      const allHadiths = payload.hadiths || [];
      const inRange = allHadiths.filter((h: any) => { 
        const hNum = parseFloat(h.hadithnumber); 
        return hNum >= section.start_hadith_number && hNum <= section.last_hadith_number; 
      });
      
      if (inRange.length === 0) { toast({ title: "No Records in Range" }); setSyncState(prev => ({ ...prev, isSyncing: false })); return; }

      const batch = writeBatch(db);
      inRange.forEach((h: any) => {
        const hadithId = `${editionId}_h_${h.hadithnumber}`;
        batch.set(doc(db, 'hadith_data', hadithId), { 
          ...h, 
          id: hadithId, 
          editionId, 
          bookSlug: indexDoc?.bookSlug, 
          sectionNumber: section.number,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      
      const syncedMap = { ...(indexDoc?.syncedSections || {}) }; 
      syncedMap[section.number] = true; 
      updateDocumentNonBlocking(indexRef!, { syncedSections: syncedMap }); 
      
      toast({ title: "Section Ingested", description: `Captured ${inRange.length} narrations.` });
      setSyncState(prev => ({ ...prev, progress: 100, status: 'complete' }));
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Ingest Failed", description: e.message }); 
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
            <h2 className="text-2xl font-bold tracking-tight">{indexDoc?.name || 'Edition'} Inventory</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Structural Record Audit</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 text-zinc-500">
          {sections.length} Chapters Discovered
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
          <Card key={s.number} className="flex flex-col group border border-zinc-200 shadow-sm rounded-[2rem] bg-white transition-all hover:border-zinc-400">
            <CardHeader className="p-8 pb-4 space-y-6">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-bold leading-tight line-clamp-2 min-h-[3rem] flex-1 pr-4">{s.name}</CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border-zinc-100 px-3 shrink-0">#{s.number}</Badge>
              </div>
              <Badge variant={s.isSynced ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest w-fit px-3 py-1 rounded-full", s.isSynced ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
                {s.isSynced ? 'AUDITED' : 'PENDING'}
              </Badge>
            </CardHeader>
            <CardFooter className="p-8 pt-0 flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleSyncSectionContent(s)}>
                <Zap className="w-3.5 h-3.5 mr-2" /> Audit
              </Button>
              {s.isSynced && (
                <Button variant="outline" size="sm" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => onViewSection(s.number)}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> Inspect
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

  const indexRef = useMemoFirebase(() => doc(db, 'hadith_index', editionId), [db, editionId]);
  const { data: indexDoc } = useDoc(indexRef);

  const recordsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_data'),
    where('editionId', '==', editionId),
    where('sectionNumber', '==', sectionNumber),
    limit(200)
  ), [db, editionId, sectionNumber]);

  const { data: rawRecords, isLoading } = useCollection(recordsQuery);

  const sortedRecords = useMemo(() => {
    if (!rawRecords) return [];
    return [...rawRecords].sort((a, b) => parseFloat(a.hadithnumber) - parseFloat(b.hadithnumber));
  }, [rawRecords]);

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

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-6">
          <Button variant="outline" size="icon" onClick={onBack} className="h-14 w-14 rounded-2xl border-zinc-200">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight truncate">{indexDoc?.sections?.[sectionNumber] || 'Records'}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Validation Workbench</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 text-zinc-500">
          {sortedRecords?.length || 0} Records Under Inspection
        </Badge>
      </header>

      <Card className="overflow-hidden border shadow-sm bg-white rounded-[2rem]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="h-20">
                <TableHead className="w-24 text-[10px] font-black uppercase pl-10">Ref</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Hadith Content</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Scholarly Grades</TableHead>
                <TableHead className="w-32 text-right pr-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-96 text-center animate-pulse">Scanning Shards...</TableCell></TableRow>
              ) : sortedRecords?.map((r) => (
                <TableRow key={r.id} className="h-28 border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="pl-10">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">#{r.hadithnumber}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed max-w-[500px]">{r.text}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {r.grades?.map((g: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[9px] font-black uppercase bg-white border shadow-sm px-3 py-1">
                          {g.name}: {g.grade}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-10">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingRecord(JSON.parse(JSON.stringify(r))); setIsEditDialogOpen(true); }} className="h-11 w-11 rounded-xl">
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
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden rounded-[3rem] border-zinc-200">
          <DialogHeader className="p-10 border-b bg-zinc-50 shrink-0">
            <DialogTitle className="text-2xl font-bold tracking-tight">Record Refinement</DialogTitle>
            <DialogDescription className="text-sm text-zinc-500">Manually refine translation text and scholarly grades.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-10 bg-white">
            <Textarea 
              className="min-h-[400px] text-base leading-[2] font-medium p-10 bg-zinc-50 rounded-[2rem] resize-none"
              value={editingRecord?.text || ''}
              onChange={(e) => setEditingRecord({ ...editingRecord, text: e.target.value })}
            />
          </div>

          <DialogFooter className="p-10 bg-zinc-50 border-t shrink-0">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-14 px-8 font-bold">Discard</Button>
            <Button className="h-14 px-12 rounded-2xl bg-zinc-900 text-white font-bold" onClick={handleSaveEdit}>Commit Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
