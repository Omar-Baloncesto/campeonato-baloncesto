import crypto from 'crypto';

function adminTokenFor(password: string): string {
  const salt = 'bv-admin-v2';
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

export function verifyToken(token: string | null | undefined): boolean {
  const expected = expectedAdminToken();
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
