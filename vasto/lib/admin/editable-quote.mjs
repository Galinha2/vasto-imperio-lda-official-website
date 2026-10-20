import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const number = (value) => Number(String(value).replace(/[€%\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));

export function validateQuoteLines(lines, subtotal, discount) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 1000 || !Number.isFinite(discount) || discount < 0 || discount > 100) return false;
  if (lines.some((line) => !line.produto || !Number.isFinite(line.preco) || line.preco < 0 || !Number.isFinite(line.unidades) || line.unidades <= 0 || Math.abs(line.total - line.preco * line.unidades) > 0.03)) return false;
  const calculated = lines.reduce((sum, line) => sum + line.total * (line.isPortes ? 1 : 1 - discount / 100), 0);
  return Math.abs(calculated - subtotal) <= Math.max(0.05, lines.length * 0.011);
}

export async function editableQuote(record, buffer) {
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
  try {
    const doc = await task.promise;
    const metadata = await doc.getMetadata();
    let embedded;
    try { const subject = metadata.info?.Subject || ""; if (subject.startsWith("VASTO_SALES_V1:")) embedded = JSON.parse(Buffer.from(subject.slice(15), "base64").toString("utf8")); } catch { /* Fall back to visible table. */ }
    if (embedded?.quoteLines && validateQuoteLines(embedded.quoteLines, record.subtotal, embedded.discountPercent)) return { lines: embedded.quoteLines, discount: embedded.discountPercent };
    if (record.orderDetails?.artigos?.length) {
      const lines = record.orderDetails.artigos.map((item) => ({ ...item, preco: Number(item.preco ?? item.total / item.unidades), total: Number(item.total), unidades: Number(item.unidades), isPortes: !!item.isPortes || String(item.refCompleta).startsWith("0.") }));
      const eligible = lines.filter((line) => !line.isPortes).reduce((sum, line) => sum + line.total, 0);
      const excluded = lines.filter((line) => line.isPortes).reduce((sum, line) => sum + line.total, 0);
      const discount = eligible ? Math.round((1 - (record.subtotal - excluded) / eligible) * 10000) / 100 : 0;
      if (validateQuoteLines(lines, record.subtotal, discount)) return { lines, discount };
    }
    const lines = []; const discounts = new Set();
    const pages = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const content = await (await doc.getPage(pageNumber)).getTextContent();
      pages.push(content.items.filter((item) => item.str?.trim()).map((item) => ({ str: item.str.trim(), x: item.transform[4], y: item.transform[5] })));
    }
    const hasOriginal = pages.some((items) => items.some((item) => /Folha.*Original/i.test(item.str)));
    for (const items of pages) {
      if (hasOriginal && items.some((item) => /Folha.*Duplicado/i.test(item.str))) continue;
      const description = items.find((item) => item.str === "DESCRIÇÃO");
      const quantity = items.find((item) => item.str === "QUANT.");
      const unit = items.find((item) => item.str === "UNI");
      if (!description || !quantity || !unit) continue;
      const units = items.filter((item) => /^(?:[\d., ]+\s+)?un$/i.test(item.str) && Math.abs(item.x - unit.x) < 50 && item.y < unit.y).sort((a, b) => b.y - a.y);
      for (let index = 0; index < units.length; index++) {
        const marker = units[index];
        const row = items.filter((item) => Math.abs(item.y - marker.y) < 2);
        const combinedQuantity = marker.str.match(/^([\d., ]+)\s+un$/i);
        const qty = combinedQuantity ? { str: combinedQuantity[1] } : row.filter((item) => item.x < marker.x && item.x > quantity.x - 30 && /^\d+(?:[,.]\d+)?$/.test(item.str)).sort((a, b) => b.x - a.x)[0];
        const prices = row.filter((item) => item.x > marker.x && /€/.test(item.str)).sort((a, b) => a.x - b.x);
        if (!qty || prices.length < 2) continue;
        const nextY = units[index + 1]?.y ?? marker.y - 50;
        const referenceItem = row.find((item) => item.x < quantity.x - 40 && /^\d+(?:\.\d+)?(?:\s|$)/.test(item.str));
        const descriptionStart = Math.min(description.x, referenceItem?.x ?? description.x);
        const desc = items.filter((item) => item.x >= descriptionStart - 3 && item.x < quantity.x - 6 && item.y <= marker.y + 2 && item.y > nextY + 2).sort((a,b) => b.y - a.y || a.x - b.x);
        const ref = referenceItem?.str.match(/^\d+(?:\.\d+)?/)?.[0] || "";
        const productName = desc.map((item) => item === referenceItem ? item.str.replace(/^\d+(?:\.\d+)?\s*/, "") : item.str).filter(Boolean).join(" ");
        const percentage = row.find((item) => item.x > prices[0].x && item.x < prices[1].x && /%/.test(item.str));
        const discount = percentage ? number(percentage.str) : 0;
        const unidades = number(qty.str), preco = number(prices[0].str);
        const isPortes = ref.startsWith("0.") || /^(Portes|Montagem)/i.test(productName);
        if (!isPortes) discounts.add(discount);
        lines.push({ produto: productName, refCompleta: ref, unidades, preco, total: unidades * preco, isPortes });
      }
    }
    const discount = [...discounts][0] || 0;
    if (discounts.size <= 1 && validateQuoteLines(lines, record.subtotal, discount)) return { lines, discount };
    throw Object.assign(new Error("Não foi possível recuperar todos os artigos deste PDF com segurança. Utilize um PDF exportado pelo orçamento ou simulador Vasto Império."), { status: 422 });
  } finally { await task.destroy(); }
}
