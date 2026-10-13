import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { changeStatus } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    assertSession(request);
    assertOrigin(request);
    const { id } = await params;
    const { status } = await request.json();
    return NextResponse.json({ sale: await changeStatus(id, status) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : "Não foi possível atualizar o estado." }, { status: error.status || 500 }); }
}
