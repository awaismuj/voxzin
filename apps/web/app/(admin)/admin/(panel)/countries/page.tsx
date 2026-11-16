import { CountriesManager } from '@/components/admin/countries-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function CountriesAdmin() {
  await requireRole('super_admin', 'admin');
  const initial = await adminGet<React.ComponentProps<typeof CountriesManager>['initial']>('/admin/countries');
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-semibold">Countries</h1>
      <p className="mb-6 text-sm text-muted">Manage the country options used by the trending dashboard.</p>
      <CountriesManager initial={initial} />
    </div>
  );
}
