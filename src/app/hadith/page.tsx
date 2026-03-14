
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { BookOpen, Loader2, ChevronRight, Hash } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function HadithPage() {
  const db = useFirestore();

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    where('isActive', '==', true),
    orderBy('collectionName', 'asc')
  ), [db]);

  const { data: books, isLoading } = useCollection(booksQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12 pb-32">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold text-zinc-100">Hadith Library</h1>
        <p className="text-zinc-500 text-sm">Explore collections of authentic Prophetic traditions.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Loading library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {books?.map((book) => (
            <Link key={book.id} href={`/hadith?book=${book.id}`}>
              <Card className="bg-zinc-950 border-zinc-900 p-5 hover:border-zinc-700 transition-all group cursor-pointer h-full flex flex-col justify-between rounded-2xl shadow-xl">
                <div className="space-y-4">
                  <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                    <BookOpen className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-zinc-200 leading-tight line-clamp-2">{book.collectionName}</h3>
                    <p className="text-[10px] text-zinc-600 font-arabic truncate">{book.arabicName}</p>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-zinc-600 flex items-center gap-1">
                    <Hash className="w-2.5 h-2.5" />
                    {book.hadithCount?.toLocaleString() || 0}
                  </span>
                  <ChevronRight className="w-3 h-3 text-zinc-800 group-hover:text-zinc-400 transition-colors" />
                </div>
              </Card>
            </Link>
          ))}
          {(!books || books.length === 0) && (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-3xl border-2 border-dashed border-zinc-900">
              <BookOpen className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600 font-medium">The library is currently being prepared. Please check back soon.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
