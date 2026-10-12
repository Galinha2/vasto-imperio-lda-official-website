import jsPDF from "jspdf";

function formatarNumero(valor) {
  const [inteira, decimal] = Number(valor || 0).toFixed(2).split(".");
  return `${inteira.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimal}`;
}

export default async function generateBudgetPdf({ linhas, descontoSelecionado, dadosEmpresa, nif, nomeClienteManual, additionalDetails = "", returnBlob = false }) {
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ compress: true });
    const corPretaFooter = [0, 0, 0];
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
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(...corPretaFooter);
      doc.text("VASTO IMPÉRIO, LDA", 12, y);
      y += 6;

      const now = new Date();
      const pad2 = (n) => n.toString().padStart(2, "0");
      const dataAtualFormatada = `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
      // Data de Vencimento com o mesmo dia da emissão
      const dataVencimentoFormatada = dataAtualFormatada;
      
      const boxHeight = 6;
      const caixaX = 12;
      let yDatas = y;
      const spacingX = 5;
      const textEmissao = "Data Emissão:";
      const textVenc = "Data Vencimento:";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const textWidthEmissao = doc.getTextWidth(textEmissao) + 4;
      const textWidthVenc = doc.getTextWidth(textVenc) + 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, yDatas, textWidthEmissao, boxHeight, "F");
      doc.rect(caixaX + textWidthEmissao + spacingX, yDatas, textWidthVenc, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(textEmissao, caixaX + 2, yDatas + 4);
      doc.text(textVenc, caixaX + textWidthEmissao + spacingX + 2, yDatas + 4);
      doc.setFontSize(9);
      doc.text(dataAtualFormatada, caixaX + 2, yDatas + boxHeight + 4);
      doc.text(dataVencimentoFormatada, caixaX + textWidthEmissao + spacingX + 2, yDatas + boxHeight + 4);

      let clienteNome, clienteMorada, clienteNif;

      if (dadosEmpresa) {
        clienteNome = dadosEmpresa.nome || "Cliente";
        clienteMorada = dadosEmpresa.codigoPostal || "V/ Morada";
        clienteNif = dadosEmpresa.nif || nif;
      } else if (nomeClienteManual.trim() !== "") {
        clienteNome = nomeClienteManual;
        clienteMorada = "V/ Morada";
        clienteNif = nif || "NIF do cliente";
      } else {
        clienteNome = "Cliente";
        clienteMorada = "V/ Morada";
        clienteNif = nif || "NIF do cliente";
      }

      const metadeX = pageWidth / 2;
      const offsetClienteX = metadeX + 15;
      let yCliente = yDatas + 2;
      const qrSize = 35;
      const qrX = offsetClienteX - qrSize - 3;
      const yQRCode = yCliente - 4;
      doc.addImage("/orcamento/qr-code.png", "PNG", qrX, yQRCode, qrSize, qrSize);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...corPretaFooter);
      doc.text("Exmo.(s) Senhor(es)", offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

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
      doc.setTextColor(...corPretaFooter);
      
      const local = clienteMorada.split(" ").slice(1).join(" ") || clienteMorada;
      doc.text(local, offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.text(local, offsetClienteX, yCliente, { align: "left" });
      yCliente += 5;
      doc.text(clienteMorada, offsetClienteX, yCliente, { align: "left" });

      const yDocumento = yDatas + boxHeight + 10;
      const textoDocumento = "V/ Documento";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const textWidthDocumento = doc.getTextWidth(textoDocumento) + 4;
      doc.setFillColor(200, 200, 200);
      doc.rect(caixaX, yDocumento, textWidthDocumento, boxHeight, "F");
      doc.setTextColor(...corPretaFooter);
      doc.text(textoDocumento, caixaX + 2, yDocumento + 4);

      yDatas = yDocumento + boxHeight + 4;

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
      doc.text("IBAN:  PT50 0170 3378 0304 0019 8612 2", caixaX + 2, caixaY + 15);
      const larguraIBAN = doc.getTextWidth("IBAN:  PT50 0170 3378 0304 0019 8612 2");
      doc.line(caixaX + 2, caixaY + 16, caixaX + 2 + larguraIBAN, caixaY + 16);

      const yCondicoes = caixaY + 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...corPretaFooter);

      const textoCondicoes = "Condições de Pagamento: Pronto Pagamento";
      doc.text(textoCondicoes, caixaX + 2, yCondicoes);
      const larguraCondicoes = doc.getTextWidth(textoCondicoes);
      doc.line(caixaX + 2, yCondicoes + 1, caixaX + 2 + larguraCondicoes, yCondicoes + 1);

      const textoContribuinte = `V/ Contribuinte: ${clienteNif}`;
      const xContribuinte = caixaX + 2 + larguraCondicoes + 10;
      doc.text(textoContribuinte, xContribuinte, yCondicoes);
      const larguraContribuinte = doc.getTextWidth(textoContribuinte);
      doc.line(xContribuinte, yCondicoes + 1, xContribuinte + larguraContribuinte, yCondicoes + 1);

      y = yCondicoes + 8;
      if (additionalDetails) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...corPretaFooter);
        const detalheLinhas = doc.splitTextToSize(additionalDetails, pageWidth - 24);
        doc.text(detalheLinhas, 12, y);
        y += detalheLinhas.length * 4 + 3;
      }

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

      const linhasProdutos = linhas
        .filter((l) => l.produto)
        .map((l) => {
          const unidade = "un";
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
      const totalLiquido = linhas.reduce(
        (acc, l) =>
          acc +
          (l.total - (l.isPortes ? 0 : (descontoSelecionado > 0 ? (l.total * descontoSelecionado) / 100 : 0))),
        0,
      );
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
        "Email: geral@vastoimperio.pt | Telefone: +351 966 518 436 (Chamada para a rede móvel nacional)",
        12,
        yFooter,
      );
      yFooter += 4;
      doc.text(
        "Email: geral@vastoimperio.pt | Telefone: +351 928 348 117 (Chamada para a rede móvel nacional)",
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

    // Apenas gera uma única folha (Original)
    desenharPagina("Original", logoPreload);

    let nomeFinalPDF = "Orçamento";
    if (dadosEmpresa && dadosEmpresa.nome && dadosEmpresa.nome !== "Cliente") {
      nomeFinalPDF = `Orçamento | ${dadosEmpresa.nome}`;
    } else if (nomeClienteManual.trim() !== "") {
      nomeFinalPDF = `Orçamento | ${nomeClienteManual}`;
    }

    doc.setProperties({
      title: nomeFinalPDF,
    });
    if (returnBlob) return doc.output("blob");
    const nomeFicheiro = `${nomeFinalPDF}.pdf`;
    doc.save(nomeFicheiro);
}

