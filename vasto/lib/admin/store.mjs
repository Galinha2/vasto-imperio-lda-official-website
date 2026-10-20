import { sameQuoteCustomer } from "./quote-groups.mjs";
import { mkdir, readdir, readFile, writeFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const validId = (id) => /^[a-f0-9]{64}$/.test(id);
const validUploadPath = (value) => typeof value === "string" && /^pending\/[0-9a-f-]{36}\.pdf$/.test(value);
const validImageId = (id) => /^[0-9a-f-]{36}$/.test(id);
const maxImageSize = 4 * 1024 * 1024;
const maxImagesPerSale = 10;
const imageTypes = {
  "image/jpeg": { extension: "jpg", matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: "webp", matches: (buffer) => buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
};
const paymentStatuses = ["por_pagar", "entrada_paga", "pago"];
const deliveryStatuses = ["por_entregar", "entregue"];
const fail = (message, status = 500) => Object.assign(new Error(message), { status });
const validDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

function lisbonDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeSale(record) {
  const legacy = {
    entrada_paga: { status: "confirmada", paymentStatus: "entrada_paga", deliveryStatus: "por_entregar" },
    paga_por_entregar: { status: "confirmada", paymentStatus: "pago", deliveryStatus: "por_entregar" },
    entregue: { status: "confirmada", paymentStatus: "por_pagar", deliveryStatus: "entregue" },
    resolvida: { status: "confirmada", paymentStatus: "pago", deliveryStatus: "entregue" },
    vendida: { status: "confirmada", paymentStatus: "por_pagar", deliveryStatus: "por_entregar" },
  }[record.status];
  const status = ["em_preparacao", "confirmada"].includes(record.status) ? record.status : legacy?.status || "em_preparacao";
  return {
    ...record,
    entryOrigin: ["admin", "cliente"].includes(record.entryOrigin) ? record.entryOrigin : record.orderDetails ? "cliente" : "admin",
    status,
    paymentStatus: paymentStatuses.includes(record.paymentStatus) ? record.paymentStatus : legacy?.paymentStatus || "por_pagar",
    deliveryStatus: deliveryStatuses.includes(record.deliveryStatus) ? record.deliveryStatus : legacy?.deliveryStatus || "por_entregar",
  };
}

export function storageMode() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return "cloud";
  if (process.env.VERCEL) throw fail("O armazenamento das vendas ainda não está configurado. Ligue o projeto Supabase nas definições da Vercel.", 503);
  if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw fail("A configuração do armazenamento está incompleta.", 503);
  return "local";
}

const directory = () => path.resolve(process.env.ADMIN_DATA_DIR || path.join(process.cwd(), ".admin-data"));
const bucket = () => process.env.SUPABASE_SALES_BUCKET || "sales-pdfs";
const commissionSettingsFile = () => path.join(directory(), "commission-settings.json");
const commissionPaymentsFile = () => path.join(directory(), "commission-payments.json");
const encodedPath = (value) => value.split("/").map(encodeURIComponent).join("/");
const imagePath = (saleId, image) => `${saleId}.${image.id}.${imageTypes[image.contentType].extension}`;

async function readLocalJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeLocalJson(file, value) {
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await rename(temp, file);
}

async function removeCloudObjects(paths) {
  if (paths.length) {
    await cloud(`/storage/v1/object/${encodeURIComponent(bucket())}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: paths }),
    });
  }
}

async function saveRecord(record) {
  if (storageMode() === "cloud") {
    await cloud(`/rest/v1/admin_sales?id=eq.${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record }),
    });
    return;
  }
  const temp = path.join(directory(), `${record.id}.${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(record), { mode: 0o600 });
  await rename(temp, path.join(directory(), `${record.id}.json`));
}

async function cloud(endpoint, options = {}) {
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}${endpoint}`, {
    ...options, cache: "no-store",
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, ...options.headers },
  });
  if (!response.ok) {
    if (response.status === 409) throw fail("Este PDF já está registado.", 409);
    let backendCode = "unknown";
    try {
      const body = await response.clone().json();
      backendCode = body.code || body.statusCode || body.error || backendCode;
    } catch {
      // Some Supabase failures return a non-JSON response.
    }
    console.error("[admin-sales-storage] Supabase request failed", {
      method: options.method || "GET",
      endpoint: endpoint.split("?")[0],
      httpStatus: response.status,
      backendCode: String(backendCode).slice(0, 80),
    });

    const message = response.status === 401 || response.status === 403
      ? "O Supabase recusou o acesso às vendas. Confirme que SUPABASE_SERVICE_ROLE_KEY contém a chave service_role do mesmo projeto indicado em SUPABASE_URL."
      : response.status === 404
        ? "O recurso das vendas não foi encontrado no Supabase. Confirme o projeto em SUPABASE_URL e execute supabase/admin-sales.sql no respetivo projeto."
        : "Não foi possível guardar ou consultar as vendas no Supabase. Consulte os logs da função na Vercel para identificar a resposta do Supabase.";
    throw fail(message, 503);
  }
  return response;
}

