import { getArticles } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

export async function GET() {
  const { items } = await getArticles({}).catch(() => ({ items: [] }));
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Voxzin</title><link>${SITE_URL}</link><description>The voice of today's trending stories.</description>${items
    .map((a) => `<item><title>${esc(a.title)}</title><link>${SITE_URL}/articles/${a.slug}</link><guid isPermaLink="true">${SITE_URL}/articles/${a.slug}</guid><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate><description>${esc(a.excerpt)}</description></item>`)
    .join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
