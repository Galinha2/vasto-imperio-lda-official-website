import test from "node:test";
import assert from "node:assert/strict";
import { sendMailWithSentCopy } from "../lib/email/send-with-sent-copy.mjs";

function setup({ exists = [], failAppend = false, smtpFails = false } = {}) {
  const calls = [];
  const raw = Buffer.from("Message-ID: <test@example.com>\r\n\r\nTest");
  class Client {
    on() {}
    async connect() { calls.push("connect"); }
    async list() { return [{ path: "INBOX.Sent", specialUse: "\\Sent" }]; }
    async getMailboxLock(path) { assert.equal(path, "INBOX.Sent"); return { release() { calls.push("release"); } }; }
    async search() { return exists; }
    async append(path, bytes, flags) { assert.equal(bytes, raw); assert.deepEqual(flags, ["\\Seen"]); calls.push("append"); if (failAppend) throw Error("test"); return { uid: 1 }; }
    async logout() { calls.push("logout"); }
    close() {}
  }
  const compose = { async sendMail() { return { message: raw, messageId: "<test@example.com>", envelope: { from: "sender@example.com", to: ["client@example.com"] } }; } };
  const transporter = { async sendMail(options) { calls.push("smtp"); assert.equal(options.raw, raw); if (smtpFails) throw Error("SMTP failure"); return { messageId: "<test@example.com>" }; } };
  return { calls, transporter, dependencies: { compose, ImapFlow: Client, env: { SMTP_HOST: "mail.example.com", SMTP_USER: "sender@example.com", SMTP_PASS: "test" } } };
}
test("SMTP and Sent use the exact same MIME message", async () => {
  const s = setup();
  const result = await sendMailWithSentCopy(s.transporter, {}, s.dependencies);
  assert.equal(result.sentCopySaved, true);
  assert.deepEqual(s.calls, ["smtp", "connect", "append", "release", "logout"]);
});
test("provider's existing Sent copy is not duplicated", async () => {
  const s = setup({ exists: [1] });
  assert.equal((await sendMailWithSentCopy(s.transporter, {}, s.dependencies)).sentCopySaved, true);
  assert.ok(!s.calls.includes("append"));
});
test("Sent failure reports delivered email without retrying SMTP", async () => {
  const s = setup({ failAppend: true });
  assert.equal((await sendMailWithSentCopy(s.transporter, {}, s.dependencies)).sentCopySaved, false);
  assert.equal(s.calls.filter((call) => call === "smtp").length, 1);
  assert.ok(s.calls.includes("logout"));
});
test("SMTP failure prevents creating a misleading Sent copy", async () => {
  const s = setup({ smtpFails: true });
  await assert.rejects(sendMailWithSentCopy(s.transporter, {}, s.dependencies), /SMTP failure/);
  assert.deepEqual(s.calls, ["smtp"]);
});

test("real MIME compilation includes the PDF attachment and a stable message ID", async () => {
  const s = setup();
  delete s.dependencies.compose;
  let raw;
  const transporter = { async sendMail(options) { raw = options.raw; return { messageId: "test" }; } };
  s.dependencies.ImapFlow = class {
    on() {}
    async connect() { throw Error("mock offline"); }
    async logout() {}
    close() {}
  };
  const result = await sendMailWithSentCopy(transporter, { from: "sender@example.com", to: "client@example.com", subject: "Orçamento", text: "Mensagem", attachments: [{ filename: "orcamento.pdf", content: Buffer.from("%PDF-test") }] }, s.dependencies);
  assert.equal(result.sentCopySaved, false);
  assert.ok(Buffer.isBuffer(raw));
  assert.match(raw.toString(), /Message-ID:/i);
  assert.match(raw.toString(), /orcamento.pdf/);
  assert.match(raw.toString(), /Content-Type: application\/pdf/i);
});
