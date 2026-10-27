import test from 'node:test';
import assert from 'node:assert/strict';
import { contactEmail, deliverChatEmail } from '../lib/chat-email.mjs';
const env = { SMTP_HOST:'smtp.test', SMTP_PORT:'465', SMTP_USER:'geral@example.com', SMTP_PASS:'test', RECEIVER_EMAIL:'admin@example.com' };
const thread = { name:'Ana <script>', contact:'ana@example.com' };
const message = { body:'Preciso de <ajuda>' };
test('email válido, um único destinatário e conteúdo escapado', async () => {
  assert.equal(contactEmail('928348117'), null);
  assert.equal(contactEmail('a@example.com,b@example.com'), null);
  assert.equal(contactEmail('a@example.com\r\nBcc: b@example.com'), null);
  const sent = [];
  const transporter = { sendMail: async options => { sent.push(options); return { accepted:[options.to], rejected:[] }; } };
  assert.equal((await deliverChatEmail({thread,message,kind:'started'}, {env,transporter})).status, 'sent');
  assert.equal(sent[0].to, env.RECEIVER_EMAIL);
  assert.equal(sent[0].replyTo, thread.contact);
  assert.ok(sent[0].html.includes('&lt;ajuda&gt;'));
  assert.equal((await deliverChatEmail({thread,message,kind:'reply'}, {env,transporter})).status, 'sent');
  assert.equal(sent[1].to, thread.contact);
  assert.equal(sent[1].replyTo, 'geral@vastoimperio.pt');
  assert.equal((await deliverChatEmail({thread:{...thread,contact:'928348117'},message,kind:'reply'}, {env,transporter})).status, 'no_email');
  assert.equal(sent.length, 2);
});
test('falha SMTP é reportada sem afirmar entrega nem tentar reenviar automaticamente', async () => {
  let attempts = 0;
  const transporter = { sendMail: async () => { attempts++; throw new Error('rejected'); } };
  assert.equal((await deliverChatEmail({thread,message,kind:'reply'}, {env,transporter})).status, 'failed');
  assert.equal(attempts, 1);
});
