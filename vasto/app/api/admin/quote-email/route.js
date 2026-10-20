import { sendMailWithSentCopy } from "@/lib/email/send-with-sent-copy.mjs";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { assertSession, assertOrigin } from "@/lib/admin/auth.mjs";
import { getPdf, getSaleImage } from "@/lib/admin/store.mjs";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request) {
  try {
    assertSession(request);
    assertOrigin(request);
    if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024) return NextResponse.json({ error: "Os anexos são demasiado grandes para envio. Reduza o tamanho dos desenhos." }, { status: 413 });
    const form = await request.formData();
    const email = String(form.get("email") || "").trim();
    const subject = String(form.get("subject") || "").trim();
    const message = String(form.get("message") || "").trim();
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) || email.length > 254 || !subject || subject.length > 180 || /[\r\n]/.test(subject) || !message || message.length > 10000) return NextResponse.json({ error: "Confirme o email, o assunto e a mensagem." }, { status: 400 });
    const attachments = [];
    const id = form.get("saleId");
    if (id) {
      const { record, buffer } = await getPdf(String(id));
      attachments.push({ filename: "orcamento.pdf", content: buffer, contentType: "application/pdf" });
      for (const image of record.images || []) {
        const saved = await getSaleImage(String(id), image.id);
        attachments.push({ filename: image.name, content: saved.buffer, contentType: image.contentType });
      }
    } else {
      for (const file of form.getAll("attachments")) {
        if (!file || typeof file.arrayBuffer !== "function") throw Object.assign(new Error("Anexo inválido."), { status: 400 });
        const content = Buffer.from(await file.arrayBuffer());
        const pdf = file.type === "application/pdf" && content.subarray(0, 5).toString() === "%PDF-";
        const jpeg = file.type === "image/jpeg" && content[0] === 255 && content[1] === 216 && content[2] === 255;
        if (!pdf && !jpeg) throw Object.assign(new Error("Formato de anexo inválido."), { status: 400 });
        attachments.push({ filename: pdf ? "orcamento.pdf" : "desenho.jpg", content, contentType: file.type });
      }
    }
    if (!attachments.some((file) => file.contentType === "application/pdf") || attachments.length > 11 || attachments.reduce((sum, file) => sum + file.content.length, 0) > 20 * 1024 * 1024) return NextResponse.json({ error: "Confirme os anexos: é obrigatório um orçamento PDF e o limite total é 20 MB." }, { status: 400 });
    if (!["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].every((key) => process.env[key])) throw new Error("SMTP indisponível");
    const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    const delivery = await sendMailWithSentCopy(transporter, { from: process.env.SMTP_USER, to: email, replyTo: "geral@vastoimperio.pt", subject, text: message, attachments });
    return NextResponse.json({ message: "Orçamento enviado por email.", sentCopySaved: delivery.sentCopySaved });
  } catch (error) {
    console.error("[admin-quote-email]", error.message);
    return NextResponse.json({ error: error.status ? error.message : "Não foi possível enviar o email. Verifique a configuração SMTP e tente novamente." }, { status: error.status || 500 });
  }
}
