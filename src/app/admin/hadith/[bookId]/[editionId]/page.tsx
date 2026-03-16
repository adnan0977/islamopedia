import { HadithDataViewPageWrapper } from './client-page';

/**
 * Required for static export with dynamic routes.
 */
export function generateStaticParams() {
  return [{ bookId: 'shell', editionId: 'shell' }];
}

export default async function AdminHadithEditionDataPage({ params }: { params: Promise<{ bookId: string, editionId: string }> }) {
  const { bookId, editionId } = await params;
  return <HadithDataViewPageWrapper bookId={bookId} editionId={editionId} />;
}
