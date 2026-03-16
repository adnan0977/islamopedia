
/**
 * Satisfies static export requirements for output: export.
 * Administrative logic has been moved to search parameters at /admin/quran/page.tsx
 */
export function generateStaticParams() {
  return [
    { editionId: 'shell' },
    { editionId: 'quran-uthmani' },
    { editionId: 'en.sahih' }
  ];
}

export default function RedundantDynamicEditionPage() {
  return null;
}
