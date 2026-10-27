"use client";
import { useEffect, useRef, useState } from 'react';
import { IoCallOutline, IoChevronDownOutline } from 'react-icons/io5';
import CustomerNotesButton from './CustomerNotesButton';
const dateLabel = (date) => new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));
export default function FollowUpAlerts({ onSaved }) {
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const root = useRef(null);
  useEffect(() => {
    let active = true;
    let pending = null;
    const refresh = async () => {
      pending?.abort();
      const controller = new AbortController(); pending = controller;
      try {
        const response = await fetch('/api/admin/follow-ups', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) { setReminders(data.reminders); setError(''); }
      } catch (failure) { if (active && failure.name !== 'AbortError') setError(failure.message); }
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    const visibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('admin:customer-notes', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; pending?.abort(); window.clearInterval(timer); window.removeEventListener('admin:customer-notes', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const overdue = reminders.filter((item) => item.overdue).length;
  const today = reminders.length - overdue;
  return <>
    {error && <p role="status" className="mt-3 text-xs text-[#86868b]">{error}</p>}
    {reminders.length > 0 && <section ref={root} aria-label="Contactos agendados nas notas" className={`relative mt-3 ${open ? 'z-[55]' : ''}`}>
      <button type="button" aria-expanded={open} aria-controls="follow-up-alert-list" onClick={() => setOpen((value) => !value)} className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-[#dce2e8] bg-white/75 px-3 py-1.5 text-left text-[#576575] shadow-sm backdrop-blur-xl hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0]"><IoCallOutline aria-hidden="true" className="shrink-0" /><span className="truncate text-xs font-semibold">{reminders.length} {reminders.length === 1 ? 'contacto a fazer' : 'contactos a fazer'}{today > 0 ? ` · ${today} hoje` : ''}{overdue > 0 ? ` · ${overdue} em atraso` : ''}</span><IoChevronDownOutline aria-hidden="true" className={`shrink-0 text-xs transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      {open && <div id="follow-up-alert-list" className="absolute left-0 top-full z-50 mt-2 w-[min(520px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border border-white/80 bg-white/95 shadow-[0_18px_54px_rgba(15,23,42,0.14)] backdrop-blur-2xl"><div className="border-b border-[#eceef2] px-4 py-3"><h2 className="text-xs font-semibold text-[#424245]">Contactos e seguimentos</h2><p className="mt-1 text-[10px] text-[#86868b]">Datas registadas nas notas · Hoje e contactos ainda por tratar</p></div><ul className="max-h-80 divide-y divide-[#eceef2] overflow-y-auto">{reminders.map((item) => <li key={item.id}><button type="button" onClick={() => { setSelected(item); setOpen(false); }} className="flex w-full cursor-pointer items-start justify-between gap-4 px-4 py-3 text-left hover:bg-[#f5f6f8]"><span className="min-w-0"><span className="block truncate text-xs font-semibold text-[#424245]">{item.customerName}</span><span className="mt-1 block line-clamp-2 break-words text-[11px] text-[#777e88]">{item.text}</span></span><span className="shrink-0 rounded-full bg-[#f0f2f5] px-2.5 py-1 text-[10px] font-medium text-[#626b79]">{item.overdue ? dateLabel(item.date) : 'Hoje'}</span></button></li>)}</ul></div>}
    </section>}
    {selected && <CustomerNotesButton key={`${selected.saleId}-${selected.id}`} sale={{ id: selected.saleId, customerName: selected.customerName }} initialOpen initialCategory={selected.category} hideTrigger onClose={() => setSelected(null)} onSaved={onSaved} />}
  </>;
}
