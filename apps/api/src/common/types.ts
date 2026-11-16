import type { Request } from 'express';
import type { Model, Types } from 'mongoose';
import type { Role } from '@voxzin/shared';

export type M = Model<Record<string, unknown> & { _id: Types.ObjectId }>;
type Id = { toString(): string };

export interface AuthUser {
  _id: Id;
  email: string;
  name: string;
  role: Role;
  authorId?: Id;
  isActive: boolean;
  mfa?: { secretEnc?: string; enabled?: boolean };
}
export interface AuthSession {
  _id: Id;
  mfaVerified: boolean;
}
export interface AuthedRequest extends Request {
  cookies: Record<string, string>;
  auth: { user: AuthUser; session: AuthSession };
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
