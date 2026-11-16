import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
export default function robots(): MetadataRoute.Robots {
  const crawlable = { allow: '/', disallow: ['/admin', '/api/', '/search'] };
  return {
    rules: [
      { userAgent: '*', ...crawlable },
      { userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot'], ...crawlable },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
