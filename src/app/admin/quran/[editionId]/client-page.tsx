"use client";

import { useRouter } from 'next/navigation';
import { QuranEditionDataView } from '@/features/admin/components/QuranHub';

export function QuranEditionDataViewPageWrapper({ editionId }: { editionId: string }) {
  const router = useRouter();
  
  return (
    <QuranEditionDataView 
      editionId={editionId} 
      onBack={() => router.push('/admin/quran')} 
    />
  );
}
