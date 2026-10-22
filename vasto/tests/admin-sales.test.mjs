import { quoteFilename } from "../lib/quote-filenames.mjs";
import test from "node:test";
import { resolveCustomerName } from "../lib/customer-identity.mjs";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signIn, verifySession, sessionCookie, assertOrigin, assertSession, SESSION_COOKIE } from "../lib/admin/auth.mjs";
import { parseSalePdf } from "../lib/admin/pdf.mjs";
import { saveSimulatorOrderToSales } from "../lib/admin/simulator-order-sales.mjs";
import { createSale, createSaleUpload, readSaleUpload, deleteSaleUpload, addSaleImage, getSaleImage, deleteSaleImage, deleteSale, updateSaleWorkflow, groupSaleQuotes, ungroupSaleQuote, getPdf, getSale, listSales, storageMode, getCommissionData, updateCommissionRate, updateMonthlyCommission } from "../lib/admin/store.mjs";

const require = createRequire(import.meta.url);
const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const root = fileURLToPath(new URL("../", import.meta.url));
process.env.ADMIN_USERNAME = "test-admin";
process.env.ADMIN_PASSWORD = "test-password-with-24-characters";
process.env.ADMIN_SESSION_SECRET = "test-session-secret-with-at-least-32-characters";
process.env.ADMIN_DATA_DIR = await mkdtemp(path.join(tmpdir(), "vasto-sales-tests-"));
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.VERCEL;

const metadata = { customerName: "Empresa Açores & Filhos", nif: "123456789", issuedAt: "2026-09-20", subtotal: 180, vat: 41.4, total: 221.4, source: "simulador" };
function pdfWithMetadata(data = metadata) {
  const doc = new jsPDF();
  doc.setProperties({ title: "Orçamento | Empresa Açores & Filhos", subject: "VASTO_SALES_V1:" + Buffer.from(JSON.stringify(data)).toString("base64") });
  return Buffer.from(doc.output("arraybuffer"));
}

test("signed login, tampering, expiry and protected access", () => {
  assert.throws(() => signIn("test-admin", "bad", "wrong"), { status: 401 });
  const token = signIn("test-admin", process.env.ADMIN_PASSWORD, "valid");
  assert.equal(verifySession(token), true);
  assert.equal(verifySession(token + "x"), false);
  assert.equal(verifySession("true"), false);
  assertSession({ cookies: { get: (name) => name === SESSION_COOKIE ? { value: token } : null } });
  assert.throws(() => assertSession({ cookies: { get: () => undefined } }), { status: 401 });
  const realNow = Date.now;
  try { Date.now = () => realNow() + 9 * 60 * 60 * 1000; assert.equal(verifySession(token), false); }
  finally { Date.now = realNow; }
  assertOrigin(new Request("https://site.example/api/admin/sales", { headers: { origin: "https://site.example" } }));
  assert.throws(() => assertOrigin(new Request("https://site.example/api/admin/sales", { headers: { origin: "https://other.example" } })), { status: 403 });
});

test("remembered sessions do not expire and only remembered cookies persist", () => {
  const now = Date.now();
  const realNow = Date.now;
  try {
    Date.now = () => now;
    const regular = signIn("test-admin", process.env.ADMIN_PASSWORD, "regular");
    const remembered = signIn("test-admin", process.env.ADMIN_PASSWORD, "remembered", true);
    assert.equal(Object.hasOwn(sessionCookie(regular), "maxAge"), false);
    assert.ok(sessionCookie(remembered, false, true).maxAge > 0);
    assert.equal(sessionCookie("", true, true).maxAge, 0);
    assert.equal(sessionCookie(remembered, false, true).httpOnly, true);
    Date.now = () => now + 9 * 60 * 60 * 1000;
    assert.equal(verifySession(regular), false);
    assert.equal(verifySession(remembered), true);
    Date.now = () => now + 50 * 365 * 24 * 60 * 60 * 1000;
    assert.equal(verifySession(remembered), true);
    const originalPassword = process.env.ADMIN_PASSWORD;
    try {
      process.env.ADMIN_PASSWORD = "another-password-with-24-characters";
      assert.equal(verifySession(remembered), false);
    } finally { process.env.ADMIN_PASSWORD = originalPassword; }
  } finally { Date.now = realNow; }
});

test("quote project and separation persist without changing financial workflow", async () => {
  const record = { ...metadata, id: "b".repeat(64), fileName: "bancadas-projeto.pdf", status: "em_preparacao" };
  await createSale(record, pdfWithMetadata());
  try {
    await updateSaleWorkflow(record.id, { quoteProject: "  Oficina  ", quoteSeparate: true });
    const stored = await getSale(record.id);
    assert.equal(stored.quoteProject, "Oficina");
    assert.equal(stored.quoteSeparate, true);
    assert.equal(stored.status, "em_preparacao");
    assert.equal(stored.subtotal, metadata.subtotal);
    await assert.rejects(updateSaleWorkflow(record.id, { quoteProject: "x".repeat(101) }), { status: 400 });
    await assert.rejects(updateSaleWorkflow(record.id, { quoteSeparate: "true" }), { status: 400 });
    await updateSaleWorkflow(record.id, { quoteProject: "", quoteSeparate: false });
    assert.equal((await getSale(record.id)).quoteSeparate, false);
  } finally { await deleteSale(record.id); }
});

