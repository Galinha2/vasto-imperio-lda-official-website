import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardPriorities} from '../lib/admin/dashboard-priorities.mjs';
const now=Date.parse('2026-11-06T12:00:00Z');const base={status:'confirmada',paymentStatus:'por_pagar',deliveryStatus:'por_entregar',uploadedAt:'2026-10-01T12:00:00Z'};
test('pending work excludes drafts, unselected, archived and fully resolved quotes',()=>{const result=dashboardPriorities([{...base,id:'a'},{...base,id:'b',status:'em_preparacao'},{...base,id:'c',quoteNotSelected:true},{...base,id:'d',mergedInto:'a'},{...base,id:'e',paymentStatus:'pago',deliveryStatus:'entregue'}],now);assert.deepEqual(result.payment.map(s=>s.id),['a']);assert.deepEqual(result.inactive.map(s=>s.id),['a']);assert.equal(result.delivery.length,1);});
test('delivered but unpaid orders are prioritised; recent work is not inactive',()=>{const result=dashboardPriorities([{...base,id:'a'},{...base,id:'b',deliveryStatus:'entregue',updatedAt:'2026-11-05T12:00:00Z'}],now);assert.equal(result.payment[0].id,'b');assert.equal(result.deliveredUnpaid,1);assert.deepEqual(result.inactive.map(s=>s.id),['a']);assert.deepEqual(result.delivery.map(s=>s.id),['a']);});

test('commercial follow-up separates drafts, email tracking, contacts and recent arrivals',()=>{
 const result=dashboardPriorities([{...base,id:'old',status:'em_preparacao'},{...base,id:'sent',status:'em_preparacao',emailSentAt:'2026-11-01',orderDetails:{email:'cliente@example.com'}},{...base,id:'recent',uploadedAt:'2026-11-05T12:00:00Z',customerPhone:'123456789'},{...base,id:'future',uploadedAt:'2026-11-07T12:00:00Z',customerPhone:'123456789'},{...base,id:'ignored',quoteNotSelected:true}],now);
 assert.deepEqual(result.awaiting.map(s=>s.id),['old','sent']);assert.deepEqual(result.unsent.map(s=>s.id),['old']);assert.deepEqual(result.missingContact.map(s=>s.id),['old']);assert.deepEqual(result.recent.map(s=>s.id),['recent']);
});
