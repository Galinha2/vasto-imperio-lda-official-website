import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,readdir,unlink} from 'node:fs/promises';
import path from 'node:path';
import {storageMode} from './admin/store.mjs';
import {optimizeImage} from './optimize-image.mjs';
const bucket='chat-images';
export const CHAT_IMAGE_LIFETIME=7*86400000;
const valid=name=>/^\d{13}_[a-f0-9-]{36}\.webp$/.test(name||'');
const directory=()=>path.resolve(process.env.ADMIN_DATA_DIR||'.admin-data','chat-images');
async function storage(endpoint, options={}) {
 const response=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/storage/v1/${endpoint}`,{...options,cache:'no-store',headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,...options.headers},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Object.assign(new Error('Não foi possível aceder às imagens. Execute supabase/site-chat.sql no Supabase.'),{status:503});
 return response;
}
export async function saveChatImage(bytes,now=Date.now()) {
 if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>4*1024*1024)throw Object.assign(new Error('A imagem deve ter até 4 MB.'),{status:400});
 const {buffer}=await optimizeImage(bytes,{chat:true});
 const name=`${now}_${randomUUID()}.webp`;
 if(storageMode()==='cloud')await storage(`object/${bucket}/${name}`,{method:'POST',headers:{'Content-Type':'image/webp','x-upsert':'false'},body:buffer});
 else{await mkdir(directory(),{recursive:true,mode:0o700});await writeFile(path.join(directory(),name),buffer,{mode:0o600,flag:'wx'});}
 return {path:name,expiresAt:new Date(now+CHAT_IMAGE_LIFETIME).toISOString()};
}
export async function removeChatImages(names) {
 names=names.filter(valid);if(!names.length)return;
 if(storageMode()==='cloud')await storage(`object/${bucket}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:names})});
 else await Promise.all(names.map(async name=>{try{await unlink(path.join(directory(),name));}catch(error){if(error.code!=='ENOENT')throw error;}}));
}
export async function readChatImage(image,now=Date.now()) {
 if(!valid(image?.path)||now>=Number(image.path.slice(0,13))+CHAT_IMAGE_LIFETIME)throw Object.assign(new Error('Esta imagem expirou após 7 dias.'),{status:410});
 return storageMode()==='cloud'?Buffer.from(await(await storage(`object/authenticated/${bucket}/${image.path}`)).arrayBuffer()):readFile(path.join(directory(),image.path));
}
export async function cleanupChatImages(now=Date.now()) {
 let removed=0;
 if(storageMode()==='cloud'){
  // Flat, timestamp-prefixed keys: oldest first. Deleting each batch keeps offset at zero.
  for(let batch=0;batch<20;batch++){
   const response=await storage(`object/list/${bucket}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix:'',limit:100,offset:0,sortBy:{column:'name',order:'asc'}})});
   const rows=await response.json();const expired=rows.map(row=>row.name).filter(name=>valid(name)&&Number(name.slice(0,13))+CHAT_IMAGE_LIFETIME<=now);
   if(!expired.length)break;await removeChatImages(expired);removed+=expired.length;if(rows.length<100)break;
  }
 }else{
  await mkdir(directory(),{recursive:true,mode:0o700});const expired=(await readdir(directory())).filter(name=>valid(name)&&Number(name.slice(0,13))+CHAT_IMAGE_LIFETIME<=now);await removeChatImages(expired);removed=expired.length;
 }
 return {removed};
}
