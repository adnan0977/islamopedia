
/**
 * Satisfier for static export. 
 * Since we moved to query params for the watch page, 
 * this dynamic route is no longer used but must be valid for the build.
 */
export function generateStaticParams() {
  // We provide a dummy param to satisfy the build process for output: export
  return [{ videoId: 'initial' }];
}

export default function Page() {
  // This page is a fallback. Real navigation goes to /watch?v=...
  return null;
}
