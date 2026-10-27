import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { storageMode } from './admin/store.mjs';
export const CHAT_COOKIE = 'vasto_chat';
const fail = (message, status) => Object.assign(new Error(message), { status });
const hash = value => createHash('sha256').update(value).digest('hex');
const dir = () => path.resolve(process.env.ADMIN_DATA_DIR || '.admin-data', 'chat');
async function cloud(endpoint, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${endpoint}`, { ...options, cache: 'no-store', headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', ...options.headers } });
  if (!response.ok) throw fail('O chat está temporariamente indisponível. Pode contactar-nos pelo telefone +351 928 348 117.', 503);
  return response.status === 204 ? null : response.json();
}
async function rows(table, query = '') {
  if (storageMode() === 'cloud') return cloud(`${table}?${query}`);
  await mkdir(dir(), { recursive: true, mode: 0o700 });
  const files = (await readdir(dir())).filter(f => f.startsWith(`${table}-`) && f.endsWith('.json'));
  const records = await Promise.all(files.map(async file => {
    try { return JSON.parse(await readFile(path.join(dir(), file), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }));
  return records.filter(Boolean);
}
async function insert(table, record) {
  if (storageMode() === 'cloud') return cloud(table, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(record) });
  await mkdir(dir(), { recursive: true, mode: 0o700 });
  await writeFile(path.join(dir(), `${table}-${record.id}.json`), JSON.stringify(record), { mode: 0o600, flag: 'wx' });
}
export function cleanMessage(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2000) throw fail('Escreva uma mensagem com até 2000 caracteres.', 400);
  return value.trim();
}
export async function visitorThread(token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const id = hash(token);
  return (await rows('site_chat_threads', `id=eq.${id}&limit=1`)).find(t => t.id === id) || null;
}
export async function createThread({ name, contact, address }) {
  if (typeof name !== 'string' || !name.trim() || name.length > 100 || typeof contact !== 'string' || contact.length > 160) throw fail('Indique o seu nome e um contacto válido.', 400);
  const ip_hash = hash(address);
  const since = new Date(Date.now() - 3600000).toISOString();
  const recent = await rows('site_chat_threads', `ip_hash=eq.${ip_hash}&created_at=gte.${since}`);
  if (recent.filter(t => t.ip_hash === ip_hash && t.created_at >= since).length >= 5) throw fail('Aguarde antes de iniciar outra conversa.', 429);
  const token = randomBytes(32).toString('hex');
  const thread = { id: hash(token), name: name.trim(), contact: contact.trim(), ip_hash, created_at: new Date().toISOString() };
  await insert('site_chat_threads', thread);
  return { thread, token };
}
export async function messages(id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) throw fail('Conversa inválida.', 400);
  return (await rows('site_chat_messages', `thread_id=eq.${id}&order=created_at.asc&limit=500`)).filter(m => m.thread_id === id).sort((a,b) => a.created_at.localeCompare(b.created_at));
}
export async function sendMessage(id, text, sender) {
  const body = cleanMessage(text);
  const previous = await messages(id);
  if (previous.length >= 500) throw fail('Esta conversa atingiu o limite de mensagens. Contacte-nos por telefone.', 429);
  const last = previous.filter(m => m.sender === sender).at(-1);
  if (last && Date.now() - Date.parse(last.created_at) < 1500) throw fail('Aguarde um momento antes de enviar outra mensagem.', 429);
  const message = { id: randomUUID(), thread_id: id, body, sender, created_at: new Date().toISOString() };
  await insert('site_chat_messages', message);
  return message;
}
export async function listThreads() {
  return (await rows('site_chat_threads', 'order=created_at.desc&limit=100')).sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,100).map(({ ip_hash, ...thread }) => thread);
}
export async function threadExists(id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) throw fail('Conversa inválida.', 400);
  const thread = (await rows('site_chat_threads', `id=eq.${id}&limit=1`)).find(t => t.id === id);
  if (!thread) throw fail('Conversa não encontrada.', 404);
  return thread;
}

export async function setPresence(id, open) {
  const record = { id, is_open: open === true, last_seen: new Date().toISOString() };
  if (storageMode() === 'cloud') return cloud('site_chat_presence?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(record) });
  await mkdir(dir(), { recursive: true, mode: 0o700 });
  const file = path.join(dir(), `site_chat_presence-${id}.json`);
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
  await rename(temp, file);
}
export async function visitorIsPresent(id, now = Date.now()) {
  const presence = (await rows('site_chat_presence', `id=eq.${id}&limit=1`)).find(p => p.id === id);
  return !!(presence?.is_open && now - Date.parse(presence.last_seen) < 35000);
}
export async function incomingMessages(since) {
  const until = new Date().toISOString();
  if (!since) return { messages: [], cursor: until };
  if (!Number.isFinite(Date.parse(since))) throw fail('Data inválida.', 400);
  // Inclusive lower boundary plus client-side IDs avoids missing messages with equal timestamps.
  const start = new Date(since).toISOString();
  const records = (await rows('site_chat_messages', `sender=eq.visitor&created_at=gte.${encodeURIComponent(start)}&created_at=lte.${encodeURIComponent(until)}&order=created_at.asc&limit=1000`))
    .filter(m => m.sender === 'visitor' && m.created_at >= start && m.created_at <= until)
    .sort((a,b) => a.created_at.localeCompare(b.created_at)).slice(0,1000);
  return { messages: records, cursor: records.length === 1000 ? records.at(-1).created_at : until };
}

export async function deleteThread(id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) throw fail('Conversa inválida.', 400);
  if (storageMode() === 'cloud') {
    // Foreign keys remove messages and presence atomically with the conversation.
    await cloud(`site_chat_threads?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    return;
  }
  const remove = async file => {
    try { await unlink(path.join(dir(), file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
  await remove(`site_chat_threads-${id}.json`);
  const history = await messages(id);
  await Promise.all(history.map(message => remove(`site_chat_messages-${message.id}.json`)));
  await remove(`site_chat_presence-${id}.json`);
}

export async function unreadChatCounts() {
  let unread;
  if (storageMode() === 'cloud') {
    unread = [];
    let offset = 0;
    while (true) {
      const page = await rows('site_chat_messages', `sender=eq.visitor&admin_read_at=is.null&select=id,thread_id&order=id.asc&limit=1000&offset=${offset}`);
      unread.push(...page);
      if (page.length < 1000) break;
      offset += page.length;
    }
  } else unread = (await rows('site_chat_messages')).filter(m => m.sender === 'visitor' && !m.admin_read_at);
  const counts = {};
  for (const message of unread) counts[message.thread_id] = (counts[message.thread_id] || 0) + 1;
  return counts;
}
export async function markChatRead(id, ids) {
  await threadExists(id);
  if (!Array.isArray(ids) || ids.length > 500 || ids.some(value => typeof value !== 'string' || !/^[a-f0-9-]{36}$/.test(value))) throw fail('Mensagens inválidas.', 400);
  if (!ids.length) return;
  const admin_read_at = new Date().toISOString();
  if (storageMode() === 'cloud') {
    await cloud(`site_chat_messages?thread_id=eq.${id}&sender=eq.visitor&admin_read_at=is.null&id=in.(${ids.join(',')})`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ admin_read_at }) });
    return;
  }
  const selected = new Set(ids);
  const history = await messages(id);
  await Promise.all(history.filter(m => m.sender === 'visitor' && !m.admin_read_at && selected.has(m.id)).map(async message => {
    const file = path.join(dir(), `site_chat_messages-${message.id}.json`);
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify({ ...message, admin_read_at }), { mode: 0o600 });
    await rename(temp, file);
  }));
}
