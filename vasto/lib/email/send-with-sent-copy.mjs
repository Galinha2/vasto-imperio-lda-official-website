import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

// Build once so the SMTP message and the copy in Sent have identical IDs and attachments.
export async function sendMailWithSentCopy(transporter, options, dependencies = {}) {
  const compose = dependencies.compose || nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const compiled = await compose.sendMail(options);
  const result = await transporter.sendMail({ envelope: compiled.envelope, raw: compiled.message });
  let client;
  try {
    const env = dependencies.env || process.env;
    const Client = dependencies.ImapFlow || ImapFlow;
    client = new Client({
      host: env.IMAP_HOST || env.SMTP_HOST,
      port: Number(env.IMAP_PORT || 993),
      secure: String(env.IMAP_PORT || 993) === "993",
      auth: { user: env.IMAP_USER || env.SMTP_USER, pass: env.IMAP_PASS || env.SMTP_PASS },
      logger: false,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    // An IMAP error must never cause a successfully sent email to be resent.
    client.on("error", () => {});
    await client.connect();
    const folders = await client.list();
    const sent = env.IMAP_SENT_FOLDER || folders.find((folder) => folder.specialUse === "\\Sent")?.path;
    if (!sent) throw new Error("Pasta Enviados não identificada; configure IMAP_SENT_FOLDER.");
    const lock = await client.getMailboxLock(sent);
    try {
      // Some providers archive SMTP messages automatically; do not duplicate those.
      const existing = compiled.messageId ? await client.search({ header: { "message-id": compiled.messageId } }, { uid: true }) : [];
      if (!existing?.length) {
        const appended = await client.append(sent, compiled.message, ["\\Seen"], new Date());
        if (!appended) throw new Error("Não foi possível guardar a cópia nos Enviados.");
      }
    } finally { lock.release(); }
    return { ...result, sentCopySaved: true };
  } catch {
    // Avoid logging credentials, recipient data or message contents.
    console.error("[mail-sent-copy] Email enviado, mas a cópia em Enviados falhou. Verifique IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASS e IMAP_SENT_FOLDER.");
    return { ...result, sentCopySaved: false };
  } finally {
    if (client) {
      try { await client.logout(); } catch { client.close(); }
    }
  }
}
