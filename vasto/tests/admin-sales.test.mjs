import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signIn, verifySession, assertOrigin, assertSession, SESSION_COOKIE } from "../lib/admin/auth.mjs";
import { parseSalePdf } from "../lib/admin/pdf.mjs";
import { createSale, createSaleUpload, readSaleUpload, deleteSaleUpload, addSaleImage, getSaleImage, deleteSaleImage, deleteSale, updateSaleWorkflow, getPdf, getSale, listSales, storageMode } from "../lib/admin/store.mjs";

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
    .replace('const { default: autoTable } = await import("jspdf-autotable");', "")
    .replace("export default async function", "async function");
  let generatedDocument;
  function RecordingPdf(options) { generatedDocument = new jsPDF(options); return generatedDocument; }
  const generate = new Function("jsPDF", "autoTable", "window", `${source}; return generateBudgetPdf;`)(RecordingPdf, autoTable, { Image: LocalImage });
  try {
    const blob = await generate({ linhas: [{ produto: "Bastidor", refCompleta: "3.1", preco: 100, unidades: 2, total: 200, isPortes: false }, { produto: "Portes", preco: 20, unidades: 1, total: 20, isPortes: true }], descontoSelecionado: 10, dadosEmpresa: { nome: "João & Companhia", nif: "123456789", codigoPostal: "2475-014 Benedita" }, nif: "123456789", nomeClienteManual: "", returnBlob: true, source: "simulador" });
    const record = await parseSalePdf(Buffer.from(await blob.arrayBuffer()), "gerador-real.pdf");
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

test("Supabase adapter stores private PDFs, lists records, changes status and reads originals", async () => {
  const realFetch = globalThis.fetch;
  const rows = new Map(); const objects = new Map();
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-server-key";
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.apikey, "test-server-key");
    assert.equal(options.headers.Authorization, "Bearer test-server-key");
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
