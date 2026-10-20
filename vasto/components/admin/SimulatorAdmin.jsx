"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "@/components/loadings/LoadingImage";
import SimulatorEstantesLigeiras from "@/components/simulador/SimulatorEstantesLigeiras";
import SimulatorPicking from "@/components/simulador/SimulatorPicking";
import SimulatorRacks from "@/components/simulador/SimulatorRacks";
import SimulatorAdminQuoteTools from "@/components/admin/SimulatorAdminQuoteTools";
import { hasCustomerName } from "@/lib/customer-identity.mjs";
import QuoteEmailButton from "./QuoteEmailButton";
import generateBudgetPdf from "@/lib/generateBudgetPdf";
import orcamento from "@/assets/orcamento.json";

const simuladores = [
  { id: "ligeiras", label: "Estantes ligeiras", description: "Carga manual e prateleiras", image: "/prateleira inteira.png", Component: SimulatorEstantesLigeiras },
  { id: "picking", label: "Picking", description: "Estantes de picking", image: "/produtos/9-Porteco Z60/i1.png", Component: SimulatorPicking },
  { id: "racks", label: "Racks", description: "Armazenamento paletizado", image: "/recorte_DSC4798-1_c_laranja-2.png", Component: SimulatorRacks },
  { id: "bancadas", label: "Bancadas", description: "Até 1 m de altura · 1 ou 2 níveis", image: "/produtos/14-Bancadas (Workbench)/i2.png", Component: SimulatorPicking },
];

