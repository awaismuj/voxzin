import { getArticles, getCategories } from '@/lib/api';
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * llms.txt: a plain-language map of the site for AI assistants and AI search (the emerging /llms.txt convention).
 * It lists what VoxZin is, its sections and the newest articles with their links, so answers can cite the right pages.
 */
export async function GET() {
  const [categories, latest] = await Promise.all([
    getCategories().catch(() => []),
    getArticles({}).catch(() => ({ items: [] })),
  ]);
  const lines = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_TAGLINE} ${SITE_NAME} is an online news publication covering trending stories in technology, sports, cricket, entertainment and more. Articles list their sources and are written for a worldwide audience.`,
    '',
    '## Sections',
    ...categories.map((c) => `- [${c.name}](${SITE_URL}/${c.slug})${c.description ? `: ${oneLine(c.description)}` : ''}`),
    '',
    '## Latest articles',
    ...latest.items.map((a) => `- [${oneLine(a.title)}](${SITE_URL}/articles/${a.slug}): ${oneLine(a.excerpt).slice(0, 200)}`),
    '',
    '## More',
    `- [Latest stories](${SITE_URL}/latest)`,
    `- [Trending now](${SITE_URL}/trending)`,
    `- [About ${SITE_NAME}](${SITE_URL}/about)`,
    `- [RSS feed](${SITE_URL}/feed.xml)`,
    `- [Sitemap](${SITE_URL}/sitemap.xml)`,
    `- [News sitemap](${SITE_URL}/news-sitemap.xml)`,
    '',
  ];
  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=600' },
  });
}
