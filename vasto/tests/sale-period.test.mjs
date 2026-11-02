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
