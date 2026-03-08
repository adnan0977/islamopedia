
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Quote, 
  Search, 
  Loader2, 
  ArrowLeft, 
  BookMarked,
  FilterX,
  Languages,
  ArrowRight,
  Library,
  BookOpen
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function HadithPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);

  // 1. Fetch Books (Top Level)
  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('name', 'asc'),
    limit(100)
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  // 2. Fetch Editions for selected Book
  const editionsQuery = useMemoFirebase(() => {
    if (!selectedBookId) return null;
    return query(
      collection(db, 'hadith_editions'),
      where('bookId', '==', selectedBookId),
      where('isActive', '!=', false),
      orderBy('collectionName', 'asc')
    );
  }, [db, selectedBookId]);
  const { data: editions, isLoading: isLoadingEditions } = useCollection(editionsQuery);

  // 3. Fetch content for reader
  const contentQuery = useMemoFirebase(() => {
    if (!selectedEditionId) return null;
    return query(
      collection(db, 'hadith_data'),
      where('editionId', '==', selectedEditionId),
      orderBy('hadithnumber', 'asc'),
      limit(100)
    );
  }, [db, selectedEditionId]);
  const { data: hadiths, isLoading: isLoadingContent } = useCollection(contentQuery);

  const selectedBook = useMemo(() => 
    books?.find(b => b.id === selectedBookId), 
    [books, selectedBookId]
  );

  const selectedEdition = useMemo(() => 
    editions?.find(e => e.id === selectedEditionId), 
    [editions, selectedEditionId]
  );

  const filteredBooks = useMemo(() => {
    if (!books) return [];
    return books.filter(b => 
      b.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [books, searchTerm]);

  if (isLoadingBooks) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
        <p className="text-zinc-500 font-medium">Opening Hadith Library...</p>
      </div>
    );
  }

  const showEmptyState = !isLoadingBooks && !selectedEditionId && !selectedBookId && filteredBooks.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {(selectedBookId || selectedEditionId) ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { 
                  if (selectedEditionId) {
                    setSelectedEditionId(null);
                  } else {
                    setSelectedBookId(null);
                  }
                  setSearchTerm(''); 
                }}
                className="rounded-xl h-10 w-10 border border-zinc-900 bg-zinc-900/30 text-zinc-500 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                <Quote className="w-5 h-5 text-zinc-500 fill-zinc-500" />
              </div>
            )}
            <h1 className="text-3xl font-headline font-bold text-zinc-100">
              {selectedEdition ? selectedEdition.collectionName : selectedBook ? selectedBook.name : 'Sacred Library'}
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {selectedEdition 
              ? `${selectedEdition.title} (${selectedEdition.language})` 
              : selectedBook 
                ? `Choose a language edition for ${selectedBook.name}.`
                : 'Traditions and sayings of the Prophet Muhammad (PBUH).'}
          </p>
        </div>
      </div>

      {/* Search */}
      {!showEmptyState && (
        <div className="flex flex-col md:flex-row gap-4 bg-zinc-950/50 p-6 rounded-3xl border border-zinc-900 shadow-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <Input 
              placeholder={selectedEditionId ? "Search within collection..." : "Search for Sahih Bukhari, Muslim..."}
              className="bg-zinc-900 border-zinc-800 pl-12 rounded-2xl h-14 text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {searchTerm && (
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setSearchTerm('')} 
              className="h-14 w-14 shrink-0 rounded-2xl border-zinc-900 bg-zinc-950 text-zinc-500"
            >
              <FilterX className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {/* Discovery View (Books -> Editions) */}
      {!selectedEditionId ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {showEmptyState ? (
            <div className="col-span-full py-32 text-center bg-zinc-950/30 rounded-[2.5rem] border-2 border-dashed border-zinc-900 space-y-6">
               <BookOpen className="w-16 h-16 text-zinc-800 mx-auto" />
               <div className="space-y-2">
                 <h2 className="text-xl font-bold text-zinc-400">Your Library is Empty</h2>
                 <p className="text-zinc-600 max-w-xs mx-auto text-sm leading-relaxed">
                   Please log in to the Admin Panel and synchronize the external Hadith registry to populate this page.
                 </p>
               </div>
               <Link href="/login">
                 <Button variant="outline" className="rounded-xl border-zinc-800 text-zinc-500 hover:text-white font-bold h-11 px-8">
                   Go to Login
                 </Button>
               </Link>
            </div>
          ) : !selectedBookId ? (
            // Show Books
            filteredBooks.map((book) => (
              <Card 
                key={book.id} 
                onClick={() => setSelectedBookId(book.id)}
                className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden hover:border-zinc-700 transition-all group cursor-pointer shadow-xl flex flex-col h-full"
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                      <Library className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                    <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-black tracking-widest text-zinc-500">
                      Book
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors leading-tight">
                      {book.name}
                    </h3>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">
                      {book.editionCount || 0} Editions Available
                    </p>
                  </div>
                </div>
                
                <div className="px-8 py-6 bg-zinc-900/30 border-t border-zinc-900 flex items-center justify-between group-hover:bg-zinc-900/50 transition-colors">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Select Collection</span>
                  <ArrowRight className="w-4 h-4 text-zinc-800 group-hover:text-zinc-400 transition-all" />
                </div>
              </Card>
            ))
          ) : (
            // Show Editions for Selected Book
            isLoadingEditions ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-zinc-800" /></div>
            ) : editions?.map((edition) => (
              <Card 
                key={edition.id} 
                onClick={() => setSelectedEditionId(edition.id)}
                className="bg-zinc-950 border-zinc-900 rounded-[2rem] overflow-hidden hover:border-zinc-700 transition-all group cursor-pointer shadow-xl flex flex-col h-full"
              >
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-600 transition-colors">
                      <BookMarked className="w-6 h-6 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                    <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-black tracking-widest text-zinc-500">
                      {edition.language}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-zinc-100 group-hover:text-white transition-colors leading-tight">
                      {edition.collectionName}
                    </h3>
                    <p className="text-xs text-zinc-600 font-medium line-clamp-2 uppercase tracking-tight">
                      {edition.title}
                    </p>
                  </div>
                </div>
                
                <div className="px-8 py-6 bg-zinc-900/30 border-t border-zinc-900 flex items-center justify-between group-hover:bg-zinc-900/50 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                    <Languages className="w-3 h-3" />
                    {edition.textDirection}
                  </span>
                  <div className="flex items-center gap-2 text-zinc-800 group-hover:text-zinc-400 transition-all">
                    <span className="text-[9px] font-bold uppercase">Read</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Reader View */
        <div className="grid grid-cols-1 gap-8">
          {isLoadingContent ? (
            <div className="py-32 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-600 font-medium">Preparing scrolls...</p>
            </div>
          ) : hadiths && hadiths.length > 0 ? hadiths.map((hadith, idx) => (
            <Card key={hadith.id || idx} className="bg-zinc-950 border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
              <div className="p-8 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Hadith Number</span>
                  <p className="text-sm font-bold text-zinc-400">{hadith.hadithnumber || idx + 1}</p>
                </div>
                <Badge variant="outline" className="border-zinc-800 text-[10px] text-zinc-600 uppercase font-black">{selectedEdition?.language}</Badge>
              </div>
              <CardContent className="p-8 md:p-12 space-y-10">
                <p className="text-right text-3xl md:text-4xl font-arabic leading-[2.2] text-zinc-100" dir="rtl">
                  {hadith.text}
                </p>
                {hadith.text_en && (
                  <div className="border-l-4 border-zinc-800 pl-8 py-4">
                    <p className="text-lg md:text-xl text-zinc-400 font-medium leading-relaxed italic">
                      "{hadith.text_en}"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <div className="py-32 text-center bg-zinc-950/30 rounded-[2.5rem] border-2 border-dashed border-zinc-900">
               <p className="text-zinc-600 font-medium">No content found for this edition.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
