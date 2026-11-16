import { XMLParser } from 'fast-xml-parser';
import { env } from '../config';
import type { RawTrend, TrendProvider } from './types';

const parser = new XMLParser({ ignoreAttributes: true, processEntities: true });
const UA = `VoxzinBot/0.1 (+${env.SITE_URL})`;

interface RssItem {
  title?: string | number;
  link?: string;
  pubDate?: string;
  'ht:approx_traffic'?: string | number;
}

export function parseRss(xml: string): RssItem[] {
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: RssItem | RssItem[] } } };
  const items = doc.rss?.channel?.item;
  return items ? (Array.isArray(items) ? items : [items]) : [];
}

async function getXml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(10_000), redirect: 'follow' });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  const text = await res.text();
  if (text.length > 2_000_000) throw new Error('Feed too large');
  return text;
}

const toTrend = (i: RssItem, country: string, source: string): RawTrend | null => {
  const title = String(i.title ?? '').trim();
  if (title.length < 2 || title.length > 200) return null;
  const link = typeof i.link === 'string' && i.link.startsWith('https://') ? i.link : undefined;
  const date = i.pubDate ? new Date(i.pubDate) : undefined;
  const traffic = i['ht:approx_traffic'] !== undefined ? String(i['ht:approx_traffic']).slice(0, 60) : undefined;
  return {
    title, country, source, sourceUrl: link,
    sourcePublishedAt: date && !Number.isNaN(date.getTime()) ? date : undefined,
    trendMetric: traffic,
  };
};

/**
 * Google's public Trending Now RSS feed per region. Check Google's current terms and feed availability
 * before relying on it in production; set TREND_GOOGLE_RSS_ENABLED=false to turn it off.
 */
export class GoogleTrendsRssProvider implements TrendProvider {
  readonly name = 'google-trends-rss';
  async fetch(country: string) {
    const xml = await getXml(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(country)}`);
    return parseRss(xml).map((i) => toTrend(i, country, this.name)).filter((t): t is RawTrend => t !== null);
  }
}

/** Operator-approved extra feeds (TREND_EXTRA_RSS). Items are treated as worldwide topic candidates. */
export class ApprovedRssProvider implements TrendProvider {
  readonly name = 'approved-rss';
  constructor(private readonly urls: string[]) {}
  async fetch() {
    const out: RawTrend[] = [];
    for (const url of this.urls) {
      try {
        out.push(...parseRss(await getXml(url)).slice(0, 15).map((i) => toTrend(i, 'WW', `rss:${new URL(url).hostname}`)).filter((t): t is RawTrend => t !== null));
      } catch {
        // one bad feed must not stop the others; the failure is logged by the caller via the job result
      }
    }
    return out;
  }
}
