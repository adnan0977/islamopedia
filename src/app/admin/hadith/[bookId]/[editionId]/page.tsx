
import { HadithDataViewPageWrapper } from './client-page';

/**
 * Required for static export with dynamic routes.
 * Generates combined parameters for book and language edition pairs.
 */
export function generateStaticParams() {
  const commonPairs = [
    { bookId: 'shell', editionId: 'shell' },
    { bookId: 'sahih-bukhari', editionId: 'sahih-bukhari-english' },
    { bookId: 'sahih-bukhari', editionId: 'sahih-bukhari-urdu' },
    { bookId: 'sahih-muslim', editionId: 'sahih-muslim-english' },
    { bookId: 'sahih-muslim', editionId: 'sahih-muslim-urdu' }
  ];
  return commonPairs;
}

export default async function AdminHadithEditionDataPage({ params }: { params: Promise<{ bookId: string, editionId: string }> }) {
  const { bookId, editionId } = await params;
  return <HadithDataViewPageWrapper bookId={bookId} editionId={editionId} />;
}
