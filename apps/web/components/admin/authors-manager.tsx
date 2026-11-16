'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { slugify } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label, td, th } from './ui';

type Author = { _id: string; name: string; slug: string; designation?: string; bio?: string; isActive: boolean };

export function AuthorsManager({ initial }: { initial: Author[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Author> | null>(null);
  const [error, setError] = useState('');

  async function save() {
    if (!edit) return;
    setError('');
    const body = { name: edit.name, slug: edit.slug || slugify(edit.name ?? ''), designation: edit.designation || undefined, bio: edit.bio || undefined, isActive: edit.isActive ?? true };
    try {
      await adminFetch(edit._id ? `/admin/authors/${edit._id}` : '/admin/authors', { method: edit._id ? 'PATCH' : 'POST', body });
      setEdit(null); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
  }

  return (
    <div className="space-y-6">
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full"><thead><tr><th className={th}>Name</th><th className={th}>Designation</th><th className={th}>Slug</th><th className={th}>Active</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{initial.map((a) => (
            <tr key={a._id} className="border-t border-line"><td className={td}>{a.name}</td><td className={td}>{a.designation}</td><td className={td}>{a.slug}</td><td className={td}>{a.isActive ? 'Yes' : 'No'}</td>
              <td className={`${td} text-right`}><button className={btnGhost} onClick={() => setEdit(a)}>Edit</button></td></tr>))}</tbody></table>
      </div>
      {!edit && <button className={btn} onClick={() => setEdit({ isActive: true })}>Add author</button>}
      {edit && (
        <div className={`${card} grid max-w-xl gap-3`}>
          <div><label className={label} htmlFor="an">Name</label><input id="an" className={input} value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><label className={label} htmlFor="as">Slug</label><input id="as" className={input} placeholder={slugify(edit.name ?? '')} value={edit.slug ?? ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="ad">Designation</label><input id="ad" className={input} value={edit.designation ?? ''} onChange={(e) => setEdit({ ...edit, designation: e.target.value })} /></div>
          <div><label className={label} htmlFor="ab">Biography</label><textarea id="ab" rows={3} className={input} value={edit.bio ?? ''} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><button className={btn} onClick={save}>Save</button><button className={btnGhost} onClick={() => setEdit(null)}>Cancel</button></div>
        </div>
      )}
    </div>
  );
}
