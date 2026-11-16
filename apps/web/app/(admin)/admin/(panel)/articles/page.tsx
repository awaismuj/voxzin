import Link from 'next/link';
import { ARTICLE_STATUSES } from '@voxzin/shared';
import { btn, card, td, th } from '@/components/admin/ui';
import { adminGet } from '@/lib/admin-server';
import { formatDate } from '@/lib/utils';

interface Item { id: string; title: string; status: string; category: string; author: string; updatedAt: string }
type SP = Promise<{ status?: string; q?: string; page?: string }>;

export default async function ArticlesAdmin({ searchParams }: { searchParams: SP }) {
  const { status, q, page } = await searchParams;
  const qs = new URLSearchParams();
  if (status && (ARTICLE_STATUSES as readonly string[]).includes(status)) qs.set('status', status);
  if (q) qs.set('q', q.slice(0, 100));
  if (page && /^\d{1,3}$/.test(page)) qs.set('page', page);
  const data = await adminGet<{ items: Item[]; page: number; totalPages: number; total: number }>(`/admin/articles?${qs}`);

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
      <div className={`${card} mt-4 overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>Title</th><th className={th}>Status</th><th className={th}>Category</th><th className={th}>Author</th><th className={th}>Updated</th></tr></thead>
          <tbody>
            {data.items.length === 0 && <tr><td className={td} colSpan={5}>No articles match.</td></tr>}
            {data.items.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className={td}><Link href={`/admin/articles/${a.id}`} className="font-medium text-accent-ink hover:underline">{a.title}</Link></td>
                <td className={td}>{a.status.replace('_', ' ')}</td><td className={td}>{a.category}</td><td className={td}>{a.author}</td>
                <td className={td}>{formatDate(a.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-muted">{data.total} total · page {data.page} of {data.totalPages}</p>
    </div>
  );
}
