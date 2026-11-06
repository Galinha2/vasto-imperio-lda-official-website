import test from 'node:test';
import assert from 'node:assert/strict';
import {createThread,sendMessage,setPresence,messages,visitorThread} from '../lib/chat.mjs';

test('cloud chat accepts empty 201 inserts and empty 204 presence without reporting a saved message as failed',async()=>{
 const original={...process.env},fetchOriginal=globalThis.fetch;
 process.env.SUPABASE_URL='https://test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const tables={site_chat_threads:[],site_chat_messages:[],site_chat_presence:[]};
 globalThis.fetch=async(url,options={})=>{
  const parsed=new URL(url),table=parsed.pathname.split('/').at(-1);
  if(options.method==='POST'){
   const row=JSON.parse(options.body);tables[table].push(row);
   return new Response(null,{status:table==='site_chat_presence'?204:201});
  }
  let rows=tables[table];
  if(parsed.searchParams.has('id'))rows=rows.filter(row=>row.id===parsed.searchParams.get('id').slice(3));
  if(parsed.searchParams.has('thread_id'))rows=rows.filter(row=>row.thread_id===parsed.searchParams.get('thread_id').slice(3));
  return new Response(JSON.stringify(rows),{status:200});
 };
 try{
  const {thread,token}=await createThread({name:'Visitante de teste',contact:'',address:'test'});
  const message=await sendMessage(thread.id,'Mensagem de teste','visitor');
  await setPresence(thread.id,true);
  assert.equal((await visitorThread(token)).id,thread.id);
  assert.equal((await messages(thread.id))[0].id,message.id);
  assert.equal(tables.site_chat_messages.length,1);
 }finally{process.env=original;globalThis.fetch=fetchOriginal;}
});
