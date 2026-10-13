"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IoAddOutline, IoArrowUpOutline, IoCheckmarkCircleOutline, IoCloudUploadOutline, IoDocumentTextOutline, IoLogOutOutline, IoSearchOutline, IoStatsChartOutline, IoTimeOutline, IoOpenOutline, IoCloseOutline } from "react-icons/io5";

const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const currency = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
const dateLabel = (date) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${date}T12:00:00`));
const sum = (records, field = "subtotal") => records.reduce((value, sale) => value + Math.round(sale[field] * 100), 0) / 100;

export default function SalesDashboard() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [sales, setSales] = useState([]);
  const [storage, setStorage] = useState("local");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [changing, setChanging] = useState("");
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

  async function updateStatus(sale, value) {
    setChanging(sale.id); setError("");
    try {
      const result = await api(`/api/admin/sales/${sale.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: value }) });
      setSales((current) => current.map((item) => item.id === sale.id ? result.sale : item));
    } catch (failure) { setError(failure.message); }
    finally { setChanging(""); }
  }

  async function logout() {
    try { await api("/api/admin/session", { method: "DELETE" }); router.replace("/admin/login"); router.refresh(); }
    catch (failure) { setError(failure.message); }
  }

  const years = [...new Set([year, String(new Date().getFullYear()), ...sales.map((sale) => sale.issuedAt.slice(0, 4))])].sort().reverse();
  const period = sales.filter((sale) => sale.issuedAt.startsWith(year) && (month === "all" || sale.issuedAt.slice(5, 7) === month));
  const sold = period.filter((sale) => sale.status === "vendida");
  const preparing = period.filter((sale) => sale.status === "em_preparacao");
  const visibleSales = period.filter((sale) => (status === "all" || sale.status === status) && `${sale.customerName} ${sale.nif} ${sale.fileName}`.toLocaleLowerCase("pt-PT").includes(search.toLocaleLowerCase("pt-PT"))).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt) || b.uploadedAt.localeCompare(a.uploadedAt));
  const yearSales = sales.filter((sale) => sale.status === "vendida" && sale.issuedAt.startsWith(year));
  const monthly = months.map((_, index) => sum(yearSales.filter((sale) => sale.issuedAt.slice(5, 7) === String(index + 1).padStart(2, "0"))));
  const max = Math.max(...monthly, 1);
  const periodLabel = month === "all" ? `Ano ${year}` : `${months[Number(month) - 1]} ${year}`;
  const controls = "h-10 rounded-xl border border-[#e5e5e7] bg-white px-3 text-sm text-[#424245] outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/10";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="border-b border-[#e5e5e7] bg-white px-5 py-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="flex items-center gap-3"><img src="/favicon.png" alt="" width="36" height="36" className="h-9 w-9 object-contain" /><div><p className="text-sm font-semibold tracking-tight">Vasto Império</p><p className="mt-0.5 text-[11px] text-[#86868b]">Área de administração</p></div></div>
        <nav aria-label="Administração" className="mt-6 flex gap-2 lg:mt-10 lg:flex-col">
          <span aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#edf4ff] px-4 py-3 text-sm font-semibold text-[#0071e3]"><IoStatsChartOutline className="text-lg" />Vendas</span>
          <Link href="/orcamento/admin" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#6e6e73] transition hover:bg-[#f5f5f7]"><IoDocumentTextOutline className="text-lg" />Orçamentos</Link>
          <Link href="/simulador/admin" className="hidden items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#6e6e73] transition hover:bg-[#f5f5f7] sm:flex"><IoAddOutline className="text-lg" />Simulador</Link>
        </nav>
        <div className="mt-4 flex items-center justify-between lg:mt-auto lg:block"><p className="hidden text-[11px] leading-relaxed text-[#a1a1a6] lg:block">Os seus documentos.<br />A sua visão do negócio.</p><button onClick={logout} type="button" className="flex cursor-pointer items-center gap-3 rounded-xl px-4 py-2 text-sm text-[#86868b] transition hover:bg-[#f5f5f7] hover:text-[#1d1d1f] lg:mt-6 lg:w-full"><IoLogOutOutline className="text-lg" />Terminar sessão</button></div>
      </aside>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-14">
        <div className="mx-auto max-w-[1440px]">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">Visão geral</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em] sm:text-[44px]">As suas vendas.</h1><p className="mt-2 text-sm text-[#86868b]">Uma visão clara de cada documento e de cada mês.</p></div>
            <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex h-11 w-fit cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0071e3] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0067ce] disabled:cursor-wait disabled:opacity-60"><IoAddOutline className="text-xl" />{uploading ? "A importar…" : "Importar PDF"}</button>
          </header>

          <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(event) => importFiles(event.target.files)} />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4"><h2 className="text-lg font-semibold tracking-[-0.025em]">{periodLabel}</h2><div className="flex gap-2"><select aria-label="Mês" className={controls} value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">Todos os meses</option>{months.map((label, index) => <option key={label} value={String(index + 1).padStart(2, "0")}>{label}</option>)}</select><select aria-label="Ano" className={controls} value={year} onChange={(event) => setYear(event.target.value)}>{years.map((value) => <option key={value}>{value}</option>)}</select></div></div>

          {error && <div role="alert" className="mt-5 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><p className="whitespace-pre-line">{error}</p><button type="button" aria-label="Fechar aviso" onClick={() => setError("")} className="cursor-pointer"><IoCloseOutline className="text-xl" /></button></div>}
          {notice && <p role="status" className="mt-5 flex items-start gap-2 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><IoCheckmarkCircleOutline className="shrink-0 text-lg" />{notice}</p>}

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Vendas confirmadas", value: currency.format(sum(sold)), detail: "Valor sem IVA", icon: <IoArrowUpOutline />, color: "bg-blue-50 text-[#0071e3]" },
              { label: "Vendas com IVA", value: currency.format(sum(sold, "total")), detail: `${sold.length} ${sold.length === 1 ? "venda confirmada" : "vendas confirmadas"}`, icon: <IoCheckmarkCircleOutline />, color: "bg-emerald-50 text-emerald-600" },
              { label: "Em preparação", value: currency.format(sum(preparing)), detail: `${preparing.length} ${preparing.length === 1 ? "encomenda · sem IVA" : "encomendas · sem IVA"}`, icon: <IoTimeOutline />, color: "bg-amber-50 text-amber-600" },
              { label: "Documentos", value: String(period.length).padStart(2, "0"), detail: "Registados neste período", icon: <IoDocumentTextOutline />, color: "bg-[#f5f5f7] text-[#6e6e73]" },
            ].map((card) => <section key={card.label} className="rounded-[24px] border border-[#e8e8ed] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-[#86868b]">{card.label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl text-base ${card.color}`}>{card.icon}</span></div><p className="mt-5 text-[28px] font-semibold leading-none tracking-[-0.055em]">{loading ? "—" : card.value}</p><p className="mt-3 text-[11px] text-[#a1a1a6]">{card.detail}</p></section>)}
          </div>

          <section className="mt-6 rounded-[28px] border border-[#e8e8ed] bg-white p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold tracking-tight">O ano, mês a mês.</h2><p className="mt-1 text-xs text-[#86868b]">Vendas confirmadas · sem IVA · {year}</p></div><span className="text-lg font-semibold tracking-tight">{currency.format(sum(yearSales))}</span></div>
            <div className="mt-7 grid h-[145px] grid-cols-12 items-end gap-1.5 sm:gap-4">
              {monthly.map((value, index) => <button type="button" key={index} aria-label={`${months[index]} ${year}: ${currency.format(value)} de vendas sem IVA`} title={`${months[index]}: ${currency.format(value)}`} onClick={() => setMonth(String(index + 1).padStart(2, "0"))} className="group flex h-full min-w-0 cursor-pointer flex-col justify-end gap-3"><span className={`block min-h-1 rounded-t-md transition ${month === String(index + 1).padStart(2, "0") ? "bg-[#0071e3]" : "bg-[#d6e6fa] group-hover:bg-[#96bfee]"}`} style={{ height: `${Math.max(4, value / max * 110)}px` }} /><span className={`text-center text-[9px] sm:text-[11px] ${month === String(index + 1).padStart(2, "0") ? "font-semibold text-[#0071e3]" : "text-[#a1a1a6]"}`}>{months[index].slice(0, 3)}</span></button>)}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[28px] border border-[#e8e8ed] bg-white">
            <div className="flex flex-col justify-between gap-4 border-b border-[#f0f0f2] p-5 sm:p-7 xl:flex-row xl:items-center"><div><h2 className="text-base font-semibold tracking-tight">Encomendas e documentos</h2><p className="mt-1 text-xs text-[#86868b]">{visibleSales.length} {visibleSales.length === 1 ? "registo" : "registos"} · {periodLabel}</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><span className="sr-only">Pesquisar cliente, NIF ou documento</span><IoSearchOutline className="absolute left-3 top-3 text-[#a1a1a6]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar cliente ou documento" className={`${controls} w-full pl-9 sm:w-64`} /></label><select aria-label="Filtrar estado" className={controls} value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Todos os estados</option><option value="em_preparacao">Em preparação</option><option value="vendida">Vendida</option></select></div></div>
            {loading ? <div role="status" className="p-16 text-center text-sm text-[#86868b]">A carregar os seus documentos…</div> : visibleSales.length ? (
              <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-[#fbfbfd] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#86868b]"><tr><th className="px-6 py-4">Cliente / documento</th><th className="px-4 py-4">Data</th><th className="px-4 py-4 text-right">Sem IVA</th><th className="px-4 py-4 text-right">Com IVA</th><th className="px-4 py-4">Estado</th><th className="px-5 py-4"><span className="sr-only">Documento</span></th></tr></thead><tbody>{visibleSales.map((sale) => <tr key={sale.id} className="border-t border-[#f0f0f2] transition hover:bg-[#fbfbfd]"><td className="max-w-[350px] px-6 py-5"><p className="truncate text-sm font-semibold tracking-tight">{sale.customerName}</p><p className="mt-1 truncate text-[11px] text-[#a1a1a6]">{sale.nif ? `${sale.nif} · ` : ""}{sale.fileName}</p><span className="mt-1 inline-block text-[10px] text-[#86868b]">{sale.source === "simulador" ? "Simulador" : "Orçamento"}</span></td><td className="whitespace-nowrap px-4 py-5 text-xs text-[#6e6e73]">{dateLabel(sale.issuedAt)}</td><td className="whitespace-nowrap px-4 py-5 text-right text-sm font-medium">{currency.format(sale.subtotal)}</td><td className="whitespace-nowrap px-4 py-5 text-right text-xs text-[#86868b]">{currency.format(sale.total)}</td><td className="px-4 py-5"><select aria-label={`Estado de ${sale.customerName}`} value={sale.status} disabled={changing === sale.id} onChange={(event) => updateStatus(sale, event.target.value)} className={`cursor-pointer rounded-full border-0 py-2 pl-3 pr-6 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-[#0071e3]/20 disabled:cursor-wait disabled:opacity-50 ${sale.status === "vendida" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><option value="em_preparacao">Em preparação</option><option value="vendida">Vendida</option></select></td><td className="px-5 py-5"><a href={`/api/admin/sales/${sale.id}/pdf`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF de ${sale.customerName}`} className="grid h-9 w-9 place-items-center rounded-full text-lg text-[#86868b] transition hover:bg-[#edf4ff] hover:text-[#0071e3]"><IoOpenOutline /></a></td></tr>)}</tbody></table></div>
            ) : <div className="px-6 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5f5f7] text-2xl text-[#a1a1a6]"><IoDocumentTextOutline /></span><h3 className="mt-4 text-lg font-semibold tracking-tight">{sales.length ? "Ainda sem documentos neste período." : "Tudo começa com o primeiro PDF."}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#86868b]">{sales.length ? "Escolha outro mês ou ajuste os filtros para consultar as suas encomendas." : "Importe um orçamento ou uma simulação. Os dados ficam organizados automaticamente."}</p></div>}
          </section>

          <button type="button" disabled={uploading || loading} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!uploading && !loading) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); importFiles(event.dataTransfer.files); }} className={`mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed p-7 transition disabled:cursor-wait disabled:opacity-60 sm:flex-row sm:gap-5 ${dragging ? "border-[#0071e3] bg-[#edf4ff]" : "border-[#dcdce2] hover:border-[#a9c7ec] hover:bg-white"}`}><IoCloudUploadOutline className="text-3xl text-[#0071e3]" /><span className="text-center sm:text-left"><span className="block text-sm font-semibold">{uploading ? "A ler e registar os documentos…" : "Arraste os seus PDFs para aqui."}</span><span className="mt-1 block text-xs text-[#86868b]">Ou clique para escolher · Orçamentos e simulador · Até 6 MB por PDF</span></span></button>
          <p className="mt-5 text-center text-[11px] leading-relaxed text-[#a1a1a6]">Os meses correspondem à data do orçamento. Apenas os documentos marcados como «Vendida» entram nos totais de vendas.</p>
        </div>
      </main>
    </div>
  );
}
