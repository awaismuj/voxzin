'use client';

import { useState } from 'react';

export function NewsletterAction({ action, email, token }: { action: 'confirm' | 'unsubscribe'; email: string; token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const label = action === 'confirm' ? 'Confirm subscription' : 'Unsubscribe';
  async function run() {
    setState('busy');
    const res = await fetch(`/api/v1/newsletter/${action}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, token }) });
    setState(res.ok ? 'done' : 'error');
  }
  if (state === 'done') return <p role="status" className="font-medium">{action === 'confirm' ? 'You’re subscribed. See you in the briefing.' : 'You’ve been unsubscribed.'}</p>;
  return (
    <div>
      <button type="button" onClick={run} disabled={state === 'busy'} className="rounded-md bg-navy px-5 py-2.5 font-medium text-white disabled:opacity-60">{label}</button>
      {state === 'error' && <p role="alert" className="mt-3 text-sm text-red-600">This link is not valid or has expired. Request a new one from the site footer.</p>}
    </div>
  );
}
