const test = require("node:test");
const assert = require("node:assert/strict");

const indexPath = require.resolve("../src/index.js");
require.cache[indexPath] = {
  id: indexPath,
  filename: indexPath,
  loaded: true,
  exports: {
    channels: {
      cache: new Map(),
    },
  },
};

const inventoryValuation = require("../src/webhook/odooRoutes/inventory/inventoryValuation");

test("normalizeFlaggedProduct uses config fallback when webhook sends false for name and uom", () => {
  const webhook = {
    x_product_name: false,
    x_uom_name: false,
    quantity: 100,
  };
  const productData = {
    name: "SPK1 - Famous Brown Bag #4",
    uom_name: "pc",
  };

  const normalized = inventoryValuation.normalizeFlaggedProduct(webhook, productData);

  assert.equal(normalized.x_product_name, "SPK1 - Famous Brown Bag #4");
  assert.equal(normalized.x_uom_name, "pc");
  assert.equal(normalized.quantity, "100");
});

test("dedupeFlaggedProducts removes duplicate rows from repeated deliveries", () => {
  const duplicateRows = [
    {
      reference: "IV/2026/001",
      create_date: "2026-03-30 07:00:00",
      x_company_name: "Famous Branch",
      x_product_tmpl_id: 1198,
      quantity: "100",
      x_product_name: "SPK1 - Famous Brown Bag #4",
      x_uom_name: "pc",
    },
    {
      reference: "IV/2026/001",
      create_date: "2026-03-30 07:00:00",
      x_company_name: "Famous Branch",
      x_product_tmpl_id: 1198,
      quantity: "100",
      x_product_name: "SPK1 - Famous Brown Bag #4",
      x_uom_name: "pc",
    },
  ];

  const deduped = inventoryValuation.dedupeFlaggedProducts(duplicateRows);

  assert.equal(deduped.length, 1);
  assert.deepEqual(deduped[0], duplicateRows[0]);
});
