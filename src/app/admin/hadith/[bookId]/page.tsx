import { HadithBookDetailViewPageWrapper } from './client-page';

/**
 * Required for static export with dynamic routes.
 */
export function generateStaticParams() {
  return [{ bookId: 'shell' }];
}

export default async function AdminHadithBookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  return <HadithBookDetailViewPageWrapper bookId={bookId} />;
}
