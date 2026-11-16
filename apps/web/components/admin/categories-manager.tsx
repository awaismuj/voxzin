'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugify } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label, td, th } from './ui';

type Cat = { _id: string; name: string; slug: string; description?: string; order: number; isActive: boolean };

export function CategoriesManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Cat> | null>(null);
  const [error, setError] = useState('');

  async function save() {
    if (!edit) return;
    setError('');
    const body = { name: edit.name, slug: edit.slug || slugify(edit.name ?? ''), description: edit.description ?? '', order: Number(edit.order ?? 0), isActive: edit.isActive ?? true };
    try {
      await adminFetch(edit._id ? `/admin/categories/${edit._id}` : '/admin/categories', { method: edit._id ? 'PATCH' : 'POST', body });
      setEdit(null); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
  }
  async function remove(c: Cat) {
    if (!window.confirm(`Delete “${c.name}”?`)) return;
    try { await adminFetch(`/admin/categories/${c._id}`, { method: 'DELETE' }); router.refresh(); } catch (e) { window.alert(e instanceof Error ? e.message : 'Delete failed'); }
  }

  return (
    <div className="space-y-6">
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full"><thead><tr><th className={th}>Order</th><th className={th}>Name</th><th className={th}>Slug</th><th className={th}>Active</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{initial.map((c) => (
            <tr key={c._id} className="border-t border-line"><td className={td}>{c.order}</td><td className={td}>{c.name}</td><td className={td}>/{c.slug}</td><td className={td}>{c.isActive ? 'Yes' : 'No'}</td>
              <td className={`${td} space-x-2 text-right`}><button className={btnGhost} onClick={() => setEdit(c)}>Edit</button><button className={btnGhost} onClick={() => remove(c)}>Delete</button></td></tr>))}</tbody></table>
      </div>
      {!edit && <button className={btn} onClick={() => setEdit({ order: initial.length, isActive: true })}>Add category</button>}
      {edit && (
        <div className={`${card} grid max-w-xl gap-3`}>
          <div><label className={label} htmlFor="cn">Name</label><input id="cn" className={input} value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><label className={label} htmlFor="cs">Slug</label><input id="cs" className={input} placeholder={slugify(edit.name ?? '')} value={edit.slug ?? ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="cd">Description</label><textarea id="cd" rows={2} className={input} value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
          <div><label className={label} htmlFor="co">Display order</label><input id="co" type="number" min={0} className={input} value={edit.order ?? 0} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><button className={btn} onClick={save}>Save</button><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button></div>
          <p className="text-xs text-muted">Active categories appear automatically in the public navigation, homepage, and sitemap.</p>
        </div>
      )}
    </div>
  );
}
