'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { TrendTopicDto } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label } from './ui';

type LinkedArticle = { id: string; title: string; slug: string; status?: string };
type Topic = TrendTopicDto & { status: string; verificationStatus?: string; linkedArticles: LinkedArticle[] };
type Country = { code: string; name: string };
type ArticleOption = Pick<LinkedArticle, 'id' | 'title' | 'slug' | 'status'>;

export function TrendingManager({ items, status, country, countries }: { items: Topic[]; status: string; country: string; countries: Country[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState({ description: '', keywords: '' });
  const [selectedArticles, setSelectedArticles] = useState<LinkedArticle[]>([]);
  const [articleQuery, setArticleQuery] = useState('');
  const [articleOptions, setArticleOptions] = useState<ArticleOption[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function patch(id: string, body: Record<string, unknown>) {
    setError('');
    try { await adminFetch(`/admin/trending/${id}`, { method: 'PATCH', body }); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  }
  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoadingArticles(true);
      try {
        const query = new URLSearchParams({ status: 'published', limit: '20' });
        if (articleQuery.trim().length >= 2) query.set('q', articleQuery.trim());
        const result = await adminFetch<{ items: ArticleOption[] }>(`/admin/articles?${query}`);
        if (active) setArticleOptions(result.items);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not load articles');
      } finally {
        if (active) setLoadingArticles(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, articleQuery]);

  function editTopic(topic: Topic) {
    setOpen(open === topic.id ? null : topic.id);
    setDraft({ description: topic.description, keywords: topic.keywords.join(', ') });
    setSelectedArticles(topic.linkedArticles);
    setArticleQuery('');
    setError('');
  }

  function toggleArticle(article: ArticleOption) {
    setSelectedArticles((current) =>
      current.some((selected) => selected.id === article.id)
        ? current.filter((selected) => selected.id !== article.id)
        : [...current, article],
    );
  }

  async function saveTopic(topic: Topic) {
    setSaving(true);
    await patch(topic.id, {
      description: draft.description,
      keywords: draft.keywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      relatedArticleIds: selectedArticles.map((article) => article.id),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">Review discovered topics, add editorial context, and curate published articles to feature as related coverage on the homepage and topic page.</p>
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
          <li key={t.id} className={`${card} space-y-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif text-lg font-semibold">{t.title}</p>
                <p className="mt-1 text-xs capitalize text-muted">{countries.find((c) => c.code === t.country)?.name ?? t.country} · {t.source} · {t.status}{t.trendMetric ? ` · source reports ${t.trendMetric}` : ''}{t.isFeatured ? ' · featured' : ''}</p>
                {t.sourceUrl && <a className="mt-1 inline-block text-xs text-accent-ink underline" href={t.sourceUrl} target="_blank" rel="noopener noreferrer">View original source</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => editTopic(t)}>{open === t.id ? 'Close editor' : 'Edit topic'}</button>
                {t.status !== 'rejected' && <button type="button" className={btnGhost} onClick={() => patch(t.id, { status: 'rejected' })}>Reject</button>}
                {t.status === 'approved' && <button type="button" className={btnGhost} onClick={() => patch(t.id, { isFeatured: !t.isFeatured })}>{t.isFeatured ? 'Unfeature' : 'Feature'}</button>}
                {t.status !== 'expired' && <button type="button" className={btnGhost} onClick={() => patch(t.id, { status: 'expired' })}>Expire</button>}
              </div>
            </div>
            <div className="rounded-md bg-bg px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Related coverage · {t.linkedArticles.length}</p>
              {t.linkedArticles.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {t.linkedArticles.map((article) => <li key={article.id} className="truncate text-sm">{article.title}{article.status !== 'published' && <span className="ml-2 text-xs text-muted">not published</span>}</li>)}
                </ul>
              ) : <p className="mt-1 text-sm text-muted">No articles linked yet. Edit this topic to add coverage.</p>}
            </div>
            {open === t.id && (
              <div className="space-y-4 border-t border-line pt-4">
                <div><label className={label} htmlFor={`d-${t.id}`}>Researched explanation (why it’s trending, with context)</label>
                  <textarea id={`d-${t.id}`} rows={5} className={input} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
                <div><label className={label} htmlFor={`k-${t.id}`}>Related keywords (comma separated)</label>
                  <input id={`k-${t.id}`} className={input} value={draft.keywords} onChange={(e) => setDraft({ ...draft, keywords: e.target.value })} /></div>
                <section aria-labelledby={`articles-heading-${t.id}`} className="space-y-2">
                  <h3 id={`articles-heading-${t.id}`} className="text-sm font-semibold">Homepage and topic-page articles</h3>
                  <p className="text-xs text-muted">Select published Voxzin stories that directly cover this topic. Up to 20 articles can be linked.</p>
                  <label className="sr-only" htmlFor={`article-search-${t.id}`}>Search published articles</label>
                  <input id={`article-search-${t.id}`} className={input} value={articleQuery} onChange={(event) => setArticleQuery(event.target.value)} placeholder="Search published article titles" />
                  <div className="max-h-56 overflow-y-auto rounded-md border border-line">
                    {loadingArticles ? <p className="p-3 text-sm text-muted">Loading articles…</p> : articleOptions.length > 0 ? (
                      <ul className="divide-y divide-line">
                        {articleOptions.map((article) => {
                          const checked = selectedArticles.some((selected) => selected.id === article.id);
                          return (
                            <li key={article.id}>
                              <label className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-bg">
                                <input type="checkbox" checked={checked} disabled={!checked && selectedArticles.length >= 20} onChange={() => toggleArticle(article)} />
                                <span><span className="block font-medium">{article.title}</span><span className="text-xs text-muted">/articles/{article.slug}</span></span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    ) : <p className="p-3 text-sm text-muted">{articleQuery.trim().length >= 2 ? 'No published articles match your search.' : 'No published articles available.'}</p>}
                  </div>
                  {selectedArticles.length > 0 && (
                    <ul className="flex flex-wrap gap-2" aria-label="Selected articles">
                      {selectedArticles.map((article) => (
                        <li key={article.id}>
                          <button type="button" className="rounded-full border border-line px-3 py-1 text-xs hover:bg-bg" onClick={() => toggleArticle(article)}>
                            {article.title} ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                <button type="button" disabled={saving} className={btn} onClick={() => saveTopic(t)}>{saving ? 'Saving…' : 'Save topic and articles'}</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
