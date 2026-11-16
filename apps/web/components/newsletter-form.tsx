'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '');
    setState({ kind: 'busy' });
    try {
      const res = await fetch('/api/v1/newsletter/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      if (!res.ok) throw new Error(res.status === 429 ? 'Too many attempts. Try again in a minute.' : 'Enter a valid email address.');
      setState({ kind: 'ok', msg: 'Check your inbox to confirm your subscription.' });
    } catch (err) {
      setState({ kind: 'error', msg: err instanceof Error ? err.message : 'Something went wrong. Try again.' });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 max-w-sm" aria-label="Newsletter signup">
      <label htmlFor="nl-email" className="text-sm font-medium text-white">Get the Voxzin Daily Briefing</label>
      <div className="mt-2 flex gap-2">
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50" />
        <button type="submit" disabled={state.kind === 'busy'} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-navy disabled:opacity-60">
          {state.kind === 'busy' ? 'Sending' : 'Subscribe'}
        </button>
      </div>
      <p role="status" className={`mt-2 text-sm ${state.kind === 'error' ? 'text-red-300' : 'text-white/80'}`}>{state.msg}</p>
    </form>
  );
}
