"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IoAddOutline, IoArrowUpOutline, IoCheckmarkCircleOutline, IoCloudUploadOutline, IoDocumentTextOutline, IoSearchOutline, IoTimeOutline, IoOpenOutline, IoCloseOutline, IoImagesOutline, IoTrashOutline, IoChevronDownOutline } from "react-icons/io5";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const dateLabel = (date) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const sum = (records, field = "subtotal") => records.reduce((value, sale) => value + Math.round(sale[field] * 100), 0) / 100;
const quoteStatuses = [
  { value: "em_preparacao", label: "A aguardar resposta", color: "bg-amber-50 text-amber-700" },
  { value: "confirmada", label: "Confirmado pelo cliente", color: "bg-sky-50 text-sky-700" },
];
const paymentStatuses = [
  { value: "por_pagar", label: "Por pagar", color: "bg-amber-50 text-amber-700" },
  { value: "entrada_paga", label: "Entrada paga", color: "bg-sky-50 text-sky-700" },
  { value: "pago", label: "Pago", color: "bg-[#f5f5f7] text-[#424245]" },
];
const deliveryStatuses = [
  { value: "por_entregar", label: "Por entregar", color: "bg-orange-50 text-orange-700" },
  { value: "entregue", label: "Entregue", color: "bg-[#f5f5f7] text-[#424245]" },
];
const statusFor = (options, value) => options.find((item) => item.value === value) || options[0];
const isResolved = (sale) => sale.paymentStatus === "pago" && sale.deliveryStatus === "entregue";

