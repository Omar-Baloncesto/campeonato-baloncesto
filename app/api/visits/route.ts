import { NextResponse } from 'next/server';
import { appendVisitRow, readVisitRows } from '../../lib/sheets';
import { verifyToken } from '../../lib/admin-auth';

export const dynamic = 'force-dynamic';

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tz * 60_000);
  return local.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const ua = (request.headers.get('user-agent') || '').slice(0, 200);
  const now = new Date().toISOString();
  const date = todayISO();

  const result = await appendVisitRow([now, date, ua, '']);
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 200 });
  }
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!verifyToken(token)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const rows = await readVisitRows();
  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('timestamp')
    ? rows.slice(1)
    : rows;

  const byDay: Record<string, number> = {};
  let firstDate = '';
  for (const r of dataRows) {
    const date = (r[1] || '').trim();
    if (!date) continue;
    byDay[date] = (byDay[date] || 0) + 1;
    if (!firstDate || date < firstDate) firstDate = date;
  }

  const today = todayISO();

  return NextResponse.json({
    success: true,
    today: byDay[today] || 0,
    total: dataRows.length,
    byDay,
    firstDate,
  });
}
