
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
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Trash2, 
  BookOpen, 
  Hash,
  RefreshCw,
  Library,
  ScrollText,
  User,
  Database,
  ChevronRight,
  ArrowLeft,
  Languages,
  Power,
  PowerOff,
  Plus,
  ListOrdered,
  Pencil,
  FileText,
  Search,
  Settings,
  Table as TableIcon,
  CloudDownload,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { fetchHadithBooks, fetchHadithChapters, fetchHadiths, HadithApiBook, HadithApiChapter, HadithApiRecord } from '@/services/hadith-api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const SLUG_MAPPING = [
  { name: "Sahih Bukhari", slug: "sahih-bukhari" },
  { name: "Sahih Muslim", slug: "sahih-muslim" },
  { name: "Jami' Al-Tirmidhi", slug: "al-tirmidhi" },
  { name: "Sunan Abu Dawood", slug: "abu-dawood" },
  { name: "Sunan Ibn-e-Majah", slug: "ibn-e-majah" },
  { name: "Sunan An-Nasa`i", slug: "sunan-nasai" },
  { name: "Mishkat Al-Masabih", slug: "mishkat" },
  { name: "Musnad Ahmad", slug: "musnad-ahmad" },
  { name: "Al-Silsila Sahiha", slug: "al-silsila-sahiha" }
];

const STANDARD_LANGUAGES = [
  { id: 'arabic', label: 'Arabic', field: 'hadithArabic' },
  { id: 'english', label: 'English', field: 'englishTerjuma' },
  { id: 'urdu', label: 'Urdu', field: 'urduTerjuma' }
];

