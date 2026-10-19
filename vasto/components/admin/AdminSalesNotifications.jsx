"use client";

import { useEffect, useRef, useState } from "react";
import { IoVolumeHighOutline, IoVolumeMuteOutline } from "react-icons/io5";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminSalesNotifications() {
  const router = useRouter();
  const seen = useRef(null);
  const audio = useRef(null);
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

  useEffect(() => () => { audio.current?.close().catch(() => {}); }, []);

  return <>
    <div className="shrink-0">
      <button type="button" onClick={toggleSound} role="switch" aria-checked={sound} aria-label="Som de novos orçamentos" title={sound ? "Desativar som" : "Ativar som"} className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5500] ${sound ? "border-[#ff5500] bg-[#ff5500]" : "border-[#d2d2d7] bg-[#e5e5e7]"}`}>
        <span aria-hidden="true" className={`pointer-events-none absolute left-0.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-white text-xs text-[#6e6e73] shadow-sm transition-transform duration-200 motion-reduce:transition-none ${sound ? "translate-x-5" : "translate-x-0"}`}>{sound ? <IoVolumeHighOutline /> : <IoVolumeMuteOutline />}</span>
      </button>
    </div>
    {notice && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[100] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-orange-200 bg-white p-5 shadow-xl">
      <p className="font-semibold text-[#1d1d1f]">{notice.count === 1 ? "Novo orçamento recebido" : `${notice.count} novos orçamentos recebidos`}</p>
      <p className="mt-1 text-sm text-[#6e6e73]">{notice.name}</p>
      <div className="mt-3 flex gap-4"><Link href="/admin" onClick={() => setNotice(null)} className="text-sm font-semibold text-orange-600">Ver vendas</Link><button type="button" onClick={() => setNotice(null)} className="cursor-pointer text-sm text-[#86868b]">Fechar</button></div>
    </div>}
  </>;
}
