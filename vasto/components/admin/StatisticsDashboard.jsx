"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowUpOutline, IoCheckmarkCircleOutline, IoCloseOutline, IoDocumentTextOutline, IoTimeOutline } from "react-icons/io5";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const currentYear = () => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric" }).format(new Date());
const saleDate = (sale) => sale.status === "em_preparacao"
  ? sale.issuedAt
  : sale.deliveryStatus === "entregue" && sale.deliveryDate
    ? sale.deliveryDate
    : sale.saleDate || sale.issuedAt;
const total = (items, field = "subtotal") => items.reduce((amount, sale) => amount + Math.round((Number(sale[field]) || 0) * 100), 0) / 100;
const percentage = (part, whole) => whole ? Math.round((part / whole) * 100) : 0;
const validIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const compactMoney = (amount) => {
  const absoluteAmount = Math.abs(amount);
  const divisor = absoluteAmount >= 1_000_000 ? 1_000_000 : absoluteAmount >= 1_000 ? 1_000 : 1;
  const suffix = divisor === 1_000_000 ? " mi" : divisor === 1_000 ? " mil" : "";
  return `${(amount / divisor).toFixed(1).replace(/\.0$/, "").replace(".", ",")}${suffix} €`;
};

function ProgressRing({ value, label, detail, color, onClick }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="flex w-full cursor-pointer items-center gap-5 rounded-[24px] border border-[#e8e8ed] bg-white p-5 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30 sm:p-6"
    >
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={boundedValue}
        className="grid h-[92px] w-[92px] shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${boundedValue * 3.6}deg, #ececf0 0deg)` }}
      >
        <div className="grid h-[70px] w-[70px] place-items-center rounded-full bg-white text-lg font-semibold tracking-tight text-[#1d1d1f]">
          {boundedValue}%
        </div>
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-[#1d1d1f]">{label}</h2>
        <p className="mt-1 text-xs leading-relaxed text-[#86868b]">{detail}</p>
      </div>
    </button>
  );
}

