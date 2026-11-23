import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteFollowUpDue,quoteFollowUpDraft} from '../lib/admin/quote-follow-up.mjs';

const now=Date.parse('2026-11-23T12:00:00Z');
const base={id:'a',status:'em_preparacao',orderDetails:{email:'cliente@example.com'},emailSentAt:'2026-11-13T12:00:00Z'};
test('follow-up is due only after ten complete days from the last sent email',()=>{
 assert.equal(quoteFollowUpDue(base,now),true);
 assert.equal(quoteFollowUpDue({...base,emailSentAt:'2026-11-14T12:00:01Z'},now),false);
 assert.equal(quoteFollowUpDue({...base,status:'confirmada'},now),false);
 assert.equal(quoteFollowUpDue({...base,orderDetails:{}},now),false);
 assert.equal(quoteFollowUpDue({...base,quoteFollowUpSentAt:'2026-11-20T12:00:00Z'},now),false);
});
test('follow-up draft encourages a response without pressure',()=>{
 const draft=quoteFollowUpDraft({...base,quoteNumber:'123'});
 assert.match(draft.subject,/123/);assert.match(draft.message,/ajustar/i);assert.match(draft.message,/responder/i);
});
