"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { IoArrowBackOutline, IoCloseOutline, IoMailOutline, IoRefreshOutline } from "react-icons/io5";

const formatDate = (value) => new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function SentEmailHistoryButton() {
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState("record");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/email-history", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os emails.");
      setEmails(data.emails || []); setSource(data.source || "record");
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  function show() { setOpen(true); setSelected(null); load(); }
  async function select(item) {
    if (!item.mailboxUid) { setSelected(item); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/email-history?mailboxUid=${encodeURIComponent(item.mailboxUid)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível abrir o email.");
      setSelected({ ...item, ...data.email });
    } catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    const refresh = () => { if (open) load(); };
    window.addEventListener("admin:email-sent", refresh);
    return () => window.removeEventListener("admin:email-sent", refresh);
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const key = (event) => { if (event.key === "Escape") { if (selected) setSelected(null); else setOpen(false); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, selected]);

  return <>
    <button type="button" onClick={show} className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-[#dce2e8] bg-white px-3.5 text-xs font-semibold text-[#424245] shadow-sm transition hover:border-[#b9d8ea] hover:bg-[#f5f9fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0879c0]"><IoMailOutline className="text-base text-[#0879c0]" />Emails enviados</button>
    {open && createPortal(<div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }} className="fixed inset-0 z-[150] flex items-end bg-[#102033]/35 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
      <section role="dialog" aria-modal="true" aria-label="Emails enviados" className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[80dvh] sm:rounded-[28px]">
        <header className="flex items-center justify-between gap-3 border-b border-[#eceef2] px-5 py-4 sm:px-6"><div className="flex min-w-0 items-center gap-3">{selected && <button type="button" aria-label="Voltar à lista" onClick={() => setSelected(null)} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-[#f5f5f7]"><IoArrowBackOutline /></button>}<div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#0879c0]">Histórico</p><h2 className="mt-0.5 text-lg font-semibold tracking-[-.025em] text-[#1d1d1f]">{selected ? "Email enviado" : "Emails enviados"}</h2></div></div><div className="flex items-center gap-1"><button type="button" onClick={load} disabled={loading} aria-label="Atualizar histórico" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#62666d] hover:bg-[#f5f5f7] disabled:opacity-50"><IoRefreshOutline className={loading ? "animate-spin" : ""} /></button><button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-[#f5f5f7]"><IoCloseOutline className="text-xl" /></button></div></header>
        {error ? <p role="alert" className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : selected ? <EmailDetail item={selected} /> : <EmailList emails={emails} loading={loading} onSelect={select} source={source} />}
      </section>
    </div>, document.body)}
  </>;
}

function EmailList({ emails, loading, onSelect, source }) {
  if (loading && !emails.length) return <p className="p-8 text-center text-sm text-[#86868b]">A carregar emails enviados…</p>;
  if (!emails.length) return <p className="p-8 text-center text-sm text-[#86868b]">Ainda não há emails enviados através do painel.</p>;
  return <ul className="min-h-0 divide-y divide-[#eceef2] overflow-y-auto">{emails.map((item) => <li key={item.id}><button type="button" onClick={() => onSelect(item)} className="flex w-full cursor-pointer items-start gap-3 px-5 py-4 text-left transition hover:bg-[#f7f9fb] sm:px-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#edf6fc] text-[#0879c0]"><IoMailOutline /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-x-2 gap-y-1"><strong className="truncate text-sm text-[#303034]">{item.subject || "Email enviado"}</strong>{item.followUp && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">Seguimento</span>}</span><span className="mt-1 block truncate text-xs text-[#62666d]">Para {item.to || "destinatário não registado"}</span>{item.sales?.length > 0 && <span className="mt-1 block truncate text-[11px] text-[#86868b]">{item.sales.map((sale) => sale.quoteNumber ? `Orçamento #${sale.quoteNumber}` : sale.customerName).join(" · ")}</span>}{source === "mailbox" && <span className="mt-1 block text-[11px] text-[#86868b]">Pasta Enviados</span>}</span><time className="shrink-0 text-right text-[10px] text-[#86868b]">{formatDate(item.sentAt)}</time></button></li>)}</ul>;
}

function EmailDetail({ item }) {
  const sales = Array.isArray(item.sales) ? item.sales : [];
  const attachments = Array.isArray(item.attachmentNames) ? item.attachmentNames : [];
  return <div className="min-h-0 overflow-y-auto p-5 sm:p-6"><dl className="grid gap-3 rounded-2xl border border-[#e6e9ed] bg-[#fafbfc] p-4 text-sm sm:grid-cols-[90px_1fr]"><dt className="font-semibold text-[#62666d]">Para</dt><dd className="break-all text-[#1d1d1f]">{item.to || "Não registado"}</dd><dt className="font-semibold text-[#62666d]">Enviado</dt><dd className="text-[#1d1d1f]">{formatDate(item.sentAt)}</dd>{sales.length > 0 && <><dt className="font-semibold text-[#62666d]">Orçamento</dt><dd className="text-[#1d1d1f]">{sales.map((sale) => sale.quoteNumber ? `#${sale.quoteNumber}` : sale.customerName).join(" · ")}</dd></>}{attachments.length > 0 && <><dt className="font-semibold text-[#62666d]">Anexos</dt><dd className="text-[#1d1d1f]">{attachments.join(" · ")}</dd></>}</dl><div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#86868b]">Assunto</p><h3 className="mt-1 text-base font-semibold text-[#1d1d1f]">{item.subject || "Não guardado"}</h3></div><div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#86868b]">Mensagem</p>{item.message ? <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-[#e6e9ed] bg-white p-4 text-sm leading-7 text-[#303034]">{item.message}</p> : <p className="mt-2 rounded-2xl bg-[#f5f5f7] p-4 text-sm leading-6 text-[#6e6e73]">O conteúdo não foi guardado: este email foi enviado antes de o histórico de mensagens estar disponível.</p>}</div></div>;
}
