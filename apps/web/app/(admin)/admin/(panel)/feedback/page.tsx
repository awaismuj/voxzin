import { FeedbackManager } from '@/components/admin/feedback-manager';
import { adminGet, requireRole } from '@/lib/admin-server';
import type { AdminArticleFeedbackDto, Paginated } from '@voxzin/shared';

type Props = { searchParams: Promise<{ status?: string; active?: string; page?: string }> };

export default async function FeedbackAdmin({ searchParams }: Props) {
  await requireRole('super_admin', 'admin', 'editor');
  const params = await searchParams;
  const status = params.status === undefined ? 'pending' : params.status === 'approved' || params.status === 'pending' ? params.status : '';
  const active = params.active === 'active' || params.active === 'inactive' ? params.active : '';
  const page = params.page && /^\d+$/.test(params.page) && Number(params.page) > 0 ? Number(params.page) : 1;
  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set('status', status);
  if (active) query.set('active', active);
  const initial = await adminGet<Paginated<AdminArticleFeedbackDto>>(`/admin/feedback?${query}`);
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-semibold">Reader feedback</h1>
      <p className="mb-6 text-sm text-muted">Review submissions before they appear publicly. Approved feedback can be activated or hidden at any time.</p>
      <FeedbackManager initial={initial} status={status} active={active} />
    </div>
  );
}
