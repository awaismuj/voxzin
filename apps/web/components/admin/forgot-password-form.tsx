'use client';

import Link from 'next/link';
import { useState } from 'react';
import { adminFetch } from '@/lib/admin-client';
import { btn, input, label } from './ui';

export function ForgotPasswordForm() {
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    setBusy(true);
    setError('');
    try {
      await adminFetch('/auth/password-reset/request', { method: 'POST', body: { email } });
      setSentTo(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email. Try again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <p role="status" className="text-sm">
          If an account exists for <strong>{sentTo}</strong>, a password reset link is on its way. It works for 30 minutes and can be used once.
        </p>
        <p className="text-xs text-muted">Nothing arrived? Check your spam folder, or wait a minute and try again.</p>
        <Link href="/admin/login" className="text-sm font-medium underline">Back to sign in</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" className={input} />
        <p className="mt-1 text-xs text-muted">We will email you a link to choose a new password.</p>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className={`${btn} w-full`}>{busy ? 'Sending…' : 'Send reset link'}</button>
      <p className="text-center text-sm"><Link href="/admin/login" className="underline">Back to sign in</Link></p>
    </form>
  );
}
