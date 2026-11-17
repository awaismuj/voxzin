import { describe, expect, it, vi } from 'vitest';
import { submitToIndexNow } from './indexnow';

const key = 'a'.repeat(32);
const ok = (status = 200) => vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch;

describe('submitToIndexNow', () => {
  it('posts the urls with the key and where the key file lives', async () => {
    const f = ok(202);
    expect(await submitToIndexNow({ siteUrl: 'https://voxzin.com/', key, urls: ['https://voxzin.com/articles/a'] }, f)).toBe(true);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.indexnow.org/IndexNow');
    expect(JSON.parse(String(init.body))).toEqual({
      host: 'voxzin.com',
      key,
      keyLocation: `https://voxzin.com/${key}.txt`,
      urlList: ['https://voxzin.com/articles/a'],
    });
  });

  it('drops other hosts and duplicates, and sends nothing when nothing is left', async () => {
    const f = ok();
    await submitToIndexNow({ siteUrl: 'https://voxzin.com', key, urls: ['https://voxzin.com/a', 'https://voxzin.com/a', 'https://evil.example/x'] }, f);
    expect(JSON.parse(String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].body)).urlList).toEqual(['https://voxzin.com/a']);
    const none = ok();
    expect(await submitToIndexNow({ siteUrl: 'https://voxzin.com', key, urls: ['https://evil.example/x'] }, none)).toBe(false);
    expect(none).not.toHaveBeenCalled();
  });

  it('refuses a malformed key and never throws on network errors', async () => {
    const f = ok();
    expect(await submitToIndexNow({ siteUrl: 'https://voxzin.com', key: 'short', urls: ['https://voxzin.com/a'] }, f)).toBe(false);
    expect(f).not.toHaveBeenCalled();
    const boom = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await submitToIndexNow({ siteUrl: 'https://voxzin.com', key, urls: ['https://voxzin.com/a'] }, boom)).toBe(false);
  });
});
