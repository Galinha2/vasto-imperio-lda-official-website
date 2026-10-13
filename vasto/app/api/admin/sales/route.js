import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { listSales, createSale, storageMode } from "@/lib/admin/store.mjs";
import { parseSalePdf } from "@/lib/admin/pdf.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function errorResponse(error) {
  return NextResponse.json({ error: error.status ? error.message : "Não foi possível consultar ou guardar a encomenda." }, { status: error.status || 500 });
}

export async function GET(request) {
  try {
    assertSession(request);
    return NextResponse.json({ sales: await listSales(), storage: storageMode() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    storageMode();
    const data = await request.formData();
    const file = data.get("pdf");
    if (!file || typeof file.arrayBuffer !== "function" || file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "Escolha um ficheiro PDF com até 6 MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await parseSalePdf(buffer, file.name);
    return NextResponse.json({ sale: await createSale(record, buffer) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
