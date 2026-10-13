import { NextResponse } from "next/server";
import { assertOrigin, assertSession } from "@/lib/admin/auth.mjs";
import { getCommissionData, updateCommissionRate, updateMonthlyCommission } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error) {
  return NextResponse.json(
    { error: error.status ? error.message : "Não foi possível guardar ou consultar as comissões." },
    { status: error.status || 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request) {
  try {
    assertSession(request);
    return NextResponse.json(await getCommissionData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    let updates;
    try {
      updates = await request.json();
    } catch {
      return NextResponse.json({ error: "O pedido não contém JSON válido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json({ error: "Dados de comissão inválidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (Object.hasOwn(updates, "year") || Object.hasOwn(updates, "month")) {
      await updateMonthlyCommission(updates.year, updates.month, updates.paid, updates.commissionRate);
    } else if (Object.hasOwn(updates, "commissionRate")) {
      await updateCommissionRate(updates.commissionRate);
    } else {
      return NextResponse.json({ error: "Dados de comissão inválidos." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json(await getCommissionData(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
