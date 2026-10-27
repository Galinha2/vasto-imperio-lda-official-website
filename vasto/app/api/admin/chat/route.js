import { deliverChatEmail } from '@/lib/chat-email.mjs';
import { contactEmail } from '@/lib/chat-email.mjs';
import { NextResponse } from 'next/server';
import { assertSession, assertOrigin } from '@/lib/admin/auth.mjs';
import { listThreads, messages, sendMessage, threadExists, visitorIsPresent, incomingMessages, deleteThread, unreadChatCounts, markChatRead } from '@/lib/chat.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const failure = error => NextResponse.json({ error: error.status ? error.message : 'Não foi possível aceder às conversas.' }, { status: error.status || 500 });
export async function GET(request) {
  try {
    assertSession(request);
    const params = new URL(request.url).searchParams;
    if (params.has('unread')) return NextResponse.json({ counts: await unreadChatCounts() }, { headers: { 'Cache-Control': 'no-store' } });
    if (params.has('notifications')) return NextResponse.json(await incomingMessages(params.get('since')), { headers: { 'Cache-Control': 'no-store' } });
    const id = params.get('id');
    if (id) await threadExists(id);
    return NextResponse.json(id ? { messages: await messages(id) } : { threads: await listThreads() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    assertSession(request); assertOrigin(request);
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: 'Mensagem demasiado longa.' }, { status: 413 });
    let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }); }
    const thread = await threadExists(body.id);
    const message = await sendMessage(body.id, body.message, 'staff');
    let email = { status: 'visitor_present' };
    if (!contactEmail(thread.contact)) email = { status: 'no_email' };
    else {
      // If presence cannot be read, prefer sending the reply by email.
      let present = false;
      try { present = await visitorIsPresent(body.id); } catch { /* Email is the fallback. */ }
      if (!present) email = await deliverChatEmail({ thread, message, kind: 'reply' });
    }
    return NextResponse.json({ messages: await messages(body.id), email });
  } catch (error) { return failure(error); }
}

export async function DELETE(request) {
  try {
    assertSession(request); assertOrigin(request);
    await deleteThread(new URL(request.url).searchParams.get('id'));
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}

export async function PATCH(request) {
  try {
    assertSession(request); assertOrigin(request);
    const raw = await request.text();
    if (raw.length > 25000) return NextResponse.json({ error: 'Pedido demasiado longo.' }, { status: 413 });
    let body; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }); }
    await markChatRead(body.id, body.messageIds);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return failure(error); }
}
