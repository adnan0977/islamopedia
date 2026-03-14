
"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { BookOpen, Loader2, ChevronRight, Hash, User, ScrollText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default function HadithPage() {
  const db = useFirestore();

  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    where('isActive', '==', true),
    orderBy('bookName', 'asc')
  ), [db]);

  const { data: books, isLoading } = useCollection(booksQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12 pb-32">
      <div className="space-y-3 text-center md:text-left">
        <h1 className="text-4xl font-headline font-bold text-zinc-100 tracking-tight">Hadith Library</h1>
        <p className="text-zinc-500 text-sm font-medium">Explore authentic collections of Prophetic traditions from primary sources.</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Opening the library...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {books?.map((book) => (
            <Link key={book.id} href={`/hadith?book=${book.id}`}>
              <Card className="bg-zinc-950 border-zinc-900 p-8 hover:border-zinc-700 transition-all group cursor-pointer h-full flex flex-col justify-between rounded-[2rem] shadow-2xl hover:shadow-zinc-500/5 relative overflow-hidden">
                <div className="space-y-6 relative z-10">
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors shadow-lg">
                      <BookOpen className="w-7 h-7 text-zinc-500" />
                    </div>
                    <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                      <Hash className="w-3 h-3 text-zinc-600" />
                      <span className="text-[10px] font-black uppercase text-zinc-500">{parseInt(book.hadiths_count).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-100 leading-tight group-hover:text-white transition-colors">{book.bookName}</h3>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <User className="w-3.5 h-3.5" />
                      <p className="text-[11px] font-bold uppercase tracking-tight">{book.writerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-600">
                    <ScrollText className="w-3.5 h-3.5" />
                    <p className="text-[10px] font-medium">{book.chapters_count} Indexed Chapters</p>
                  </div>
                </div>

                <div className="pt-6 mt-8 border-t border-zinc-900 flex items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    View Collection
                  </span>
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:bg-zinc-800 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  </div>
                </div>

                {/* Decorative background number */}
                <div className="absolute -bottom-4 -right-4 text-zinc-900/20 font-black text-8xl select-none pointer-events-none group-hover:text-zinc-900/40 transition-colors">
                  {book.id.substring(0, 2).toUpperCase()}
                </div>
              </Card>
            </Link>
          ))}
          {(!books || books.length === 0) && (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[2.5rem] border-2 border-dashed border-zinc-900 flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 bg-zinc-900/50 rounded-full flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-zinc-800" />
              </div>
              <p className="text-zinc-600 font-medium">The library is currently preparing its collections. Please check back later.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
