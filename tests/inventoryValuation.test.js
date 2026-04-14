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

test("normalizeFlaggedProduct uses webhook-only fallback when name and uom are false", () => {
  const webhook = {
    x_product_name: false,
    x_uom_name: false,
    quantity: 100,
    x_aic_threshold: false,
  };

  const normalized = inventoryValuation.normalizeFlaggedProduct(webhook);

  assert.equal(normalized.x_product_name, "Unknown Product");
  assert.equal(normalized.x_uom_name, "N/A");
  assert.equal(normalized.x_aic_threshold, "0");
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

test("normalizeFlaggedProduct marks discrepancy as negative when destination is inventory adjustment", () => {
  const webhook = {
    x_destination_name: "Virtual Locations/Inventory adjustment",
    x_source_name: "WH/Stock",
    quantity: 90,
  };

  const normalized = inventoryValuation.normalizeFlaggedProduct(webhook);

  assert.equal(normalized.discrepancy_direction, "negative");
});

test("normalizeFlaggedProduct marks discrepancy as positive when source is inventory adjustment", () => {
  const webhook = {
    x_destination_name: "WH/Stock",
    x_source_name: "Virtual Locations/Inventory adjustment",
    quantity: 30,
  };

  const normalized = inventoryValuation.normalizeFlaggedProduct(webhook);

  assert.equal(normalized.discrepancy_direction, "positive");
});

test("normalizeFlaggedProduct falls back to numeric sign when no inventory adjustment location is present", () => {
  const webhook = {
    x_destination_name: "WH/Stock",
    x_source_name: "WH/Input",
    quantity: -20,
  };

  const normalized = inventoryValuation.normalizeFlaggedProduct(webhook);

  assert.equal(normalized.discrepancy_direction, "negative");
});

test("evaluateThreshold treats false-like thresholds as zero", () => {
  const falseResult = inventoryValuation.evaluateThreshold(1, false);
  const stringFalseResult = inventoryValuation.evaluateThreshold(1, "false");
  const emptyResult = inventoryValuation.evaluateThreshold(1, "");

  assert.equal(falseResult.status, "threshold_violation");
  assert.equal(falseResult.thresholdValue, "0");
  assert.equal(stringFalseResult.status, "threshold_violation");
  assert.equal(stringFalseResult.thresholdValue, "0");
  assert.equal(emptyResult.status, "threshold_violation");
  assert.equal(emptyResult.thresholdValue, "0");
});

test("evaluateThreshold uses symmetric numeric thresholds", () => {
  assert.equal(
    inventoryValuation.evaluateThreshold(90, "100").status,
    "normal"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(101, "100").status,
    "threshold_violation"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(-101, "100").status,
    "threshold_violation"
  );
});

test("evaluateThreshold uses + thresholds for positive-only ranges", () => {
  assert.equal(
    inventoryValuation.evaluateThreshold(80, "+100").status,
    "normal"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(-1, "+100").status,
    "threshold_violation"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(101, "+100").status,
    "threshold_violation"
  );
});

test("evaluateThreshold uses - thresholds for negative-only ranges", () => {
  assert.equal(
    inventoryValuation.evaluateThreshold(-80, "-100").status,
    "normal"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(-101, "-100").status,
    "threshold_violation"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(1, "-100").status,
    "threshold_violation"
  );
});

test("evaluateThreshold marks malformed thresholds as invalid", () => {
  assert.equal(
    inventoryValuation.evaluateThreshold(10, "abc").status,
    "invalid_threshold"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(10, "++100").status,
    "invalid_threshold"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(10, "+").status,
    "invalid_threshold"
  );
  assert.equal(
    inventoryValuation.evaluateThreshold(10, "--50").status,
    "invalid_threshold"
  );
});

test("buildDiscrepancyDescription separates shortage, surplus, and invalid threshold sections", () => {
  const description = inventoryValuation.buildDiscrepancyDescription([
    {
      x_product_name: "SPK1 - Famous Mix",
      quantity: "90",
      x_uom_name: "kg",
      discrepancy_direction: "negative",
      threshold_status: "threshold_violation",
    },
    {
      x_product_name: "SPK1 - Famous Brown Bag #4",
      quantity: "100",
      x_uom_name: "pc",
      discrepancy_direction: "positive",
      threshold_status: "threshold_violation",
    },
    {
      x_product_name: "SPK1 - Chocolate",
      quantity: "30",
      x_uom_name: "g",
      x_aic_threshold: "abc",
      discrepancy_direction: "positive",
      threshold_status: "invalid_threshold",
    },
  ]);

  assert.equal(description.includes("Stock Shortage"), true);
  assert.equal(description.includes("Stock Surplus"), true);
  assert.equal(description.includes("Invalid Threshold"), true);
  assert.equal(description.includes("> **Quantity:** -90 kg"), true);
  assert.equal(description.includes("> **Quantity:** +100 pc"), true);
  assert.equal(description.includes("> **Quantity:** +30 g"), true);
  assert.equal(description.includes("> **Threshold:** abc"), true);
  assert.equal(
    description.indexOf("Stock Surplus") < description.indexOf("Invalid Threshold"),
    true
  );
});

test("buildDiscrepancyDescription omits the invalid threshold section when there are no invalid entries", () => {
  const description = inventoryValuation.buildDiscrepancyDescription([
    {
      x_product_name: "SPK1 - Famous Mix",
      quantity: "90",
      x_uom_name: "kg",
      discrepancy_direction: "negative",
      threshold_status: "threshold_violation",
    },
  ]);

  assert.equal(description.includes("Invalid Threshold"), false);
});
