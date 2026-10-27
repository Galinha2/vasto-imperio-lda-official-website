import { NextResponse } from 'next/server';
import { assertSession } from '@/lib/admin/auth.mjs';
import { listSales } from '@/lib/admin/store.mjs';
import { dueFollowUps, followUpToday } from '@/lib/admin/follow-ups.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    assertSession(request);
    const today = followUpToday();
    return NextResponse.json({ reminders: dueFollowUps(await listSales({ includeArchived: true }), today), today }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : 'Não foi possível consultar os contactos agendados.' }, { status: error.status || 500 }); }
}
