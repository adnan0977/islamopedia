"use client";

import { useParams, useRouter } from 'next/navigation';
import { QuranEditionDataView } from '@/features/admin/components/QuranHub';

/**
 * Required for static export with dynamic routes.
 * Provides a shell parameter for build-time generation.
 */
export function generateStaticParams() {
  return [{ editionId: 'shell' }];
}

export default function AdminQuranEditionDataPage() {
  const params = useParams();
  const router = useRouter();
  const editionId = params.editionId as string;

  return (
    <QuranEditionDataView 
      editionId={editionId} 
      onBack={() => router.push('/admin/quran')} 
    />
  );
}
