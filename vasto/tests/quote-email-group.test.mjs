import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteEmailAttachments } from '../lib/admin/quote-email-attachments.mjs';

test('group email includes grouped PDFs and drawings and excludes unrelated sales', async () => {
  const records = [
    { id: 'a', quoteGroupId: 'group', customerName: 'Cliente', images: [{ id: 'drawing-a', contentType: 'image/png' }] },
    { id: 'b', quoteGroupId: 'group', customerName: 'Cliente', images: [{ id: 'drawing-b', contentType: 'image/jpeg' }] },
    { id: 'c', quoteGroupId: 'other', customerName: 'Cliente' },
  ];
  const storage = {
    getPdf: async (id) => ({ record: records.find((sale) => sale.id === id), buffer: Buffer.from(`pdf-${id}`) }),
    getSaleImage: async (id) => ({ buffer: Buffer.from(`image-${id}`) }),
    listSales: async () => records,
  };
  const group = await quoteEmailAttachments('a', true, storage);
  assert.deepEqual(group.map((file) => file.content.toString()), ['pdf-a', 'image-a', 'pdf-b', 'image-b']);
  assert.equal(new Set(group.map((file) => file.filename)).size, 4);
  assert.equal((await quoteEmailAttachments('a', false, storage)).length, 2);
  assert.equal((await quoteEmailAttachments('c', true, storage)).length, 1);
});
