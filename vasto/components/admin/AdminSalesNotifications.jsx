"use client";

import { useEffect, useRef, useState } from "react";
import { IoNotificationsOutline, IoVolumeHighOutline, IoVolumeMuteOutline } from "react-icons/io5";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminSalesNotifications() {
  const router = useRouter();
  const seen = useRef(null);
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
    const controller = new AbortController();
    async function check() {
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
          setNotice({ count: incoming.length, name: incoming[0].customerName });
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
                router.push("/admin");
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
      finally { if (!stopped) timeout = setTimeout(check, 20000); }
    }
    check();
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
      <button type="button" onClick={toggleSound} role="switch" aria-checked={sound} aria-label="Som de novos orçamentos" title={sound ? "Desativar som" : "Ativar som"} className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500] ${sound ? "border-[#ff5500] bg-[#ff5500]" : "border-[#d2d2d7] bg-[#e5e5e7]"}`}>
        <span aria-hidden="true" className={`pointer-events-none absolute left-0.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-xs text-[#6e6e73] shadow-sm transition-transform duration-200 motion-reduce:transition-none ${sound ? "translate-x-5" : "translate-x-0"}`}>{sound ? <IoVolumeHighOutline /> : <IoVolumeMuteOutline />}</span>
      </button>
    </div>
    {notice && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[100] w-[370px] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-[26px] border border-white/70 bg-white/75 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150 sm:bottom-7 sm:right-7">
      <div className="flex items-start gap-3.5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-white/80 bg-white/80 shadow-sm"><img src="/favicon-google.png" alt="" width="30" height="30" className="h-[30px] w-[30px] object-contain" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6e6e73]">Vasto Império</span><span className="text-[10px] text-[#86868b]">agora</span></div>
          <p className="mt-1 text-[13px] font-semibold leading-snug tracking-tight text-[#1d1d1f]">{notice.count === 1 ? "Novo orçamento recebido" : `${notice.count} novos orçamentos recebidos`}</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-[#6e6e73]">{notice.name}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-black/5 pt-3"><button type="button" onClick={() => setNotice(null)} className="cursor-pointer rounded-full px-4 py-2 text-xs font-medium text-[#6e6e73] transition hover:bg-black/5">Fechar</button><Link href="/admin" onClick={() => setNotice(null)} className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[#1d1d1f] shadow-sm transition hover:bg-white">Ver vendas</Link></div>
    </div>}

  </>;
}
