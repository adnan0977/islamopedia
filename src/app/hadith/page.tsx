"use client";

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { 
  BookOpen, 
  Loader2, 
  ChevronRight, 
  ArrowLeft,
  Search,
  Library,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function HadithPage() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const activeBookId = searchParams.get('book');
  const activeChapterId = searchParams.get('chapter');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'urdu'>('english');

  // Query 1: All Books for the directory
  const booksQuery = useMemoFirebase(() => query(
    collection(db, 'hadith_books'),
    orderBy('orderKey', 'asc')
  ), [db]);
  const { data: books, isLoading: isLoadingBooks } = useCollection(booksQuery);

  // Query 2: All Indices for the active book (Arabic + Translations)
  const indexQuery = useMemoFirebase(() => (activeBookId ? query(
    collection(db, 'hadith_index'),
    where('bookSlug', '==', activeBookId)
  ) : null), [db, activeBookId]);
  const { data: indices, isLoading: isLoadingIndices } = useCollection(indexQuery);

  // Query 3: Records for the active chapter (Fetches all language shards for this chapter)
  const recordsQuery = useMemoFirebase(() => (activeBookId && activeChapterId ? query(
    collection(db, 'hadith_data'),
    where('bookSlug', '==', activeBookId),
    where('chapterId', '==', activeChapterId),
    limit(300)
  ) : null), [db, activeBookId, activeChapterId]);
  const { data: allRecords, isLoading: isLoadingRecords } = useCollection(recordsQuery);

  // Merge Arabic and Selected Translation indices
  const bilingualChapters = useMemo(() => {
    if (!indices) return [];
    const arabicIdx = indices.find(i => i.id.endsWith('_arabic'));
    const transIdx = indices.find(i => i.id.endsWith(`_${selectedLanguage}`));
    
    const fallbackTransIdx = indices.find(i => !i.id.endsWith('_arabic')) || transIdx;
    
    const sections = arabicIdx?.sections || {};
    return Object.keys(sections).map(num => ({
      number: num,
      arabicName: sections[num],
      translationName: (fallbackTransIdx?.sections || {})[num] || (transIdx?.sections || {})[num] || `Chapter ${num}`
    })).sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
  }, [indices, selectedLanguage]);

  // Group records by hadithNumber to show Arabic + Translation paired
  const groupedRecords = useMemo(() => {
    if (!allRecords) return [];
    const groups: Record<string, any> = {};
    
    allRecords.forEach(r => {
      const num = r.hadithNumber;
      if (!groups[num]) groups[num] = { num, arabic: null, translation: null };
      
      if (r.editionId.endsWith('_arabic')) {
        groups[num].arabic = r;
      } else if (r.editionId.endsWith(`_${selectedLanguage}`)) {
        groups[num].translation = r;
      }
    });

    return Object.values(groups).sort((a, b) => parseFloat(a.num) - parseFloat(b.num));
  }, [allRecords, selectedLanguage]);

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/hadith?${nextParams.toString()}`);
  };

  if (isLoadingBooks || isLoadingIndices || (activeChapterId && isLoadingRecords)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <Loader2 className="h-12 w-12 animate-spin text-zinc-900" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Opening Library Node...</p>
      </div>
    );
  }

  // View 3: Hadith Reader (Paired View)
  if (activeBookId && activeChapterId) {
    const book = books?.find(b => b.id === activeBookId);

    return (
      <div className="container mx-auto px-4 py-12 space-y-12 max-w-5xl pb-32 lg:pb-12 animate-in fade-in duration-700">
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 pb-8 border-b">
          <div className="flex items-center gap-6">
            <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-zinc-200 shadow-sm" onClick={() => navigateTo({ chapter: null })}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{book?.bookName}</h1>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Record Set • Chapter {activeChapterId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 p-1 rounded-xl border border-zinc-100">
            <Button 
              variant={selectedLanguage === 'english' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-8 px-4 rounded-lg font-bold text-[9px] uppercase tracking-widest", selectedLanguage === 'english' && "bg-zinc-900 text-white shadow-md")}
              onClick={() => setSelectedLanguage('english')}
            >
              English
            </Button>
            <Button 
              variant={selectedLanguage === 'urdu' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-8 px-4 rounded-lg font-bold text-[9px] uppercase tracking-widest", selectedLanguage === 'urdu' && "bg-zinc-900 text-white shadow-md")}
              onClick={() => setSelectedLanguage('urdu')}
            >
              Urdu
            </Button>
          </div>
        </header>

        <div className="space-y-12">
          {groupedRecords.map((group) => {
            const r = group.arabic || group.translation;
            if (!r) return null;

            return (
              <Card key={group.num} className="border-none bg-white shadow-xl rounded-[2.5rem] overflow-hidden group hover:ring-1 hover:ring-zinc-200 transition-all">
                <CardHeader className="p-8 pb-4 border-b border-zinc-50 bg-zinc-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-white border border-zinc-200 rounded-xl flex items-center justify-center font-bold text-[10px] text-zinc-400 shadow-sm">
                        #{group.num}
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase tracking-widest border-zinc-100 py-0.5",
                        (r.status || '').toLowerCase().includes('sahih') ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-zinc-400"
                      )}>
                        {r.status || 'Verified'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 sm:p-12 space-y-12">
                  {group.arabic && (
                    <div className="space-y-8">
                      {group.arabic.narrator_text && (
                        <div className="flex flex-col gap-2 text-right">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300">السند</span>
                          <p className="text-sm font-arabic text-zinc-500 italic leading-relaxed" dir="rtl">{group.arabic.narrator_text}</p>
                        </div>
                      )}
                      <p className="text-right font-arabic leading-[2.5] text-zinc-900 text-3xl sm:text-4xl" dir="rtl">
                        {group.arabic.hadith_text}
                      </p>
                    </div>
                  )}

                  {group.translation && (
                    <div className="space-y-6 pt-10 border-t border-dashed border-zinc-100">
                      {group.translation.narrator_text && (
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-300 flex items-center gap-2">
                            <Info className="w-3 h-3" /> Narrated By
                          </span>
                          <p className="text-sm font-bold text-zinc-500 italic leading-relaxed">{group.translation.narrator_text}</p>
                        </div>
                      )}
                      <p className="text-lg font-medium text-zinc-700 leading-relaxed text-justify">
                        {group.translation.hadith_text}
                      </p>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-8 pt-0 border-t border-zinc-50 bg-zinc-50/10 flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Ref: {activeBookId}:{group.num}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Share</Button>
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900">Cite</Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => toast({ title: "Reference Flagged", description: `Record ${activeBookId}:${group.num} has been submitted for review.` })}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1.5" />
                      Report Error
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // View 2: Bilingual Index
  if (activeBookId) {
    const book = books?.find(b => b.id === activeBookId);
    return (
      <div className="container mx-auto px-4 py-12 space-y-12 max-w-6xl pb-32 lg:pb-12 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row items-center justify-between gap-8 pb-10 border-b">
          <div className="flex items-center gap-6">
            <Button variant="outline" size="icon" className="rounded-2xl h-14 w-14 border-zinc-200 shadow-sm" onClick={() => navigateTo({ book: null })}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{book?.bookName}</h1>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Bilingual Structural Index</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100 shadow-inner">
            <Button 
              variant={selectedLanguage === 'english' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest", selectedLanguage === 'english' && "bg-zinc-900 text-white shadow-lg")}
              onClick={() => setSelectedLanguage('english')}
            >
              English
            </Button>
            <Button 
              variant={selectedLanguage === 'urdu' ? 'default' : 'ghost'} 
              size="sm" 
              className={cn("h-10 px-6 rounded-xl font-bold text-[10px] uppercase tracking-widest", selectedLanguage === 'urdu' && "bg-zinc-900 text-white shadow-lg")}
              onClick={() => setSelectedLanguage('urdu')}
            >
              Urdu
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bilingualChapters.map((ch) => (
            <Card 
              key={ch.number} 
              className="group cursor-pointer border-none bg-white shadow-sm ring-1 ring-zinc-100 hover:ring-zinc-900 hover:shadow-2xl transition-all duration-500 rounded-[2rem] overflow-hidden"
              onClick={() => navigateTo({ chapter: ch.number })}
            >
              <CardContent className="p-8 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                  <div className="h-10 w-10 bg-zinc-50 border border-zinc-100 rounded-xl flex items-center justify-center font-black text-xs text-zinc-400 group-hover:bg-zinc-900 group-hover:text-white transition-all shadow-inner">
                    {ch.number}
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-200 group-hover:text-zinc-900 group-hover:translate-x-1 transition-all" />
                </div>
                
                <div className="space-y-4">
                  <div className="text-right">
                    <h3 className="font-arabic text-xl text-zinc-900 leading-relaxed truncate" dir="rtl">{ch.arabicName}</h3>
                  </div>
                  <div className="pt-4 border-t border-dashed border-zinc-100">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest line-clamp-2 leading-relaxed">
                      {ch.translationName}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // View 1: Books Directory
  return (
    <div className="container mx-auto px-4 py-12 space-y-16 max-w-7xl pb-32 lg:pb-16 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-xl">
              <Library className="h-8 w-8" />
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-zinc-900">Hadith Library</h1>
          </div>
          <p className="text-zinc-500 max-w-2xl text-lg font-medium leading-relaxed">Authentic collections of Prophetic traditions from verified primary sources, indexed for spiritual research.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-300" />
          <Input placeholder="Search collections..." className="pl-14 rounded-[1.5rem] bg-zinc-50 border-zinc-100 h-16 font-bold text-base focus-visible:ring-zinc-900 shadow-inner" />
        </div>
      </div>

      <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {books?.map((book) => (
          <Card 
            key={book.id} 
            className="aspect-square group cursor-pointer border-none bg-zinc-50/50 transition-all hover:bg-white hover:ring-1 hover:ring-zinc-900 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center p-8 text-center rounded-[3rem] relative overflow-hidden shadow-inner" 
            onClick={() => navigateTo({ book: book.id })}
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 bg-white rounded-[2rem] flex items-center justify-center border border-zinc-100 shadow-sm group-hover:scale-110 group-hover:border-zinc-900/10 transition-all duration-700 mb-6 sm:mb-8">
              <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 text-zinc-900" />
            </div>
            <h3 className="text-xs sm:text-sm font-black tracking-tight line-clamp-2 leading-tight px-2 group-hover:text-zinc-900 transition-colors uppercase">
              {book.bookName}
            </h3>
            
            <div className="mt-4 sm:mt-6 px-4 py-1.5 bg-white rounded-full border border-zinc-100 shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                {book.totalHadiths?.toLocaleString() || '---'} Shards
              </span>
            </div>

            <div className="absolute top-6 right-6">
               <ChevronRight className="h-5 w-5 text-zinc-200 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
