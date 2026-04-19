import { NextResponse } from 'next/server';
import { appendVisitRow, readVisitRows } from '../../lib/sheets';
import { isAuthedAdmin } from '../../lib/admin-auth';

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

export async function GET() {
  if (!(await isAuthedAdmin())) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const rows = await readVisitRows();
  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('timestamp')
    ? rows.slice(1)
    : rows;

  const byDay: Record<string, number> = {};
  for (const r of dataRows) {
    const date = (r[1] || '').trim();
    if (!date) continue;
    byDay[date] = (byDay[date] || 0) + 1;
  }

  const today = todayISO();
  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const tz = d.getTimezoneOffset();
    const key = new Date(d.getTime() - tz * 60_000).toISOString().slice(0, 10);
    days.push({ date: key, count: byDay[key] || 0 });
  }

  return NextResponse.json({
    success: true,
    today: byDay[today] || 0,
    total: dataRows.length,
    days,
  });
}
