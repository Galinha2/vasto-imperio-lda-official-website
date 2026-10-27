"use client";

import { useEffect, useRef, useState } from "react";
import { IoNotificationsOutline, IoVolumeHighOutline, IoVolumeMuteOutline } from "react-icons/io5";
import styles from "./AdminSalesNotifications.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminSalesNotifications() {
  const router = useRouter();
  const seen = useRef(null);
  const chatCursor = useRef(null);
  const chatSeen = useRef(new Set());
  const audio = useRef(null);
  const desktopNotices = useRef(new Set());
  const [permission, setPermission] = useState("unsupported");

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  async function enableDesktopNotifications() {
    if (!("Notification" in window)) return;
    try { setPermission(await Notification.requestPermission()); } catch { /* Keep in-page alerts available. */ }
    void prepareAudio();
  }
  const [sound, setSound] = useState(true);
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function prepareAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audio.current ||= new AudioContext();
      await audio.current.resume();
    } catch { /* Browsers may require a user gesture before allowing audio. */ }
  }

  function toggleSound() {
    if (!sound) void prepareAudio();
    setSound(!sound);
  }

  useEffect(() => {
    if (!sound) return;
    void prepareAudio();
    const unlock = () => { void prepareAudio(); };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [sound]);

  useEffect(() => {
    let stopped = false;
    let timeout;
    let checking = false;
    let pending = false;
    const controller = new AbortController();
    async function check() {
      if (stopped) return;
      if (checking) { pending = true; return; }
      clearTimeout(timeout);
      checking = true;
      try {
        const response = await fetch("/api/admin/sales", { cache: "no-store", signal: controller.signal });
        if (stopped) return;
        if (response.status === 401) {
          stopped = true;
          setNotice(null);
          desktopNotices.current.forEach((notification) => notification.close());
          desktopNotices.current.clear();
          setSound(false);
          router.replace("/admin/login");
          router.refresh();
          return;
        }
        if (!response.ok) return;
        const { sales } = await response.json();
        if (stopped || !Array.isArray(sales)) return;
        const incoming = seen.current ? sales.filter((sale) => !seen.current.has(sale.id)) : [];
        seen.current ||= new Set();
        sales.forEach((sale) => seen.current.add(sale.id));
        if (incoming.length) {
          setNotice({ count: incoming.length, name: incoming[0].customerName, saleId: incoming[0].id, key: incoming.map((sale) => sale.id).join("-") });
          window.dispatchEvent(new CustomEvent("admin:new-sales", { detail: incoming }));
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const notification = new Notification(incoming.length === 1 ? "Novo orçamento · Vasto Império" : `${incoming.length} novos orçamentos · Vasto Império`, {
                body: incoming.map((sale) => `${sale.customerName || "Cliente"} · ${sale.entryOrigin === "cliente" || (!sale.entryOrigin && sale.orderDetails) ? "Cliente pelo site" : "Admin"}`).join("\n"),
                icon: "/favicon-google.png",
                tag: `vasto-order-${incoming.map((sale) => sale.id).sort().join("-")}`,
              });
              desktopNotices.current.add(notification);
              notification.onclose = () => desktopNotices.current.delete(notification);
              notification.onclick = () => {
                window.focus();
                router.push(`/admin?orcamento=${encodeURIComponent(incoming[0].id)}`);
                notification.close();
              };
            } catch { /* Some browsers require installed web apps; retain the in-page alert. */ }
          }
          if (sound && audio.current?.state === "running") {
            const context = audio.current;
            [660, 880].forEach((frequency, index) => {
              const oscillator = context.createOscillator();
              const gain = context.createGain();
              const start = context.currentTime + index * 0.2;
              oscillator.frequency.value = frequency;
              gain.gain.setValueAtTime(0, start);
              gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
              gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
              oscillator.connect(gain); gain.connect(context.destination);
              oscillator.start(start); oscillator.stop(start + 0.31);
            });
          }
        }
      } catch { /* Retry transient network failures on the next poll. */ }
      finally {
        checking = false;
        if (!stopped) timeout = setTimeout(check, pending ? 0 : 3000);
        pending = false;
      }
    }
    const refresh = () => { void check(); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("admin:sales-changed", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    check();
    return () => {
      stopped = true; clearTimeout(timeout); controller.abort();
      window.removeEventListener("admin:sales-changed", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [sound, router]);

  useEffect(() => {
    let stopped = false;
    let timeout;
    const controller = new AbortController();
    async function checkChat() {
      try {
        const query = chatCursor.current ? `&since=${encodeURIComponent(chatCursor.current)}` : '';
        const response = await fetch(`/api/admin/chat?notifications=1${query}`, { cache: 'no-store', signal: controller.signal });
        if (response.status === 401) return;
        if (!response.ok) throw new Error('Chat unavailable');
        const data = await response.json();
        if (stopped) return;
        const incoming = data.messages.filter(message => !chatSeen.current.has(message.id));
        data.messages.forEach(message => chatSeen.current.add(message.id));
        if (chatSeen.current.size > 3000) chatSeen.current = new Set([...chatSeen.current].slice(-2000));
        chatCursor.current = data.cursor;
        if (incoming.length) {
          setNotice({ type: 'chat', count: incoming.length, name: incoming.at(-1).body, key: incoming.map(message => message.id).join('-') });
          window.dispatchEvent(new CustomEvent('admin:new-chat', { detail: incoming }));
          incoming.forEach((message, index) => {
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                const notification = new Notification('Nova mensagem · Vasto Império', { body: message.body, icon: '/favicon-google.png', tag: `vasto-chat-${message.id}` });
                desktopNotices.current.add(notification);
                notification.onclose = () => desktopNotices.current.delete(notification);
                notification.onclick = () => { window.focus(); router.push('/admin/conversas'); notification.close(); };
              } catch { /* In-page alerts remain available. */ }
            }
            if (sound && audio.current?.state === 'running') {
              const context = audio.current;
              [660, 880].forEach((frequency, tone) => {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                const start = context.currentTime + index * .5 + tone * .16;
                oscillator.frequency.value = frequency;
                gain.gain.setValueAtTime(0, start);
                gain.gain.linearRampToValueAtTime(.1, start + .02);
                gain.gain.exponentialRampToValueAtTime(.001, start + .25);
                oscillator.connect(gain); gain.connect(context.destination);
                oscillator.start(start); oscillator.stop(start + .26);
              });
            }
          });
        }
      } catch { /* Retry temporary failures without resetting the cursor. */ }
      finally { if (!stopped) timeout = setTimeout(checkChat, 3000); }
    }
    checkChat();
    return () => { stopped = true; clearTimeout(timeout); controller.abort(); };
  }, [sound, router]);

  useEffect(() => {
    const notifications = desktopNotices.current;
    return () => {
      notifications.forEach((notification) => notification.close());
      notifications.clear();
      audio.current?.close().catch(() => {});
    };
  }, []);

  return <>
    <div className="flex shrink-0 items-center gap-2">
      {permission !== "unsupported" && <button type="button" onClick={enableDesktopNotifications} disabled={permission === "denied"} aria-label="Ativar notificações no computador" title={permission === "granted" ? "Notificações do computador ativas" : permission === "denied" ? "Permita notificações nas definições do navegador para este site" : "Ativar notificações no computador"} className={`grid h-8 w-8 cursor-pointer place-items-center rounded-full transition disabled:cursor-help ${permission === "granted" ? "bg-orange-50 text-orange-600" : "bg-[#f5f5f7] text-[#86868b] hover:bg-orange-50 hover:text-orange-600"}`}><IoNotificationsOutline className="text-lg" /></button>}
      <button type="button" onClick={toggleSound} role="switch" aria-checked={sound} aria-label="Som de novas mensagens e orçamentos" title={sound ? "Desativar som" : "Ativar som"} className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500] ${sound ? "border-[#ff5500] bg-[#ff5500]" : "border-[#d2d2d7] bg-[#e5e5e7]"}`}>
        <span aria-hidden="true" className={`pointer-events-none absolute left-0.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-xs text-[#6e6e73] shadow-sm transition-transform duration-200 motion-reduce:transition-none ${sound ? "translate-x-5" : "translate-x-0"}`}>{sound ? <IoVolumeHighOutline /> : <IoVolumeMuteOutline />}</span>
      </button>
    </div>
    {notice && <div key={notice.key} role="status" aria-live="polite" className={`${styles.toast} fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-[100] flex w-[460px] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-white/50 bg-white/45 py-3 pl-3 pr-3 shadow-[0_12px_48px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-[32px] backdrop-saturate-[180%] sm:bottom-7 sm:gap-4 sm:pr-4`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/60 bg-white/55 shadow-sm"><img src="/favicon-google.png" alt="" width="30" height="30" className="h-[30px] w-[30px] object-contain" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-snug tracking-tight text-[#1d1d1f] sm:text-[13px]">{notice.type === "chat" ? (notice.count === 1 ? "Nova mensagem recebida" : `${notice.count} novas mensagens recebidas`) : notice.count === 1 ? "Novo orçamento recebido" : `${notice.count} novos orçamentos recebidos`}</p>
        <p className="mt-0.5 truncate text-[11px] text-[#6e6e73]" title={notice.name}>{notice.name}</p>
      </div>
      <Link href={notice.type === "chat" ? "/admin/conversas" : `/admin?orcamento=${encodeURIComponent(notice.saleId)}`} onClick={() => setNotice(null)} className="shrink-0 rounded-full bg-white/50 px-3 py-2 text-xs font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white/75">Ver</Link>
      <button type="button" onClick={() => setNotice(null)} aria-label="Fechar notificação" className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-lg leading-none text-[#6e6e73] transition hover:bg-black/5">×</button>
    </div>}

  </>;
}
