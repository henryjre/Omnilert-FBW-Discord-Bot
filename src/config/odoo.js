const DEFAULT_ODOO_BASE_URL = 'https://omnifnb.odoo.com';

function normalizeOdooBaseUrl(rawUrl = process.env.ODOO_BASE_URL) {
  const baseUrl = rawUrl?.trim() || DEFAULT_ODOO_BASE_URL;
  return baseUrl.replace(/\/+$/, '');
}

function getOdooBaseUrl() {
  return normalizeOdooBaseUrl();
}

function getOdooJsonRpcUrl() {
  return `${getOdooBaseUrl()}/jsonrpc`;
}

function getOdooWebhookUrl(secret) {
  return `${getOdooBaseUrl()}/web/hook/${secret}`;
}

module.exports = {
  DEFAULT_ODOO_BASE_URL,
  getOdooBaseUrl,
  getOdooJsonRpcUrl,
  getOdooWebhookUrl,
  normalizeOdooBaseUrl,
};
