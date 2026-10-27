import nodemailer from 'nodemailer';
import { signedEmail } from './email/signature.mjs';

export function contactEmail(contact) {
  const email = typeof contact === 'string' ? contact.trim() : '';
  return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+$/i.test(email) && email.length <= 160 ? email : null;
}
export async function deliverChatEmail({ thread, message, kind }, dependencies = {}) {
  const env = dependencies.env || process.env;
  const to = kind === 'started' ? (env.RECEIVER_EMAIL || 'geral@vastoimperio.pt') : contactEmail(thread.contact);
  if (!to) return { status: 'no_email' };
  try {
    if (!['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'].every(key => env[key])) throw new Error('SMTP_NOT_CONFIGURED');
    const transporter = dependencies.transporter || nodemailer.createTransport({ host: env.SMTP_HOST, port: Number(env.SMTP_PORT), secure: Number(env.SMTP_PORT) === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 });
    const text = kind === 'started'
      ? `Nova conversa no site\n\nNome: ${thread.name}\nContacto: ${thread.contact || 'Não indicado'}\n\n${message.body}\n\nAbra a administração para responder: https://vastoimperio.pt/admin/conversas`
      : `Olá ${thread.name},\n\nRecebeu uma resposta à sua conversa no site:\n\n${message.body}\n\nPode responder diretamente a este email ou voltar ao chat em https://vastoimperio.pt.`;
    const content = signedEmail(text);
    content.html = content.html.replace('cid:vasto-signature-logo', 'https://vastoimperio.pt/favicon-google.png');
    const result = await transporter.sendMail({ from: { name: 'Vasto Império', address: env.SMTP_USER }, to, replyTo: kind === 'started' ? contactEmail(thread.contact) || 'geral@vastoimperio.pt' : 'geral@vastoimperio.pt', subject: kind === 'started' ? 'Nova conversa no site · Vasto Império' : 'Resposta à sua conversa · Vasto Império', ...content });
    if (result.rejected?.length || !result.accepted?.length) throw new Error('SMTP_REJECTED');
    return { status: 'sent' };
  } catch {
    // Never log credentials, message content or the visitor's contact details.
    console.error('[chat-email] Delivery failed:', kind);
    return { status: 'failed' };
  }
}
