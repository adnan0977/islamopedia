
/**
 * Satisfier for static export. 
 * Since we moved to query params for the watch page, 
 * this dynamic route is no longer used but must be valid for the build.
 */
export function generateStaticParams() {
  return [];
}

export default function Page() {
  return null;
}
