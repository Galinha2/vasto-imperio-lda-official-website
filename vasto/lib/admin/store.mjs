import { mkdir, readdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const validId = (id) => /^[a-f0-9]{64}$/.test(id);
const validUploadPath = (value) => typeof value === "string" && /^pending\/[0-9a-f-]{36}\.pdf$/.test(value);
const fail = (message, status = 500) => Object.assign(new Error(message), { status });

export function storageMode() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return "cloud";
  if (process.env.VERCEL) throw fail("O armazenamento das vendas ainda não está configurado. Ligue o projeto Supabase nas definições da Vercel.", 503);
  if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw fail("A configuração do armazenamento está incompleta.", 503);
  return "local";
}

const directory = () => path.resolve(process.env.ADMIN_DATA_DIR || path.join(process.cwd(), ".admin-data"));
const bucket = () => process.env.SUPABASE_SALES_BUCKET || "sales-pdfs";
const encodedPath = (value) => value.split("/").map(encodeURIComponent).join("/");

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
      records.push(...rows.map((row) => row.record));
      if (rows.length < 500) break;
    }
    return records;
  }
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const files = (await readdir(directory())).filter((file) => /^[a-f0-9]{64}\.json$/.test(file));
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(directory(), file), "utf8"))));
}

export async function getSale(id) {
  if (!validId(id)) throw fail("Registo inválido.", 400);
  if (storageMode() === "cloud") {
    const rows = await (await cloud(`/rest/v1/admin_sales?id=eq.${id}&select=record`)).json();
    return rows[0]?.record || null;
  }
  try { return JSON.parse(await readFile(path.join(directory(), `${id}.json`), "utf8")); }
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
  await cloud(`/storage/v1/object/${encodeURIComponent(bucket())}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [uploadPath] }),
  });
}

export async function createSale(record, pdf) {
  if (await getSale(record.id)) throw fail("Este PDF já está registado.", 409);
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

export async function changeStatus(id, status) {
  if (!["vendida", "em_preparacao"].includes(status)) throw fail("Estado inválido.", 400);
  const record = await getSale(id);
  if (!record) throw fail("Encomenda não encontrada.", 404);
  const updated = { ...record, status, updatedAt: new Date().toISOString() };
  if (storageMode() === "cloud") {
    await cloud(`/rest/v1/admin_sales?id=eq.${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ record: updated }) });
  } else {
    const temp = path.join(directory(), `${id}.${randomUUID()}.tmp`);
    await writeFile(temp, JSON.stringify(updated), { mode: 0o600 });
    await rename(temp, path.join(directory(), `${id}.json`));
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
