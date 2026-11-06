import {timingSafeEqual} from 'node:crypto';
import {cleanupChatImages} from '@/lib/chat-images.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
 const expected=process.env.CRON_SECRET?Buffer.from(`Bearer ${process.env.CRON_SECRET}`):null;const actual=Buffer.from(request.headers.get('authorization')||'');
 if(!expected||actual.length!==expected.length||!timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
 try{return Response.json(await cleanupChatImages());}catch{return Response.json({error:'Não foi possível limpar as imagens do chat.'},{status:503});}
}
