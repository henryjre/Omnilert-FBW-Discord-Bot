const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_ODOO_BASE_URL,
  normalizeOdooBaseUrl,
} = require('../src/config/odoo');

test('normalizeOdooBaseUrl uses the default Odoo host when unset', () => {
  assert.equal(normalizeOdooBaseUrl(''), DEFAULT_ODOO_BASE_URL);
});

test('normalizeOdooBaseUrl removes trailing slashes', () => {
  assert.equal(
    normalizeOdooBaseUrl('https://omnifnb.odoo.com///'),
    'https://omnifnb.odoo.com'
  );
});

test('normalizeOdooBaseUrl trims whitespace', () => {
  assert.equal(
    normalizeOdooBaseUrl('  https://omnifnb.odoo.com  '),
    'https://omnifnb.odoo.com'
  );
});
