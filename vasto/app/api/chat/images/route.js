import {NextResponse} from 'next/server';
import {assertOrigin,assertSession,verifySession,SESSION_COOKIE} from '@/lib/admin/auth.mjs';
import {CHAT_COOKIE,visitorThread,createThread,threadExists,messages,sendMessage,setPresence,chatImageMessage} from '@/lib/chat.mjs';
import {readChatImage} from '@/lib/chat-images.mjs';
import {notifyAdminPush} from '@/lib/admin/push.mjs';
import {deliverChatEmail,contactEmail} from '@/lib/chat-email.mjs';
import {visitorIsPresent} from '@/lib/chat.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const failure=error=>NextResponse.json({error:error.status?error.message:'Não foi possível enviar a imagem.'},{status:error.status||500});
export async function POST(request){
 try{
  assertOrigin(request);
  if(Number(request.headers.get('content-length'))>4.3*1024*1024)return NextResponse.json({error:'Imagem demasiado grande.'},{status:413});
  const form=await request.formData();const file=form.get('image');
  if(!file||typeof file.arrayBuffer!=='function'||file.size>4*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Escolha uma imagem JPG, PNG ou WebP com até 4 MB.'},{status:400});
  const admin=form.has('threadId');let thread,token;
  if(admin){assertSession(request);thread=await threadExists(String(form.get('threadId')));}
  else{thread=await visitorThread(request.cookies.get(CHAT_COOKIE)?.value);if(!thread)({thread,token}=await createThread({name:form.get('name'),contact:form.get('contact')||'',address:request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}));}
  const message=await sendMessage(thread.id,'Imagem',admin?'staff':'visitor',Buffer.from(await file.arrayBuffer()));
  let email;
  if(!admin){await Promise.allSettled([setPresence(thread.id,true),notifyAdminPush({threadId:thread.id,id:message.id,body:`${thread.name}: enviou uma imagem`}),...(token?[deliverChatEmail({thread,message,kind:'started'})]:[])]);}
  else if(contactEmail(thread.contact)){
   let present=false;try{present=await visitorIsPresent(thread.id);}catch{}
   if(!present)email=await deliverChatEmail({thread,message:{...message,body:'A equipa enviou uma imagem na conversa. As imagens estão disponíveis no chat durante 7 dias.'},kind:'reply'});
  }
  const response=NextResponse.json({thread:{id:thread.id,name:thread.name},messages:await messages(thread.id),email},{headers:{'Cache-Control':'no-store'}});
  if(token)response.cookies.set(CHAT_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/api/chat',maxAge:30*86400});
  return response;
 }catch(error){return failure(error);}
}
export async function GET(request){
 try{
  const params=new URL(request.url).searchParams;const id=params.get('thread');
  if(!verifySession(request.cookies.get(SESSION_COOKIE)?.value)){
   const thread=await visitorThread(request.cookies.get(CHAT_COOKIE)?.value);
   if(!thread||thread.id!==id)return NextResponse.json({error:'Sem acesso à imagem.'},{status:403});
  }
  const message=await chatImageMessage(id,params.get('message'));
  if(!message?.image)return NextResponse.json({error:'Imagem não encontrada.'},{status:404});
  return new Response(await readChatImage(message.image),{headers:{'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return failure(error);}
}
