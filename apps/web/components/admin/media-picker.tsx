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
  const [view, setView] = useState<'library' | 'upload'>('library');
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetDto | null>(null);
  const [selectedAlt, setSelectedAlt] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
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

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function choose(asset: MediaAssetDto) {
    setError('');
    if (!asset.alt.trim()) {
      setSelectedAsset(asset);
      setSelectedAlt('');
      return;
    }
    onSelect({ url: asset.url, alt: asset.alt.trim() });
    setOpen(false);
  }

  async function useSelectedAsset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedAsset) return;
    const description = selectedAlt.trim();
    if (!description) {
      setError('Add a short, accurate description before using this image.');
      return;
    }
    setSavingSelection(true);
    setError('');
    try {
      await adminFetch(`/media/${encodeURIComponent(selectedAsset.filename)}`, { method: 'PATCH', body: { alt: description } });
      onSelect({ url: selectedAsset.url, alt: description });
      setOpen(false);
      setSelectedAsset(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the image description');
    } finally {
      setSavingSelection(false);
    }
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose an image file to continue.');
      return;
    }
    if (!alt.trim()) {
      setError('Add a short, accurate image description.');
      return;
    }
    setUploading(true);
    setError('');
    setUploadStatus('Preparing your image…');
    try {
      const url = await uploadImage(file, alt.trim(), setUploadStatus);
      onSelect({ url, alt: alt.trim() });
      form.reset();
      setAlt('');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed');
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  }

  return (
    <>
      <button type="button" className={btnGhost} onClick={() => {
        setOpen(true);
        setView('library');
        setSelectedAsset(null);
        setError('');
      }}>
        {triggerLabel}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-3 sm:p-6" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="my-auto max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-line bg-surface p-4 shadow-2xl sm:p-6">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="media-picker-title" className="font-serif text-2xl font-semibold">Choose an image</h2>
                <p className="mt-1 text-sm text-muted">Select an image from your library or upload a new one.</p>
              </div>
              <button type="button" className={btnGhost} onClick={() => setOpen(false)} aria-label="Close image picker">Close</button>
            </header>

            <nav aria-label="Image source" className="mt-5 flex gap-2 border-b border-line pb-3">
              <button type="button" aria-pressed={view === 'library'} onClick={() => { setView('library'); setSelectedAsset(null); setError(''); }}
                className={`${btnGhost} ${view === 'library' ? 'border-accent bg-bg text-accent-ink' : ''}`}>Media library</button>
              <button type="button" aria-pressed={view === 'upload'} onClick={() => { setView('upload'); setError(''); }}
                className={`${btnGhost} ${view === 'upload' ? 'border-accent bg-bg text-accent-ink' : ''}`}>Upload image</button>
            </nav>
            {(uploading || savingSelection) && <p role="status" className="mt-3 text-sm text-muted">{uploading ? uploadStatus : 'Saving image description…'}</p>}
            {error && <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            {view === 'library' ? (
              <>
                <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(query.trim()); setSelectedAsset(null); }} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <label className={label} htmlFor="media-search">Search your images</label>
                    <input id="media-search" className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by filename" />
                  </div>
                  <button className={`${btnGhost} self-end`}>Search images</button>
                </form>

                {selectedAsset && (
                  <form onSubmit={useSelectedAsset} className="mt-4 rounded-lg border border-accent bg-bg p-4">
                    <h3 className="font-semibold">Add an image description</h3>
                    <p className="mt-1 text-sm text-muted">{selectedAsset.originalName} needs alt text so readers using assistive technology can understand the image.</p>
                    <label className={`${label} mt-3`} htmlFor="selected-image-alt">Describe what the image shows</label>
                    <input id="selected-image-alt" className={input} maxLength={300} required autoFocus value={selectedAlt} onChange={(e) => setSelectedAlt(e.target.value)} placeholder="A short, accurate description" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button disabled={savingSelection} className={btn}>{savingSelection ? 'Saving…' : 'Save description and use image'}</button>
                      <button type="button" className={btnGhost} onClick={() => setSelectedAsset(null)}>Choose another image</button>
                    </div>
                  </form>
                )}

                {loading ? <p role="status" className="py-10 text-center text-sm text-muted">Loading your images…</p> : items.length === 0 ? (
                  <div className="mt-5 rounded-lg border border-dashed border-line px-5 py-10 text-center">
                    <p className="font-medium">No images found</p>
                    <p className="mt-1 text-sm text-muted">{search ? 'Try another filename or upload a new image.' : 'Upload an image to start building your library.'}</p>
                    <button type="button" className={`${btnGhost} mt-4`} onClick={() => setView('upload')}>Upload an image</button>
                  </div>
                ) : (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((asset) => (
                      <li key={asset.filename} className="overflow-hidden rounded-lg border border-line bg-surface">
                        <div className="relative aspect-video w-full bg-bg">
                          <Image src={asset.url} alt={asset.alt} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                        </div>
                        <div className="space-y-2 p-3">
                          <p className="truncate text-sm font-medium" title={asset.originalName}>{asset.originalName}</p>
                          <p className="line-clamp-2 min-h-8 text-xs text-muted">{asset.alt || 'Description needed'} · {Math.ceil(asset.size / 1024)} KB</p>
                          <button type="button" className={`${btnGhost} w-full`} onClick={() => choose(asset)}>{asset.alt ? 'Use this image' : 'Add description'}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="text-muted">Page {page} of {totalPages} · {items.length} shown</span>
                  <div className="flex gap-2">
                    <button type="button" className={btnGhost} disabled={page <= 1 || loading} onClick={() => { setSelectedAsset(null); setPage((current) => current - 1); }}>Previous</button>
                    <button type="button" className={btnGhost} disabled={page >= totalPages || loading} onClick={() => { setSelectedAsset(null); setPage((current) => current + 1); }}>Next</button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={upload} className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                <section className="rounded-lg border border-line p-4 sm:p-5">
                  <h3 className="font-semibold">1. Choose a file</h3>
                  <p className="mt-1 text-sm text-muted">Use a clear, high-quality image. Still images are optimized automatically for faster loading.</p>
                  <input ref={fileRef} id="picker-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="mt-4 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-bg file:px-3 file:py-2 file:font-medium file:text-ink hover:file:bg-line" />
                  <p className="mt-2 text-xs text-muted">Supported formats: JPG, PNG, WebP, and GIF.</p>
                </section>
                <section className="rounded-lg border border-line p-4 sm:p-5">
                  <h3 className="font-semibold">2. Describe the image</h3>
                  <p className="mt-1 text-sm text-muted">Alt text helps screen-reader users understand meaningful images. Describe what is shown, not keywords.</p>
                  <label className={`${label} mt-4`} htmlFor="picker-alt">Image description (alt text)</label>
                  <textarea id="picker-alt" className={input} rows={3} maxLength={300} required value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Example: A reporter speaks at a city council meeting" />
                  <p className="mt-1 text-right text-xs text-muted">{alt.length}/300</p>
                  <button disabled={uploading} className={`${btn} mt-3 w-full`}>{uploading ? 'Uploading…' : 'Upload and use image'}</button>
                </section>
              </form>
            )}

          </section>
        </div>
      )}
    </>
  );
}
