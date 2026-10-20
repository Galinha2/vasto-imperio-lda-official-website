import { NextResponse } from 'next/server';
import { assertOrigin, assertSession } from '@/lib/admin/auth.mjs';
import { improveEmailMessage } from '@/lib/email/improve-message.mjs';

export const runtime = 'nodejs';
export const maxDuration = 30;
export async function POST(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    if (Number(request.headers.get('content-length')) > 65000) return NextResponse.json({ error: 'Mensagem demasiado grande.' }, { status: 413 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Mensagem inválida.' }, { status: 400 }); }
    return NextResponse.json({ message: await improveEmailMessage(body?.message) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : 'Não foi possível melhorar a mensagem. O texto original foi mantido.' }, { status: error.status || 500 });
  }
}
