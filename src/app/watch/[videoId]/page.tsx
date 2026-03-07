
/**
 * Redundant dynamic route. All navigation is handled via /watch?v=...
 * Retained with minimal content to satisfy potential static export requirements.
 */
export function generateStaticParams() {
  return [{ videoId: 'shell' }];
}

export default function RedundantWatchPage() {
  return null;
}
