import { QuranEditionDataView } from '@/features/admin/components/QuranHub';
import { useRouter } from 'next/navigation';

/**
 * Required for static export with dynamic routes.
 */
export function generateStaticParams() {
  return [{ editionId: 'shell' }];
}

/**
 * Client-side navigation wrapper.
 */
function NavigationWrapper({ editionId }: { editionId: string }) {
  // We use a small inline component to handle the 'use router' requirement
  // as the parent Page is now a server component.
  return <QuranEditionDataViewPageWrapper editionId={editionId} />;
}

import { QuranEditionDataViewPageWrapper } from './client-page';

export default async function AdminQuranEditionDataPage({ params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params;
  return <QuranEditionDataViewPageWrapper editionId={editionId} />;
}
