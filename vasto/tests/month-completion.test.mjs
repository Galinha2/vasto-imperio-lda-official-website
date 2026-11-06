import test from 'node:test';
import assert from 'node:assert/strict';
import {isMonthComplete} from '../lib/admin/month-completion.mjs';
const done = {status:'confirmada',paymentStatus:'pago',deliveryStatus:'entregue'};
test('requires a confirmed order and a paid commission',()=>{
 assert.equal(isMonthComplete([], {paid:true}),false);
 assert.equal(isMonthComplete([done], null),false);
 assert.equal(isMonthComplete([done], {paid:false}),false);
 assert.equal(isMonthComplete([done], {paid:true}),true);
});
test('every confirmed order must be fully paid and delivered',()=>{
 assert.equal(isMonthComplete([done,{...done,paymentStatus:'entrada_paga'}],{paid:true}),false);
 assert.equal(isMonthComplete([done,{...done,deliveryStatus:'por_entregar'}],{paid:true}),false);
});
test('drafts and unselected alternatives do not block a completed month',()=>{
 assert.equal(isMonthComplete([done,{status:'em_preparacao'},{status:'confirmada',quoteNotSelected:true}],{paid:true}),true);
 assert.equal(isMonthComplete([{...done,quoteNotSelected:true}],{paid:true}),false);
});
