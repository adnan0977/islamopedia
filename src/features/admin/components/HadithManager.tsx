
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
  Zap,
  Eye,
  Pencil,
  Database,
  RefreshCcw,
  Globe,
  CheckCircle2,
  Info,
  BadgeCheck,
  FileText,
  Save
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
import { fetchHadithApiBooks, fetchHadithApiChapters, fetchHadithApiData } from '@/services/hadith-api';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
      const registryData = await fetchHadithApiBooks();
      if (!registryData.books || !Array.isArray(registryData.books)) {
        throw new Error("Invalid response from HadithAPI");
      }

      const existingSnap = await getDocs(collection(db, 'hadith_books'));
      const existingIds = existingSnap.docs.map(d => d.id);
      const existingEditionsSnap = await getDocs(collection(db, 'hadith_editions'));
      const existingEditionIds = existingEditionsSnap.docs.map(d => d.id);

      const batch = writeBatch(db);
      existingIds.forEach(id => batch.delete(doc(db, 'hadith_books', id)));
      existingEditionIds.forEach(id => batch.delete(doc(db, 'hadith_editions', id)));

      registryData.books.forEach((book: any) => {
        const slug = book.bookSlug;
        const bookRef = doc(db, 'hadith_books', slug);
        
        batch.set(bookRef, {
          id: slug,
          bookName: book.bookName,
          totalHadiths: parseInt(book.hadiths_count) || 0,
          editionCount: 3,
          orderKey: BOOK_ORDER[slug] || 99,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        ['arabic', 'english', 'urdu'].forEach(lang => {
          const edId = `${slug}_${lang}`;
          const edRef = doc(db, 'hadith_editions', edId);
          batch.set(edRef, {
            id: edId,
            bookId: slug,
            name: `${book.bookName} (${lang.toUpperCase()})`,
            language: lang.charAt(0).toUpperCase() + lang.slice(1),
            type: lang,
            indexSynced: 'no',
            totalHadiths: parseInt(book.hadiths_count) || 0,
            updatedAt: new Date().toISOString()
          });
        });
      });

      await batch.commit();
      toast({ title: "Overhaul Complete", description: `Synced ${registryData.books.length} collections with unified language shards.` });
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
          <p className="text-sm text-muted-foreground ml-11">Exclusive HadithAPI.com premium synchronization engine.</p>
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
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Opening Library...</p>
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
                    <span className="text-2xl font-black text-zinc-900">#3</span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">Shards</span>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-zinc-900">
                      #{book.totalHadiths ? book.totalHadiths.toLocaleString() : '0'}
                    </span>
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-2">Capacity</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-8 pb-8 pt-0 flex items-center justify-end">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
                  Enter Studio
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

  const handleSyncIndex = async (edition: any) => {
    setSyncState({ isSyncing: true, progress: 0, status: 'requesting HadithAPI schema', targetEdition: edition.id });
    try {
      const indexRef = doc(db, 'hadith_index', edition.id);
      const existingSnap = await getDoc(indexRef);

      if (existingSnap.exists()) {
        toast({ title: "Index Verified", description: `Index already Synced for ${book?.bookName || edition.id}` });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), { indexSynced: 'yes' });
      } else {
        const payload = await fetchHadithApiChapters(bookId);
        if (!payload.chapters) throw new Error("No chapters found for this book.");

        const languageKey = edition.type === 'arabic' ? 'chapterArabic' : edition.type === 'urdu' ? 'chapterUrdu' : 'chapterEnglish';
        
        const sections: Record<string, string> = {};
        payload.chapters.forEach((ch: any) => {
          sections[ch.chapterNumber] = ch[languageKey] || ch.chapterArabic || `Chapter ${ch.chapterNumber}`;
        });

        const indexPayload = {
          id: edition.id,
          editionId: edition.id,
          bookSlug: bookId,
          name: edition.name,
          sections,
          updatedAt: new Date().toISOString()
        };

        setDocumentNonBlocking(indexRef, indexPayload, { merge: true });
        updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), { indexSynced: 'yes' });
        toast({ title: "Shard Indexed", description: `Successfully extracted ${payload.chapters.length} ${edition.language} nodes.` });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Index Error", description: e.message });
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
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
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Unified Language Management</p>
          </div>
        </div>
      </header>

      {syncState.isSyncing && (
        <Card className="bg-zinc-900 text-white p-6 rounded-3xl border-none shadow-2xl animate-pulse">
          <div className="flex items-center gap-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            <span className="text-xs font-bold uppercase tracking-widest">{syncState.status}...</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {['arabic', 'english', 'urdu'].map(type => {
          const ed = editions?.find(e => e.type === type);
          if (!ed) return null;
          return (
            <EditionCard 
              key={ed.id} 
              edition={ed} 
              onSelect={onSelectEdition} 
              onSyncIndex={() => handleSyncIndex(ed)} 
            />
          );
        })}
      </div>
    </div>
  );
}

