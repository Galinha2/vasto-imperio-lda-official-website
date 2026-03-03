"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { IoIosArrowDown } from "react-icons/io";
import { IoIosAdd } from "react-icons/io";
import orcamento from "../../../assets/orcamento.json";
import { MdOutlineDelete } from "react-icons/md";
import jsPDF from "jspdf";
import "jspdf-autotable";

function Page() {
  // --------------------
  // Todos os hooks primeiro
  const [pinDigitado, setPinDigitado] = useState("");
  const [autenticado, setAutenticado] = useState(false);
  const [mounted, setMounted] = useState(false);
  const PIN_CORRETO = "1248";
  const [erroPin, setErroPin] = useState(false);

  const [linhas, setLinhas] = useState([
    { produto: null, preco: 0, unidades: 0, total: 0, refCompleta: "", isPortes: false },
  ]);
  const [openProdutoIndex, setOpenProdutoIndex] = useState(null);
  const [openDesc, setOpenDesc] = useState(false);
  const [descontoSelecionado, setDescontoSelecionado] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const [pesquisaProduto, setPesquisaProduto] = useState("");
  const descRef = useRef(null);
  const [nif, setNif] = useState("");
  const [dadosEmpresa, setDadosEmpresa] = useState(null);
  const [loadingNif, setLoadingNif] = useState(false);
  const [popupMensagem, setPopupMensagem] = useState(null);

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

  const procurarNif = async (valorNif) => {
    // Se o NIF estiver vazio ou inválido, apenas limpar
    if (!/^\d{9}$/.test(valorNif)) {
      setDadosEmpresa(null);
      return;
    }

    setLoadingNif(true);
    setDadosEmpresa(null); // limpar enquanto aguarda resposta

    try {
      // Chamada correta à API de NIFs
      const res = await fetch(`/api/nifs?nif=${valorNif}`);
      const data = await res.json();

      // Se a API devolve erro ou não há nome, usar fallback
      setDadosEmpresa({
        nome: data?.nome || "Cliente",
        nif: data?.nif || valorNif,
        codigoPostal: data?.codigoPostal || "V/ Morada",
      });
    } catch (err) {
      // Em caso de erro de rede ou exceção, usar fallback
      setDadosEmpresa({
        nome: "Cliente",
        nif: valorNif,
        codigoPostal: "V/ Morada",
      });
    } finally {
      setLoadingNif(false);
    }
  };

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

  // Portes de envio têm IVA mas não têm desconto. Aplicar IVA a todos, desconto só aos outros.
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
      // Nome da empresa no topo, à esquerda
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(...corPretaFooter);
      doc.text("VASTO IMPÉRIO, LDA", 12, y);
      y += 6;

      // --- Datas (dinâmicas) lado a lado acima dos dados bancários ---
      // Calcular datas
      const now = new Date();
      const pad2 = (n) => n.toString().padStart(2, "0");
      const dataAtualFormatada = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
      const vencDate = new Date(now);
      vencDate.setDate(vencDate.getDate() + 30);
      const dataVencimentoFormatada = `${pad2(vencDate.getDate())}/${pad2(vencDate.getMonth() + 1)}/${vencDate.getFullYear()}`;
      // Datas lado a lado: títulos na linha de cima, valores diretamente por baixo, ambos lado a lado
      const boxHeight = 6;
      const caixaX = 12;
      // yDatas: linha das datas (títulos)
      let yDatas = y;
      const spacingX = 5; // distância horizontal entre as datas (reduzido de 80 para 5)
      const textEmissao = "Data Emissão:";
      const textVenc = "Data Vencimento:";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9); // Tamanho reduzido para títulos das datas
      const textWidthEmissao = doc.getTextWidth(textEmissao) + 4;
      const textWidthVenc = doc.getTextWidth(textVenc) + 4;
      // Desenhar caixas de fundo cinza para os títulos
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, yDatas, textWidthEmissao, boxHeight, "F");
      doc.rect(caixaX + textWidthEmissao + spacingX, yDatas, textWidthVenc, boxHeight, "F");
      // Títulos lado a lado
      doc.setTextColor(...corPretaFooter);
      doc.text(textEmissao, caixaX + 2, yDatas + 4);
      doc.text(textVenc, caixaX + textWidthEmissao + spacingX + 2, yDatas + 4);
      // Datas lado a lado, diretamente por baixo dos títulos, com espaçamento maior
      doc.setFontSize(9); // Tamanho reduzido para datas
      doc.text(dataAtualFormatada, caixaX + 2, yDatas + boxHeight + 4);
      doc.text(dataVencimentoFormatada, caixaX + textWidthEmissao + spacingX + 2, yDatas + boxHeight + 4);

      // Cliente info na metade direita da página, alinhado horizontalmente com as datas
      let clienteNome, clienteMorada;
      if (!dadosEmpresa) {
        clienteNome = "Cliente";
        clienteMorada = "V/ Morada";
      } else {
        clienteNome = dadosEmpresa.nome || "Cliente";
        clienteMorada = dadosEmpresa.codigoPostal || "V/ Morada";
      }
      const clienteNif = dadosEmpresa?.nif || nif || "NIF do cliente";
      const metadeX = pageWidth / 2;
      const offsetClienteX = metadeX + 15; // aumentou de 2 para 10
      // Ajustar yCliente para alinhar Exmo.(s) Senhor(es) com o topo do QR code
      let yCliente = yDatas + 2; // alinhar topo do QR code com topo do texto
      // Adicionar QR code à esquerda de "Exmo.(s) Senhor(es)"
      const qrSize = 35;
      const qrX = offsetClienteX - qrSize - 3;
      // Alinhar verticalmente o QR code com o topo do texto "Exmo.(s) Senhor(es)"
      const yQRCode = yCliente - 4; // sobe o QR code
      doc.addImage("/orcamento/qr-code.png", "PNG", qrX, yQRCode, qrSize, qrSize);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Exmo.(s) Senhor(es)", offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0); // nome do cliente em preto
      // Se o nome do cliente for maior que 38 caracteres, dividir em duas linhas
      // Nome do cliente: cortar por palavras, nunca cortar palavra ao meio
      const maxLen = 38;
      const words = clienteNome.split(" ");
      let line = "";
      for (let i = 0; i < words.length; i++) {
        const testLine = line ? line + " " + words[i] : words[i];
        if (testLine.length > maxLen) {
          doc.text(line, offsetClienteX, yCliente, { align: "left" });
          yCliente += 5;
          line = words[i];
        } else {
          line = testLine;
        }
      }
      if (line) {
        doc.text(line, offsetClienteX, yCliente, { align: "left" });
        yCliente += 5;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...corPretaFooter); // voltar à cor original para morada e NIF
      // Inserir duas linhas com o local antes do código postal
      // Extrair o local do clienteMorada (depois do espaço). Exemplo: '5110-161 Armamar' -> 'Armamar'
      const local = clienteMorada.split(" ").slice(1).join(" ") || clienteMorada;
      doc.text(local, offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.text(local, offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.text(clienteMorada, offsetClienteX, yCliente, { align: "left" });
      // Removido V/ Contribuinte do bloco do cliente
      // O bloco de datas ocupa até yDatas + boxHeight + 3 (datas) + 7 (espaço extra)
      // O bloco do cliente ocupa até yCliente + 5 (após morada), mas não afeta y para baixo

      // Caixa V/ Documento por baixo das datas
      const yDocumento = yDatas + boxHeight + 10;
      const textoDocumento = "V/ Documento";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const textWidthDocumento = doc.getTextWidth(textoDocumento) + 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, yDocumento, textWidthDocumento, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(textoDocumento, caixaX + 2, yDocumento + 4);

      // Atualizar yDatas para ficar abaixo do V/ Documento
      yDatas = yDocumento + boxHeight + 4;

      // Dados Bancários box logo abaixo do V/ Documento
      const caixaY = yDatas;
      const text = "Dados Bancários";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const textWidth = doc.getTextWidth(text) + 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, caixaY, textWidth, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(text, caixaX + 2, caixaY + 4);
      doc.setFontSize(9);
      doc.text("EuroBic", caixaX + 2, caixaY + 10);
      doc.setFontSize(9);
      doc.text("IBAN:  PT50 0079 0000 4766 1251 1016 4", caixaX + 2, caixaY + 15);
      // Sublinha o IBAN
      const larguraIBAN = doc.getTextWidth("IBAN:  PT50 0079 0000 4766 1251 1016 4");
      doc.line(caixaX + 2, caixaY + 16, caixaX + 2 + larguraIBAN, caixaY + 16);

      // Adicionar Condições de Pagamento e V/ Contribuinte por baixo do IBAN
      const yCondicoes = caixaY + 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...corPretaFooter);

      // Condições de Pagamento sublinhado
      const textoCondicoes = "Condições de Pagamento: Pronto Pagamento";
      doc.text(textoCondicoes, caixaX + 2, yCondicoes);
      const larguraCondicoes = doc.getTextWidth(textoCondicoes);
      doc.line(caixaX + 2, yCondicoes + 1, caixaX + 2 + larguraCondicoes, yCondicoes + 1);

      // V/ Contribuinte sublinhado ao lado
      const textoContribuinte = `V/ Contribuinte: ${clienteNif}`;
      const xContribuinte = caixaX + 2 + larguraCondicoes + 10;
      doc.text(textoContribuinte, xContribuinte, yCondicoes);
      const larguraContribuinte = doc.getTextWidth(textoContribuinte);
      doc.line(xContribuinte, yCondicoes + 1, xContribuinte + larguraContribuinte, yCondicoes + 1);

      // Atualizar y para depois do bloco de condições e contribuinte
      y = yCondicoes + 8;

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
          const descLinha = l.isPortes ? "" : (descontoSelecionado > 0 ? descontoSelecionado : 0);
          const valorDesc = l.isPortes ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0);
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
        // Sobe a tabela para ficar mais próxima do bloco anterior
        startY: y - 5,
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
          (l.isPortes ? 0 :
            (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0)
          ),
        0,
      );
      // Para Portes de envio, não há desconto, mas há IVA
      const totalLiquido = linhas.reduce(
        (acc, l) =>
          acc +
          (l.total - (l.isPortes ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0))),
        0,
      );
      // IVA sobre todos os produtos, incluindo Portes de envio
      const totalIVA = linhas.reduce(
        (acc, l) => {
          const valorDesc = l.isPortes ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0);
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
      const spacingXFooter = 30;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.setFontSize(10);
      doc.text("Incidência", xIncidencia, yIncidencia, { align: "left" });
      doc.text("Taxa", xIncidencia + spacingXFooter, yIncidencia, { align: "left" });
      doc.text("IVA", xIncidencia + 2 * spacingXFooter, yIncidencia, {
        align: "left",
      });

      doc.setFont("helvetica", "normal");
      doc.text(
        formatarNumero(totalLiquido) + "€",
        xIncidencia,
        yIncidencia + spacingY,
        { align: "left" },
      );
      doc.text("23%", xIncidencia + spacingXFooter, yIncidencia + spacingY, {
        align: "left",
      });
      doc.text(
        formatarNumero(totalIVA) + "€",
        xIncidencia + 2 * spacingXFooter,
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

    // Definir título do PDF dinamicamente consoante o NIF encontrado
    const nomeEmpresaPDF =
      dadosEmpresa && dadosEmpresa.nome && dadosEmpresa.nome !== "Cliente"
        ? `Orçamento | ${dadosEmpresa.nome}`
        : "Orçamento";

    doc.setProperties({
      title: nomeEmpresaPDF,
    });
    const nomeFicheiro = `${nomeEmpresaPDF}.pdf`;
    doc.save(nomeFicheiro);
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
                {linha.isPortes ? (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={linha.preco || ""}
                    onChange={(e) => {
                      alterarPrecoPortes(index, e.target.value);
                    }}
                    className="text-center w-full border rounded px-1"
                    placeholder="Preço"
                  />
                ) : (
                  <p className="text-center w-full">{linha.preco?.toFixed(2).replace(".", ",")}€ /un</p>
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
          <div data-desc-dropdown className="relative flex flex-col md:flex-row gap-5">
            <button
              type="button"
              onClick={() => setOpenDesc(!openDesc)}
              className="flex cursor-pointer orca w-20"
            >
              <p>{descontoSelecionado}%</p>
              <IoIosArrowDown />
            </button>
            <div className="flex flex-col">
              <input
                type="text"
                className="flex orca w-40"
                placeholder="NIF"
                maxLength={9}
                value={nif}
                onChange={(e) => {
                  const valor = e.target.value.replace(/[^0-9]/g, "");
                  setNif(valor);
                  if (valor.length === 9) {
                    procurarNif(valor);
                  } else {
                    setDadosEmpresa(null);
                  }
                }}
              />
              {loadingNif && (
                <span className="text-xs mt-1">A procurar dados...</span>
              )}
              {dadosEmpresa && !loadingNif && (
                <div className="text-xs mt-1 bg-white p-2 rounded shadow">
                  <p><strong>{dadosEmpresa.nome}</strong></p>
                  <p>NIF: {dadosEmpresa.nif}</p>
                  <p>{dadosEmpresa.codigoPostal}</p>
                </div>
              )}
            </div>

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
                onClick={() => {
                  if (dadosEmpresa?.nome === "NIF não encontrado") {
                    setPopupMensagem("Não é possível gerar PDF: NIF não encontrado.");
                    return;
                  }
                  gerarPDF();
                }}
                className="bg-(--orange) cursor-pointer text-white px-5 text-[0.8em] py-1 rounded-full"
              >
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Popup do NIF */}
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

export default Page;