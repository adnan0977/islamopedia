
"use client";

import { Suspense } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { HadithManager, HadithBookDetailView, HadithDataView, HadithChapterRecordsView } from '@/features/admin/components/HadithManager';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Handles the hierarchical switching logic for Hadith management:
 * 1. Book Registry (Default)
 * 2. Edition Grid (when bookId is present)
 * 3. Chapter Grid (when both bookId and editionId are present)
 * 4. Records Table (when bookId, editionId, and chapterId are present)
 */
function HadithAdminContent() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const bookId = searchParams.get('bookId');
  const editionId = searchParams.get('editionId');
  const chapterId = searchParams.get('chapterId');

  const navigateTo = (params: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    router.push(`/admin/hadith?${nextParams.toString()}`);
  };

  // Level 4: Granular Record Inspector
  if (bookId && editionId && chapterId) {
    return (
      <HadithChapterRecordsView 
        bookId={bookId}
        editionId={editionId}
        chapterId={chapterId}
        onBack={() => navigateTo({ chapterId: null })}
      />
    );
  }

  // Level 3: Chapter Grid
  if (bookId && editionId) {
    return (
      <HadithDataView 
        editionId={editionId} 
        onBack={() => navigateTo({ editionId: null })} 
        onViewChapter={(id) => navigateTo({ chapterId: id })}
      />
    );
  }

  // Level 2: Book Edition Directory
  if (bookId) {
    return (
      <HadithBookDetailView 
        bookId={bookId} 
        onBack={() => navigateTo({ bookId: null })} 
        onSelectEdition={(id) => navigateTo({ editionId: id })} 
      />
    );
  }

  // Level 1: Primary Book Registry
  return (
    <HadithManager />
  );
}

export default function AdminHadithHubPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-900" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Opening Hadith Studio...</p>
        </div>
      }>
        <HadithAdminContent />
      </Suspense>
    </div>
  );
}
