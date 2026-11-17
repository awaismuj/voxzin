export const dynamic = 'force-dynamic';

/**
 * IndexNow ownership proof. The same key is sent with every "this page changed" ping, and search engines check that
 * https://<site>/<key>.txt returns it. next.config.ts rewrites /<key>.txt here; the key comes from INDEXNOW_KEY.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const expected = process.env.INDEXNOW_KEY;
  if (!expected || key !== expected) return new Response('Not found', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
