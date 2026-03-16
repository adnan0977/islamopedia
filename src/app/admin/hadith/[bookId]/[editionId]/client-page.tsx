"use client";

import { useRouter } from 'next/navigation';
import { HadithDataView } from '@/features/admin/components/HadithManager';

export function HadithDataViewPageWrapper({ bookId, editionId }: { bookId: string, editionId: string }) {
  const router = useRouter();

  return (
    <HadithDataView 
      editionId={editionId} 
      onBack={() => router.push(`/admin/hadith/${bookId}`)} 
    />
  );
}
