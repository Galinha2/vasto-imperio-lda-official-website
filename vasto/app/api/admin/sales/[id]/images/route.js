import { NextResponse } from "next/server";
import { assertOrigin, assertSession } from "@/lib/admin/auth.mjs";
import { addSaleImage, getSale } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request, { params }) {
  try {
    assertSession(request);
    const { id } = await params;
    const sale = await getSale(id);
    if (!sale) return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    return NextResponse.json({ images: sale.images || [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível consultar as imagens." }, { status: error.status || 500 });
  }
}

export async function POST(request, { params }) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { id } = await params;
    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file.arrayBuffer !== "function" || file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Escolha uma imagem com até 4 MB." }, { status: 400 });
    }
    const image = await addSaleImage(id, file.name, file.type, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ image }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível adicionar a imagem." }, { status: error.status || 500 });
  }
}
