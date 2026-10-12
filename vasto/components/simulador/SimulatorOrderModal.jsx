"use client";

import { useEffect, useState } from "react";
import generateBudgetPdf from "@/lib/generateBudgetPdf";

const initialForm = {
  nome: "",
  nif: "",
  moradaFiscal: "",
  moradaEnvioIgual: true,
  moradaEnvio: "",
  montagem: false,
  telefone: "",
  email: "",
  observacoes: "",
};

export default function SimulatorOrderModal({ open, onClose, total, details, items = [], discountPercent = 0, drawingRef, english = false }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const currency = new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" });

  useEffect(() => {
    if (!open) return;
    setForm(initialForm);
    setError("");
    setSent(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const drawing = drawingRef?.current?.querySelector('svg[role="img"]');
      if (!drawing) throw new Error(english ? "The drawing is not available to attach." : "Não foi possível preparar o desenho da estante.");
      await document.fonts?.ready;
      const { toJpeg } = await import("html-to-image");
      const createDrawing = async (pixelRatio, quality) => {
        const dataUrl = await toJpeg(drawing, { pixelRatio, quality, backgroundColor: "#ffffff", cacheBust: true });
        return fetch(dataUrl).then((response) => response.blob());
      };
      let drawingBlob = await createDrawing(0.9, 0.62);
      const budgetPdf = await generateBudgetPdf({
        linhas: items,
        descontoSelecionado: discountPercent,
        dadosEmpresa: { nome: form.nome, nif: form.nif, codigoPostal: form.moradaFiscal },
        nif: form.nif,
        nomeClienteManual: form.nome,
        returnBlob: true,
      });
      const orderData = JSON.stringify({ ...form, total, detalhes: details, artigos: items });
      const maxRequestBytes = 3.9 * 1024 * 1024;
      const multipartMarginBytes = 96 * 1024;
      const estimateRequestBytes = () => drawingBlob.size + budgetPdf.size + new Blob([orderData]).size + multipartMarginBytes;
      // Mantém uma margem para os limites de payload e o overhead do multipart na Vercel.
      if (estimateRequestBytes() > maxRequestBytes) drawingBlob = await createDrawing(0.5, 0.38);
      if (estimateRequestBytes() > maxRequestBytes) {
        const sizeInMb = (estimateRequestBytes() / (1024 * 1024)).toLocaleString(english ? "en-IE" : "pt-PT", { maximumFractionDigits: 1 });
        throw new Error(english ? `The order files are ${sizeInMb} MB and exceed the upload limit. Please contact us to place this order.` : `Os ficheiros da encomenda ocupam ${sizeInMb} MB e excedem o limite de envio. Contacte-nos para concluir esta encomenda.`);
      }
      const payload = new FormData();
      payload.append("dados", orderData);
      payload.append("imagem", drawingBlob, "desenho-estante.jpg");
      payload.append("orcamento", budgetPdf, "folha-orcamento.pdf");
      const response = await fetch("/api/encomenda-simulador", {
        method: "POST",
        body: payload,
      });
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        if (response.status === 413 || /request entity too large/i.test(responseText)) {
          throw new Error(english ? "The attachments exceed the server upload limit. Reduce the number of modules and try again." : "Os anexos excedem o limite de envio do servidor. Reduza o número de módulos e tente novamente.");
        }
        throw new Error(english ? "The server returned an invalid response. Please try again." : "O servidor devolveu uma resposta inválida. Tente novamente.");
      }
      if (!response.ok) throw new Error(result.error || (english ? "Could not submit the order." : "Não foi possível enviar a encomenda."));
      setSent(true);
    } catch (submitError) {
      setError(submitError.message || (english ? "Could not submit the order. Try again." : "Não foi possível enviar o pedido. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  const text = english ? {
    title: "Place your order", intro: "Fill in your details to submit the order. The technical list is sent only internally to Vasto Império.", name: "Name", nif: "Tax number", fiscal: "Billing address", same: "Shipping address is the same as billing", shipping: "Shipping address", assembly: "Do you need assembly?", yes: "Yes", no: "No", phone: "Phone number", email: "Email", notes: "Notes", notesPlaceholder: "Anything else we should know?", final: "Final value", vat: "+ VAT at the applicable rate. Delivery is not included.", submit: "Confirm order", cancel: "Cancel", sending: "Sending…", success: "Order submitted successfully", successText: "Our team will contact you shortly.", close: "Close", error: "Please fill in all required fields.",
  } : {
    title: "Encomendar", intro: "Preenche os dados para enviar o pedido. A lista técnica segue apenas internamente para a Vasto Império.", name: "Nome", nif: "NIF", fiscal: "Morada fiscal", same: "A morada de envio é igual à morada fiscal", shipping: "Morada de envio", assembly: "Quer montagem?", yes: "Sim", no: "Não", phone: "Contacto telefónico", email: "Email", notes: "Observações", notesPlaceholder: "Escreva aqui alguma informação adicional", final: "Valor final", vat: "+ IVA à taxa legal em vigor. Transporte não incluído.", submit: "Confirmar encomenda", cancel: "Cancelar", sending: "A enviar…", success: "Pedido enviado com sucesso", successText: "A nossa equipa entrará em contacto consigo em breve.", close: "Fechar", error: "Preencha todos os campos obrigatórios.",
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-[#1d1d1f]/45 p-3 backdrop-blur-sm sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="simulator-order-title" className="my-auto max-h-[min(92vh,900px)] w-full max-w-4xl overflow-y-auto rounded-[30px] border border-white/70 bg-white p-5 shadow-[0_24px_90px_rgba(0,0,0,0.2)] sm:p-8">
        {sent ? (
          <div className="py-8 text-center sm:py-12">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600" aria-hidden="true">✓</span>
            <h2 id="simulator-order-title" className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">{text.success}</h2>
            <p className="mt-2 text-sm text-[#6e6e73]">{text.successText}</p>
            <button type="button" onClick={onClose} className="mt-7 h-11 cursor-pointer rounded-full bg-(--orange) px-6 text-sm font-semibold text-white transition hover:brightness-95">{text.close}</button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--orange)">{english ? "Vasto Império" : "Vasto Império"}</p>
                <h2 id="simulator-order-title" className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#1d1d1f] sm:text-3xl">{text.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6e6e73]">{text.intro}</p>
              </div>
              <button type="button" aria-label={text.cancel} onClick={onClose} className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f5f5f7] text-lg text-[#6e6e73] transition hover:bg-[#e9e9ed]">×</button>
            </div>
            <form onSubmit={submit}>
              <div className="grid gap-5 lg:grid-cols-[1.45fr_0.8fr] lg:items-start">
                <div className="space-y-5">
                  <section className="rounded-[24px] border border-[#e8e8ed] bg-white p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">{english ? "Customer details" : "Dados do cliente"}</h3>
                      <p className="mt-1 text-xs text-[#86868b]">{english ? "Your details for the order and invoice." : "Dados para o pedido e para a faturação."}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm font-medium text-[#424245]">{text.name}<input required autoComplete="name" value={form.nome} onChange={(event) => setField("nome", event.target.value)} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                      <label className="space-y-1.5 text-sm font-medium text-[#424245]">{text.nif}<input required inputMode="numeric" maxLength={9} value={form.nif} onChange={(event) => setField("nif", event.target.value.replace(/\D/g, "").slice(0, 9))} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                      <label className="space-y-1.5 text-sm font-medium text-[#424245]">{text.phone}<input required type="tel" autoComplete="tel" value={form.telefone} onChange={(event) => setField("telefone", event.target.value)} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                      <label className="space-y-1.5 text-sm font-medium text-[#424245]">{text.email}<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setField("email", event.target.value)} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-[#e8e8ed] bg-white p-4 sm:p-5">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">{english ? "Addresses" : "Moradas"}</h3>
                      <p className="mt-1 text-xs text-[#86868b]">{english ? "Tell us where to invoice and deliver the order." : "Indica onde faturar e entregar a encomenda."}</p>
                    </div>
                    <div className="space-y-4">
                      <label className="block space-y-1.5 text-sm font-medium text-[#424245]">{text.fiscal}<input required autoComplete="billing street-address" value={form.moradaFiscal} onChange={(event) => setField("moradaFiscal", event.target.value)} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm text-[#424245]"><input type="checkbox" checked={form.moradaEnvioIgual} onChange={(event) => setField("moradaEnvioIgual", event.target.checked)} className="h-4 w-4 accent-[#0879c0]" />{text.same}</label>
                      {!form.moradaEnvioIgual && <label className="block space-y-1.5 text-sm font-medium text-[#424245]">{text.shipping}<input required autoComplete="shipping street-address" value={form.moradaEnvio} onChange={(event) => setField("moradaEnvio", event.target.value)} className="h-12 w-full rounded-full border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[#1d1d1f] outline-none transition focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>}
                    </div>
                  </section>

                  <section className="grid gap-4 sm:grid-cols-2">
                    <fieldset className="rounded-[24px] border border-[#e8e8ed] bg-white p-4">
                      <legend className="px-1 text-sm font-semibold text-[#424245]">{text.assembly}</legend>
                      <div className="mt-2 flex rounded-full bg-[#f5f5f7] p-1">
                        {[false, true].map((value) => <button key={String(value)} type="button" aria-pressed={form.montagem === value} onClick={() => setField("montagem", value)} className={`h-10 flex-1 cursor-pointer rounded-full px-4 text-sm font-semibold transition ${form.montagem === value ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}>{value ? text.yes : text.no}</button>)}
                      </div>
                    </fieldset>
                    <label className="block space-y-1.5 text-sm font-medium text-[#424245]">{text.notes}<textarea rows={3} value={form.observacoes} onChange={(event) => setField("observacoes", event.target.value)} placeholder={text.notesPlaceholder} className="min-h-[92px] w-full resize-y rounded-[20px] border border-[#d2d2d7] bg-[#fbfbfd] px-4 py-3 text-[#1d1d1f] outline-none transition placeholder:text-[#86868b] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10" /></label>
                  </section>
                </div>

                <aside className="rounded-[24px] bg-[#f5f5f7] p-5 sm:p-6 lg:sticky lg:top-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{english ? "Order summary" : "Resumo da encomenda"}</p>
                  <div className="mt-5 border-y border-[#dedee3] py-5">
                    <p className="text-sm font-medium text-[#424245]">{text.final}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-(--orange)">{currency.format(total || 0)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">{text.vat}</p>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-[#6e6e73]">{english ? "The technical specification and drawing will be sent to Vasto Império with your request." : "A lista técnica e o desenho seguem para a Vasto Império juntamente com o pedido."}</p>
                </aside>
              </div>
              {error && <p role="alert" className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-[#e8e8ed] pt-5 sm:flex-row sm:justify-end">
                <button type="button" disabled={submitting} onClick={onClose} className="h-12 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-6 text-sm font-semibold text-[#424245] transition hover:bg-[#f5f5f7] disabled:opacity-50">{text.cancel}</button>
                <button type="submit" disabled={submitting} className="h-12 cursor-pointer rounded-full bg-(--orange) px-7 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-wait disabled:opacity-60">{submitting ? text.sending : text.submit}</button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
