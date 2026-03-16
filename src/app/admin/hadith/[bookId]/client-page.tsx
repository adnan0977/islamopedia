"use client";

import { useRouter } from 'next/navigation';
import { HadithBookDetailView } from '@/features/admin/components/HadithManager';

export function HadithBookDetailViewPageWrapper({ bookId }: { bookId: string }) {
  const router = useRouter();

  return (
    <HadithBookDetailView 
      bookId={bookId} 
      onBack={() => router.push('/admin/hadith')} 
      onSelectEdition={(editionId) => router.push(`/admin/hadith/${bookId}/${editionId}`)} 
    />
  );
}
