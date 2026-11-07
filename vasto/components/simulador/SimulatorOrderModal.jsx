"use client";

import styles from "./SimulatorOrderModal.module.css";
import { useEffect, useState } from "react";
import { trackSimulatorOrder } from "@/lib/google-ads.mjs";
import { quoteFilename } from "@/lib/quote-filenames.mjs";
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

function createEquipmentImage(image, pixelRatio, quality) {
  const scale = Math.min(1, (1024 * pixelRatio) / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the equipment image.")), "image/jpeg", quality);
  });
}

export default function SimulatorOrderModal({ open, onClose, total, details, items = [], discountPercent = 0, drawingRef, imageSrc, english = false, cartOrder = false, cartConfigurations = [], onSent }) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const currency = new Intl.NumberFormat(english ? "en-IE" : "pt-PT", { style: "currency", currency: "EUR" });
  const hasImage = Boolean(imageSrc);
  const equipment = hasImage && !cartOrder;

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
      const drawing = drawingRef?.current?.querySelector('svg[role="img"], svg[data-order-drawing]');
      if (!hasImage && !drawing) throw new Error(english ? "The drawing is not available to attach." : "Não foi possível preparar o desenho da estante.");
      await document.fonts?.ready;
      let createImage;
      if (hasImage) {
        const image = new window.Image();
        image.src = imageSrc;
        try {
          await image.decode();
        } catch {
          throw new Error(english ? "The equipment image is not available to attach." : "Não foi possível preparar a imagem do equipamento.");
        }
        createImage = (pixelRatio, quality) => createEquipmentImage(image, pixelRatio, quality);
      } else {
        const { toJpeg } = await import("html-to-image");
        createImage = async (pixelRatio, quality) => {
          const dataUrl = await toJpeg(drawing, { pixelRatio, quality, backgroundColor: "#ffffff", cacheBust: true });
          return fetch(dataUrl).then((response) => response.blob());
        };
      }
      const budgetPdf = await generateBudgetPdf({
        source: "simulador",
        linhas: items,
        descontoSelecionado: discountPercent,
        dadosEmpresa: { nome: form.nome, nif: form.nif, codigoPostal: form.moradaFiscal },
        nif: form.nif,
        nomeClienteManual: form.nome,
        returnBlob: true,
      });
      const orderData = JSON.stringify({ ...form, montagem: equipment ? undefined : form.montagem, total, detalhes: details, artigos: items, idioma: english ? "en" : "pt", tipoEncomenda: cartOrder ? "carrinho" : equipment ? "equipamento" : "estante", configuracoes: cartOrder ? cartConfigurations : undefined });
      const maxRequestBytes = 3.9 * 1024 * 1024;
      const multipartMarginBytes = 96 * 1024;
      const fixedRequestBytes = budgetPdf.size + new Blob([orderData]).size + multipartMarginBytes;
      const imageProfiles = [[2, 0.9], [1.6, 0.86], [1.3, 0.82], [1, 0.78]];
      let imageBlob = null;
      let estimatedBytes = fixedRequestBytes;
      // Começa com uma imagem nítida e reduz gradualmente apenas se o pedido se aproximar do limite da Vercel.
      for (const [pixelRatio, quality] of imageProfiles) {
        const candidate = await createImage(pixelRatio, quality);
        estimatedBytes = fixedRequestBytes + candidate.size;
        if (estimatedBytes <= maxRequestBytes) {
          imageBlob = candidate;
          break;
        }
      }
      if (!imageBlob) {
        const sizeInMb = (estimatedBytes / (1024 * 1024)).toLocaleString(english ? "en-IE" : "pt-PT", { maximumFractionDigits: 1 });
        throw new Error(english ? `The order files are ${sizeInMb} MB and exceed the upload limit. Please contact us to place this order.` : `Os ficheiros da encomenda ocupam ${sizeInMb} MB e excedem o limite de envio. Contacte-nos para concluir esta encomenda.`);
      }
      const payload = new FormData();
      payload.append("dados", orderData);
      payload.append("imagem", imageBlob, quoteFilename({ customerName: form.nome, details, lines: items }, equipment ? "Equipamento" : "Desenho", "jpg"));
      payload.append("orcamento", budgetPdf, quoteFilename({ customerName: form.nome, details, lines: items }));
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
          if (equipment) throw new Error(english ? "The attachments exceed the server upload limit. Please contact us to place this order." : "Os anexos excedem o limite de envio do servidor. Contacte-nos para concluir esta encomenda.");
          throw new Error(english ? "The attachments exceed the server upload limit. Reduce the number of modules and try again." : "Os anexos excedem o limite de envio do servidor. Reduza o número de módulos e tente novamente.");
        }
        throw new Error(english ? "The server returned an invalid response. Please try again." : "O servidor devolveu uma resposta inválida. Tente novamente.");
      }
      if (!response.ok) throw new Error(result.error || (english ? "Could not submit the order." : "Não foi possível enviar a encomenda."));
      setSent(true);
      onSent?.();
      trackSimulatorOrder();
    } catch (submitError) {
      setError(submitError.message || (english ? "Could not submit the order. Try again." : "Não foi possível enviar o pedido. Tente novamente."));
    } finally {
      setSubmitting(false);
    }
  }

  const text = english ? {
    title: "Request a proposal", intro: "Free, non-binding request, subject to technical validation and commercial confirmation. Submitting this form does not complete a purchase.", name: "Name", nif: "Tax number", fiscal: "Billing address", same: "Shipping address is the same as billing", shipping: "Shipping address", assembly: "Do you need assembly?", yes: "Yes", no: "No", phone: "Phone number", email: "Email", notes: "Notes", notesPlaceholder: "Anything else we should know?", final: "Estimated value", vat: "+ VAT at the applicable rate. Delivery is not included.", submit: "Submit proposal request", cancel: "Cancel", sending: "Sending…", success: "Order submitted successfully", successText: "Our team will contact you shortly.", close: "Close", error: "Please fill in all required fields.",
  } : {
    title: "Pedir proposta", intro: "Pedido gratuito e sem compromisso, sujeito a validação técnica e confirmação comercial. O envio não conclui uma compra.", name: "Nome", nif: "NIF", fiscal: "Morada fiscal", same: "A morada de envio é igual à morada fiscal", shipping: "Morada de envio", assembly: "Quer montagem?", yes: "Sim", no: "Não", phone: "Contacto telefónico", email: "Email", notes: "Observações", notesPlaceholder: "Escreva aqui alguma informação adicional", final: "Valor estimado", vat: "+ IVA à taxa legal em vigor. Transporte não incluído.", submit: "Enviar pedido de proposta", cancel: "Cancelar", sending: "A enviar…", success: "Pedido enviado com sucesso", successText: "A nossa equipa entrará em contacto consigo em breve.", close: "Fechar", error: "Preencha todos os campos obrigatórios.",
  };

  return (
    <div className={styles.overlay}>
      <section role="dialog" aria-modal="true" aria-labelledby="simulator-order-title" className={styles.panel}>
        {sent ? (
          <div className={styles.success}>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-2xl text-emerald-600" aria-hidden="true">✓</span>
            <h2 id="simulator-order-title" className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#1d1d1f]">{text.success}</h2>
            <p className="mt-2 text-sm text-[#6e6e73]">{text.successText}</p>
            <button type="button" onClick={onClose} className="mt-7 h-11 cursor-pointer rounded-full bg-(--orange) px-6 text-sm font-semibold text-white transition hover:brightness-95">{text.close}</button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-(--orange)">{english ? "Vasto Império" : "Vasto Império"}</p>
                <h2 id="simulator-order-title" className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[#1d1d1f] sm:text-3xl">{text.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6e6e73]">{text.intro}</p>
              </div>
              <button type="button" aria-label={text.cancel} onClick={onClose} className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-[#f5f5f7] text-lg text-[#6e6e73] transition hover:bg-[#e9e9ed]">×</button>
            </div>
            <form onSubmit={submit} className={styles.form}>
              <div className={styles.layout}>
                <div className={styles.fields}>
                  <section className={styles.card}>
                    <div className="mb-4 lg:mb-2">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">{english ? "Customer details" : "Dados do cliente"}</h3>
                      <p className="mt-1 text-xs text-[#86868b]">{english ? "Your details for the order and invoice." : "Dados para o pedido e para a faturação."}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:gap-x-3 lg:gap-y-2">
                      <label className="space-y-1 text-sm font-medium text-[#424245]">{text.name}<input required autoComplete="name" value={form.nome} onChange={(event) => setField("nome", event.target.value)} className={styles.input} /></label>
                      <label className="space-y-1 text-sm font-medium text-[#424245]">{text.nif}<input required inputMode="numeric" maxLength={9} value={form.nif} onChange={(event) => setField("nif", event.target.value.replace(/\D/g, "").slice(0, 9))} className={styles.input} /></label>
                      <label className="space-y-1 text-sm font-medium text-[#424245]">{text.phone}<input required type="tel" autoComplete="tel" value={form.telefone} onChange={(event) => setField("telefone", event.target.value)} className={styles.input} /></label>
                      <label className="space-y-1 text-sm font-medium text-[#424245]">{text.email}<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setField("email", event.target.value)} className={styles.input} /></label>
                    </div>
                  </section>

                  <section className={styles.card}>
                    <div className="mb-4 lg:mb-2">
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-[#1d1d1f]">{english ? "Addresses" : "Moradas"}</h3>
                      <p className="mt-1 text-xs text-[#86868b]">{english ? "Provide the address and intended installation location." : "Indique a morada e o local previsto para a instalação."}</p>
                    </div>
                    <div className="space-y-4 lg:space-y-2">
                      <label className="block space-y-1 text-sm font-medium text-[#424245]">{text.fiscal}<input required autoComplete="billing street-address" value={form.moradaFiscal} onChange={(event) => setField("moradaFiscal", event.target.value)} className={styles.input} /></label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-sm text-[#424245]"><input type="checkbox" checked={form.moradaEnvioIgual} onChange={(event) => setField("moradaEnvioIgual", event.target.checked)} className="h-4 w-4 accent-[#0879c0]" />{text.same}</label>
                      {!form.moradaEnvioIgual && <label className="block space-y-1 text-sm font-medium text-[#424245]">{text.shipping}<input required autoComplete="shipping street-address" value={form.moradaEnvio} onChange={(event) => setField("moradaEnvio", event.target.value)} className={styles.input} /></label>}
                    </div>
                  </section>

                  <section className={`grid gap-4 ${equipment ? "" : "sm:grid-cols-2"}`}>
                    {!equipment && <fieldset className={styles.assembly}>
                      <legend className="px-1 text-sm font-semibold text-[#424245]">{text.assembly}</legend>
                      <div className="mt-2 flex rounded-full bg-[#f5f5f7] p-1">
                        {[false, true].map((value) => <button key={String(value)} type="button" aria-pressed={form.montagem === value} onClick={() => setField("montagem", value)} className={`h-10 flex-1 cursor-pointer rounded-full px-4 text-sm font-semibold transition ${form.montagem === value ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73] hover:text-[#1d1d1f]"}`}>{value ? text.yes : text.no}</button>)}
                      </div>
                    </fieldset>}
                    <label className="block space-y-1 text-sm font-medium text-[#424245]">{text.notes}<textarea rows={2} value={form.observacoes} onChange={(event) => setField("observacoes", event.target.value)} placeholder={text.notesPlaceholder} className={styles.notes} /></label>
                  </section>
                </div>

                <aside className={styles.summary}>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6e6e73]">{english ? "Request summary" : "Resumo do pedido"}</p>
                  <div className={styles.summaryBadge}>{english?'Prepared for you':'Preparado à sua medida'}</div>
                  {cartOrder && <p className={styles.summaryCount}>{cartConfigurations?.length || 0} {english?'configurations in your request':'configurações no seu pedido'}</p>}
                  {equipment && <p className="mt-3 text-sm leading-relaxed text-[#424245]">{details}</p>}
                  <div className="mt-5 border-y border-[#dedee3] py-5">
                    <p className="text-sm font-medium text-[#424245]">{text.final}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-(--orange)">{currency.format(total || 0)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">{text.vat}</p>
                  </div>
                  <div className={styles.vatRow}><span>{english?'Estimated with VAT (23% · mainland)':'Estimativa com IVA (23% · continente)'}</span><strong>{currency.format((total || 0) * 1.23)}</strong></div>
                  <p className="mt-4 text-xs leading-relaxed text-[#6e6e73]">{equipment
                    ? (english ? "The item list, equipment image and quotation will be sent to Vasto Império with your request." : "A lista de artigos, a imagem do equipamento e o orçamento seguem para a Vasto Império juntamente com o pedido.")
                    : (english ? "The technical specification and drawing will be sent to Vasto Império with your request." : "A lista técnica e o desenho seguem para a Vasto Império juntamente com o pedido.")}</p>
                </aside>
              </div>
              {error && <p role="alert" className={styles.error}>{error}</p>}
              <div className={styles.actions}>
                <p className={styles.privacy}>{english?'Your details are used to handle this request.':'Os seus dados são utilizados para acompanhar este pedido.'} <a href="/politica-de-privacidade-e-cookies" target="_blank" rel="noopener noreferrer">{english?'Privacy policy':'Política de Privacidade'}</a></p>
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
