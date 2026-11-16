import { UsersManager } from '@/components/admin/users-manager';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function UsersAdmin() {
  const me = await requireRole('super_admin', 'admin');
  const users = await adminGet<React.ComponentProps<typeof UsersManager>['users']>('/admin/users');
  return (<div><h1 className="mb-6 font-serif text-3xl font-semibold">Users</h1><UsersManager users={users} me={{ id: me.id, role: me.role }} /></div>);
}
