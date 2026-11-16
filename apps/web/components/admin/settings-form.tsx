'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, card, input, label } from './ui';

type S = { brandName: string; tagline: string; contactEmail: string; publishingTargetPerDay: number; social?: { x?: string; facebook?: string; youtube?: string; linkedin?: string } };

export function SettingsForm({ initial }: { initial: S }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) ?? '');
    try {
      await adminFetch('/admin/settings', { method: 'PUT', body: {
        brandName: g('brandName'), tagline: g('tagline'), contactEmail: g('contactEmail'), publishingTargetPerDay: Number(g('target')),
        social: { x: g('x'), facebook: g('facebook'), youtube: g('youtube'), linkedin: g('linkedin') },
      } });
      setMsg({ ok: true, text: 'Settings saved.' });
    } catch (err) { setMsg({ ok: false, text: err instanceof Error ? err.message : 'Save failed' }); }
  }
  const field = (id: string, text: string, value: string | number | undefined, type = 'text') => (
    <div><label className={label} htmlFor={id}>{text}</label><input id={id} name={id} type={type} defaultValue={value} className={input} /></div>
  );
  return (
    <form onSubmit={save} className={`${card} grid max-w-xl gap-3`}>
      {field('brandName', 'Brand name', initial.brandName)}
      {field('tagline', 'Tagline', initial.tagline)}
      {field('contactEmail', 'Contact email', initial.contactEmail, 'email')}
      {field('target', 'Daily publishing target (articles)', initial.publishingTargetPerDay, 'number')}
      {field('x', 'X link (https)', initial.social?.x, 'url')}
      {field('facebook', 'Facebook link (https)', initial.social?.facebook, 'url')}
      {field('youtube', 'YouTube link (https)', initial.social?.youtube, 'url')}
      {field('linkedin', 'LinkedIn link (https)', initial.social?.linkedin, 'url')}
      <button className={btn}>Save settings</button>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? '' : 'text-red-600'}`}>{msg.text}</p>}
      <p className="text-xs text-muted">Logo, navigation, homepage section ordering, ad placements and analytics keys are not editable here yet.</p>
    </form>
  );
}