test("simulator PDF retains equipment and specifications for grouping", async () => {
  const record = await parseSalePdf(pdfWithMetadata({ ...metadata, quoteType: "bancadas", quoteDetails: "Bancadas · Altura: 0,95 m · Níveis: 2" }), "orcamento.pdf");
  assert.equal(record.quoteType, "bancadas");
  assert.equal(record.quoteDetails, "Bancadas · Altura: 0,95 m · Níveis: 2");
});

test("login limits repeated invalid attempts", () => {
  for (let attempt = 0; attempt < 5; attempt++) assert.throws(() => signIn("test-admin", "bad", "limited"), { status: 401 });
  assert.throws(() => signIn("test-admin", process.env.ADMIN_PASSWORD, "limited"), { status: 429 });
});

test("structured PDF reads customer, date, source, net and gross totals", async () => {
  const record = await parseSalePdf(pdfWithMetadata(), "a.pdf");
  for (const key of Object.keys(metadata)) assert.equal(record[key], metadata[key]);
  assert.equal(record.status, "em_preparacao");
});

test("legacy text PDFs read row positions, customer, NIF and grouped monetary values", async () => {
  const doc = new jsPDF();
  doc.setProperties({ title: "Orçamento | Cliente antigo" });
  doc.text("VASTO IMPÉRIO, LDA", 12, 20);
  doc.text("Orçamento", 150, 15);
  doc.text("Data Emissão:", 12, 35); doc.text("20/09/2026", 12, 45);
  doc.text("Exmo.(s) Senhor(es)", 120, 40);
  doc.text("Cliente antigo", 120, 45);
  doc.text("V/ Contribuinte: 123456789", 110, 60);
  for (const [label, value, y] of [["Total Líquido:", "1 234,56€", 230], ["Total IVA:", "283,95€", 240], ["TOTAL:", "1 518,51€", 250]]) {
    doc.text(label, 125, y); doc.text(value, 200, y, { align: "right" });
  }
  const record = await parseSalePdf(Buffer.from(doc.output("arraybuffer")), "antigo.pdf");
  assert.equal(record.customerName, "Cliente antigo"); assert.equal(record.nif, "123456789");
  assert.equal(record.issuedAt, "2026-09-20"); assert.equal(record.subtotal, 1234.56); assert.equal(record.vat, 283.95); assert.equal(record.total, 1518.51);
});

test("actual shared PDF generator round trip, including discount and delivery", async () => {
  const originalLoad = jsPDF.API.loadFile;
  jsPDF.API.loadFile = (file) => readFileSync(path.join(root, "public", file), "binary");
  class LocalImage {
    constructor() { this.nodeType = 1; this.nodeName = "IMG"; }
    set src(file) {
      const buffer = readFileSync(path.join(root, "public", file));
      this.width = buffer.readUInt32BE(16); this.height = buffer.readUInt32BE(20);
      this._src = `data:image/png;base64,${buffer.toString("base64")}`;
      queueMicrotask(() => this.onload?.());
    }
    get src() { return this._src; }
    hasAttribute(name) { return name === "src"; }
    getAttribute() { return this._src; }
  }
  const source = (await readFile(path.join(root, "lib/generateBudgetPdf.js"), "utf8"))
    .replace('import jsPDF from "jspdf";', "")
    .replace('import { quoteFilename } from "./quote-filenames.mjs";', "")
    .replace('import { resolveCustomerName } from "./customer-identity.mjs";', "")
    .replace('const { default: autoTable } = await import("jspdf-autotable");', "")
    .replace("export default async function", "async function");
  let generatedDocument;
  function RecordingPdf(options) { generatedDocument = new jsPDF(options); return generatedDocument; }
  const generate = new Function("jsPDF", "autoTable", "window", "resolveCustomerName", "quoteFilename", `${source}; return generateBudgetPdf;`)(RecordingPdf, autoTable, { Image: LocalImage }, resolveCustomerName, quoteFilename);
  try {
    const blob = await generate({ telefoneCliente: "+351 928348117", quoteNumber: "23123", linhas: [{ produto: "Bastidor", refCompleta: "3.1", preco: 100, unidades: 2, total: 200, isPortes: false }, { produto: "Portes", preco: 20, unidades: 1, total: 20, isPortes: true }], descontoSelecionado: 10, dadosEmpresa: { nome: "João & Companhia", nif: "123456789", codigoPostal: "2475-014 Benedita" }, nif: "123456789", nomeClienteManual: "", additionalDetails: "Configuração técnica que não deve aparecer no PDF", returnBlob: true, source: "simulador" });
    const record = await parseSalePdf(Buffer.from(await blob.arrayBuffer()), "gerador-real.pdf");
    const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");
    const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), useSystemFonts:true });
    try {
      const document = await task.promise;
      const visible = [];
      for (let page=1; page<=document.numPages; page++) visible.push(...(await (await document.getPage(page)).getTextContent()).items.map((item)=>item.str));
      assert.ok(visible.join(" ").includes("Orçamento 23123"));
      assert.ok(visible.join(" ").includes("Contacto: +351 928348117"));
      assert.ok(!visible.join(" ").includes("Configuração técnica"));
    } finally { await task.destroy(); }

    assert.equal(record.quoteNumber, "23123");
    assert.equal(record.customerPhone, "+351 928348117");
    assert.equal(record.customerName, "João & Companhia"); assert.equal(record.source, "simulador");
    assert.equal(record.subtotal, 200); assert.equal(record.vat, 46); assert.equal(record.total, 246);
    generatedDocument.setProperties({ subject: "" });
    const legacy = await parseSalePdf(Buffer.from(generatedDocument.output("arraybuffer")), "gerador-sem-metadados.pdf");
    assert.equal(legacy.customerName, "João & Companhia"); assert.equal(legacy.nif, "123456789");
    assert.equal(legacy.subtotal, 200); assert.equal(legacy.vat, 46); assert.equal(legacy.total, 246);
  } finally { jsPDF.API.loadFile = originalLoad; }
});

