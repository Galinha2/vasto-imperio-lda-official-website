import test from 'node:test';
import assert from 'node:assert/strict';
import {adminUpdates} from '../lib/admin/updates.mjs';
import {readUpdateCursors,saveUpdateCursors} from '../lib/admin/update-cursors.mjs';

test('one administration refresh obtains sales, messages and unread counts without dropping cursors',async()=>{
  const data=await adminUpdates({salesSince:'2026-11-18T09:00:00.000Z',chatSince:'2026-11-18T09:05:00.000Z'},{
    sales:async since=>{assert.equal(since,'2026-11-18T09:00:00.000Z');return {sales:[{id:'sale'}],cursor:'next-sales'};},
    chat:async since=>{assert.equal(since,'2026-11-18T09:05:00.000Z');return {messages:[{id:'message'}],cursor:'next-chat'};},
    unread:async()=>({thread:2}),
  });
  assert.equal(data.sales.sales[0].id,'sale');assert.equal(data.chat.messages[0].id,'message');assert.deepEqual(data.counts,{thread:2});
});

test('a partial chat failure does not hide new sales; a full outage triggers polling backoff',async()=>{
  const fail=async()=>{throw Object.assign(new Error('unavailable'),{status:503});};
  const data=await adminUpdates({}, {sales:async()=>({sales:[],cursor:'sales'}),chat:fail,unread:fail});
  assert.deepEqual(data,{sales:{sales:[],cursor:'sales'},chat:null,counts:null});
  await assert.rejects(adminUpdates({}, {sales:fail,chat:fail,unread:fail}),{status:503});
});

test('new polling tabs reuse recent cursors and partial failures preserve the last successful cursor',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  const sales='2026-11-18T09:00:00.000Z',chat='2026-11-18T09:05:00.000Z';
  saveUpdateCursors({sales:{cursor:sales},chat:{cursor:chat}},storage,1000000);
  assert.deepEqual(readUpdateCursors(storage,1000100),{sales,chat});
  saveUpdateCursors({sales:null,chat:{cursor:'2026-11-18T09:06:00.000Z'}},storage,1000200);
  assert.equal(readUpdateCursors(storage,1000300).sales,sales);
  assert.deepEqual(readUpdateCursors(storage,1400000),{});
  assert.deepEqual(readUpdateCursors(storage,999999),{});
});


test('invalid notification cursors are refused before querying storage',async()=>{
  let calls=0;
  const query=async()=>{calls++;return {};};
  await assert.rejects(adminUpdates({chatSince:'invalid'},{sales:query,chat:query,unread:query}),{status:400});
  assert.equal(calls,0);
});

test('combined updates endpoint requires an authenticated session and never permits response caching',async()=>{
  const {readFile}=await import('node:fs/promises');
  const {assertSession,signIn,SESSION_COOKIE}=await import('../lib/admin/auth.mjs');
  const keys=['ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_SESSION_SECRET'];
  const before=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{ADMIN_USERNAME:'test',ADMIN_PASSWORD:'test-password-long-enough',ADMIN_SESSION_SECRET:'test-only-session-secret-at-least-32-characters'});
  try {
    const source=(await readFile(new URL('../app/api/admin/updates/route.js',import.meta.url),'utf8'))
      .replace(/^import .*;\r?\n/gm,'').replace(/export const /g,'const ').replace('export async function GET','async function GET');
    let calls=0,received;
    const get=new Function('NextResponse','assertSession','adminUpdates',`${source};return GET;`)({json:(data,options)=>Response.json(data,options)},assertSession,async params=>{calls++;received=params;return {sales:{sales:[]},chat:{messages:[]},counts:{}};});
    const missing=await get({url:'https://example.com/api/admin/updates',cookies:{get:()=>undefined}});
    assert.equal(missing.status,401);assert.equal(calls,0);
    const token=signIn('test',process.env.ADMIN_PASSWORD,'test-address');
    const response=await get({url:'https://example.com/api/admin/updates?chatSince=2026-11-18T09%3A00%3A00.000Z',cookies:{get:name=>name===SESSION_COOKIE?{value:token}:undefined}});
    assert.equal(response.status,200);assert.equal(calls,1);
    assert.equal(received.chatSince,'2026-11-18T09:00:00.000Z');
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');
  } finally {
    for(const key of keys)if(before[key]===undefined)delete process.env[key];else process.env[key]=before[key];
  }
});
