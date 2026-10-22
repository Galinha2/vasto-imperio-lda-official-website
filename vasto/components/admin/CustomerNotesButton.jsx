"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IoCloseOutline, IoDocumentTextOutline, IoTrashOutline } from 'react-icons/io5';
const tabs = [{ id: 'geral', label: 'Geral' }, { id: 'contactos', label: 'Contactos' }, { id: 'seguimento', label: 'Seguimento' }];
const dateLabel = (value) => new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Lisbon', ...(value.length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));

export default function CustomerNotesButton({ sale, onSaved, inline = false }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(null);
  const [revision, setRevision] = useState('');
  const [active, setActive] = useState('geral');
  const [text, setText] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState('');
  const field = useRef(null);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setDeleteId(''); setRevision('');
    fetch(`/api/admin/sales/${sale.id}/notes`, { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotes(data.notes); setRevision(data.updatedAt);
    }).catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    field.current?.focus();
    return () => controller.abort();
  }, [open, sale.id]);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => { if (event.key === 'Escape' && !busy) setOpen(false); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, busy]);
  async function save(event, note) {
    event.preventDefault();
    if (busy || loading) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/sales/${sale.id}/notes`, {
        method: note ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note ? { saleId: note.saleId, noteId: note.id, updatedAt: note.saleUpdatedAt } : { text, category: active, followUpDate, updatedAt: revision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotes(data.notes); setRevision(data.updatedAt); setDeleteId('');
      if (!note) { setText(''); setFollowUpDate(''); }
      onSaved?.(data.updatedSale);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  const count = notes?.length ?? sale.customerNotes?.length ?? 0;
  const visible = (notes || []).filter((note) => note.category === active);
  return <div className={inline ? "shrink-0" : "mt-2"} onClick={(event) => event.stopPropagation()}>
    <button type="button" title="Notas do cliente" aria-label="Notas do cliente" onClick={() => setOpen(true)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#dfe3e8] bg-white/70 px-2.5 py-1.5 text-[10px] font-medium text-[#626b79] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0]"><IoDocumentTextOutline aria-hidden="true" /><span className={inline ? "hidden sm:inline 2xl:hidden" : ""}>Notas</span>{count > 0 && <span className="rounded-full bg-[#eceef2] px-1.5">{count}</span>}</button>
    {open && createPortal(<div className="fixed inset-0 z-[1250] flex items-center justify-center overflow-y-auto bg-black/25 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`notes-title-${sale.id}`} className="my-auto flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.16)] backdrop-blur-2xl sm:p-7">
        <header className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#86868b]">Notas internas do cliente</p><h2 id={`notes-title-${sale.id}`} className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">{sale.customerName}</h2><p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">Partilhadas entre os orçamentos deste cliente. Não são incluídas nos PDFs nem nos emails.</p></div><button type="button" disabled={busy} aria-label="Fechar notas" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f0f1f4] text-[#6e6e73] disabled:opacity-50"><IoCloseOutline /></button></header>
        <div role="tablist" aria-label="Categorias das notas" className="mt-5 flex gap-1 rounded-full bg-[#eceef2] p-1">{tabs.map((tab) => <button key={tab.id} type="button" disabled={busy} role="tab" aria-selected={active === tab.id} aria-controls={`notes-panel-${sale.id}`} onClick={() => { setActive(tab.id); setDeleteId(''); }} className={`flex-1 cursor-pointer rounded-full px-2 py-2 text-xs font-medium transition ${active === tab.id ? 'bg-white text-[#25262b] shadow-sm' : 'text-[#777e88] hover:text-[#25262b]'}`}>{tab.label}<span className="ml-1 text-[10px] text-[#86868b]">{(notes || []).filter((note) => note.category === tab.id).length || ''}</span></button>)}</div>
        <div id={`notes-panel-${sale.id}`} role="tabpanel" aria-label={tabs.find((tab) => tab.id === active).label} className="mt-4 min-h-0 overflow-y-auto pr-1">
          <form onSubmit={save} className="space-y-3 rounded-2xl border border-[#e5e7ec] bg-[#f7f8fa] p-4">
            <label className="block text-xs font-medium text-[#626b79]">Nova nota · {tabs.find((tab) => tab.id === active).label}<textarea ref={field} disabled={busy} required maxLength={3000} value={text} onChange={(event) => setText(event.target.value)} rows={3} placeholder="Ex.: Liguei ao cliente. Ficou de responder na próxima terça-feira." className="email-compose-field mt-2 w-full resize-y rounded-2xl border p-3 text-sm font-normal" /></label>
            <div className="flex flex-wrap items-end justify-between gap-3"><label className="text-xs text-[#626b79]">Voltar a contactar (opcional)<input type="date" disabled={busy} value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="email-compose-field mt-1 block rounded-xl border px-3 py-2 text-sm" /></label><button disabled={busy || loading || !revision || !text.trim()} className="cursor-pointer rounded-full bg-[#424b59] px-5 py-2.5 text-xs font-semibold text-white disabled:cursor-default disabled:opacity-40">{busy ? 'A guardar…' : 'Guardar nota'}</button></div>
          </form>
          {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
          <div aria-live="polite" className="mt-4 space-y-3">{loading ? <p className="py-5 text-center text-xs text-[#86868b]">A carregar notas…</p> : visible.length ? visible.map((note) => <article key={note.id} className="rounded-2xl border border-[#e6e8ed] bg-white/85 p-4"><div className="flex items-center justify-between gap-3"><time dateTime={note.createdAt} className="text-[10px] text-[#86868b]">{dateLabel(note.createdAt)}</time><div className="flex items-center gap-2">{deleteId === note.id ? <><button type="button" disabled={busy} onClick={(event) => save(event, note)} className="cursor-pointer text-[10px] text-red-700">Eliminar nota</button><button type="button" onClick={() => setDeleteId('')} className="cursor-pointer text-[10px] text-[#86868b]">Cancelar</button></> : <button type="button" aria-label="Eliminar nota" onClick={() => setDeleteId(note.id)} className="cursor-pointer p-1 text-[#a1a1a6] hover:text-red-600"><IoTrashOutline /></button>}</div></div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#424245]">{note.text}</p>{note.followUpDate && <p className="mt-3 inline-flex rounded-full bg-[#f0f2f5] px-3 py-1.5 text-[11px] font-medium text-[#626b79]">Voltar a contactar · {dateLabel(note.followUpDate)}</p>}</article>) : <p className="py-5 text-center text-xs text-[#86868b]">Ainda não há notas neste separador.</p>}</div>
        </div>
      </section>
    </div>, document.body)}
  </div>;
}
