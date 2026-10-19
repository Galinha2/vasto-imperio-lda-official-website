import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { createSale, deleteSaleUpload, readSaleUpload } from "@/lib/admin/store.mjs";
import { parseSalePdf } from "@/lib/admin/pdf.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function errorResponse(error) {
  return NextResponse.json({ error: error.status ? error.message : "Não foi possível consultar ou guardar a encomenda." }, { status: error.status || 500 });
}

export async function POST(request) {
  let uploadPath;
  let uploadRemoved = false;
  try {
    assertSession(request);
    assertOrigin(request);
    const { path, fileName } = await request.json();
    uploadPath = path;
    if (typeof fileName !== "string" || !fileName.toLowerCase().endsWith(".pdf") || fileName.length > 180) {
      await deleteSaleUpload(path);
      uploadRemoved = true;
      return NextResponse.json({ error: "O nome do ficheiro PDF é inválido." }, { status: 400 });
    }
    const buffer = await readSaleUpload(path);
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
      await deleteSaleUpload(path);
      uploadRemoved = true;
      return NextResponse.json({ error: "Escolha um ficheiro PDF com até 6 MB." }, { status: 400 });
    }
    await deleteSaleUpload(path);
    uploadRemoved = true;
    const record = await parseSalePdf(buffer, fileName);
    return NextResponse.json({ sale: await createSale({ ...record, entryOrigin: "admin" }, buffer) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (uploadPath && !uploadRemoved) {
      try { await deleteSaleUpload(uploadPath); }
      catch (cleanupError) {
        const message = error.status ? error.message : "Não foi possível consultar ou guardar a encomenda.";
        return NextResponse.json({ error: `${message} A limpeza do envio temporário também falhou: ${cleanupError.message}` }, { status: error.status || 500 });
      }
    }
    return errorResponse(error);
  }
}
