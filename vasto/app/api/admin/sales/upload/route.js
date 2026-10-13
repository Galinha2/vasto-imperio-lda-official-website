import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { createSaleUpload, deleteSaleUpload } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error) {
  return NextResponse.json({ error: error.status ? error.message : "Não foi possível preparar o envio do PDF." }, { status: error.status || 500 });
}

export async function POST(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { size } = await request.json();
    if (!Number.isSafeInteger(size) || size <= 0 || size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "Escolha um ficheiro PDF com até 6 MB." }, { status: 400 });
    }
    return NextResponse.json(await createSaleUpload(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { path } = await request.json();
    await deleteSaleUpload(path);
    return NextResponse.json({ removed: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
