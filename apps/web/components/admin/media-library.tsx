'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { MediaAssetDto } from '@voxzin/shared';
import { adminFetch, uploadImage } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label } from './ui';

type MediaPage = { items: MediaAssetDto[]; page: number; totalPages: number; total: number };

export function MediaLibrary({ initial }: { initial: MediaPage }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(initial.items);
  const [page, setPage] = useState(initial.page);
  const [totalPages, setTotalPages] = useState(initial.totalPages);
  const [total, setTotal] = useState(initial.total);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [alt, setAlt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminFetch<MediaPage>(`/media?${new URLSearchParams({ page: String(page), ...(search ? { q: search } : {}) })}`)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load the media library');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [page, search, refresh]);

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
    setNotice('');
    try {
      await uploadImage(file, alt.trim());
      form.reset();
      setAlt('');
      setPage(1);
      setSearch('');
      setQuery('');
      setRefresh((current) => current + 1);
      setNotice('Image uploaded to the media library.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function saveAlt(asset: MediaAssetDto) {
    setSaving(asset.filename);
    setError('');
    setNotice('');
    try {
      await adminFetch(`/media/${encodeURIComponent(asset.filename)}`, { method: 'PATCH', body: { alt: asset.alt } });
      setNotice('Image description saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save image description');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="font-semibold">Upload a new image</h2>
        <p className="mt-1 text-sm text-muted">PNG, JPEG, WebP or GIF · maximum 5 MB. Still images are resized and optimized to WebP for faster loading.</p>
        <form onSubmit={upload} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div><label className={label} htmlFor="media-file">Image file</label><input ref={fileRef} id="media-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="block w-full text-sm" /></div>
          <div><label className={label} htmlFor="media-alt">Image description (alt text)</label><input id="media-alt" className={input} maxLength={300} required value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe what the image shows" /></div>
          <button disabled={uploading} className={btn}>{uploading ? 'Uploading…' : 'Upload image'}</button>
        </form>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); }} className="flex flex-wrap items-end gap-2">
          <div><label className={label} htmlFor="media-library-search">Search by file name</label><input id="media-library-search" className={`${input} w-64`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search media" /></div>
          <button className={btnGhost}>Search</button>
        </form>
        <p className="text-sm text-muted">{total} uploaded image{total === 1 ? '' : 's'}</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700 dark:text-green-400">{notice}</p>}
      {loading ? <p className="py-10 text-center text-sm text-muted">Loading images…</p> : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No images match. Upload an image above or try another search.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((asset) => (
            <li key={asset.filename} className="overflow-hidden rounded-lg border border-line bg-surface">
              <div className="relative aspect-video w-full bg-bg">
                <Image src={asset.url} alt={asset.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="truncate text-sm font-semibold" title={asset.originalName}>{asset.originalName}</p>
                  <p className="mt-1 text-xs text-muted">{Math.ceil(asset.size / 1024)} KB · {new Date(asset.createdAt).toLocaleDateString()}</p>
                </div>
                <div><label className={label} htmlFor={`alt-${asset.filename}`}>Image description</label><textarea id={`alt-${asset.filename}`} rows={2} maxLength={300} required className={input} value={asset.alt} onChange={(e) => setItems((current) => current.map((item) => item.filename === asset.filename ? { ...item, alt: e.target.value } : item))} /></div>
                <button type="button" className={btnGhost} disabled={saving === asset.filename || !asset.alt.trim()} onClick={() => void saveAlt(asset)}>{saving === asset.filename ? 'Saving…' : 'Save description'}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="text-muted">Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" className={btnGhost} disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <button type="button" className={btnGhost} disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
