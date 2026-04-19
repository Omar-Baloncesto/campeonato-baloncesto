import { NextResponse } from 'next/server';
import { expectedAdminToken, verifyPassword } from '../../../lib/admin-auth';

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

  return NextResponse.json({ success: true, token });
}
