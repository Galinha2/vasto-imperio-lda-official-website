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
const encodedPath = (value) => value.split("/").map(encodeURIComponent).join("/");
const imagePath = (saleId, image) => `${saleId}.${image.id}.${imageTypes[image.contentType].extension}`;

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

export async function listSales() {
  if (storageMode() === "cloud") {
    const records = [];
    for (let offset = 0; ; offset += 500) {
      const rows = await (await cloud(`/rest/v1/admin_sales?select=record&order=uploaded_at.desc&limit=500&offset=${offset}`)).json();
      records.push(...rows.map((row) => normalizeSale(row.record)));
      if (rows.length < 500) break;
    }
    return records;
  }
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const files = (await readdir(directory())).filter((file) => /^[a-f0-9]{64}\.json$/.test(file));
  return Promise.all(files.map(async (file) => normalizeSale(JSON.parse(await readFile(path.join(directory(), file), "utf8")))));
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

export async function deleteSale(id) {
  if (!validId(id)) throw fail("Orçamento inválido.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Orçamento não encontrado.", 404);
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
  const { status, paymentStatus, deliveryStatus } = updates;
  if (status !== undefined && !["em_preparacao", "confirmada"].includes(status)) throw fail("Estado do orçamento inválido.", 400);
  if (paymentStatus !== undefined && !paymentStatuses.includes(paymentStatus)) throw fail("Estado do pagamento inválido.", 400);
  if (deliveryStatus !== undefined && !deliveryStatuses.includes(deliveryStatus)) throw fail("Estado da entrega inválido.", 400);
  if (status === undefined && paymentStatus === undefined && deliveryStatus === undefined) throw fail("Indique um estado para atualizar.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Encomenda não encontrada.", 404);
  const updated = normalizeSale({
    ...record,
    ...(status !== undefined && { status }),
    ...(paymentStatus !== undefined && { paymentStatus }),
    ...(deliveryStatus !== undefined && { deliveryStatus }),
    updatedAt: new Date().toISOString(),
  });
  await saveRecord(updated);
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
