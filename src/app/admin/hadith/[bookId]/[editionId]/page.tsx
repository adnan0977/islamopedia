
"use client";

import { useParams, useRouter } from 'next/navigation';
import { HadithDataView } from '@/features/admin/components/HadithManager';

export default function AdminHadithEditionDataPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const editionId = params.editionId as string;

  return (
    <HadithDataView 
      editionId={editionId} 
      onBack={() => router.push(`/admin/hadith/${bookId}`)} 
    />
  );
}
