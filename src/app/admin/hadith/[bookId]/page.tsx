
/**
 * Redirects dynamic legacy routing to query-parameterized hub.
 * Satisfies static export requirements for output: export.
 */
export function generateStaticParams() {
  return [{ bookId: 'shell' }];
}

export default function RedundantHadithBookPage() {
  return null;
}
