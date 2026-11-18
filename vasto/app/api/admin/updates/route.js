import { NextResponse } from 'next/server';
import { assertSession } from '@/lib/admin/auth.mjs';
import { adminUpdates } from '@/lib/admin/updates.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request) {
  try {
    assertSession(request);
    const params = new URL(request.url).searchParams;
    const data = await adminUpdates({ salesSince: params.get('salesSince') || undefined, chatSince: params.get('chatSince') || undefined });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : 'Não foi possível atualizar os avisos.' }, { status: error.status || 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
