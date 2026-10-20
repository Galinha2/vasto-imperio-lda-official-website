import { assertSession } from "@/lib/admin/auth.mjs";
import { getPdf } from "@/lib/admin/store.mjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    assertSession(request);
    const { id } = await params;
    const { record, buffer } = await getPdf(id);
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": "application/pdf", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="orcamento.pdf"; filename*=UTF-8''${encodeURIComponent(record.fileName)}`,
      "Content-Security-Policy": "sandbox",
    } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : "Não foi possível abrir o PDF." }, { status: error.status || 500 }); }
}
