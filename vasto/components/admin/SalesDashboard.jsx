"use client";

import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { IoAddOutline, IoArrowUpOutline, IoCheckmarkCircleOutline, IoCloudUploadOutline, IoDocumentTextOutline, IoSearchOutline, IoTimeOutline, IoOpenOutline, IoCloseOutline, IoImagesOutline, IoTrashOutline, IoChevronDownOutline } from "react-icons/io5";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const compactCurrency = (amount) => {
  const absoluteAmount = Math.abs(amount);
  const divisor = absoluteAmount >= 1_000_000 ? 1_000_000 : absoluteAmount >= 1_000 ? 1_000 : 1;
  const suffix = divisor === 1_000_000 ? " mi" : divisor === 1_000 ? " mil" : "";
  const number = (amount / divisor).toFixed(1).replace(/\.0$/, "").replace(".", ",");
  return `${number}${suffix} €`;
};
const dateLabel = (date) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const todayInLisbon = () => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const periodDate = (sale) => sale.status === "em_preparacao" ? sale.issuedAt : sale.deliveryStatus === "entregue" && sale.deliveryDate ? sale.deliveryDate : sale.saleDate || sale.issuedAt;
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
  const [imageDropTarget, setImageDropTarget] = useState("");
  const [deletingImage, setDeletingImage] = useState("");
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deliveryPrompt, setDeliveryPrompt] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deletingSale, setDeletingSale] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tableDropActive, setTableDropActive] = useState(false);
  const tableDragDepth = useRef(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [salesDetail, setSalesDetail] = useState("");
  const [year, setYear] = useState(() => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric" }).format(new Date()));
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", month: "2-digit" }).format(new Date()));
  const [status, setStatus] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [resolutionFilter, setResolutionFilter] = useState("all");
  const [headerSort, setHeaderSort] = useState({ group: "", value: "all" });
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!salesDetail) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSalesDetail("");
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [salesDetail]);

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
        setYear(imported[0].issuedAt.slice(0, 4)); setMonth(imported[0].issuedAt.slice(5, 7)); setStatus("all"); setPaymentFilter("all"); setDeliveryFilter("all"); setResolutionFilter("all"); setSearch("");
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
      if (update.deliveryDate) {
        setYear(update.deliveryDate.slice(0, 4));
        setMonth(update.deliveryDate.slice(5, 7));
      }
    } catch (failure) { setError(failure.message); }
    finally { setChanging(""); }
  }

  async function confirmDelivery() {
    if (!deliveryPrompt || !deliveryDate) return;
    const sale = deliveryPrompt;
    setChanging(sale.id); setError("");
    try {
      const result = await api(`/api/admin/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus: "entregue", deliveryDate }),
      });
      setSales((current) => current.map((item) => item.id === sale.id ? result.sale : item));
      setYear(deliveryDate.slice(0, 4));
      setMonth(deliveryDate.slice(5, 7));
      setNotice(`Entrega de ${sale.customerName} registada em ${dateLabel(deliveryDate)}.`);
      setDeliveryPrompt(null);
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

  const years = [...new Set([year, String(new Date().getFullYear()), ...sales.map((sale) => periodDate(sale).slice(0, 4))])].sort().reverse();
  const period = sales.filter((sale) => periodDate(sale).startsWith(year) && (month === "all" || periodDate(sale).slice(5, 7) === month));
  const confirmed = period.filter((sale) => sale.status !== "em_preparacao");
  const preparing = period.filter((sale) => sale.status === "em_preparacao");
  const filteredSales = period.filter((sale) => {
    const matchesQuote = status === "all" || (status === "confirmada" ? sale.status !== "em_preparacao" : sale.status === "em_preparacao");
    const matchesPayment = paymentFilter === "all" || sale.paymentStatus === paymentFilter;
    const matchesDelivery = deliveryFilter === "all" || sale.deliveryStatus === deliveryFilter;
    const matchesResolution = resolutionFilter === "all" || (resolutionFilter === "resolved" ? isResolved(sale) : !isResolved(sale));
    const matchesSearch = `${sale.customerName} ${sale.nif} ${sale.fileName}`.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"));
    return matchesQuote && matchesPayment && matchesDelivery && matchesResolution && matchesSearch;
  });
  const headerSortGroups = {
    quote: (sale, value) => value === "em_preparacao" ? sale.status === "em_preparacao" : sale.status !== "em_preparacao",
    payment: (sale, value) => sale.paymentStatus === value,
    delivery: (sale, value) => sale.deliveryStatus === value,
    resolution: (sale, value) => value === "resolved" ? isResolved(sale) : !isResolved(sale),
  };
  const visibleSales = [...filteredSales].sort((a, b) => {
    if (headerSort.group && headerSort.value !== "all") {
      const matchesA = headerSortGroups[headerSort.group](a, headerSort.value);
      const matchesB = headerSortGroups[headerSort.group](b, headerSort.value);
      if (matchesA !== matchesB) return matchesA ? -1 : 1;
    }
    return periodDate(b).localeCompare(periodDate(a)) || b.uploadedAt.localeCompare(a.uploadedAt);
  });
  const hasActiveFilters = status !== "all" || paymentFilter !== "all" || deliveryFilter !== "all" || resolutionFilter !== "all" || Boolean(search);
  const yearSales = sales.filter((sale) => sale.status !== "em_preparacao" && periodDate(sale).startsWith(year));
  const monthly = months.map((_, index) => {
    const monthSales = yearSales.filter((sale) => periodDate(sale).slice(5, 7) === String(index + 1).padStart(2, "0"));
    return { subtotal: sum(monthSales), total: sum(monthSales, "total") };
  });
  const averageConfirmed = confirmed.length ? sum(confirmed) / confirmed.length : 0;
  const conversionRate = period.length ? Math.round((confirmed.length / period.length) * 100) : 0;
  const resolvedCount = confirmed.filter(isResolved).length;
  const resolvedRate = period.length ? Math.round((resolvedCount / period.length) * 100) : 0;
  const max = Math.max(...monthly.map(({ subtotal }) => subtotal), 1);
  const periodLabel = month === "all" ? `Ano ${year}` : `${months[Number(month) - 1]} ${year}`;
  const controls = "h-10 rounded-full border border-[#e5e5e7] bg-white py-2 pl-4 pr-4 text-sm text-[#424245] outline-none transition-colors hover:border-[#c7c7cc] hover:bg-[#fbfbfd] focus:border-sky-600 focus:ring-2 focus:ring-sky-600/10";
  const filterGroups = [
    {
      id: "quote",
      label: "Orçamento",
      value: status,
      onChange: setStatus,
      options: [
        { value: "all", label: "Todos" },
        { value: "em_preparacao", label: "A aguardar resposta" },
        { value: "confirmada", label: "Confirmado" },
      ],
    },
    {
      id: "payment",
      label: "Pagamento",
      value: paymentFilter,
      onChange: setPaymentFilter,
      options: [
        { value: "all", label: "Todos" },
        { value: "por_pagar", label: "Por pagar" },
        { value: "entrada_paga", label: "Entrada paga" },
        { value: "pago", label: "Pago" },
      ],
    },
    {
      id: "delivery",
      label: "Entrega",
      value: deliveryFilter,
      onChange: setDeliveryFilter,
      options: [
        { value: "all", label: "Todos" },
        { value: "por_entregar", label: "Por entregar" },
        { value: "entregue", label: "Entregue" },
      ],
    },
    {
      id: "resolution",
      label: "Resolução",
      value: resolutionFilter,
      onChange: setResolutionFilter,
      options: [
        { value: "all", label: "Todos" },
        { value: "resolved", label: "Resolvidos" },
        { value: "unresolved", label: "Não resolvidos" },
      ],
    },
  ];
  const cycleHeaderSort = (group) => {
    const currentValue = headerSort.group === group.id ? headerSort.value : "all";
    const currentIndex = group.options.findIndex((option) => option.value === currentValue);
    const nextValue = group.options[(currentIndex + 1) % group.options.length].value;
    setHeaderSort(nextValue === "all" ? { group: "", value: "all" } : { group: group.id, value: nextValue });
  };
  const salesDetailRows = (records) => records
    .slice()
    .sort((a, b) => periodDate(b).localeCompare(periodDate(a)) || b.uploadedAt.localeCompare(a.uploadedAt))
    .map((sale) => {
      const articles = sale.orderDetails?.artigos;
      const articleDetail = Array.isArray(articles) && articles.length
        ? articles.map((item) => `${item.produto || "Artigo"} × ${Number(item.unidades) || 0}`).join(", ")
        : "Artigos não discriminados";
      return {
        customer: sale.customerName || "Cliente",
        document: sale.fileName || "Documento",
        date: dateLabel(periodDate(sale)),
        status: `${statusFor(quoteStatuses, sale.status).label} · ${statusFor(paymentStatuses, sale.paymentStatus).label} · ${statusFor(deliveryStatuses, sale.deliveryStatus).label}`,
        value: currency.format(sale.subtotal),
        detail: articleDetail,
      };
    });
  const salesDetails = {
    confirmed: {
      title: "Encomendas confirmadas",
      description: `Valor total sem IVA das encomendas confirmadas em ${periodLabel}.`,
      rows: salesDetailRows(confirmed),
      metric: currency.format(sum(confirmed)),
      empty: "Não há encomendas confirmadas neste período.",
    },
    gross: {
      title: "Total confirmado com IVA",
      description: `Composição do total com IVA das ${confirmed.length} encomendas confirmadas em ${periodLabel}.`,
      rows: salesDetailRows(confirmed),
      metric: currency.format(sum(confirmed, "total")),
      empty: "Não há encomendas confirmadas neste período.",
    },
    preparing: {
      title: "Orçamentos a aguardar resposta",
      description: `Documentos pendentes e respetivos valores em ${periodLabel}.`,
      rows: salesDetailRows(preparing),
      metric: currency.format(sum(preparing)),
      empty: "Não há orçamentos a aguardar resposta neste período.",
    },
    documents: {
      title: "Documentos registados",
      description: `Todos os documentos registados em ${periodLabel}.`,
      rows: salesDetailRows(period),
      metric: String(period.length),
      empty: "Não há documentos neste período.",
    },
    average: {
      title: "Valor médio por encomenda",
      description: `Média de ${currency.format(averageConfirmed)} sem IVA, calculada sobre ${confirmed.length} encomendas confirmadas.`,
      rows: salesDetailRows(confirmed),
      metric: currency.format(averageConfirmed),
      empty: "Não há encomendas confirmadas para calcular a média.",
    },
    conversion: {
      title: "Taxa de conversão",
      description: `${confirmed.length} de ${period.length} documentos confirmados · ${conversionRate}% em ${periodLabel}.`,
      rows: salesDetailRows(period),
      metric: `${conversionRate}%`,
      empty: "Não há documentos neste período.",
    },
    resolved: {
      title: "Encomendas resolvidas",
      description: `${resolvedCount} de ${period.length} documentos pagos e entregues · ${resolvedRate}% em ${periodLabel}.`,
      rows: salesDetailRows(period),
      metric: `${resolvedRate}%`,
      empty: "Não há documentos neste período.",
    },
  };
  return (
    <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-6 lg:py-10 xl:px-8">
        <div className="mx-auto w-full max-w-[1500px]">
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
              { id: "confirmed", label: "Encomendas confirmadas", value: currency.format(sum(confirmed)), detail: "Valor confirmado · sem IVA", icon: <IoArrowUpOutline />, color: "bg-teal-50 text-teal-700 ring-teal-100" },
              { id: "gross", label: "Total confirmado", value: currency.format(sum(confirmed, "total")), detail: `${confirmed.length} ${confirmed.length === 1 ? "encomenda confirmada" : "encomendas confirmadas"} · com IVA`, icon: <IoCheckmarkCircleOutline />, color: "bg-sky-50 text-sky-600 ring-sky-100" },
              { id: "preparing", label: "A aguardar resposta", value: currency.format(sum(preparing)), detail: `${preparing.length} ${preparing.length === 1 ? "orçamento · sem IVA" : "orçamentos · sem IVA"}`, icon: <IoTimeOutline />, color: "bg-slate-50 text-slate-600 ring-slate-200" },
              { id: "documents", label: "Documentos", value: String(period.length).padStart(2, "0"), detail: "Registados neste período", icon: <IoDocumentTextOutline />, color: "bg-violet-50 text-violet-600 ring-violet-100" },
            ].map((card) => (
              <button
                type="button"
                key={card.label}
                aria-haspopup="dialog"
                onClick={() => setSalesDetail(card.id)}
                className="w-full cursor-pointer rounded-[24px] border border-[#e8e8ed] bg-white p-5 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30 sm:p-6"
              >
                <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-[#86868b]">{card.label}</p><span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg shadow-sm ring-1 ${card.color}`}>{card.icon}</span></div>
                <p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.055em]">{loading ? "—" : card.value}</p>
                <p className="mt-3 text-[11px] text-[#a1a1a6]">{card.detail}</p>
              </button>
            ))}
          </div>

          <section className="mt-6 rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div><h2 className="text-base font-semibold tracking-tight">O ano, mês a mês.</h2><p className="mt-1 text-xs text-[#86868b]">Encomendas confirmadas · por data da venda · {year}</p></div>
              <div className="flex flex-col gap-2 sm:text-right">
                <div><p className="text-[10px] font-medium text-[#86868b]">Total sem IVA</p><p className="text-sm font-semibold tracking-tight text-[#1d1d1f]">{currency.format(sum(yearSales))}</p></div>
                <div><p className="text-[10px] font-medium text-[#86868b]">Total com IVA</p><p className="text-sm font-semibold tracking-tight text-sky-700">{currency.format(sum(yearSales, "total"))}</p></div>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-6 gap-x-2 gap-y-4 sm:grid-cols-12 sm:gap-x-4">
              {monthly.map(({ subtotal, total }, index) => <button type="button" key={index} aria-label={`${months[index]} ${year}: ${currency.format(subtotal)} sem IVA, ${currency.format(total)} com IVA`} title={`${months[index]}: ${currency.format(subtotal)} sem IVA · ${currency.format(total)} com IVA`} onClick={() => setMonth(String(index + 1).padStart(2, "0"))} className="group flex h-[105px] min-w-0 cursor-pointer flex-col items-center justify-end gap-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
                <span className={`w-full truncate text-center text-[8px] leading-tight sm:text-[9px] ${month === String(index + 1).padStart(2, "0") ? "font-semibold text-orange-700" : "text-[#86868b]"}`}>{compactCurrency(subtotal)}</span>
                <span className={`block w-full rounded-t-md transition ${month === String(index + 1).padStart(2, "0") ? "bg-orange-600" : "bg-[#dce5ef] group-hover:bg-[#afc1d4]"}`} style={{ height: `${Math.max(4, subtotal / max * 65)}px` }} />
                <span className={`text-center text-[9px] sm:text-[11px] ${month === String(index + 1).padStart(2, "0") ? "font-semibold text-orange-700" : "text-[#a1a1a6]"}`}>{months[index].slice(0, 3)}</span>
              </button>)}
            </div>
          </section>

          <section aria-labelledby="sales-insights-heading" className="mt-6">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><h2 id="sales-insights-heading" className="text-base font-semibold tracking-tight">Indicadores do período</h2><p className="mt-1 text-xs text-[#86868b]">Um resumo do desempenho em {periodLabel.toLocaleLowerCase("pt-PT")}.</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button type="button" aria-haspopup="dialog" onClick={() => setSalesDetail("average")} className="w-full cursor-pointer rounded-2xl border border-[#e8e8ed] bg-white p-4 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30">
                <p className="text-xs font-medium text-[#86868b]">Valor médio por encomenda</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[#1d1d1f]">{loading ? "—" : currency.format(averageConfirmed)}</p>
                <p className="mt-1 text-[11px] text-[#a1a1a6]">Encomendas confirmadas · sem IVA</p>
              </button>
              <button type="button" aria-haspopup="dialog" onClick={() => setSalesDetail("conversion")} className="w-full cursor-pointer rounded-2xl border border-[#e8e8ed] bg-white p-4 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30">
                <p className="text-xs font-medium text-[#86868b]">Taxa de conversão</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-sky-700">{loading ? "—" : `${conversionRate}%`}</p>
                <p className="mt-1 text-[11px] text-[#a1a1a6]">{confirmed.length} confirmadas de {period.length} documentos</p>
              </button>
              <button type="button" aria-haspopup="dialog" onClick={() => setSalesDetail("resolved")} className="w-full cursor-pointer rounded-2xl border border-[#e8e8ed] bg-white p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30">
                <p className="text-xs font-medium text-[#86868b]">Encomendas resolvidas</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-emerald-700">{loading ? "—" : `${resolvedRate}%`}</p>
                <p className="mt-1 text-[11px] text-[#a1a1a6]">{resolvedCount} pagas e entregues de {period.length} documentos</p>
              </button>
            </div>
          </section>

          <section
            className={`relative mt-6 overflow-hidden rounded-[28px] border bg-white transition-colors ${tableDropActive ? "border-2 border-dashed border-orange-400" : "border-[#e8e8ed]"}`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (uploading || loading || !Array.from(event.dataTransfer.items || []).some((item) => item.kind === "file")) return;
              tableDragDepth.current += 1;
              setTableDropActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                tableDragDepth.current = 0;
                setTableDropActive(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              tableDragDepth.current = 0;
              setTableDropActive(false);
              importFiles(Array.from(event.dataTransfer.files));
            }}
          >
            {tableDropActive && (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-white/85 backdrop-blur-[2px]" role="status">
                <div className="rounded-2xl border border-orange-200 bg-white px-6 py-5 text-center shadow-lg">
                  <IoCloudUploadOutline className="mx-auto text-3xl text-orange-600" />
                  <p className="mt-2 text-sm font-semibold text-[#1d1d1f]">Largue os PDFs para registar</p>
                  <p className="mt-1 text-xs text-[#86868b]">Orçamentos ou simulações · até 6 MB por PDF</p>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-4 border-b border-[#f0f0f2] p-5 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
              <div className="shrink-0"><h2 className="text-base font-semibold tracking-tight">Encomendas e documentos</h2><p className="mt-1 text-xs text-[#86868b]">{visibleSales.length} de {period.length} {visibleSales.length === 1 ? "registo" : "registos"} · {periodLabel}</p></div>
              <div className="flex flex-wrap items-center justify-end gap-2 xl:flex-nowrap">
                <label className="relative w-full sm:w-[240px] sm:max-w-[320px]">
                  <span className="sr-only">Pesquisar cliente, NIF ou documento</span>
                  <IoSearchOutline className="absolute left-3 top-3 text-[#a1a1a6]" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar cliente, NIF ou documento" className={`${controls} w-full pl-9`} />
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
                  className="xl:w-[148px] xl:max-w-[148px] xl:text-xs"
                />
                <DashboardDropdown
                  label="Filtrar estado do pagamento"
                  options={[
                    { value: "all", label: "Qualquer pagamento" },
                    { value: "por_pagar", label: "Por pagar" },
                    { value: "entrada_paga", label: "Entrada paga" },
                    { value: "pago", label: "Pago" },
                  ]}
                  value={paymentFilter}
                  onChange={setPaymentFilter}
                  className="xl:w-[148px] xl:max-w-[148px] xl:text-xs"
                />
                <DashboardDropdown
                  label="Filtrar estado da entrega"
                  options={[
                    { value: "all", label: "Qualquer entrega" },
                    { value: "por_entregar", label: "Por entregar" },
                    { value: "entregue", label: "Entregue" },
                  ]}
                  value={deliveryFilter}
                  onChange={setDeliveryFilter}
                  className="xl:w-[148px] xl:max-w-[148px] xl:text-xs"
                />
                <DashboardDropdown
                  label="Filtrar resolução"
                  options={[
                    { value: "all", label: "Resolvidos e pendentes" },
                    { value: "resolved", label: "Resolvidos" },
                    { value: "unresolved", label: "Não resolvidos" },
                  ]}
                  value={resolutionFilter}
                  onChange={setResolutionFilter}
                  className="xl:w-[148px] xl:max-w-[148px] xl:text-xs"
                />
                  {hasActiveFilters && (
                    <button type="button" onClick={() => { setStatus("all"); setPaymentFilter("all"); setDeliveryFilter("all"); setResolutionFilter("all"); setSearch(""); }} className="h-10 cursor-pointer rounded-full px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-50">
                      Limpar filtros
                    </button>
                  )}
              </div>
            </div>
            {loading ? <div role="status" className="p-16 text-center text-sm text-[#86868b]">A carregar os seus documentos…</div> : visibleSales.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] table-fixed text-left">
                  <thead className="bg-[#fbfbfd] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                    <tr>
                      <th className="w-[17%] px-3 py-4">Cliente / documento</th>
                      <th className="w-[14%] px-2 py-4 text-right">Valores</th>
                      {filterGroups.map((group) => {
                        const headerValue = headerSort.group === group.id ? headerSort.value : "all";
                        const selected = group.options.find((option) => option.value === headerValue) || group.options[0];
                        const active = selected.value !== "all";
                        return (
                          <th key={group.label} className={`px-2 py-1.5 ${group.label === "Orçamento" ? "w-[13%]" : group.label === "Pagamento" ? "w-[11%]" : group.label === "Entrega" ? "w-[24%]" : "w-[9%]"}`}>
                            <button
                              type="button"
                              aria-label={`Ordenar por ${group.label.toLocaleLowerCase("pt-PT")}: ${selected.label}. Clique para alternar a prioridade.`}
                              aria-pressed={active}
                              title={`Clique para mostrar primeiro os registos ${selected.value === "all" ? "" : `com estado "${selected.label}" em `}${group.label.toLocaleLowerCase("pt-PT")}`}
                              onClick={() => cycleHeaderSort(group)}
                              className={`flex min-h-7 w-full cursor-pointer items-center rounded-lg px-2 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30 ${active ? "font-semibold text-sky-800" : "text-[#86868b]"}`}
                            >
                              <span>{group.label === "Resolução" ? "Estado" : group.label}</span>
                            </button>
                          </th>
                        );
                      })}
                      <th className="w-[12%] px-3 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSales.map((sale) => (
                      <Fragment key={sale.id}>
                        <tr className={`border-t border-l-2 transition ${isResolved(sale) ? "border-emerald-100 border-l-emerald-500 bg-[#f5faf6] hover:bg-[#eff7f0]" : "border-[#f0f0f2] border-l-red-500 hover:bg-[#fbfbfd]"}`}>
                          <td className="px-3 py-5">
                            <p className="truncate text-sm font-semibold tracking-tight">{sale.customerName}</p>
                            <p className="mt-1 truncate text-[11px] text-[#a1a1a6]">{sale.nif ? `${sale.nif} · ` : ""}{sale.fileName}</p>
                            <p className="mt-1 truncate text-[10px] text-[#86868b]">{sale.source === "simulador" ? "Simulador" : "Orçamento"} · {dateLabel(sale.issuedAt)}</p>
                            {sale.uploadedAt && <p className="mt-0.5 truncate text-[9px] text-[#a1a1a6]" title={`Pedido recebido em ${dateLabel(sale.uploadedAt.slice(0, 10))}`}>Recebido · {dateLabel(sale.uploadedAt.slice(0, 10))}</p>}
                          </td>
                          <td className="whitespace-nowrap px-2 py-5 text-right">
                            <p className="text-sm font-medium">{currency.format(sale.subtotal)}</p>
                            <p className="mt-1 text-[10px] text-[#86868b]">c/ IVA {currency.format(sale.total)}</p>
                          </td>
                          <td className="px-2 py-5">
                            <DashboardDropdown
                              label={`Estado do orçamento de ${sale.customerName}`}
                              options={quoteStatuses}
                              value={sale.status}
                              onChange={(value) => updateWorkflow(sale, { status: value })}
                              className="w-full max-w-[140px] text-[11px]"
                              disabled={changing === sale.id}
                              tone
                            />
                          </td>
                          <td className="px-2 py-5">
                            <DashboardDropdown
                              label={`Estado do pagamento de ${sale.customerName}`}
                              options={paymentStatuses}
                              value={sale.paymentStatus}
                              onChange={(value) => updateWorkflow(sale, { paymentStatus: value })}
                              className="w-full max-w-[112px] text-[11px]"
                              disabled={changing === sale.id}
                              tone
                            />
                          </td>
                          <td className="px-2 py-5">
                            <div className="flex items-center gap-1">
                              <DashboardDropdown
                                label={`Estado da entrega de ${sale.customerName}`}
                                options={deliveryStatuses}
                                value={sale.deliveryStatus}
                                onChange={(value) => {
                                  if (value === "entregue") {
                                    setDeliveryDate(sale.deliveryDate || todayInLisbon());
                                    setDeliveryPrompt(sale);
                                  } else updateWorkflow(sale, { deliveryStatus: value });
                                }}
                                className="w-[98px] shrink-0 text-[11px]"
                                disabled={changing === sale.id}
                                tone
                              />
                              {sale.deliveryStatus === "entregue" && (
                                <label className="flex min-w-0 items-center text-[10px] font-medium text-[#6e6e73]">
                                  <input
                                    type="date"
                                    aria-label={`Data de entrega de ${sale.customerName}`}
                                    title="Data de entrega"
                                    value={sale.deliveryDate || ""}
                                    max="9999-12-31"
                                    disabled={changing === sale.id}
                                    onChange={(event) => {
                                      if (event.target.value) updateWorkflow(sale, { deliveryDate: event.target.value });
                                    }}
                                    className="h-10 w-[116px] min-w-0 cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-2 text-[10px] text-[#424245] outline-none transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] focus:border-sky-600 focus:ring-2 focus:ring-sky-600/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  />
                                </label>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-5">
                            {isResolved(sale)
                              ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-2.5 py-1.5 text-[10px] font-semibold text-[#424245]"><IoCheckmarkCircleOutline className="text-sm text-emerald-600" />Resolvido</span>
                              : <span className="inline-flex whitespace-nowrap rounded-full border border-[#e5e5e7] bg-white/80 px-2.5 py-1.5 text-[10px] font-medium text-[#86868b]">Não resolvido</span>}
                          </td>
                          <td className="px-3 py-4">
                            <div className="flex justify-end gap-0">
                              <button
                                type="button"
                                aria-expanded={imagePanel === sale.id}
                                aria-label={`${imagePanel === sale.id ? "Fechar imagens" : "Gerir imagens"} de ${sale.customerName}`}
                                onClick={() => setImagePanel((current) => current === sale.id ? "" : sale.id)}
                                className={`relative grid h-8 min-w-8 cursor-pointer place-items-center rounded-full px-1 text-base transition ${imagePanel === sale.id ? "bg-[#f5f5f7] text-[#424245]" : "text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#424245]"}`}
                              >
                                <IoImagesOutline />
                                {(sale.images?.length ?? 0) > 0 && <span className="ml-1 text-[10px] font-semibold">{sale.images.length}</span>}
                              </button>
                              <a href={`/api/admin/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF de ${sale.customerName}`} className="grid h-8 w-8 place-items-center rounded-full text-base text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#424245]"><IoOpenOutline /></a>
                              <button type="button" aria-label={`Eliminar orçamento de ${sale.customerName}`} onClick={() => setSaleToDelete(sale)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full text-base text-[#a1a1a6] transition hover:bg-red-50 hover:text-red-600"><IoTrashOutline /></button>
                            </div>
                          </td>
                        </tr>
                        {imagePanel === sale.id && (
                          <tr key={`${sale.id}-images`} className="border-t border-[#f0f0f2] bg-[#fbfbfd]">
                            <td colSpan={9} className="px-5 py-5 sm:px-6">
                              {sale.orderDetails && (
                                <section className="mb-5 rounded-2xl border border-[#e8e8ed] bg-white p-4 sm:p-5">
                                  <h3 className="text-sm font-semibold text-[#1d1d1f]">Detalhes da encomenda</h3>
                                  <dl className="mt-3 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
                                    <div><dt className="text-[#86868b]">Email</dt><dd className="mt-0.5 break-all font-medium text-[#424245]">{sale.orderDetails.email || "—"}</dd></div>
                                    <div><dt className="text-[#86868b]">Contacto telefónico</dt><dd className="mt-0.5 font-medium text-[#424245]">{sale.orderDetails.telefone || "—"}</dd></div>
                                    <div><dt className="text-[#86868b]">Montagem</dt><dd className="mt-0.5 font-medium text-[#424245]">{sale.orderDetails.montagem === null ? "Não aplicável" : sale.orderDetails.montagem ? "Sim" : "Não"}</dd></div>
                                    <div><dt className="text-[#86868b]">Morada fiscal</dt><dd className="mt-0.5 font-medium text-[#424245]">{sale.orderDetails.moradaFiscal || "—"}</dd></div>
                                    <div><dt className="text-[#86868b]">Morada de envio</dt><dd className="mt-0.5 font-medium text-[#424245]">{sale.orderDetails.moradaEnvio || "—"}</dd></div>
                                    {sale.orderDetails.observacoes && <div><dt className="text-[#86868b]">Observações</dt><dd className="mt-0.5 whitespace-pre-wrap font-medium text-[#424245]">{sale.orderDetails.observacoes}</dd></div>}
                                  </dl>
                                  {sale.orderDetails.detalhes && <div className="mt-4 border-t border-[#f0f0f2] pt-3"><p className="text-[11px] font-medium text-[#86868b]">Configuração</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[#424245]">{sale.orderDetails.detalhes}</p></div>}
                                  {sale.orderDetails.artigos?.length > 0 && (
                                    <div className="mt-4 overflow-x-auto border-t border-[#f0f0f2] pt-3">
                                      <p className="mb-2 text-[11px] font-medium text-[#86868b]">Artigos encomendados</p>
                                      <table className="w-full min-w-[420px] text-left text-xs">
                                        <thead className="text-[10px] uppercase tracking-wide text-[#86868b]"><tr><th className="py-1 pr-3">Ref.</th><th className="py-1 pr-3">Artigo</th><th className="py-1 pr-3 text-right">Qtd.</th><th className="py-1 text-right">Total</th></tr></thead>
                                        <tbody>{sale.orderDetails.artigos.map((item, index) => <tr key={`${item.refCompleta}-${index}`} className="border-t border-[#f0f0f2] text-[#424245]"><td className="py-2 pr-3">{item.refCompleta || "—"}</td><td className="py-2 pr-3">{item.produto || "—"}</td><td className="py-2 pr-3 text-right">{item.unidades}</td><td className="py-2 text-right">{currency.format(item.total)}</td></tr>)}</tbody>
                                      </table>
                                    </div>
                                  )}
                                </section>
                              )}
                              <div
                                onDragEnter={(event) => {
                                  event.preventDefault();
                                  if (!uploadingImages) setImageDropTarget(sale.id);
                                }}
                                onDragOver={(event) => event.preventDefault()}
                                onDragLeave={(event) => {
                                  if (!event.currentTarget.contains(event.relatedTarget)) setImageDropTarget("");
                                }}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  tableDragDepth.current = 0;
                                  setTableDropActive(false);
                                  setImageDropTarget("");
                                  if ((sale.images?.length ?? 0) < 10) addImages(sale, event.dataTransfer.files);
                                  else setError("Este registo já atingiu o máximo de 10 imagens.");
                                }}
                                className={`rounded-2xl border border-dashed p-4 transition-colors sm:p-5 ${imageDropTarget === sale.id ? "border-sky-500 bg-sky-50" : "border-[#dcdce2] bg-white"}`}
                              >
                                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                  <div>
                                    <h3 className="text-sm font-semibold text-[#1d1d1f]">Imagens do registo</h3>
                                    <p className="mt-1 text-xs text-[#86868b]">Arraste imagens para aqui ou escolha ficheiros · JPG, PNG ou WebP · até 4 MB por imagem · máximo 10.</p>
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
                                  <p className="mt-4 rounded-xl bg-[#fbfbfd] px-4 py-5 text-center text-xs text-[#86868b]">Ainda não foram adicionadas imagens. Pode arrastá-las para esta área.</p>
                                )}
                              </div>
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

          <button type="button" disabled={uploading || loading} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!uploading && !loading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); importFiles(Array.from(event.dataTransfer.files)); }} className={`mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-full border-2 border-dashed p-7 transition disabled:cursor-wait disabled:opacity-60 sm:flex-row sm:gap-5 ${dragging ? "border-orange-400 bg-orange-50" : "border-[#dcdce2] hover:border-orange-300 hover:bg-orange-50/50"}`}><IoCloudUploadOutline className="text-3xl text-orange-600" /><span className="text-center sm:text-left"><span className="block text-sm font-semibold">{uploading ? "A ler e registar os documentos…" : "Arraste os seus PDFs para aqui."}</span><span className="mt-1 block text-xs text-[#86868b]">Ou clique para escolher · Orçamentos e simulador · Até 6 MB por PDF</span></span></button>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-[#a1a1a6]">As vendas ainda não entregues contam no mês em que foram confirmadas; ao registar a entrega, passam a contar no mês da entrega. Os orçamentos a aguardar resposta contam no mês de emissão.</p>
        </div>
        {salesDetail && (
          <div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-[#1d1d1f]/35 p-4 backdrop-blur-[2px]"
            onMouseDown={(event) => { if (event.target === event.currentTarget) setSalesDetail(""); }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="sales-detail-title"
              className="max-h-[min(85vh,48rem)] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-[#e8e8ed] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
            >
              <div className="border-b border-[#e8e8ed] bg-gradient-to-br from-sky-50 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-700">Detalhe das vendas · {periodLabel}</p>
                    <h2 id="sales-detail-title" className="mt-1.5 text-xl font-semibold tracking-tight text-[#1d1d1f]">{salesDetails[salesDetail].title}</h2>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#6e6e73]">{salesDetails[salesDetail].description}</p>
                  </div>
                  <button type="button" aria-label="Fechar detalhe" onClick={() => setSalesDetail("")} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e5e5e7] bg-white text-[#6e6e73] transition hover:border-[#c8c9cf] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30">
                    <IoCloseOutline className="text-xl" />
                  </button>
                </div>
              </div>
              {salesDetails[salesDetail].rows.length ? (
                <div className="p-5 sm:p-7">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1d1d1f]">Registos incluídos</p>
                      <p className="mt-0.5 text-xs text-[#86868b]">A tabela de vendas continua visível por trás deste detalhe.</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                      {salesDetails[salesDetail].rows.length} {salesDetails[salesDetail].rows.length === 1 ? "registo" : "registos"} · {salesDetails[salesDetail].metric}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[#e8e8ed]">
                    <div className="max-h-[min(48vh,25rem)] overflow-auto">
                      <table className="w-full min-w-[700px] text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-[#f7f8fa] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                          <tr>
                            <th className="px-3 py-3">Cliente / documento</th>
                            <th className="px-3 py-3">Data e estado</th>
                            <th className="px-3 py-3">Artigos</th>
                            <th className="px-3 py-3 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f0f2]">
                          {salesDetails[salesDetail].rows.map((row, index) => (
                            <tr key={`${row.document}-${index}`} className="align-top transition-colors odd:bg-white even:bg-[#fbfbfd] hover:bg-sky-50/70">
                              <td className="max-w-[16rem] px-3 py-3">
                                <span className="block font-semibold text-[#343438]">{row.customer}</span>
                                <span className="mt-1 block break-words text-[#86868b]">{row.document}</span>
                              </td>
                              <td className="max-w-[15rem] px-3 py-3">
                                <span className="block text-[#424245]">{row.date}</span>
                                <span className="mt-1 block leading-relaxed text-[#86868b]">{row.status}</span>
                              </td>
                              <td className="max-w-[18rem] px-3 py-3 leading-relaxed text-[#6e6e73]">{row.detail}</td>
                              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-[#1d1d1f]">{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-7">
                  <div className="rounded-2xl border border-dashed border-[#d9dce3] bg-[#fafbfc] px-5 py-10 text-center">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700"><IoDocumentTextOutline className="text-xl" /></span>
                    <p className="mt-3 text-sm font-semibold text-[#343438]">Sem registos para apresentar</p>
                    <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#86868b]">{salesDetails[salesDetail].empty}</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        {deliveryPrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1d1d1f]/35 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !changing) setDeliveryPrompt(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="delivery-date-title" aria-describedby="delivery-date-description" className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Concluir entrega</p>
                  <h2 id="delivery-date-title" className="mt-2 text-xl font-semibold tracking-tight text-[#1d1d1f]">Qual foi a data da entrega?</h2>
                </div>
                <button type="button" aria-label="Fechar" disabled={Boolean(changing)} onClick={() => setDeliveryPrompt(null)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-[#86868b] transition hover:bg-[#f5f5f7] disabled:opacity-50"><IoCloseOutline className="text-xl" /></button>
              </div>
              <p id="delivery-date-description" className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
                Ao registar a entrega de <strong className="font-semibold text-[#1d1d1f]">{deliveryPrompt.customerName}</strong>, a venda passa a contar no mês desta data.
              </p>
              <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-[#424245]">
                Data de entrega
                <input
                  autoFocus
                  required
                  type="date"
                  value={deliveryDate}
                  max="9999-12-31"
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="h-11 cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-4 text-sm outline-none transition hover:border-[#cbd5e1] hover:bg-[#f8fafc] focus:border-sky-600 focus:ring-2 focus:ring-sky-600/10"
                />
              </label>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" disabled={Boolean(changing)} onClick={() => setDeliveryPrompt(null)} className="h-10 cursor-pointer rounded-full border border-[#e5e5e7] px-5 text-sm font-semibold text-[#424245] transition hover:bg-[#f5f5f7] disabled:opacity-50">Cancelar</button>
                <button type="button" disabled={!deliveryDate || Boolean(changing)} onClick={confirmDelivery} className="h-10 cursor-pointer rounded-full bg-sky-700 px-5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50">{changing ? "A guardar…" : "Guardar entrega"}</button>
              </div>
            </section>
          </div>
        )}
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
