import webpush from 'web-push';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { storageMode } from './store.mjs';
import { normalizeAdminPreferences } from './preferences.mjs';
export const PUSH_DEVICE_COOKIE='vasto_push_device';
const fail=(message,status=503)=>Object.assign(new Error(message),{status});
const directory=()=>path.resolve(process.env.ADMIN_DATA_DIR || '.admin-data','push');
const sha=value=>createHash('sha256').update(value).digest('hex');
export function pushOwner(env=process.env){
  if(!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET)throw fail('As credenciais da administração não estão configuradas.');
  return sha(`${env.ADMIN_USERNAME||'admin'}\0${env.ADMIN_PASSWORD}\0${env.ADMIN_SESSION_SECRET}`);
}
export function pushConfiguration(env=process.env){
  const publicKey=env.WEB_PUSH_VAPID_PUBLIC_KEY,privateKey=env.WEB_PUSH_VAPID_PRIVATE_KEY;
  return {configured:!!(publicKey&&privateKey),publicKey:publicKey||null};
}
export function validatePushSubscription(value){
  if(!value||typeof value.endpoint!=='string'||value.endpoint.length>2048)throw fail('Subscrição de notificações inválida.',400);
  let url;try{url=new URL(value.endpoint);}catch{throw fail('Endereço de notificações inválido.',400);}
  const host=url.hostname.toLowerCase();
  // Only actual browser push services can be contacted; never arbitrary URLs or local networks.
  const trusted=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.apple.com')||host==='push.apple.com'||host.endsWith('.notify.windows.com')||host==='wns.windows.com';
  if(!trusted||url.protocol!=='https:'||url.port||url.username||url.password||url.hash)throw fail('Serviço de notificações não suportado.',400);
  const p256dh=value.keys?.p256dh,auth=value.keys?.auth;
  const keyValid=(key,size)=>typeof key==='string'&&/^[A-Za-z0-9_-]+={0,2}$/.test(key)&&key.length<200&&Buffer.from(key,'base64url').length===size;
  if(!keyValid(p256dh,65)||Buffer.from(p256dh,'base64url')[0]!==4||!keyValid(auth,16))throw fail('Chaves de notificações inválidas.',400);
  return {endpoint:url.href,keys:{p256dh,auth}};
}
async function cloud(query='',options={}){
  const response=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/admin_push_subscriptions${query}`,{...options,cache:'no-store',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json',...options.headers}});
  if(!response.ok)throw fail('Não foi possível guardar as notificações. Execute supabase/admin-push.sql no Supabase.');
  return response.status===204?null:response.json();
}
export async function listPushDevices(){
  const owner=pushOwner();const now=new Date().toISOString();
  if(storageMode()==='cloud')return cloud(`?owner=eq.${owner}&expires_at=gt.${now}&limit=100`);
  await mkdir(directory(),{recursive:true,mode:0o700});
  const files=(await readdir(directory())).filter(name=>/^[a-f0-9]{64}\.json$/.test(name));
  const rows=await Promise.all(files.map(async file=>{try{return JSON.parse(await readFile(path.join(directory(),file),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}}));
  return rows.filter(row=>row&&row.owner===owner&&row.expires_at>now);
}
export async function savePushDevice(subscription,preferences,expires){
  if(!pushConfiguration().configured)throw fail('As chaves Web Push ainda não estão configuradas.');
  const clean=validatePushSubscription(subscription);
  const lease=Number.isFinite(expires)?Math.min(expires,Date.now()+180*86400000):Date.now()+180*86400000;
  if(lease<=Date.now())throw fail('A sessão terminou. Inicie sessão novamente.',401);
  const id=sha(clean.endpoint);
  const record={id,owner:pushOwner(),subscription:clean,preferences:normalizeAdminPreferences(preferences),expires_at:new Date(lease).toISOString(),updated_at:new Date().toISOString()};
  if(storageMode()==='cloud')await cloud('?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(record)});
  else{
    await mkdir(directory(),{recursive:true,mode:0o700});const file=path.join(directory(),`${id}.json`);const temp=`${file}.${randomUUID()}.tmp`;
    await writeFile(temp,JSON.stringify(record),{mode:0o600});await rename(temp,file);
  }
  return {id,expiresAt:record.expires_at};
}
export async function removePushDevice(id){
  if(!/^[a-f0-9]{64}$/.test(id||''))throw fail('Dispositivo inválido.',400);
  const owner=pushOwner();
  if(storageMode()==='cloud')return cloud(`?id=eq.${id}&owner=eq.${owner}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
  const file=path.join(directory(),`${id}.json`);
  try{const row=JSON.parse(await readFile(file,'utf8'));if(row.owner===owner)await unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}
}
export async function notifyAdminPush(event,dependencies={}){
  const env=dependencies.env||process.env;
  if(!pushConfiguration(env).configured)return {sent:0,failed:0,configured:false};
  const devices=await (dependencies.list||listPushDevices)();
  const send=dependencies.send||((subscription,payload)=>webpush.sendNotification(subscription,payload,{vapidDetails:{subject:env.WEB_PUSH_VAPID_SUBJECT||'mailto:geral@vastoimperio.pt',publicKey:env.WEB_PUSH_VAPID_PUBLIC_KEY,privateKey:env.WEB_PUSH_VAPID_PRIVATE_KEY},TTL:3600,urgency:'high',timeout:5000}));
  let sent=0,failed=0;
  // Limit concurrency to keep both devices responsive without overwhelming the push service.
  for(let offset=0;offset<devices.length;offset+=4){
    await Promise.all(devices.slice(offset,offset+4).map(async device=>{
      const prefs=normalizeAdminPreferences(device.preferences);
      if(!prefs.desktop||(!event.test&&!prefs.chat))return;
      const payload={title:event.test?'Teste · Vasto Império':'Nova mensagem · Vasto Império',body:event.test?'As notificações deste dispositivo estão a funcionar.':prefs.preview?String(event.body||'').slice(0,180):'Recebeu uma nova mensagem no chat do site.',url:event.test?'/admin/definicoes':`/admin/conversas?chat=${event.threadId}`,tag:`vasto-chat-${event.id}`,silent:!prefs.sound||prefs.volume===0};
      try{await send(device.subscription,JSON.stringify(payload));sent++;}
      catch(error){failed++;if(error.statusCode===404||error.statusCode===410){try{await (dependencies.remove||removePushDevice)(device.id);}catch{/* Retry cleanup later. */}}}
    }));
  }
  return {sent,failed,configured:true};
}
