import test from 'node:test';
import assert from 'node:assert/strict';
import {unansweredSince, CHAT_REPLY_WAIT_MS} from '../lib/chat-waiting.mjs';
const message=(sender,offset)=>({sender,created_at:new Date(1700000000000+offset).toISOString()});
test('four minute wait starts with first unanswered message, including image follow-ups',()=>{
 const first=message('visitor',0),followUp={...message('visitor',180000),image:{}};
 const since=unansweredSince([first,followUp]);assert.equal(since,Date.parse(first.created_at));
 assert.equal(CHAT_REPLY_WAIT_MS,240000);assert.equal(239999>=CHAT_REPLY_WAIT_MS,false);assert.equal(240000>=CHAT_REPLY_WAIT_MS,true);
});
test('staff reply clears waiting; next visitor message starts a new period',()=>{
 assert.equal(unansweredSince([]),null);
 assert.equal(unansweredSince([message('visitor',0),message('staff',300000)]),null);
 assert.equal(unansweredSince([message('visitor',0),message('staff',300000),message('visitor',310000)]),1700000310000);
 assert.equal(unansweredSince([{sender:'visitor',created_at:'invalid'}]),null);
});
