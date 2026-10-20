"use client";

import { IoArrowUpOutline, IoTimeOutline } from "react-icons/io5";
import MetricCard from "./MetricCard";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IoCheckmarkOutline, IoCloudDoneOutline, IoWalletOutline } from "react-icons/io5";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const currentYear = () => new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric" }).format(new Date());
const saleDate = (sale) => sale.status === "em_preparacao"
  ? sale.issuedAt
  : sale.deliveryStatus === "entregue" && sale.deliveryDate
    ? sale.deliveryDate
    : sale.saleDate || sale.issuedAt;
const toCents = (amount) => Math.round((Number(amount) || 0) * 100);
const sum = (items) => items.reduce((total, item) => total + toCents(item.subtotal), 0) / 100;
const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

async function readJson(response) {
  const result = await response.json();
  if (response.status === 401) throw Object.assign(new Error("A sessão expirou. Inicie sessão novamente."), { unauthorized: true });
  if (!response.ok) throw new Error(result.error || "Não foi possível carregar as comissões.");
  return result;
}

export default function CommissionsDashboard() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState({});
  const [year, setYear] = useState(currentYear);
  const [commissionInput, setCommissionInput] = useState("15");
  const [monthlyRateInputs, setMonthlyRateInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [savingMonth, setSavingMonth] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/admin/sales", { cache: "no-store" }).then(readJson),
      fetch("/api/admin/commissions", { cache: "no-store" }).then(readJson),
    ]).then(([salesResult, commissionResult]) => {
      if (!active) return;
      setSales(salesResult.sales);
      setPayments(commissionResult.payments);
      setCommissionInput(String(commissionResult.commissionRate));
    }).catch((failure) => {
      if (failure.unauthorized) {
        router.replace("/admin/login");
        router.refresh();
      }
      if (active) setError(failure.message || "Não foi possível carregar os dados das comissões.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  const years = useMemo(() => [...new Set([currentYear(), ...sales.map((sale) => saleDate(sale).slice(0, 4)).filter((value) => /^\d{4}$/.test(value))])].sort().reverse(), [sales]);
  const confirmed = sales.filter((sale) => sale.status !== "em_preparacao" && saleDate(sale).startsWith(year));
  const monthly = months.map((label, index) => {
    const month = index + 1;
    const monthSales = confirmed.filter((sale) => saleDate(sale).slice(5, 7) === String(month).padStart(2, "0"));
    const subtotal = sum(monthSales);
    const payment = payments[monthKey(year, month)] || { paid: false, paidAt: null };
    const rateInput = monthlyRateInputs[monthKey(year, month)] ?? payment.commissionRate ?? commissionInput;
    const parsedRate = Number(String(rateInput).replace(",", "."));
    const commissionRate = Math.min(100, Math.max(0, Number.isFinite(parsedRate) ? parsedRate : 0));
    return {
      label,
      month,
      key: monthKey(year, month),
      sales: monthSales,
      subtotal,
      commissionRate,
      commission: Math.round(subtotal * commissionRate) / 100,
      payment,
    };
  });
  const annualSales = sum(confirmed);
  const totalCommission = Math.round(monthly.reduce((total, item) => total + Math.round(item.commission * 100), 0)) / 100;
  const paidCommission = Math.round(monthly.reduce((total, item) => total + (item.payment.paid ? Math.round(item.commission * 100) : 0), 0)) / 100;
  const outstandingCommission = Math.max(0, Math.round((totalCommission - paidCommission) * 100) / 100);
  const paidMonths = monthly.filter((item) => item.payment.paid).length;
  const maxCommission = Math.max(...monthly.map((item) => item.commission), 1);
  const rateNumber = Number(commissionInput.replace(",", "."));

  async function updateCommission(payload) {
    const response = await fetch("/api/admin/commissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload),
    });
    const result = await readJson(response);
    setPayments(result.payments);
    if (!Object.hasOwn(payload, "year")) setCommissionInput(String(result.commissionRate));
    return result;
  }

  async function saveRate() {
    if (savingRate || !commissionInput.trim() || !Number.isFinite(rateNumber) || rateNumber < 0 || rateNumber > 100) {
      if (commissionInput.trim() && (!Number.isFinite(rateNumber) || rateNumber < 0 || rateNumber > 100)) setError("Indique uma comissão entre 0% e 100%.");
      return;
    }
    setSavingRate(true);
    setError("");
    setNotice("");
    try {
      await updateCommission({ commissionRate: rateNumber });
      setNotice("Percentagem de comissão guardada.");
    } catch (failure) {
      if (failure.unauthorized) {
        router.replace("/admin/login");
        router.refresh();
      }
      setError(failure.message);
    } finally {
      setSavingRate(false);
    }
  }

  async function togglePaid(item) {
    if (savingMonth) return;
    setSavingMonth(item.key);
    setError("");
    setNotice("");
    try {
      await updateCommission({ year: Number(year), month: item.month, paid: !item.payment.paid });
      setNotice(`${item.label} ${!item.payment.paid ? "assinalado como pago" : "reaberto como por pagar"}.`);
    } catch (failure) {
      if (failure.unauthorized) {
        router.replace("/admin/login");
        router.refresh();
      }
      setError(failure.message);
    } finally {
      setSavingMonth("");
    }
  }

  async function saveMonthlyRate(item) {
    if (savingMonth) return;
    const input = monthlyRateInputs[item.key] ?? String(item.commissionRate);
    const rate = Number(String(input).replace(",", "."));
    if (!String(input).trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError(`Indique uma comissão válida para ${item.label}, entre 0% e 100%.`);
      return;
    }
    const savedRate = item.payment.commissionRate ?? Number(commissionInput.replace(",", "."));
    if (rate === savedRate) {
      setMonthlyRateInputs((current) => {
        const next = { ...current };
        delete next[item.key];
        return next;
      });
      return;
    }
    setSavingMonth(item.key);
    setError("");
    setNotice("");
    try {
      await updateCommission({ year: Number(year), month: item.month, commissionRate: rate });
      setMonthlyRateInputs((current) => {
        const next = { ...current };
        delete next[item.key];
        return next;
      });
      setNotice(`Comissão de ${item.label} atualizada para ${rate}%.`);
    } catch (failure) {
      if (failure.unauthorized) {
        router.replace("/admin/login");
        router.refresh();
      }
      setError(failure.message);
    } finally {
      setSavingMonth("");
    }
  }

  return (
    <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-6 lg:py-10 xl:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">Gestão financeira <span className="px-1.5 text-[#c7c7cc]">/</span> Comissões</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1d1d1f] sm:text-[44px]">Comissões, com clareza.</h1>
            <p className="mt-2 text-sm text-[#86868b]">Acompanhe os valores mensais e assinale o que já foi recebido.</p>
          </div>
          <label className="flex h-11 items-center gap-2 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm text-[#424245] shadow-sm">
            <span className="text-xs text-[#86868b]">Ano</span>
            <select value={year} onChange={(event) => setYear(event.target.value)} className="cursor-pointer bg-transparent font-semibold outline-none">
              {years.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </header>

        {error && <p role="alert" className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><IoCheckmarkOutline className="shrink-0 text-lg" />{notice}</p>}

        <section aria-label="Resumo das comissões" className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Vendas confirmadas · sem IVA" value={loading ? "—" : currency.format(annualSales)} detail={`${confirmed.length} encomendas em ${year}`} icon={<IoArrowUpOutline />} dark tone="blue" />
          <MetricCard label="Comissão estimada" value={loading ? "—" : currency.format(totalCommission)} detail="A percentagem pode variar por mês" icon={<IoWalletOutline />} tone="orange" />
          <MetricCard label="Já recebido" value={loading ? "—" : currency.format(paidCommission)} detail={`${paidMonths} de 12 meses assinalados como pagos`} icon={<IoCheckmarkOutline />} dark tone="green" />
          <MetricCard label="Por receber" value={loading ? "—" : currency.format(outstandingCommission)} detail="Comissão ainda não assinalada como paga" icon={<IoTimeOutline />} tone="orange" />
        </section>

        <section aria-labelledby="commission-chart-heading" className="admin-surface mt-6 rounded-[28px] border border-[#e8e8ed] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">Evolução anual</p>
              <h2 id="commission-chart-heading" className="mt-1 text-lg font-semibold tracking-tight text-[#1d1d1f]">Comissão estimada por mês</h2>
              <p className="mt-1 text-xs text-[#86868b]">Calculada por mês, sobre as vendas confirmadas sem IVA.</p>
            </div>
            <label className="flex w-fit items-center gap-3 rounded-full border border-[#e5e5e7] bg-[#fbfbfd] px-4 py-2.5 text-xs text-[#6e6e73] transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
              Taxa predefinida
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputMode="decimal"
                aria-label="Percentagem de comissão"
                value={commissionInput}
                onChange={(event) => setCommissionInput(event.target.value)}
                onBlur={saveRate}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                className="w-14 bg-transparent text-right text-sm font-semibold text-[#1d1d1f] outline-none"
              />
              <span className="-ml-3">%</span>
              <span className="ml-1 text-[10px] text-[#a1a1a6]">{savingRate ? "A guardar…" : "Meses sem taxa própria"}</span>
            </label>
          </div>
          <div className="mt-8 grid grid-cols-6 gap-x-2 gap-y-4 sm:grid-cols-12 sm:gap-x-4">
            {monthly.map((item) => (
              <div key={item.key} className="group flex h-36 min-w-0 flex-col items-center justify-end gap-2">
                <span className="w-full truncate text-center text-[9px] font-medium tabular-nums text-[#86868b]" title={`${currency.format(item.commission)} · ${item.commissionRate}%`}>{loading ? "—" : currency.format(item.commission)}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-t-lg bg-[#f5f7fa]">
                  <span className={`block w-full rounded-t-lg transition-colors ${item.payment.paid ? "bg-emerald-400 group-hover:bg-emerald-500" : "bg-sky-300 group-hover:bg-sky-500"}`} style={{ height: `${Math.max(3, item.commission / maxCommission * 96)}px` }} />
                </div>
                <span className={`text-[9px] sm:text-[10px] ${item.payment.paid ? "font-semibold text-emerald-700" : "text-[#86868b]"}`}>{item.label.slice(0, 3)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#f0f0f2] pt-4 text-[11px] text-[#86868b]">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-sky-300" />Por receber</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />Pago</span>
          </div>
        </section>

        <section aria-labelledby="commission-table-heading" className="admin-surface mt-6 overflow-hidden rounded-[28px] border border-[#e8e8ed] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#f0f0f2] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div>
              <h2 id="commission-table-heading" className="text-base font-semibold tracking-tight text-[#1d1d1f]">Resumo mensal</h2>
              <p className="mt-1 text-xs text-[#86868b]">Defina uma percentagem diferente em cada mês; a taxa predefinida aplica-se aos restantes.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f5f7] px-3 py-1.5 text-[11px] font-medium text-[#6e6e73]"><IoCloudDoneOutline className="text-sm" /> Acompanhamento ativo</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#fbfbfd] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
                <tr>
                  <th className="px-5 py-3 sm:px-7">Mês</th>
                  <th className="px-5 py-3 text-right sm:px-7">Vendas sem IVA</th>
                  <th className="px-5 py-3 text-right sm:px-7">Taxa</th>
                  <th className="px-5 py-3 text-right sm:px-7">Comissão</th>
                  <th className="px-5 py-3 sm:px-7">Estado</th>
                  <th className="px-5 py-3 text-right sm:px-7">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f2]">
                {monthly.map((item) => (
                  <tr key={item.key} className="transition-colors odd:bg-white even:bg-[#fbfbfd] hover:bg-sky-50/50">
                    <th scope="row" className="px-5 py-3.5 font-medium text-[#343438] sm:px-7">{item.label}</th>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#6e6e73]">{loading ? "—" : currency.format(item.subtotal)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <label className="inline-flex flex-col items-end gap-1">
                        <span className="sr-only">Percentagem de comissão de {item.label}</span>
                        <span className="flex h-9 w-24 items-center rounded-full border border-[#e5e5e7] bg-white px-3 transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            inputMode="decimal"
                            aria-label={`Percentagem de comissão de ${item.label}`}
                            value={monthlyRateInputs[item.key] ?? item.commissionRate}
                            onChange={(event) => setMonthlyRateInputs((current) => ({ ...current, [item.key]: event.target.value }))}
                            onBlur={() => saveMonthlyRate(item)}
                            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                            disabled={loading || Boolean(savingMonth)}
                            className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-[#1d1d1f] outline-none disabled:opacity-50"
                          />
                          <span className="ml-1 text-xs text-[#86868b]">%</span>
                        </span>
                        <span className="text-[9px] text-[#a1a1a6]">{savingMonth === item.key ? "A guardar…" : monthlyRateInputs[item.key] !== undefined ? "Por guardar" : item.payment.commissionRate == null ? "Predefinida" : "Personalizada"}</span>
                      </label>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[#1d1d1f]">{loading ? "—" : currency.format(item.commission)}</td>
                    <td className="px-5 py-3.5">
                      {item.payment.paid
                        ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-100"><IoCheckmarkOutline />Pago{item.payment.paidAt ? ` · ${item.payment.paidAt}` : ""}</span>
                        : <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-100">Por receber</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right sm:px-7">
                      <button
                        type="button"
                        disabled={loading || Boolean(savingMonth) || (item.commission <= 0 && !item.payment.paid)}
                        onClick={() => togglePaid(item)}
                        className={`inline-flex min-w-28 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600/30 disabled:cursor-wait disabled:opacity-50 ${item.payment.paid ? "border border-[#e5e5e7] bg-white text-[#6e6e73] hover:bg-[#f5f5f7]" : "bg-[#1d1d1f] text-white hover:bg-[#3a3a3c]"}`}
                      >
                        {savingMonth === item.key ? "A guardar…" : item.payment.paid ? "Reabrir mês" : "Assinalar pago"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#e8e8ed] bg-[#fbfbfd]">
                <tr>
                  <th scope="row" className="px-5 py-4 text-sm font-semibold text-[#1d1d1f] sm:px-7">Total · {year}</th>
                  <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-[#1d1d1f]">{loading ? "—" : currency.format(annualSales)}</td>
                  <td className="px-5 py-4 text-right text-sm font-bold tabular-nums text-sky-800">{loading ? "—" : currency.format(totalCommission)}</td>
                  <td colSpan="3" className="px-5 py-4 text-right text-xs font-medium text-[#6e6e73]">{paidMonths} / 12 meses pagos</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="flex items-start gap-2 border-t border-[#f0f0f2] px-5 py-3.5 text-[11px] leading-relaxed text-[#86868b] sm:px-7">
            <IoWalletOutline className="mt-0.5 shrink-0 text-sm" />
            <p>Estimativa calculada com a taxa definida em cada mês sobre as vendas confirmadas, sem IVA. O estado de pagamento da comissão é independente do pagamento da encomenda pelo cliente.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
