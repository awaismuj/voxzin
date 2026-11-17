import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Everything public is open to search engines AND AI assistants/search (ChatGPT, Perplexity, Claude, Gemini, Copilot, Apple),
// so VoxZin can be found, quoted and linked there. Only the admin area, the raw API and internal search pages are closed.
// Uploaded article images live under /api/v1/media/, which is explicitly allowed so image search and previews work.
const ALLOW = ['/', '/api/v1/media/'];
const DISALLOW = ['/admin', '/api/', '/search'];

const CRAWLERS = [
  // classic search
  'Googlebot', 'Googlebot-News', 'Googlebot-Image', 'Bingbot', 'DuckDuckBot', 'Applebot', 'YandexBot',
  // AI search and assistants
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended',
  'CCBot', 'Amazonbot', 'meta-externalagent', 'cohere-ai', 'MistralAI-User',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: CRAWLERS, allow: ALLOW, disallow: DISALLOW },
      { userAgent: '*', allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`],
    host: SITE_URL,
  };
}
