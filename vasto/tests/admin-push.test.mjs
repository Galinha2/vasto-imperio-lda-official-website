import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import webpush from 'web-push';
import {validatePushSubscription,pushOwner,pushConfiguration,savePushDevice,listPushDevices,removePushDevice,notifyAdminPush} from '../lib/admin/push.mjs';
const keys=webpush.generateVAPIDKeys();
const subscription=name=>({endpoint:`https://fcm.googleapis.com/fcm/send/${name}`,keys:{p256dh:keys.publicKey,auth:Buffer.alloc(16,1).toString('base64url')}});
test('valida subscrições e impede SSRF, serviços desconhecidos e chaves inválidas',()=>{
 assert.equal(validatePushSubscription(subscription('valid')).endpoint,subscription('valid').endpoint);
 for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:9999/x','https://example.com/'])assert.throws(()=>validatePushSubscription({...subscription('x'),endpoint}),{status:400});
 assert.throws(()=>validatePushSubscription({...subscription('x'),keys:{auth:'a',p256dh:'b'}}),{status:400});
 assert.equal(pushConfiguration({}).configured,false);
 assert.notEqual(pushOwner({ADMIN_PASSWORD:'one',ADMIN_SESSION_SECRET:'secret'}),pushOwner({ADMIN_PASSWORD:'two',ADMIN_SESSION_SECRET:'secret'}));
});
test('dois dispositivos, privacidade, clique na conversa, limpeza de expirados e revogação',async()=>{
 const original={...process.env};const dir=await mkdtemp(path.join(os.tmpdir(),'vasto-push-'));
 delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;delete process.env.VERCEL;
 Object.assign(process.env,{ADMIN_DATA_DIR:dir,ADMIN_PASSWORD:'test-password',ADMIN_SESSION_SECRET:'test-secret',WEB_PUSH_VAPID_PUBLIC_KEY:keys.publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:keys.privateKey});
 try{
  const a=await savePushDevice(subscription('a'),{preview:false},Date.now()+3600000);
  const b=await savePushDevice(subscription('b'),{preview:true},null);
  assert.equal((await listPushDevices()).length,2);
  const payloads=[];const event={threadId:'a'.repeat(64),id:'message-1',body:'Ana: Mensagem privada'};
  const result=await notifyAdminPush(event,{send:async(sub,payload)=>payloads.push(JSON.parse(payload))});
  assert.equal(result.sent,2);assert.equal(payloads.filter(p=>p.body.includes('Mensagem privada')).length,1);
  assert.ok(payloads.every(p=>p.url===`/admin/conversas?chat=${event.threadId}`));
  await savePushDevice(subscription('b'),{chat:false},null);
  const one=await notifyAdminPush(event,{send:async()=>{}});assert.equal(one.sent,1);
  const expired=await notifyAdminPush(event,{send:async()=>{throw Object.assign(new Error('Expired'),{statusCode:410});}});assert.equal(expired.failed,1);
  assert.deepEqual((await listPushDevices()).map(d=>d.id),[b.id]);
  await assert.rejects(savePushDevice(subscription('late'),{},Date.now()-1000),{status:401});
  await savePushDevice(subscription('a'),{},Date.now()+3600000);
  await removePushDevice(a.id);assert.equal((await listPushDevices()).length,1);
  process.env.ADMIN_PASSWORD='rotated-password';assert.equal((await listPushDevices()).length,0);
 }finally{process.env=original;await rm(dir,{recursive:true,force:true});}
});
test('service worker mostra notificações e impede redirecionamentos externos',async()=>{
 const handlers={};const shown=[];const opened=[];
 const self={location:{origin:'https://vastoimperio.pt'},addEventListener:(name,handler)=>handlers[name]=handler,registration:{showNotification:async(title,options)=>shown.push({title,options})},clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}};
 vm.runInNewContext(await readFile(new URL('../public/admin-push-sw.js',import.meta.url),'utf8'),{self,URL});
 const waits=[];handlers.push({data:{json:()=>({title:'Teste',body:'Mensagem',url:'https://evil.test/steal'})},waitUntil:p=>waits.push(p)});await Promise.all(waits);
 assert.equal(shown.length,1);assert.equal(shown[0].options.data.url,'https://vastoimperio.pt/admin/conversas');
 const click=[];handlers.notificationclick({notification:{close(){},data:{url:'/admin/conversas?chat=abc'}},waitUntil:p=>click.push(p)});await Promise.all(click);
 assert.equal(opened[0],'https://vastoimperio.pt/admin/conversas?chat=abc');
 assert.equal(handlers.fetch,undefined,'não deve guardar páginas privadas em cache');
});

test('muted conversation skips push only on the muted device; tests remain available',async()=>{
 const threadId='b'.repeat(64);const sent=[];
 const devices=[{id:'muted',subscription:subscription('muted'),preferences:{mutedChatIds:[threadId]}},{id:'normal',subscription:subscription('normal'),preferences:{}}];
 const dependencies={env:{WEB_PUSH_VAPID_PUBLIC_KEY:keys.publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:keys.privateKey},list:async()=>devices,send:async(sub)=>sent.push(sub.endpoint)};
 const result=await notifyAdminPush({id:'message',threadId,body:'Olá'},dependencies);
 assert.equal(result.sent,1);assert.equal(sent.length,1);assert.match(sent[0],/normal$/);
 sent.length=0;
 const testResult=await notifyAdminPush({id:'test',test:true,threadId},dependencies);
 assert.equal(testResult.sent,2);
});
