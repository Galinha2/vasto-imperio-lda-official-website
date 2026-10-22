import { customerPhone } from "./customer-phone.mjs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const bad = (message) => Object.assign(new Error(message), { status: 400 });
const money = (text) => {
  const value = String(text).replace(/[\s€]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  return /^\d+(?:\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) / 100 : NaN;
};
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const validDate = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date || "") && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;

function validate(data) {
  try {
    if (!validDate(data.issuedAt) || !data.customerName?.trim() || data.customerName.length > 300) throw new Error();
    if (![data.subtotal, data.vat, data.total].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1e10)) throw new Error();
    if (Math.abs(round(data.subtotal + data.vat) - data.total) > 0.03) throw new Error();
    return {
      ...(data.customerPhone && { customerPhone: customerPhone(data.customerPhone) }),
      ...(/^\d{1,20}$/.test(String(data.quoteNumber || "")) && { quoteNumber: String(data.quoteNumber) }),
      ...(typeof data.quoteCreatedAt === "string" && Number.isFinite(Date.parse(data.quoteCreatedAt)) && { quoteCreatedAt: new Date(data.quoteCreatedAt).toISOString() }),
      ...(typeof data.quoteDetails === "string" && { quoteDetails: data.quoteDetails.slice(0, 4000) }),
      ...(["bancadas", "picking", "ligeiras", "racks"].includes(data.quoteType) && { quoteType: data.quoteType }),
      customerName: data.customerName.trim(), nif: /^\d{9}$/.test(data.nif || "") ? data.nif : "", issuedAt: data.issuedAt, subtotal: round(data.subtotal), vat: round(data.vat), total: round(data.total), source: data.source === "simulador" ? "simulador" : "orcamento" };
  } catch { throw bad("Não foi possível identificar com segurança o cliente, a data e os totais. Exporte novamente o PDF no orçamento ou simulador."); }
}

function fromText(pages, title) {
  const all = pages.flat();
  const text = all.map((item) => item.str).join(" ");
  if (!/VASTO\s+IMP[ÉE]RIO/i.test(text) || !/Or[çc]amento/i.test(text)) throw bad("Escolha um PDF de orçamento gerado pela Vasto Império.");
  const rowAfter = (label) => {
    for (const page of [...pages].reverse()) {
      const item = page.find((part) => part.str.trim() === label);
      if (!item) continue;
      const values = page.filter((part) => part.x > item.x + 20 && Math.abs(part.y - item.y) < 3).sort((a, b) => a.x - b.x);
      const number = values.map((part) => money(part.str)).find(Number.isFinite);
      if (Number.isFinite(number)) return number;
    }
    return NaN;
  };
  const first = pages[0];
  const dateLabel = first.find((item) => /Data Emiss[aã]o:/i.test(item.str));
  const dates = first.filter((item) => /^\d{2}\/\d{2}\/\d{4}$/.test(item.str.trim()) && (!dateLabel || (Math.abs(item.x - dateLabel.x) < 50 && item.y < dateLabel.y))).sort((a, b) => b.y - a.y || a.x - b.x);
  const date = dates[0]?.str.trim().split("/");
  const greeting = first.find((item) => /Exmo\.\(s\) Senhor\(es\)/.test(item.str));
  let customerName = title?.includes("|") ? title.split("|").slice(1).join("|").trim() : "";
  if (!customerName && greeting) {
    const below = first.filter((item) => item.x >= greeting.x - 3 && item.y < greeting.y && item.y > greeting.y - 65).sort((a, b) => b.y - a.y);
    const nameLine = below[0];
    if (nameLine) customerName = below.filter((item) => Math.abs(item.height - nameLine.height) < 1 && item.y >= nameLine.y - 50).map((item) => item.str.trim()).join(" ");
  }
  const nif = text.match(/V\/\s*Contribuinte:\s*(\d{9})/i)?.[1] || "";
  return validate({ customerName: customerName || "Cliente", nif, issuedAt: date ? `${date[2]}-${date[1]}-${date[0]}` : "", subtotal: rowAfter("Total Líquido:"), vat: rowAfter("Total IVA:"), total: rowAfter("TOTAL:"), source: /Configura[çc][aã]o|Estantes de carga|Estantes picking|Racks industriais/i.test(text) ? "simulador" : "orcamento" });
}

export async function parseSalePdf(buffer, fileName) {
  if (!buffer.length || buffer.length > MAX_PDF_BYTES) throw bad("O PDF deve ter até 6 MB.");
  if (buffer.subarray(0, 5).toString() !== "%PDF-") throw bad("O ficheiro escolhido não é um PDF válido.");
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true, disableFontFace: true });
  let document;
  try {
    document = await task.promise;
    if (document.numPages > 50) throw bad("Escolha um orçamento com até 50 páginas.");
    const metadata = await document.getMetadata();
    const subject = metadata.info?.Subject || "";
    let data;
    if (subject.startsWith("VASTO_SALES_V1:")) {
      try { data = validate(JSON.parse(Buffer.from(subject.slice(15), "base64").toString("utf8"))); }
      catch { throw bad("Os dados do orçamento estão incompletos. Exporte novamente o documento."); }
    } else {
      const pages = [];
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.filter((item) => item.str?.trim()).map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], height: item.height })));
      }
      data = fromText(pages, metadata.info?.Title);
    }
    const now = new Date().toISOString();
    return { ...data, id: createHash("sha256").update(buffer).digest("hex"), fileName: String(fileName || "orcamento.pdf").replace(/[\r\n]/g, "").slice(0, 180), status: "em_preparacao", uploadedAt: now, updatedAt: now };
  } catch (error) {
    if (error.status) throw error;
    throw bad("Não foi possível ler este PDF. Utilize um documento exportado pelo orçamento ou simulador, sem palavra-passe.");
  } finally { await task.destroy(); }
}