test("invalid PDFs, invalid dates and inconsistent amounts are refused", async () => {
  await assert.rejects(parseSalePdf(Buffer.from("not a PDF"), "bad.pdf"), { status: 400 });
  const largePdf = Buffer.concat([pdfWithMetadata(), Buffer.alloc(5 * 1024 * 1024, " ")]);
  assert.equal((await parseSalePdf(largePdf, "large.pdf")).fileName, "large.pdf");
  await assert.rejects(parseSalePdf(Buffer.alloc(6 * 1024 * 1024 + 1), "too-large.pdf"), { message: "O PDF deve ter até 6 MB." });
  await assert.rejects(parseSalePdf(pdfWithMetadata({ ...metadata, total: 10 }), "bad-total.pdf"), { status: 400 });
  await assert.rejects(parseSalePdf(pdfWithMetadata({ ...metadata, issuedAt: "2026-02-30" }), "bad-date.pdf"), { status: 400 });
  const doc = new jsPDF(); doc.text("Other supplier", 12, 20);
  await assert.rejects(parseSalePdf(Buffer.from(doc.output("arraybuffer")), "other.pdf"), { status: 400 });
});

test("records and original PDFs persist, identical content cannot be registered twice", async () => {
  const buffer = pdfWithMetadata();
  const record = await parseSalePdf(buffer, "sales.pdf");
  const created = await createSale(record, buffer);
  assert.equal(created.status, "em_preparacao");
  assert.equal(created.paymentStatus, "por_pagar");
  assert.equal(created.deliveryStatus, "por_entregar");
  assert.equal((await listSales()).length, 1);
  assert.deepEqual((await getPdf(record.id)).buffer, buffer);
  const same = await parseSalePdf(buffer, "renamed.pdf");
  await assert.rejects(createSale(same, buffer), { status: 409 });
  await assert.rejects(updateSaleWorkflow(record.id, { saleDate: "2026-10-01" }), { status: 400 });
  const confirmed = await updateSaleWorkflow(record.id, { status: "confirmada" });
  assert.equal(confirmed.status, "confirmada");
  assert.equal(confirmed.paymentStatus, "por_pagar");
  assert.match(confirmed.saleDate, /^\d{4}-\d{2}-\d{2}$/);
  const dated = await updateSaleWorkflow(record.id, { saleDate: "2026-10-01" });
  assert.equal(dated.saleDate, "2026-10-01");
  await assert.rejects(updateSaleWorkflow(record.id, { saleDate: "2026-02-30" }), { status: 400 });
  const deposit = await updateSaleWorkflow(record.id, { paymentStatus: "entrada_paga" });
  assert.equal(deposit.saleDate, "2026-10-01");
  assert.equal(deposit.status, "confirmada");
  assert.equal(deposit.paymentStatus, "entrada_paga");
  assert.equal(deposit.deliveryStatus, "por_entregar");
  const paid = await updateSaleWorkflow(record.id, { paymentStatus: "pago" });
  assert.equal(paid.paymentStatus, "pago");
  await assert.rejects(updateSaleWorkflow(record.id, { deliveryStatus: "entregue" }), /data válida para concluir a entrega/);
  await assert.rejects(updateSaleWorkflow(record.id, { deliveryStatus: "entregue", deliveryDate: "2026-02-30" }), { status: 400 });
  const resolved = await updateSaleWorkflow(record.id, { deliveryStatus: "entregue", deliveryDate: "2026-11-15" });
  assert.equal(resolved.paymentStatus, "pago");
  assert.equal(resolved.deliveryStatus, "entregue");
  assert.equal(resolved.deliveryDate, "2026-11-15");
  const correctedDelivery = await updateSaleWorkflow(record.id, { deliveryDate: "2026-12-02" });
  assert.equal(correctedDelivery.deliveryDate, "2026-12-02");
  assert.equal((await listSales())[0].status, "confirmada");
  await assert.rejects(updateSaleWorkflow(record.id, { status: "invalid" }), { status: 400 });
  await assert.rejects(updateSaleWorkflow(record.id, { paymentStatus: "invalid" }), { status: 400 });
  await assert.rejects(updateSaleWorkflow(record.id, { deliveryStatus: "invalid" }), { status: 400 });
  await assert.rejects(updateSaleWorkflow(record.id, {}), { status: 400 });
  await assert.rejects(updateSaleWorkflow(record.id, null), { status: 400 });

  const legacy = { ...correctedDelivery, status: "resolvida" };
  delete legacy.paymentStatus;
  delete legacy.deliveryStatus;
  await writeFile(path.join(process.env.ADMIN_DATA_DIR, `${record.id}.json`), JSON.stringify(legacy));
  const migrated = await getSale(record.id);
  assert.equal(migrated.status, "confirmada");
  assert.equal(migrated.paymentStatus, "pago");
  assert.equal(migrated.deliveryStatus, "entregue");
  await assert.rejects(getPdf("../outside"), { status: 400 });

  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const image = await addSaleImage(record.id, "estante.png", "image/png", png);
  assert.deepEqual((await getSaleImage(record.id, image.id)).buffer, png);
  await assert.rejects(addSaleImage(record.id, "imagem.png", "image/png", Buffer.from("not an image")), { status: 400 });
  await assert.rejects(addSaleImage(record.id, "imagem.png", "__proto__", png), { status: 400 });
  await deleteSaleImage(record.id, image.id);
  await assert.rejects(getSaleImage(record.id, image.id), { status: 404 });
  for (let index = 0; index < 10; index++) await addSaleImage(record.id, `anexo-${index}.png`, "image/png", png);
  await assert.rejects(addSaleImage(record.id, "limite.png", "image/png", png), { status: 400 });
  await deleteSale(record.id);
  assert.equal((await listSales()).length, 0);
  await assert.rejects(getSaleImage(record.id, image.id), { status: 404 });
});

