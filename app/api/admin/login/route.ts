import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, expectedAdminToken, verifyPassword } from '../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let password = '';
  try {
    const body = await request.json() as { password?: string };
    password = body.password || '';
  } catch {
    return NextResponse.json({ success: false, error: 'bad_request' }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { success: false, error: 'admin_password_not_configured' },
      { status: 500 },
    );
  }

  if (!verifyPassword(password)) {
    return NextResponse.json({ success: false, error: 'invalid_password' }, { status: 401 });
  }

  const token = expectedAdminToken();
  if (!token) {
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 });
  }

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ success: true });
}
