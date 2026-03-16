
"use client";

import { useParams, useRouter } from 'next/navigation';
import { HadithBookDetailView } from '@/features/admin/components/HadithManager';

export default function AdminHadithBookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  return (
    <HadithBookDetailView 
      bookId={bookId} 
      onBack={() => router.push('/admin/hadith')} 
      onSelectEdition={(editionId) => router.push(`/admin/hadith/${bookId}/${editionId}`)} 
    />
  );
}
