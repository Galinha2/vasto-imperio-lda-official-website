import { sameQuoteCustomer } from "@/lib/admin/quote-groups.mjs";
import { customerPhone } from "@/lib/admin/customer-phone.mjs";
import { customerEmail } from "@/lib/admin/customer-email.mjs";
import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { listSales, createSale, addSaleImage, deleteSale, getSale, getSaleImage, storageMode } from "@/lib/admin/store.mjs";
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
    const email = customerEmail(data.get("email"));
    const phone = data.has("telefone") ? customerPhone(data.get("telefone")) : undefined;
    const file = data.get("pdf");
    if (!file || typeof file.arrayBuffer !== "function" || file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: "Escolha um ficheiro PDF com até 6 MB." }, { status: 400 });
    }
    const image = data.get("image");
    if (image && (typeof image.arrayBuffer !== "function" || image.size > 4 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(image.type))) {
      return NextResponse.json({ error: "A imagem deve ser JPG, PNG ou WebP e ter até 4 MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const record = await parseSalePdf(buffer, file.name);
    const duplicateSourceId = String(data.get("duplicateSourceId") || "");
    const duplicateSource = duplicateSourceId ? await getSale(duplicateSourceId) : null;
    if (duplicateSource && !sameQuoteCustomer(duplicateSource, record)) return NextResponse.json({ error: "A cópia deve manter o cliente do orçamento original." }, { status: 400 });
    const sale = await createSale({ ...record, entryOrigin: "admin", orderDetails: { ...(email ? { email } : {}), telefone: phone ?? record.customerPhone ?? "" } }, buffer);
    if (duplicateSource) {
      try {
        const images = [];
        for (const original of duplicateSource.images || []) {
          const saved = await getSaleImage(duplicateSource.id, original.id);
          images.push(await addSaleImage(sale.id, original.fileName || "desenho.jpg", original.contentType, saved.buffer));
        }
        sale.images = images;
      } catch (error) {
        await deleteSale(sale.id);
        throw error;
      }
    }
    if (!image) return NextResponse.json({ sale }, { status: 201, headers: { "Cache-Control": "no-store" } });
    try {
      const savedImage = await addSaleImage(sale.id, image.name, image.type, Buffer.from(await image.arrayBuffer()));
      return NextResponse.json({ sale: { ...sale, images: [savedImage] } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      try {
        await deleteSale(sale.id);
      } catch (cleanupError) {
        throw new Error(`${error.message} A simulação ficou registada sem a imagem e a limpeza do registo falhou: ${cleanupError.message}`);
      }
      throw error;
    }
  } catch (error) { return errorResponse(error); }
}
