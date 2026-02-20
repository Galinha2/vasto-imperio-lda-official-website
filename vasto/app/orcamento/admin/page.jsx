"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  const [mounted, setMounted] = useState(false);
  const PIN_CORRETO = "1248";
  const [erroPin, setErroPin] = useState(false);

  const [linhas, setLinhas] = useState([
    { produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "" },
  ]);
  const [openProdutoIndex, setOpenProdutoIndex] = useState(null);
  const [openDesc, setOpenDesc] = useState(false);
  const [descontoSelecionado, setDescontoSelecionado] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [pesquisaProduto, setPesquisaProduto] = useState("");
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

  useEffect(() => {
    const auth = localStorage.getItem("admin_auth") === "true";
    setAutenticado(auth);
    setMounted(true);
  }, []);

  // --------------------
  // Função para formatar números com espaços (ex: 1000 -> 1 000)
  const formatarNumero = (valor) => {
    // Separar parte inteira e decimal
    const partes = valor.toFixed(2).split(".");
    const parteInteira = partes[0];
    const parteDecimal = partes[1];
    
    // Adicionar espaços a cada 3 dígitos na parte inteira
    const parteInteiraFormatada = parteInteira.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    
    // Juntar com a parte decimal
    return `${parteInteiraFormatada},${parteDecimal}`;
  };

  // Funções
  const verificarPin = (e) => {
    e.preventDefault();
    if (pinDigitado === PIN_CORRETO) {
      setAutenticado(true);
      setErroPin(false);
      localStorage.setItem("admin_auth", "true");
    } else {
      setErroPin(true);
    }
  };

  const adicionarLinha = () =>
    setLinhas([...linhas, { produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "" }]);

  const selecionarProduto = (index, produtoObj) => {
    const novasLinhas = [...linhas];
    novasLinhas[index].produto = produtoObj.produto;
    novasLinhas[index].preco = produtoObj.preço;
    novasLinhas[index].refCompleta = produtoObj.refCompleta;
    novasLinhas[index].total = novasLinhas[index].unidades * produtoObj.preço;
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

  const removerLinha = (index) => {
    const novasLinhas = linhas.filter((_, i) => i !== index);
    setLinhas(
      novasLinhas.length
        ? novasLinhas
        : [{ produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "" }],
    );
  };

  const totalSemDesconto = linhas.reduce((acc, linha) => acc + linha.total, 0);
  const totalComDesconto =
    linhas.reduce((acc, l) => {
      if (l.produto === "Portes de envio") return acc + l.total;
      return acc + l.total * (1 - descontoSelecionado / 100);
    }, 0);

  // Portes de envio têm IVA mas não têm desconto. Aplicar IVA a todos, desconto só aos outros.
  const totalComIVA = linhas.reduce((acc, l) => {
    const valorDesc = l.produto === "Portes de envio" ? 0 : descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0;
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

  // Função gerarPDF com formatação de números
  const gerarPDF = async () => {
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    const corPretaFooter = [100, 100, 100];
    const corBlue = [8, 121, 192];
    const corOrange = [255, 85, 0];
    const corGray = [255, 255, 255];
    const corBlack = [0, 0, 0];

    function drawTopoDireito(tipoFolha, doc, pageWidth) {
      const x = pageWidth - 12;
      let y = 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(17);
      doc.setTextColor(...corPretaFooter);
      doc.text("Orçamento", x, y, { align: "right" });
      y += 3;
      doc.setDrawColor(...corBlack);
      doc.setLineWidth(0.05);
      doc.line(x - 40, y, x, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...corPretaFooter);
      const tipoUpper = tipoFolha || "";
      doc.text(`Folha Nº 1 de 1 ${tipoUpper}`, x, y, { align: "right" });
      y += 7;
      doc.text("Natureza: Orçamento", x, y, { align: "right" });
    }

    const desenharPagina = (tipoFolha, logoPreload) => {
      const logo = logoPreload;
      const maxWidth = 55;
      const maxHeight = 22;
      let logoWidth = logo.width;
      let logoHeight = logo.height;
      if (!logoWidth || !logoHeight) {
        logoWidth = maxWidth;
        logoHeight = maxHeight;
      }
      const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight);
      logoWidth *= ratio;
      logoHeight *= ratio;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logo, "PNG", logoX, 12, logoWidth, logoHeight);

      drawTopoDireito(tipoFolha, doc, pageWidth);

      let y = 12 + logoHeight + 6;
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("VASTO IMPÉRIO, LDA", 12, y);
      doc.setFontSize(10);
      y += 6;
      doc.text("NIF 516 032 778", 12, y);
      y += 5;
      doc.text(
        "RUA PRINCIPAL N 31 CABECINHA BENEDITA 2475-014 BENEDITA",
        12,
        y,
      );
      y += 5;
      doc.text(
        "Benedita: Telefone: +351 966 518 436 | Email: vastoimperio@sapo.pt",
        12,
        y,
      );
      y += 5;
      doc.text(
        "Viseu: Telefone: +351 928 348 117 | Email: geral@vastoimperio.pt",
        12,
        y,
      );
      y += 5;

      const boxHeight = 6;
      const caixaX = 12;
      const caixaY = y;
      const caixaWidth = 80;
      const agora = new Date();
      const dataEmissao = agora.toLocaleDateString("pt-PT");
      const dataVenc = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);

      const text = "Dados Bancários";
      doc.setFont("helvetica", "normal");
      const textWidth = doc.getTextWidth(text) + 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, caixaY, textWidth, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(text, caixaX + 2, caixaY + 4);
      doc.text("EuroBic", caixaX + 2, caixaY + 10);
      doc.text("IBAN:  PT50 0079 0000 4766 1251 1016 4", caixaX + 2, caixaY + 15);

      const textEmissao = "Data Emissão:";
      doc.setFont("helvetica", "normal");
      const textWidthEmissao = doc.getTextWidth(textEmissao) + 4;
      const emissaoX = caixaX + caixaWidth + 5;
      doc.setFillColor(200, 200, 200);
      doc.rect(emissaoX, caixaY, textWidthEmissao, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(textEmissao, emissaoX + 2, caixaY + 4);
      doc.text(dataEmissao, emissaoX + 2, caixaY + 4 + boxHeight);

      const textVenc = "Data Vencimento:";
      doc.setFont("helvetica", "normal");
      const textWidthVenc = doc.getTextWidth(textVenc) + 4;
      const vencX = emissaoX + 50;
      doc.setFillColor(200, 200, 200);
      doc.rect(vencX, caixaY, textWidthVenc, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(textVenc, vencX + 2, caixaY + 4);
      doc.text(
        dataVenc.toLocaleDateString("pt-PT"),
        vencX + 2,
        caixaY + 4 + boxHeight,
      );

      y += boxHeight * 2 + 8;

      const tableCols = [
        { title: "REF", dataKey: "referencia", width: 22 },
        { title: "DESCRIÇÃO", dataKey: "descricao", width: 67 },
        { title: "QUANT.", dataKey: "quantidade", width: 15 },
        { title: "UNI", dataKey: "uni", width: 13 },
        { title: "P. VENDA S/IVA", dataKey: "pvenda", width: 25 },
        { title: "DESC", dataKey: "desc", width: 13 },
        { title: "VALOR LIQUIDO", dataKey: "valorliq", width: 22 },
        { title: "IVA", dataKey: "iva", width: 15 },
      ];

      // Usar a refCompleta que já está armazenada no estado linhas
      const linhasProdutos = linhas
        .filter((l) => l.produto)
        .map((l) => {
          const unidade = "un";
          // Para Portes de envio, desconto é sempre vazio na coluna "DESC"
          const descLinha = l.produto === "Portes de envio" ? "" : (descontoSelecionado > 0 ? descontoSelecionado : 0);
          const valorDesc = l.produto === "Portes de envio" ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0);
          const valorLiquido = l.total - valorDesc;
          return {
            referencia: l.refCompleta || "",
            descricao: l.produto,
            quantidade: l.unidades > 0 ? l.unidades : "",
            uni: unidade,
            pvenda: formatarNumero(l.preco) + "€",
            desc: descLinha !== "" && descLinha > 0 ? descLinha + "%" : "",
            valorliq: formatarNumero(valorLiquido) + "€",
            iva: "23%",
          };
        });

      autoTable(doc, {
        startY: y,
        head: [
          tableCols.map((col, idx) => ({
            content: col.title,
            halign: idx === 1 ? "left" : "center",
          })),
        ],
        body: linhasProdutos.map((row) =>
          tableCols.map((col) => row[col.dataKey]),
        ),
        theme: "plain",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 9,
          cellPadding: 0.5,
          minCellHeight: 1,
          halign: "right",
          valign: "middle",
          textColor: corPretaFooter,
          overflow: "hidden",
          lineWidth: 0,
        },
        headStyles: {
          fillColor: [200, 200, 200],
          textColor: corPretaFooter,
          fontStyle: "normal",
          font: "helvetica",
          halign: "center",
          lineWidth: 0.1,
          lineColor: corGray,
          cellPadding: 2,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: corPretaFooter,
          fontStyle: "normal",
          font: "helvetica",
          lineWidth: 0,
          cellPadding: 0.5,
        },
        columnStyles: {
          0: { halign: "left" },
          1: { halign: "left" },
          2: { halign: "right" },
          3: { halign: "left" },
          4: { halign: "right" },
          5: { halign: "center" },
          6: { halign: "right" },
          7: { halign: "right" },
        },
        margin: { left: 12, right: 8 },
        tableWidth: "auto",
        columnWidth: "auto",
      });

      const totalBruto = linhas.reduce((acc, l) => acc + l.total, 0);
      const totalDescLinha = linhas.reduce(
        (acc, l) =>
          acc +
          (l.produto === "Portes de envio" ? 0 :
            (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0)
          ),
        0,
      );
      // Para Portes de envio, não há desconto, mas há IVA
      const totalLiquido = linhas.reduce(
        (acc, l) =>
          acc +
          (l.total - (l.produto === "Portes de envio" ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0))),
        0,
      );
      // IVA sobre todos os produtos, incluindo Portes de envio
      const totalIVA = linhas.reduce(
        (acc, l) => {
          const valorDesc = l.produto === "Portes de envio" ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0);
          const valorLiquido = l.total - valorDesc;
          return acc + valorLiquido * 0.23;
        },
        0,
      );
      const totalFinal = totalLiquido + totalIVA;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...corBlack);
      let yFooter = pageHeight - 24;
      doc.setDrawColor(...corPretaFooter);
      doc.setLineWidth(0.05);
      doc.line(12, yFooter - 3, pageWidth - 8, yFooter - 3);
      doc.text(
        "RUA PRINCIPAL N 31 CABECINHA BENEDITA 2475-014 BENEDITA",
        12,
        yFooter,
      );
      yFooter += 4;
      doc.text(
        "Telefone: +351 966 518 436 | Email: vastoimperio@sapo.pt",
        12,
        yFooter,
      );
      yFooter += 4;
      doc.text(
        "Telefone: +351 928 348 117 | Email: geral@vastoimperio.pt",
        12,
        yFooter,
      );
      yFooter += 4;
      const anoAtual = new Date().getFullYear();
      doc.text(
        `© ${anoAtual} Vasto Império. Todos os direitos reservados.`,
        12,
        yFooter,
      );

      const totaisAltura = 6 * 5 + 7 + 7;
      const margemFooter = 8;
      let yTot = pageHeight - 24 - margemFooter - totaisAltura;
      let yAfterTable = doc.lastAutoTable.finalY + 4;
      if (yTot < yAfterTable + 4) yTot = yAfterTable + 4;
      doc.setDrawColor(...corBlack);
      doc.setLineWidth(0.05);
      doc.line(8, yTot - 5, pageWidth - 8, yTot - 5);

      const xIncidencia = 12;
      const yIncidencia = yTot;
      const spacingY = 5;
      const spacingX = 30;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.setFontSize(10);
      doc.text("Incidência", xIncidencia, yIncidencia, { align: "left" });
      doc.text("Taxa", xIncidencia + spacingX, yIncidencia, { align: "left" });
      doc.text("IVA", xIncidencia + 2 * spacingX, yIncidencia, {
        align: "left",
      });

      doc.setFont("helvetica", "normal");
      doc.text(
        formatarNumero(totalLiquido) + "€",
        xIncidencia,
        yIncidencia + spacingY,
        { align: "left" },
      );
      doc.text("23%", xIncidencia + spacingX, yIncidencia + spacingY, {
        align: "left",
      });
      doc.text(
        formatarNumero(totalIVA) + "€",
        xIncidencia + 2 * spacingX,
        yIncidencia + spacingY,
        { align: "left" },
      );

      const xTotais = 125;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Total Bruto:", xTotais, yTot, { align: "left" });
      doc.text(formatarNumero(totalBruto) + "€", 200, yTot, {
        align: "right",
      });
      yTot += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Desconto Linha:", xTotais, yTot, { align: "left" });
      doc.setTextColor(...corOrange);
      doc.text(
        "-" + formatarNumero(totalDescLinha) + "€",
        200,
        yTot,
        { align: "right" },
      );
      yTot += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Desconto Global:", xTotais, yTot, { align: "left" });
      doc.setTextColor(...corOrange);
      doc.text(`${descontoSelecionado}%`, 200, yTot, { align: "right" });
      yTot += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Total Líquido:", xTotais, yTot, { align: "left" });
      doc.setTextColor(...corOrange);
      doc.text(formatarNumero(totalLiquido) + "€", 200, yTot, {
        align: "right",
      });
      yTot += 6;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Total IVA:", xTotais, yTot, { align: "left" });
      doc.text(formatarNumero(totalIVA) + "€", 200, yTot, {
        align: "right",
      });

      yTot += 3;
      doc.setLineWidth(0.05);
      doc.line(xTotais, yTot, 200, yTot);
      const yLinhaTotal = yTot;
      yTot += 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...corBlack);
      doc.text("TOTAL:", xTotais, yTot, { align: "left" });
      doc.setTextColor(...corBlue);
      doc.text(formatarNumero(totalFinal) + "€", 200, yTot, {
        align: "right",
      });

      doc.setDrawColor(...corBlack);
      doc.setLineWidth(0.05);
      doc.line(12, yLinhaTotal, 90, yLinhaTotal);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...corBlack);
      doc.text("Este documento não serve de fatura", 12, yLinhaTotal + 12);
    };

    const logoPreload = new window.Image();
    logoPreload.src = "/logo.png";
    await new Promise((resolve) => (logoPreload.onload = resolve));

    desenharPagina("Original", logoPreload);
    doc.addPage();
    desenharPagina("Duplicado", logoPreload);

    doc.save("orcamento.pdf");
  };

  // Mantém a função para o dropdown: gerar refCompleta por família
  const gerarRefCompleta = (refFamilia) => {
    let contador = 1;
    return orcamento.produtos
      .filter((p) => p.ref === refFamilia)
      .map((p) => ({ ...p, refCompleta: `${refFamilia}.${contador++}` }));
  };

  // --------------------
  // Return condicional para PIN
  if (!mounted) {
    return null;
  }
  if (!autenticado) {
    return (
      <div className="flex items-center justify-center h-screen">
        <form
          onSubmit={verificarPin}
          className="flex flex-col items-center gap-3"
        >
            <Image src="/favicon.png" alt="Logo" width={150} height={60} className="mb-4" />
          <label className="text-lg font-bold">Insira o PIN de 4 dígitos</label>
          <input
            type="password"
            maxLength={4}
            value={pinDigitado}
            onChange={(e) => setPinDigitado(e.target.value)}
            className="border p-2 rounded-full text-center w-20"
          />
          <button
            type="submit"
            className="bg-(--orange) cursor-pointer text-white px-5 py-2 rounded-full"
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
      className="flex items-center justify-center h-screen p-0 md:p-5"
    >
      <div className="md:bg-(--gray) px-2 py-10 md:p-5 md:rounded-[35px] w-full md:w-auto flex flex-col gap-5 md:shadow-md min-h-150 md:min-h-100 justify-between">
        <div className="flex flex-col gap-5 items-start">
          {linhas.map((linha, index) => (
            <div
              key={index}
              className="flex gap-2 md:gap-5 w-full items-center relative"
            >
              <div data-produto-dropdown className="relative w-full">
                <div className="flex items-center orca rounded-[25px] w-full md:w-100 lg:w-120 px-3">
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
                    className="flex-1 outline-none bg-transparent w-10"
                  />

                  <IoIosArrowDown
                    className="cursor-pointer"
                    onClick={() =>
                      setOpenProdutoIndex(
                        openProdutoIndex === index ? null : index,
                      )
                    }
                  />
                </div>

                {openProdutoIndex === index && (
                  <div className="absolute bg-white shadow-md rounded-[20px] mt-1 w-120 z-10 max-h-100 overflow-y-auto">
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
                            className="p-2 cursor-pointer rounded-[15px] hover:bg-gray-200 flex items-center gap-3"
                          >
                            <span className="text-sm w-5">{p.refCompleta}</span>
                            <img
                              src={
                                p.image && p.image !== "/orcamento/.png"
                                  ? p.image
                                  : "/favicon.png"
                              }
                              alt={p.produto}
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
                className="orca w-15 text-center"
                placeholder="0un"
              />

              <div className="orca flex w-full">
                {linha.produto === "Portes de envio" ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.preco || ""}
                    onChange={(e) => {
                      const novasLinhas = [...linhas];
                      novasLinhas[index].preco = Number(e.target.value) || 0;
                      novasLinhas[index].total = novasLinhas[index].unidades * novasLinhas[index].preco;
                      setLinhas(novasLinhas);
                    }}
                    className="text-center w-full border rounded px-1"
                    placeholder="Preço"
                  />
                ) : (
                  <p className="text-center">{linha.preco?.toFixed(2).replace(".", ",")}€ /un</p>
                )}
              </div>

              <div className="orca flex">
                <p className="text-center">
                  {linha.total.toFixed(2).replace(".", ",")}€
                </p>
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
            <h2>
              Total Bruto: {totalSemDesconto.toFixed(2).replace(".", ",")}€
            </h2>
            {descontoSelecionado > 0 && (
              <h2 className="text-(--orange)">
                Total c/ {descontoSelecionado}% Desc:{" "}
                {totalComDesconto.toFixed(2).replace(".", ",")}€
              </h2>
            )}
            <h2 className="text-(--blue)">
              Total c/IVA: {totalComIVA.toFixed(2).replace(".", ",")}€
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