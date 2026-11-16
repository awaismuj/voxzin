import { AuthorsManager } from '@/components/admin/authors-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function AuthorsAdmin() {
  await requireRole('super_admin', 'admin');
  const initial = await adminGet<React.ComponentProps<typeof AuthorsManager>['initial']>('/admin/authors');
  return (<div><h1 className="mb-6 font-serif text-3xl font-semibold">Authors</h1><AuthorsManager initial={initial} /></div>);
}
