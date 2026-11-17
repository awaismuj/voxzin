import type { ArticleSummary } from '@voxzin/shared';
import { getArticles } from '@/lib/api';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
const WINDOW_MS = 48 * 3_600_000; // Google News only reads articles from the last two days

/** Google News sitemap: the articles published in the last 48 hours, newest first (max 1000). */
export async function GET() {
  const cutoff = Date.now() - WINDOW_MS;
  const recent: ArticleSummary[] = [];
  for (let page = 1; page <= 10 && recent.length < 1000; page++) {
    const data = await getArticles({ page }).catch(() => null);
    if (!data || data.items.length === 0) break;
    const fresh = data.items.filter((a) => new Date(a.publishedAt).getTime() >= cutoff);
    recent.push(...fresh);
    if (fresh.length < data.items.length || page >= data.totalPages) break;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${recent
    .map(
      (a) =>
        `<url><loc>${SITE_URL}/articles/${esc(a.slug)}</loc><news:news><news:publication><news:name>${SITE_NAME}</news:name><news:language>en</news:language></news:publication><news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date><news:title>${esc(a.title)}</news:title></news:news></url>`,
    )
    .join('')}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
