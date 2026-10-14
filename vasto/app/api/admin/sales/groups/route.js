import { NextResponse } from "next/server";
import { assertOrigin, assertSession } from "@/lib/admin/auth.mjs";
import { groupSaleQuotes, ungroupSaleQuote } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function change(request, separate) {
  try {
    assertSession(request);
    assertOrigin(request);
    const text = await request.text();
    if (text.length > 1024) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const body = JSON.parse(text);
    const sales = separate ? await ungroupSaleQuote(body.id) : await groupSaleQuotes(body.sourceId, body.targetId);
    return NextResponse.json({ sales }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível alterar o agrupamento. Atualize a lista e tente novamente." }, { status: error.status || 500 });
  }
}
export const POST = (request) => change(request, false);
export const DELETE = (request) => change(request, true);
