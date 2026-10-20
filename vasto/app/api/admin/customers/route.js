import { NextResponse } from "next/server";
import { assertSession } from "@/lib/admin/auth.mjs";
import { listSales } from "@/lib/admin/store.mjs";
import { customerSuggestions } from "@/lib/admin/customer-suggestions.mjs";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    assertSession(request);
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") || "").slice(0, 150);
    const field = url.searchParams.get("field") === "nif" ? "nif" : "name";
    const customers = query.trim().length >= (field === "nif" ? 1 : 2) ? customerSuggestions(await listSales(), query, field) : [];
    return NextResponse.json({ customers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: "Não foi possível consultar clientes anteriores." }, { status: error.status || 500 }); }
}
