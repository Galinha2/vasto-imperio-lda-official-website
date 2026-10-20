"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IoMailOutline } from "react-icons/io5";

export default function QuoteEmailButton({ prepare, sale, compact = false, menuItem = false }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Orçamento · Vasto Império");
  const [message, setMessage] = useState("Bom dia,\n\nSegue em anexo o nosso orçamento e os desenhos disponíveis para a sua apreciação.\n\nEstamos disponíveis para qualquer esclarecimento.\n\nCom os melhores cumprimentos,\nVasto Império");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [previews, setPreviews] = useState([]);
  useEffect(() => {
    if (!open) { setPreviews([]); return; }
    if (sale) {
      setPreviews([
        { name: "Orçamento PDF", type: "application/pdf", url: `/api/admin/sales/${sale.id}/pdf` },
        ...(sale.images || []).map((image) => ({ name: image.name || "Desenho", type: image.contentType, url: `/api/admin/sales/${sale.id}/images/${image.id}` })),
      ]);
      return;
    }
    const files = attachments.map(({ blob, name }) => ({ name, type: blob.type, url: URL.createObjectURL(blob) }));
    setPreviews(files);
    return () => files.forEach((file) => URL.revokeObjectURL(file.url));
  }, [open, attachments, sale]);

  async function start() {
    setOpen(true); setBusy(true); setError(""); setSent(false); setAttachments([]);
    setEmail(sale?.orderDetails?.email || "");
    try { if (!sale) setAttachments(await prepare()); }
    catch (failure) { setError(failure.message || "Não foi possível preparar os anexos."); }
    finally { setBusy(false); }
  }
  async function send(event) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const payload = new FormData();
      payload.append("email", email); payload.append("subject", subject); payload.append("message", message);
      if (sale) payload.append("saleId", sale.id);
      else attachments.forEach(({ blob, name }) => payload.append("attachments", blob, name));
      if (!sale && attachments.reduce((sum, file) => sum + file.blob.size, 0) > 3.7 * 1024 * 1024) throw new Error("Os anexos ultrapassam o limite de envio. Guarde nas vendas e envie a partir desse registo.");
      const response = await fetch("/api/admin/quote-email", { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar.");
      setSent(true);
      if (result.sentCopySaved === false) setError(`O email foi enviado ao cliente. ${result.sentCopyError || "Não foi possível guardar a cópia em Enviados."} Não volte a enviar o email.`);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={start} title="Enviar orçamento por email" aria-label="Enviar orçamento por email" className={menuItem ? "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs text-[#424245] hover:bg-[#f5f5f7]" : compact ? "grid h-8 w-8 cursor-pointer place-items-center rounded-full text-[#86868b] hover:bg-orange-50 hover:text-orange-600" : "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-5 text-sm font-semibold text-orange-700 hover:bg-orange-100"}><IoMailOutline />{!compact && "Enviar por email"}</button>
    {open && createPortal(<div className="fixed inset-0 z-[1200] flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"><form onSubmit={send} role="dialog" aria-modal="true" aria-label="Enviar orçamento por email" className="my-auto w-full max-w-3xl space-y-4 rounded-[28px] bg-white p-6 shadow-xl">
      <h2 className="text-xl font-semibold">Enviar orçamento por email</h2>
      {sent ? <p role="status" className="text-sm text-emerald-700">Email enviado com o orçamento e os desenhos disponíveis.</p> : <>
        <label className="block text-sm">Email do cliente<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" /></label>
        <label className="block text-sm">Assunto<input required maxLength={180} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" /></label>
        <label className="block text-sm">Mensagem<textarea required maxLength={10000} rows={7} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-xl border border-gray-200 p-3" /></label>
        <p className="text-xs text-gray-500">{busy ? "A preparar/enviar…" : sale ? `Anexos: orçamento PDF e ${sale.images?.length || 0} desenho(s) guardado(s).` : `Anexos: ${attachments.map((file) => file.name).join(", ") || "indisponíveis"}`}</p>
        {!!previews.length && <section aria-label="Pré-visualização dos anexos" className="space-y-4 rounded-2xl border border-[#e5e5e7] bg-[#f8f8fa] p-4">
          <div><h3 className="text-sm font-semibold text-[#1d1d1f]">Confirmar anexos</h3><p className="mt-1 text-xs text-[#86868b]">Estes são os ficheiros que seguem com o email.</p></div>
          {previews.map((file) => <div key={file.url} className="overflow-hidden rounded-xl border border-[#e5e5e7] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-[#e5e5e7] px-3 py-2"><span className="min-w-0 truncate text-xs font-medium text-[#424245]">{file.name}</span><a href={file.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-orange-600">Abrir</a></div>
            {file.type === "application/pdf" ? <iframe src={file.url} title={`Pré-visualização de ${file.name}`} className="h-[440px] w-full border-0" /> : <img src={file.url} alt={`Desenho anexado: ${file.name}`} className="max-h-[400px] w-full bg-white object-contain p-3" />}
          </div>)}
        </section>}

      </>}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="cursor-pointer rounded-full px-5 py-3 text-sm disabled:opacity-50">Fechar</button>{!sent && <button disabled={busy || (!sale && !attachments.length)} className="cursor-pointer rounded-full bg-orange-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Aguarde…" : "Enviar email"}</button>}</div>
    </form></div>, document.body)}
  </>;
}
