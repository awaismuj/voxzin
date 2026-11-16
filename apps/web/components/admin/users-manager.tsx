'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ROLES, ROLE_RANK, type Role } from '@voxzin/shared';
import { adminFetch } from '@/lib/admin-client';
import { btn, btnGhost, card, input, label, td, th } from './ui';

type U = { _id: string; email: string; name: string; role: Role; isActive: boolean; invitePending?: boolean; mfa?: { enabled?: boolean } };

export function UsersManager({ users, me }: { users: U[]; me: { id: string; role: Role } }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const assignable = ROLES.filter((r) => me.role === 'super_admin' || ROLE_RANK[r] < ROLE_RANK[me.role]);
  const manageable = (u: U) => u._id !== me.id && (me.role === 'super_admin' || ROLE_RANK[u.role] < ROLE_RANK[me.role]);

  async function act(fn: () => Promise<unknown>, success?: string) {
    setError('');
    setNotice('');
    try { await fn(); if (success) setNotice(success); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
  }
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    await act(async () => { await adminFetch('/admin/users', { method: 'POST', body: { email: f.get('email'), name: f.get('name'), role: f.get('role') } }); form.reset(); }, 'Invitation sent. It expires in 24 hours.');
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full"><thead><tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>MFA</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u._id} className="border-t border-line">
              <td className={td}>{u.name}</td><td className={td}>{u.email}</td>
              <td className={td}>{manageable(u) ? (
                <select aria-label={`Role for ${u.name}`} className="rounded border border-line bg-surface px-2 py-1 text-sm" value={u.role} onChange={(e) => act(() => adminFetch(`/admin/users/${u._id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                  {assignable.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>) : u.role.replace('_', ' ')}</td>
              <td className={td}>{u.mfa?.enabled ? 'On' : 'Off'}</td><td className={td}>{u.invitePending ? 'Invitation pending' : u.isActive ? 'Active' : 'Inactive'}</td>
              <td className={`${td} space-x-2 text-right`}>
                {manageable(u) && <>
                  {u.invitePending && <button className={btnGhost} onClick={() => act(() => adminFetch(`/admin/users/${u._id}/invite`, { method: 'POST' }), 'Invitation resent. It expires in 24 hours.')}>Resend invite</button>}
                  <button className={btnGhost} onClick={() => act(() => adminFetch(`/admin/users/${u._id}`, { method: 'PATCH', body: { isActive: !u.isActive } }))}>{u.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className={btnGhost} onClick={() => act(() => adminFetch(`/admin/users/${u._id}/revoke-sessions`, { method: 'POST' }))}>Sign out everywhere</button>
                  {me.role === 'super_admin' && <button className={btnGhost} onClick={() => window.confirm(`Reset two-step verification for ${u.email}?`) && act(() => adminFetch(`/admin/users/${u._id}/reset-mfa`, { method: 'POST' }))}>Reset MFA</button>}
                </>}
              </td>
            </tr>))}</tbody></table>
      </div>
      <form onSubmit={create} className={`${card} grid max-w-xl gap-3`}>
        <h2 className="font-semibold">Invite a team member</h2>
        <p className="text-sm text-muted">We’ll email them a secure, one-time link to create their password. The link expires in 24 hours; two-step verification is required at first sign-in.</p>
        <div><label className={label} htmlFor="un">Name</label><input id="un" name="name" required className={input} /></div>
        <div><label className={label} htmlFor="ue">Email</label><input id="ue" name="email" type="email" required className={input} /></div>
        <div><label className={label} htmlFor="ur">Role</label><select id="ur" name="role" className={input}>{assignable.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select></div>
        <button className={btn}>Send invitation</button>
      </form>
    </div>
  );
}
