import test from 'node:test';
import assert from 'node:assert/strict';
import { dueFollowUps, followUpToday } from '../lib/admin/follow-ups.mjs';

test('includes today and overdue contacts, excluding future and completed follow-ups', () => {
  const sale = { id: 'a', customerName: 'Cliente A', customerNotes: [
    { id: 'today', followUpDate: '2026-10-22', text: 'Ligar hoje', category: 'contactos' },
    { id: 'old', followUpDate: '2026-10-20', text: 'Pedir resposta', category: 'seguimento' },
    { id: 'future', followUpDate: '2026-10-23' },
    { id: 'done', followUpDate: '2026-10-21', followUpCompletedAt: '2026-10-22T10:00:00Z' },
    { id: 'undated' },
  ] };
  const result = dueFollowUps([sale], '2026-10-22');
  assert.deepEqual(result.map((item) => item.id), ['old', 'today']);
  assert.equal(result[0].overdue, true);
  assert.equal(result[1].overdue, false);
});
test('archived quote notes link to an available quote of the same customer without duplicating reminders', () => {
  const note = { id: 'shared', followUpDate: '2026-10-22', text: 'Ligar' };
  const archived = { id: 'a', customerName: 'Cliente A', nif: '506123456', mergedInto: 'b', customerNotes: [note] };
  const active = { id: 'b', customerName: 'Cliente A', nif: '506123456', customerNotes: [note] };
  assert.equal(dueFollowUps([archived, active], '2026-10-22').length, 1);
  assert.equal(dueFollowUps([archived, active], '2026-10-22')[0].saleId, 'b');
  assert.equal(dueFollowUps([{ ...archived, customerName: 'Cliente', nif: '' }, { ...active, customerName: 'Cliente', nif: '', customerNotes: [] }], '2026-10-22').length, 0);
});
test('the reminder day follows Lisbon time, including after midnight in summer time', () => {
  assert.equal(followUpToday(new Date('2026-10-21T23:30:00Z')), '2026-10-22');
  assert.equal(followUpToday(new Date('2026-12-01T23:30:00Z')), '2026-12-01');
});