test("Vercel never falls back to temporary disk storage", () => {
  process.env.VERCEL = "1";
  try { assert.throws(storageMode, { status: 503 }); }
  finally { delete process.env.VERCEL; }
});

test("commission rate and monthly payment persist in local storage", async () => {
  assert.deepEqual(await getCommissionData(), { commissionRate: 15, payments: {} });
  await updateCommissionRate(12.5);
  await updateMonthlyCommission(2026, 9, true);
  await updateMonthlyCommission(2026, 9, undefined, 7.5);
  const saved = await getCommissionData();
  assert.equal(saved.commissionRate, 12.5);
  assert.equal(saved.payments["2026-09"].paid, true);
  assert.equal(saved.payments["2026-09"].commissionRate, 7.5);
  assert.match(saved.payments["2026-09"].paidAt, /^\d{4}-\d{2}-\d{2}$/);
  await updateMonthlyCommission(2026, 9, false);
  assert.deepEqual((await getCommissionData()).payments["2026-09"], { paid: false, paidAt: null, commissionRate: 7.5 });
  await assert.rejects(updateCommissionRate(101), { status: 400 });
  await assert.rejects(updateMonthlyCommission(2026, 13, true), { status: 400 });
  await assert.rejects(updateMonthlyCommission(2026, 9, undefined, 100.1), { status: 400 });
});

test("commission settings and paid months use the protected Supabase tables", async () => {
  const realFetch = globalThis.fetch;
  let rate;
  const payments = new Map();
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.apikey, "test-server-key");
    assert.ok(options.headers.Authorization.startsWith("Bearer "));
    const parsed = new URL(url);
    if (parsed.pathname === "/rest/v1/admin_commission_settings") {
      if (options.method === "POST") { rate = JSON.parse(options.body); return new Response(null, { status: 204 }); }
      return Response.json(rate ? [{ commission_rate: rate.commission_rate }] : []);
    }
    if (parsed.pathname === "/rest/v1/admin_monthly_commissions") {
      if (options.method === "POST") {
        const row = JSON.parse(options.body);
        const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
        payments.set(key, { ...payments.get(key), ...row });
        return new Response(null, { status: 204 });
      }
      return Response.json([...payments.values()]);
    }
    assert.fail(`Unexpected Supabase endpoint ${parsed.pathname}`);
  };
  try {
    assert.equal((await getCommissionData()).commissionRate, 15);
    await updateCommissionRate(17.5);
    await updateMonthlyCommission(2026, 10, true);
    await updateMonthlyCommission(2026, 10, undefined, 5);
    await updateMonthlyCommission(2026, 10, false);
    const saved = await getCommissionData();
    assert.equal(saved.commissionRate, 17.5);
    assert.equal(saved.payments["2026-10"].paid, false);
    assert.equal(saved.payments["2026-10"].commissionRate, 5);
    assert.equal(saved.payments["2026-10"].paidAt, null);
  } finally {
    globalThis.fetch = realFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});

