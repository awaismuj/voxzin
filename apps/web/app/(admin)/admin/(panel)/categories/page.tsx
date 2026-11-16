import { CategoriesManager } from '@/components/admin/categories-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function CategoriesAdmin() {
  await requireRole('super_admin', 'admin');
  const initial = await adminGet<React.ComponentProps<typeof CategoriesManager>['initial']>('/admin/categories');
  return (<div><h1 className="mb-6 font-serif text-3xl font-semibold">Categories</h1><CategoriesManager initial={initial} /></div>);
}