export default function StatisticsDashboard() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedInsight, setExpandedInsight] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/sales", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) {
          router.replace("/admin/login");
          router.refresh();
        }
        if (!response.ok) throw new Error(result.error || "Não foi possível carregar as estatísticas.");
        if (active) setSales(result.sales);
      })
      .catch((failure) => {
        if (active) setError(failure.message || "Não foi possível carregar as estatísticas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    if (!expandedInsight) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setExpandedInsight("");
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [expandedInsight]);

  const years = useMemo(() => [...new Set([currentYear(), ...sales.map((sale) => saleDate(sale).slice(0, 4))])].sort().reverse(), [sales]);
  const yearSales = sales.filter((sale) => saleDate(sale).startsWith(year));
  const confirmed = yearSales.filter((sale) => sale.status !== "em_preparacao");
  const awaiting = yearSales.filter((sale) => sale.status === "em_preparacao");
  const paid = confirmed.filter((sale) => sale.paymentStatus === "pago");
  const delivered = confirmed.filter((sale) => sale.deliveryStatus === "entregue");
  const resolved = confirmed.filter((sale) => sale.paymentStatus === "pago" && sale.deliveryStatus === "entregue");
  const awaitingPayment = confirmed.filter((sale) => sale.paymentStatus !== "pago");
  const monthly = months.map((label, index) => {
    const monthSales = yearSales.filter((sale) => saleDate(sale).slice(5, 7) === String(index + 1).padStart(2, "0"));
    const monthConfirmed = monthSales.filter((sale) => sale.status !== "em_preparacao");
    return { label, count: monthSales.length, subtotal: total(monthConfirmed), gross: total(monthConfirmed, "total") };
  });
  const maxMonthly = Math.max(...monthly.map((item) => item.subtotal), 1);
  const average = confirmed.length ? total(confirmed) / confirmed.length : 0;
  const customerGroups = new Map();
  for (const sale of confirmed) {
    const name = String(sale.customerName || "Cliente").trim() || "Cliente";
    const key = sale.nif ? `nif:${sale.nif}` : `name:${name.toLocaleLowerCase("pt-PT")}`;
    const customer = customerGroups.get(key) || { name, orders: 0, subtotal: 0 };
    customer.orders += 1;
    customer.subtotal += Math.round((Number(sale.subtotal) || 0) * 100);
    customerGroups.set(key, customer);
  }
  const customers = [...customerGroups.values()].map((customer) => ({ ...customer, subtotal: customer.subtotal / 100 }));
  const leadingCustomer = [...customers].sort((a, b) => b.subtotal - a.subtotal || b.orders - a.orders)[0] || null;
  const repeatCustomers = customers.filter((customer) => customer.orders > 1);
  const productGroups = new Map();
  let itemDetailOrders = 0;
  for (const sale of confirmed) {
    const articles = sale.orderDetails?.artigos;
    if (!Array.isArray(articles) || !articles.length) continue;
    itemDetailOrders += 1;
    for (const article of articles) {
      const name = String(article.produto || "").trim();
      const units = Number(article.unidades);
      if (!name || !Number.isFinite(units) || units <= 0) continue;
      const product = productGroups.get(name) || { name, units: 0 };
      product.units += units;
      productGroups.set(name, product);
    }
  }
  const rankedProducts = [...productGroups.values()].sort((a, b) => b.units - a.units);
  const leadingProduct = rankedProducts[0] || null;
  const leadingMonth = [...monthly].sort((a, b) => b.subtotal - a.subtotal || b.count - a.count)[0];
  const confirmationDurations = confirmed
    .filter((sale) => validIsoDate(sale.issuedAt) && validIsoDate(sale.saleDate))
    .map((sale) => Math.round((Date.parse(`${sale.saleDate}T00:00:00Z`) - Date.parse(`${sale.issuedAt}T00:00:00Z`)) / 86_400_000))
    .filter((days) => days >= 0);
  const averageConfirmationDays = confirmationDurations.length
    ? confirmationDurations.reduce((sumDays, days) => sumDays + days, 0) / confirmationDurations.length
    : null;
  const rankedCustomers = [...customers].sort((a, b) => b.subtotal - a.subtotal || b.orders - a.orders);
  const rankedRepeatCustomers = [...repeatCustomers].sort((a, b) => b.orders - a.orders || b.subtotal - a.subtotal);
  const rankedMonths = [...monthly].sort((a, b) => b.subtotal - a.subtotal || b.count - a.count);
  const insightDetails = {
    customer: {
      title: "Compras dos clientes com maior volume",
      description: "Encomendas confirmadas ordenadas por cliente. Os artigos só são apresentados quando constam nos detalhes guardados do registo.",
      entries: [...confirmed]
        .sort((a, b) => (Number(b.subtotal) || 0) - (Number(a.subtotal) || 0))
        .slice(0, 20)
        .map((sale) => ({
          label: `${sale.customerName || "Cliente"} · ${sale.fileName || "Documento"}`,
          value: `${currency.format(Number(sale.subtotal) || 0)} sem IVA`,
          detail: Array.isArray(sale.orderDetails?.artigos) && sale.orderDetails.artigos.length
            ? sale.orderDetails.artigos.map((article) => `${article.produto || "Artigo"} × ${Number(article.unidades) || 0}`).join(", ")
            : "Este registo não tem artigos discriminados.",
        })),
      empty: "Ainda não existem encomendas confirmadas neste ano.",
    },
    recurring: {
      title: "Encomendas por cliente recorrente",
      description: "Clientes com mais de uma encomenda confirmada no ano.",
      entries: rankedRepeatCustomers.slice(0, 10).map((customer) => ({
        label: customer.name,
        value: `${customer.orders} encomendas · ${currency.format(customer.subtotal)}`,
        detail: "Cliente com compras recorrentes no ano selecionado.",
      })),
      empty: "Ainda não há clientes com mais de uma encomenda confirmada neste ano.",
    },
    product: {
      title: "Artigos identificados nos registos",
      description: `${itemDetailOrders} de ${confirmed.length} encomendas confirmadas têm uma lista de artigos guardada. Os restantes registos não incluem essa informação, por isso não é possível inferir os artigos a partir do valor total.`,
      entries: rankedProducts.slice(0, 10).map((product) => ({
        label: product.name,
        value: `${product.units} ${product.units === 1 ? "unidade" : "unidades"}`,
        detail: "Quantidade total identificada nas listas de artigos guardadas.",
      })),
      empty: "Não há listas de artigos guardadas nas encomendas confirmadas deste ano.",
    },
    month: {
      title: "Vendas confirmadas por mês",
      description: "Valores sem IVA; os registos incluem todas as encomendas e orçamentos datados em cada mês.",
      entries: rankedMonths.map((item) => ({
        label: item.label,
        value: `${currency.format(item.subtotal)} · ${item.count} ${item.count === 1 ? "registo" : "registos"}`,
        detail: `${currency.format(item.gross)} com IVA no total dos registos confirmados.`,
      })),
      empty: "Ainda não existem registos neste ano.",
    },
    confirmation: {
      title: "Tempo de confirmação por encomenda",
      description: "Diferença entre a data de emissão e a data de confirmação; só são incluídas datas válidas e intervalos não negativos.",
      entries: confirmed
        .filter((sale) => validIsoDate(sale.issuedAt) && validIsoDate(sale.saleDate))
        .map((sale) => ({
          label: sale.customerName || "Cliente",
          value: `${Math.round((Date.parse(`${sale.saleDate}T00:00:00Z`) - Date.parse(`${sale.issuedAt}T00:00:00Z`)) / 86_400_000)} dias`,
          detail: `Emitida a ${sale.issuedAt} · confirmada a ${sale.saleDate}.`,
          days: Math.round((Date.parse(`${sale.saleDate}T00:00:00Z`) - Date.parse(`${sale.issuedAt}T00:00:00Z`)) / 86_400_000),
        }))
        .filter((entry) => entry.days >= 0)
        .sort((a, b) => a.days - b.days),
      empty: "Não existem datas de emissão e confirmação suficientes para apresentar detalhes.",
    },
  };
  const insightCards = [
    {
      id: "customer",
      label: "Cliente em destaque",
      value: leadingCustomer?.name || "Ainda sem dados",
      detail: leadingCustomer ? `${currency.format(leadingCustomer.subtotal)} em ${leadingCustomer.orders} ${leadingCustomer.orders === 1 ? "encomenda" : "encomendas"}` : "Sem encomendas confirmadas neste ano.",
      title: leadingCustomer?.name,
    },
    {
      id: "recurring",
      label: "Clientes recorrentes",
      value: String(repeatCustomers.length),
      detail: `${repeatCustomers.length === 1 ? "cliente com mais de uma encomenda confirmada" : "clientes com mais de uma encomenda confirmada"} · de ${customers.length}`,
    },
    {
      id: "product",
      label: "Artigo mais pedido",
      value: leadingProduct?.name || (itemDetailOrders ? "Sem artigos identificáveis" : "Lista de artigos indisponível"),
      detail: leadingProduct ? `${leadingProduct.units} unidades nos registos com artigos` : `${itemDetailOrders} de ${confirmed.length} encomendas têm lista de artigos guardada`,
      title: leadingProduct?.name,
    },
    {
      id: "month",
      label: "Mês mais forte",
      value: leadingMonth?.subtotal > 0 ? leadingMonth.label : "Ainda sem vendas",
      detail: leadingMonth?.subtotal > 0 ? `${currency.format(leadingMonth.subtotal)} sem IVA · ${leadingMonth.count} registos` : "Sem vendas confirmadas neste ano.",
    },
    {
      id: "confirmation",
      label: "Tempo até confirmar",
      value: averageConfirmationDays === null ? "—" : `${averageConfirmationDays.toFixed(1).replace(".", ",")} dias`,
      detail: averageConfirmationDays === null ? "Sem datas suficientes para calcular." : `Média baseada em ${confirmationDurations.length} encomendas com datas válidas`,
    },
  ];

  const summary = [
    { label: "Vendas confirmadas", value: currency.format(total(confirmed)), detail: `${confirmed.length} encomendas · sem IVA`, icon: <IoArrowUpOutline />, tone: "text-sky-700 bg-sky-50 ring-sky-100" },
    { label: "Valor com IVA", value: currency.format(total(confirmed, "total")), detail: "Total das encomendas confirmadas", icon: <IoDocumentTextOutline />, tone: "text-violet-700 bg-violet-50 ring-violet-100" },
    { label: "A aguardar resposta", value: currency.format(total(awaiting)), detail: `${awaiting.length} ${awaiting.length === 1 ? "orçamento" : "orçamentos"} · sem IVA`, icon: <IoTimeOutline />, tone: "text-amber-700 bg-amber-50 ring-amber-100" },
    { label: "Valor médio", value: currency.format(average), detail: "Por encomenda confirmada · sem IVA", icon: <IoCheckmarkCircleOutline />, tone: "text-emerald-700 bg-emerald-50 ring-emerald-100" },
  ];
  const saleEntries = (records) => records.map((sale) => {
    const date = saleDate(sale) || sale.issuedAt || "";
    const quoteStatus = sale.status === "em_preparacao" ? "A aguardar resposta" : "Confirmada";
    const paymentStatus = sale.paymentStatus === "pago" ? "Paga" : sale.paymentStatus === "entrada_paga" ? "Entrada paga" : "Por pagar";
    const deliveryStatus = sale.deliveryStatus === "entregue" ? "Entregue" : "Por entregar";
    const articles = sale.orderDetails?.artigos;
    const articleDetail = Array.isArray(articles) && articles.length
      ? articles.map((article) => `${article.produto || "Artigo"} × ${Number(article.unidades) || 0}`).join(", ")
      : "Artigos não discriminados neste registo.";
    return {
      label: `${sale.customerName || "Cliente"} · ${sale.fileName || "Documento"}`,
      value: `${currency.format(Number(sale.subtotal) || 0)} sem IVA · ${currency.format(Number(sale.total) || 0)} c/ IVA`,
      detail: `${date} · ${quoteStatus} · ${paymentStatus} · ${deliveryStatus}. ${articleDetail}`,
    };
  });
  const orderStatusCards = [
    { id: "status-documents", label: "Documentos registados", records: yearSales },
    { id: "status-confirmed", label: "Confirmadas", records: confirmed },
    { id: "status-awaiting", label: "A aguardar resposta", records: awaiting },
    { id: "status-paid", label: "Pagas", records: paid },
    { id: "status-unpaid", label: "Por pagar / entrada", records: awaitingPayment },
    { id: "status-delivered", label: "Entregues", records: delivered },
  ].map((item) => ({ ...item, count: item.records.length, value: total(item.records) }));
  const detailContent = {
    ...insightDetails,
    "summary-confirmed": {
      title: "Vendas confirmadas",
      description: "Encomendas confirmadas no ano selecionado. Os valores incluem subtotal sem IVA e total com IVA.",
      entries: saleEntries(confirmed),
      empty: "Ainda não existem encomendas confirmadas neste ano.",
    },
    "summary-gross": {
      title: "Valor confirmado com IVA",
      description: "Composição do valor total com IVA por encomenda confirmada.",
      entries: saleEntries(confirmed),
      empty: "Ainda não existem encomendas confirmadas neste ano.",
    },
    "summary-awaiting": {
      title: "Orçamentos a aguardar resposta",
      description: "Documentos ainda não confirmados, com os respetivos valores sem e com IVA.",
      entries: saleEntries(awaiting),
      empty: "Não há documentos a aguardar resposta neste ano.",
    },
    "summary-average": {
      title: "Valor médio por encomenda",
      description: `Média de ${currency.format(average)} sem IVA, calculada sobre ${confirmed.length} encomendas confirmadas.`,
      entries: saleEntries(confirmed),
      empty: "Ainda não existem encomendas confirmadas para calcular a média.",
    },
    "ring-confirmation": {
      title: "Taxa de confirmação",
      description: `${confirmed.length} de ${yearSales.length} documentos confirmados (${percentage(confirmed.length, yearSales.length)}%).`,
      entries: saleEntries(yearSales),
      empty: "Ainda não existem documentos neste ano.",
    },
    "ring-resolved": {
      title: "Encomendas resolvidas",
      description: `${resolved.length} de ${yearSales.length} documentos pagos e entregues (${percentage(resolved.length, yearSales.length)}%).`,
      entries: saleEntries(yearSales),
      empty: "Ainda não existem documentos neste ano.",
    },
    ...Object.fromEntries(monthly.map((item, index) => {
      const key = String(index + 1).padStart(2, "0");
      const monthRecords = yearSales.filter((sale) => saleDate(sale).slice(5, 7) === key);
      return [`month-${key}`, {
        title: `Registos de ${item.label}`,
        description: `${currency.format(item.subtotal)} em encomendas confirmadas sem IVA · ${currency.format(item.gross)} com IVA · ${item.count} registos no total.`,
        entries: saleEntries(monthRecords),
        empty: `Não existem registos em ${item.label} de ${year}.`,
      }];
    })),
    ...Object.fromEntries(orderStatusCards.map((item) => [item.id, {
      title: item.label,
      description: `${item.count} ${item.count === 1 ? "registo" : "registos"} · ${currency.format(item.value)} sem IVA. Os valores representam o total associado aos registos, não necessariamente o montante já recebido.`,
      entries: saleEntries(item.records),
      empty: `Não há registos no estado “${item.label.toLocaleLowerCase("pt-PT")}” neste ano.`,
    }])),
  };

  return (
    <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-6 lg:py-10 xl:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">Visão geral <span className="px-1.5 text-[#c7c7cc]">/</span> Estatísticas</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-[44px]">O negócio em números.</h1>
            <p className="mt-2 text-sm text-[#86868b]">Vendas, encomendas e evolução ao longo do ano.</p>
          </div>
          <label className="flex h-10 items-center gap-2 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm text-[#424245]">
            <span className="text-xs text-[#86868b]">Ano</span>
            <select value={year} onChange={(event) => setYear(event.target.value)} className="cursor-pointer bg-transparent font-semibold outline-none">
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section aria-label="Resumo financeiro" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((card, index) => (
            <button
              key={card.label}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setExpandedInsight(["summary-confirmed", "summary-gross", "summary-awaiting", "summary-average"][index])}
              className="w-full cursor-pointer rounded-[24px] border border-[#e8e8ed] bg-white p-5 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30 sm:p-6"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#86868b]">{card.label}</p>
                <span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg shadow-sm ring-1 ${card.tone}`}>{card.icon}</span>
              </div>
              <p className="mt-5 break-words text-[26px] font-semibold leading-tight tracking-[-0.05em]">{loading ? "—" : card.value}</p>
              <p className="mt-3 text-[11px] text-[#a1a1a6]">{card.detail}</p>
            </button>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ProgressRing
            value={percentage(confirmed.length, yearSales.length)}
            label="Taxa de confirmação"
            detail={`${confirmed.length} confirmadas de ${yearSales.length} encomendas e orçamentos no ano`}
            color="#0071e3"
            onClick={() => setExpandedInsight("ring-confirmation")}
          />
          <ProgressRing
            value={percentage(resolved.length, yearSales.length)}
            label="Encomendas resolvidas"
            detail={`${resolved.length} pagas e entregues de ${yearSales.length} documentos no ano`}
            color="#34a853"
            onClick={() => setExpandedInsight("ring-resolved")}
          />
        </section>

        <section aria-labelledby="business-insights-heading" className="mt-7">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">Padrões encontrados</p>
            <h2 id="business-insights-heading" className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">Algumas curiosidades do negócio.</h2>
            <p className="mt-1 text-xs text-[#86868b]">Leituras calculadas a partir dos registos disponíveis para {year}.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {insightCards.map((card) => {
              return (
                <button
                  key={card.id}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setExpandedInsight((current) => current === card.id ? "" : card.id)}
                  className="group cursor-pointer rounded-[22px] border border-[#e8e8ed] bg-white p-5 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">{card.label}</span>
                  <span className={`mt-4 block truncate font-semibold text-[#1d1d1f] ${card.id === "recurring" || card.id === "confirmation" ? "text-2xl tracking-tight" : "text-base"}`} title={card.title}>{loading ? "—" : card.value}</span>
                  <span className="mt-1 block text-xs text-[#6e6e73]">{loading ? "A carregar dados…" : card.detail}</span>
                </button>
              );
            })}
          </div>
          {expandedInsight && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]"
              onMouseDown={(event) => { if (event.target === event.currentTarget) setExpandedInsight(""); }}
            >
              <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="insight-dialog-title"
                className="max-h-[min(85vh,48rem)] w-full max-w-3xl overflow-y-auto rounded-[26px] border border-[#e8e8ed] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]"
              >
                <div className="border-b border-[#e8e8ed] bg-gradient-to-br from-sky-50 via-white to-white px-5 py-5 sm:px-7 sm:py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-sky-700">Análise detalhada · {year}</p>
                      <h3 id="insight-dialog-title" className="mt-1.5 text-xl font-semibold tracking-tight text-[#1d1d1f]">{detailContent[expandedInsight].title}</h3>
                      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[#6e6e73]">{detailContent[expandedInsight].description}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Fechar detalhe"
                      onClick={() => setExpandedInsight("")}
                      className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e5e5e7] bg-white text-[#6e6e73] transition hover:border-[#c8c9cf] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
                    >
                      <IoCloseOutline className="text-xl" />
                    </button>
                  </div>
                </div>
                {detailContent[expandedInsight].entries.length ? (
                  <div className="p-5 sm:p-7">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1d1d1f]">Registos incluídos</p>
                        <p className="mt-0.5 text-xs text-[#86868b]">Dados usados para calcular este indicador</p>
                      </div>
                      <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                        {detailContent[expandedInsight].entries.length} {detailContent[expandedInsight].entries.length === 1 ? "linha" : "linhas"}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[#e8e8ed]">
                      <div className="max-h-[min(48vh,25rem)] overflow-auto">
                        <table className="w-full min-w-[540px] text-left text-xs">
                          <thead className="sticky top-0 z-10 bg-[#f7f8fa] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                            <tr>
                              <th className="w-10 px-3 py-3 text-center">#</th>
                              <th className="px-3 py-3">Registo</th>
                              <th className="px-3 py-3">Detalhe</th>
                              <th className="px-3 py-3 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f0f2]">
                            {detailContent[expandedInsight].entries.map((entry, index) => (
                              <tr key={`${entry.label}-${index}`} className="align-top transition-colors odd:bg-white even:bg-[#fbfbfd] hover:bg-sky-50/70">
                                <td className="px-3 py-3 text-center tabular-nums text-[#a1a1a6]">{String(index + 1).padStart(2, "0")}</td>
                                <td className="max-w-[15rem] px-3 py-3 font-semibold leading-relaxed text-[#343438]">{entry.label}</td>
                                <td className="max-w-[24rem] px-3 py-3 leading-relaxed text-[#6e6e73]">{entry.detail || "—"}</td>
                                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-[#1d1d1f]">{entry.value}</td>
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
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-sky-50 text-sky-700">
                        <IoDocumentTextOutline className="text-xl" />
                      </span>
                      <p className="mt-3 text-sm font-semibold text-[#343438]">Sem registos para apresentar</p>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-[#86868b]">{detailContent[expandedInsight].empty}</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div className="rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-base font-semibold tracking-tight">Vendas mês a mês</h2><p className="mt-1 text-xs text-[#86868b]">Valor sem IVA · encomendas confirmadas · {year}</p></div>
              <p className="text-sm font-semibold">{currency.format(total(confirmed))}<span className="ml-1 text-xs font-normal text-[#86868b]">sem IVA</span></p>
            </div>
            <div className="mt-7 grid grid-cols-6 gap-x-2 gap-y-4 sm:grid-cols-12 sm:gap-x-4">
              {monthly.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Ver detalhe de ${item.label}: ${currency.format(item.subtotal)} sem IVA, ${item.count} registos`}
                  aria-haspopup="dialog"
                  onClick={() => setExpandedInsight(`month-${String(months.indexOf(item.label) + 1).padStart(2, "0")}`)}
                  className="group flex h-[130px] min-w-0 cursor-pointer flex-col items-center justify-end gap-1 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30"
                  title={`${item.label}: ${currency.format(item.subtotal)} sem IVA · ${currency.format(item.gross)} com IVA · ${item.count} registos`}
                >
                  <span className="w-full truncate text-center text-[8px] leading-tight text-[#86868b] sm:text-[9px]">{compactMoney(item.subtotal)}</span>
                  <span className="block w-full rounded-t-md bg-[#dce5ef] transition-colors group-hover:bg-sky-500" style={{ height: `${Math.max(4, item.subtotal / maxMonthly * 76)}px` }} />
                  <span className="text-center text-[9px] text-[#a1a1a6] group-hover:text-sky-700 sm:text-[11px]">{item.label.slice(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>

          <section aria-labelledby="orders-detail-heading" className="rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <h2 id="orders-detail-heading" className="text-base font-semibold tracking-tight">Detalhe das encomendas</h2>
            <p className="mt-1 text-xs text-[#86868b]">Estado atual das vendas do ano selecionado.</p>
            <div className="mt-5 divide-y divide-[#f0f0f2]">
              {orderStatusCards.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-haspopup="dialog"
                  onClick={() => setExpandedInsight(item.id)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition hover:bg-[#fbfbfd] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-600/30"
                >
                  <span className="min-w-0"><span className="block text-xs text-[#6e6e73]">{item.label}</span><span className="mt-0.5 block text-[10px] text-[#a1a1a6]">{item.count} {item.count === 1 ? "registo" : "registos"}</span></span>
                  <span className="shrink-0 text-right text-sm font-semibold text-[#1d1d1f]">{currency.format(item.value)}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-[#f0f0f2] pt-3 text-[10px] leading-relaxed text-[#a1a1a6]">Os valores representam o total associado às encomendas em cada estado, não necessariamente o montante já recebido.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
