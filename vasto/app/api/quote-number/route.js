import { NextResponse } from "next/server";
import { assertOrigin } from "@/lib/admin/auth.mjs";
import { reserveQuoteNumber } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    assertOrigin(request);
    return NextResponse.json({ quoteNumber: await reserveQuoteNumber() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível reservar o número do orçamento. Confirme que executou o SQL atualizado no Supabase." }, { status: error.status || 500 });
  }
}
