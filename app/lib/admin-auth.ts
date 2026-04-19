import crypto from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'bv_admin';

function adminTokenFor(password: string): string {
  const salt = 'bv-admin-v1';
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function expectedAdminToken(): string | null {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd) return null;
  return adminTokenFor(pwd);
}

export function verifyPassword(submitted: string): boolean {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd || !submitted) return false;
  const a = Buffer.from(adminTokenFor(pwd));
  const b = Buffer.from(adminTokenFor(submitted));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isAuthedAdmin(): Promise<boolean> {
  const expected = expectedAdminToken();
  if (!expected) return false;
  const store = await cookies();
  const c = store.get(ADMIN_COOKIE);
  if (!c) return false;
  const a = Buffer.from(c.value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