export async function getCommissionData() {
  if (storageMode() === "cloud") {
    const [settingsRows, paymentRows] = await Promise.all([
      cloud("/rest/v1/admin_commission_settings?id=eq.global&select=commission_rate").then((response) => response.json()),
      cloud("/rest/v1/admin_monthly_commissions?select=year,month,paid,paid_at,commission_rate&order=year.desc,month.asc&limit=2000").then((response) => response.json()),
    ]);
    const commissionRate = Number(settingsRows[0]?.commission_rate ?? 15);
    const payments = Object.fromEntries(paymentRows.map((row) => [
      `${row.year}-${String(row.month).padStart(2, "0")}`,
      { paid: row.paid, paidAt: row.paid_at, commissionRate: row.commission_rate == null ? null : Number(row.commission_rate) },
    ]));
    return { commissionRate, payments };
  }
  const settings = await readLocalJson(commissionSettingsFile(), { commissionRate: 15 });
  const payments = await readLocalJson(commissionPaymentsFile(), {});
  return { commissionRate: settings.commissionRate, payments };
}

export async function updateCommissionRate(commissionRate) {
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) throw fail("A comissão deve estar entre 0% e 100%.", 400);
  if (storageMode() === "cloud") {
    await cloud("/rest/v1/admin_commission_settings?on_conflict=id", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: "global", commission_rate: commissionRate, updated_at: new Date().toISOString() }),
    });
    return;
  }
  const settings = await readLocalJson(commissionSettingsFile(), {});
  await writeLocalJson(commissionSettingsFile(), { ...settings, commissionRate });
}

export async function updateMonthlyCommission(year, month, paid, commissionRate) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12
    || (paid !== undefined && typeof paid !== "boolean")
    || (commissionRate !== undefined && (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100))
    || (paid === undefined && commissionRate === undefined)) {
    throw fail("O mês ou o estado de pagamento da comissão é inválido.", 400);
  }
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const monthlyUpdate = {
    ...(paid !== undefined ? { paid, paid_at: paid ? lisbonDate() : null } : {}),
    ...(commissionRate !== undefined ? { commission_rate: commissionRate } : {}),
  };
  if (storageMode() === "cloud") {
    await cloud("/rest/v1/admin_monthly_commissions?on_conflict=year,month", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ year, month, ...monthlyUpdate, updated_at: new Date().toISOString() }),
    });
    return;
  }
  const payments = await readLocalJson(commissionPaymentsFile(), {});
  const current = payments[key] || { paid: false, paidAt: null, commissionRate: null };
  await writeLocalJson(commissionPaymentsFile(), {
    ...payments,
    [key]: {
      ...current,
      ...(paid !== undefined ? { paid, paidAt: paid ? lisbonDate() : null } : {}),
      ...(commissionRate !== undefined ? { commissionRate } : {}),
    },
  });
}

