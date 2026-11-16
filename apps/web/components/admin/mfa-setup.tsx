'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, input, label } from './ui';

export function MfaSetup() {
  const router = useRouter();
  const [data, setData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    try { setData(await adminFetch('/auth/mfa/setup', { method: 'POST' })); } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
  }
  async function enable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    try {
      await adminFetch('/auth/mfa/enable', { method: 'POST', body: { code: new FormData(e.currentTarget).get('code') } });
      router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold">Set up two-step verification</h1>
      <p className="mt-2 text-sm text-muted">Your role requires an authenticator app (TOTP). Scan the code, then enter the 6-digit number to finish.</p>
      {!data ? (
        <button onClick={start} className={`${btn} mt-6`}>Start setup</button>
      ) : (
        <form onSubmit={enable} className="mt-6 space-y-4">
          <img src={data.qrDataUrl} alt="QR code for your authenticator app" width={200} height={200} className="rounded border border-line bg-white p-2" />
          <p className="text-xs text-muted">Can’t scan? Enter this key manually: <code className="break-all">{data.secret}</code></p>
          <div><label htmlFor="code" className={label}>6-digit code</label>
            <input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required className={input} /></div>
          <button type="submit" className={btn}>Turn on verification</button>
        </form>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
