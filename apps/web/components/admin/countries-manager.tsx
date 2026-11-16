'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label, td, th } from './ui';

type Country = { _id: string; code: string; name: string; order: number; isActive: boolean };

export function CountriesManager({ initial }: { initial: Country[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partial<Country> | null>(null);
  const [error, setError] = useState('');

  async function save() {
    if (!edit) return;
    setError('');
    try {
      await adminFetch(edit._id ? `/admin/countries/${edit._id}` : '/admin/countries', {
        method: edit._id ? 'PATCH' : 'POST',
        body: {
          code: edit.code?.trim().toUpperCase(),
          name: edit.name,
          order: Number(edit.order ?? 0),
          isActive: edit.isActive ?? true,
        },
      });
      setEdit(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full">
          <thead><tr><th className={th}>Order</th><th className={th}>Country</th><th className={th}>Code</th><th className={th}>Active</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{initial.map((country) => (
            <tr key={country._id} className="border-t border-line">
              <td className={td}>{country.order}</td><td className={td}>{country.name}</td><td className={td}>{country.code}</td>
              <td className={td}>{country.isActive ? 'Yes' : 'No'}</td>
              <td className={`${td} text-right`}><button className={btnGhost} onClick={() => setEdit(country)}>Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {!edit && <button className={btn} onClick={() => setEdit({ order: initial.length, isActive: true })}>Add country</button>}
      {edit && (
        <section className={`${card} grid max-w-xl gap-3`}>
          <div><label className={label} htmlFor="country-name">Country name</label><input id="country-name" className={input} maxLength={80} value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><label className={label} htmlFor="country-code">Two-letter code</label><input id="country-code" className={input} maxLength={2} pattern="[A-Za-z]{2}" placeholder="e.g. JP" value={edit.code ?? ''} disabled={Boolean(edit._id)} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></div>
          <div><label className={label} htmlFor="country-order">Display order</label><input id="country-order" type="number" min={0} max={1000} className={input} value={edit.order ?? 0} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active on the public trends pages</label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2"><button className={btn} onClick={save}>Save</button><button className={btnGhost} onClick={() => { setEdit(null); setError(''); }}>Cancel</button></div>
          <p className="text-xs text-muted">Use ISO 3166-1 alpha-2 codes. Deactivating a country hides its trends from public pages without deleting them.</p>
        </section>
      )}
    </div>
  );
}
