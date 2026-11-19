import { TrendingManager } from '@/components/admin/trending-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function TrendingAdmin({ searchParams }: { searchParams: Promise<{ status?: string; country?: string }> }) {
  await requireRole('super_admin', 'admin', 'editor');
  const sp = await searchParams;
  const status = ['pending', 'approved', 'rejected', 'expired'].includes(sp.status ?? '') ? sp.status! : '';
  const country = /^[A-Z]{2}$/.test(sp.country ?? '') ? sp.country! : '';
  const [data, countries] = await Promise.all([
    adminGet<{ items: React.ComponentProps<typeof TrendingManager>['items']; total: number }>(`/admin/trending?${new URLSearchParams({ ...(status ? { status } : {}), ...(country ? { country } : {}) })}`),
    adminGet<React.ComponentProps<typeof TrendingManager>['countries']>('/admin/countries'),
  ]);
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-semibold">Trending topics</h1>
      <p className="mb-4 text-sm text-muted">{data.total} topics · link published articles to choose which stories appear with each topic on the homepage.</p>
      <TrendingManager items={data.items} status={status} country={country} countries={countries} />
    </div>
  );
}
