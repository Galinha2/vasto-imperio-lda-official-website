'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminPush } from './AdminPushNotifications';
import { useAdminPreferences } from './AdminPreferences';
import { playAdminSound } from './admin-notification-audio';
import styles from './AdminSalesNotifications.module.css';
import { startPolling } from '@/lib/polling.mjs';
import { readUpdateCursors, saveUpdateCursors } from '@/lib/admin/update-cursors.mjs';

// This listener stays mounted across all admin pages, including Settings.
export default function AdminSalesNotifications() {
  const router=useRouter();
  const {active:pushActive}=useAdminPush();
  const pushStatus=useRef(pushActive);pushStatus.current=pushActive;
  const {preferences,ready}=useAdminPreferences();
  const current=useRef(preferences);current.current=preferences;
  const seen=useRef(null);const salesCursor=useRef(null);const cursor=useRef(null);const chatSeen=useRef(new Set());
  const audio=useRef(null);const notices=useRef(new Set());
  const [notice,setNotice]=useState(null);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),7000);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    const prepare=async()=>{try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;audio.current ||= new Context();await audio.current.resume();}catch{/* Remain silent if blocked by the browser. */}};
    const unlock=()=>{if(current.current.sound)void prepare();};
    const test=async()=>{await prepare();const played=playAdminSound(audio.current,current.current.volume);window.dispatchEvent(new CustomEvent('admin:sound-tested',{detail:{played}}));};
    window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);window.addEventListener('admin:test-sound',test);
    return()=>{window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);window.removeEventListener('admin:test-sound',test);audio.current?.close().catch(()=>{});audio.current=null;};
  },[]);
  useEffect(()=>{
    if(!ready)return;
    let stopped=false, stopPolling=()=>{};
    const controller=new AbortController();
    const endSession=()=>{stopped=true;stopPolling();setNotice(null);notices.current.forEach(n=>n.close());notices.current.clear();controller.abort();router.replace('/admin/login');router.refresh();};
    function notify({type,title,body,href,key,count=1},remote=false) {
      const prefs=current.current;
      if(!(type==='chat'?prefs.chat:prefs.sales))return;
      if(type==='chat'&&prefs.mutedChatIds?.includes(new URL(href,window.location.origin).searchParams.get('chat')))return;
      const text=prefs.preview?body:(type==='chat'?'Abra as conversas no painel para ler a mensagem.':'Abra o painel para consultar o novo orçamento.');
      if(prefs.inApp)setNotice({title,body:text,href,key});
      if(!remote&&prefs.sound&&!(type==='chat'&&pushStatus.current))playAdminSound(audio.current,prefs.volume);
      if(!remote&&!pushStatus.current&&prefs.desktop&&'Notification' in window&&Notification.permission==='granted') {
        try {
          const native=new Notification(`${title} · Vasto Império`,{body:text,icon:'/favicon-google.png',tag:`vasto-${type}-${key}`,silent:!prefs.sound||prefs.volume===0||audio.current?.state==='running'});
          notices.current.add(native);native.onclose=()=>notices.current.delete(native);
          native.onclick=()=>{window.focus();router.push(href);native.close();};
        }catch{/* The in-panel alert stays available on unsupported platforms. */}
      }
    }
    async function applyUpdates(data,remote) {
      if (stopped) return;
      if(data.sales)salesCursor.current=data.sales.cursor;
      if(data.chat)cursor.current=data.chat.cursor;
      if(data.counts)window.dispatchEvent(new CustomEvent('admin:chat-counts',{detail:data.counts}));
      const summaries=seen.current?(data.sales?.sales||[]).filter(s=>!seen.current.has(s.id)):[];
      // Mark IDs before fetching details so shared updates cannot start duplicate loads.
      if(data.sales){seen.current ||= new Set();data.sales.sales.forEach(s=>seen.current.add(s.id));}
      const incoming=[];
      for (const summary of summaries) {
        try {
          const response=await fetch(`/api/admin/sales/${encodeURIComponent(summary.id)}`,{cache:'no-store',signal:controller.signal});
          if(response.status===401){endSession();return;}
          if(response.status===404)continue;
          if(!response.ok)throw new Error('Não foi possível consultar o orçamento.');
          incoming.push((await response.json()).sale);
        } catch { seen.current.delete(summary.id); }
      }
      if(stopped)return;
      if(incoming.length){window.dispatchEvent(new CustomEvent('admin:new-sales',{detail:incoming}));notify({type:'sales',title:incoming.length===1?'Novo orçamento recebido':`${incoming.length} novos orçamentos recebidos`,body:incoming.map(s=>s.customerName||'Cliente').join('\n'),href:`/admin?orcamento=${encodeURIComponent(incoming[0].id)}`,key:incoming.map(s=>s.id).join('-')},remote);}
      const messages=(data.chat?.messages||[]).filter(m=>!chatSeen.current.has(m.id));
      (data.chat?.messages||[]).forEach(m=>chatSeen.current.add(m.id));
      if(chatSeen.current.size>3000)chatSeen.current=new Set([...chatSeen.current].slice(-2000));
      if(messages.length){window.dispatchEvent(new CustomEvent('admin:new-chat',{detail:messages}));messages.forEach(m=>notify({type:'chat',title:'Nova mensagem recebida',body:m.body,href:`/admin/conversas?chat=${m.thread_id}`,key:m.id},remote));}
    }
    stopPolling=startPolling({
      shareKey:'admin-updates', interval:30000,
      // Push delivers background alerts without keeping server polling alive.
      // Browsers without push retain a slower fallback while minimized.
      hiddenInterval:()=>pushStatus.current?0:120000,
      load:async signal=>{
        const shared=readUpdateCursors();
        const params=new URLSearchParams();
        const salesSince=[salesCursor.current,shared.sales].filter(Boolean).sort().at(-1);
        const chatSince=[cursor.current,shared.chat].filter(Boolean).sort().at(-1);
        if(salesSince)params.set('salesSince',salesSince);
        if(chatSince)params.set('chatSince',chatSince);
        const response=await fetch(`/api/admin/updates?${params}`,{cache:'no-store',signal});
        if(response.status===401){endSession();throw new Error('Sessão terminada.');}
        const data=await response.json();
        if(!response.ok)throw new Error(data.error);
        saveUpdateCursors(data);
        return data;
      },
      onData:(data,{remote})=>{void applyUpdates(data,remote).catch(()=>{});},
    });
    return()=>{stopped=true;stopPolling();controller.abort();};
  },[ready,router]);
  useEffect(()=>()=>{notices.current.forEach(n=>n.close());notices.current.clear();},[]);
  return notice&&<div key={notice.key} role="status" aria-live="polite" className={`${styles.toast} fixed bottom-6 left-1/2 z-[100] flex w-[440px] max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#e5e5e7] bg-white p-4 shadow-xl`}>
    <img src="/favicon-google.png" alt="" width="32" height="32" className="h-8 w-8 shrink-0 object-contain"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#1d1d1f]">{notice.title}</p><p className="mt-1 truncate text-[11px] text-[#86868b]">{notice.body}</p></div><Link href={notice.href} onClick={()=>setNotice(null)} className="cursor-pointer rounded-full bg-[#f5f5f7] px-3 py-2 text-xs font-medium text-[#1d1d1f] hover:bg-[#e5e5e7]">Ver</Link><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar notificação" className="cursor-pointer rounded-full p-1 text-[#86868b]">×</button>
  </div>;
}
