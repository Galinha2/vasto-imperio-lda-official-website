import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "vasto_admin_session";
const SESSION_SECONDS = 8 * 60 * 60;
// Browsers may cap persistent cookie lifetimes independently of token validity.
const REMEMBER_COOKIE_SECONDS = 10 * 365 * 24 * 60 * 60;
const attempts = new Map();

function configuration() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 12 || !secret || secret.length < 32) {
    throw Object.assign(new Error("Configure as credenciais da administração antes de iniciar sessão."), { status: 503 });
  }
  return { username: process.env.ADMIN_USERNAME || "admin", password, secret };
}

const equal = (a, b) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
const signature = (payload, config) => createHmac("sha256", `${config.secret}\0${config.password}`).update(payload).digest("base64url");

export function signIn(username, password, address = "unknown", remember = false) {
  const config = configuration();
  const now = Date.now();
  for (const [key, attempt] of attempts) if (attempt.until < now) attempts.delete(key);
  const attempt = attempts.get(address);
  if (attempt?.count >= 5) throw Object.assign(new Error("Demasiadas tentativas. Tente novamente dentro de 15 minutos."), { status: 429 });
  if (!equal(String(username), config.username) || !equal(String(password), config.password)) {
    attempts.set(address, { count: (attempt?.count || 0) + 1, until: attempt?.until || now + 15 * 60 * 1000 });
    throw Object.assign(new Error("Utilizador ou palavra-passe incorretos."), { status: 401 });
  }
  attempts.delete(address);
  const payload = Buffer.from(JSON.stringify({ user: config.username, expires: remember === true ? null : now + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${signature(payload, config)}`;
}

export function verifySession(token) {
  try {
    if (typeof token !== "string" || token.length > 1024) return false;
    const [payload, supplied, extra] = token.split(".");
    if (!payload || !supplied || extra) return false;
    const config = configuration();
    if (!equal(supplied, signature(payload, config))) return false;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return session.user === config.username && (session.expires === null || (Number.isFinite(session.expires) && session.expires > Date.now()));
  } catch { return false; }
}

export function sessionCookie(value, clear = false, remember = false) {
  return {
    name: SESSION_COOKIE, value, httpOnly: true,
    secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/",
    ...(clear ? { maxAge: 0 } : remember === true ? { maxAge: REMEMBER_COOKIE_SECONDS } : {}),
  };
}

export function assertOrigin(request) {
  const origin = request.headers.get("origin");
  try {
    if (origin && new URL(origin).origin === new URL(request.url).origin) return;
  } catch { /* Invalid origins are rejected. */ }
  throw Object.assign(new Error("Pedido não autorizado."), { status: 403 });
}

export function assertSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) throw Object.assign(new Error("A sessão terminou. Inicie sessão novamente."), { status: 401 });
}
