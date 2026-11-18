/**
 * IndexNow: tells Bing, Yandex, Seznam, Naver and other participating search engines that a page is new or changed,
 * so it is crawled within minutes instead of days. (Bing's index also feeds ChatGPT search, Copilot and others.)
 * https://www.indexnow.org/documentation
 */
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';
/** Hex only, 32-64 chars. Create one with: openssl rand -hex 16 */
export const INDEXNOW_KEY_PATTERN = /^[a-f0-9]{32,64}$/;

export interface IndexNowOptions {
  /** Public site address, e.g. https://voxzin.com */
  siteUrl: string;
  key: string;
  /** Absolute URLs on the same host as siteUrl. */
  urls: string[];
}

/** Returns true when the search engines accepted the submission. Never throws. */
export async function submitToIndexNow(
  { siteUrl, key, urls }: IndexNowOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  try {
    if (!INDEXNOW_KEY_PATTERN.test(key)) return false;
    const base = new URL(siteUrl);
    const list = [...new Set(urls)].filter((u) => {
      try {
        return new URL(u).host === base.host;
      } catch {
        return false;
      }
    });
    if (list.length === 0) return false;
    const res = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: base.host,
        key,
        keyLocation: `${base.origin}/${key}.txt`,
        urlList: list.slice(0, 10_000),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.status === 200 || res.status === 202;
  } catch {
    return false;
  }
}
