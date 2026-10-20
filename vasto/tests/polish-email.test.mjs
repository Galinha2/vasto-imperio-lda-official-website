import test from 'node:test';
import assert from 'node:assert/strict';
import { polishEmailMessage } from '../lib/email/polish-message.mjs';

test('polishes common draft expressions locally and remains stable when repeated', () => {
  const text = polishEmailMessage('  bom dia, aqui vai o orcamento pedido. qualquer duvida diga  ');
  assert.ok(text.startsWith('Bom dia,\n\n'));
  assert.match(text, /segue em anexo o orçamento/i);
  assert.match(text, /estou disponível para esclarecer/);
  assert.equal(polishEmailMessage(text), text);
});
test('preserves prices, measurements, references, email addresses, URLs and negations', () => {
  const text = polishEmailMessage('nao inclui montagem. 1.250,50€; 10%; 2,70 m; ref 3.12.500; prazo 20/10/2026\ngeral@vastoimperio.pt\nhttps://vastoimperio.pt/produto?ref=3.12');
  for (const value of ['1.250,50€', '10%', '2,70 m', '3.12.500', '20/10/2026', 'geral@vastoimperio.pt', 'https://vastoimperio.pt/produto?ref=3.12']) assert.ok(text.includes(value));
  assert.match(text, /Não inclui montagem/);
  assert.equal(polishEmailMessage(''), '');
});
