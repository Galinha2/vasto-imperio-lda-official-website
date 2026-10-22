import test from 'node:test';
import assert from 'node:assert/strict';
import { customerPhone } from '../lib/admin/customer-phone.mjs';
import { customerSuggestions } from '../lib/admin/customer-suggestions.mjs';

test('optional phone contacts preserve international prefixes and accept multiple numbers', () => {
  assert.equal(customerPhone(undefined), '');
  assert.equal(customerPhone(' +351  928 348 117 '), '+351 928 348 117');
  assert.equal(customerPhone('928348117 / 966518436'), '928348117 / 966518436');
  for (const value of ['abc', '123', '928348117\nextra', '1'.repeat(81)]) assert.throws(() => customerPhone(value), { status: 400 });
});
test('customer history retrieves the phone and fills missing latest contacts from older quotes', () => {
  const results = customerSuggestions([
    { customerName: 'Cliente Telefone', nif: '506123456', updatedAt: '2026-10-22', orderDetails: { email: 'a@example.com' } },
    { customerName: 'Cliente Telefone', nif: '506123456', updatedAt: '2026-10-21', orderDetails: { telefone: '+351 928348117' } },
  ], '506', 'nif');
  assert.equal(results[0].phone, '+351 928348117');
});
