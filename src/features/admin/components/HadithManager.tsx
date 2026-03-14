
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, writeBatch } from 'firebase/firestore';
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
  BookOpen, 
  Hash,
  RefreshCw,
  Library,
  ScrollText,
  User,
  Database,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { fetchHadithBooks, HadithApiBook } from '@/services/hadith-api';
import { Badge } from '@/components/ui/badge';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSeedingSlugs, setIsSeedingSlugs] = useState(false);

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('bookName', 'asc')
  ), [db]);

  const { data: books, isLoading } = useCollection(booksQuery);

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
          <p className="text-sm text-zinc-500 font-medium">Manage primary collections and slug mappings.</p>
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

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Loading library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books?.map((book) => (
            <Card key={book.id} className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden group hover:border-zinc-700 transition-all flex flex-col shadow-2xl">
              <CardHeader className="p-8 border-b border-zinc-900 bg-zinc-900/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">{book.bookName}</CardTitle>
                    <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{book.id}</p>
                  </div>
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
                    <BookOpen className="w-5 h-5 text-zinc-500" />
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
                    <span className="text-[10px] font-black uppercase text-zinc-400">{parseInt(book.hadiths_count).toLocaleString()} Hadiths</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[8px] font-black px-2 uppercase">Active</Badge>
                </div>
              </CardContent>

              <CardFooter className="p-6 bg-zinc-900/10 border-t border-zinc-900 flex justify-end gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10"
                  onClick={() => deleteDocumentNonBlocking(doc(db, 'hadith_books', book.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          {(!books || books.length === 0) && (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[2.5rem] border-2 border-dashed border-zinc-900 space-y-6">
              <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto">
                <Library className="w-10 h-10 text-zinc-800" />
              </div>
              <div className="space-y-2">
                <p className="text-zinc-500 font-medium">Registry empty.</p>
                <p className="text-xs text-zinc-700 uppercase font-black tracking-widest">Sync to begin</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
