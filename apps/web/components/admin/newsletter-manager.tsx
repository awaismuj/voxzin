'use client';

import { useState } from 'react';
import type {
  AdminNewsletterArticle,
  AdminNewsletterCampaign,
  AdminNewsletterSubscriber,
  Paginated,
} from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label } from './ui';

interface Status {
  ready: boolean;
  sender: string | null;
  dailyLimit: number;
  dailyUsed: number;
}

export function NewsletterManager({
  articles,
  initialSubscribers,
  initialCampaigns,
  status,
}: {
  articles: AdminNewsletterArticle[];
  initialSubscribers: Paginated<AdminNewsletterSubscriber>;
  initialCampaigns: AdminNewsletterCampaign[];
  status: Status;
}) {
  const [articleId, setArticleId] = useState(articles[0]?.id ?? '');
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [emailStatus, setEmailStatus] = useState(status);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [sending, setSending] = useState(false);

  const article = articles.find((item) => item.id === articleId);

  async function loadSubscribers(nextPage = 1, nextQuery = query) {
    setError('');
    setLoadingSubscribers(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage) });
      if (nextQuery.trim()) params.set('q', nextQuery.trim());
      const result = await adminFetch<Paginated<AdminNewsletterSubscriber>>(`/admin/newsletter/subscribers?${params}`);
      setSubscribers(result);
      setQuery(nextQuery);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confirmed subscribers could not be loaded.');
    } finally {
      setLoadingSubscribers(false);
    }
  }

  function toggleSubscriber(id: string) {
    setError('');
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 3000) next.add(id);
    else {
      setError('A single campaign can contain up to 3,000 subscribers. Queue this campaign before creating another.');
      return;
    }
    setSelected(next);
  }

  function toggleVisible() {
    const next = new Set(selected);
    const allSelected = subscribers.items.every((item) => next.has(item.id));
    if (!allSelected && new Set([...next, ...subscribers.items.map((item) => item.id)]).size > 3000) {
      setError('A single campaign can contain up to 3,000 subscribers. Queue this campaign before selecting more.');
      return;
    }
    for (const item of subscribers.items) {
      if (allSelected) next.delete(item.id);
      else next.add(item.id);
    }
    setError('');
    setSelected(next);
  }

  async function queueCampaign() {
    if (!article || selected.size === 0 || !emailStatus.ready) return;
    const confirmed = window.confirm(
      `Queue “${article.title}” to ${selected.size} confirmed subscriber${selected.size === 1 ? '' : 's'}? VoxZin will send no more than ${emailStatus.dailyLimit} total emails per day, including confirmations and account messages. Larger campaigns continue on later days.`,
    );
    if (!confirmed) return;
    setError('');
    setNotice('');
    setSending(true);
    try {
      const result = await adminFetch<{ id: string; status: 'queued'; recipients: number }>('/admin/newsletter/campaigns', {
        method: 'POST',
        body: { articleId: article.id, subscriberIds: [...selected] },
      });
      setNotice(`Campaign queued for ${result.recipients} confirmed subscriber${result.recipients === 1 ? '' : 's'}.`);
      setSelected(new Set());
      const [nextCampaigns, nextStatus] = await Promise.all([
        adminFetch<{ items: AdminNewsletterCampaign[] }>('/admin/newsletter/campaigns'),
        adminFetch<Status>('/admin/newsletter/status'),
      ]);
      setCampaigns(nextCampaigns.items);
      setEmailStatus(nextStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The campaign could not be queued.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={`${card} border-l-4 ${emailStatus.ready ? 'border-l-green-600' : 'border-l-amber-500'}`}>
        <h2 className="font-semibold">{emailStatus.ready ? 'Email sending is configured' : 'Email sending setup required'}</h2>
        <p className="mt-1 text-sm text-muted">
          {emailStatus.ready
            ? `Sender: ${emailStatus.sender}. ${emailStatus.dailyUsed} of ${emailStatus.dailyLimit} daily email slots used.`
            : 'Set Brevo SMTP credentials and the verified sender address in the production environment before campaigns can be queued.'}
        </p>
        <p className="mt-2 text-xs text-muted">
          VoxZin caps all outbound email attempts at {emailStatus.dailyLimit} per day, including campaigns, confirmations, and account messages. Failed attempts also use a slot. Larger campaigns continue on later days.
        </p>
      </section>

      <section className={`${card} space-y-5`}>
        <div>
          <h2 className="text-xl font-semibold">Create an article newsletter</h2>
          <p className="mt-1 text-sm text-muted">Choose an article, select confirmed subscribers, preview the link, then queue the message.</p>
        </div>

        <div>
          <label htmlFor="newsletter-article" className={label}>Published article</label>
          <select
            id="newsletter-article"
            className={input}
            value={articleId}
            onChange={(event) => setArticleId(event.target.value)}
            disabled={articles.length === 0}
          >
            {articles.length === 0 && <option value="">No published articles available</option>}
            {articles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>

        {article && (
          <div className="rounded-lg border border-line bg-bg p-4 sm:flex sm:gap-4">
            {article.image && (
              <img src={article.image.url} alt={article.image.alt} className="mb-3 aspect-video w-full rounded-md object-cover sm:mb-0 sm:w-48" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Email preview</p>
              <h3 className="mt-1 font-serif text-lg font-bold">{article.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted">{article.excerpt}</p>
              <p className="mt-3 text-sm font-semibold text-accent-ink">Read the full article on VoxZin →</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="subscriber-search" className={label}>Find a confirmed subscriber</label>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void loadSubscribers(1, search);
            }}
          >
            <input
              id="subscriber-search"
              className={`${input} min-w-56 flex-1`}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by email address"
            />
            <button type="submit" className={btnGhost} disabled={loadingSubscribers}>
              {loadingSubscribers ? 'Searching…' : 'Search'}
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">
            Only people who confirmed a VoxZin newsletter subscription can receive a campaign. To send to one person, search for their confirmed subscriber address.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-bg px-4 py-3">
            <p className="text-sm font-medium">{subscribers.total} confirmed subscribers · {selected.size} selected</p>
            <button type="button" className={btnGhost} onClick={toggleVisible} disabled={subscribers.items.length === 0}>
              {subscribers.items.length > 0 && subscribers.items.every((item) => selected.has(item.id)) ? 'Clear this page' : 'Select this page'}
            </button>
          </div>
          {subscribers.items.length > 0 ? (
            <ul className="divide-y divide-line">
              {subscribers.items.map((subscriber) => (
                <li key={subscriber.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 text-sm hover:bg-bg">
                    <input
                      type="checkbox"
                      checked={selected.has(subscriber.id)}
                      onChange={() => toggleSubscriber(subscriber.id)}
                      disabled={!selected.has(subscriber.id) && selected.size >= 3000}
                    />
                    <span>{subscriber.email}</span>
                    <span className="ml-auto text-xs text-muted">
                      {subscriber.confirmedAt ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(subscriber.confirmedAt)) : ''}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">No confirmed subscribers match this search.</p>
          )}
          {subscribers.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-4 py-3">
              <button type="button" className={btnGhost} disabled={loadingSubscribers || subscribers.page <= 1} onClick={() => void loadSubscribers(subscribers.page - 1)}>Previous</button>
              <span className="text-xs text-muted">Page {subscribers.page} of {subscribers.totalPages}</span>
              <button type="button" className={btnGhost} disabled={loadingSubscribers || subscribers.page >= subscribers.totalPages} onClick={() => void loadSubscribers(subscribers.page + 1)}>Next</button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
        <button type="button" className={btn} onClick={queueCampaign} disabled={!emailStatus.ready || !article || selected.size === 0 || sending}>
          {sending ? 'Queueing…' : `Queue newsletter${selected.size ? ` for ${selected.size}` : ''}`}
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">Recent campaigns</h2>
          <p className="mt-1 text-sm text-muted">Delivery progresses in the background. Campaigns larger than the daily allowance resume on following days.</p>
        </div>
        {campaigns.length > 0 ? (
          <ul className="space-y-3">
            {campaigns.map((campaign) => (
              <li key={campaign.id} className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{campaign.subject}</p>
                    <p className="mt-1 text-sm text-muted">{campaign.article.title}</p>
                  </div>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs font-semibold capitalize">{campaign.status}</span>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {campaign.sentCount} sent · {campaign.failedCount} failed · {campaign.skippedCount} unsubscribed after queue · {campaign.totalRecipients} selected
                </p>
                <p className="mt-1 text-xs text-muted">
                  Created {new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(campaign.createdAt))} UTC
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className={card}><p className="text-sm text-muted">No campaigns have been queued yet.</p></div>
        )}
      </section>
    </div>
  );
}
