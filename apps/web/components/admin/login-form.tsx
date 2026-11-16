'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, input, label } from './ui';

type Me = { mfaEnabled: boolean; mfaRequired: boolean; mfaVerified: boolean };

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      if (step === 'password') {
        const me = await adminFetch<Me>('/auth/login', { method: 'POST', body: { email: f.get('email'), password: f.get('password') } });
        if (me.mfaRequired && me.mfaEnabled) { setStep('code'); return; }
      } else {
        await adminFetch('/auth/mfa/verify', { method: 'POST', body: { code: f.get('code') } });
      }
      router.replace('/admin'); // the panel shows MFA setup if a privileged account hasn't enabled it yet
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {step === 'password' ? (
        <>
          <div><label className={label} htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" className={input} /></div>
          <div><label className={label} htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className={input} /></div>
        </>
      ) : (
        <div>
          <label className={label} htmlFor="code">Authentication code</label>
          <input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoFocus autoComplete="one-time-code" className={input} />
          <p className="mt-1 text-xs text-muted">Enter the 6-digit code from your authenticator app.</p>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${btn} w-full`}>{busy ? 'Checking…' : step === 'password' ? 'Sign in' : 'Verify'}</button>
    </form>
  );
}
