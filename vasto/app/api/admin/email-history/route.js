import { listSales } from "@/lib/admin/store.mjs";
import { assertSession } from "@/lib/admin/auth.mjs";
import { getSentMailboxMessage, listSentMailbox } from "@/lib/email/send-with-sent-copy.mjs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validItem(item) {
  return item && typeof item === "object" && typeof item.sentAt === "string" && Number.isFinite(Date.parse(item.sentAt));
}

export async function GET(request) {
  try {
    assertSession(request);
    const url = new URL(request.url);
    const mailboxUid = url.searchParams.get("mailboxUid");
    if (mailboxUid !== null) {
      const message = await getSentMailboxMessage(Number(mailboxUid));
      return NextResponse.json({ email: { ...message, message: extractReadableMessage(message.source) } }, { headers: { "Cache-Control": "no-store" } });
    }
    try {
      const emails = await listSentMailbox();
      return NextResponse.json({ emails, source: "mailbox" }, { headers: { "Cache-Control": "no-store" } });
    } catch (mailboxError) {
      console.error("[admin-email-history] IMAP history unavailable", mailboxError.message);
    }
    const grouped = new Map();
    for (const sale of await listSales({ includeArchived: true })) {
      const history = Array.isArray(sale.emailHistory) && sale.emailHistory.length
        ? sale.emailHistory.filter(validItem)
        : sale.emailSentAt ? [{ id: `legacy-${sale.id}-${sale.emailSentAt}`, sentAt: sale.emailSentAt, to: sale.emailSentTo || "", subject: "", message: "", legacy: true }] : [];
      for (const item of history) {
        const id = String(item.id || `${sale.id}-${item.sentAt}`).slice(0, 120);
        const current = grouped.get(id) || {
          id,
          sentAt: item.sentAt,
          to: String(item.to || "").slice(0, 254),
          subject: String(item.subject || "").slice(0, 180),
          message: String(item.message || "").slice(0, 10000),
          followUp: Boolean(item.followUp),
          legacy: Boolean(item.legacy),
          attachmentNames: Array.isArray(item.attachmentNames) ? item.attachmentNames.filter((name) => typeof name === "string").slice(0, 20) : [],
          sales: [],
        };
        current.sales.push({ id: sale.id, customerName: sale.customerName || "Cliente", quoteNumber: sale.quoteNumber || "" });
        grouped.set(id, current);
      }
    }
    const emails = [...grouped.values()].sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt)).slice(0, 300);
    return NextResponse.json({ emails, source: "record" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível consultar os emails enviados." }, { status: error.status || 500 });
  }
}

function decodeQuotedPrintable(value) {
  return value.replace(/=\r?\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function extractReadableMessage(source) {
  const normalized = String(source || "").replace(/\r\n/g, "\n");
  const plain = normalized.match(/Content-Type:\s*text\/plain[^\n]*(?:\n[^\n]*)*\n\n([\s\S]*?)(?=\n--[^\n]+|$)/i);
  const html = normalized.match(/Content-Type:\s*text\/html[^\n]*(?:\n[^\n]*)*\n\n([\s\S]*?)(?=\n--[^\n]+|$)/i);
  let body = (plain || html)?.[1] || "";
  if (!body) return "Não foi possível ler o conteúdo deste email.";
  if (/Content-Transfer-Encoding:\s*base64/i.test((plain || html)?.[0] || "")) body = Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
  else body = decodeQuotedPrintable(body);
  if (!plain) body = body.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
  return body.replace(/\n{3,}/g, "\n\n").trim().slice(0, 10000) || "Não foi possível ler o conteúdo deste email.";
}
