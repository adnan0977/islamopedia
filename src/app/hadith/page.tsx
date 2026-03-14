
"use client";

import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { 
  BookOpen, 
  Loader2, 
  ChevronRight, 
  Hash, 
  User, 
  ScrollText, 
  ArrowLeft,
  Languages,
  ListOrdered
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export default function HadithPage() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeBookId = searchParams.get('book');
  const activeEditionId = searchParams.get('edition');

  // --- 1. Books View ---
  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    where('isActive', '==', true)
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  // --- 2. Editions View ---
  const editionsQuery = useMemoFirebase(() => (activeBookId ? query(
    collection(db, 'hadith_editions'),
    where('bookId', '==', activeBookId)
  ) : null), [db, activeBookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  // --- 3. Metadata Index View ---
  const metaRef = useMemoFirebase(() => (activeEditionId ? doc(db, 'hadith_metadata', activeEditionId) : null), [db, activeEditionId]);
  const { data: metaData, isLoading: isLoadingMeta } = useDoc(metaRef);

  // Fetch Arabic Metadata for dual-language titles if we are viewing a translation
  const arabicMetaRef = useMemoFirebase(() => {
    if (!activeBookId || !activeEditionId) return null;
    // We assume Arabic metadata is stored under editionId 'arabic-[bookId]' or similar
    // For now, we'll try to find an edition from the same book that has language 'Arabic'
    const arabicEdition = editions?.find(e => e.language === 'Arabic');
    return arabicEdition ? doc(db, 'hadith_metadata', arabicEdition.id) : null;
  }, [db, activeBookId, activeEditionId, editions]);
  const { data: arabicMetaData } = useDoc(arabicMetaRef);

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/hadith?${nextParams.toString()}`);
  };

  const handleBack = () => {
    if (activeEditionId) navigateTo({ edition: null });
    else if (activeBookId) navigateTo({ book: null });
    else router.push('/');
  };

  // --- Renders ---

  if (isLoadingBooks || isLoadingEditions || isLoadingMeta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
        <p className="text-zinc-600 font-medium">Loading library...</p>
      </div>
    );
  }

  // View 3: Chapter Index (Metadata)
  if (activeEditionId) {
    const chapters = metaData?.metadata?.sections || [];
    const arabicChapters = arabicMetaData?.metadata?.sections || [];

    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10 pb-32">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold text-white">Chapter Index</h1>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">{activeEditionId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {chapters.map((ch: any, idx: number) => {
            const arabicTitle = arabicChapters[idx]?.title || "";
            return (
              <Card key={idx} className="bg-zinc-950 border-zinc-900 p-6 hover:border-zinc-700 transition-all group cursor-pointer rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors shrink-0">
                    <span className="text-xs font-black text-zinc-500">{ch.id || idx + 1}</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-100 group-hover:text-white transition-colors">{ch.title}</h3>
                    {arabicTitle && (
                      <p className="text-xl font-arabic text-zinc-500 group-hover:text-zinc-300 transition-colors" dir="rtl">{arabicTitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-zinc-900 pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Hadiths</span>
                    <span className="text-sm font-bold text-zinc-400">{ch.hadith_range || 'N/A'}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </Card>
            );
          })}
          {chapters.length === 0 && (
            <div className="py-20 text-center bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-900">
              <ScrollText className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600">No chapter metadata found for this edition.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View 2: Editions List
  if (activeBookId) {
    const book = books?.find(b => b.id === activeBookId);
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10 pb-32">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-xl border border-zinc-900 bg-zinc-950 text-zinc-500 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold text-white">{book?.bookName}</h1>
            <p className="text-zinc-500 text-sm">Select a language edition to explore Prophetic traditions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {editions?.map((ed) => (
            <Card key={ed.id} onClick={() => navigateTo({ edition: ed.id })} className="bg-zinc-950 border-zinc-900 p-8 hover:border-zinc-700 transition-all group cursor-pointer rounded-[2rem] shadow-2xl relative overflow-hidden">
              <div className="space-y-6 relative z-10">
                <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                  <Languages className="w-7 h-7 text-zinc-500" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors">{ed.language} Edition</h3>
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{ed.editionName}</p>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-zinc-900">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">Enter Edition</span>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {(!editions || editions.length === 0) && (
            <div className="col-span-full py-20 text-center bg-zinc-950/30 rounded-[2rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-4">
              <Languages className="w-12 h-12 text-zinc-800" />
              <p className="text-zinc-600 font-medium">No editions found for this book.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // View 1: Books Directory (Grid)
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 pb-32">
      <div className="space-y-3 text-center md:text-left">
        <h1 className="text-4xl font-headline font-bold text-zinc-100 tracking-tight">Hadith Library</h1>
        <p className="text-zinc-500 text-sm font-medium">Authentic collections of Prophetic traditions from primary sources.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {books?.map((book) => (
          <Card 
            key={book.id} 
            onClick={() => navigateTo({ book: book.id })} 
            className="bg-zinc-950 border-zinc-900 p-5 md:p-8 hover:border-zinc-700 transition-all group cursor-pointer h-full flex flex-col justify-between rounded-[1.5rem] md:rounded-[2rem] shadow-2xl relative overflow-hidden"
          >
            <div className="space-y-4 md:space-y-6 relative z-10">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-zinc-900 rounded-xl md:rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                  <BookOpen className="w-5 h-5 md:w-7 md:h-7 text-zinc-500" />
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-900 px-2 md:px-3 py-1 rounded-full border border-zinc-800">
                  <Hash className="w-2.5 h-2.5 md:w-3 md:h-3 text-zinc-600" />
                  <span className="text-[8px] md:text-[10px] font-black uppercase text-zinc-500">{parseInt(book.hadiths_count || '0').toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-1 md:space-y-2">
                <h3 className="text-sm md:text-xl font-bold text-zinc-100 leading-tight group-hover:text-white transition-colors line-clamp-2">{book.bookName}</h3>
                <div className="flex items-center gap-2 text-zinc-500">
                  <User className="w-3 md:w-3.5 h-3 md:h-3.5" />
                  <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-tight truncate">{book.writerName}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 md:pt-6 mt-4 md:mt-8 border-t border-zinc-900 flex items-center justify-between relative z-10">
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                Explore
              </span>
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:translate-x-1 transition-all">
                <ChevronRight className="w-3 md:w-4 h-3 md:h-4 text-zinc-500" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