function DashboardDropdown({ label, options, value, onChange, className = "", tone = false, disabled = false }) {
  const id = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const selected = options.find((option) => option.value === value) || options[0];

  function updatePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 184);
    const height = Math.min(240, options.length * 40 + 12);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const opensAbove = below < height && above > below;
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      top: opensAbove ? Math.max(8, rect.top - height - 8) : rect.bottom + 8,
      maxHeight: Math.max(100, Math.min(240, opensAbove ? above : below)),
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector('[aria-selected="true"]')?.focus();
  }, [open]);

  function moveFocus(event, index) {
    const menuOptions = menuRef.current?.querySelectorAll('[role="option"]');
    if (!menuOptions?.length) return;
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % menuOptions.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + menuOptions.length) % menuOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = menuOptions.length - 1;
    else return;
    event.preventDefault();
    menuOptions[nextIndex].focus();
  }

  return (
    <div ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`group inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border pl-3 pr-3 text-left text-sm outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-sky-600/20 disabled:cursor-not-allowed ${tone ? `${selected.color} border-transparent font-semibold hover:brightness-[0.97] hover:shadow-sm` : "border-[#e5e5e7] bg-white text-[#424245] hover:border-[#cbd5e1] hover:bg-[#f8fafc] hover:shadow-sm"} ${className}`}
      >
        <span className="truncate">{selected.label}</span>
        <IoChevronDownOutline className={`shrink-0 text-sm text-current opacity-65 transition-all group-hover:text-sky-700 group-hover:opacity-100 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && position && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          style={{ position: "fixed", left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
          className="z-[100] overflow-y-auto rounded-2xl border border-[#e8e8ed] bg-white p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.14)]"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={option.value === value ? 0 : -1}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              onKeyDown={(event) => moveFocus(event, index)}
              className={`flex min-h-9 w-full cursor-pointer items-center rounded-xl px-3 text-left text-sm transition-colors ${option.value === value ? "bg-sky-50 font-semibold text-sky-800" : "text-[#424245] hover:bg-[#f5f5f7]"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600/30`}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function SalesDashboard() {
  const router = useRouter();
  const inputRef = useRef(null);
  const imageInputRefs = useRef({});
  const [sales, setSales] = useState([]);
  const [storage, setStorage] = useState("local");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [changing, setChanging] = useState("");
  const [imagePanel, setImagePanel] = useState("");
  const [uploadingImages, setUploadingImages] = useState("");
  const [deletingImage, setDeletingImage] = useState("");
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deletingSale, setDeletingSale] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [year, setYear] = useState(() => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric" }).format(new Date()));
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", month: "2-digit" }).format(new Date()));
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  async function api(url, options) {
    const response = await fetch(url, { ...options, cache: "no-store" });
    const result = await response.json();
    if (response.status === 401) { router.replace("/admin/login"); router.refresh(); }
    if (!response.ok) throw new Error(result.error || "Não foi possível completar o pedido.");
    return result;
  }

  useEffect(() => {
    let active = true;
    api("/api/admin/sales").then((result) => { if (active) { setSales(result.sales); setStorage(result.storage); } }).catch((failure) => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function importFiles(files) {
    if (uploading || loading || !files?.length) return;
    setUploading(true); setError(""); setNotice("");
    const imported = []; const failures = [];
    try {
      for (const file of Array.from(files)) {
        if (!/\.pdf$/i.test(file.name) || file.size > 6 * 1024 * 1024) { failures.push(`${file.name}: escolha um PDF até 6 MB.`); continue; }
        let uploadPath; let completionStarted = false;
        try {
          if (storage === "cloud") {
            const upload = await api("/api/admin/sales/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: file.size }) });
            uploadPath = upload.path;
            const response = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
            if (!response.ok) throw new Error("Não foi possível carregar o PDF para o armazenamento.");
            completionStarted = true;
            imported.push((await api("/api/admin/sales/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: upload.path, fileName: file.name }) })).sale);
          } else {
            const payload = new FormData(); payload.append("pdf", file);
            imported.push((await api("/api/admin/sales", { method: "POST", body: payload })).sale);
          }
        } catch (failure) {
          let message = failure.message;
          if (uploadPath && !completionStarted) {
            try { await api("/api/admin/sales/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: uploadPath }) }); }
            catch (cleanupFailure) { message += ` A limpeza do envio temporário também falhou: ${cleanupFailure.message}`; }
          }
          failures.push(`${file.name}: ${message}`);
        }
      }
      if (imported.length) {
        setSales((current) => [...imported, ...current]);
        setYear(imported[0].issuedAt.slice(0, 4)); setMonth(imported[0].issuedAt.slice(5, 7)); setStatus("all"); setSearch("");
        setNotice(`${imported.length === 1 ? "Documento registado" : `${imported.length} documentos registados`} com sucesso. Cliente, data e valores identificados automaticamente.`);
      }
      if (failures.length) setError(failures.join("\n"));
    } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  async function updateWorkflow(sale, update) {
    setChanging(sale.id); setError("");
    try {
      const result = await api(`/api/admin/sales/${sale.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) });
      setSales((current) => current.map((item) => item.id === sale.id ? result.sale : item));
    } catch (failure) { setError(failure.message); }
    finally { setChanging(""); }
  }

  async function addImages(sale, files, input) {
    if (!files?.length || uploadingImages) return;
    setUploadingImages(sale.id);
    setError("");
    setNotice("");
    const failures = [];
    let added = 0;
    try {
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4 * 1024 * 1024) {
          failures.push(`${file.name}: escolha JPG, PNG ou WebP até 4 MB.`);
          continue;
        }
        try {
          const form = new FormData();
          form.append("image", file);
          const result = await api(`/api/admin/sales/${sale.id}/images`, { method: "POST", body: form });
          setSales((current) => current.map((item) => item.id === sale.id ? { ...item, images: [...(item.images || []), result.image] } : item));
          added++;
        } catch (failure) {
          failures.push(`${file.name}: ${failure.message}`);
        }
      }
      if (added) setNotice(`${added === 1 ? "Imagem adicionada" : `${added} imagens adicionadas`} ao orçamento.`);
      if (failures.length) setError(failures.join("\n"));
    } finally {
      setUploadingImages("");
      if (input) input.value = "";
    }
  }

  async function removeImage(sale, image) {
    setDeletingImage(image.id);
    setError("");
    setNotice("");
    try {
      await api(`/api/admin/sales/${sale.id}/images/${image.id}`, { method: "DELETE" });
      setSales((current) => current.map((item) => item.id === sale.id ? { ...item, images: (item.images || []).filter((entry) => entry.id !== image.id) } : item));
      setNotice("Imagem removida do orçamento.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setDeletingImage("");
    }
  }

  async function removeSale() {
    if (!saleToDelete || deletingSale) return;
    setDeletingSale(true);
    setError("");
    setNotice("");
    try {
      await api(`/api/admin/sales/${saleToDelete.id}`, { method: "DELETE" });
      setSales((current) => current.filter((sale) => sale.id !== saleToDelete.id));
      if (imagePanel === saleToDelete.id) setImagePanel("");
      setNotice(`O orçamento de ${saleToDelete.customerName} e os respetivos anexos foram eliminados.`);
      setSaleToDelete(null);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setDeletingSale(false);
    }
  }

  const years = [...new Set([year, String(new Date().getFullYear()), ...sales.map((sale) => sale.issuedAt.slice(0, 4))])].sort().reverse();
  const period = sales.filter((sale) => sale.issuedAt.startsWith(year) && (month === "all" || sale.issuedAt.slice(5, 7) === month));
  const confirmed = period.filter((sale) => sale.status !== "em_preparacao");
  const preparing = period.filter((sale) => sale.status === "em_preparacao");
  const visibleSales = period.filter((sale) => (status === "all" || (status === "confirmada" ? sale.status !== "em_preparacao" : sale.status === "em_preparacao")) && `${sale.customerName} ${sale.nif} ${sale.fileName}`.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.uploadedAt.localeCompare(a.uploadedAt));
  const yearSales = sales.filter((sale) => sale.status !== "em_preparacao" && sale.issuedAt.startsWith(year));
  const monthly = months.map((_, index) => sum(yearSales.filter((sale) => sale.issuedAt.slice(5, 7) === String(index + 1).padStart(2, "0"))));
  const max = Math.max(...monthly, 1);
  const periodLabel = month === "all" ? `Ano ${year}` : `${months[Number(month) - 1]} ${year}`;
  const controls = "h-10 rounded-full border border-[#e5e5e7] bg-white py-2 pl-4 pr-4 text-sm text-[#424245] outline-none transition-colors hover:border-[#c7c7cc] hover:bg-[#fbfbfd] focus:border-sky-600 focus:ring-2 focus:ring-sky-600/10";
  return (
    <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto max-w-[1440px]">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">Visão geral</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-[44px]">As suas vendas.</h1><p className="mt-2 text-sm text-[#86868b]">Uma visão clara de cada documento e de cada mês.</p></div>
          </header>

          <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(event) => importFiles(event.target.files)} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold tracking-[-0.025em]">{periodLabel}</h2>
            <div className="flex gap-2">
              <DashboardDropdown
                label="Mês"
                options={[{ value: "all", label: "Todos os meses" }, ...months.map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }))]}
                value={month}
                onChange={setMonth}
              />
              <DashboardDropdown
                label="Ano"
                options={years.map((value) => ({ value, label: value }))}
                value={year}
                onChange={setYear}
              />
            </div>
          </div>

          {error && <div role="alert" className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><p className="whitespace-pre-line">{error}</p><button type="button" aria-label="Fechar aviso" onClick={() => setError("")} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full transition hover:bg-red-100"><IoCloseOutline className="text-xl" /></button></div>}
          {notice && <p role="status" className="mt-5 flex items-start gap-2 rounded-2xl bg-[#f5f5f7] p-4 text-sm text-[#424245]"><IoCheckmarkCircleOutline className="shrink-0 text-lg text-emerald-600" />{notice}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Encomendas confirmadas", value: currency.format(sum(confirmed)), detail: "Valor confirmado · sem IVA", icon: <IoArrowUpOutline />, color: "bg-teal-50 text-teal-700 ring-teal-100" },
              { label: "Total confirmado", value: currency.format(sum(confirmed, "total")), detail: `${confirmed.length} ${confirmed.length === 1 ? "encomenda confirmada" : "encomendas confirmadas"} · com IVA`, icon: <IoCheckmarkCircleOutline />, color: "bg-sky-50 text-sky-600 ring-sky-100" },
              { label: "A aguardar resposta", value: currency.format(sum(preparing)), detail: `${preparing.length} ${preparing.length === 1 ? "orçamento · sem IVA" : "orçamentos · sem IVA"}`, icon: <IoTimeOutline />, color: "bg-slate-50 text-slate-600 ring-slate-200" },
              { label: "Documentos", value: String(period.length).padStart(2, "0"), detail: "Registados neste período", icon: <IoDocumentTextOutline />, color: "bg-violet-50 text-violet-600 ring-violet-100" },
            ].map((card) => <section key={card.label} className="rounded-[24px] border border-[#e8e8ed] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-[#86868b]">{card.label}</p><span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg shadow-sm ring-1 ${card.color}`}>{card.icon}</span></div><p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.055em]">{loading ? "—" : card.value}</p><p className="mt-3 text-[11px] text-[#a1a1a6]">{card.detail}</p></section>)}
          </div>

          <section className="mt-6 rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold tracking-tight">O ano, mês a mês.</h2><p className="mt-1 text-xs text-[#86868b]">Encomendas confirmadas · sem IVA · {year}</p></div><span className="text-lg font-semibold tracking-tight">{currency.format(sum(yearSales))}</span></div>
            <div className="mt-7 grid h-[145px] grid-cols-12 items-end gap-1.5 sm:gap-4">
              {monthly.map((value, index) => <button type="button" key={index} aria-label={`${months[index]} ${year}: ${currency.format(value)} de vendas sem IVA`} title={`${months[index]}: ${currency.format(value)}`} onClick={() => setMonth(String(index + 1).padStart(2, "0"))} className="group flex h-full min-w-0 cursor-pointer flex-col justify-end gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><span className={`block min-h-1 rounded-t-md transition ${month === String(index + 1).padStart(2, "0") ? "bg-orange-600" : "bg-[#dce5ef] group-hover:bg-[#afc1d4]"}`} style={{ height: `${Math.max(4, value / max * 110)}px` }} /><span className={`text-center text-[9px] sm:text-[11px] ${month === String(index + 1).padStart(2, "0") ? "font-semibold text-orange-700" : "text-[#a1a1a6]"}`}>{months[index].slice(0, 3)}</span></button>)}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[28px] border border-[#e8e8ed] bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-[#f0f0f2] p-5 sm:p-7 xl:flex-row xl:items-center">
              <div><h2 className="text-base font-semibold tracking-tight">Encomendas e documentos</h2><p className="mt-1 text-xs text-[#86868b]">{visibleSales.length} {visibleSales.length === 1 ? "registo" : "registos"} · {periodLabel}</p></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative">
                  <span className="sr-only">Pesquisar cliente, NIF ou documento</span>
                  <IoSearchOutline className="absolute left-3 top-3 text-[#a1a1a6]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar cliente ou documento" className={`${controls} w-full pl-9 sm:w-64`} />
                </label>
                <DashboardDropdown
                  label="Filtrar estado do orçamento"
                  options={[
                    { value: "all", label: "Todos os orçamentos" },
                    { value: "em_preparacao", label: "A aguardar resposta" },
                    { value: "confirmada", label: "Confirmado pelo cliente" },
                  ]}
                  value={status}
                  onChange={setStatus}
                />
              </div>
            </div>
            {loading ? <div role="status" className="p-16 text-center text-sm text-[#86868b]">A carregar os seus documentos…</div> : visibleSales.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left">
                  <thead className="bg-[#fbfbfd] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                    <tr><th className="px-6 py-4">Cliente / documento</th><th className="px-4 py-4">Data</th><th className="px-4 py-4 text-right">Sem IVA</th><th className="px-4 py-4 text-right">Com IVA</th><th className="px-4 py-4">Orçamento</th><th className="px-4 py-4">Pagamento</th><th className="px-4 py-4">Entrega</th><th className="px-4 py-4">Estado</th><th className="px-5 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody>
                    {visibleSales.map((sale) => (
                      <Fragment key={sale.id}>
                        <tr className={`border-t transition ${isResolved(sale) ? "border-emerald-100 border-l-2 border-l-emerald-500 bg-[#f5faf6] hover:bg-[#eff7f0]" : "border-[#f0f0f2] hover:bg-[#fbfbfd]"}`}>
                          <td className="max-w-[350px] px-6 py-5">
                            <p className="truncate text-sm font-semibold tracking-tight">{sale.customerName}</p>
                            <p className="mt-1 truncate text-[11px] text-[#a1a1a6]">{sale.nif ? `${sale.nif} · ` : ""}{sale.fileName}</p>
                            <span className="mt-1 inline-block text-[10px] text-[#86868b]">{sale.source === "simulador" ? "Simulador" : "Orçamento"}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-5 text-xs text-[#6e6e73]">{dateLabel(sale.issuedAt)}</td>
                          <td className="whitespace-nowrap px-4 py-5 text-right text-sm font-medium">{currency.format(sale.subtotal)}</td>
                          <td className="whitespace-nowrap px-4 py-5 text-right text-xs text-[#86868b]">{currency.format(sale.total)}</td>
                          <td className="px-4 py-5">
                            <DashboardDropdown
                              label={`Estado do orçamento de ${sale.customerName}`}
                              options={quoteStatuses}
                              value={sale.status}
                              onChange={(value) => updateWorkflow(sale, { status: value })}
                              className="max-w-[185px] text-[11px]"
                              disabled={changing === sale.id}
                              tone
                            />
                          </td>
                          <td className="px-4 py-5">
                            <DashboardDropdown
                              label={`Estado do pagamento de ${sale.customerName}`}
                              options={paymentStatuses}
                              value={sale.paymentStatus}
                              onChange={(value) => updateWorkflow(sale, { paymentStatus: value })}
                              className="text-[11px]"
                              disabled={changing === sale.id}
                              tone
                            />
                          </td>
                          <td className="px-4 py-5">
                            <DashboardDropdown
                              label={`Estado da entrega de ${sale.customerName}`}
                              options={deliveryStatuses}
                              value={sale.deliveryStatus}
                              onChange={(value) => updateWorkflow(sale, { deliveryStatus: value })}
                              className="text-[11px]"
                              disabled={changing === sale.id}
                              tone
                            />
                          </td>
                          <td className="px-4 py-5">
                            {isResolved(sale)
                              ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-2.5 py-1.5 text-[10px] font-semibold text-[#424245]"><IoCheckmarkCircleOutline className="text-sm text-emerald-600" />Resolvido</span>
                              : <span className="inline-flex whitespace-nowrap rounded-full border border-[#e5e5e7] bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-[#86868b]">Não resolvido</span>}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                aria-expanded={imagePanel === sale.id}
                                aria-label={`${imagePanel === sale.id ? "Fechar imagens" : "Gerir imagens"} de ${sale.customerName}`}
                                onClick={() => setImagePanel((current) => current === sale.id ? "" : sale.id)}
                                className={`relative grid h-9 min-w-9 cursor-pointer place-items-center rounded-full px-2 text-lg transition ${imagePanel === sale.id ? "bg-[#f5f5f7] text-[#424245]" : "text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#424245]"}`}
                              >
                                <IoImagesOutline />
                                {(sale.images?.length ?? 0) > 0 && <span className="ml-1 text-[10px] font-semibold">{sale.images.length}</span>}
                              </button>
                              <a href={`/api/admin/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF de ${sale.customerName}`} className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#424245]"><IoOpenOutline /></a>
                              <button type="button" aria-label={`Eliminar orçamento de ${sale.customerName}`} onClick={() => setSaleToDelete(sale)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-lg text-[#a1a1a6] transition hover:bg-red-50 hover:text-red-600"><IoTrashOutline /></button>
                            </div>
                          </td>
                        </tr>
                        {imagePanel === sale.id && (
                          <tr key={`${sale.id}-images`} className="border-t border-[#f0f0f2] bg-[#fbfbfd]">
                            <td colSpan={9} className="px-5 py-5 sm:px-6">
                              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                <div>
                                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Imagens do orçamento</h3>
                                  <p className="mt-1 text-xs text-[#86868b]">Opcional · JPG, PNG ou WebP · até 4 MB por imagem · máximo 10 imagens.</p>
                                </div>
                                <input
                                  ref={(node) => { imageInputRefs.current[sale.id] = node; }}
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp"
                                  multiple
                                  hidden
                                  onChange={(event) => addImages(sale, event.target.files, event.currentTarget)}
                                />
                                <button type="button" disabled={Boolean(uploadingImages) || (sale.images?.length ?? 0) >= 10} onClick={() => imageInputRefs.current[sale.id]?.click()} className="inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-full bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
                                  <IoAddOutline />{uploadingImages === sale.id ? "A carregar…" : "Adicionar imagens"}
                                </button>
                              </div>
                              {sale.images?.length ? (
                                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                  {sale.images.map((image) => (
                                    <div key={image.id} className="group overflow-hidden rounded-2xl border border-[#e8e8ed] bg-white">
                                      <a href={`/api/admin/sales/${sale.id}/images/${image.id}`} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] bg-[#f5f5f7]">
                                        <img src={`/api/admin/sales/${sale.id}/images/${image.id}`} alt={image.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                                      </a>
                                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                                        <p className="min-w-0 truncate text-[11px] text-[#6e6e73]" title={image.name}>{image.name}</p>
                                        <button type="button" disabled={deletingImage === image.id} aria-label={`Remover imagem ${image.name}`} onClick={() => removeImage(sale, image)} className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-[#a1a1a6] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><IoTrashOutline /></button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-4 rounded-2xl border border-dashed border-[#dcdce2] bg-white px-4 py-5 text-center text-xs text-[#86868b]">Ainda não foram adicionadas imagens a este orçamento.</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5f5f7] text-2xl text-[#a1a1a6]"><IoDocumentTextOutline /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{sales.length ? "Ainda sem documentos neste período." : "Tudo começa com o primeiro PDF."}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#86868b]">{sales.length ? "Escolha outro mês ou ajuste os filtros para consultar as suas encomendas." : "Importe um orçamento ou uma simulação. Os dados ficam organizados automaticamente."}</p></div>}
          </section>

          <button type="button" disabled={uploading || loading} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!uploading && !loading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); }} className={`mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-full border-2 border-dashed p-7 transition disabled:cursor-wait disabled:opacity-60 sm:flex-row sm:gap-5 ${dragging ? "border-orange-400 bg-orange-50" : "border-[#dcdce2] hover:border-orange-300 hover:bg-orange-50/50"}`}><IoCloudUploadOutline className="text-3xl text-orange-600" /><span className="text-center sm:text-left"><span className="block text-sm font-semibold">{uploading ? "A ler e registar os documentos…" : "Arraste os seus PDFs para aqui."}</span><span className="mt-1 block text-xs text-[#86868b]">Ou clique para escolher · Orçamentos e simulador · Até 6 MB por PDF</span></span></button>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-[#a1a1a6]">Os totais incluem os orçamentos aceites pelo cliente; o mês é determinado pela data do orçamento.</p>
        </div>
        {saleToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1d1f]/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingSale) setSaleToDelete(null); }}>
            <section role="alertdialog" aria-modal="true" aria-labelledby="delete-sale-title" aria-describedby="delete-sale-description" className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-600">Ação permanente</p>
                  <h2 id="delete-sale-title" className="mt-2 text-xl font-semibold tracking-tight text-[#1d1d1f]">Eliminar orçamento?</h2>
                </div>
                <button type="button" aria-label="Fechar" disabled={deletingSale} onClick={() => setSaleToDelete(null)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#86868b] transition hover:bg-[#f5f5f7] disabled:opacity-50"><IoCloseOutline className="text-xl" /></button>
              </div>
              <p id="delete-sale-description" className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
                O documento de <strong className="font-semibold text-[#1d1d1f]">{saleToDelete.customerName}</strong>, o PDF original e todas as imagens anexadas serão eliminados. Esta ação não pode ser anulada.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={deletingSale} onClick={() => setSaleToDelete(null)} className="h-10 cursor-pointer rounded-full border border-[#e5e5e7] px-5 text-sm font-semibold text-[#424245] transition hover:bg-[#f5f5f7] disabled:opacity-50">Cancelar</button>
                <button type="button" disabled={deletingSale} onClick={removeSale} className="h-10 cursor-pointer rounded-full bg-red-600 px-5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60">{deletingSale ? "A eliminar…" : "Eliminar orçamento"}</button>
              </div>
            </section>
          </div>
        )}
    </main>
  );
}
