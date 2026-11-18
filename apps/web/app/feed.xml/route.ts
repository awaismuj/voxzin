import { getArticles } from '@/lib/api';
import { absoluteUrl, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export async function GET() {
  const { items } = await getArticles({}).catch(() => ({ items: [] }));
  const newest = items[0] ? new Date(items[0].publishedAt) : new Date();
  const entries = items
    .map((a) => {
      const link = `${SITE_URL}/articles/${a.slug}`;
      const image = a.image ? absoluteUrl(a.image.url) : null;
      return `<item><title>${esc(a.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate><category>${esc(a.category.name)}</category><description>${esc(a.excerpt)}</description>${image ? `<media:content url="${esc(image)}" medium="image"/>` : ''}</item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${SITE_NAME}</title><link>${SITE_URL}</link><description>${esc(SITE_TAGLINE)}</description><language>en</language><lastBuildDate>${newest.toUTCString()}</lastBuildDate><atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/><image><url>${SITE_URL}/brand/mark-512.png</url><title>${SITE_NAME}</title><link>${SITE_URL}</link></image>${entries}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' } });
}
