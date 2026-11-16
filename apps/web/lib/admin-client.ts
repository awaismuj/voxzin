'use client';

/** Browser-side calls to our own origin (/api/v1 is proxied to the API), so session cookies stay first-party. */
export async function adminFetch<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init.method ?? 'GET',
    headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: 'same-origin',
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: unknown; errors?: Record<string, string[]> } | null;
    const fieldErrors = body?.errors ? Object.entries(body.errors).map(([k, v]) => `${k}: ${v.join(', ')}`).join(' · ') : '';
    const msg = typeof body?.message === 'string' ? body.message : `Request failed (${res.status})`;
    throw new Error(fieldErrors ? `${msg}. ${fieldErrors}` : msg);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json().catch(() => undefined)) as T);
}

export async function uploadImage(file: File, alt?: string): Promise<string> {
  const form = new FormData();
  form.set('file', file);
  if (alt) form.set('alt', alt);
  const res = await fetch('/api/v1/media', { method: 'POST', body: form, credentials: 'same-origin' });
  const body = (await res.json().catch(() => null)) as { url?: string; message?: string } | null;
  if (!res.ok || !body?.url) throw new Error(body?.message ?? 'Upload failed');
  return body.url;
}
