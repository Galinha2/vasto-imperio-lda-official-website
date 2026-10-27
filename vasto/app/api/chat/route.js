import { deliverChatEmail } from '@/lib/chat-email.mjs';
import { NextResponse } from 'next/server';
import { assertOrigin } from '@/lib/admin/auth.mjs';
import { CHAT_COOKIE, visitorThread, createThread, messages, sendMessage, cleanMessage, setPresence } from '@/lib/chat.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const errorResponse = error => NextResponse.json({ error: error.status ? error.message : 'Não foi possível aceder ao chat. Tente novamente ou ligue +351 928 348 117.' }, { status: error.status || 500 });
export async function GET(request) {
  try {
    const thread = await visitorThread(request.cookies.get(CHAT_COOKIE)?.value);
    return NextResponse.json({ thread: thread ? { name: thread.name } : null, messages: thread ? await messages(thread.id) : [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
export async function POST(request) {
  try {
    assertOrigin(request);
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: 'Mensagem demasiado longa.' }, { status: 413 });
    let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }); }
    let thread = await visitorThread(request.cookies.get(CHAT_COOKIE)?.value);
    if (body.action === 'presence') {
      if (thread) await setPresence(thread.id, body.open === true);
      return NextResponse.json({ ok: true });
    }
    cleanMessage(body.message);
    let token;
    if (!thread) ({ thread, token } = await createThread({ name: body.name, contact: body.contact || '', address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown' }));
    const message = await sendMessage(thread.id, body.message, 'visitor');
    await setPresence(thread.id, true);
    if (token) await deliverChatEmail({ thread, message, kind: 'started' });
    const response = NextResponse.json({ thread: { name: thread.name }, messages: await messages(thread.id) }, { headers: { 'Cache-Control': 'no-store' } });
    if (token) response.cookies.set(CHAT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/chat', maxAge: 30 * 86400 });
    return response;
  } catch (error) { return errorResponse(error); }
}
