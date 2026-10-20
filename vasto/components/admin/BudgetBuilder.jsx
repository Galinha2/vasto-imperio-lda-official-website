"use client";
import { useState, useEffect, useRef } from "react";
import Image from "@/components/loadings/LoadingImage";
import { IoIosArrowDown } from "react-icons/io";
import { IoIosAdd } from "react-icons/io";
import { IoCloudUploadOutline } from "react-icons/io5";
import orcamento from "@/assets/orcamento.json";
import { hasCustomerName, resolveCustomerName } from "@/lib/customer-identity.mjs";
import { quoteFilename } from "@/lib/quote-filenames.mjs";
import CustomerSuggestionInput from "./CustomerSuggestionInput";
import QuoteEmailButton from "./QuoteEmailButton";
import generateBudgetPdf from "@/lib/generateBudgetPdf";
import { MdOutlineDelete } from "react-icons/md";

export default function BudgetBuilder({ editSaleId = "" }) {
  const [linhas, setLinhas] = useState([
    { produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "", isPortes: false },
  ]);
  const [openProdutoIndex, setOpenProdutoIndex] = useState(null);
  const [descontoSelecionado, setDescontoSelecionado] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [pesquisaProduto, setPesquisaProduto] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [nif, setNif] = useState("");
  const [nomeClienteManual, setNomeClienteManual] = useState("");
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [loadingNif, setLoadingNif] = useState(false);
  const [popupMensagem, setPopupMensagem] = useState(null);
  const [sendingToSales, setSendingToSales] = useState(false);

  const quoteNumberRef = useRef(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(!!editSaleId);
  const [quoteLoadError, setQuoteLoadError] = useState("");
  useEffect(() => {
    if (!editSaleId) return;
    let active = true;
    setLoadingQuote(true); setQuoteLoadError("");
    fetch(`/api/admin/sales/${encodeURIComponent(editSaleId)}/quote`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); return result; })
      .then(({ record, lines, discount }) => {
        if (!active) return;
        quoteNumberRef.current = record.quoteNumber || quoteNumberRef.current;
        setEditingRecord(record); setLinhas(lines); setDescontoSelecionado(discount);
        setEmailCliente(record.orderDetails?.email || "");
        setNif(record.nif || ""); setNomeClienteManual(record.customerName);
        setDadosEmpresa({ nome: record.customerName, nif: record.nif, codigoPostal: record.orderDetails?.moradaFiscal || "" });
      }).catch((error) => { if (active) setQuoteLoadError(error.message); })
      .finally(() => { if (active) setLoadingQuote(false); });
    return () => { active = false; };
  }, [editSaleId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-produto-dropdown]"))
        setOpenProdutoIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const nifLookupVersion = useRef(0);
  const selectCustomer = (customer) => {
    nifLookupVersion.current++;
    setEmailCliente(customer.email || "");
    setNif(customer.nif); setNomeClienteManual(customer.name); setLoadingNif(false);
    setDadosEmpresa({ nome: customer.name, nif: customer.nif, codigoPostal: customer.address });
  };
  const procurarNif = async (valorNif) => {
    const version = ++nifLookupVersion.current;
    if (!/^\d{9}$/.test(valorNif)) {
      setDadosEmpresa(null);
      return;
    }

    setLoadingNif(true);
    setDadosEmpresa(null);

    try {
      const res = await fetch(`/api/nifs?nif=${valorNif}`);
      const data = await res.json();
      if (version !== nifLookupVersion.current) return;

      setDadosEmpresa({
        nome: data?.nome || "Cliente",
        nif: data?.nif || valorNif,
        codigoPostal: data?.codigoPostal || "V/ Morada",
      });
    } catch (err) {
      if (version !== nifLookupVersion.current) return;
      setDadosEmpresa({
        nome: "Cliente",
        nif: valorNif,
        codigoPostal: "V/ Morada",
      });
    } finally {
      if (version === nifLookupVersion.current) setLoadingNif(false);
    }
  };

  const adicionarLinha = () =>
    setLinhas([...linhas, { produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "", isPortes: false }]);

  const selecionarProduto = (index, produtoObj) => {
    const novasLinhas = [...linhas];
    const isPortes = produtoObj.ref === "0" || produtoObj.refCompleta?.startsWith("0.");
    
    novasLinhas[index].produto = produtoObj.produto;
    novasLinhas[index].preco = isPortes ? 0 : produtoObj.preço;
    novasLinhas[index].refCompleta = produtoObj.refCompleta;
    novasLinhas[index].isPortes = isPortes;
    novasLinhas[index].total = novasLinhas[index].unidades * (isPortes ? 0 : produtoObj.preço);
    setLinhas(novasLinhas);
    setOpenProdutoIndex(null);
    setPesquisaProduto("");
  };

  const alterarUnidades = (index, valor) => {
    const novasLinhas = [...linhas];
    const unidades = Number(valor) || 0;
    novasLinhas[index].unidades = unidades;
    novasLinhas[index].total = unidades * novasLinhas[index].preco;
    setLinhas(novasLinhas);
  };

  const alterarPrecoPortes = (index, valor) => {
    const novasLinhas = [...linhas];
    const preco = Number(valor) || 0;
    novasLinhas[index].preco = preco;
    novasLinhas[index].total = novasLinhas[index].unidades * preco;
    setLinhas(novasLinhas);
  };

  const removerLinha = (index) => {
    const novasLinhas = linhas.filter((_, i) => i !== index);
    setLinhas(
      novasLinhas.length
        ? novasLinhas
        : [{ produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "", isPortes: false }],
    );
  };

  const totalSemDesconto = linhas.reduce((acc, linha) => acc + linha.total, 0);
  const totalComDesconto =
    linhas.reduce((acc, l) => {
      if (l.isPortes) return acc + l.total;
      return acc + l.total * (1 - descontoSelecionado / 100);
    }, 0);

  const totalComIVA = linhas.reduce((acc, l) => {
    const valorDesc = l.isPortes ? 0 : descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0;
    const valorLiquido = l.total - valorDesc;
    return acc + valorLiquido * 1.23;
  }, 0);

  const handleCopy = (e) => {
    e.preventDefault();
    const linhasFormatadas = linhas
      .filter((l) => l.produto && l.unidades > 0)
      .map((l) => {
        let nomeCompacto = l.produto
          .replace(/\s+/g, " ")
          .replace(/ x /g, "x")
          .replace(/c\/ /g, "c/");
        return `- ${nomeCompacto}: ${l.unidades}un x ${l.preco.toFixed(2).replace(".", ",")}€ = ${l.total.toFixed(2).replace(".", ",")}€`;
      })
      .join("\n");

    let totaisTexto = `Total Bruto: ${totalSemDesconto.toFixed(2).replace(".", ",")}€`;
    if (descontoSelecionado > 0)
      totaisTexto += `\nTotal c/${descontoSelecionado}% Desc: ${totalComDesconto.toFixed(2).replace(".", ",")}€`;
    totaisTexto += `\nTotal c/IVA: ${totalComIVA.toFixed(2).replace(".", ",")}€`;

    e.clipboardData.setData(
      "text/plain",
      `${linhasFormatadas}\n\n${totaisTexto}`,
    );
  };

  const copiarManual = async () => {
    const linhasFormatadas = linhas
      .filter((l) => l.produto && l.unidades > 0)
      .map((l) => {
        let nomeCompacto = l.produto
          .replace(/\s+/g, " ")
          .replace(/ x /g, "x")
          .replace(/c\/ /g, "c/");
        return `- ${nomeCompacto}: ${l.unidades}un x ${l.preco.toFixed(2).replace(".", ",")}€ = ${l.total.toFixed(2).replace(".", ",")}€`;
      })
      .join("\n");

    let totaisTexto = `Total Bruto: ${totalSemDesconto.toFixed(2).replace(".", ",")}€`;
    if (descontoSelecionado > 0)
      totaisTexto += `\nTotal c/${descontoSelecionado}% Desc: ${totalComDesconto.toFixed(2).replace(".", ",")}€`;
    totaisTexto += `\nTotal c/IVA: ${totalComIVA.toFixed(2).replace(".", ",")}€`;

    const textoFinal = `${linhasFormatadas}\n\n${totaisTexto}`;
    await navigator.clipboard.writeText(textoFinal);
    setCopiado(true);
    setTimeout(() => {
      setCopiado(false);
    }, 1000);
  };

  const gerarPDF = () => generateBudgetPdf({ quoteNumberRef,
    linhas,
    descontoSelecionado,
    dadosEmpresa,
    nif,
    nomeClienteManual,
  });

  const enviarParaVendas = async () => {
    if (sendingToSales || loadingQuote || (editSaleId && !editingRecord)) return;
    if ((dadosEmpresa?.nome === "NIF não encontrado" && !hasCustomerName(nomeClienteManual))) {
      setPopupMensagem("Não é possível enviar o orçamento: NIF não encontrado.");
      return;
    }

    setSendingToSales(true);
    try {
      const pdf = await generateBudgetPdf({ quoteNumberRef,
        source: "orcamento",
        linhas,
        descontoSelecionado,
        dadosEmpresa,
        nif,
        nomeClienteManual,
        returnBlob: true,
      });
      if (pdf.size > 6 * 1024 * 1024) throw new Error("O PDF gerado ultrapassa o limite de 6 MB.");

      const form = new FormData();
      form.append("email", emailCliente.trim());
      form.append("pdf", pdf, quoteFilename({ lines: linhas, customerName: resolveCustomerName(dadosEmpresa, nomeClienteManual) }));
      if (editingRecord) {
        form.append("updatedAt", editingRecord.updatedAt);
        form.append("lines", JSON.stringify(linhas.filter((line) => line.produto)));
        form.append("discount", String(descontoSelecionado));
      }
      const response = await fetch(editingRecord ? `/api/admin/sales/${editingRecord.id}/quote` : "/api/admin/sales", { method: editingRecord ? "PUT" : "POST", body: form, cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) throw new Error("A sessão de administração expirou. Inicie sessão novamente.");
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o orçamento para as vendas.");
      window.dispatchEvent(new Event("admin:sales-changed"));
      if (editingRecord) setEditingRecord(result.sale);
      setPopupMensagem(editingRecord ? "Alterações guardadas no mesmo orçamento. PDF atualizado; desenhos e estados mantidos." : `Orçamento de ${result.sale.customerName} enviado para as vendas.`);
    } catch (error) {
      console.error("Não foi possível enviar o orçamento para as vendas.", error);
      setPopupMensagem(error.message || "Não foi possível enviar o orçamento para as vendas.");
    } finally {
      setSendingToSales(false);
    }
  };

  const gerarRefCompleta = (refFamilia) => {
    let contador = 1;
    return orcamento.produtos
      .filter((p) => p.ref === refFamilia)
      .map((p) => ({ ...p, refCompleta: `${refFamilia}.${contador++}` }));
  };

  if (loadingQuote) return <p className="p-6 text-sm text-gray-500">A carregar os artigos do orçamento…</p>;
  if (quoteLoadError) return <p role="alert" className="rounded-2xl bg-red-50 p-6 text-sm text-red-700">{quoteLoadError}</p>;

  return (
    <div onCopy={handleCopy} className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-(--orange)">Área de gestão</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">{editingRecord ? "Editar orçamento" : "Criar orçamento"}</h1>
            <p className="mt-2 text-sm text-[#6e6e73]">Adicione produtos, indique os dados do cliente e gere a proposta.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e5e5e7] bg-white px-4 py-2 text-sm font-medium text-[#6e6e73]">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Documento em edição
          </span>
        </header>

        {editingRecord && <p className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">A editar o orçamento de <strong>{editingRecord.customerName}</strong>. Guardar atualiza este registo e o PDF. Os desenhos anexados mantêm-se; não são redesenhados ao alterar os artigos.</p>}
        <section aria-label="Linhas do orçamento" className="admin-surface rounded-[28px] border border-[#e5e5e7] bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-5 lg:p-6">
          <div className="mb-4 hidden grid-cols-[minmax(0,1fr)_80px_100px_100px_44px] gap-3 px-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#86868b] sm:grid">
            <span>Produto</span><span className="text-center">Qtd.</span><span className="text-center">Preço unit.</span><span className="text-center">Total</span><span />
          </div>
        <div className="flex flex-col gap-3 items-start">
          {linhas.map((linha, index) => (
            <div
              key={index}
              className="relative grid w-full grid-cols-[repeat(3,minmax(0,1fr))_40px] items-center gap-2 rounded-[22px] border border-[#e8e8eb] bg-[#fbfbfd] p-3 sm:grid-cols-[minmax(0,1fr)_80px_100px_100px_44px] sm:gap-3 sm:rounded-full sm:bg-white sm:px-3 sm:py-2"
            >
              <div data-produto-dropdown className="relative col-span-4 min-w-0 sm:col-span-1">
                <div className="flex h-12 items-center rounded-full border border-[#e5e5e7] bg-white px-4 transition focus-within:border-(--blue) focus-within:ring-4 focus-within:ring-[#0879c0]/10 sm:border-transparent sm:bg-[#f5f5f7]">
                  <input
                    type="text"
                    value={
                      openProdutoIndex === index
                        ? pesquisaProduto
                        : linha.produto || ""
                    }
                    onFocus={() => setOpenProdutoIndex(index)}
                    onChange={(e) => {
                      setPesquisaProduto(e.target.value);
                    }}
                    placeholder="Pesquisar produto..."
                    className="w-full min-w-0 flex-1 bg-transparent text-sm text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
                  />

                  <IoIosArrowDown
                    className="ml-2 shrink-0 cursor-pointer text-[#6e6e73]"
                    onClick={() =>
                      setOpenProdutoIndex(
                        openProdutoIndex === index ? null : index,
                      )
                    }
                  />
                </div>

                {openProdutoIndex === index && (
                  <div className="absolute left-0 z-30 mt-2 max-h-80 w-[min(88vw,34rem)] overflow-y-auto rounded-[22px] border border-[#e5e5e7] bg-white p-2 shadow-[0_16px_42px_rgba(0,0,0,0.14)]">
                    {[
                      ...new Set(
                        orcamento.produtos
                          .filter(
                            (p) =>
                              p.produto
                                .toLowerCase()
                                .includes(pesquisaProduto.toLowerCase()) ||
                              String(p.ref)
                                .toLowerCase()
                                .includes(pesquisaProduto.toLowerCase()),
                          )
                          .map((p) => p.ref),
                      ),
                    ].map((refFamilia) =>
                      gerarRefCompleta(refFamilia)
                        .filter(
                          (p) =>
                            p.produto
                              .toLowerCase()
                              .includes(pesquisaProduto.toLowerCase()) ||
                            String(p.refCompleta)
                              .toLowerCase()
                              .includes(pesquisaProduto.toLowerCase()),
                        )
                        .map((p) => (
                          <div
                            key={p.refCompleta}
                            onClick={() => selecionarProduto(index, p)}
                            className="flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition hover:bg-[#f5f5f7]"
                          >
                            <span className="text-sm w-5">{p.refCompleta}</span>
                            <Image
                              src={
                                p.image && p.image !== "/orcamento/.png"
                                  ? p.image
                                  : "/favicon.png"
                              }
                              alt={p.produto}
                              width={32}
                              height={32}
                              onError={(e) => {
                                e.currentTarget.src = "/favicon.png";
                              }}
                              className="w-8 h-8 object-contain"
                            />
                            <span>{p.produto}</span>
                          </div>
                        )),
                    )}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={linha.unidades > 0 ? `${linha.unidades}un` : ""}
                onChange={(e) => {
                  const valorLimpo = e.target.value.replace(/[^0-9]/g, "");
                  alterarUnidades(index, valorLimpo);
                }}
                aria-label="Quantidade"
                className="h-11 w-full min-w-0 rounded-full border border-[#e5e5e7] bg-white px-2 text-center text-xs outline-none focus:border-(--blue) sm:px-3 sm:text-sm"
                placeholder="Qtd."
              />

              <div className="flex h-11 w-full items-center rounded-full border border-[#e5e5e7] bg-white px-3 text-sm sm:bg-[#f5f5f7]">
                {linha.isPortes ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.preco || ""}
                    onChange={(e) => {
                      alterarPrecoPortes(index, e.target.value);
                    }}
                    className="w-full rounded-full border border-[#d2d2d7] px-2 py-1 text-center outline-none focus:border-(--blue)"
                    placeholder="Preço"
                  />
                ) : (
                  <p className="text-center w-full">{linha.preco?.toFixed(2).replace(".", ",")}€ /un</p>
                )}
              </div>

              <div className="flex h-11 w-full items-center justify-center rounded-full border border-[#e5e5e7] bg-white px-3 text-sm font-semibold text-[#1d1d1f] sm:bg-[#f5f5f7]">
                <p className="text-center whitespace-nowrap">
                  {linha.total.toFixed(2).replace(".", ",")}€
                </p>
              </div>

              <button
                type="button"
                onClick={() => removerLinha(index)}
                aria-label="Remover produto"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e7] bg-white text-(--orange) transition hover:bg-[#fff0e8]"
              >
                <MdOutlineDelete className="text-xl" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={adicionarLinha}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-[#e5e5e7] bg-white px-5 text-sm font-semibold text-[#1d1d1f] transition hover:border-[#c8c9cf] hover:bg-[#f5f5f7]"
          >
            <IoIosAdd className="text-xl text-(--orange)" />
            Adicionar produto
          </button>
        </div>

        </section>

        <section aria-label="Dados do cliente e totais" className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <div className="admin-surface rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-6">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#1d1d1f]">Dados do cliente</h2>
            <p className="mt-1 text-sm text-[#6e6e73]">Opcional · o NIF preenche os dados da empresa.</p>
          <div data-desc-dropdown className="relative mt-5 flex flex-col gap-4 sm:flex-row sm:items-start">
            <label className="block shrink-0 text-xs font-medium text-[#6e6e73]">
              Desconto
              <span className="mt-1 flex h-12 w-32 items-center gap-1 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 focus-within:border-[#0879c0] focus-within:ring-4 focus-within:ring-[#0879c0]/10">
                <input type="number" min="0" max="100" step="0.01" inputMode="decimal" aria-label="Percentagem de desconto" value={descontoSelecionado}
                  onChange={(event) => { const value = event.target.value; setDescontoSelecionado(value === "" ? "" : Math.min(100, Math.max(0, Number(value) || 0))); }}
                  onBlur={() => { if (descontoSelecionado === "") setDescontoSelecionado(0); }}
                  className="min-w-0 w-full bg-transparent text-sm font-medium text-[#1d1d1f] outline-none" />
                <span className="text-sm">%</span>
              </span>
            </label>
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:max-w-md">
              <CustomerSuggestionInput field="nif" onSelect={selectCustomer}
                type="text"
                className="h-12 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
                placeholder="NIF"
                maxLength={9}
                value={nif}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^0-9]/g, "");
                  nifLookupVersion.current++;
                  setNif(valor);
                  if (valor.length === 9) {
                    procurarNif(valor);
                  } else {
                    setDadosEmpresa(null);
                  }
                }}
              />
              <CustomerSuggestionInput field="name" onSelect={selectCustomer}
                type="text"
                className="h-12 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue) focus:ring-4 focus:ring-[#0879c0]/10"
                placeholder="Nome do Cliente"
                value={nomeClienteManual}
                onChange={(e) => setNomeClienteManual(e.target.value)}
              />
              {loadingNif && (
                <span className="text-xs mt-1">A procurar dados...</span>
              )}
              <input type="email" value={emailCliente} onChange={(event) => setEmailCliente(event.target.value)} placeholder="Email do cliente (opcional)" aria-label="Email do cliente" className="h-12 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none focus:border-[#0879c0]" />
              {dadosEmpresa && !loadingNif && !hasCustomerName(dadosEmpresa.nome) && <p className="text-xs leading-relaxed text-[#86868b]">Não foi encontrado um nome para este NIF. Escreva o nome do cliente no campo acima; será usado no orçamento e guardado nas vendas.</p>}
              {dadosEmpresa && !loadingNif && (
                <div className="mt-1 rounded-2xl border border-[#e5e5e7] bg-[#f5f5f7] p-4 text-sm text-[#6e6e73]">
                  <p><strong>{resolveCustomerName(dadosEmpresa, nomeClienteManual)}</strong></p>
                  <p>NIF: {dadosEmpresa.nif}</p>
                  <p>{dadosEmpresa.codigoPostal}</p>
                </div>
              )}
            </div>


          </div>

          </div>
          <div className="admin-surface rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#86868b]">Resumo do orçamento</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-[#6e6e73]">
            <div className="flex items-center justify-between gap-4"><span>Total bruto</span><span className="font-medium text-[#1d1d1f]">{totalSemDesconto.toFixed(2).replace(".", ",")}€</span></div>
            {descontoSelecionado > 0 && (
              <div className="flex items-center justify-between gap-4 text-(--orange)"><span>Desconto · {descontoSelecionado}%</span><span className="font-semibold">−{(totalSemDesconto - totalComDesconto).toFixed(2).replace(".", ",")}€</span></div>
            )}
            <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-[#e8e8eb] pt-4">
              <span className="font-semibold text-[#1d1d1f]">Valor líquido sem IVA</span>
              <span className="text-2xl font-semibold tracking-[-0.04em] text-(--blue)">{totalComDesconto.toFixed(2).replace(".", ",")}€</span>
            </div>
            <div className="flex items-center justify-between gap-4"><span>Total com IVA</span><span>{totalComIVA.toFixed(2).replace(".", ",")}€</span></div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={copiarManual}
                className={`${
                  copiado ? "bg-emerald-600" : "bg-(--blue)"
                } h-12 cursor-pointer rounded-full px-5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5`}
              >
                {copiado ? "Texto copiado" : "Copiar Texto"}
              </button>

              <button
                type="button"
                onClick={() => {
                  if ((dadosEmpresa?.nome === "NIF não encontrado" && !hasCustomerName(nomeClienteManual))) {
                    setPopupMensagem("Não é possível gerar PDF: NIF não encontrado.");
                    return;
                  }
                  gerarPDF();
                }}
                className="h-12 cursor-pointer rounded-full bg-(--orange) px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover)"
              >
                Gerar PDF
              </button>

              <button
                type="button"
                onClick={enviarParaVendas}
                disabled={sendingToSales || loadingNif || loadingQuote || !!quoteLoadError}
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-sky-700 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
              >
                <IoCloudUploadOutline />
                {sendingToSales ? "A guardar…" : editingRecord ? "Guardar alterações" : "Enviar para vendas"}
              </button>
              <QuoteEmailButton initialEmail={emailCliente} prepare={async () => {
                if (loadingNif || (dadosEmpresa?.nome === "NIF não encontrado" && !hasCustomerName(nomeClienteManual))) throw new Error("Confirme os dados do cliente antes de enviar.");
                if (!linhas.some((line) => line.produto && line.unidades > 0)) throw new Error("Adicione artigos ao orçamento.");
                const blob = await generateBudgetPdf({ quoteNumberRef, linhas, descontoSelecionado, dadosEmpresa, nif, nomeClienteManual, returnBlob: true });
                return [{ blob, name: quoteFilename({ lines: linhas, customerName: resolveCustomerName(dadosEmpresa, nomeClienteManual) }) }];
              }} />
            </div>
          </div>
        </section>

      {popupMensagem ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-80 relative">
            <button
              className="absolute top-2 right-2 cursor-pointer text-(--orange) w-5 h-5 bg-white rounded-full shadow-sm hover:text-gray-700"
              onClick={() => setPopupMensagem(null)}
            >
              ×
            </button>
            <p className="text-center">{popupMensagem}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
