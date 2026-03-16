
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
  FileText
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
import { fetchHadithBooks, fetchHadithChapters, HadithApiBook, HadithApiChapter } from '@/services/hadith-api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <Library className="w-6 h-6 text-zinc-500" />
            <h2 className="text-2xl font-headline font-bold text-white">Hadith Hub</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Manage primary collections and drill down into editions.</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <Button 
            variant="outline"
            className="rounded-xl h-12 px-6 font-bold border-white text-white hover:bg-white hover:text-black shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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
            <span>Sync Collections</span>
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
              onClick={() => router.push(`/admin/hadith/${book.id}`)}
              className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden group hover:border-zinc-500 transition-all flex flex-col shadow-2xl cursor-pointer"
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
                    <span className="text-[10px] font-black uppercase text-zinc-400">{parseInt(book.hadiths_count || '0').toLocaleString()} Hadiths</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-2 uppercase">Active</Badge>
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
  
  const [isSyncingIndex, setIsSyncingIndex] = useState(false);

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

  const toggleStatus = (id: string, current: boolean) => {
    updateDocumentNonBlocking(doc(db, 'hadith_editions', id), { isActive: !current });
    toast({ title: !current ? "Edition Activated" : "Edition Deactivated" });
  };

  const createEdition = () => {
    const lang = prompt("Enter language (e.g., English, Urdu, Arabic):");
    const sourceLink = prompt("Enter source JSON URL (sourceLinkMin):");
    if (!lang) return;
    const name = `${book?.bookName} (${lang})`;
    const id = `${bookId}-${lang.toLowerCase()}`;
    
    setDocumentNonBlocking(doc(db, 'hadith_editions', id), {
      id,
      bookId,
      language: lang,
      editionName: name,
      sourceLinkMin: sourceLink || '',
      isActive: true,
      lastSyncedAt: new Date().toISOString()
    }, { merge: true });
    toast({ title: "Edition Created" });
  };

  const handleSyncIndex = async () => {
    if (!book?.bookSlug) return;
    setIsSyncingIndex(true);
    try {
      const apiChapters = await fetchHadithChapters(book.bookSlug);
      const batch = writeBatch(db);
      
      apiChapters.forEach((ch: HadithApiChapter) => {
        const indexId = `${book.bookSlug}_ch_${ch.chapterNumber}`;
        const indexRef = doc(db, 'hadith_index', indexId);
        batch.set(indexRef, {
          id: indexId,
          bookSlug: book.bookSlug,
          chapterNumber: ch.chapterNumber,
          chapterArabic: ch.chapterArabic,
          chapterEnglish: ch.chapterEnglish,
          chapterUrdu: ch.chapterUrdu,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      toast({ title: "Index Synced", description: `Updated ${apiChapters.length} chapter definitions.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Index Sync Failed", description: error.message });
    } finally {
      setIsSyncingIndex(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-headline font-bold text-white">{book?.bookName} Details</h2>
            <p className="text-sm text-zinc-500">Manage editions and structural metadata.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline"
            className="rounded-xl h-11 px-6 font-bold border-white text-white hover:bg-white hover:text-black flex items-center gap-2"
            onClick={handleSyncIndex}
            disabled={isSyncingIndex}
          >
            {isSyncingIndex ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListOrdered className="w-4 h-4" />}
            <span>Sync Chapter Index</span>
          </Button>
          <Button 
            variant="outline"
            className="rounded-xl h-11 px-6 font-bold border-white text-white hover:bg-white hover:text-black flex items-center gap-2"
            onClick={createEdition}
          >
            <Plus className="w-4 h-4" />
            <span>Add Edition</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editions" className="w-full">
        <TabsList className="bg-zinc-900/50 p-1 rounded-2xl h-12 border border-zinc-800 mb-8">
          <TabsTrigger value="editions" className="px-8 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold">Language Editions</TabsTrigger>
          <TabsTrigger value="index" className="px-8 rounded-xl h-full data-[state=active]:bg-zinc-800 data-[state=active]:text-white transition-all font-bold">Chapter Index</TabsTrigger>
        </TabsList>

        <TabsContent value="editions">
          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-900">
                  <TableHead className="py-6 pl-8 text-[9px] font-black uppercase text-zinc-500">Edition Name</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-zinc-500">Language</TableHead>
                  <TableHead className="text-center text-[9px] font-black uppercase text-zinc-500">Status</TableHead>
                  <TableHead className="text-right pr-8 text-[9px] font-black uppercase text-zinc-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEditions ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-zinc-800" /></TableCell></TableRow>
                ) : editions?.map((edition) => (
                  <TableRow key={edition.id} className="border-zinc-900 h-20 hover:bg-zinc-900/40">
                    <TableCell className="pl-8" onClick={() => onSelectEdition(edition.id)}>
                      <div className="flex items-center gap-3 cursor-pointer group">
                        <Languages className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        <span className="font-bold text-zinc-100 group-hover:text-white">{edition.editionName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-400">{edition.language}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("border-none text-[8px] font-black uppercase", edition.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-900 text-zinc-600")}>
                        {edition.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8 space-x-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-white" onClick={() => {
                        const newUrl = prompt("Enter new source JSON URL:", edition.sourceLinkMin);
                        if (newUrl !== null) updateDocumentNonBlocking(doc(db, 'hadith_editions', edition.id), { sourceLinkMin: newUrl });
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-white" onClick={() => toggleStatus(edition.id, edition.isActive)}>
                        {edition.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => deleteDocumentNonBlocking(doc(db, 'hadith_editions', edition.id))}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="index">
          <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
            <Table>
              <TableHeader className="bg-zinc-900/50">
                <TableRow className="border-zinc-900">
                  <TableHead className="py-6 pl-8 text-[9px] font-black uppercase text-zinc-500 w-24">No.</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-zinc-500">Arabic Title</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-zinc-500">English Title</TableHead>
                  <TableHead className="text-[9px] font-black uppercase text-zinc-500">Urdu Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingIndex ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-zinc-800" /></TableCell></TableRow>
                ) : sortedIndex?.map((ch) => (
                  <TableRow key={ch.id} className="border-zinc-900 h-20 hover:bg-zinc-900/40">
                    <TableCell className="pl-8 font-mono text-xs text-zinc-500">{ch.chapterNumber}</TableCell>
                    <TableCell className="font-arabic text-lg text-zinc-300" dir="rtl">{ch.chapterArabic}</TableCell>
                    <TableCell className="text-xs font-bold text-zinc-100">{ch.chapterEnglish}</TableCell>
                    <TableCell className="font-arabic text-zinc-400">{ch.chapterUrdu}</TableCell>
                  </TableRow>
                ))}
                {sortedIndex.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <ScrollText className="w-12 h-12 text-zinc-900" />
                        <p className="text-zinc-600 font-medium">Chapter index has not been synchronized for this book.</p>
                        <Button variant="link" onClick={handleSyncIndex} className="text-white">Start Sync Now</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
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
  
  const editionRef = useMemoFirebase(() => doc(db, 'hadith_editions', editionId), [db, editionId]);
  const { data: edition } = useDoc(editionRef);

  const dataQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_data'),
    where('editionId', '==', editionId),
    limit(100)
  ), [db, editionId]);
  const { data: hadiths, isLoading } = useCollection(dataQuery);

  const [isSyncingMeta, setIsSyncingMeta] = useState(false);

  const handleSyncMetadata = async () => {
    if (!edition?.sourceLinkMin) {
      toast({ variant: "destructive", title: "No Source URL", description: "Please provide sourceLinkMin for this edition first." });
      return;
    }

    setIsSyncingMeta(true);
    try {
      const response = await fetch(edition.sourceLinkMin);
      const data = await response.json();
      
      if (!data.metadata) throw new Error("Metadata field not found in response.");

      const metaId = editionId;
      await setDocumentNonBlocking(doc(db, 'hadith_metadata', metaId), {
        id: metaId,
        editionId,
        bookId: edition.bookId,
        metadata: data.metadata,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Metadata Synced", description: "Edition structure (chapters/sections) has been indexed." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setIsSyncingMeta(false);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-headline font-bold text-white">{edition?.editionName} Content</h2>
            <p className="text-sm text-zinc-500">Previewing individual Hadith records and structural metadata.</p>
          </div>
        </div>
        <Button 
          variant="outline"
          className="rounded-xl h-11 px-6 font-bold border-white text-white hover:bg-white hover:text-black flex items-center gap-2"
          onClick={handleSyncMetadata}
          disabled={isSyncingMeta}
        >
          {isSyncingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          <span>Sync Metadata Index</span>
        </Button>
      </div>

      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden rounded-[2rem] shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-900">
              <TableHead className="py-6 pl-8 text-[9px] font-black uppercase text-zinc-500 w-24">No.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-500">Chapter</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-zinc-500">Content Preview</TableHead>
              <TableHead className="text-right pr-8 text-[9px] font-black uppercase text-zinc-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-zinc-800" /></TableCell></TableRow>
            ) : hadiths?.map((h) => (
              <TableRow key={h.id} className="border-zinc-900 h-20 hover:bg-zinc-900/40">
                <TableCell className="pl-8 font-mono text-xs text-zinc-500">{h.hadithNumber}</TableCell>
                <TableCell className="text-xs font-bold text-zinc-400">{h.chapterName}</TableCell>
                <TableCell>
                  <p className="text-xs text-zinc-300 line-clamp-1 max-w-md">{h.translatedText}</p>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => deleteDocumentNonBlocking(doc(db, 'hadith_data', h.id))}>
                    <Trash2 className="w-4 h-4" />
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