export async function listSales() {
  if (storageMode() === "cloud") {
    const records = [];
    for (let offset = 0; ; offset += 500) {
      const rows = await (await cloud(`/rest/v1/admin_sales?select=record&order=uploaded_at.desc&limit=500&offset=${offset}`)).json();
      records.push(...rows.map((row) => normalizeSale(row.record)));
      if (rows.length < 500) break;
    }
    return records.filter((record) => !record.mergedInto && !record.mergeArchived);
  }
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const files = (await readdir(directory())).filter((file) => /^[a-f0-9]{64}\.json$/.test(file));
  return (await Promise.all(files.map(async (file) => normalizeSale(JSON.parse(await readFile(path.join(directory(), file), "utf8")))))).filter((record) => !record.mergedInto && !record.mergeArchived);
}

export async function getSale(id) {
  if (!validId(id)) throw fail("Registo inválido.", 400);
  if (storageMode() === "cloud") {
    const rows = await (await cloud(`/rest/v1/admin_sales?id=eq.${id}&select=record`)).json();
    return rows[0]?.record ? normalizeSale(rows[0].record) : null;
  }
  try { return normalizeSale(JSON.parse(await readFile(path.join(directory(), `${id}.json`), "utf8"))); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function createSaleUpload() {
  if (storageMode() !== "cloud") throw fail("O envio direto requer o armazenamento Supabase.", 503);
  const uploadPath = `pending/${randomUUID()}.pdf`;
  const result = await (await cloud(`/storage/v1/object/upload/sign/${encodeURIComponent(bucket())}/${encodedPath(uploadPath)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  })).json();
  const base = process.env.SUPABASE_URL.replace(/\/$/, "");
  let returnedToken;
  if (typeof result.url === "string") {
    try { returnedToken = new URL(result.url, `${base}/storage/v1/`).searchParams.get("token"); }
    catch { /* Invalid signed URLs are rejected below. */ }
  }
  const token = result.token || returnedToken;
  if (typeof token !== "string" || !token) throw fail("Não foi possível preparar o envio do PDF.", 503);
  const signedUrl = `${base}/storage/v1/object/upload/sign/${encodeURIComponent(bucket())}/${encodedPath(uploadPath)}?token=${encodeURIComponent(token)}`;
  return { path: uploadPath, signedUrl };
}

export async function readSaleUpload(uploadPath) {
  if (storageMode() !== "cloud" || !validUploadPath(uploadPath)) throw fail("Envio inválido.", 400);
  return Buffer.from(await (await cloud(`/storage/v1/object/authenticated/${encodeURIComponent(bucket())}/${encodedPath(uploadPath)}`)).arrayBuffer());
}

export async function deleteSaleUpload(uploadPath) {
  if (storageMode() !== "cloud" || !validUploadPath(uploadPath)) throw fail("Envio inválido.", 400);
  await removeCloudObjects([uploadPath]);
}

export async function createSale(record, pdf) {
  if (await getSale(record.id)) throw fail("Este PDF já está registado.", 409);
  record = { ...normalizeSale(record), images: [] };
  if (storageMode() === "cloud") {
    // O identificador é o hash do conteúdo: repetir este upload só repõe os mesmos bytes.
    await cloud(`/storage/v1/object/${bucket()}/${record.id}.pdf`, { method: "POST", headers: { "Content-Type": "application/pdf", "x-upsert": "true" }, body: pdf });
    await cloud("/rest/v1/admin_sales", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ id: record.id, record, uploaded_at: record.uploadedAt }) });
  } else {
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    try { await writeFile(path.join(directory(), `${record.id}.pdf`), pdf, { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code !== "EEXIST") throw error; }
    try { await writeFile(path.join(directory(), `${record.id}.json`), JSON.stringify(record), { flag: "wx", mode: 0o600 }); }
    catch (error) { if (error.code === "EEXIST") throw fail("Este PDF já está registado.", 409); throw error; }
  }
  return record;
}

export async function addSaleImage(id, fileName, contentType, buffer) {
  if (!validId(id)) throw fail("Orçamento inválido.", 400);
  const type = Object.hasOwn(imageTypes, contentType) ? imageTypes[contentType] : null;
  if (!type || !Buffer.isBuffer(buffer) || !buffer.length || buffer.length > maxImageSize || !type.matches(buffer)) {
    throw fail("Escolha uma imagem JPG, PNG ou WebP válida com até 4 MB.", 400);
  }
  const record = await getSale(id);
  if (!record) throw fail("Orçamento não encontrado.", 404);
  const images = Array.isArray(record.images) ? record.images : [];
  if (images.length >= maxImagesPerSale) throw fail(`Cada orçamento pode ter até ${maxImagesPerSale} imagens.`, 400);

  const image = {
    id: randomUUID(),
    name: path.basename(fileName || "imagem").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) || "imagem",
    contentType,
    uploadedAt: new Date().toISOString(),
  };
  const objectPath = imagePath(id, image);
  if (storageMode() === "cloud") {
    await cloud(`/storage/v1/object/${encodeURIComponent(bucket())}/${encodedPath(objectPath)}`, {
      method: "POST",
      headers: { "Content-Type": contentType, "x-upsert": "false" },
      body: buffer,
    });
  } else {
    await writeFile(path.join(directory(), objectPath), buffer, { flag: "wx", mode: 0o600 });
  }
  try {
    const updated = { ...record, images: [...images, image] };
    await saveRecord(updated);
    return image;
  } catch (error) {
    try {
      if (storageMode() === "cloud") await removeCloudObjects([objectPath]);
      else await unlink(path.join(directory(), objectPath));
    } catch (cleanupError) {
      throw fail(`${error.message} A limpeza da imagem também falhou: ${cleanupError.message}`, error.status || 500);
    }
    throw error;
  }
}

export async function getSaleImage(id, imageId) {
  if (!validId(id) || !validImageId(imageId)) throw fail("Imagem inválida.", 400);
  const record = await getSale(id);
  const image = record?.images?.find((item) => item.id === imageId);
  if (!image || !Object.hasOwn(imageTypes, image.contentType)) throw fail("Imagem não encontrada.", 404);
  const buffer = storageMode() === "cloud"
    ? Buffer.from(await (await cloud(`/storage/v1/object/authenticated/${encodeURIComponent(bucket())}/${encodedPath(imagePath(id, image))}`)).arrayBuffer())
    : await readFile(path.join(directory(), imagePath(id, image)));
  return { image, buffer };
}

export async function deleteSaleImage(id, imageId) {
  if (!validId(id) || !validImageId(imageId)) throw fail("Imagem inválida.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Orçamento não encontrado.", 404);
  const image = record.images?.find((item) => item.id === imageId);
  if (!image || !Object.hasOwn(imageTypes, image.contentType)) throw fail("Imagem não encontrada.", 404);
  const updated = { ...record, images: record.images.filter((item) => item.id !== imageId) };
  await saveRecord(updated);
  if (storageMode() === "cloud") await removeCloudObjects([imagePath(id, image)]);
  else await unlink(path.join(directory(), imagePath(id, image)));
  return updated;
}

export async function deleteSale(id, { allowMerged = false } = {}) {
  if (!validId(id)) throw fail("Orçamento inválido.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Orçamento não encontrado.", 404);
  if (!allowMerged && record.mergedQuoteIds?.length && !record.mergeArchived) throw fail("Separe primeiro o orçamento conjunto em Ações, para conservar o acesso aos originais.",400);
  const images = Array.isArray(record.images) ? record.images : [];
  if (storageMode() === "cloud") {
    await removeCloudObjects([`${id}.pdf`, ...images.filter((image) => Object.hasOwn(imageTypes, image.contentType)).map((image) => imagePath(id, image))]);
    await cloud(`/rest/v1/admin_sales?id=eq.${id}`, { method: "DELETE" });
  } else {
    await unlink(path.join(directory(), `${id}.pdf`));
    for (const image of images) {
      if (Object.hasOwn(imageTypes, image.contentType)) await unlink(path.join(directory(), imagePath(id, image)));
    }
    await unlink(path.join(directory(), `${id}.json`));
  }
}

export async function updateSaleWorkflow(id, updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw fail("Estados inválidos.", 400);
  const { status: requestedStatus, paymentStatus, deliveryStatus, saleDate, deliveryDate, quoteProject, quoteSeparate } = updates;
  const status = requestedStatus === "nao_selecionado" ? "em_preparacao" : requestedStatus;
  if (status !== undefined && !["em_preparacao", "confirmada"].includes(status)) throw fail("Estado do orçamento inválido.", 400);
  if (paymentStatus !== undefined && !paymentStatuses.includes(paymentStatus)) throw fail("Estado do pagamento inválido.", 400);
  if (deliveryStatus !== undefined && !deliveryStatuses.includes(deliveryStatus)) throw fail("Estado da entrega inválido.", 400);
  if (saleDate !== undefined && !validDate(saleDate)) throw fail("Data da venda inválida.", 400);
  if (deliveryDate !== undefined && !validDate(deliveryDate)) throw fail("Data de entrega inválida.", 400);
  if (quoteProject !== undefined && (typeof quoteProject !== "string" || quoteProject.trim().length > 100)) throw fail("O nome do projeto deve ter até 100 caracteres.", 400);
  if (quoteSeparate !== undefined && typeof quoteSeparate !== "boolean") throw fail("Agrupamento inválido.", 400);
  if (status === undefined && paymentStatus === undefined && deliveryStatus === undefined && saleDate === undefined && deliveryDate === undefined && quoteProject === undefined && quoteSeparate === undefined) throw fail("Indique um estado para atualizar.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Encomenda não encontrada.", 404);
  const nextStatus = status ?? record.status;
  if (saleDate !== undefined && nextStatus !== "confirmada") throw fail("Só é possível definir a data de uma venda confirmada.", 400);
  const nextDeliveryStatus = deliveryStatus ?? record.deliveryStatus;
  if (deliveryDate !== undefined && nextDeliveryStatus !== "entregue") throw fail("Só é possível definir a data de uma entrega concluída.", 400);
  if (deliveryStatus === "entregue" && !validDate(deliveryDate ?? record.deliveryDate)) throw fail("Indique uma data válida para concluir a entrega.", 400);
  const defaultSaleDate = status === "confirmada" && record.status !== "confirmada" && !record.saleDate ? lisbonDate() : undefined;
  const updated = normalizeSale({
    ...record,
    ...(status !== undefined && { status, quoteNotSelected: requestedStatus === "nao_selecionado" }),
    ...(paymentStatus !== undefined && { paymentStatus }),
    ...(deliveryStatus !== undefined && { deliveryStatus }),
    ...(saleDate !== undefined && { saleDate }),
    ...(deliveryDate !== undefined && { deliveryDate }),
    ...(defaultSaleDate && { saleDate: defaultSaleDate }),
    ...(quoteProject !== undefined && { quoteProject: quoteProject.trim() }),
    ...(quoteSeparate !== undefined && { quoteSeparate }),
    updatedAt: new Date().toISOString(),
  });
  const siblings = requestedStatus === "confirmada" && record.quoteGroupId
    ? (await listSales()).filter((sale) => sale.id !== id && sale.quoteGroupId === record.quoteGroupId)
    : [];
  if (siblings.some((sale) => sale.paymentStatus !== "por_pagar" || sale.deliveryStatus === "entregue")) {
    throw fail("Há outra versão deste grupo com pagamento ou entrega registados. Reveja esses dados antes de escolher outra versão.", 400);
  }
  const saved = [];
  try {
    for (const sibling of siblings) {
      await saveRecord({ ...sibling, status: "em_preparacao", quoteNotSelected: true, updatedAt: updated.updatedAt });
      saved.push(sibling);
    }
    await saveRecord(updated);
  } catch (error) {
    for (const sibling of saved) { try { await saveRecord(sibling); } catch { /* Preserve original error. */ } }
    throw error;
  }
  return updated;
}

export async function getPdf(id) {
  const record = await getSale(id);
  if (!record) throw fail("Documento não encontrado.", 404);
  const buffer = storageMode() === "cloud"
    ? Buffer.from(await (await cloud(`/storage/v1/object/authenticated/${bucket()}/${id}.pdf`)).arrayBuffer())
    : await readFile(path.join(directory(), `${id}.pdf`));
  return { record, buffer };
}


export async function groupSaleQuotes(sourceId, targetId) {
  if (!validId(sourceId) || !validId(targetId) || sourceId === targetId) throw fail("Escolha dois orçamentos diferentes.", 400);
  const sales = await listSales();
  const source = sales.find((sale) => sale.id === sourceId);
  const target = sales.find((sale) => sale.id === targetId);
  if (!source || !target) throw fail("Orçamento não encontrado.", 404);
  if (source.quoteGroupId && source.quoteGroupId === target.quoteGroupId) return sales;
  const members = sales.filter((sale) => sale.id === sourceId || sale.id === targetId || (source.quoteGroupId && sale.quoteGroupId === source.quoteGroupId) || (target.quoteGroupId && sale.quoteGroupId === target.quoteGroupId));
  if (members.some((sale, index) => members.slice(index + 1).some((other) => !sameQuoteCustomer(sale, other)))) {
    throw fail("Só pode agrupar orçamentos com o mesmo nome de cliente ou o mesmo NIF.", 400);
  }
  const quoteGroupId = target.quoteGroupId || randomUUID();
  const saved = [];
  try {
    for (const sale of members) {
      if (sale.quoteGroupId === quoteGroupId) continue;
      await saveRecord({ ...sale, quoteGroupId, updatedAt: new Date().toISOString() });
      saved.push(sale);
    }
  } catch (error) {
    for (const sale of saved) {
      try { await saveRecord(sale); } catch { /* The client reloads persisted records on failure. */ }
    }
    throw error;
  }
  return listSales();
}

export async function ungroupSaleQuote(id) {
  const record = await getSale(id);
  if (!record) throw fail("Orçamento não encontrado.", 404);
  await saveRecord({ ...record, quoteGroupId: null, updatedAt: new Date().toISOString() });
  return listSales();
}

export async function reviseSaleQuote(id, pdf, expectedUpdatedAt, lines, discount) {
  const existing = await getSale(id);
  if (!existing) throw fail("Orçamento não encontrado.", 404);
  if (existing.updatedAt !== expectedUpdatedAt) throw fail("Este orçamento foi alterado entretanto. Volte a abri-lo antes de guardar.", 409);
  const { parseSalePdf } = await import("./pdf.mjs");
  const { validateQuoteLines } = await import("./editable-quote.mjs");
  const parsed = await parseSalePdf(pdf, existing.fileName);
  if (!validateQuoteLines(lines, parsed.subtotal, discount)) throw fail("Os artigos não correspondem aos totais do orçamento.", 400);
  const { buffer: originalPdf } = await getPdf(id);
  const revision = randomUUID();
  const archive = `revisions/${id}/${revision}`;
  const updated = { ...existing, customerName: parsed.customerName, nif: parsed.nif, subtotal: parsed.subtotal, vat: parsed.vat, total: parsed.total, updatedAt: new Date().toISOString(), quoteRevision: (existing.quoteRevision || 0) + 1, quoteLines: lines, discountPercent: discount, previousQuoteRevision: archive, orderDetails: { ...existing.orderDetails, artigos: lines } };
  const savePdf = async (bytes) => {
    if (storageMode() === "cloud") await cloud(`/storage/v1/object/${bucket()}/${id}.pdf`, { method: "POST", headers: { "Content-Type": "application/pdf", "x-upsert": "true" }, body: bytes });
    else { const temp = path.join(directory(), `${id}.${revision}.pdf.tmp`); await writeFile(temp, bytes, { mode: 0o600 }); await rename(temp, path.join(directory(), `${id}.pdf`)); }
  };
  if (storageMode() === "cloud") {
    for (const [suffix, content, type] of [["pdf", originalPdf, "application/pdf"], ["json", JSON.stringify(existing), "application/json"]]) await cloud(`/storage/v1/object/${bucket()}/${archive}.${suffix}`, { method: "POST", headers: { "Content-Type": type }, body: content });
  } else {
    await mkdir(path.dirname(path.join(directory(), archive)), { recursive: true, mode: 0o700 });
    await writeFile(path.join(directory(), `${archive}.pdf`), originalPdf, { mode: 0o600 });
    await writeFile(path.join(directory(), `${archive}.json`), JSON.stringify(existing), { mode: 0o600 });
  }
  await savePdf(pdf);
  try { await saveRecord(updated); } catch (error) { await savePdf(originalPdf); throw error; }
  return updated;
}

export async function mergeSaleQuotes(sourceId, targetId, expected, pdf, image) {
  const { assertMergeable } = await import("./merge-quotes.mjs");
  const { parseSalePdf } = await import("./pdf.mjs");
  const source = await getSale(sourceId), target = await getSale(targetId);
  assertMergeable(source, target);
  if (source.updatedAt !== expected.source || target.updatedAt !== expected.target) throw fail("Um dos orçamentos foi alterado. Volte a iniciar a junção.",409);
  const parsed = await parseSalePdf(pdf, "orcamento-conjunto.pdf");
  if (Math.abs(parsed.subtotal - source.subtotal - target.subtotal) > 0.05) throw fail("O total do documento conjunto não corresponde aos dois orçamentos.",400);
  if (!sameQuoteCustomer(parsed, target)) throw fail("O cliente do PDF não corresponde ao orçamento.",400);
  let created;
  const saved = [];
  try {
    created = await createSale({ ...parsed, entryOrigin:"admin", mergedQuoteIds:[target.id, source.id], status: source.status === "confirmada" || target.status === "confirmada" ? "confirmada" : "em_preparacao", orderDetails:{...target.orderDetails, detalhes:parsed.quoteDetails || "Orçamento conjunto"} }, pdf);
    if (image) await addSaleImage(created.id,"desenhos-conjuntos.jpg","image/jpeg",image);
    // Recheck before hiding originals. Preserve their files, images and workflow for undo.
    for (const original of [source,target]) {
      const current = await getSale(original.id);
      if (current.updatedAt !== original.updatedAt || current.mergedInto) throw fail("Um dos orçamentos foi alterado durante a junção.",409);
      await saveRecord({ ...original, mergedInto:created.id });
      saved.push(original);
    }
    return await listSales();
  } catch (error) {
    for (const original of saved) { try { await saveRecord(original); } catch {} }
    if (created) { try { await deleteSale(created.id, { allowMerged:true }); } catch {} }
    throw error;
  }
}

export async function separateMergedSale(id) {
  const record = await getSale(id);
  if (!record?.mergedQuoteIds?.length || record.mergedInto || record.mergeArchived) throw fail("Este orçamento não tem uma junção ativa para separar.",400);
  if (record.paymentStatus !== "por_pagar" || record.deliveryStatus === "entregue") throw fail("Este orçamento já tem pagamento ou entrega registados. Reveja os estados antes de separar.",400);
  const originals = await Promise.all(record.mergedQuoteIds.map(getSale));
  if (originals.some((original)=>!original || original.mergedInto !== id)) throw fail("Não foi possível recuperar todos os originais desta junção.",409);
  const saved=[];
  try {
    for (const original of originals) { await saveRecord({...original,mergedInto:null}); saved.push(original); }
    // Keep the joint PDF archived, including any edits made after merging.
    await saveRecord({...record,mergeArchived:true,updatedAt:new Date().toISOString()});
    return await listSales();
  } catch(error) {
    for (const original of saved) { try { await saveRecord(original); } catch {} }
    throw error;
  }
}
