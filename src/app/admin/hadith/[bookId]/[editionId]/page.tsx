"use client";

import { useParams, useRouter } from 'next/navigation';
import { HadithDataView } from '@/features/admin/components/HadithManager';

/**
 * Required for static export with dynamic routes.
 * Provides a shell parameter for build-time generation.
 */
export function generateStaticParams() {
  return [{ bookId: 'shell', editionId: 'shell' }];
}

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
