"use client";
import { useState, useEffect, useRef } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { IoIosAdd } from "react-icons/io";
import orcamento from "../../../assets/orcamento.json";
import { MdOutlineDelete } from "react-icons/md";
import jsPDF from "jspdf";
import "jspdf-autotable";

function page() {
  // --------------------
  // Todos os hooks primeiro
  const [pinDigitado, setPinDigitado] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const PIN_CORRETO = "1248";
  const [erroPin, setErroPin] = useState(false);

  const [linhas, setLinhas] = useState([
    { produto: null, preco: 0, unidades: 0, total: 0 },
  ]);
  const [openProdutoIndex, setOpenProdutoIndex] = useState(null);
  const [openDesc, setOpenDesc] = useState(false);
  const [descontoSelecionado, setDescontoSelecionado] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const descRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("[data-produto-dropdown]"))
        setOpenProdutoIndex(null);
      if (!event.target.closest("[data-desc-dropdown]")) setOpenDesc(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --------------------
  // Funções
  const verificarPin = (e) => {
    e.preventDefault();
    if (pinDigitado === PIN_CORRETO) {
      setAutenticado(true);
      setErroPin(false);
    } else {
      setErroPin(true);
    }
  };

  const adicionarLinha = () =>
    setLinhas([...linhas, { produto: null, preco: 0, unidades: 0, total: 0 }]);

  const selecionarProduto = (index, produtoObj) => {
    const novasLinhas = [...linhas];
    novasLinhas[index].produto = produtoObj.produto;
    novasLinhas[index].preco = produtoObj.preço;
    novasLinhas[index].total = novasLinhas[index].unidades * produtoObj.preço;
    setLinhas(novasLinhas);
    setOpenProdutoIndex(null);
  };

  const alterarUnidades = (index, valor) => {
    const novasLinhas = [...linhas];
    const unidades = Number(valor) || 0;
    novasLinhas[index].unidades = unidades;
    novasLinhas[index].total = unidades * novasLinhas[index].preco;
    setLinhas(novasLinhas);
  };

  const removerLinha = (index) => {
    const novasLinhas = linhas.filter((_, i) => i !== index);
    setLinhas(
      novasLinhas.length
        ? novasLinhas
        : [{ produto: null, preco: 0, unidades: 0, total: 0 }],
    );
  };

  const totalSemDesconto = linhas.reduce((acc, linha) => acc + linha.total, 0);
  const totalComDesconto =
    totalSemDesconto - (totalSemDesconto * descontoSelecionado) / 100;
  const totalComIVA = totalComDesconto * 1.23;

  const handleCopy = (e) => {
    e.preventDefault();
    const linhasFormatadas = linhas
      .filter((l) => l.produto && l.unidades > 0)
      .map((l) => {
        let nomeCompacto = l.produto
          .replace(/\s+/g, " ")
          .replace(/ x /g, "x")
          .replace(/c\/ /g, "c/");
        return `- ${nomeCompacto}: ${l.unidades}un x ${l.preco.toFixed(2)}€ = ${l.total.toFixed(2)}€`;
      })
      .join("\n");

    let totaisTexto = `Total Bruto: ${totalSemDesconto.toFixed(2)}€`;
    if (descontoSelecionado > 0)
      totaisTexto += `\nTotal c/${descontoSelecionado}% Desc: ${totalComDesconto.toFixed(2)}€`;
    totaisTexto += `\nTotal c/IVA: ${totalComIVA.toFixed(2)}€`;

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
        return `- ${nomeCompacto}: ${l.unidades}un x ${l.preco.toFixed(2)}€ = ${l.total.toFixed(2)}€`;
      })
      .join("\n");

    let totaisTexto = `Total Bruto: ${totalSemDesconto.toFixed(2)}€`;
    if (descontoSelecionado > 0)
      totaisTexto += `\nTotal c/${descontoSelecionado}% Desc: ${totalComDesconto.toFixed(2)}€`;
    totaisTexto += `\nTotal c/IVA: ${totalComIVA.toFixed(2)}€`;

    const textoFinal = `${linhasFormatadas}\n\n${totaisTexto}`;
    await navigator.clipboard.writeText(textoFinal);
    setCopiado(true);
    setTimeout(() => {
      setCopiado(false);
    }, 1000);
  };

  const gerarPDF = async () => {
  const doc = new jsPDF();
  const corBlue = [8, 121, 192]; // azul para total IVA
  const corOrange = [255, 85, 0]; // laranja para cabeçalho
  const corGray = [240, 240, 240]; // cinza claro para fundo da tabela

  // Adicionar logo centrado
  const logo = new Image();
  logo.src = "/logo.png";
  await new Promise((resolve) => (logo.onload = resolve));

  const maxWidth = 50;
  const maxHeight = 25;
  let logoWidth = logo.width;
  let logoHeight = logo.height;
  const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight);
  logoWidth *= ratio;
  logoHeight *= ratio;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoX = (pageWidth - logoWidth) / 2;
  doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);

  let y = 10 + logoHeight + 10;

  // Cabeçalho (sem título de orçamento)
  // Data em horário português
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const agora = new Date();
  doc.text(
    `Data: ${agora.toLocaleDateString("pt-PT")} ${agora.toLocaleTimeString("pt-PT")}`,
    10,
    y
  );
  y += 10;

  // contactos no canto inferior esquerdo
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let yContactos = pageHeight - 40; // 40mm do fundo
  doc.text("Benedita", 10, yContactos);
  yContactos += 5;
  doc.text("Fernando Galinha", 10, yContactos);
  yContactos += 5;
  doc.text("vastoimperio@sapo.pt | +351 966 518 436", 10, yContactos);
  yContactos += 10; // gap maior antes de "Viseu"
  doc.text("Viseu", 10, yContactos);
  yContactos += 5;
  doc.text("Henrique Galinha", 10, yContactos);
  yContactos += 5;
  doc.text("geral@vastoimperio.pt | +351 928 348 117", 10, yContactos);

  // Fundo cinza para tabela (abrange toda a largura das colunas)
  doc.setFillColor(...corGray);
  const tabelaAltura = 8 + (linhas.filter(l => l.produto && l.unidades > 0).length * 8);
  doc.rect(10, y, 190, tabelaAltura, "F");

  // Cabeçalho da tabela (topo laranja)
  const colX = [15, 140, 170, 195]; // Produto, Unidades, Preço/un, Total
  doc.setFont("helvetica", "bold");
  doc.setFillColor(...corOrange);
  doc.setTextColor(255);
  doc.rect(10, y - 6, 190, 8, "F"); // fundo laranja
  doc.text("Produto", colX[0], y);
  doc.text("Un", colX[1], y, { align: "right" });
  doc.text("Preço /un", colX[2], y, { align: "right" });
  doc.text("Total", colX[3], y, { align: "right" });
  y += 8;

  // Linhas da tabela
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  linhas.filter(l => l.produto && l.unidades > 0).forEach(l => {
    // incluir a referência completa como no dropdown
    let linhaProduto = orcamento.produtos.find(
      p => p.produto === l.produto && l.refCompleta === p.refCompleta
    );
    let refCompleta = linhaProduto?.refCompleta || "";
    let nomeCompacto = `${refCompleta} ${l.produto}`.replace(/\s+/g, " ").replace(/ x /g, "x").replace(/c\/ /g, "c/");
    doc.text(nomeCompacto, colX[0], y);
    doc.text(`${l.unidades}un`, colX[1], y, { align: "right" });
    doc.text(`${l.preco.toFixed(2)}€`, colX[2], y, { align: "right" });
    doc.text(`${l.total.toFixed(2)}€`, colX[3], y, { align: "right" });
    y += 8;
  });

  // Totais no canto inferior direito da página
  const rightX = pageWidth - 10;
  let yTotais = pageHeight - 30; // posição a 30mm do fundo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(`Total Bruto: ${totalSemDesconto.toFixed(2)}€`, rightX, yTotais, { align: "right" });
  yTotais += 8;
  if (descontoSelecionado > 0) {
    doc.setTextColor(...corOrange);
    doc.text(`Total c/${descontoSelecionado}% Desc: ${totalComDesconto.toFixed(2)}€`, rightX, yTotais, { align: "right" });
    yTotais += 8;
  }
  doc.setTextColor(...corBlue);
  doc.text(`Total c/IVA: ${totalComIVA.toFixed(2)}€`, rightX, yTotais, { align: "right" });

  doc.save("orcamento.pdf");
};


  const gerarRefCompleta = (refFamilia) => {
    let contador = 1;
    return orcamento.produtos
      .filter((p) => p.ref === refFamilia)
      .map((p) => ({ ...p, refCompleta: `${refFamilia}.${contador++}` }));
  };

  // --------------------
  // Return condicional para PIN
  if (autenticado) {
    return (
      <div className="flex items-center justify-center h-screen">
        <form
          onSubmit={verificarPin}
          className="flex flex-col items-center gap-3"
        >
          <label className="text-lg font-bold">Insira o PIN de 4 dígitos</label>
          <input
            type="password"
            maxLength={4}
            value={pinDigitado}
            onChange={(e) => setPinDigitado(e.target.value)}
            className="border p-2 rounded text-center w-20"
          />
          <button
            type="submit"
            className="bg-(--orange) text-white px-5 py-2 rounded-full"
          >
            Entrar
          </button>
          {erroPin && (
            <p className="text-red-600">PIN incorreto. Tente novamente.</p>
          )}
        </form>
      </div>
    );
  }

  return (
    <div
      onCopy={handleCopy}
      className="flex items-center justify-center h-screen p-5"
    >
      <div className="bg-(--gray) p-5 rounded-[35px] flex flex-col gap-5 shadow-md min-h-100 justify-between">
        <div className="flex flex-col gap-5 items-start">
          {linhas.map((linha, index) => (
            <div key={index} className="flex gap-5 items-center relative">
              <div data-produto-dropdown className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setOpenProdutoIndex(
                      openProdutoIndex === index ? null : index,
                    )
                  }
                  className="flex cursor-pointer orca w-auto md:w-100 lg:w-120"
                >
                  <p>{linha.produto || "Produto"}</p>
                  <IoIosArrowDown />
                </button>

                {openProdutoIndex === index && (
                  <div className="absolute bg-white shadow-md rounded-[20px] mt-1 w-120 z-10 max-h-100 overflow-y-auto">
                    {[...new Set(orcamento.produtos.map((p) => p.ref))].map(
                      (refFamilia) => (
                        <div key={refFamilia}>
                          {gerarRefCompleta(refFamilia).map((p) => (
                            <div
                              key={p.refCompleta}
                              onClick={() => selecionarProduto(index, p)}
                              className="p-2 cursor-pointer rounded-[15px] hover:bg-gray-200 flex items-center gap-3"
                            >
                              <img
                                src={p.image && p.image !== "/orcamento/.png" ? p.image : "/favicon.png"}
                                alt={p.produto}
                                onError={(e) => {
                                  e.currentTarget.src = "/favicon.png";
                                }}
                                className="w-8 h-8 object-contain"
                              />
                              <span>
                                {p.produto}
                              </span>
                            </div>
                          ))}
                        </div>
                      ),
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
                className="orca w-15 text-center"
                placeholder="0un"
              />

              <div className="orca flex">
                <p className="text-center">{linha.preco.toFixed(2)}€ /un</p>
              </div>

              <div className="orca flex">
                <p className="text-center">{linha.total.toFixed(2)}€</p>
              </div>

              <button
                type="button"
                onClick={() => removerLinha(index)}
                className="flex items-center justify-center"
              >
                <div className="rounded-full bg-white shadow-md h-10 w-10 items-center flex justify-center text-center cursor-pointer">
                  <MdOutlineDelete className="text-(--orange) text-[1.5em]" />
                </div>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={adicionarLinha}
            className="flex w-fit cursor-pointer orca"
          >
            <IoIosAdd className="text-[2em]" />
          </button>
        </div>

        <div className="flex justify-between relative">
          <div data-desc-dropdown className="relative">
            <button
              type="button"
              onClick={() => setOpenDesc(!openDesc)}
              className="flex cursor-pointer orca w-20"
            >
              <p>{descontoSelecionado}%</p>
              <IoIosArrowDown />
            </button>

            {openDesc && (
              <div className="absolute bg-white rounded-[15px] shadow-md mt-1 w-20 z-10">
                {orcamento.descontos.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setDescontoSelecionado(Number(d.desconto));
                      setOpenDesc(false);
                    }}
                    className="p-2 cursor-pointer hover:bg-gray-200 text-center"
                  >
                    {d.desconto}%
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-[1.5em] text-right">
            <h2>Total Bruto: {totalSemDesconto.toFixed(2)}€</h2>
            {descontoSelecionado > 0 && (
              <h2 className="text-(--orange)">
                Total c/ {descontoSelecionado}% Desc:{" "}
                {totalComDesconto.toFixed(2)}€
              </h2>
            )}
            <h2 className="text-(--blue)">
              Total c/IVA: {totalComIVA.toFixed(2)}€
            </h2>
           <div className="flex gap-5 justify-end mt-4">
            <button
              type="button"
              onClick={copiarManual}
              className={`${
                copiado ? "bg-blue-600" : "bg-(--blue)"
              } cursor-pointer text-white px-5 text-[0.8em] py-1 rounded-full transition-all duration-200`}
            >
              {copiado ? "Texto copiado" : "Copiar Texto"}
            </button>

            <button
              type="button"
              onClick={gerarPDF}
              className="bg-(--orange) cursor-pointer text-white px-5 text-[0.8em] py-1 rounded-full"
            >
              Gerar PDF
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default page;
