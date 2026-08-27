import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGoogleAccessToken, hasGoogleAccount } from '@/lib/google';

// แปลงวัน/เวลาเป็นรูปแบบของ Eddy โดยอิงเวลาไทย
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);

interface GoogleApiEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function mapEvent(it: GoogleApiEvent) {
  const title = it.summary?.trim() || '(ไม่มีชื่อ)';
  // กิจกรรมทั้งวัน (มีแต่ date ไม่มีเวลา)
  if (it.start?.date) {
    return { id: `gcal:${it.id}`, title, date: it.start.date, location: it.location, source: 'google' as const };
  }
  // กิจกรรมมีเวลา
  if (it.start?.dateTime) {
    const s = new Date(it.start.dateTime);
    const e = it.end?.dateTime ? new Date(it.end.dateTime) : null;
    return {
      id: `gcal:${it.id}`,
      title,
      date: fmtDate(s),
      startTime: fmtTime(s),
      endTime: e ? fmtTime(e) : undefined,
      location: it.location,
      source: 'google' as const,
    };
  }
  return null;
}

// GET /api/google/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
// ดึงกิจกรรมจากปฏิทินหลัก (primary) ของผู้ใช้ในช่วงที่กำหนด (อ่านอย่างเดียว)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getGoogleAccessToken(session.user.id);
  if (!token) {
    // แยกว่า "ยังไม่ได้เชื่อมบัญชี Google" (ให้กดเชื่อม) vs "เชื่อมแล้วแต่ token มีปัญหา"
    const linked = await hasGoogleAccount(session.user.id);
    return NextResponse.json({ connected: false, hasAccount: linked, events: [] });
  }

  const start = req.nextUrl.searchParams.get('start');
  const end = req.nextUrl.searchParams.get('end');
  const timeMin = start && /^\d{4}-\d{2}-\d{2}$/.test(start)
    ? new Date(`${start}T00:00:00+07:00`).toISOString()
    : new Date().toISOString();
  const timeMax = end && /^\d{4}-\d{2}-\d{2}$/.test(end)
    ? new Date(`${end}T23:59:59+07:00`).toISOString()
    : new Date(Date.now() + 60 * 86400000).toISOString();

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?singleEvents=true&orderBy=startTime&maxResults=250` +
    `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    // เชื่อมบัญชีแล้ว (มี token) แต่เรียก API ไม่สำเร็จ - ส่งเหตุผลให้ฝั่ง client แสดง
    // 403 มักแปลว่ายังไม่ได้เปิดใช้ Google Calendar API ในโปรเจกต์
    const reason = res.status === 403 ? 'api-disabled' : res.status === 401 ? 'auth' : 'error';
    return NextResponse.json({ connected: false, hasAccount: true, error: reason, events: [] });
  }

  const data = await res.json();
  const events = ((data.items ?? []) as GoogleApiEvent[])
    .filter((it) => it.status !== 'cancelled')
    .map(mapEvent)
    .filter(Boolean);

  return NextResponse.json({ connected: true, hasAccount: true, events });
}
