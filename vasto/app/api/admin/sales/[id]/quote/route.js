import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { getPdf, reviseSaleQuote } from "@/lib/admin/store.mjs";
import { editableQuote } from "@/lib/admin/editable-quote.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const failure = (error) => NextResponse.json({ error: error.status ? error.message : "Não foi possível editar o orçamento." }, { status: error.status || 500 });
export async function GET(request, { params }) {
  try {
    assertSession(request);
    const { record, buffer } = await getPdf((await params).id);
    const quote = await editableQuote(record, buffer);
    return NextResponse.json({ record, ...quote }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function PUT(request, { params }) {
  try {
    assertSession(request); assertOrigin(request);
    const form = await request.formData();
    const pdf = form.get("pdf");
    if (!pdf || typeof pdf.arrayBuffer !== "function" || pdf.size > 6 * 1024 * 1024) return NextResponse.json({ error: "PDF inválido ou demasiado grande." }, { status: 400 });
    const sale = await reviseSaleQuote((await params).id, Buffer.from(await pdf.arrayBuffer()), form.get("updatedAt"), JSON.parse(String(form.get("lines"))), Number(form.get("discount")), form.has("email") ? form.get("email") : undefined, form.has("telefone") ? form.get("telefone") : undefined);
    return NextResponse.json({ sale });
  } catch (error) { return failure(error); }
}
