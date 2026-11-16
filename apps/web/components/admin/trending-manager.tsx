'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TrendTopicDto } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label } from './ui';

type Topic = TrendTopicDto & { status: string; verificationStatus?: string };
type Country = { code: string; name: string };

export function TrendingManager({ items, status, country, countries }: { items: Topic[]; status: string; country: string; countries: Country[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', keywords: '' });
  const [error, setError] = useState('');

  async function patch(id: string, body: Record<string, unknown>) {
    setError('');
    try { await adminFetch(`/admin/trending/${id}`, { method: 'PATCH', body }); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  }
  async function addManual(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    try {
      await adminFetch('/admin/trending', { method: 'POST', body: { title: f.get('title'), description: f.get('description') || '', country: f.get('country'), sourceUrl: f.get('sourceUrl') || undefined } });
      (e.target as HTMLFormElement).reset(); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add topic'); }
  }

  return (
    <div className="space-y-6">
      <form className="flex flex-wrap gap-2" role="search">
        <select name="status" defaultValue={status} aria-label="Status" className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
          <option value="">All</option>{['pending', 'approved', 'rejected', 'expired'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="country" defaultValue={country} aria-label="Country" className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
          <option value="">All countries</option>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <button className={btnGhost}>Filter</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-3">
        {items.length === 0 && <li className="text-sm text-muted">No topics match. The worker adds new candidates hourly once it is running.</li>}
        {items.map((t) => (
          <li key={t.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs text-muted">{countries.find((c) => c.code === t.country)?.name ?? t.country} · {t.source} · {t.status}{t.trendMetric ? ` · source reports ${t.trendMetric}` : ''}{t.isFeatured ? ' · featured' : ''}</p>
                {t.sourceUrl && <a className="text-xs text-accent-ink underline" href={t.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnGhost} onClick={() => { setOpen(open === t.id ? null : t.id); setDraft({ description: t.description, keywords: t.keywords.join(', ') }); }}>Research</button>
                {t.status !== 'approved' && <button className={btnGhost} onClick={() => patch(t.id, { status: 'approved', verificationStatus: 'verified' })}>Approve</button>}
                {t.status !== 'rejected' && <button className={btnGhost} onClick={() => patch(t.id, { status: 'rejected' })}>Reject</button>}
                {t.status === 'approved' && <button className={btnGhost} onClick={() => patch(t.id, { isFeatured: !t.isFeatured })}>{t.isFeatured ? 'Unfeature' : 'Feature'}</button>}
                {t.status !== 'expired' && <button className={btnGhost} onClick={() => patch(t.id, { status: 'expired' })}>Expire</button>}
              </div>
            </div>
            {open === t.id && (
              <div className="mt-4 space-y-3">
                <div><label className={label} htmlFor={`d-${t.id}`}>Researched explanation (why it’s trending, with context)</label>
                  <textarea id={`d-${t.id}`} rows={5} className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
                <div><label className={label} htmlFor={`k-${t.id}`}>Related keywords (comma separated)</label>
                  <input id={`k-${t.id}`} className={input} value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} /></div>
                <button className={btn} onClick={() => patch(t.id, { description: draft.description, keywords: draft.keywords.split(',').map((k) => k.trim()).filter(Boolean) })}>Save research</button>
                <p className="text-xs text-muted">A topic needs a written explanation before it can be approved.</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={addManual} className={`${card} grid max-w-xl gap-3`}>
        <h2 className="font-semibold">Add a topic manually</h2>
        <div><label className={label} htmlFor="mt">Topic</label><input id="mt" name="title" required minLength={2} className={input} /></div>
        <div><label className={label} htmlFor="mc">Country</label><select id="mc" name="country" className={input}>{countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
        <div><label className={label} htmlFor="mu">Source link (https)</label><input id="mu" name="sourceUrl" type="url" className={input} /></div>
        <div><label className={label} htmlFor="md">Explanation</label><textarea id="md" name="description" rows={3} className={input} /></div>
        <button className={btn}>Add topic</button>
      </form>
    </div>
  );
}
