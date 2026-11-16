import 'server-only';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { Role } from '@voxzin/shared';
import { ApiError } from './api';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000/v1';

export interface Me { id: string; email: string; name: string; role: Role; mfaEnabled: boolean; mfaVerified: boolean; mfaRequired: boolean }

/** Server-side call that forwards the visitor's session cookie. Never cached. */
export async function adminGet<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API_URL}${path}`, { headers: { cookie: jar.toString() }, cache: 'no-store' });
  if (!res.ok) throw new ApiError(res.status, `Admin request failed (${res.status})`);
  return (await res.json()) as T;
}

export async function getMe(): Promise<Me | null> {
  try {
    return await adminGet<Me>('/auth/me');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

/** Page-level guard on top of the API's own enforcement (which is the real security boundary). */
export async function requireRole(...roles: Role[]): Promise<Me> {
  const me = await getMe();
  if (!me) redirect('/admin/login');
  if (!roles.includes(me.role)) notFound();
  return me;
}
