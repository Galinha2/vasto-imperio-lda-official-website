import { lineDiscount, lineNet } from "./quote-discounts.mjs";
import { quoteFilename } from "./quote-filenames.mjs";
import { resolveCustomerName } from "./customer-identity.mjs";
import { jsPDF } from "jspdf";

function formatarNumero(valor) {
  const [inteira, decimal] = Number(valor || 0).toFixed(2).split(".");
  return `${inteira.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${decimal}`;
}

export default async function generateBudgetPdf({ linhas, descontoSelecionado, dadosEmpresa, nif, nomeClienteManual, additionalDetails = "", returnBlob = false, source = "orcamento", quoteType = "", quoteNumber = "", quoteNumberRef = null, telefoneCliente = "" }) {
    let documentNumber = quoteNumber || quoteNumberRef?.current;
    if (!documentNumber) {
      const reservation = async () => {
        const response = await fetch("/api/quote-number", { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Não foi possível numerar o orçamento.");
        return String(result.quoteNumber);
      };
      if (quoteNumberRef) quoteNumberRef.current = reservation();
      try { documentNumber = await (quoteNumberRef?.current || reservation()); }
      catch (error) { if (quoteNumberRef) quoteNumberRef.current = null; throw error; }
      if (quoteNumberRef) quoteNumberRef.current = documentNumber;
    } else documentNumber = await documentNumber;

    const resolvedCustomerName = resolveCustomerName(dadosEmpresa, nomeClienteManual);
    const issueParts = new Intl.DateTimeFormat("en", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const issuePart = (type) => issueParts.find((part) => part.type === type).value;
    const issuedAt = `${issuePart("year")}-${issuePart("month")}-${issuePart("day")}`;
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ compress: true });
    const corPretaFooter = [0, 0, 0];
    const corOrange = [0, 0, 0];
    const corGray = [255, 255, 255];
    const corBlack = [0, 0, 0];

    function drawTopoDireito(tipoFolha, doc, pageWidth) {
      const x = pageWidth - 12;
      let y = 15;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(documentNumber.length > 10 ? 13 : 17);
      doc.setTextColor(...corPretaFooter);
      doc.text(`Orçamento ${documentNumber}`, x, y, { align: "right" });
      y += 3;
      doc.setDrawColor(...corBlack);
      doc.setLineWidth(0.05);
      doc.line(x - 40, y, x, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...corPretaFooter);
      const tipoUpper = tipoFolha || "";
      doc.text(`${tipoUpper}`, x, y, { align: "right" });
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
      const logoX = 12;
      doc.addImage(logo, "PNG", logoX, 12, logoWidth, logoHeight);

      drawTopoDireito(tipoFolha, doc, pageWidth);

      let y = 12 + maxHeight + 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...corPretaFooter);
      doc.text("VASTO IMPÉRIO, LDA", 12, y);
      y += 6;

      const dataAtualFormatada = `${issuePart("day")}/${issuePart("month")}/${issuePart("year")}`;
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
        clienteNome = resolvedCustomerName;
        clienteMorada = [dadosEmpresa.morada, dadosEmpresa.codigoPostal].filter(Boolean).join("\n");
        clienteNif = dadosEmpresa.nif || nif;
      } else if (nomeClienteManual.trim() !== "") {
        clienteNome = nomeClienteManual;
        clienteMorada = "";
        clienteNif = nif || "—";
      } else {
        clienteNome = "Cliente";
        clienteMorada = "";
        clienteNif = nif || "—";
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

      const nomeLinhas = doc.splitTextToSize(clienteNome, 78);
      doc.text(nomeLinhas, offsetClienteX, yCliente);
      yCliente += nomeLinhas.length * 5 + 1;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      if (clienteMorada) {
        const moradaLinhas = doc.splitTextToSize(clienteMorada, 78);
        doc.text(moradaLinhas, offsetClienteX, yCliente);
        yCliente += moradaLinhas.length * 4 + 2;
      }
      if (telefoneCliente.trim()) {
        const contactoLinhas = doc.splitTextToSize(`Contacto: ${telefoneCliente.trim()}`, 78);
        doc.text(contactoLinhas, offsetClienteX, yCliente);
        yCliente += contactoLinhas.length * 4;
      }

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

      y = Math.max(yCondicoes + 8, yCliente + 8);

      const tableCols = [
        { title: "REF", dataKey: "referencia", width: 22 },
        { title: "DESCRIÇÃO", dataKey: "descricao", width: 67 },
        { title: "QUANT.", dataKey: "quantidade", width: 15 },
        { title: "UNI", dataKey: "uni", width: 13 },
        { title: "P. VENDA S/IVA", dataKey: "pvenda", width: 25 },
        { title: "DESC", dataKey: "desc", width: 13 },
        { title: "VALOR LÍQUIDO", dataKey: "valorliq", width: 22 },
        { title: "IVA", dataKey: "iva", width: 15 },
      ];

      const linhasProdutos = linhas
        .filter((l) => l.produto)
        .map((l) => {
          const unidade = "un";
          const descLinha = l.isPortes ? "" : lineDiscount(l, descontoSelecionado);
          const valorDesc = l.isPortes ? 0 : (l.total * lineDiscount(l, descontoSelecionado) / 100);
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
          fontSize: 8.5,
          cellPadding: 1.5,
          minCellHeight: 1,
          halign: "right",
          valign: "middle",
          textColor: corPretaFooter,
          overflow: "linebreak",
          lineWidth: 0,
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: corPretaFooter,
          fontStyle: "bold",
          fontSize: 7.5,
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
          cellPadding: 1.5,
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
        margin: { left: 12, right: 10, top: 45, bottom: 32 },
        rowPageBreak: "avoid",
        willDrawPage: ({ pageNumber }) => {
          if (pageNumber > 1) drawTopoDireito("Original", doc, pageWidth);
        },
      });

      const totalBruto = linhas.reduce((acc, l) => acc + l.total, 0);
      const totalDescLinha = linhas.reduce(
        (acc, l) =>
          acc +
          (l.isPortes ? 0 :
            (l.total * lineDiscount(l, descontoSelecionado) / 100)
          ),
        0,
      );
      const totalLiquido = linhas.reduce(
        (acc, l) =>
          acc +
          (l.total - (l.isPortes ? 0 : (l.total * lineDiscount(l, descontoSelecionado) / 100))),
        0,
      );
      const totalIVA = linhas.reduce(
        (acc, l) => {
          const valorDesc = l.isPortes ? 0 : (l.total * lineDiscount(l, descontoSelecionado) / 100);
          const valorLiquido = l.total - valorDesc;
          return acc + valorLiquido * 0.23;
        },
        0,
      );
      const totalFinal = totalLiquido + totalIVA;

      const totaisAltura = 6 * 5 + 7 + 7;
      const margemFooter = 8;
      let yTot = pageHeight - 24 - margemFooter - totaisAltura;
      let yAfterTable = doc.lastAutoTable.finalY + 4;
      if (yAfterTable + totaisAltura + 4 > pageHeight - 32) {
        doc.addPage();
        drawTopoDireito("Original", doc, pageWidth);
        yAfterTable = 47;
      }
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
      doc.text("Desconto aplicado:", xTotais, yTot, { align: "left" });
      doc.setTextColor(...corOrange);
      doc.text(linhas.some(l => !l.isPortes && l.discountPercent != null) ? "Por artigo" : `${descontoSelecionado}%`, 200, yTot, { align: "right" });
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
      doc.setTextColor(...corBlack);
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
    await new Promise((resolve, reject) => {
      logoPreload.onload = resolve;
      logoPreload.onerror = () => reject(new Error("Não foi possível carregar o logótipo do orçamento."));
      logoPreload.src = "/logo.png";
    });

    // Apenas gera uma única folha (Original)
    desenharPagina("Original", logoPreload);

    const totalPaginas = doc.getNumberOfPages();
    for (let pagina = 1; pagina <= totalPaginas; pagina++) {
      doc.setPage(pagina);
      const largura = doc.internal.pageSize.getWidth();
      const altura = doc.internal.pageSize.getHeight();
      doc.setDrawColor(160, 160, 160);
      doc.setLineWidth(0.15);
      doc.line(12, altura - 27, largura - 10, altura - 27);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(65, 65, 65);
      doc.text("VASTO IMPÉRIO, LDA | Rua Principal n.º 31, Cabecinha, 2475-014 Benedita", 12, altura - 22);
      doc.text("geral@vastoimperio.pt | +351 928 348 117 (Chamada para a rede móvel nacional)", 12, altura - 17);
      doc.text("vastoimperio.pt", 12, altura - 12);
      doc.text(`Folha Nº ${pagina} de ${totalPaginas}`, largura - 10, altura - 12, { align: "right" });
    }

    let nomeFinalPDF = "Orçamento";
    if (resolvedCustomerName !== "Cliente") {
      nomeFinalPDF = `Orçamento | ${resolvedCustomerName}`;
    } else if (nomeClienteManual.trim() !== "") {
      nomeFinalPDF = `Orçamento | ${nomeClienteManual}`;
    }

    doc.setProperties({
      title: nomeFinalPDF,
      author: "Vasto Império",
      subject: "VASTO_SALES_V1:" + btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({
        customerName: resolvedCustomerName,
        nif: String(dadosEmpresa?.nif || nif || ""),
        issuedAt,
        subtotal: Number(linhas.reduce((sum, line) => sum + lineNet(line, descontoSelecionado), 0).toFixed(2)),
        vat: Number(linhas.reduce((sum, line) => sum + lineNet(line, descontoSelecionado) * 0.23, 0).toFixed(2)),
        total: Number(linhas.reduce((sum, line) => sum + lineNet(line, descontoSelecionado) * 1.23, 0).toFixed(2)),
        source,
        quoteLines: linhas.filter((line) => line.produto).map((line) => ({ produto: String(line.produto), refCompleta: String(line.refCompleta || ""), unidades: Number(line.unidades), preco: Number(line.preco), total: Number(line.total), discountPercent: line.discountPercent == null ? null : Number(line.discountPercent), isPortes: !!line.isPortes })),
        discountPercent: Number(descontoSelecionado || 0),
        quoteType,
        customerPhone: telefoneCliente.trim(),
        quoteNumber: documentNumber,
        quoteCreatedAt: new Date().toISOString(),
        quoteDetails: String(additionalDetails || "").slice(0, 4000),
      })))),
    });
    if (returnBlob) return doc.output("blob");
    const nomeFicheiro = quoteFilename({ quoteType, lines: linhas, customerName: resolvedCustomerName, issuedAt });
    doc.save(nomeFicheiro);
}

