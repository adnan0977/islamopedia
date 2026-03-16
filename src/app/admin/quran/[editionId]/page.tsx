
import { QuranEditionDataViewPageWrapper } from './client-page';

/**
 * Required for static export with dynamic routes.
 * We pre-generate paths for the most common editions to satisfy Next.js build requirements.
 */
export function generateStaticParams() {
  return [
    { editionId: 'shell' },
    { editionId: 'quran-uthmani' },
    { editionId: 'en.sahih' },
    { editionId: 'ur.ahmedali' },
    { editionId: 'ur.jalandhry' }
  ];
}

export default async function AdminQuranEditionDataPage({ params }: { params: Promise<{ editionId: string }> }) {
  const { editionId } = await params;
  return <QuranEditionDataViewPageWrapper editionId={editionId} />;
}
