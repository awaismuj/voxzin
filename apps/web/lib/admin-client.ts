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

function optimizeImage(file: File): Promise<{ file: File; optimized: boolean; message?: string }> {
  if (file.type === 'image/gif') {
    return Promise.resolve({ file, optimized: false, message: 'Animated GIF will be optimized by the server.' });
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return Promise.resolve({ file, optimized: false, message: 'This image format will be optimized by the server.' });
  }

  return createImageBitmap(file).then(async (bitmap) => {
    try {
      const scale = Math.min(1, 1280 / bitmap.width, 1280 / bitmap.height);
      if (file.type === 'image/webp' && scale === 1 && file.size <= 350 * 1024) {
        return { file, optimized: false, message: 'Image is already web-optimized.' };
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this image.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error('Your browser could not compress this image.'));
        }, 'image/webp', 0.76);
      });
      if (blob.size >= file.size) {
        return { file, optimized: false, message: 'Original image is already smaller; server optimization will be applied.' };
      }
      const name = `${file.name.replace(/\.[^.]+$/, '') || 'image'}.webp`;
      return {
        file: new File([blob], name, { type: 'image/webp', lastModified: file.lastModified }),
        optimized: true,
      };
    } finally {
      bitmap.close();
    }
  }).catch((error: unknown) => ({
    file,
    optimized: false,
    message: error instanceof Error ? `${error.message} Uploading original; server optimization will be applied.` : 'Browser optimization failed. Uploading original for server optimization.',
  }));
}

export async function uploadImage(file: File, alt?: string, onStatus?: (status: string) => void): Promise<string> {
  onStatus?.('Preparing image…');
  const prepared = await optimizeImage(file);
  onStatus?.(prepared.optimized
    ? `Uploading optimized image (${Math.ceil(prepared.file.size / 1024)} KB)…`
    : `${prepared.message ?? 'Uploading image…'}${prepared.file.size ? ` (${Math.ceil(prepared.file.size / 1024)} KB)` : ''}`);

  const form = new FormData();
  form.set('file', prepared.file);
  if (alt) form.set('alt', alt);
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/v1/media');
    request.withCredentials = true;
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onStatus?.(`Uploading image… ${Math.round((event.loaded / event.total) * 100)}%`);
    });
    request.addEventListener('error', () => reject(new Error('Image upload failed. Check your connection and try again.')));
    request.addEventListener('load', () => {
      let body: { url?: string; message?: string | string[] } | null = null;
      try {
        body = JSON.parse(request.responseText) as { url?: string; message?: string | string[] };
      } catch {
        reject(new Error(`Image upload failed (${request.status}). The server returned an invalid response.`));
        return;
      }
      if (request.status < 200 || request.status >= 300 || !body?.url) {
        const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        reject(new Error(message ?? `Image upload failed (${request.status}).`));
        return;
      }
      resolve(body.url);
    });
    request.send(form);
  });
}
