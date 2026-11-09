import { NextResponse } from 'next/server';
import { assertSession } from '@/lib/admin/auth.mjs';
import { saleNotifications } from '@/lib/admin/store.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    assertSession(request);
    const since = new URL(request.url).searchParams.get('since') || undefined;
    return NextResponse.json(await saleNotifications(since), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : 'Não foi possível consultar novas vendas.' }, { status: error.status || 500 });
  }
}
