import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ARTICLE_STATUSES, type ArticleStatus } from '@voxzin/shared';
import { btn } from '@/components/admin/ui';
import { ArticleList } from '@/components/admin/article-list';
import { adminGet, getMe } from '@/lib/admin-server';

interface Item { id: string; title: string; status: ArticleStatus; category: string; author: string; updatedAt: string }
type SP = Promise<{ status?: string; q?: string; page?: string }>;

export default async function ArticlesAdmin({ searchParams }: { searchParams: SP }) {
  const { status, q, page } = await searchParams;
  const me = await getMe();
  if (!me) redirect('/admin/login');
  const qs = new URLSearchParams();
  if (status && (ARTICLE_STATUSES as readonly string[]).includes(status)) qs.set('status', status);
  if (q) qs.set('q', q.slice(0, 100));
  if (page && /^\d{1,3}$/.test(page)) qs.set('page', page);
  const data = await adminGet<{ items: Item[]; page: number; totalPages: number; total: number }>(`/admin/articles?${qs}`);
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    params.set('page', String(nextPage));
    return `/admin/articles?${params}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold">Articles</h1>
        <Link href="/admin/articles/new" className={btn}>New article</Link>
      </div>
      <form className="mt-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search titles" className="rounded-md border border-line bg-surface px-3 py-2 text-sm" />
        <select name="status" defaultValue={status ?? ''} className="rounded-md border border-line bg-surface px-3 py-2 text-sm" aria-label="Status">
          <option value="">All statuses</option>
          {ARTICLE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button className="rounded-md border border-line bg-surface px-3 py-2 text-sm font-medium">Filter</button>
      </form>
      <div className="mt-4"><ArticleList items={data.items} role={me.role} /></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>{data.total} total · page {data.page} of {data.totalPages}</p>
        <nav aria-label="Article pages" className="flex items-center gap-2">
          {data.page > 1
            ? <Link className="rounded border border-line px-3 py-1.5 hover:bg-bg" href={pageHref(data.page - 1)}>Previous</Link>
            : <span className="rounded border border-line px-3 py-1.5 opacity-50">Previous</span>}
          {data.page < data.totalPages
            ? <Link className="rounded border border-line px-3 py-1.5 hover:bg-bg" href={pageHref(data.page + 1)}>Next</Link>
            : <span className="rounded border border-line px-3 py-1.5 opacity-50">Next</span>}
        </nav>
      </div>
    </div>
  );
}
