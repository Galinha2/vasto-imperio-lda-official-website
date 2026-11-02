import test from 'node:test';
import assert from 'node:assert/strict';
import { salePeriodDate } from '../lib/admin/sale-period.mjs';
test('venda mantém mês da confirmação após entrega noutro mês ou ano', () => {
 const sale = { status:'confirmada', issuedAt:'2026-09-01', saleDate:'2026-10-29', deliveryStatus:'por_entregar' };
 assert.equal(salePeriodDate(sale), '2026-10-29');
 for (const deliveryDate of ['2026-11-02','2027-01-10']) assert.equal(salePeriodDate({...sale,deliveryStatus:'entregue',deliveryDate}), '2026-10-29');
 assert.equal(salePeriodDate({...sale,status:'em_preparacao'}), '2026-09-01');
 assert.equal(salePeriodDate({...sale,saleDate:undefined}), '2026-09-01');
});

test('orçamentos anteriores a setembro de 2026 usam entrega existente, sem alterar os dados', () => {
 for (const issuedAt of ['2025-12-10', '2026-01-01', '2026-08-31']) {
  const sale = { status:'confirmada', issuedAt, saleDate:'2026-09-10', deliveryStatus:'entregue', deliveryDate:'2026-10-15' };
  const original = {...sale};
  assert.equal(salePeriodDate(sale), '2026-10-15');
  assert.deepEqual(sale, original);
  assert.equal(salePeriodDate({...sale, deliveryStatus:'por_entregar'}), '2026-09-10');
  assert.equal(salePeriodDate({...sale, deliveryDate:undefined}), '2026-09-10');
  assert.equal(salePeriodDate({...sale, status:'em_preparacao'}), issuedAt);
 }
});

test('setembro de 2026 em diante, incluindo 2027, mantém o mês da confirmação', () => {
 for (const issuedAt of ['2026-09-01', '2026-09-30', '2026-12-31', '2027-01-01', '2028-05-15']) {
  const sale = { status:'confirmada', issuedAt, saleDate:issuedAt, deliveryStatus:'entregue', deliveryDate:'2029-03-10' };
  assert.equal(salePeriodDate(sale), issuedAt);
 }
});

test('escolha explícita na entrega permite mover ou manter o mês, incluindo históricos', () => {
 for (const issuedAt of ['2026-08-01','2026-10-01','2027-01-01']) {
  const sale = { status:'confirmada', issuedAt, saleDate:issuedAt, deliveryStatus:'entregue', deliveryDate:'2027-03-10' };
  assert.equal(salePeriodDate({...sale, periodDateOverride:issuedAt}), issuedAt);
  assert.equal(salePeriodDate({...sale, periodDateOverride:sale.deliveryDate}), '2027-03-10');
 }
});
