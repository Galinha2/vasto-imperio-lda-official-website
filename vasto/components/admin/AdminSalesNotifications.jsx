'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminPreferences } from './AdminPreferences';
import { playAdminSound } from './admin-notification-audio';
import styles from './AdminSalesNotifications.module.css';

// This listener stays mounted across all admin pages, including Settings.
export default function AdminSalesNotifications() {
  const router=useRouter();
  const {preferences,ready}=useAdminPreferences();
  const current=useRef(preferences);current.current=preferences;
  const seen=useRef(null);const cursor=useRef(null);const chatSeen=useRef(new Set());
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
    let stopped=false;const controller=new AbortController();const timers=new Set();
    const schedule=(task)=>{if(stopped)return;const timer=setTimeout(()=>{timers.delete(timer);void task();},4000);timers.add(timer);};
    const endSession=()=>{stopped=true;setNotice(null);notices.current.forEach(n=>n.close());notices.current.clear();controller.abort();timers.forEach(clearTimeout);router.replace('/admin/login');router.refresh();};
    function notify({type,title,body,href,key,count=1}) {
      const prefs=current.current;
      if(!(type==='chat'?prefs.chat:prefs.sales))return;
      const text=prefs.preview?body:(type==='chat'?'Abra as conversas no painel para ler a mensagem.':'Abra o painel para consultar o novo orçamento.');
      if(prefs.inApp)setNotice({title,body:text,href,key});
      if(prefs.sound)playAdminSound(audio.current,prefs.volume);
      if(prefs.desktop&&'Notification' in window&&Notification.permission==='granted') {
        try {
          const native=new Notification(`${title} · Vasto Império`,{body:text,icon:'/favicon-google.png',tag:`vasto-${type}-${key}`,silent:!prefs.sound||prefs.volume===0||audio.current?.state==='running'});
          notices.current.add(native);native.onclose=()=>notices.current.delete(native);
          native.onclick=()=>{window.focus();router.push(href);native.close();};
        }catch{/* The in-panel alert stays available on unsupported platforms. */}
      }
    }
    let salesPending=false;
    async function sales() {
      if(stopped||salesPending)return;salesPending=true;
      try{
        const response=await fetch('/api/admin/sales',{cache:'no-store',signal:controller.signal});
        if(response.status===401){endSession();return;}if(!response.ok)return;
        const data=await response.json();if(stopped||!Array.isArray(data.sales))return;
        const incoming=seen.current?data.sales.filter(s=>!seen.current.has(s.id)):[];
        seen.current ||= new Set();data.sales.forEach(s=>seen.current.add(s.id));
        if(incoming.length){window.dispatchEvent(new CustomEvent('admin:new-sales',{detail:incoming}));notify({type:'sales',title:incoming.length===1?'Novo orçamento recebido':`${incoming.length} novos orçamentos recebidos`,body:incoming.map(s=>s.customerName||'Cliente').join('\n'),href:`/admin?orcamento=${encodeURIComponent(incoming[0].id)}`,key:incoming.map(s=>s.id).join('-')});}
      }catch{/* Retry transient failures. */}finally{salesPending=false;schedule(sales);}
    }
    let chatPending=false;
    async function chat() {
      if(stopped||chatPending)return;chatPending=true;
      try{
        const response=await fetch(`/api/admin/chat?notifications=1${cursor.current?`&since=${encodeURIComponent(cursor.current)}`:''}`,{cache:'no-store',signal:controller.signal});
        if(response.status===401){endSession();return;}if(!response.ok)return;
        const data=await response.json();if(stopped||!Array.isArray(data.messages))return;
        const incoming=data.messages.filter(m=>!chatSeen.current.has(m.id));data.messages.forEach(m=>chatSeen.current.add(m.id));cursor.current=data.cursor;
        if(chatSeen.current.size>3000)chatSeen.current=new Set([...chatSeen.current].slice(-2000));
        if(incoming.length){window.dispatchEvent(new CustomEvent('admin:new-chat',{detail:incoming}));incoming.forEach(m=>notify({type:'chat',title:'Nova mensagem recebida',body:m.body,href:'/admin/conversas',key:m.id}));}
      }catch{/* Retry transient failures, including while minimized. */}finally{chatPending=false;schedule(chat);}
    }
    // Do not pause on document.hidden: alerts must still arrive when another app is active.
    sales();chat();
    return()=>{stopped=true;controller.abort();timers.forEach(clearTimeout);};
  },[ready,router]);
  useEffect(()=>()=>{notices.current.forEach(n=>n.close());notices.current.clear();},[]);
  return notice&&<div key={notice.key} role="status" aria-live="polite" className={`${styles.toast} fixed bottom-6 left-1/2 z-[100] flex w-[440px] max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-2xl border border-[#e5e5e7] bg-white p-4 shadow-xl`}>
    <img src="/favicon-google.png" alt="" width="32" height="32" className="h-8 w-8 shrink-0 object-contain"/><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-[#1d1d1f]">{notice.title}</p><p className="mt-1 truncate text-[11px] text-[#86868b]">{notice.body}</p></div><Link href={notice.href} onClick={()=>setNotice(null)} className="cursor-pointer rounded-full bg-[#f5f5f7] px-3 py-2 text-xs font-medium text-[#1d1d1f] hover:bg-[#e5e5e7]">Ver</Link><button type="button" onClick={()=>setNotice(null)} aria-label="Fechar notificação" className="cursor-pointer rounded-full p-1 text-[#86868b]">×</button>
  </div>;
}