function EditionCard({ edition, onSelect, onSyncIndex }: { edition: any, onSelect: (id: string) => void, onSyncIndex: () => void }) {
  const db = useFirestore();
  const [indexExists, setIndexExists] = useState<boolean | null>(null);
  
  useEffect(() => {
    getDoc(doc(db, 'hadith_index', edition.id)).then(snap => setIndexExists(snap.exists()));
  }, [db, edition.id]);

  const isInspectable = indexExists === true;

  return (
    <Card 
      className={cn(
        "flex flex-col group transition-all border shadow-sm rounded-[2rem] overflow-hidden bg-white",
        isInspectable ? "border-zinc-200" : "opacity-90"
      )}
    >
      <CardHeader className="p-8 pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="bg-zinc-50 p-3 rounded-2xl border">
            <Globe className="w-6 h-6 text-zinc-400" />
          </div>
          <Badge variant={isInspectable ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", isInspectable ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
            {isInspectable ? 'INDEXED' : 'PENDING'}
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold leading-tight group-hover:text-zinc-900 transition-colors">{edition.language} Shard</CardTitle>
        <CardDescription className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">{edition.id}</CardDescription>
      </CardHeader>
      
      <CardContent className="px-8 py-6 flex-1">
        <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed text-center">
          <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block mb-2">Record Capacity</span>
          <span className="text-xl font-black text-zinc-900">#{edition.totalHadiths?.toLocaleString() || '0'}</span>
        </div>
      </CardContent>

      <CardFooter className="p-8 pt-0 gap-3">
        <Button 
          variant="outline" 
          size="sm"
          className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl"
          onClick={onSyncIndex}
        >
          {isInspectable ? <RefreshCcw className="w-3.5 h-3.5 mr-2" /> : <Zap className="w-3.5 h-3.5 mr-2" />}
          {isInspectable ? 'Resync' : 'Audit Shard'}
        </Button>
        {isInspectable && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => onSelect(edition.id)} 
            className="flex-1 h-12 text-[10px] font-black uppercase tracking-widest rounded-xl bg-zinc-900 text-white"
          >
            Inspect <ChevronRight className="w-3.5 h-3.5 ml-2" />
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
    return Object.entries(indexDoc.sections).map(([num, name]) => {
      return { 
        number: num, 
        name: name as string, 
        isSynced: !!indexDoc.syncedSections?.[num] 
      };
    }).sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
  }, [indexDoc]);

  const handleSyncSectionContent = async (section: any) => {
    if (!edition) return;
    setSyncState({ isSyncing: true, progress: 0, status: 'fetching HadithAPI stream', targetSection: section.name });
    try {
      const payload = await fetchHadithApiData(indexDoc?.bookSlug, section.number);
      const data = payload.hadiths?.data || [];
      
      if (data.length === 0) {
        toast({ title: "No Records Found" });
        return;
      }

      const batch = writeBatch(db);
      data.forEach((h: any) => {
        const hadithId = `${editionId}_h_${h.hadithNumber}`;
        
        const transformedRecord: any = {
          id: hadithId,
          editionId,
          bookSlug: indexDoc?.bookSlug,
          sectionNumber: section.number,
          hadithNumber: h.hadithNumber,
          updatedAt: new Date().toISOString(),
        };

        if (edition.type === 'english') {
          transformedRecord.englishNarrator = h.englishNarrator;
          transformedRecord.hadithEnglish = h.hadithEnglish;
          transformedRecord.hadith_text = h.hadithEnglish;
          transformedRecord.headingEnglish = h.headingEnglish;
          transformedRecord.chapterTitle = h.chapter?.chapterEnglish || '';
        } else if (edition.type === 'urdu') {
          transformedRecord.hadithUrdu = h.hadithUrdu;
          transformedRecord.hadith_text = h.hadithUrdu;
          transformedRecord.chapterTitle = h.chapter?.chapterUrdu || '';
        } else if (edition.type === 'arabic') {
          transformedRecord.hadithArabic = h.hadithArabic;
          transformedRecord.hadith_text = h.hadithArabic;
          transformedRecord.chapterTitle = h.chapter?.chapterArabic || '';
        }

        Object.keys(h).forEach(key => {
          if (key === 'grades' || key === 'chapter') return;

          if (key === 'book' && typeof h[key] === 'object' && h[key] !== null) {
            Object.entries(h[key]).forEach(([bookKey, bookVal]) => {
              if (!(bookKey in transformedRecord)) {
                transformedRecord[bookKey] = bookVal;
              }
            });
            return;
          }

          if (!(key in transformedRecord)) {
            transformedRecord[key] = h[key];
          }
        });

        batch.set(doc(db, 'hadith_data', hadithId), transformedRecord, { merge: true });
      });

      await batch.commit();
      
      const syncedMap = { ...(indexDoc?.syncedSections || {}) }; 
      syncedMap[section.number] = true; 
      updateDocumentNonBlocking(indexRef!, { syncedSections: syncedMap }); 
      
      toast({ title: "Data Ingested", description: `Captured ${data.length} records for this chapter.` });
    } catch (e: any) { 
      toast({ variant: "destructive", title: "Ingest Failed", description: e.message }); 
    } finally { 
      setSyncState(prev => ({ ...prev, isSyncing: false })); 
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
          {sections.length} Chapters Mapped
        </Badge>
      </header>

      {syncState.isSyncing && (
        <Card className="bg-zinc-900 text-white p-8 rounded-[2rem] border-none shadow-2xl">
          <div className="flex items-center gap-4">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-sm font-bold uppercase tracking-widest">{syncState.status}...</span>
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
                {s.isSynced ? 'DATA READY' : 'NO DATA'}
              </Badge>
            </CardHeader>
            <CardFooter className="p-8 pt-0 flex gap-3">
              <Button variant="outline" size="sm" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleSyncSectionContent(s)}>
                <Zap className="w-3.5 h-3.5 mr-2" /> {s.isSynced ? 'Update' : 'Ingest'}
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

  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const recordsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_data'),
    where('editionId', '==', editionId),
    where('sectionNumber', '==', sectionNumber),
    limit(200)
  ), [db, editionId, sectionNumber]);

  const { data: rawRecords, isLoading } = useCollection(recordsQuery);

  const sortedRecords = useMemo(() => {
    if (!rawRecords) return [];
    return [...rawRecords].sort((a, b) => parseFloat(a.hadithNumber) - parseFloat(b.hadithNumber));
  }, [rawRecords]);

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    
    const updatedRecord = { ...editingRecord };
    if (edition?.type === 'english') updatedRecord.hadith_text = updatedRecord.hadithEnglish;
    else if (edition?.type === 'urdu') updatedRecord.hadith_text = updatedRecord.hadithUrdu;
    else if (edition?.type === 'arabic') updatedRecord.hadith_text = updatedRecord.hadithArabic;

    updateDocumentNonBlocking(doc(db, 'hadith_data', updatedRecord.id), {
      ...updatedRecord,
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
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">{edition?.language} Validation Workbench</p>
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
                <TableHead className="text-[10px] font-black uppercase">Translated Content</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Attributes</TableHead>
                <TableHead className="w-32 text-right pr-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-96 text-center animate-pulse">Scanning Shards...</TableCell></TableRow>
              ) : sortedRecords?.map((r) => (
                <TableRow key={r.id} className="h-28 border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="pl-10">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">#{r.hadithNumber}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className={cn(
                      "text-[11px] text-zinc-600 line-clamp-2 leading-relaxed max-w-[500px]",
                      edition?.type === 'arabic' || edition?.type === 'urdu' ? "font-arabic text-right text-sm" : ""
                    )} dir={edition?.type === 'arabic' || edition?.type === 'urdu' ? "rtl" : "ltr"}>
                      {r.hadithEnglish || r.hadithUrdu || r.hadithArabic}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-400">{r.englishNarrator || r.urduNarrator || '---'}</span>
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
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden rounded-[3rem] border-zinc-200 bg-white">
          <DialogHeader className="px-10 py-8 border-b bg-zinc-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="p-3.5 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-400">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900">Record Refinement</DialogTitle>
                  <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    Validating {edition?.language} Node • Record #{editingRecord?.hadithNumber}
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="px-4 py-1.5 rounded-full border-zinc-200 bg-white text-zinc-500 font-bold text-[10px] uppercase tracking-widest shadow-sm">
                Chapter {sectionNumber}
              </Badge>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-10 bg-white space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1">Narration Text</Label>
                    <Badge variant="ghost" className="text-[9px] text-zinc-300 uppercase font-black tracking-widest">
                      {edition?.type === 'arabic' ? 'Original Source' : 'Translated Shard'}
                    </Badge>
                  </div>
                  
                  {edition?.type === 'english' && (
                    <Textarea 
                      className="min-h-[350px] text-lg leading-relaxed p-8 bg-zinc-50/50 rounded-[2rem] border-none shadow-inner focus-visible:ring-1 focus-visible:ring-zinc-200 transition-all font-medium text-zinc-700"
                      value={editingRecord?.hadithEnglish || ''}
                      placeholder="Enter narration text..."
                      onChange={(e) => setEditingRecord({ ...editingRecord, hadithEnglish: e.target.value })}
                    />
                  )}
                  {edition?.type === 'urdu' && (
                    <Textarea 
                      dir="rtl"
                      className="min-h-[350px] text-3xl font-arabic leading-[2.5] p-10 bg-zinc-50/50 rounded-[2rem] border-none shadow-inner focus-visible:ring-1 focus-visible:ring-zinc-200 transition-all text-zinc-800"
                      value={editingRecord?.hadithUrdu || ''}
                      placeholder="اردو متن درج کریں..."
                      onChange={(e) => setEditingRecord({ ...editingRecord, hadithUrdu: e.target.value })}
                    />
                  )}
                  {edition?.type === 'arabic' && (
                    <Textarea 
                      dir="rtl"
                      className="min-h-[350px] text-3xl font-arabic leading-[2.5] p-10 bg-zinc-50/50 rounded-[2rem] border-none shadow-inner focus-visible:ring-1 focus-visible:ring-zinc-200 transition-all text-zinc-800"
                      value={editingRecord?.hadithArabic || ''}
                      placeholder="أدخل النص العربي..."
                      onChange={(e) => setEditingRecord({ ...editingRecord, hadithArabic: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-1">Section Heading</Label>
                  <Input 
                    className="bg-zinc-50/50 border-none h-14 px-6 rounded-2xl font-bold text-zinc-600 shadow-inner" 
                    value={editingRecord?.headingEnglish || editingRecord?.chapterTitle || ''} 
                    onChange={(e) => setEditingRecord({...editingRecord, headingEnglish: e.target.value})}
                    placeholder="Contextual heading for this record..."
                  />
                </div>
              </div>

              <div className="lg:col-span-4 space-y-10">
                <section className="space-y-6">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Info className="w-4 h-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Canonical Identity</h3>
                  </div>
                  
                  <div className="grid gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-50/50 border border-zinc-100 flex flex-col gap-1 shadow-sm">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Hadith Number</span>
                      <span className="text-xl font-black text-zinc-900 tracking-tight">#{editingRecord?.hadithNumber}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Primary Narrator</Label>
                      <Input 
                        className="bg-white border-zinc-200 h-12 px-4 rounded-xl font-bold text-zinc-700 shadow-sm" 
                        value={editingRecord?.englishNarrator || editingRecord?.urduNarrator || ''} 
                        placeholder="e.g. Abu Huraira (RA)"
                        onChange={(e) => {
                          if (edition?.type === 'urdu') setEditingRecord({...editingRecord, urduNarrator: e.target.value});
                          else setEditingRecord({...editingRecord, englishNarrator: e.target.value});
                        }} 
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <DialogFooter className="px-10 py-8 bg-zinc-50 border-t shrink-0 flex items-center justify-between gap-6">
            <div className="hidden sm:flex items-center gap-3 text-zinc-400">
              <RefreshCcw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Syncing to localized index shards</span>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-14 px-8 font-bold text-zinc-400 hover:text-zinc-900 hover:bg-transparent">
                Discard Changes
              </Button>
              <Button 
                className="h-14 px-12 rounded-[1.25rem] bg-zinc-900 text-white font-bold shadow-2xl shadow-zinc-200 active:scale-95 transition-all hover:bg-black gap-3" 
                onClick={handleSaveEdit}
              >
                <Save className="w-4 h-4" />
                Commit Refinement
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
