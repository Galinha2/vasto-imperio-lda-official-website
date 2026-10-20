import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";

// Build once so the SMTP message and the copy in Sent have identical IDs and attachments.
export async function sendMailWithSentCopy(transporter, options, dependencies = {}) {
  const compose = dependencies.compose || nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
  const compiled = await compose.sendMail(options);
  const result = await transporter.sendMail({ envelope: compiled.envelope, raw: compiled.message });
  let client;
  let stage = "connection";
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
    stage = "folders";
    const folders = await client.list();
    const sent = env.IMAP_SENT_FOLDER || folders.find((folder) => folder.specialUse === "\\Sent")?.path;
    if (!sent) throw new Error("Pasta Enviados não identificada; configure IMAP_SENT_FOLDER.");
    stage = "folder-access";
    const lock = await client.getMailboxLock(sent);
    try {
      // Some providers archive SMTP messages automatically; do not duplicate those.
      const existing = compiled.messageId ? await client.search({ header: { "message-id": compiled.messageId } }, { uid: true }) : [];
      if (!existing?.length) {
        stage = "append";
        const appended = await client.append(sent, compiled.message, ["\\Seen"], new Date());
        if (!appended) throw new Error("Não foi possível guardar a cópia nos Enviados.");
      }
    } finally { lock.release(); }
    return { ...result, sentCopySaved: true };
  } catch (error) {
    const diagnostic = sentCopyDiagnostic(error, stage);
    // Avoid logging credentials, recipient data or message contents.
    console.error("[mail-sent-copy]", diagnostic.code, diagnostic.message);
    return { ...result, sentCopySaved: false, sentCopyError: diagnostic.message };
  } finally {
    if (client) {
      try { await client.logout(); } catch { client.close(); }
    }
  }
}


export function sentCopyDiagnostic(error, stage = "connection") {
  if (error.authenticationFailed) return { code: "IMAP_LOGIN", message: "O servidor IMAP recusou o utilizador ou a password. Confirme IMAP_USER e IMAP_PASS da caixa de correio na Vercel." };
  if (["ERR_TLS_CERT_ALTNAME_INVALID", "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(error.code)) return { code: "IMAP_TLS", message: "O certificado do servidor IMAP não é válido para o endereço configurado. Confirme IMAP_HOST com o fornecedor." };
  if (["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT"].includes(error.code)) return { code: "IMAP_CONNECTION", message: "Não foi possível ligar ao servidor IMAP. Confirme IMAP_HOST e IMAP_PORT (normalmente 993)." };
  if (stage === "folders") return { code: "IMAP_SENT_FOLDER", message: "Não foi possível identificar a pasta Enviados. Configure IMAP_SENT_FOLDER com o caminho exato usado no webmail." };
  if (stage === "folder-access") return { code: "IMAP_FOLDER_ACCESS", message: "Não foi possível abrir a pasta Enviados. Confirme IMAP_SENT_FOLDER e as permissões da caixa." };
  if (stage === "append") return { code: "IMAP_APPEND", message: "O servidor recusou guardar a mensagem em Enviados. Verifique o espaço disponível e as permissões da caixa." };
  return { code: "IMAP_FAILED", message: "A ligação IMAP falhou. Confirme as definições de receção da caixa no fornecedor de email." };
}

// Read-only check: no email is sent and no message is created.
export async function checkSentMailbox() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST || process.env.SMTP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_PORT || 993) === "993",
    auth: { user: process.env.IMAP_USER || process.env.SMTP_USER, pass: process.env.IMAP_PASS || process.env.SMTP_PASS },
    logger: false, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
  client.on("error", () => {});
  let stage = "connection";
  try {
    await client.connect();
    stage = "folders";
    const folders = await client.list();
    const sent = process.env.IMAP_SENT_FOLDER || folders.find((folder) => folder.specialUse === "\\Sent")?.path;
    if (!sent) throw new Error("Missing Sent folder");
    stage = "folder-access";
    const lock = await client.getMailboxLock(sent);
    lock.release();
    return { ok: true, message: `Ligação IMAP confirmada. Pasta de enviados: ${sent}.` };
  } catch (error) { return { ok: false, ...sentCopyDiagnostic(error, stage) }; }
  finally { try { await client.logout(); } catch { client.close(); } }
}
