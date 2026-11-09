import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeChatMessages } from '../lib/chat-sync.mjs';
import { messages, chatImageMessage } from '../lib/chat.mjs';

test('incremental messages preserve history, deduplicate boundaries and apply read updates', () => {
  const old = {id:'a',created_at:'2026-11-09T12:00:00.000Z',body:'Anterior'};
  const boundary = {id:'b',created_at:'2026-11-09T12:01:00.000Z',body:'Atual'};
  const fresh = {id:'c',created_at:boundary.created_at,body:'Nova mensagem no mesmo instante'};
  const merged = mergeChatMessages([old,boundary],[{...boundary,admin_read_at:boundary.created_at},fresh]);
  assert.deepEqual(merged.map(message=>message.id),['a','b','c']);
  assert.equal(merged[1].admin_read_at,boundary.created_at);
  assert.deepEqual(mergeChatMessages(merged,[]),merged);
});

test('cloud polls filter history by timestamp and image reads select just their message', async () => {
  const original={...process.env}, originalFetch=globalThis.fetch;
  process.env.SUPABASE_URL='https://example.invalid'; process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  const thread='a'.repeat(64), other='b'.repeat(64), id='12345678-1234-1234-1234-123456789abc';
  const since='2026-11-09T12:01:00.000Z';
  const queries=[];
  globalThis.fetch=async url=>{
    const query=new URL(url).searchParams; queries.push(query);
    return Response.json([
      {id:'old',thread_id:thread,created_at:'2026-11-09T12:00:00.000Z'},
      {id,thread_id:thread,created_at:since,image:{path:'test.webp'}},
      {id:'private',thread_id:other,created_at:since},
    ]);
  };
  try {
    assert.deepEqual((await messages(thread,{since})).map(message=>message.id),[id]);
    assert.equal(queries[0].get('created_at'),`gte.${since}`);
    assert.equal((await chatImageMessage(thread,id)).image.path,'test.webp');
    assert.equal(queries[1].get('select'),'id,thread_id,image');
    assert.equal(queries[1].get('id'),`eq.${id}`);
    await assert.rejects(()=>messages(thread,{since:'invalid'}),{status:400});
    await assert.rejects(()=>chatImageMessage(other,'invalid'),{status:400});
  } finally {process.env=original;globalThis.fetch=originalFetch;}
});
