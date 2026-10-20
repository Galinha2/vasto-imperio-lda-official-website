import { quoteFilename } from "@/lib/quote-filenames.mjs";
import { NextResponse } from "next/server";
import { assertOrigin, assertSession } from "@/lib/admin/auth.mjs";
import { deleteSaleImage, getSaleImage } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    assertSession(request);
    const { id, imageId } = await params;
    const { image, buffer, record } = await getSaleImage(id, imageId);
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="imagem"; filename*=UTF-8''${encodeURIComponent(quoteFilename(record, "Desenho", image.contentType === "image/png" ? "png" : image.contentType === "image/webp" ? "webp" : "jpg", record.images.indexOf(image) + 1)).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível abrir a imagem." }, { status: error.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { id, imageId } = await params;
    await deleteSaleImage(id, imageId);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível eliminar a imagem." }, { status: error.status || 500 });
  }
}
