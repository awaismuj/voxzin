import { describe, expect, it } from 'vitest';
import { parseRss } from './rss';

describe('parseRss', () => {
  it('reads items and the source-reported traffic figure', () => {
    const xml = `<rss><channel><item><title>Example topic</title><link>https://example.com/a</link><pubDate>Tue, 10 Nov 2026 10:00:00 +0000</pubDate><ht:approx_traffic>200+</ht:approx_traffic></item></channel></rss>`;
    const items = parseRss(xml);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe('Example topic');
    expect(String(items[0]?.['ht:approx_traffic'])).toBe('200+');
  });
  it('returns an empty list for feeds without items', () => expect(parseRss('<rss><channel></channel></rss>')).toEqual([]));
});
