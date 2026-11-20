'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import type { ArticleFeedbackDto, Paginated } from '@voxzin/shared';

const fieldClass = 'w-full rounded-md border border-line bg-surface px-3 py-2 text-sm';
const labelClass = 'mb-1 block text-sm font-medium';
const submitClass = 'rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 dark:bg-accent dark:text-navy';

export function ArticleFeedback({
  slug,
  initial,
}: {
  slug: string;
  initial: Paginated<ArticleFeedbackDto>;
}) {
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/articles/${encodeURIComponent(slug)}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, message }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: unknown } | null;
        throw new Error(typeof body?.message === 'string' ? body.message : `Feedback could not be submitted (${response.status}).`);
      }
      setName('');
      setMessage('');
      setNotice('Thank you. Your feedback has been sent for review and will appear here if approved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feedback could not be submitted. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function loadMore() {
    setError('');
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/v1/articles/${encodeURIComponent(slug)}/feedback?page=${nextPage}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error(`More feedback could not be loaded (${response.status}).`);
      const result = await response.json() as Paginated<ArticleFeedbackDto>;
      setItems((current) => [...current, ...result.items]);
      setTotal(result.total);
      setPage(result.page);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'More feedback could not be loaded. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section aria-labelledby="feedback-heading" className="mt-14 border-t border-line pt-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-ink">Reader voices</p>
        <h2 id="feedback-heading" className="section-title mt-1 text-2xl font-bold tracking-tight">Share your feedback</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Join the conversation about this article. Feedback is reviewed before it is published.
        </p>

        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-xl border border-line bg-surface p-5">
          <div>
            <label htmlFor="feedback-name" className={labelClass}>Your name</label>
            <input id="feedback-name" className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={60} required autoComplete="name" />
          </div>
          <div>
            <label htmlFor="feedback-message" className={labelClass}>Your feedback</label>
            <textarea id="feedback-message" className={fieldClass} value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={2000} rows={5} required aria-describedby="feedback-privacy" />
            <p id="feedback-privacy" className="mt-1 text-xs text-muted">Your name and feedback will be public if approved. Please do not include private information.</p>
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted">{message.length}/2000</span>
            <button type="submit" className={submitClass} disabled={saving}>{saving ? 'Sending…' : 'Send feedback'}</button>
          </div>
        </form>

        <div className="mt-9">
          <h3 className="text-lg font-semibold">Published feedback <span className="text-sm font-normal text-muted">({total})</span></h3>
          {items.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-xl border border-line bg-surface p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-ink">{item.name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(item.createdAt))}</time>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-bg p-4 text-sm text-muted">No feedback has been published yet. Be the first to share your thoughts.</p>
          )}
          {items.length < total && (
            <button type="button" className="mt-4 text-sm font-semibold text-accent-ink hover:underline disabled:opacity-50" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more feedback'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
