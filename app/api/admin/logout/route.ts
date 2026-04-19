import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  store.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return NextResponse.json({ success: true });
}
