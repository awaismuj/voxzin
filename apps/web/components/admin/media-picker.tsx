'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { MediaAssetDto } from '@voxzin/shared';
import { adminFetch, uploadImage } from '@/lib/admin-client';
import { btn, btnGhost, input, label } from './ui';

type MediaPage = { items: MediaAssetDto[]; page: number; totalPages: number; total: number };

export function MediaPicker({
  onSelect,
  triggerLabel,
}: {
  onSelect: (image: Pick<MediaAssetDto, 'url' | 'alt'>) => void;
  triggerLabel: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaAssetDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [alt, setAlt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    adminFetch<MediaPage>(`/media?${new URLSearchParams({ page: String(page), ...(search ? { q: search } : {}) })}`)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setError('');
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load the media library');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [open, page, search]);

  async function choose(asset: MediaAssetDto) {
    let description = asset.alt.trim();
    if (!description) {
      const entered = window.prompt('Describe this image for screen readers');
      if (entered === null) return;
      description = entered.trim();
      if (!description) {
        setError('Add an image description before using this image.');
        return;
      }
      try {
        await adminFetch(`/media/${encodeURIComponent(asset.filename)}`, { method: 'PATCH', body: { alt: description } });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save the image description');
        return;
      }
    }
    onSelect({ url: asset.url, alt: description });
    setOpen(false);
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose an image to upload.');
      return;
    }
    if (!alt.trim()) {
      setError('Add a short, accurate image description.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file, alt.trim());
      onSelect({ url, alt: alt.trim() });
      form.reset();
      setAlt('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button type="button" className={btnGhost} onClick={() => { setOpen(true); setError(''); }}>
        {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="my-auto max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-surface p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="media-picker-title" className="font-serif text-2xl font-semibold">Choose an image</h2><p className="mt-1 text-sm text-muted">Pick an existing upload or add an image to your media library.</p></div>
              <button type="button" className={btnGhost} onClick={() => setOpen(false)} aria-label="Close media library">Close</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); }} className="mt-5 flex flex-wrap gap-2">
              <label className="sr-only" htmlFor="media-search">Search image filenames</label>
              <input id="media-search" className={`${input} max-w-sm`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search image filenames" />
              <button className={btnGhost}>Search</button>
            </form>

            <form onSubmit={upload} className="mt-4 grid gap-3 rounded-lg border border-line p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div><label className={label} htmlFor="picker-file">Upload image</label><input ref={fileRef} id="picker-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="block w-full text-sm" /><p className="mt-1 text-xs text-muted">Still images are optimized automatically for faster loading.</p></div>
              <div><label className={label} htmlFor="picker-alt">Image description (alt text)</label><input id="picker-alt" className={input} maxLength={300} required value={alt} onChange={(e) => setAlt(e.target.value)} /></div>
              <button disabled={uploading} className={btn}>{uploading ? 'Uploading…' : 'Upload and use'}</button>
            </form>

            {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
            {loading ? <p className="py-10 text-center text-sm text-muted">Loading images…</p> : items.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No images found. Upload one above or visit the Media library.</p>
            ) : (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((asset) => (
                  <li key={asset.filename} className="overflow-hidden rounded-lg border border-line">
                    <button type="button" className="block w-full text-left hover:bg-bg" onClick={() => void choose(asset)}>
                      <div className="relative aspect-video w-full bg-bg">
                        <Image src={asset.url} alt={asset.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                      </div>
                      <span className="block truncate px-3 pt-2 text-sm font-medium">{asset.originalName}</span>
                      <span className="block truncate px-3 pb-3 text-xs text-muted">{asset.alt || 'Alt text needed'} · {Math.ceil(asset.size / 1024)} KB</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
              <span className="text-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" className={btnGhost} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <button type="button" className={btnGhost} disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
