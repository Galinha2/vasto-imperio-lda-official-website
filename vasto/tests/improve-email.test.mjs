import test from 'node:test';
import assert from 'node:assert/strict';
import { improveEmailMessage } from '../lib/email/improve-message.mjs';

test('improves only the supplied draft using a server-side request without storing the response', async () => {
  const text = await improveEmailMessage('ola segue orçamento 500€', { apiKey: 'test-key', fetcher: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.input, 'ola segue orçamento 500€');
    assert.ok(!('tools' in body));
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Olá, segue o orçamento de 500€.' }] }] });
  } });
  assert.equal(text, 'Olá, segue o orçamento de 500€.');
});
test('missing configuration, invalid input, upstream errors and incomplete output do not return replacement text', async () => {
  await assert.rejects(improveEmailMessage('texto', { apiKey: '' }), { status: 503 });
  await assert.rejects(improveEmailMessage('', { apiKey: 'test' }), { status: 400 });
  await assert.rejects(improveEmailMessage('texto', { apiKey: 'test', fetcher: async () => new Response('', { status: 429 }) }), { status: 502 });
  await assert.rejects(improveEmailMessage('texto', { apiKey: 'test', fetcher: async () => Response.json({ status: 'incomplete', output: [] }) }), { status: 502 });
});
