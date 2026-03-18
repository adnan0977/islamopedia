"use client";

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, orderBy } from 'firebase/firestore';
import { 
  BookOpen, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  Languages,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Opening Library...</p>
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
            <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateTo({ edition: null })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{book?.bookName}</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Index • {indexDoc?.name}</p>
            </div>
          </div>
          <Badge variant="secondary" className="px-4 py-1 rounded-full uppercase text-[10px] font-black tracking-widest">
            {sortedChapters.length} Chapters
          </Badge>
        </header>

        <div className="grid gap-3">
          {sortedChapters.map((ch) => (
            <Card key={ch.chapterNumber} className="group cursor-pointer border-none bg-muted/30 hover:bg-muted/50 transition-all">
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 bg-background border rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm group-hover:border-primary group-hover:text-primary transition-all">
                    {ch.chapterNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{ch.chapterName}</h3>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-all" />
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
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl pb-32 lg:pb-8">
        <header className="flex items-center gap-4 pb-6 border-b">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigateTo({ book: null })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{book?.bookName}</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Select Translation</p>
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {editions?.map((ed) => (
            <Card key={ed.id} className="group cursor-pointer border-none bg-muted/30 hover:bg-primary hover:text-primary-foreground transition-all duration-500" onClick={() => navigateTo({ edition: ed.id })}>
              <CardHeader>
                <Languages className="h-8 w-8 mb-2 group-hover:text-primary-foreground text-primary transition-colors" />
                <CardTitle className="text-xl font-bold">{ed.language}</CardTitle>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-60">{ed.author || ed.name}</p>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button variant="secondary" className="w-full rounded-full font-bold text-xs uppercase group-hover:bg-white group-hover:text-primary">
                  Read Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // View 1: Books Directory
  return (
    <div className="container mx-auto px-4 py-12 space-y-12 max-w-7xl pb-32 lg:pb-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">Hadith Library</h1>
          <p className="text-muted-foreground max-w-2xl text-lg">Authentic collections of Prophetic traditions from verified primary sources.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search collections..." className="pl-10 rounded-full bg-muted/50 border-none h-12" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {books?.map((book) => (
          <Card key={book.id} className="group cursor-pointer border-none bg-muted/30 shadow-sm transition-all hover:shadow-xl hover:bg-muted/50 hover:ring-1 hover:ring-primary overflow-hidden" onClick={() => navigateTo({ book: book.id })}>
            <CardHeader className="relative h-32 flex flex-row items-start justify-between p-6">
              <div className="h-14 w-14 bg-background rounded-[1.25rem] flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-500">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-8 space-y-4">
              <h3 className="text-xl font-bold tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">{book.bookName}</h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}