import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateCustomerNote } from '../lib/admin/customer-notes.mjs';
import { createSale, getSale, listSales, getCustomerNotes, updateCustomerNotes } from '../lib/admin/store.mjs';

test('validates note categories, size and real follow-up dates', () => {
  assert.deepEqual(validateCustomerNote({ text: ' Ligou. Responde sexta-feira. ', category: 'contactos', followUpDate: '2026-10-23' }), { text: 'Ligou. Responde sexta-feira.', category: 'contactos', followUpDate: '2026-10-23' });
  for (const input of [{ text: '', category: 'geral' }, { text: 'a'.repeat(3001), category: 'geral' }, { text: 'Teste', category: 'outro' }, { text: 'Teste', category: 'seguimento', followUpDate: '2026-02-30' }]) assert.throws(() => validateCustomerNote(input), { status: 400 });
});

test('notes persist, are shared across client quotes and archived versions, and support guarded deletion', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'vasto-notes-'));
  process.env.ADMIN_DATA_DIR = dir;
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; delete process.env.VERCEL;
  try {
    const record = { id: 'a'.repeat(64), customerName: 'Cliente Notas', nif: '506123456', subtotal: 100, status: 'em_preparacao', updatedAt: '2026-10-20T10:00:00.000Z' };
    await createSale(record, Buffer.from('%PDF-original'));
    await createSale({ ...record, id: 'b'.repeat(64) }, Buffer.from('%PDF-alternative'));
    await createSale({ ...record, id: 'c'.repeat(64), customerName: 'Outro Cliente', nif: '509999999' }, Buffer.from('%PDF-other'));
    const updated = await updateCustomerNotes(record.id, { text: 'Liguei. Ficou de responder dia 23.', category: 'seguimento', followUpDate: '2026-10-23' }, record.updatedAt);
    assert.equal(updated.subtotal, 100);
    assert.equal(updated.status, 'em_preparacao');
    assert.equal((await getSale(record.id)).customerNotes.length, 1);
    assert.equal((await getCustomerNotes('b'.repeat(64))).notes[0].text, 'Liguei. Ficou de responder dia 23.');
    assert.equal((await getCustomerNotes('c'.repeat(64))).notes.length, 0);
    await assert.rejects(updateCustomerNotes(record.id, { text: 'stale', category: 'geral' }, record.updatedAt), { status: 409 });
    await writeFile(path.join(dir, `${record.id}.json`), JSON.stringify({ ...updated, mergedInto: 'b'.repeat(64) }));
    assert.equal((await listSales()).length, 2);
    assert.equal((await getCustomerNotes('b'.repeat(64))).notes.length, 1);
    await updateCustomerNotes(record.id, null, updated.updatedAt, updated.customerNotes[0].id);
    assert.equal((await getCustomerNotes('b'.repeat(64))).notes.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('cloud note updates use a conditional write and reject concurrent changes', async () => {
  const originalFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://example.test'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const record = { id: 'd'.repeat(64), customerName: 'Cloud notes', updatedAt: '2026-10-20T10:00:00.000Z' };
  globalThis.fetch = async (url, options) => {
    if (options.method === 'PATCH') {
      assert.ok(url.includes('record->>updatedAt=eq.'));
      assert.equal(JSON.parse(options.body).record.customerNotes[0].text, 'Nota interna');
      return Response.json([]);
    }
    return Response.json([{ record }]);
  };
  try { await assert.rejects(updateCustomerNotes(record.id, { text: 'Nota interna', category: 'geral' }, record.updatedAt), { status: 409 }); }
  finally { globalThis.fetch = originalFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});

test('generic unnamed customers do not share notes by their placeholder name', async () => {
  const { sameNotesCustomer } = await import('../lib/admin/customer-notes.mjs');
  assert.equal(sameNotesCustomer({ id: 'a', customerName: 'Cliente' }, { id: 'b', customerName: 'Cliente' }), false);
  assert.equal(sameNotesCustomer({ id: 'a', customerName: 'Cliente' }, { id: 'a', customerName: 'Cliente' }), true);
  assert.equal(sameNotesCustomer({ id: 'a', nif: '506123456' }, { id: 'b', nif: '506123456' }), true);
});
