import test from "node:test";
import assert from "node:assert/strict";
import { signedEmail, emailSignature } from "../lib/email/signature.mjs";
test("signature includes clickable contacts and an embedded logo", () => {
  const result = signedEmail("Bom dia,\nSegue orçamento.");
  assert.match(result.html, /cid:vasto-signature-logo/);
  assert.match(result.html, /tel:\+351928348117/);
  assert.match(result.html, /mailto:geral@vastoimperio.pt/);
  assert.match(result.text, /Henrique Galinha/);
  assert.match(result.text, /2475-014/);
});
test("message markup is escaped and preview uses the local logo", () => {
  const result = signedEmail('<script>alert("test")</script>');
  assert.ok(!result.html.includes("<script>"));
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(emailSignature("/logo.png"), /src="\/logo.png"/);
});

test('closing is part of the signature and is not repeated when already at the end of the draft', () => {
  const result = signedEmail('Bom dia,\nSegue orçamento.\n\nCom os melhores cumprimentos,');
  assert.equal((result.text.match(/Com os melhores cumprimentos,/g) || []).length, 1);
  assert.equal((result.html.match(/Com os melhores cumprimentos,/g) || []).length, 1);
  assert.match(emailSignature('/logo.png'), /Com os melhores cumprimentos,/);
});
