
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
  Info,
  Save,
  BookOpen,
  Hash,
  ShieldCheck
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
import { ScrollArea } from '@/components/ui/scroll-area';

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
      toast({ title: "Overhaul Complete", description: `Synced ${registryData.books.length} collections.` });
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Hadith Studio</h1>
          </div>
          <p className="text-sm text-zinc-500 ml-11">Professional HadithAPI synchronization engine.</p>
        </div>
        <Button 
          onClick={handleOverhaulRegistry} 
          disabled={isSeeding}
          className="gap-2 h-12 rounded-xl font-bold bg-zinc-900 text-white shadow-xl hover:bg-black transition-all"
        >
          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
          Overhaul Registry
        </Button>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Initializing Studio...</p>
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
    setSyncState({ isSyncing: true, progress: 0, status: 'fetching HadithAPI schema', targetEdition: edition.id });
    try {
      const indexRef = doc(db, 'hadith_index', edition.id);
      const existingSnap = await getDoc(indexRef);

      if (existingSnap.exists()) {
        toast({ title: "Index Verified", description: `Index already exists for ${book?.bookName || edition.id}` });
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
        toast({ title: "Shard Indexed", description: `Successfully extracted ${payload.chapters.length} nodes.` });
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
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{book?.bookName}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Language Shard Management</p>
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

      {isLoadingEditions ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hydrating Shards...</p>
        </div>
      ) : (
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
      )}
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
          <Badge variant={isInspectable ? "default" : "secondary"} className={cn("text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-sm", isInspectable ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400")}>
            {isInspectable ? 'INDEX READY' : 'INDEX MISSING'}
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

export function HadithDataView({ editionId, onBack, onViewChapter }: { editionId: string, onBack: () => void, onViewChapter: (num: string) => void }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [syncState, setSyncState] = useState({ isSyncing: false, progress: 0, status: 'idle', targetChapter: '' });
  
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

  const handleSyncChapterContent = async (chapter: any) => {
    if (!edition) return;
    setSyncState({ isSyncing: true, progress: 0, status: 'streaming HadithAPI records', targetChapter: chapter.name });
    try {
      const payload = await fetchHadithApiData(indexDoc?.bookSlug, chapter.number);
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
          chapterId: chapter.number,
          hadithNumber: h.hadithNumber,
          updatedAt: new Date().toISOString(),
        };

        // Capture status robustly
        transformedRecord.status = h.status || h.hadithStatus || (h.grades && h.grades[0]?.grade) || 'Verified';

        if (edition.type === 'english') {
          transformedRecord.hadith_text = h.hadithEnglish || '';
          transformedRecord.heading_text = h.headingEnglish || h.chapter?.chapterEnglish || '';
          transformedRecord.narrator_text = h.englishNarrator || '';
          transformedRecord.chapterTitle = h.chapter?.chapterEnglish || '';
        } else if (edition.type === 'urdu') {
          transformedRecord.hadith_text = h.hadithUrdu || '';
          transformedRecord.heading_text = h.headingUrdu || h.chapter?.chapterUrdu || '';
          transformedRecord.narrator_text = h.urduNarrator || '';
          transformedRecord.chapterTitle = h.chapter?.chapterUrdu || '';
        } else if (edition.type === 'arabic') {
          const rawArabic = h.hadithArabic || '';
          const quoteIndex = rawArabic.search(/["«]/);
          if (quoteIndex !== -1) {
            transformedRecord.narrator_text = rawArabic.substring(0, quoteIndex).trim();
            transformedRecord.hadith_text = rawArabic.substring(quoteIndex).trim();
          } else {
            transformedRecord.narrator_text = '';
            transformedRecord.hadith_text = rawArabic;
          }
          transformedRecord.heading_text = h.headingArabic || h.chapter?.chapterArabic || '';
          transformedRecord.chapterTitle = h.chapter?.chapterArabic || '';
        }

        // Explode book object and strip redundant fields
        if (h.book && typeof h.book === 'object') {
          Object.entries(h.book).forEach(([bk, bv]) => {
            if (!(bk in transformedRecord)) {
              transformedRecord[bk] = bv;
            }
          });
        }

        Object.keys(h).forEach(key => {
          const excluded = [
            'grades', 'chapter', 'book', 
            'hadithEnglish', 'hadithUrdu', 'hadithArabic', 
            'headingEnglish', 'headingUrdu', 'headingArabic', 
            'englishNarrator', 'urduNarrator'
          ];
          if (excluded.includes(key)) return;
          if (!(key in transformedRecord)) {
            transformedRecord[key] = h[key];
          }
        });

        batch.set(doc(db, 'hadith_data', hadithId), transformedRecord, { merge: true });
      });

      await batch.commit();
      
      const syncedMap = { ...(indexDoc?.syncedSections || {}) }; 
      syncedMap[chapter.number] = true; 
      updateDocumentNonBlocking(indexRef!, { syncedSections: syncedMap }); 
      
      toast({ title: "Data Ingested", description: `Captured ${data.length} records.` });
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
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">{indexDoc?.name || 'Edition'} Shard</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Structural Content Audit</p>
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Scanning Shards...</p>
        </div>
      ) : (
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
                <Button variant="outline" size="sm" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleSyncChapterContent(s)}>
                  <Zap className="w-3.5 h-3.5 mr-2" /> {s.isSynced ? 'Update' : 'Ingest'}
                </Button>
                {s.isSynced && (
                  <Button variant="outline" size="sm" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => onViewChapter(s.number)}>
                    <Eye className="w-3.5 h-3.5 mr-2" /> Inspect
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

export function HadithChapterRecordsView({ bookId, editionId, chapterId, onBack }: { bookId: string, editionId: string, chapterId: string, onBack: () => void }) {
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
    where('chapterId', '==', chapterId),
    limit(200)
  ), [db, editionId, chapterId]);

  const { data: rawRecords, isLoading } = useCollection(recordsQuery);

  const sortedRecords = useMemo(() => {
    if (!rawRecords) return [];
    return [...rawRecords].sort((a, b) => parseFloat(a.hadithNumber) - parseFloat(b.hadithNumber));
  }, [rawRecords]);

  const handleSaveEdit = () => {
    if (!editingRecord) return;
    
    updateDocumentNonBlocking(doc(db, 'hadith_data', editingRecord.id), {
      volume: editingRecord.volume || '',
      chapterId: editingRecord.chapterId || '',
      hadithNumber: editingRecord.hadithNumber || '',
      status: editingRecord.status || '',
      narrator_text: editingRecord.narrator_text || '',
      hadith_text: editingRecord.hadith_text || '',
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
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 truncate max-w-[200px] sm:max-w-none">{indexDoc?.sections?.[chapterId] || 'Records'}</h2>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">{edition?.language} Validation Workbench</p>
          </div>
        </div>
        <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-zinc-100 text-zinc-500">
          {sortedRecords?.length || 0} Records Found
        </Badge>
      </header>

      <Card className="overflow-hidden border shadow-sm bg-white rounded-[2rem]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-50/50">
              <TableRow className="h-20">
                <TableHead className="w-24 text-[10px] font-black uppercase pl-6 sm:pl-10">Ref</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Content Preview</TableHead>
                <TableHead className="text-[10px] font-black uppercase hidden sm:table-cell">Attributes</TableHead>
                <TableHead className="w-32 text-right pr-6 sm:pr-10">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-zinc-900" /><p className="text-[10px] font-black uppercase text-zinc-300">Hydrating Records...</p></div></TableCell></TableRow>
              ) : sortedRecords?.map((r) => (
                <TableRow key={r.id} className="h-28 border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <TableCell className="pl-6 sm:pl-10">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">#{r.hadithNumber}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className={cn(
                      "text-[11px] text-zinc-600 line-clamp-2 leading-relaxed max-w-[500px]",
                      edition?.type === 'arabic' || edition?.type === 'urdu' ? "font-arabic text-right text-sm" : ""
                    )} dir={edition?.type === 'arabic' || edition?.type === 'urdu' ? "rtl" : "ltr"}>
                      {r.hadith_text}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[150px]">{r.narrator_text || '---'}</span>
                      {r.status && (
                        <Badge variant="outline" className={cn(
                          "text-[7px] uppercase w-fit py-0 px-1 border-zinc-100 font-black tracking-widest",
                          r.status.toLowerCase().includes('sahih') ? "text-emerald-600 bg-emerald-50 border-emerald-100" : ""
                        )}>
                          {r.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6 sm:pr-10">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingRecord({ ...r }); setIsEditDialogOpen(true); }} className="h-11 w-11 rounded-xl">
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
        <DialogContent className="max-w-6xl w-[95vw] h-auto max-h-[95vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] sm:rounded-[3rem] border-zinc-200 bg-white shadow-2xl">
          <DialogHeader className="px-8 sm:px-12 py-8 sm:py-10 border-b bg-zinc-50/50 shrink-0">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-white border border-zinc-200 rounded-2xl shadow-sm text-zinc-400 hidden sm:block">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900">Record Refinement</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Shard: {edition?.language} • Resource: {editingRecord?.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1">
            <div className="p-8 sm:p-12 space-y-12">
              {/* 1st: Identity & Reference (Editable) */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-zinc-400 ml-1">
                  <Hash className="w-4 h-4" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em]">Identity & Reference</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-3">
                    <Label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Volume</Label>
                    <Input 
                      className="bg-zinc-50 border-zinc-100 h-12 rounded-xl font-bold text-zinc-900 shadow-inner focus-visible:ring-zinc-900" 
                      value={editingRecord?.volume || ''} 
                      onChange={(e) => setEditingRecord({...editingRecord, volume: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Chapter ID</Label>
                    <Input 
                      className="bg-zinc-50 border-zinc-100 h-12 rounded-xl font-bold text-zinc-900 shadow-inner focus-visible:ring-zinc-900" 
                      value={editingRecord?.chapterId || ''} 
                      onChange={(e) => setEditingRecord({...editingRecord, chapterId: e.target.value})}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-1">Hadith Number</Label>
                    <Input 
                      className="bg-zinc-50 border-zinc-100 h-12 rounded-xl font-bold text-zinc-900 shadow-inner focus-visible:ring-zinc-900" 
                      value={editingRecord?.hadithNumber || ''} 
                      onChange={(e) => setEditingRecord({...editingRecord, hadithNumber: e.target.value})}
                    />
                  </div>
                </div>
              </section>

              {/* 2nd: Scholarly Status */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 ml-1">
                  <ShieldCheck className="w-4 h-4" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em]">Scholarly Status</Label>
                </div>
                <Input 
                  className="bg-white border-zinc-200 h-14 px-6 rounded-2xl font-bold text-zinc-700 shadow-sm focus-visible:ring-zinc-900 text-lg" 
                  value={editingRecord?.status || ''} 
                  placeholder="Sahih, Hasan, Da'if..."
                  onChange={(e) => setEditingRecord({...editingRecord, status: e.target.value})}
                />
              </section>

              {/* 3rd: Primary Narrator (Sanad) */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-zinc-400 ml-1">
                  <Info className="w-4 h-4" />
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em]">Primary Narrator (Sanad)</Label>
                </div>
                <Input 
                  className="bg-white border-zinc-200 h-14 px-6 rounded-2xl font-bold text-zinc-700 shadow-sm focus-visible:ring-zinc-900 text-lg" 
                  value={editingRecord?.narrator_text || ''} 
                  placeholder="Enter Sanad chain..."
                  onChange={(e) => setEditingRecord({...editingRecord, narrator_text: e.target.value})} 
                />
              </section>

              {/* 4th: Prophetic Narration (Matn) */}
              <section className="space-y-4 pt-6 border-t border-zinc-100">
                <div className="flex items-center justify-between ml-1">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <BookOpen className="w-4 h-4" />
                    <Label className="text-[10px] font-black uppercase tracking-[0.3em]">Prophetic Narration (Matn)</Label>
                  </div>
                  <Badge variant="ghost" className="text-[9px] text-zinc-300 uppercase font-black tracking-widest">
                    {edition?.type === 'arabic' ? 'Original Script' : 'Translated Content'}
                  </Badge>
                </div>
                
                <Textarea 
                  dir={edition?.type === 'arabic' || edition?.type === 'urdu' ? "rtl" : "ltr"}
                  className={cn(
                    "min-h-[450px] leading-relaxed p-10 bg-zinc-50/50 rounded-[2.5rem] border-none shadow-inner focus-visible:ring-1 focus-visible:ring-zinc-200 transition-all font-medium text-zinc-700 resize-none",
                    edition?.type === 'english' ? "text-xl" : "text-3xl sm:text-5xl font-arabic leading-[2.5] text-zinc-800"
                  )}
                  value={editingRecord?.hadith_text || ''}
                  placeholder="Enter narration text..."
                  onChange={(e) => setEditingRecord({ ...editingRecord, hadith_text: e.target.value })}
                />
              </section>
            </div>
          </ScrollArea>

          <DialogFooter className="px-8 sm:px-12 py-8 sm:py-10 bg-zinc-50 border-t shrink-0 flex flex-row items-center justify-end gap-4">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="h-12 sm:h-14 px-6 font-bold text-zinc-400 hover:text-zinc-900">
              Discard Changes
            </Button>
            <Button 
              className="h-12 sm:h-14 px-12 rounded-2xl bg-zinc-900 text-white font-bold shadow-2xl active:scale-95 transition-all hover:bg-black gap-3" 
              onClick={handleSaveEdit}
            >
              <Save className="w-4 h-4" />
              <span>Commit Refinement</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
