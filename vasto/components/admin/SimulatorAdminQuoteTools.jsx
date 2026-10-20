"use client";

import { hasCustomerName, resolveCustomerName } from "@/lib/customer-identity.mjs";
import CustomerSuggestionInput from "./CustomerSuggestionInput";
import Image from "@/components/loadings/LoadingImage";
import { IoIosArrowDown } from "react-icons/io";

export default function SimulatorAdminQuoteTools({
  quoteData,
  descontoManual,
  setDescontoManual,
  produtosExtra,
  setProdutosExtra,
  produtoExtraAberto,
  setProdutoExtraAberto,
  pesquisaProdutoExtra,
  setPesquisaProdutoExtra,
  produtosCatalogo,
  onCustomerSelect,
  emailCliente,
  setEmailCliente,
  nomeCliente,
  setNomeCliente,
  nifCliente,
  setNifCliente,
  loadingNif,
  dadosEmpresa,
  mensagem,
  mensagemSucesso,
  aExportar,
  gerarImagem,
  gerarPdf,
  enviarParaVendas,
}) {
  return (
    <div className="space-y-4">
      <section aria-label="Ajustes do orçamento" className="admin-surface rounded-[24px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">Preparar proposta</p>
            <h2 className="mt-1 text-lg font-semibold text-[#1d1d1f]">Ajustes ao orçamento</h2>
            <p className="mt-1 max-w-2xl text-sm text-[#6e6e73]">O desconto sugerido é aplicado automaticamente. Pode ajustá-lo e acrescentar artigos do catálogo.</p>
          </div>
          <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[#515158] sm:w-52">
            Desconto (%)
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={descontoManual === null ? (quoteData?.discountPercent ?? 0) : descontoManual}
              onChange={(event) => setDescontoManual(event.target.value)}
              className="h-11 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-[#1d1d1f] outline-none focus:border-(--blue)"
            />
          </label>
        </div>
        {produtosExtra.map((item, index) => (
          <div key={item.id} className="mt-4 grid gap-3 rounded-[22px] bg-[#f5f5f7] p-4 sm:grid-cols-[minmax(0,1fr)_110px_140px_auto] sm:items-center">
            <div data-produto-extra-dropdown className="relative min-w-0">
              <div className="flex h-12 items-center rounded-full border border-[#e5e5e7] bg-white px-4 transition focus-within:border-(--blue) focus-within:ring-4 focus-within:ring-[#0879c0]/10">
                <input
                  type="text"
                  aria-label="Pesquisar produto adicional"
                  value={produtoExtraAberto === index ? pesquisaProdutoExtra : (item.produto ? `${item.produto.refCompleta} · ${item.produto.produto}` : "")}
                  onFocus={() => { setProdutoExtraAberto(index); setPesquisaProdutoExtra(""); }}
                  onChange={(event) => { setProdutoExtraAberto(index); setPesquisaProdutoExtra(event.target.value); }}
                  placeholder="Pesquisar produto..."
                  className="w-full min-w-0 flex-1 bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                />
                <IoIosArrowDown
                  aria-hidden="true"
                  className="ml-2 shrink-0 cursor-pointer text-[#6e6e73]"
                  onClick={() => {
                    setProdutoExtraAberto(produtoExtraAberto === index ? null : index);
                    setPesquisaProdutoExtra("");
                  }}
                />
              </div>
              {produtoExtraAberto === index && (
                <div className="absolute left-0 z-30 mt-2 max-h-80 w-[min(88vw,34rem)] overflow-y-auto rounded-[22px] border border-[#e5e5e7] bg-white p-2 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
                  {produtosCatalogo
                    .filter((produto) => `${produto.produto} ${produto.refCompleta}`.toLowerCase().includes(pesquisaProdutoExtra.trim().toLowerCase()))
                    .map((produto) => (
                      <button
                        key={produto.refCompleta}
                        type="button"
                        onClick={() => {
                          setProdutosExtra((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, produto, preco: produto["preço"] ?? "" } : row));
                          setProdutoExtraAberto(null);
                          setPesquisaProdutoExtra("");
                        }}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left text-sm text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
                      >
                        <span className="w-8 shrink-0 text-center text-xs font-medium text-[#6e6e73]">{produto.refCompleta}</span>
                        <Image
                          src={produto.image && produto.image !== "/orcamento/.png" ? produto.image : "/favicon.png"}
                          alt=""
                          width={36}
                          height={36}
                          className="h-9 w-9 shrink-0 object-contain"
                        />
                        <span className="min-w-0 flex-1">{produto.produto}</span>
                        {Number.isFinite(Number(produto["preço"])) && produto["preço"] != null && (
                          <span className="shrink-0 text-xs text-[#6e6e73]">{Number(produto["preço"]).toFixed(2).replace(".", ",")} €</span>
                        )}
                      </button>
                    ))}
                  {produtosCatalogo.filter((produto) => `${produto.produto} ${produto.refCompleta}`.toLowerCase().includes(pesquisaProdutoExtra.trim().toLowerCase())).length === 0 && (
                    <p className="px-3 py-5 text-center text-sm text-[#86868b]">Nenhum produto encontrado.</p>
                  )}
                </div>
              )}
            </div>
            <input
              aria-label="Quantidade"
              type="number"
              min="1"
              step="1"
              value={item.unidades}
              onChange={(event) => setProdutosExtra((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unidades: event.target.value } : row))}
              className="h-11 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm outline-none focus:border-(--blue)"
            />
            <input
              aria-label="Preço unitário"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço unitário"
              value={item.preco}
              onChange={(event) => setProdutosExtra((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, preco: event.target.value } : row))}
              className="h-11 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm outline-none focus:border-(--blue)"
            />
            <button
              type="button"
              aria-label="Remover produto adicional"
              onClick={() => setProdutosExtra((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              className="h-11 cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-4 text-sm font-medium text-[#6e6e73] hover:bg-[#fff1eb] hover:text-(--orange)"
            >
              Remover
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const novaLinha = { id: `${Date.now()}-${Math.random()}`, produto: null, unidades: 1, preco: "" };
            setProdutosExtra((current) => [...current, novaLinha]);
            setProdutoExtraAberto(produtosExtra.length);
            setPesquisaProdutoExtra("");
          }}
          className="mt-4 h-11 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]"
        >
          + Adicionar produto
        </button>
      </section>

      <section aria-label="Exportar simulação" className="admin-surface flex flex-col justify-between gap-4 rounded-[24px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Guardar esta configuração</h2>
          <p className="mt-1 text-sm text-[#6e6e73]">A imagem guarda apenas o desenho e as cotas. O PDF gera a folha de orçamento com artigos, quantidades, preços e desconto.</p>
          {mensagem && (
            <div role={mensagemSucesso ? "status" : "alert"} className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium ${mensagemSucesso ? "text-emerald-700" : "text-red-600"}`}>
              <span>{mensagem}</span>
              {mensagemSucesso && <a href="/admin" className="cursor-pointer font-semibold underline underline-offset-2 hover:text-emerald-900">Abrir vendas</a>}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CustomerSuggestionInput field="name" onSelect={onCustomerSelect}
              value={nomeCliente}
              onChange={(event) => setNomeCliente(event.target.value)}
              placeholder="Nome do cliente (opcional)"
              className="h-11 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue)"
            />
            <CustomerSuggestionInput field="nif" onSelect={onCustomerSelect}
              value={nifCliente}
              onChange={(event) => setNifCliente(event.target.value.replace(/\D/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="NIF (opcional)"
              className="h-11 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue)"
            />
          </div>
          {dadosEmpresa && !loadingNif && !hasCustomerName(dadosEmpresa.nome) && <p className="mt-2 text-xs text-[#86868b]">Nome indisponível para este NIF. Preencha o nome manualmente; será usado no PDF e nas vendas.</p>}
          <input type="email" value={emailCliente} onChange={(event) => setEmailCliente(event.target.value)} placeholder="Email do cliente (opcional)" aria-label="Email do cliente" className="mt-3 h-11 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none focus:border-[#0879c0]" />
          {loadingNif && <p className="mt-2 text-xs text-[#86868b]">A procurar dados do NIF…</p>}
          {dadosEmpresa && !loadingNif && <p className="mt-2 text-xs text-[#6e6e73]">{resolveCustomerName(dadosEmpresa, nomeCliente)} · {dadosEmpresa.codigoPostal}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={gerarImagem}
            disabled={aExportar || !quoteData || quoteData.unavailable}
            className="h-12 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aExportar ? "A preparar…" : "Guardar imagem"}
          </button>
          <button
            type="button"
            onClick={gerarPdf}
            disabled={aExportar || loadingNif || !quoteData || quoteData.unavailable}
            className="h-12 cursor-pointer rounded-full bg-(--orange) px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aExportar ? "A preparar…" : "Guardar PDF"}
          </button>
          <button
            type="button"
            onClick={enviarParaVendas}
            disabled={aExportar || loadingNif || !quoteData || quoteData.unavailable}
            className="h-12 cursor-pointer rounded-full bg-sky-700 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {aExportar ? "A preparar…" : "Enviar para vendas"}
          </button>
        </div>
      </section>
    </div>
  );
}
