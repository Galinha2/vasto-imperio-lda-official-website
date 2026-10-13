"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "@/components/loadings/LoadingImage";
import SimulatorEstantesLigeiras from "@/components/simulador/SimulatorEstantesLigeiras";
import SimulatorPicking from "@/components/simulador/SimulatorPicking";
import SimulatorRacks from "@/components/simulador/SimulatorRacks";
import SimulatorAdminQuoteTools from "@/components/admin/SimulatorAdminQuoteTools";
import generateBudgetPdf from "@/lib/generateBudgetPdf";
import orcamento from "@/assets/orcamento.json";

const simuladores = [
  { id: "ligeiras", label: "Estantes ligeiras", description: "Carga manual e prateleiras", image: "/prateleira inteira.png", Component: SimulatorEstantesLigeiras },
  { id: "picking", label: "Picking", description: "Estantes de picking", image: "/produtos/9-Porteco Z60/i1.png", Component: SimulatorPicking },
  { id: "racks", label: "Racks", description: "Armazenamento paletizado", image: "/recorte_DSC4798-1_c_laranja-2.png", Component: SimulatorRacks },
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
  const adminPanel = (
    <SimulatorAdminQuoteTools
      quoteData={quoteData}
      descontoManual={descontoManual}
      setDescontoManual={setDescontoManual}
      produtosExtra={produtosExtra}
      setProdutosExtra={setProdutosExtra}
      produtoExtraAberto={produtoExtraAberto}
      setProdutoExtraAberto={setProdutoExtraAberto}
      pesquisaProdutoExtra={pesquisaProdutoExtra}
      setPesquisaProdutoExtra={setPesquisaProdutoExtra}
      produtosCatalogo={produtosCatalogo}
      nomeCliente={nomeCliente}
      setNomeCliente={setNomeCliente}
      nifCliente={nifCliente}
      setNifCliente={setNifCliente}
      loadingNif={loadingNif}
      dadosEmpresa={dadosEmpresa}
      mensagem={mensagem}
      aExportar={aExportar}
      gerarImagem={gerarImagem}
      gerarPdf={gerarPdf}
    />
  );

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
          {simuladores.map(({ id, label, description, image }) => (
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
              <span className="relative grid h-12 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                <Image src={image} alt="" fill sizes="56px" className="object-contain p-1 mix-blend-multiply" />
              </span>
              <span>
                <span className={`block text-sm font-semibold ${simuladorAtivo === id ? "text-[#005fbd]" : "text-[#1d1d1f]"}`}>{label}</span>
                <span className="mt-0.5 block text-xs text-[#86868b]">{description}</span>
              </span>
            </button>
          ))}
        </nav>

        <section ref={capturaRef} aria-label={`Simulação de ${ativo.label}`} className="min-w-0">
          <Simulator adminMode adminPanel={adminPanel} onQuoteDataChange={receberDadosOrcamento} />
        </section>
    </div>
  );
}
