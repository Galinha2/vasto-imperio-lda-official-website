import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {assertSession,assertOrigin,SESSION_COOKIE} from '@/lib/admin/auth.mjs';
import {PUSH_DEVICE_COOKIE,pushConfiguration,savePushDevice,removePushDevice,listPushDevices,notifyAdminPush} from '@/lib/admin/push.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(value,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
const failure=error=>json({error:error.status?error.message:'Não foi possível configurar as notificações.'},error.status||500);
function deviceCookie(response,id,clear=false){response.cookies.set(PUSH_DEVICE_COOKIE,id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:clear?0:180*86400});return response;}
export async function GET(request){try{assertSession(request);return json(pushConfiguration());}catch(error){return failure(error);}}
export async function POST(request){
 try{
  assertSession(request);assertOrigin(request);
  const raw=await request.text();if(raw.length>8000)return json({error:'Pedido demasiado longo.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Pedido inválido.'},400);}
  if(body.action==='test'){
    const id=request.cookies.get(PUSH_DEVICE_COOKIE)?.value;
    const devices=(await listPushDevices()).filter(device=>device.id===id);
    if(!devices.length)return json({error:'Ative primeiro as notificações neste dispositivo.'},400);
    const result=await notifyAdminPush({test:true,id:randomUUID()},{list:async()=>devices});
    return result.sent?json(result):json({error:'O serviço push não aceitou a notificação. Ative novamente este dispositivo.'},503);
  }
  const payload=JSON.parse(Buffer.from(request.cookies.get(SESSION_COOKIE).value.split('.')[0],'base64url').toString());
  const saved=await savePushDevice(body.subscription,body.preferences,payload.expires);
  return deviceCookie(json(saved),saved.id);
 }catch(error){return failure(error);}
}
export async function DELETE(request){try{assertSession(request);assertOrigin(request);const id=request.cookies.get(PUSH_DEVICE_COOKIE)?.value;if(id)await removePushDevice(id);return deviceCookie(json({ok:true}),'',true);}catch(error){return failure(error);}}
