import test from 'node:test';
import assert from 'node:assert/strict';
import { combinedQuoteLines } from '../lib/admin/merge-quotes.mjs';
const line = (ref, unidades, preco = 23.61) => ({ refCompleta: ref, produto: 'Bastidor Picking Galvanizado 800x700mm', unidades, preco, total: unidades * preco, isPortes: false });

test('repeated merges consolidate articles across four quotes and sum quantities and totals', () => {
  let lines = [line('3.338', 4), line('3.273', 8, 0.41)];
  for (const quantity of [2, 3, 5]) lines = combinedQuoteLines([{ lines, discount: 0 }, { lines: [line('3.338', quantity), line('3.273', quantity * 2, 0.41)], discount: 0 }]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].unidades, 14);
  assert.equal(lines[1].unidades, 28);
  assert.ok(Math.abs(lines[0].total - 14 * 23.61) < 1e-8);
});
test('keeps differing net prices separate and combines equal net prices after discounts', () => {
  const original = line('3.338', 2, 100);
  const result = combinedQuoteLines([{ lines: [original], discount: 10 }, { lines: [line('3.338', 3, 90)], discount: 0 }, { lines: [line('3.338', 1, 100)], discount: 0 }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].unidades, 5);
  assert.equal(result[0].preco, 90);
  assert.equal(result[0].total, 450);
  assert.equal(result[1].total, 100);
  assert.equal(original.unidades, 2);
});
test('combines equal displayed unit prices despite sub-cent floating-point differences', () => {
  let lines = [line('3.338', 4, 23.610000001)];
  for (const quote of [
    [line('3.338', 2, 23.61)],
    [line('3.338', 3, 23.609999999)],
    [line('3.338', 1, 23.61)],
  ]) lines = combinedQuoteLines([{ discount: 0, lines }, { discount: 0, lines: quote }]);
  const result = lines;
  assert.equal(result.length, 1);
  assert.equal(result[0].unidades, 10);
  assert.ok(Math.abs(result[0].total - 236.1) < 1e-8);
  assert.ok(Math.abs(result[0].preco * result[0].unidades - result[0].total) < 1e-8);
});
test('unreferenced custom articles are distinguished by name and delivery stays undiscounted', () => {
  const result = combinedQuoteLines([{ discount: 20, lines: [{ ...line('', 1, 10), produto: 'Montagem' }, { ...line('', 1, 10), produto: 'Portes', isPortes: true }] }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].preco, 8);
  assert.equal(result[1].preco, 10);
});
