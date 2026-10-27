import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createThread, visitorThread, messages, sendMessage, listThreads, cleanMessage, threadExists } from '../lib/chat.mjs';
test('conversas privadas, respostas, validação e limites', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vasto-chat-'));
  const original = { ...process.env };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.VERCEL;
  process.env.ADMIN_DATA_DIR = dir;
  try {
    const first = await createThread({ name: 'Ana', contact: 'ana@example.com', address: 'test-a' });
    const second = await createThread({ name: 'João', contact: '', address: 'test-b' });
    assert.equal((await visitorThread(first.token)).id, first.thread.id);
    assert.equal(await visitorThread('invalid'), null);
    assert.equal(await visitorThread('a'.repeat(64)), null);
    await sendMessage(first.thread.id, 'Preciso de informações', 'visitor');
    await sendMessage(first.thread.id, 'Como podemos ajudar?', 'staff');
    assert.equal((await messages(first.thread.id)).length, 2);
    assert.deepEqual(await messages(second.thread.id), []);
    await assert.rejects(sendMessage(first.thread.id, 'Spam', 'visitor'), { status: 429 });
    assert.throws(() => cleanMessage(' '), { status: 400 });
    assert.throws(() => cleanMessage('x'.repeat(2001)), { status: 400 });
    await assert.rejects(threadExists('../secret'), { status: 400 });
    await assert.rejects(threadExists('b'.repeat(64)), { status: 404 });
    assert.ok((await listThreads()).every(t => !('ip_hash' in t)));
    for (let i = 0; i < 4; i++) await createThread({ name: 'Ana', contact: '', address: 'test-a' });
    await assert.rejects(createThread({ name: 'Ana', contact: '', address: 'test-a' }), { status: 429 });
  } finally { process.env = original; await rm(dir, { recursive: true, force: true }); }
});

test('presença expira, fechar chat desativa presença e feed inclui cada mensagem de visitante', async () => {
  const { setPresence, visitorIsPresent, incomingMessages } = await import('../lib/chat.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vasto-chat-presence-'));
  const original = { ...process.env };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.VERCEL;
  process.env.ADMIN_DATA_DIR = dir;
  try {
    const { thread } = await createThread({ name: 'Ana', contact: 'ana@example.com', address: 'presence-test' });
    assert.equal(await visitorIsPresent(thread.id), false);
    await setPresence(thread.id, true);
    assert.equal(await visitorIsPresent(thread.id), true);
    assert.equal(await visitorIsPresent(thread.id, Date.now() + 36000), false);
    await setPresence(thread.id, false);
    assert.equal(await visitorIsPresent(thread.id), false);
    assert.deepEqual((await incomingMessages()).messages, []);
    const since = new Date(Date.now() - 1000).toISOString();
    const first = await sendMessage(thread.id, 'Uma dúvida', 'visitor');
    await sendMessage(thread.id, 'A nossa resposta', 'staff');
    const feed = await incomingMessages(since);
    assert.deepEqual(feed.messages.map(m => m.id), [first.id]);
    await assert.rejects(incomingMessages('invalid'), { status: 400 });
  } finally { process.env = original; await rm(dir, { recursive: true, force: true }); }
});

test('apagar remove só a conversa escolhida, mensagens e presença', async () => {
  const { deleteThread, setPresence, visitorIsPresent } = await import('../lib/chat.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vasto-chat-delete-'));
  const original = { ...process.env };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.VERCEL;
  process.env.ADMIN_DATA_DIR = dir;
  try {
    const first = await createThread({ name:'Ana', contact:'', address:'delete-a' });
    const second = await createThread({ name:'João', contact:'', address:'delete-b' });
    await sendMessage(first.thread.id, 'Mensagem a apagar', 'visitor');
    await sendMessage(second.thread.id, 'Mensagem a manter', 'visitor');
    await setPresence(first.thread.id, true);
    await assert.rejects(deleteThread('../secret'), { status:400 });
    await deleteThread(first.thread.id);
    assert.equal(await visitorThread(first.token), null);
    assert.deepEqual(await messages(first.thread.id), []);
    assert.equal(await visitorIsPresent(first.thread.id), false);
    assert.equal((await listThreads()).length, 1);
    assert.equal((await messages(second.thread.id))[0].body, 'Mensagem a manter');
    await deleteThread(first.thread.id); // Repetir não apaga outra conversa.
    assert.equal((await visitorThread(second.token)).id, second.thread.id);
  } finally { process.env = original; await rm(dir, { recursive:true, force:true }); }
});

test('contadores por conversa, leitura limitada às mensagens vistas e exclusão das respostas do admin', async () => {
  const { unreadChatCounts, markChatRead, deleteThread } = await import('../lib/chat.mjs');
  const dir = await mkdtemp(path.join(os.tmpdir(), 'vasto-chat-unread-'));
  const original = { ...process.env };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.VERCEL;
  process.env.ADMIN_DATA_DIR = dir;
  try {
    const a = (await createThread({ name:'Ana', contact:'', address:'read-a' })).thread;
    const b = (await createThread({ name:'João', contact:'', address:'read-b' })).thread;
    const first = await sendMessage(a.id, 'Primeira mensagem', 'visitor');
    const other = await sendMessage(b.id, 'Outra conversa', 'visitor');
    await sendMessage(a.id, 'Resposta', 'staff');
    assert.deepEqual(await unreadChatCounts(), { [a.id]:1, [b.id]:1 });
    await markChatRead(a.id, [other.id]);
    assert.equal((await unreadChatCounts())[b.id], 1);
    await markChatRead(a.id, [first.id]);
    assert.deepEqual(await unreadChatCounts(), { [b.id]:1 });
    assert.ok((await messages(a.id))[0].admin_read_at);
    await markChatRead(a.id, [first.id]);
    assert.deepEqual(await unreadChatCounts(), { [b.id]:1 });
    await assert.rejects(markChatRead(a.id, ['../secret']), { status:400 });
    await deleteThread(b.id);
    assert.deepEqual(await unreadChatCounts(), {});
  } finally { process.env = original; await rm(dir, { recursive:true, force:true }); }
});
