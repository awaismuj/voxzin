import { redirect } from 'next/navigation';
import { adminGet, getMe } from '@/lib/admin-server';
import { card } from '@/components/admin/ui';

interface Stats { articles: Record<string, number>; categories: number; authors: number; trends: { pending: number; approved: number }; subscribers: number }

export default async function Dashboard() {
  const me = await getMe();
  if (me?.role === 'author') redirect('/admin/articles');
  const s = await adminGet<Stats>('/admin/stats');
  const a = s.articles;
  const total = Object.values(a).reduce((x, y) => x + y, 0);
  const tiles: [string, number][] = [
    ['Total articles', total], ['Published', a.published ?? 0], ['Drafts', a.draft ?? 0], ['Scheduled', a.scheduled ?? 0],
    ['Awaiting review', a.in_review ?? 0], ['Categories', s.categories], ['Authors', s.authors],
    ['Trends pending review', s.trends.pending], ['Trends approved', s.trends.approved], ['Newsletter subscribers', s.subscribers],
  ];
  return (
    <div>
      <h1 className="font-serif text-3xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Traffic and revenue analytics appear here once an analytics provider is configured.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map(([k, v]) => (
          <li key={k} className={card}><p className="text-3xl font-semibold">{v}</p><p className="mt-1 text-sm text-muted">{k}</p></li>
        ))}
      </ul>
    </div>
  );
}
