'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AdminArticleFeedbackDto, Paginated } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btnGhost, card } from './ui';

type StatusFilter = '' | 'pending' | 'approved';
type ActiveFilter = '' | 'active' | 'inactive';

export function FeedbackManager({
  initial,
  status,
  active,
}: {
  initial: Paginated<AdminArticleFeedbackDto>;
  status: StatusFilter;
  active: ActiveFilter;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  async function update(item: AdminArticleFeedbackDto, patch: { status?: 'pending' | 'approved'; isActive?: boolean }) {
    setBusy(item.id);
    setError('');
    try {
      await adminFetch(`/admin/feedback/${item.id}`, { method: 'PATCH', body: patch });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback could not be updated.');
    } finally {
      setBusy('');
    }
  }

  async function remove(item: AdminArticleFeedbackDto) {
    if (!window.confirm(`Permanently delete feedback from ${item.name}?`)) return;
    setBusy(item.id);
    setError('');
    try {
      await adminFetch(`/admin/feedback/${item.id}`, { method: 'DELETE' });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback could not be deleted.');
    } finally {
      setBusy('');
    }
  }

  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    query.set('status', status);
    if (active) query.set('active', active);
    query.set('page', String(page));
    return `/admin/feedback?${query.toString()}`;
  };

  return (
    <div className="space-y-5">
      <form action="/admin/feedback" className={`${card} flex flex-wrap items-end gap-3`}>
        <div>
          <label htmlFor="feedback-status" className="mb-1 block text-xs font-semibold text-muted">Review status</label>
          <select id="feedback-status" name="status" defaultValue={status} className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
          </select>
        </div>
        <div>
          <label htmlFor="feedback-active" className="mb-1 block text-xs font-semibold text-muted">Visibility</label>
          <select id="feedback-active" name="active" defaultValue={active} className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
            <option value="">All visibility</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" className={btnGhost}>Apply filters</button>
      </form>

      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="text-sm text-muted">{initial.total} {initial.total === 1 ? 'submission' : 'submissions'}</p>

      {initial.items.length > 0 ? (
        <ul className="space-y-4">
          {initial.items.map((item) => (
            <li key={item.id} className={`${card} space-y-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(item.createdAt))} UTC</time>
                    <span aria-hidden="true"> · </span>
                    <span className="capitalize">{item.status}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{item.isActive ? 'Active' : 'Inactive'}</span>
                  </p>
                </div>
                {item.article && (
                  <Link href={`/articles/${item.article.slug}`} target="_blank" className="max-w-md text-sm font-medium text-accent-ink hover:underline">
                    {item.article.title}
                  </Link>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words border-t border-line pt-4 text-sm leading-relaxed">{item.message}</p>
              <div className="flex flex-wrap gap-2">
                {item.status === 'pending' && (
                  <button type="button" className={btnGhost} disabled={busy === item.id} onClick={() => update(item, { status: 'approved' })}>Approve</button>
                )}
                <button type="button" className={btnGhost} disabled={busy === item.id} onClick={() => update(item, { isActive: !item.isActive })}>
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" className={btnGhost} disabled={busy === item.id} onClick={() => remove(item)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={card}><p className="text-sm text-muted">No feedback matches these filters.</p></div>
      )}

      {initial.totalPages > 1 && (
        <nav aria-label="Feedback pages" className="flex items-center justify-between">
          {initial.page > 1 ? <Link className={btnGhost} href={pageHref(initial.page - 1)}>Previous</Link> : <span />}
          <span className="text-sm text-muted">Page {initial.page} of {initial.totalPages}</span>
          {initial.page < initial.totalPages ? <Link className={btnGhost} href={pageHref(initial.page + 1)}>Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