test("Supabase adapter stores private PDFs, lists records, changes status and reads originals", async () => {
  const realFetch = globalThis.fetch;
  const rows = new Map(); const objects = new Map();
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.apikey, "test-server-key");
    assert.match(options.headers.Authorization, /^Bearer .+/);
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/storage/v1/object/authenticated/sales-pdfs/")) {
      const objectPath = decodeURIComponent(parsed.pathname.split("/storage/v1/object/authenticated/sales-pdfs/")[1]);
      const contentType = objectPath.endsWith(".png") ? "image/png" : "application/pdf";
      return objects.has(objectPath) ? new Response(objects.get(objectPath), { headers: { "Content-Type": contentType } }) : new Response(null, { status: 404 });
    }
    if (parsed.pathname.startsWith("/storage/v1/object/upload/sign/sales-pdfs/")) {
      assert.equal(options.method, "POST");
      const path = parsed.pathname.split("/storage/v1")[1];
      return Response.json({ url: `${path}?token=test-signed-upload-token` });
    }
    if (parsed.pathname === "/storage/v1/object/sales-pdfs" && options.method === "DELETE") {
      const { prefixes } = JSON.parse(options.body);
      for (const prefix of prefixes) objects.delete(prefix);
      return Response.json({ message: "deleted" });
    }
    if (parsed.pathname.startsWith("/storage/v1/object/sales-pdfs/")) {
      assert.equal(options.method, "POST");
      objects.set(decodeURIComponent(parsed.pathname.split("/storage/v1/object/sales-pdfs/")[1]), options.body);
      return Response.json({ success: true });
    }
    assert.equal(parsed.pathname, "/rest/v1/admin_sales");
    const id = parsed.searchParams.get("id")?.slice(3);
    if (options.method === "POST") {
      const row = JSON.parse(options.body); rows.set(row.id, row); return new Response(null, { status: 201 });
    }
    if (options.method === "PATCH") {
      rows.set(id, { ...rows.get(id), ...JSON.parse(options.body) }); return new Response(null, { status: 204 });
    }
    if (options.method === "DELETE") { rows.delete(id); return new Response(null, { status: 204 }); }
    return Response.json(id ? (rows.has(id) ? [rows.get(id)] : []) : [...rows.values()]);
  };
  try {
    assert.equal(storageMode(), "cloud");
    const pending = await createSaleUpload();
    assert.match(pending.signedUrl, /token=test-signed-upload-token$/);
    const pendingPdf = pdfWithMetadata();
    objects.set(pending.path, pendingPdf);
    assert.deepEqual(await readSaleUpload(pending.path), pendingPdf);
    await deleteSaleUpload(pending.path);
    assert.equal(objects.has(pending.path), false);
    await assert.rejects(readSaleUpload("admin_sales/secret.pdf"), { status: 400 });
    const buffer = pdfWithMetadata(); const record = await parseSalePdf(buffer, "supabase.pdf");
    await createSale(record, buffer);
    assert.equal((await listSales()).length, 1);
    const updated = await updateSaleWorkflow(record.id, { paymentStatus: "entrada_paga" });
    assert.equal(updated.status, "em_preparacao");
    assert.equal(updated.paymentStatus, "entrada_paga");
    assert.equal((await updateSaleWorkflow(record.id, { status: "confirmada" })).paymentStatus, "entrada_paga");
    assert.deepEqual((await getPdf(record.id)).buffer, buffer);
    await assert.rejects(createSale(record, buffer), { status: 409 });
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const image = await addSaleImage(record.id, "rack.png", "image/png", png);
    assert.deepEqual((await getSaleImage(record.id, image.id)).buffer, png);
    await deleteSale(record.id);
    assert.equal((await listSales()).length, 0);
    assert.equal(objects.size, 0);
  } finally { globalThis.fetch = realFetch; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; }
});

