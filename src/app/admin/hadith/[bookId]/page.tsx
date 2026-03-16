import { HadithBookDetailViewPageWrapper } from './client-page';

/**
 * Required for static export with dynamic routes.
 * We pre-generate paths for primary Hadith collections.
 */
export function generateStaticParams() {
  const books = [
    'shell',
    'sahih-bukhari', 
    'sahih-muslim', 
    'al-tirmidhi', 
    'abu-dawood', 
    'ibn-e-majah', 
    'sunan-nasai', 
    'mishkat', 
    'musnad-ahmad'
  ];
  return books.map(bookId => ({ bookId }));
}

export default async function AdminHadithBookDetailPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;
  return <HadithBookDetailViewPageWrapper bookId={bookId} />;
}
