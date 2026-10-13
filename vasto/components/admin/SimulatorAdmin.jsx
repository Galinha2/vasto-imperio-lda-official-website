"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@/components/loadings/LoadingImage";
import SimulatorEstantesLigeiras from "@/components/simulador/SimulatorEstantesLigeiras";
import SimulatorPicking from "@/components/simulador/SimulatorPicking";
import SimulatorRacks from "@/components/simulador/SimulatorRacks";
import generateBudgetPdf from "@/lib/generateBudgetPdf";
import orcamento from "@/assets/orcamento.json";
import { IoIosArrowDown } from "react-icons/io";

const simuladores = [
  { id: "ligeiras", label: "Estantes ligeiras", description: "Carga manual e prateleiras", Component: SimulatorEstantesLigeiras },
  { id: "picking", label: "Picking", description: "Estantes de picking", Component: SimulatorPicking },
  { id: "racks", label: "Racks", description: "Armazenamento paletizado", Component: SimulatorRacks },
];

export default function SimulatorAdmin() {
  const [simuladorAtivo, setSimuladorAtivo] = useState("ligeiras");
  const [aExportar, setAExportar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [quoteData, setQuoteData] = useState(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [nifCliente, setNifCliente] = useState("");
  const [descontoManual, setDescontoManual] = useState("");
  const [produtosExtra, setProdutosExtra] = useState([]);
  const [produtoExtraAberto, setProdutoExtraAberto] = useState(null);
  const [pesquisaProdutoExtra, setPesquisaProdutoExtra] = useState("");
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [loadingNif, setLoadingNif] = useState(false);
  const capturaRef = useRef(null);
  const receberDadosOrcamento = useCallback((data) => {
    setQuoteData((current) => JSON.stringify(current) === JSON.stringify(data) ? current : data);
  }, []);
  const produtosCatalogo = orcamento.produtos.map((produto, index, todos) => ({
    ...produto,
    refCompleta: `${produto.ref}.${todos.slice(0, index).filter((item) => item.ref === produto.ref).length + 1}`,
  }));

  useEffect(() => {
    const fecharDropdown = (event) => {
      if (!event.target.closest("[data-produto-extra-dropdown]")) setProdutoExtraAberto(null);
    };
    document.addEventListener("mousedown", fecharDropdown);
    return () => document.removeEventListener("mousedown", fecharDropdown);
  }, []);

  useEffect(() => {
    if (!/^\d{9}$/.test(nifCliente)) {
      setDadosEmpresa(null);
      setLoadingNif(false);
      return;
    }
    const controller = new AbortController();
    setLoadingNif(true);
    fetch(`/api/nifs?nif=${nifCliente}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => setDadosEmpresa({
        nome: data?.nome || "Cliente",
        nif: data?.nif || nifCliente,
        codigoPostal: data?.codigoPostal || "V/ Morada",
      }))
      .catch((error) => {
        if (error.name !== "AbortError") setDadosEmpresa({ nome: "Cliente", nif: nifCliente, codigoPostal: "V/ Morada" });
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingNif(false); });
    return () => controller.abort();
  }, [nifCliente]);

  async function gerarImagem() {
    if (!capturaRef.current || aExportar) return;
    setAExportar(true);
    setMensagem("");
    try {
      await document.fonts?.ready;
      const { toPng } = await import("html-to-image");
      const desenho = capturaRef.current.querySelector('svg[role="img"]');
      if (!desenho) throw new Error("O desenho da pré-visualização não está disponível.");
      const dataUrl = await toPng(desenho, {
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `desenho-${simuladorAtivo}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Não foi possível guardar a imagem da simulação.", error);
      setMensagem("Não foi possível guardar a imagem. Tente novamente.");
    } finally {
      setAExportar(false);
    }
  }

  async function gerarPdf() {
    if (!quoteData || quoteData.unavailable || !quoteData.items?.length || aExportar) {
      setMensagem("A configuração atual não tem dados suficientes para gerar o orçamento.");
      return;
    }
    setAExportar(true);
    setMensagem("");
    try {
      if (dadosEmpresa?.nome === "NIF não encontrado") {
        setMensagem("Não é possível gerar o PDF: NIF não encontrado.");
        return;
      }
      await generateBudgetPdf({
        source: "simulador",
        linhas: [
          ...quoteData.items,
          ...produtosExtra.filter((item) => item.produto).map((item) => {
            const quantidade = Math.max(0, Number(item.unidades) || 0);
            const preco = Number(item.preco ?? item.produto["preço"]) || 0;
            return {
              produto: item.produto.produto,
              refCompleta: item.produto.refCompleta,
              unidades: quantidade,
              preco,
              total: quantidade * preco,
              isPortes: String(item.produto.ref) === "0",
            };
          }),
        ],
        descontoSelecionado: descontoManual === "" ? quoteData.discountPercent : Number(descontoManual),
        dadosEmpresa,
        nif: nifCliente,
        nomeClienteManual: nomeCliente.trim(),
      });
    } catch (error) {
      console.error("Não foi possível gerar o PDF da simulação.", error);
      setMensagem("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setAExportar(false);
    }
  }

  const ativo = simuladores.find(({ id }) => id === simuladorAtivo) ?? simuladores[0];
  const Simulator = ativo.Component;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868b]">Ferramenta interna</p>
            <h1 className="mt-1.5 text-3xl font-semibold tracking-[-0.05em] text-[#1d1d1f] sm:text-4xl">Simular equipamento</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
              Configure as medidas e prepare a imagem ou o orçamento para o cliente.
            </p>
          </div>
        </header>

        <nav aria-label="Escolher tipo de equipamento" className="grid gap-2 sm:grid-cols-3">
          {simuladores.map(({ id, label, description }, index) => (
            <button
              key={id}
              type="button"
              aria-pressed={simuladorAtivo === id}
              onClick={() => { setSimuladorAtivo(id); setQuoteData(null); setMensagem(""); setDescontoManual(""); setProdutosExtra([]); setProdutoExtraAberto(null); setPesquisaProdutoExtra(""); }}
              className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                simuladorAtivo === id
                  ? "border-[#0071e3]/30 bg-[#edf4ff] shadow-sm"
                  : "border-[#e5e5e7] bg-white hover:border-[#c8c9cf] hover:bg-[#fbfbfd]"
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-semibold ${simuladorAtivo === id ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#86868b]"}`}>
                0{index + 1}
              </span>
              <span>
                <span className={`block text-sm font-semibold ${simuladorAtivo === id ? "text-[#005fbd]" : "text-[#1d1d1f]"}`}>{label}</span>
                <span className="mt-0.5 block text-xs text-[#86868b]">{description}</span>
              </span>
            </button>
          ))}
        </nav>

        <section ref={capturaRef} aria-label={`Simulação de ${ativo.label}`} className="min-w-0">
          <Simulator adminMode onQuoteDataChange={receberDadosOrcamento} />
        </section>

        <section aria-label="Ajustes do orçamento" className="rounded-[24px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#86868b]">Preparar proposta</p>
              <h2 className="mt-1 text-lg font-semibold text-[#1d1d1f]">Ajustes ao orçamento</h2>
              <p className="mt-1 max-w-2xl text-sm text-[#6e6e73]">O desconto sugerido é aplicado automaticamente. Pode ajustá-lo e acrescentar artigos do catálogo.</p>
            </div>
            <label className="flex w-full flex-col gap-1.5 text-sm font-medium text-[#515158] sm:w-52">
              Desconto (%)
              <input type="number" min="0" max="100" step="1" value={descontoManual === "" ? (quoteData?.discountPercent ?? 0) : descontoManual} onChange={(event) => setDescontoManual(event.target.value)} className="h-11 rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-[#1d1d1f] outline-none focus:border-(--blue)" />
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
              <input aria-label="Quantidade" type="number" min="1" step="1" value={item.unidades} onChange={(event) => setProdutosExtra((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unidades: event.target.value } : row))} className="h-11 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm outline-none focus:border-(--blue)" />
              <input aria-label="Preço unitário" type="number" min="0" step="0.01" placeholder="Preço unitário" value={item.preco} onChange={(event) => setProdutosExtra((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, preco: event.target.value } : row))} className="h-11 rounded-full border border-[#e5e5e7] bg-white px-4 text-sm outline-none focus:border-(--blue)" />
              <button type="button" aria-label="Remover produto adicional" onClick={() => setProdutosExtra((current) => current.filter((_, rowIndex) => rowIndex !== index))} className="h-11 cursor-pointer rounded-full border border-[#e5e5e7] bg-white px-4 text-sm font-medium text-[#6e6e73] hover:bg-[#fff1eb] hover:text-(--orange)">Remover</button>
            </div>
          ))}
          <button type="button" onClick={() => {
            const novaLinha = { id: `${Date.now()}-${Math.random()}`, produto: null, unidades: 1, preco: "" };
            setProdutosExtra((current) => [...current, novaLinha]);
            setProdutoExtraAberto(produtosExtra.length);
            setPesquisaProdutoExtra("");
          }} className="mt-4 h-11 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7]">+ Adicionar produto</button>
        </section>

        <section aria-label="Exportar simulação" className="flex flex-col justify-between gap-4 rounded-[28px] border border-[#e5e5e7] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.035)] sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#1d1d1f]">Guardar esta configuração</h2>
            <p className="mt-1 text-sm text-[#6e6e73]">A imagem guarda apenas o desenho e as cotas. O PDF gera a folha de orçamento com artigos, quantidades, preços e desconto.</p>
            {mensagem && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{mensagem}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input value={nomeCliente} onChange={(event) => setNomeCliente(event.target.value)} placeholder="Nome do cliente (opcional)" className="h-11 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue)" />
              <input value={nifCliente} onChange={(event) => setNifCliente(event.target.value.replace(/\D/g, "").slice(0, 9))} inputMode="numeric" placeholder="NIF (opcional)" className="h-11 w-full rounded-full border border-[#e5e5e7] bg-[#f5f5f7] px-4 text-sm outline-none transition placeholder:text-[#86868b] focus:border-(--blue)" />
            </div>
            {loadingNif && <p className="mt-2 text-xs text-[#86868b]">A procurar dados do NIF…</p>}
            {dadosEmpresa && !loadingNif && <p className="mt-2 text-xs text-[#6e6e73]">{dadosEmpresa.nome} · {dadosEmpresa.codigoPostal}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={gerarImagem} disabled={aExportar || !quoteData || quoteData.unavailable} className="h-12 cursor-pointer rounded-full border border-[#d2d2d7] bg-white px-5 text-sm font-semibold text-[#1d1d1f] transition hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-50">
              {aExportar ? "A preparar…" : "Guardar imagem"}
            </button>
            <button type="button" onClick={gerarPdf} disabled={aExportar || loadingNif || !quoteData || quoteData.unavailable} className="h-12 cursor-pointer rounded-full bg-(--orange) px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-(--orange-hover) disabled:cursor-not-allowed disabled:opacity-50">
              {aExportar ? "A preparar…" : "Guardar PDF"}
            </button>
          </div>
        </section>
    </div>
  );
}