test("Supabase failures report actionable setup guidance without logging credentials", async () => {
  const realFetch = globalThis.fetch;
  const realError = console.error;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const logs = [];
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "private-test-service-role-key";
  globalThis.fetch = async () => Response.json({ code: "PGRST205", message: "table missing" }, { status: 404 });
  console.error = (...args) => logs.push(args);
  try {
    await assert.rejects(listSales(), /execute supabase\/admin-sales\.sql/);
    assert.match(JSON.stringify(logs), /PGRST205/);
    assert.doesNotMatch(JSON.stringify(logs), /private-test-service-role-key/);
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});

test("public simulator orders are saved as confirmed sales with their image and order details", async () => {
  const pdf = pdfWithMetadata({ ...metadata, customerName: "Encomenda pública", issuedAt: "2026-10-13" });
  const image = Buffer.from([0xff, 0xd8, 0xff]);
  const orderDetails = { email: "cliente@example.com", artigos: [{ produto: "Rack", unidades: 1, total: 180 }] };
  assert.equal(await saveSimulatorOrderToSales({
    pdfBuffer: pdf,
    imageBuffer: image,
    imageName: "desenho-estante.jpg",
    imageContentType: "image/jpeg",
    orderDetails,
  }), true);

  const parsed = await parseSalePdf(pdf, "encomenda-simulador.pdf");
  const sale = await getSale(parsed.id);
  assert.equal(sale.status, "confirmada");
  assert.equal(sale.saleDate, "2026-10-13");
  assert.deepEqual(sale.orderDetails, orderDetails);
  assert.equal(sale.entryOrigin, "cliente");
  assert.equal(sale.images.length, 1);
  assert.deepEqual((await getSaleImage(sale.id, sale.images[0].id)).buffer, image);
  await deleteSale(sale.id);
});

test("public simulator order sales sync fails open when Supabase is unavailable", async () => {
  const originalVercel = process.env.VERCEL;
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalError = console.error;
  process.env.VERCEL = "1";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.error = () => {};
  try {
    assert.equal(await saveSimulatorOrderToSales({
      pdfBuffer: pdfWithMetadata(),
      imageBuffer: Buffer.from([0xff, 0xd8, 0xff]),
      imageName: "desenho-estante.jpg",
      imageContentType: "image/jpeg",
      orderDetails: {},
    }), false);
  } finally {
    console.error = originalError;
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
});


test("manual grouping persists, merges groups, rejects other customers and supports separating", async () => {
  const ids = ["a", "c", "d", "e"].map((letter) => letter.repeat(64));
  for (const [index, id] of ids.entries()) await createSale({ ...metadata, id, customerName: index === 3 ? "Outro cliente" : metadata.customerName, nif: index === 3 ? "987654321" : metadata.nif, status: "em_preparacao", fileName: "teste.pdf" }, pdfWithMetadata());
  try {
    await groupSaleQuotes(ids[0], ids[1]);
    const groupId = (await getSale(ids[0])).quoteGroupId;
    assert.ok(groupId);
    assert.equal((await getSale(ids[1])).quoteGroupId, groupId);
    await groupSaleQuotes(ids[2], ids[0]);
    assert.equal((await getSale(ids[2])).quoteGroupId, groupId);
    await assert.rejects(groupSaleQuotes(ids[3], ids[0]), { status: 400 });
    assert.equal((await getSale(ids[3])).quoteGroupId, undefined);
    await ungroupSaleQuote(ids[1]);
    assert.equal((await getSale(ids[1])).quoteGroupId, null);
    assert.equal((await getSale(ids[0])).subtotal, metadata.subtotal);
  } finally { for (const id of ids) await deleteSale(id); }
});


test("confirming one grouped version marks alternatives unselected and allows changing the choice", async () => {
  const ids = ["6", "7", "8"].map((letter) => letter.repeat(64));
  for (const id of ids) await createSale({ ...metadata, id, status: "em_preparacao", fileName: "variante.pdf" }, pdfWithMetadata());
  try {
    await groupSaleQuotes(ids[0], ids[1]);
    await groupSaleQuotes(ids[2], ids[1]);
    await updateSaleWorkflow(ids[1], { status: "confirmada" });
    assert.equal((await getSale(ids[1])).status, "confirmada");
    for (const id of [ids[0], ids[2]]) {
      const sale = await getSale(id);
      assert.equal(sale.quoteNotSelected, true);
      assert.equal(sale.status, "em_preparacao");
    }
    await updateSaleWorkflow(ids[0], { status: "confirmada" });
    assert.equal((await getSale(ids[0])).quoteNotSelected, false);
    assert.equal((await getSale(ids[1])).quoteNotSelected, true);
    await updateSaleWorkflow(ids[0], { paymentStatus: "entrada_paga" });
    await assert.rejects(updateSaleWorkflow(ids[2], { status: "confirmada" }), { status: 400 });
    assert.equal((await getSale(ids[0])).status, "confirmada");
    assert.equal((await getSale(ids[2])).quoteNotSelected, true);
  } finally { for (const id of ids) await deleteSale(id); }
});

test("editing keeps the sale identity, workflow and images while updating totals and rejecting stale saves", async () => {
  const { reviseSaleQuote } = await import("../lib/admin/store.mjs");
  const { editableQuote } = await import("../lib/admin/editable-quote.mjs");
  const lines = [{ produto: "Viga", refCompleta: "3.1", unidades: 2, preco: 100, total: 200, isPortes: false }];
  const pdf = pdfWithMetadata({ ...metadata, customerName: "Editar teste", quoteLines: lines, discountPercent: 10 });
  const parsed = await parseSalePdf(pdf, "editar.pdf");
  await createSale({ ...parsed, entryOrigin: "admin" }, pdf);
  const before = await getSale(parsed.id);
  assert.deepEqual(await editableQuote(before, pdf), { lines, discount: 10 });
  const changed = [{ ...lines[0], unidades: 3, total: 300 }];
  const revisedPdf = pdfWithMetadata({ ...metadata, customerName: "Editar teste", subtotal: 270, vat: 62.1, total: 332.1, quoteLines: changed, discountPercent: 10 });
  const after = await reviseSaleQuote(before.id, revisedPdf, before.updatedAt, changed, 10, "cliente@example.com", "+351 928348117");
  assert.equal((await getSale(before.id)).orderDetails.email, "cliente@example.com");
  assert.equal((await getSale(before.id)).orderDetails.telefone, "+351 928348117");
  assert.equal(after.id, before.id);
  assert.equal(after.status, before.status);
  assert.equal(after.entryOrigin, "admin");
  assert.equal(after.subtotal, 270);
  assert.equal(after.quoteRevision, 1);
  assert.deepEqual((await getPdf(after.id)).buffer, revisedPdf);
  assert.deepEqual(await readFile(path.join(process.env.ADMIN_DATA_DIR, `${after.previousQuoteRevision}.pdf`)), pdf);
  await assert.rejects(reviseSaleQuote(before.id, revisedPdf, "stale", changed, 10), { status: 409 });
  await deleteSale(before.id);
});

test("legacy visible quote tables recover quantities, prices and discounts", async () => {
  const { editableQuote } = await import("../lib/admin/editable-quote.mjs");
  const doc = new jsPDF();
  const columns = [22,67,15,13,25,13,22,15];
  autoTable(doc, { startY: 60, head: [["REF","DESCRIÇÃO","QUANT.","UNI","P. VENDA S/IVA","DESC","VALOR LIQUIDO","IVA"]], body: [["3.1","Viga Z60 1000mm","2","un","100,00€","10%","180,00€","23%"]], styles: { fontSize:9, cellPadding:0.5, halign:"right" }, headStyles: { halign:"center" }, columnStyles:Object.fromEntries(columns.map((width,index)=>[index,{cellWidth:width,...(index===1?{halign:"left"}:{})}])) });
  const quote = await editableQuote({ subtotal:180 }, Buffer.from(doc.output("arraybuffer")));
  assert.equal(quote.lines.length,1);
  assert.equal(quote.lines[0].preco,100);
  assert.equal(quote.lines[0].unidades,2);
  assert.equal(quote.discount,10);
});

test("legacy original and duplicate pages with merged quantity/unit text are counted once", async () => {
  const { editableQuote } = await import("../lib/admin/editable-quote.mjs");
  const doc = new jsPDF();
  for (const label of ["Original", "Duplicado"]) {
    if (label === "Duplicado") doc.addPage();
    doc.text(`Folha Nº 1 de 1 ${label}`, 130, 20);
    autoTable(doc, {
      startY: 60,
      head: [["REF","DESCRIÇÃO","QUANT.","UNI","P. VENDA S/IVA","DESC","VALOR LIQUIDO","IVA"]],
      body: [["3.1","Viga Z60 c/ 2000mm suporta 400Kg par de Vigas","24","un","14,64€","10%","316,22€","23%"], ["0.1","Portes de envio","1","un","20,00€","","20,00€","23%"]],
      styles: { fontSize: 9, cellPadding: 0.5, halign: "right", valign: "middle", overflow: "hidden" },
      headStyles: { halign: "center", cellPadding: 2 },
      columnStyles: { 0: { halign: "left" }, 1: { halign: "left" }, 2: { halign: "right" }, 3: { halign: "left" }, 4: { halign: "right" }, 5: { halign: "center" }, 6: { halign: "right" }, 7: { halign: "right" } },
      margin: { left: 12, right: 8 }, tableWidth: "auto",
    });
  }
  const quote = await editableQuote({ subtotal: 336.22 }, Buffer.from(doc.output("arraybuffer")));
  assert.equal(quote.lines.length, 2);
  assert.equal(quote.lines[0].unidades, 24);
  assert.equal(quote.lines[0].produto, "Viga Z60 c/ 2000mm suporta 400Kg par de Vigas");
  assert.equal(quote.lines[1].isPortes, true);
  assert.equal(quote.discount, 10);
  await assert.rejects(editableQuote({ subtotal: 999 }, Buffer.from(doc.output("arraybuffer"))), { status: 422 });
});

test("joining estimates preserves discounted totals and originals, and undo restores each document", async () => {
  const { mergeSaleQuotes, separateMergedSale } = await import("../lib/admin/store.mjs");
  const { assertMergeable, combinedQuoteLines } = await import("../lib/admin/merge-quotes.mjs");
  const { editableQuote } = await import("../lib/admin/editable-quote.mjs");
  const sourceLines=[{produto:"Picking",refCompleta:"3.1",preco:100,unidades:2,total:200,isPortes:false}];
  const targetLines=[{produto:"Rack",refCompleta:"2.1",preco:300,unidades:1,total:300,isPortes:false}];
  const sourcePdf=pdfWithMetadata({...metadata,customerName:"Junção Teste",quoteLines:sourceLines,discountPercent:10});
  const targetPdf=pdfWithMetadata({...metadata,customerName:"Junção Teste",subtotal:240,vat:55.2,total:295.2,quoteLines:targetLines,discountPercent:20});
  const source=await createSale(await parseSalePdf(sourcePdf,"source.pdf"),sourcePdf);
  const target=await createSale(await parseSalePdf(targetPdf,"target.pdf"),targetPdf);
  const lines=combinedQuoteLines([{lines:targetLines,discount:20},{lines:sourceLines,discount:10}]);
  assert.equal(lines.reduce((sum,line)=>sum+line.total,0),420);
  const combinedPdf=pdfWithMetadata({...metadata,customerName:"Junção Teste",subtotal:420,vat:96.6,total:516.6,quoteLines:lines,discountPercent:0});
  const image=Buffer.from([255,216,255]);
  const sales=await mergeSaleQuotes(source.id,target.id,{source:source.updatedAt,target:target.updatedAt},combinedPdf,image);
  const merged=sales.find((sale)=>sale.mergedQuoteIds?.includes(source.id));
  assert.ok(merged);
  assert.ok(!sales.some((sale)=>[source.id,target.id].includes(sale.id)));
  assert.equal(merged.subtotal,420);
  assert.equal(merged.images.length,1);
  assert.deepEqual((await getPdf(source.id)).buffer,sourcePdf);
  assert.equal((await editableQuote(merged,combinedPdf)).lines.length,2);
  await assert.rejects(deleteSale(merged.id),{status:400});
  const restored=await separateMergedSale(merged.id);
  assert.ok(restored.some((sale)=>sale.id===source.id));
  assert.ok(restored.some((sale)=>sale.id===target.id));
  assert.ok(!restored.some((sale)=>sale.id===merged.id));
  assert.equal((await getSale(source.id)).subtotal,180);
  assert.throws(()=>assertMergeable({...source,customerName:"Outro",nif:"987654321"},target),{status:400});
  assert.throws(()=>assertMergeable({...source,paymentStatus:"pago"},target),{status:400});
  for(const id of [source.id,target.id,merged.id])await deleteSale(id);
});

test("cloud quote edits keep metadata in JSONB and upload only PDFs to the restricted bucket", async () => {
  const { reviseSaleQuote } = await import("../lib/admin/store.mjs");
  const originalFetch=globalThis.fetch;
  const originalUrl=process.env.SUPABASE_URL, originalKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalPdf=pdfWithMetadata();
  const original=await parseSalePdf(originalPdf,"original.pdf");
  let record=original;
  const objects=new Map([[`${record.id}.pdf`,originalPdf]]);
  process.env.SUPABASE_URL="https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY="test-key";
  globalThis.fetch=async(url,options)=>{
    const parsed=new URL(url);
    if(parsed.pathname==="/rest/v1/admin_sales") {
      if(options.method==="PATCH") { record=JSON.parse(options.body).record; return new Response(null,{status:204}); }
      return Response.json([{record}]);
    }
    const download="/storage/v1/object/authenticated/sales-pdfs/";
    if(parsed.pathname.startsWith(download))return new Response(objects.get(parsed.pathname.slice(download.length)));
    const upload="/storage/v1/object/sales-pdfs/";
    assert.ok(parsed.pathname.startsWith(upload));
    assert.equal(options.headers["Content-Type"],"application/pdf","JSON is not allowed in sales-pdfs");
    assert.ok(parsed.pathname.endsWith(".pdf"));
    objects.set(parsed.pathname.slice(upload.length),options.body);
    return Response.json({success:true});
  };
  try {
    const lines=[{produto:"Viga",preco:100,unidades:3,total:300,isPortes:false}];
    const revisedPdf=pdfWithMetadata({...metadata,subtotal:270,vat:62.1,total:332.1});
    const updated=await reviseSaleQuote(record.id,revisedPdf,record.updatedAt,lines,10);
    assert.equal(updated.subtotal,270);
    assert.equal(updated.quoteRevisions.length,1);
    assert.equal(updated.quoteRevisions[0].record.subtotal,180);
    assert.deepEqual(objects.get(`${updated.previousQuoteRevision}.pdf`),originalPdf);
    assert.deepEqual(objects.get(`${updated.id}.pdf`),revisedPdf);
    const nextPdf=pdfWithMetadata({...metadata,subtotal:300,vat:69,total:369});
    const again=await reviseSaleQuote(record.id,nextPdf,updated.updatedAt,lines,0);
    assert.equal(again.quoteRevisions.length,2);
    assert.equal(again.quoteRevisions[1].record.quoteRevisions,undefined,"History snapshots must not recursively duplicate history");
  } finally {
    globalThis.fetch=originalFetch;
    if(originalUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=originalUrl;
    if(originalKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=originalKey;
  }
});

test('successful email tracking persists without changing quote amounts or workflow', async () => {
  const { markSaleEmailSent } = await import('../lib/admin/store.mjs');
  const buffer = pdfWithMetadata({ ...metadata, customerName: 'Cliente envio rastreado' });
  const sale = await createSale(await parseSalePdf(buffer, 'envio.pdf'), buffer);
  const updated = await markSaleEmailSent(sale.id, 'cliente@example.com');
  assert.ok(Number.isFinite(Date.parse(updated.emailSentAt)));
  assert.equal((await getSale(sale.id)).emailSentTo, 'cliente@example.com');
  assert.equal(updated.subtotal, sale.subtotal);
  assert.equal(updated.status, sale.status);
  assert.equal(updated.updatedAt, sale.updatedAt);
});
