import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { updateSaleWorkflow, deleteSale, listSales, getSale } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    assertSession(request);
    const { id } = await params;
    const sale = await getSale(id);
    if (!sale || sale.mergedInto || sale.mergeArchived) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    return NextResponse.json({ sale }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : 'Não foi possível consultar o orçamento.' }, { status: error.status || 500 }); }
}

export async function PATCH(request, { params }) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { id } = await params;
    const updates = await request.json();
    const sale = await updateSaleWorkflow(id, updates);
    return NextResponse.json({ sale, ...(updates.status && sale.quoteGroupId ? { sales: await listSales() } : {}) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : "Não foi possível atualizar o estado." }, { status: error.status || 500 }); }
}

export async function DELETE(request, { params }) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { id } = await params;
    await deleteSale(id);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível eliminar o orçamento." }, { status: error.status || 500 });
  }
}
