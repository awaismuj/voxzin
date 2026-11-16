import { SettingsForm } from '@/components/admin/settings-form';
import { adminGet, requireRole } from '@/lib/admin-server';

export default async function SettingsAdmin() {
  await requireRole('super_admin', 'admin');
  const initial = await adminGet<React.ComponentProps<typeof SettingsForm>['initial']>('/admin/settings');
  return (<div><h1 className="mb-6 font-serif text-3xl font-semibold">Settings</h1><SettingsForm initial={initial} /></div>);
}
