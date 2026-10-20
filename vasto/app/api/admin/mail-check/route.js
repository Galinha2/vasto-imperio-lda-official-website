import { NextResponse } from "next/server";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { checkSentMailbox } from "@/lib/email/send-with-sent-copy.mjs";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request) {
  try {
    assertSession(request); assertOrigin(request);
    return NextResponse.json(await checkSentMailbox(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : "Não foi possível verificar o IMAP." }, { status: error.status || 500 }); }
}
