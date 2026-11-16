'use client';

import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/admin-client';
import { btnGhost } from './ui';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button className={btnGhost} onClick={async () => { await adminFetch('/auth/logout', { method: 'POST' }).catch(() => undefined); router.replace('/admin/login'); router.refresh(); }}>
      Sign out
    </button>
  );
}
