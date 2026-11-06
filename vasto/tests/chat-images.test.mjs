import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {saveChatImage,readChatImage,cleanupChatImages,CHAT_IMAGE_LIFETIME} from '../lib/chat-images.mjs';
import {createThread,sendMessage,messages,deleteThread} from '../lib/chat.mjs';
import {optimizeImage} from '../lib/optimize-image.mjs';
test('image messages, optimization, expiry and cleanup leave permanent files intact',async()=>{
 const env={...process.env};const dir=await mkdtemp(path.join(os.tmpdir(),'vasto-chat-images-'));
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.VERCEL;process.env.ADMIN_DATA_DIR=dir;
 try{
  const source=await sharp({create:{width:2400,height:1800,channels:3,background:'#f5f5f5'}}).png().toBuffer();
  const expired=await saveChatImage(source,Date.now()-CHAT_IMAGE_LIFETIME-1000);const active=await saveChatImage(source);
  const meta=await sharp(await readChatImage(active)).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,1600);
  await assert.rejects(readChatImage(expired),{status:410});await assert.rejects(readChatImage({path:'../../secrets'}),{status:410});
  await writeFile(path.join(dir,'permanent.png'),source);
  assert.equal((await cleanupChatImages()).removed,1);assert.ok((await readChatImage(active)).length);assert.ok((await readFile(path.join(dir,'permanent.png'))).equals(source));
  const {thread}=await createThread({name:'Teste',contact:'',address:'image-test'});
  const message=await sendMessage(thread.id,'Imagem','visitor',source);assert.ok(message.image);assert.equal((await messages(thread.id))[0].image.path,message.image.path);
  await deleteThread(thread.id);await assert.rejects(readChatImage(message.image));
  await assert.rejects(optimizeImage(Buffer.from('<svg/>')),{status:400});
 }finally{process.env=env;await rm(dir,{recursive:true,force:true});}
});

test('cloud retention only deletes expired keys in the dedicated chat bucket',async()=>{
 const env={...process.env},originalFetch=globalThis.fetch;
 process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test';
 const now=Date.now(),expired=`${now-CHAT_IMAGE_LIFETIME-1}_11111111-1111-1111-1111-111111111111.webp`,active=`${now}_22222222-2222-2222-2222-222222222222.webp`;
 const deletes=[];
 globalThis.fetch=async(url,options)=>{
  assert.ok(url.includes('/storage/v1/object/'));assert.ok(url.endsWith('/chat-images'));
  if(options.method==='DELETE'){deletes.push(...JSON.parse(options.body).prefixes);return new Response('{}');}
  assert.ok(url.endsWith('/list/chat-images'));return new Response(JSON.stringify([{name:expired},{name:active}]));
 };
 try{assert.equal((await cleanupChatImages(now)).removed,1);assert.deepEqual(deletes,[expired]);}
 finally{process.env=env;globalThis.fetch=originalFetch;}
});
