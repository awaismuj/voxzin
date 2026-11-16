import type { MediaAssetDto } from '@voxzin/shared';
import { MediaLibrary } from '@/components/admin/media-library';
import { adminGet, requireRole } from '@/lib/admin-server';

type MediaPage = { items: MediaAssetDto[]; page: number; totalPages: number; total: number };

export default async function MediaAdmin() {
  await requireRole('super_admin', 'admin', 'editor', 'author');
  const initial = await adminGet<MediaPage>('/media?page=1&limit=30');
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-semibold">Media library</h1>
      <p className="mb-6 text-sm text-muted">Upload images once, add accessible descriptions, and reuse them across articles.</p>
      <MediaLibrary initial={initial} />
    </div>
  );
}