export default function SimulatorAdmin() {
  const [simuladorAtivo, setSimuladorAtivo] = useState("ligeiras");
  const [aExportar, setAExportar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [savedCustomer, setSavedCustomer] = useState(null);
  const [nifCliente, setNifCliente] = useState("");
  const [descontoManual, setDescontoManual] = useState(null);
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
    if (savedCustomer && savedCustomer.nif === nifCliente) {
      setDadosEmpresa({ nome: savedCustomer.name, nif: savedCustomer.nif, codigoPostal: savedCustomer.address });
      setLoadingNif(false);
      return;
    }
    if (!/^\d{9}$/.test(nifCliente)) {
      setDadosEmpresa(null);
      setLoadingNif(false);
      return;
    }
    const controller = new AbortController();
    setLoadingNif(true);
    fetch(`/api/nifs?nif=${nifCliente}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data) => { if (!controller.signal.aborted) setDadosEmpresa({
        nome: data?.nome || "Cliente",
        nif: data?.nif || nifCliente,
        codigoPostal: data?.codigoPostal || "V/ Morada",
      }); })
      .catch((error) => {
        if (error.name !== "AbortError") setDadosEmpresa({ nome: "Cliente", nif: nifCliente, codigoPostal: "V/ Morada" });
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingNif(false); });
    return () => controller.abort();
  }, [nifCliente, savedCustomer]);

  async function gerarImagem() {
    if (!capturaRef.current || aExportar) return;
    setAExportar(true);
    setMensagem("");
    setMensagemSucesso(false);
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

  function obterDadosPdf() {
    if (!quoteData || quoteData.unavailable || !quoteData.items?.length || aExportar) {
      setMensagem("A configuração atual não tem dados suficientes para gerar o orçamento.");
      return null;
    }
    if (dadosEmpresa?.nome === "NIF não encontrado" && !hasCustomerName(nomeCliente)) {
      setMensagem("Não é possível gerar o PDF: NIF não encontrado.");
      return null;
    }
    return {
      source: "simulador",
      quoteType: simuladorAtivo,
      additionalDetails: quoteData.details || "",
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
      descontoSelecionado: descontoManual === null ? quoteData.discountPercent : Number(descontoManual || 0),
      dadosEmpresa,
      nif: nifCliente,
      nomeClienteManual: nomeCliente.trim(),
    };
  }

  async function gerarPdf() {
    const dadosPdf = obterDadosPdf();
    if (!dadosPdf) return;
    setAExportar(true);
    setMensagem("");
    setMensagemSucesso(false);
    try {
      await generateBudgetPdf(dadosPdf);
    } catch (error) {
      console.error("Não foi possível gerar o PDF da simulação.", error);
      setMensagem("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setAExportar(false);
    }
  }

  async function enviarParaVendas() {
    const dadosPdf = obterDadosPdf();
    if (!dadosPdf) return;
    setAExportar(true);
    setMensagem("");
    setMensagemSucesso(false);
    try {
      await document.fonts?.ready;
      const desenho = capturaRef.current?.querySelector('svg[role="img"]');
      if (!desenho) throw new Error("O desenho da pré-visualização não está disponível.");
      const [{ toJpeg }, pdf] = await Promise.all([
        import("html-to-image"),
        generateBudgetPdf({ ...dadosPdf, returnBlob: true }),
      ]);
      const imagemDataUrl = await toJpeg(desenho, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        quality: 0.9,
      });
      const imagemBlob = await (await fetch(imagemDataUrl)).blob();
      if (imagemBlob.size > 4 * 1024 * 1024) throw new Error("A imagem gerada ultrapassa o limite de 4 MB.");
      if (pdf.size > 6 * 1024 * 1024) throw new Error("O PDF gerado ultrapassa o limite de 6 MB.");

      const nomeBase = `simulacao-${simuladorAtivo}-${new Date().toISOString().slice(0, 10)}`;
      const form = new FormData();
      form.append("pdf", pdf, `${nomeBase}.pdf`);
      form.append("image", imagemBlob, `${nomeBase}.jpg`);
      const response = await fetch("/api/admin/sales", { method: "POST", body: form, cache: "no-store" });
      const result = await response.json();
      if (response.status === 401) throw new Error("A sessão de administração expirou. Inicie sessão novamente.");
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar a simulação para as vendas.");
      window.dispatchEvent(new Event("admin:sales-changed"));
      setMensagem(`Simulação de ${result.sale.customerName} enviada para as vendas com o PDF e a imagem.`);
      setMensagemSucesso(true);
    } catch (error) {
      console.error("Não foi possível enviar a simulação para as vendas.", error);
      setMensagem(error.message || "Não foi possível enviar a simulação para as vendas.");
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
      onCustomerSelect={(customer) => { setSavedCustomer(customer); setNomeCliente(customer.name); setNifCliente(customer.nif); }}
      nomeCliente={nomeCliente}
      setNomeCliente={setNomeCliente}
      nifCliente={nifCliente}
      setNifCliente={setNifCliente}
      loadingNif={loadingNif}
      dadosEmpresa={dadosEmpresa}
      mensagem={mensagem}
      mensagemSucesso={mensagemSucesso}
      aExportar={aExportar}
      gerarImagem={gerarImagem}
      gerarPdf={gerarPdf}
      enviarParaVendas={enviarParaVendas}
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

        <nav aria-label="Escolher tipo de equipamento" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {simuladores.map(({ id, label, description, image }) => (
            <button
              key={id}
              type="button"
              aria-pressed={simuladorAtivo === id}
              onClick={() => { setSimuladorAtivo(id); setQuoteData(null); setMensagem(""); setMensagemSucesso(false); setDescontoManual(null); setProdutosExtra([]); setProdutoExtraAberto(null); setPesquisaProdutoExtra(""); }}
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

        {simuladorAtivo !== "bancadas" && <nav aria-label="Modo de simulação" className="flex flex-wrap gap-2">
          <span className="rounded-full bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700">Configurar uma fila · 2D</span>
          <Link href={`/admin/simulador/espaco/${simuladorAtivo}`} className="rounded-full border border-[#e5e5e7] bg-white px-5 py-3 text-sm font-semibold text-[#424245] hover:bg-[#f5f5f7]">Planear com as medidas do espaço · Vista de topo</Link>
        </nav>}

        <div className="flex justify-end"><QuoteEmailButton prepare={async () => {
          const data = obterDadosPdf();
          if (!data) throw new Error("Confirme a configuração e os dados do cliente.");
          await document.fonts?.ready;
          const drawing = capturaRef.current?.querySelector('svg[role="img"]');
          if (!drawing) throw new Error("O desenho não está disponível.");
          const { toJpeg } = await import("html-to-image");
          const blob = await generateBudgetPdf({ ...data, returnBlob: true });
          const url = await toJpeg(drawing, { pixelRatio: 1.5, quality: 0.85, backgroundColor: "#ffffff", cacheBust: true });
          return [{ blob, name: "orcamento.pdf" }, { blob: await (await fetch(url)).blob(), name: "desenho.jpg" }];
        }} /></div>

        <section ref={capturaRef} aria-label={`Simulação de ${ativo.label}`} className="min-w-0">
          <Simulator key={simuladorAtivo} variant={simuladorAtivo === "bancadas" ? "workbench" : undefined} adminMode adminPanel={adminPanel} adminDiscountPercent={descontoManual} onQuoteDataChange={receberDadosOrcamento} />
        </section>
    </div>
  );
}
