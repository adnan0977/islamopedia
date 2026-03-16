
"use client";

import { Suspense } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, limit } from 'firebase/firestore';
import { QuranHub, QuranEditionDataView } from '@/features/admin/components/QuranHub';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Handles the switching logic between the Edition Grid and the Verse Table
 * using the 'editionId' query parameter.
 */
function QuranAdminContent() {
  const db = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const editionId = searchParams.get('editionId');

  // Fetch only the registry list for the hub
  const editionsQuery = useMemoFirebase(() => query(collection(db, 'quran_editions'), limit(1000)), [db]);
  const { data: editions } = useCollection(editionsQuery);

  if (editionId) {
    return (
      <QuranEditionDataView 
        editionId={editionId} 
        onBack={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete('editionId');
          router.push(`/admin/quran?${params.toString()}`);
        }} 
      />
    );
  }

  return (
    <QuranHub 
      editions={editions || []} 
    />
  );
}

export default function AdminQuranPage() {
  return (
    <div className="w-full">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-zinc-800" />
          <p className="text-zinc-600 font-medium">Initializing Quran Hub...</p>
        </div>
      }>
        <QuranAdminContent />
      </Suspense>
    </div>
  );
}