export function HadithManager() {
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSeedingSlugs, setIsSeedingSlugs] = useState(false);

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('bookName', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  const handleSyncFromApi = async () => {
    setIsSyncing(true);
    try {
      const apiBooks = await fetchHadithBooks();
      const batch = writeBatch(db);
      
      apiBooks.forEach((book: HadithApiBook) => {
        const bookRef = doc(db, 'hadith_books', book.bookSlug);
        batch.set(bookRef, {
          ...book,
          id: book.bookSlug,
          isActive: true,
          lastSyncedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Synchronization Complete", description: `Successfully synced ${apiBooks.length} collections.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSeedSlugs = async () => {
    setIsSeedingSlugs(true);
    try {
      const batch = writeBatch(db);
      SLUG_MAPPING.forEach((item) => {
        const slugRef = doc(db, 'hadith_slug', item.slug);
        batch.set(slugRef, {
          id: item.slug,
          bookName: item.name,
          slug: item.slug,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      toast({ title: "Slugs Seeded", description: "The hadith_slug table has been updated." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Seeding Failed", description: error.message });
    } finally {
      setIsSeedingSlugs(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-xl border-t border-white/5">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Library className="w-6 h-6 text-zinc-500" />
            <h2 className="text-2xl font-headline font-bold text-white">Hadith Hub</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage primary collections and drill down into standard language editions.</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-6 font-bold border-zinc-800 text-zinc-400 hover:border-white hover:text-white flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            onClick={handleSeedSlugs}
            disabled={isSeedingSlugs}
          >
            {isSeedingSlugs ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
            <span>Seed Slugs</span>
          </Button>
          
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-8 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            onClick={handleSyncFromApi}
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
            <span>Sync Registry</span>
          </Button>
        </div>
      </div>

      {isLoadingBooks ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Loading library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book) => (
            <Card 
              key={book.id} 
              className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden group hover:border-zinc-500 transition-all flex flex-col shadow-2xl border-t border-white/5 cursor-pointer"
              onClick={() => router.push(`/admin/hadith?bookId=${book.id}`)}
            >
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">{book.bookName}</CardTitle>
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{book.id}</p>
                  </div>
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
                    <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-8 flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <User className="w-4 h-4 text-zinc-600" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{book.writerName}</span>
                      <span className="text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Died: {book.writerDeath}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400">
                    <ScrollText className="w-4 h-4 text-zinc-600" />
                    <span className="text-xs font-bold">{book.chapters_count} Chapters</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-900 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    <Hash className="w-3 h-3 text-zinc-600" />
                    <span className="text-[10px] font-black uppercase text-zinc-400">{parseInt(book.hadiths_count || '0').toLocaleString()} Records</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-2 uppercase">Verified Collection</Badge>
                </div>
              </CardContent>
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
    targetLang: ''
  });

  const bookRef = useMemoFirebase(() => doc(db, 'hadith_books', bookId), [db, bookId]);
  const { data: book } = useDoc(bookRef);

  const editionsQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', bookId)
  ), [db, bookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  const indexQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_index'),
    where('bookSlug', '==', bookId)
  ), [db, bookId]);
  const { data: indexData, isLoading: isLoadingIndex } = useCollection(indexQuery);

  const sortedIndex = useMemo(() => {
    if (!indexData) return [];
    return [...indexData].sort((a, b) => {
      const numA = parseInt(a.chapterNumber || '0');
      const numB = parseInt(b.chapterNumber || '0');
      return numA - numB;
    });
  }, [indexData]);

  const handleSyncLanguageEdition = async (langId: string, langLabel: string) => {
    if (!book?.bookSlug) return;
    
    setSyncState({ isSyncing: true, progress: 0, status: 'initializing', targetLang: langLabel });
    
    try {
      const editionId = `${book.bookSlug}-${langId}`;
      const editionRef = doc(db, 'hadith_editions', editionId);
      
      // 1. Ensure edition exists
      await setDocumentNonBlocking(editionRef, {
        id: editionId,
        bookId: book.bookSlug,
        language: langLabel,
        editionName: `${book.bookName} (${langLabel})`,
        isActive: true,
        lastSyncedAt: new Date().toISOString()
      }, { merge: true });

      // 2. Fetch and Sync Content
      let currentPage = 1;
      let lastPage = 1;
      let totalFetched = 0;

      do {
        setSyncState(prev => ({ ...prev, status: `fetching page ${currentPage}` }));
        const payload = await fetchHadiths(book.bookSlug, currentPage);
        const records = payload.data;
        lastPage = payload.lastPage;

        if (records.length === 0) break;

        const batchSize = 25;
        for (let i = 0; i < records.length; i += batchSize) {
          const chunk = records.slice(i, i + batchSize);
          const batch = writeBatch(db);
          
          chunk.forEach((h: HadithApiRecord) => {
            const hId = `${editionId}_h_${h.hadithNumber}`;
            const hRef = doc(db, 'hadith_data', hId);
            
            let text = '';
            if (langId === 'arabic') text = h.hadithArabic || '';
            else if (langId === 'english') text = h.englishTerjuma || h.hadithEnglish || '';
            else if (langId === 'urdu') text = h.urduTerjuma || h.hadithUrdu || '';

            batch.set(hRef, {
              id: hId,
              editionId,
              bookId: book.bookSlug,
              hadithNumber: h.hadithNumber,
              arabicText: h.hadithArabic || '',
              translatedText: text,
              chapterName: h.chapterName || 'Unknown Section',
              status: h.status || 'Verified',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          });

          await batch.commit();
          totalFetched += chunk.length;
          const progress = Math.round((currentPage / lastPage) * 100);
          setSyncState(prev => ({ ...prev, progress, status: 'indexing' }));
        }

        currentPage++;
      } while (currentPage <= lastPage);

      toast({ title: "Language Sync Complete", description: `Ingested ${totalFetched} ${langLabel} records for ${book.bookName}.` });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: e.message });
    } finally {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const handleSyncIndex = async () => {
    if (!book?.bookSlug) return;
    try {
      const apiChapters = await fetchHadithChapters(book.bookSlug);
      const batch = writeBatch(db);
      apiChapters.forEach((ch: HadithApiChapter) => {
        const indexId = `${book.bookSlug}_ch_${ch.chapterNumber}`;
        const indexRef = doc(db, 'hadith_index', indexId);
        batch.set(indexRef, {
          id: indexId, bookSlug: book.bookSlug, chapterNumber: ch.chapterNumber,
          chapterArabic: ch.chapterArabic, chapterEnglish: ch.chapterEnglish, chapterUrdu: ch.chapterUrdu,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
      toast({ title: "Index Synced" });
    } catch (e: any) { toast({ variant: "destructive", title: "Index Sync Failed", description: e.message }); }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <Dialog open={syncState.isSyncing}>
        <DialogContent className="bg-zinc-950/90 border-zinc-900 text-white rounded-[2.5rem] p-12 outline-none shadow-2xl backdrop-blur-2xl max-w-lg border-t border-white/5">
          <div className="flex flex-col items-center text-center space-y-8">
             <div className="relative group">
               <div className="absolute inset-0 bg-white/5 rounded-full scale-150 blur-2xl group-hover:bg-white/10 transition-all duration-1000 animate-pulse" />
               <div className="relative w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-zinc-800 shadow-2xl overflow-hidden">
                 <Database className="w-10 h-10 text-white relative z-10 animate-bounce" />
               </div>
               <div className="absolute -inset-4 border border-zinc-800 rounded-full animate-[spin_10s_linear_infinite] opacity-50" />
             </div>

             <DialogHeader className="space-y-3">
               <DialogTitle className="text-2xl font-headline font-bold tracking-tight">Syncing {syncState.targetLang} Edition</DialogTitle>
               <DialogDescription className="text-zinc-500 text-sm max-w-[280px] mx-auto leading-relaxed">Connecting to system-level ingestion nodes for Prophetic data extraction.</DialogDescription>
             </DialogHeader>

             <div className="w-full space-y-6">
               <div className="space-y-3">
                 <div className="flex justify-between items-end">
                   <div className="flex flex-col items-start gap-1">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Edition Progress</span>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-xs font-mono text-zinc-400 capitalize">{syncState.status}...</span>
                     </div>
                   </div>
                   <span className="text-3xl font-headline font-bold text-white tabular-nums">{syncState.progress}%</span>
                 </div>
                 <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/50 p-0.5">
                   <div className="h-full bg-white rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ width: `${syncState.progress}%` }} />
                 </div>
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-zinc-950 p-8 rounded-[2.5rem] border border-zinc-900 shadow-xl border-t border-white/5">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white h-12 w-12 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-2xl font-headline font-bold text-white leading-tight">{book?.bookName}</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Multi-Language Studio</p>
          </div>
        </div>
        <Button 
          variant="outline"
          className="rounded-xl h-12 px-6 font-bold border-zinc-800 text-zinc-400 hover:border-white hover:text-white flex items-center gap-2 transition-all shadow-md"
          onClick={handleSyncIndex}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Refresh Chapter Index</span>
        </Button>
      </div>

      <Tabs defaultValue="editions" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1.5 rounded-2xl h-14 border border-zinc-900/50 mb-10">
          <TabsTrigger value="editions" className="px-10 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-zinc-500">Language Editions</TabsTrigger>
          <TabsTrigger value="index" className="px-10 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold text-zinc-500">Chapter Index</TabsTrigger>
        </TabsList>

        <TabsContent value="editions">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STANDARD_LANGUAGES.map((lang) => {
              const editionId = `${bookId}-${lang.id}`;
              const exists = editions?.find(e => e.id === editionId);
              
              return (
                <Card 
                  key={lang.id} 
                  className={cn(
                    "bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden flex flex-col group transition-all shadow-xl relative border-t border-white/5",
                    exists ? "cursor-pointer hover:border-zinc-500" : "opacity-90"
                  )}
                  onClick={() => exists && onSelectEdition(editionId)}
                >
                  <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-inner group-hover:border-zinc-600 transition-colors">
                        <Languages className="w-6 h-6 text-zinc-500" />
                      </div>
                      <Badge className={cn("border-none text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full", exists ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>
                        {exists ? 'In Studio' : 'Pending'}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-zinc-100 group-hover:text-white line-clamp-1 transition-colors">{lang.label} Edition</CardTitle>
                    <CardDescription className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter mt-1">{bookId}-{lang.id}</CardDescription>
                  </CardHeader>
                  <CardFooter className="p-8 bg-zinc-900/10 border-t border-zinc-900 flex justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl font-bold h-12 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all flex items-center justify-center gap-2"
                      onClick={() => handleSyncLanguageEdition(lang.id, lang.label)}
                    >
                      <RefreshCw className="w-4 h-4" />
                      {exists ? 'Resync' : 'Sync Language'}
                    </Button>
                    {exists && (
                      <Button variant="ghost" size="icon" onClick={() => onSelectEdition(editionId)} className="rounded-xl h-12 w-12 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="index">
          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2.5rem] shadow-2xl border-t border-white/5">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-900">
                  <TableHead className="py-8 pl-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 w-24">No.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Arabic Script</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">English Language</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Urdu Language</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingIndex ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-zinc-800" /></TableCell></TableRow>
                ) : sortedIndex?.map((ch) => (
                  <TableRow key={ch.id} className="border-zinc-900 h-20 hover:bg-zinc-900/40 transition-colors">
                    <TableCell className="pl-10 font-mono text-xs text-zinc-500">{ch.chapterNumber}</TableCell>
                    <TableCell className="font-arabic text-xl text-zinc-300" dir="rtl">{ch.chapterArabic}</TableCell>
                    <TableCell className="text-xs font-bold text-zinc-100">{ch.chapterEnglish}</TableCell>
                    <TableCell className="font-arabic text-zinc-400">{ch.chapterUrdu}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HadithDataView({ editionId, onBack }: { editionId: string, onBack: () => void }) {
  const db = useFirestore();
  const { toast } = useToast();
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
            <h2 className="text-2xl font-headline font-bold text-white tracking-tight">{edition?.editionName} Content</h2>
            <div className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-600 tracking-widest">
              <TableIcon className="w-3 h-3" />
              <span>Granular Prophetic Registry</span>
            </div>
          </div>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input 
            placeholder="Search within edition..." 
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
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Source Chapter</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Language Mapping Preview</TableHead>
              <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-96 text-center"><div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-zinc-800" /><p className="text-xs font-black uppercase text-zinc-700 tracking-widest">Indexing Viewport...</p></div></TableCell></TableRow>
            ) : filteredHadiths?.map((h) => (
              <TableRow key={h.id} className="border-zinc-900 h-32 hover:bg-zinc-900/40 transition-colors">
                <TableCell className="pl-10 font-mono text-xs text-zinc-600">
                  <Badge variant="outline" className="border-zinc-800 text-zinc-500 bg-black/50">#{h.hadithNumber}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col max-w-[200px]">
                    <span className="text-sm font-bold text-zinc-100 truncate">{h.chapterName}</span>
                    <span className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter mt-0.5">Section Identified</span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed italic max-w-xl">{h.translatedText}</p>
                </TableCell>
                <TableCell className="text-right pr-10">
                  <Button variant="ghost" size="sm" className="h-10 px-5 text-zinc-500 hover:text-white transition-all border border-transparent hover:border-zinc-800 rounded-xl" onClick={() => toast({ title: "Granular Edit Tool Incoming" })}>
                    <Pencil className="w-4 h-4 mr-2" /> <span className="font-bold">Edit</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
