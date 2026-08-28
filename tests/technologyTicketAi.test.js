const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyTechnologyTicket,
  sanitizeTicketTitle,
} = require('../src/utils/technologyTicketAi');

test('sanitizes generated ticket titles', () => {
  assert.equal(sanitizeTicketTitle('**Printer** | <@123>\nOffline'), 'Printer Offline');
  assert.equal(sanitizeTicketTitle(''), 'Technology Support Request');
});

test('uses schema-constrained AI classification output', async () => {
  let request;
  const client = {
    responses: {
      create: async (...args) => {
        request = args;
        return { output_text: JSON.stringify({ title: 'POS Session Will Not Close', category: 'Point of Sale' }) };
      },
    },
  };
  const result = await classifyTechnologyTicket('The POS session cannot close.', { client });
  assert.deepEqual(result, { title: 'POS Session Will Not Close', category: 'Point of Sale' });
  assert.equal(request[0].model, 'gpt-4o-mini');
  assert.equal(request[0].text.format.type, 'json_schema');
  assert.equal(request[0].text.format.strict, true);
  assert.equal(request[1].timeout, 10000);
});

test('falls back when AI output cannot be parsed', async () => {
  const client = { responses: { create: async () => ({ output_text: 'not-json' }) } };
  const result = await classifyTechnologyTicket('wifi down', { client });
  assert.deepEqual(result, { title: 'Technology Support Request', category: 'Other' });
});
