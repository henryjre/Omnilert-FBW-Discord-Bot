const { getOpenAIClient } = require('../openai');

const TECHNOLOGY_TICKET_CATEGORIES = [
  'Account & Access',
  'Hardware',
  'Software & Applications',
  'Network & Internet',
  'Point of Sale',
  'Omnilert Portal',
  'Email & Communication',
  'Security',
  'Other',
];
const DEFAULT_CLASSIFICATION = Object.freeze({
  title: 'Technology Support Request',
  category: 'Other',
});

function sanitizeTicketTitle(value) {
  const normalized = String(value || '')
    .replace(/<[@#&!]?\d+>/g, '')
    .replace(/[`*_~|>#\[\]{}\\]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const eightWordsMaximum = normalized.split(' ').slice(0, 8).join(' ');
  const sanitized = [...eightWordsMaximum].slice(0, 50).join('').trim();
  return sanitized || DEFAULT_CLASSIFICATION.title;
}

async function classifyTechnologyTicket(description, options = {}) {
  const client = options.client || getOpenAIClient();

  try {
    const response = await client.responses.create(
      {
        model: 'gpt-4o-mini',
        instructions: [
          'Classify a technology help ticket and create a short factual title.',
          'Use only details stated by the requester; never invent details.',
          'The title must be plain text, four to eight words when practical, and no more than 50 characters.',
          'Choose exactly one category from the provided enum. Use Other when the description is ambiguous.',
          'Point of Sale is for POS terminals, transactions, sessions, receipts, and POS-specific access.',
          'Omnilert Portal is for the internal company platform.',
          'Hardware is for physical device failures; Network & Internet is for connectivity as the primary issue.',
        ].join(' '),
        input: description,
        max_output_tokens: 120,
        text: {
          format: {
            type: 'json_schema',
            name: 'technology_ticket_classification',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                title: { type: 'string' },
                category: { type: 'string', enum: TECHNOLOGY_TICKET_CATEGORIES },
              },
              required: ['title', 'category'],
            },
          },
        },
      },
      { timeout: 5000 }
    );

    const parsed = JSON.parse(response.output_text || '{}');
    const category = TECHNOLOGY_TICKET_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : DEFAULT_CLASSIFICATION.category;
    return { title: sanitizeTicketTitle(parsed.title), category };
  } catch (error) {
    console.error('Technology ticket AI classification failed:', error.message);
    return { ...DEFAULT_CLASSIFICATION };
  }
}

module.exports = {
  TECHNOLOGY_TICKET_CATEGORIES,
  DEFAULT_CLASSIFICATION,
  sanitizeTicketTitle,
  classifyTechnologyTicket,
};
