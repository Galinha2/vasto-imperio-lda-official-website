import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { reserveQuoteNumber } from '../lib/admin/store.mjs';

test('numbering starts after existing sales, serializes concurrent reservations and survives deletion', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'vasto-number-'));
  process.env.ADMIN_DATA_DIR = dir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.VERCEL;
  try {
    const files = ['a', 'b'].map((letter) => path.join(dir, `${letter.repeat(64)}.json`));
    for (const file of files) await writeFile(file, JSON.stringify({ quoteNumber: '179250000000000', status: 'em_preparacao' }));
    assert.deepEqual(await Promise.all([reserveQuoteNumber(), reserveQuoteNumber(), reserveQuoteNumber()]), ['3', '4', '5']);
    for (const file of files) await rm(file);
    assert.equal(await reserveQuoteNumber(), '6');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
