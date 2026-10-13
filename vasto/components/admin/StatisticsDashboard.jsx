"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IoArrowUpOutline, IoCheckmarkCircleOutline, IoDocumentTextOutline, IoTimeOutline } from "react-icons/io5";

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

function ProgressRing({ value, label, detail, color }) {
  const boundedValue = Math.max(0, Math.min(100, value));
  return (
    <article className="flex items-center gap-5 rounded-[24px] border border-[#e8e8ed] bg-white p-5 sm:p-6">
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
    </article>
  );
}

export default function StatisticsDashboard() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  const leadingProduct = [...productGroups.values()].sort((a, b) => b.units - a.units)[0] || null;
  const leadingMonth = [...monthly].sort((a, b) => b.subtotal - a.subtotal || b.count - a.count)[0];
  const confirmationDurations = confirmed
    .filter((sale) => validIsoDate(sale.issuedAt) && validIsoDate(sale.saleDate))
    .map((sale) => Math.round((Date.parse(`${sale.saleDate}T00:00:00Z`) - Date.parse(`${sale.issuedAt}T00:00:00Z`)) / 86_400_000))
    .filter((days) => days >= 0);
  const averageConfirmationDays = confirmationDurations.length
    ? confirmationDurations.reduce((sumDays, days) => sumDays + days, 0) / confirmationDurations.length
    : null;

  const summary = [
    { label: "Vendas confirmadas", value: currency.format(total(confirmed)), detail: `${confirmed.length} encomendas · sem IVA`, icon: <IoArrowUpOutline />, tone: "text-sky-700 bg-sky-50 ring-sky-100" },
    { label: "Valor com IVA", value: currency.format(total(confirmed, "total")), detail: "Total das encomendas confirmadas", icon: <IoDocumentTextOutline />, tone: "text-violet-700 bg-violet-50 ring-violet-100" },
    { label: "A aguardar resposta", value: currency.format(total(awaiting)), detail: `${awaiting.length} ${awaiting.length === 1 ? "orçamento" : "orçamentos"} · sem IVA`, icon: <IoTimeOutline />, tone: "text-amber-700 bg-amber-50 ring-amber-100" },
    { label: "Valor médio", value: currency.format(average), detail: "Por encomenda confirmada · sem IVA", icon: <IoCheckmarkCircleOutline />, tone: "text-emerald-700 bg-emerald-50 ring-emerald-100" },
  ];

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
          {summary.map((card) => (
            <article key={card.label} className="rounded-[24px] border border-[#e8e8ed] bg-white p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#86868b]">{card.label}</p>
                <span className={`grid h-10 w-10 place-items-center rounded-2xl text-lg shadow-sm ring-1 ${card.tone}`}>{card.icon}</span>
              </div>
              <p className="mt-5 break-words text-[26px] font-semibold leading-tight tracking-[-0.05em]">{loading ? "—" : card.value}</p>
              <p className="mt-3 text-[11px] text-[#a1a1a6]">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <ProgressRing
            value={percentage(confirmed.length, yearSales.length)}
            label="Taxa de confirmação"
            detail={`${confirmed.length} confirmadas de ${yearSales.length} encomendas e orçamentos no ano`}
            color="#0071e3"
          />
          <ProgressRing
            value={percentage(resolved.length, yearSales.length)}
            label="Encomendas resolvidas"
            detail={`${resolved.length} pagas e entregues de ${yearSales.length} documentos no ano`}
            color="#34a853"
          />
        </section>

        <section aria-labelledby="business-insights-heading" className="mt-7">
          <div className="mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">Padrões encontrados</p>
            <h2 id="business-insights-heading" className="mt-1 text-xl font-semibold tracking-tight text-[#1d1d1f]">Algumas curiosidades do negócio.</h2>
            <p className="mt-1 text-xs text-[#86868b]">Leituras calculadas a partir dos registos disponíveis para {year}.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <article className="rounded-[22px] border border-[#e8e8ed] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Cliente em destaque</p>
              <p className="mt-4 truncate text-base font-semibold text-[#1d1d1f]" title={leadingCustomer?.name}>{loading ? "—" : leadingCustomer?.name || "Ainda sem dados"}</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{leadingCustomer ? `${currency.format(leadingCustomer.subtotal)} em ${leadingCustomer.orders} ${leadingCustomer.orders === 1 ? "encomenda" : "encomendas"}` : "Sem encomendas confirmadas neste ano."}</p>
            </article>
            <article className="rounded-[22px] border border-[#e8e8ed] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Clientes recorrentes</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{loading ? "—" : repeatCustomers.length}</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{repeatCustomers.length === 1 ? "cliente com mais de uma encomenda confirmada" : "clientes com mais de uma encomenda confirmada"} · de {customers.length}</p>
            </article>
            <article className="rounded-[22px] border border-[#e8e8ed] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Artigo mais pedido</p>
              <p className="mt-4 truncate text-base font-semibold text-[#1d1d1f]" title={leadingProduct?.name}>{loading ? "—" : leadingProduct?.name || "Sem detalhe de artigos"}</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{leadingProduct ? `${leadingProduct.units} unidades nos registos com artigos` : `${itemDetailOrders} de ${confirmed.length} encomendas têm detalhe de artigos`}</p>
            </article>
            <article className="rounded-[22px] border border-[#e8e8ed] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Mês mais forte</p>
              <p className="mt-4 text-base font-semibold text-[#1d1d1f]">{loading ? "—" : leadingMonth?.subtotal > 0 ? leadingMonth.label : "Ainda sem vendas"}</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{leadingMonth?.subtotal > 0 ? `${currency.format(leadingMonth.subtotal)} sem IVA · ${leadingMonth.count} registos` : "Sem vendas confirmadas neste ano."}</p>
            </article>
            <article className="rounded-[22px] border border-[#e8e8ed] bg-white p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">Tempo até confirmar</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-[#1d1d1f]">{loading ? "—" : averageConfirmationDays === null ? "—" : `${averageConfirmationDays.toFixed(1).replace(".", ",")} dias`}</p>
              <p className="mt-1 text-xs text-[#6e6e73]">{averageConfirmationDays === null ? "Sem datas suficientes para calcular." : `Média baseada em ${confirmationDurations.length} encomendas com datas válidas`}</p>
            </article>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div className="rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-base font-semibold tracking-tight">Vendas mês a mês</h2><p className="mt-1 text-xs text-[#86868b]">Valor sem IVA · encomendas confirmadas · {year}</p></div>
              <p className="text-sm font-semibold">{currency.format(total(confirmed))}<span className="ml-1 text-xs font-normal text-[#86868b]">sem IVA</span></p>
            </div>
            <div className="mt-7 grid grid-cols-6 gap-x-2 gap-y-4 sm:grid-cols-12 sm:gap-x-4">
              {monthly.map((item) => (
                <div key={item.label} className="flex h-[130px] min-w-0 flex-col items-center justify-end gap-1" title={`${item.label}: ${currency.format(item.subtotal)} sem IVA · ${currency.format(item.gross)} com IVA · ${item.count} registos`}>
                  <span className="w-full truncate text-center text-[8px] leading-tight text-[#86868b] sm:text-[9px]">{compactMoney(item.subtotal)}</span>
                  <span className="block w-full rounded-t-md bg-[#dce5ef]" style={{ height: `${Math.max(4, item.subtotal / maxMonthly * 76)}px` }} />
                  <span className="text-center text-[9px] text-[#a1a1a6] sm:text-[11px]">{item.label.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>

          <section aria-labelledby="orders-detail-heading" className="rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <h2 id="orders-detail-heading" className="text-base font-semibold tracking-tight">Detalhe das encomendas</h2>
            <p className="mt-1 text-xs text-[#86868b]">Estado atual das vendas do ano selecionado.</p>
            <dl className="mt-5 divide-y divide-[#f0f0f2]">
              {[
                { label: "Documentos registados", count: yearSales.length, value: total(yearSales) },
                { label: "Confirmadas", count: confirmed.length, value: total(confirmed) },
                { label: "A aguardar resposta", count: awaiting.length, value: total(awaiting) },
                { label: "Pagas", count: paid.length, value: total(paid) },
                { label: "Por pagar / entrada", count: awaitingPayment.length, value: total(awaitingPayment) },
                { label: "Entregues", count: delivered.length, value: total(delivered) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><dt className="text-xs text-[#6e6e73]">{item.label}</dt><dd className="mt-0.5 text-[10px] text-[#a1a1a6]">{item.count} {item.count === 1 ? "registo" : "registos"}</dd></div>
                  <dd className="shrink-0 text-right text-sm font-semibold text-[#1d1d1f]">{currency.format(item.value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-[#f0f0f2] pt-3 text-[10px] leading-relaxed text-[#a1a1a6]">Os valores representam o total associado às encomendas em cada estado, não necessariamente o montante já recebido.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
