'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, input, label } from './ui';

export function AcceptInviteForm() {
  const [token, setToken] = useState('');
  const [tokenReady, setTokenReady] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);
    setTokenReady(true);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password !== form.get('confirmPassword')) {
      setError('The passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await adminFetch('/auth/invitations/accept', { method: 'POST', body: { token, password } });
      setComplete(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this invitation');
    } finally {
      setBusy(false);
    }
  }

  if (complete) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm">Your password is set. Sign in to finish setting up two-step verification.</p>
        <Link href="/admin/login" className={`${btn} inline-block`}>Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {tokenReady && !token && <p role="alert" className="text-sm text-red-600">This invitation link is incomplete. Ask your administrator to send another.</p>}
      <div>
        <label className={label} htmlFor="password">Create password</label>
        <input id="password" name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" className={input} />
        <p className="mt-1 text-xs text-muted">Use at least 12 characters.</p>
      </div>
      <div>
        <label className={label} htmlFor="confirmPassword">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" required minLength={12} maxLength={200} autoComplete="new-password" className={input} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy || !tokenReady || !token} className={`${btn} w-full`}>{busy ? 'Setting password…' : 'Accept invitation'}</button>
    </form>
  );
}
