import { NextResponse } from "next/server";
import { signIn, verifySession, sessionCookie, assertOrigin, SESSION_COOKIE } from "@/lib/admin/auth.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  return NextResponse.json({ authenticated: verifySession(request.cookies.get(SESSION_COOKIE)?.value) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  try {
    assertOrigin(request);
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
    const { username, password } = JSON.parse(text);
    if (typeof username !== "string" || typeof password !== "string" || username.length > 128 || password.length > 256) {
      return NextResponse.json({ error: "Preencha o utilizador e a palavra-passe." }, { status: 400 });
    }
    const token = signIn(username, password, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim());
    const response = NextResponse.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(sessionCookie(token));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível iniciar sessão." }, { status: error.status || 400 });
  }
}

export async function DELETE(request) {
  try {
    assertOrigin(request);
    const response = NextResponse.json({ authenticated: false });
    response.cookies.set(sessionCookie("", true));
    return response;
  } catch (error) { return NextResponse.json({ error: error.message }, { status: error.status || 403 }); }
}
