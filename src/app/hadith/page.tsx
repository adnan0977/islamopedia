"use client";

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { 
  BookOpen, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  Languages,
  Search,
  Library
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function HadithPage() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeBookId = searchParams.get('book');
  const activeEditionId = searchParams.get('edition');

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('bookName', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  const editionsQuery = useMemoFirebase(() => (activeBookId ? query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', activeBookId)
  ) : null), [db, activeBookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  const indexDocRef = useMemoFirebase(() => (activeEditionId ? doc(db, 'hadith_index', activeEditionId) : null), [db, activeEditionId]);
  const { data: indexDoc, isLoading: isLoadingIndex } = useDoc(indexDocRef);

  const sortedChapters = useMemo(() => {
    if (!indexDoc?.sections) return [];
    return Object.entries(indexDoc.sections).map(([num, name]) => ({
      chapterNumber: num,
      chapterName: name as string
    })).sort((a, b) => parseInt(a.chapterNumber) - parseInt(b.chapterNumber));
  }, [indexDoc]);

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/hadith?${nextParams.toString()}`);
  };

  if (isLoadingBooks || isLoadingEditions || isLoadingIndex) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Opening Library...</p>
      </div>
    );
  }

  // View 3: Chapter Index
  if (activeEditionId) {
    const book = books?.find(b => b.id === activeBookId);
    return (
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl pb-32 lg:pb-8">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 pb-6 border-b">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-muted" onClick={() => navigateTo({ edition: null })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{book?.bookName}</h1>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Index • {indexDoc?.name}</p>
            </div>
          </div>
          <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase text-[9px] font-black tracking-widest bg-muted/50 border-none">
            {sortedChapters.length} Chapters
          </Badge>
        </header>

        <div className="grid gap-3">
          {sortedChapters.map((ch) => (
            <Card key={ch.chapterNumber} className="group cursor-pointer border-none bg-muted/20 hover:bg-muted/40 transition-all rounded-2xl overflow-hidden">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="h-10 w-10 bg-background border rounded-xl flex items-center justify-center font-bold text-xs shadow-sm group-hover:border-primary group-hover:text-primary transition-all">
                    {ch.chapterNumber}
                  </div>
                  <h3 className="font-bold text-sm leading-tight group-hover:text-primary transition-colors">{ch.chapterName}</h3>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // View 2: Editions List
  if (activeBookId) {
    const book = books?.find(b => b.id === activeBookId);
    return (
      <div className="container mx-auto px-4 py-8 space-y-10 max-w-5xl pb-32 lg:pb-8">
        <header className="flex items-center gap-4 pb-6 border-b">
          <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-muted" onClick={() => navigateTo({ book: null })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{book?.bookName}</h1>
            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-[0.2em]">Select Translation</p>
          </div>
        </header>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {editions?.map((ed) => (
            <Card key={ed.id} className="group cursor-pointer border-none bg-muted/20 hover:bg-primary hover:text-primary-foreground transition-all duration-500 rounded-[2rem] overflow-hidden" onClick={() => navigateTo({ edition: ed.id })}>
              <CardHeader className="p-8">
                <div className="h-12 w-12 bg-background rounded-2xl flex items-center justify-center border shadow-sm mb-4 group-hover:bg-white/10 group-hover:border-white/20 transition-all">
                  <Languages className="h-6 w-6 text-primary group-hover:text-white" />
                </div>
                <CardTitle className="text-xl font-bold">{ed.language}</CardTitle>
                <p className="text-[9px] uppercase font-black tracking-widest opacity-60 mt-1">{ed.author || ed.name}</p>
              </CardHeader>
              <CardFooter className="p-8 pt-0">
                <Button variant="secondary" className="w-full rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest group-hover:bg-white group-hover:text-primary transition-colors">
                  Read Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // View 1: Books Directory (Square Grid)
  return (
    <div className="container mx-auto px-4 py-12 space-y-12 max-w-7xl pb-32 lg:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary text-primary-foreground rounded-xl">
              <Library className="h-6 w-6" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Hadith Library</h1>
          </div>
          <p className="text-muted-foreground max-w-2xl text-lg font-medium leading-relaxed">Authentic collections of Prophetic traditions from verified primary sources.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input placeholder="Search collections..." className="pl-12 rounded-2xl bg-muted/30 border-none h-14 font-bold text-sm focus-visible:ring-primary" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books?.map((book) => (
          <Card 
            key={book.id} 
            className="aspect-square group cursor-pointer border-none bg-muted/10 transition-all hover:bg-muted/20 hover:ring-1 hover:ring-primary/50 flex flex-col items-center justify-center p-6 text-center rounded-[2.5rem] relative overflow-hidden" 
            onClick={() => navigateTo({ book: book.id })}
          >
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-background rounded-2xl sm:rounded-3xl flex items-center justify-center border border-muted shadow-sm group-hover:scale-110 group-hover:border-primary/20 transition-all duration-700 mb-4 sm:mb-6">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold tracking-tight line-clamp-2 leading-tight px-2 group-hover:text-primary transition-colors">
              {book.bookName}
            </h3>
            
            <div className="mt-2 sm:mt-3 px-3 py-1 bg-background/50 rounded-full border border-muted/50">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                {book.totalHadiths?.toLocaleString() || '---'} Hadiths
              </span>
            </div>

            <div className="absolute top-4 right-4">
               <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
