const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");

let client = null;

let webhookBatch = []; // Store incoming webhooks
let timer = null;
const TIMEOUT = 3000; // 3 seconds delay
const INVENTORY_ADJUSTMENT_LOCATION = "virtual locations/inventory adjustment";
const AIC_DISCREPANCY_CHANNEL_ID = "1350859218474897468";
const AIC_DISCREPANCY_ROLE_ID = "1336990783341068348";
const THRESHOLD_STATUS = {
  NORMAL: "normal",
  THRESHOLD_VIOLATION: "threshold_violation",
  INVALID: "invalid_threshold",
};

const receiveValuation = (req, res) => {
  const {
    create_date,
    reference,
    x_uom_name,
    x_product_tmpl_id,
    quantity,
    x_company_name,
    x_product_name,
    x_destination_name,
    x_source_name,
    x_aic_threshold,
  } = req.body;

  if (typeof reference !== "string") {
    return res.status(400).json({ ok: false, message: "Invalid reference" });
  }

  if (reference.startsWith("UB/")) {
    return res.status(200).json({ ok: false, message: "Invalid reference" });
  }

  webhookBatch.push({
    create_date,
    reference,
    x_uom_name,
    x_product_tmpl_id,
    quantity,
    x_company_name,
    x_product_name,
    x_destination_name,
    x_source_name,
    x_aic_threshold,
  });

  resetTimer(); // Reset the timer
  return res.status(200).json({ ok: true, message: "Webhook received" });
};

// AIC valuation flag
const processBatch = async () => {
  if (webhookBatch.length === 0) return;

  try {
    const flaggedProducts = [];

    for (const webhook of webhookBatch) {
      const thresholdEvaluation = evaluateThreshold(
        webhook.quantity,
        webhook.x_aic_threshold
      );
      if (thresholdEvaluation.status === THRESHOLD_STATUS.NORMAL) continue;

      flaggedProducts.push(
        normalizeFlaggedProduct(webhook, {
          threshold_status: thresholdEvaluation.status,
        })
      );
    }

    const uniqueFlaggedProducts = dedupeFlaggedProducts(flaggedProducts);
    if (uniqueFlaggedProducts.length === 0) return;

    const lastEntry = uniqueFlaggedProducts.at(-1);
    const formattedTime = formatTime(lastEntry.create_date);

    const targetChannel = getClient().channels.cache.get(AIC_DISCREPANCY_CHANNEL_ID);
    if (!targetChannel) throw new Error("AIC discrepancy channel not found");

    const description = buildDiscrepancyDescription(uniqueFlaggedProducts);

    const embed = new EmbedBuilder()
      .setDescription(description)
      .addFields(
        { name: "Date", value: `📅 | ${formattedTime}` },
        { name: "AIC Reference", value: `📦 | ${lastEntry.reference}` },
        { name: "Branch", value: `🛒 | ${lastEntry.x_company_name}` }
      )
      .setColor("Red");

    const discussButton = new ButtonBuilder()
      .setCustomId("aicDiscussButton")
      .setLabel("Open Discussion")
      .setStyle(ButtonStyle.Primary);
    const resolveButton = new ButtonBuilder()
      .setCustomId("aicResolveButton")
      .setLabel("Resolve")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(
      resolveButton,
      discussButton
    );

    await targetChannel.send({
      content: `<@&${AIC_DISCREPANCY_ROLE_ID}>`,
      embeds: [embed],
      components: [buttonRow],
    });

    webhookBatch = [];

    return { ok: true, message: "AIC flagged" };
  } catch (error) {
    webhookBatch = [];
    console.error("Check-In Error:", error);
    return { ok: false, message: error.message };
  }
};

module.exports = {
  receiveValuation,
  evaluateThreshold,
  normalizeFlaggedProduct,
  dedupeFlaggedProducts,
  buildDiscrepancyDescription,
};

function getClient() {
  if (!client) {
    client = require("../../../index");
  }

  return client;
}

// Time formatting helper
function formatTime(rawTime) {
  return moment
    .tz(
      rawTime,
      ["YYYY-MM-DD HH:mm:ss.SSSSSS", "YYYY-MM-DD HH:mm:ss"],
      "UTC"
    )
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");
}

function formatTimestamp(rawTime) {
  return moment
    .tz(
      rawTime,
      ["YYYY-MM-DD HH:mm:ss.SSSSSS", "YYYY-MM-DD HH:mm:ss"],
      "Asia/Manila"
    )
    .valueOf();
}

function toDisplayValue(value, fallback = "N/A") {
  if (value === false || value === null || value === undefined) return fallback;

  const stringValue = String(value).trim();
  if (stringValue.length === 0) return fallback;
  if (stringValue.toLowerCase() === "false") return fallback;

  return stringValue;
}

function toThresholdDisplayValue(value) {
  return toDisplayValue(value, "0");
}

function parseThreshold(threshold) {
  const normalizedThreshold = toThresholdDisplayValue(threshold);

  if (/^\d+(?:\.\d+)?$/.test(normalizedThreshold)) {
    return {
      status: "valid",
      mode: "symmetric",
      numericValue: Number(normalizedThreshold),
      displayValue: normalizedThreshold,
    };
  }

  if (/^\+\d+(?:\.\d+)?$/.test(normalizedThreshold)) {
    return {
      status: "valid",
      mode: "positive",
      numericValue: Number(normalizedThreshold.slice(1)),
      displayValue: normalizedThreshold,
    };
  }

  if (/^-\d+(?:\.\d+)?$/.test(normalizedThreshold)) {
    return {
      status: "valid",
      mode: "negative",
      numericValue: Number(normalizedThreshold.slice(1)),
      displayValue: normalizedThreshold,
    };
  }

  return {
    status: THRESHOLD_STATUS.INVALID,
    displayValue: normalizedThreshold,
  };
}

function evaluateThreshold(value, threshold) {
  const parsedThreshold = parseThreshold(threshold);
  if (parsedThreshold.status === THRESHOLD_STATUS.INVALID) {
    return {
      status: THRESHOLD_STATUS.INVALID,
      thresholdValue: parsedThreshold.displayValue,
    };
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return {
      status: THRESHOLD_STATUS.NORMAL,
      thresholdValue: toThresholdDisplayValue(threshold),
    };
  }

  if (parsedThreshold.mode === "positive") {
    return {
      status:
        numericValue < 0 || numericValue > parsedThreshold.numericValue
          ? THRESHOLD_STATUS.THRESHOLD_VIOLATION
          : THRESHOLD_STATUS.NORMAL,
      thresholdValue: parsedThreshold.displayValue,
    };
  }

  if (parsedThreshold.mode === "negative") {
    return {
      status:
        numericValue < -parsedThreshold.numericValue || numericValue > 0
          ? THRESHOLD_STATUS.THRESHOLD_VIOLATION
          : THRESHOLD_STATUS.NORMAL,
      thresholdValue: parsedThreshold.displayValue,
    };
  }

  return {
    status:
      Math.abs(numericValue) > parsedThreshold.numericValue
        ? THRESHOLD_STATUS.THRESHOLD_VIOLATION
        : THRESHOLD_STATUS.NORMAL,
    thresholdValue: parsedThreshold.displayValue,
  };
}

function isInventoryAdjustmentLocation(locationName) {
  return (
    toDisplayValue(locationName, "").toLowerCase() ===
    INVENTORY_ADJUSTMENT_LOCATION
  );
}

function resolveDiscrepancyDirection(webhook) {
  const destinationName = toDisplayValue(webhook.x_destination_name, "");
  const sourceName = toDisplayValue(webhook.x_source_name, "");

  if (isInventoryAdjustmentLocation(destinationName)) return "negative";
  if (isInventoryAdjustmentLocation(sourceName)) return "positive";

  const numericQuantity = Number(webhook.quantity);
  if (Number.isFinite(numericQuantity)) {
    if (numericQuantity < 0) return "negative";
    if (numericQuantity > 0) return "positive";
  }

  return "neutral";
}

function normalizeFlaggedProduct(webhook, options = {}) {
  const destinationName = toDisplayValue(webhook.x_destination_name, "");
  const sourceName = toDisplayValue(webhook.x_source_name, "");

  return {
    ...webhook,
    x_product_name: toDisplayValue(webhook.x_product_name, "Unknown Product"),
    x_uom_name: toDisplayValue(webhook.x_uom_name, "N/A"),
    x_aic_threshold: toThresholdDisplayValue(webhook.x_aic_threshold),
    quantity: toDisplayValue(webhook.quantity, "N/A"),
    x_destination_name: destinationName,
    x_source_name: sourceName,
    threshold_status: toDisplayValue(
      options.threshold_status,
      THRESHOLD_STATUS.THRESHOLD_VIOLATION
    ),
    discrepancy_direction: resolveDiscrepancyDirection({
      ...webhook,
      x_destination_name: destinationName,
      x_source_name: sourceName,
    }),
  };
}

function buildDedupKey(webhook) {
  return [
    toDisplayValue(webhook.reference, "N/A"),
    toDisplayValue(webhook.create_date, "N/A"),
    toDisplayValue(webhook.x_company_name, "N/A"),
    toDisplayValue(webhook.x_product_tmpl_id, "N/A"),
    toDisplayValue(webhook.quantity, "N/A"),
    toDisplayValue(webhook.discrepancy_direction, "neutral"),
    toDisplayValue(webhook.threshold_status, THRESHOLD_STATUS.THRESHOLD_VIOLATION),
    toThresholdDisplayValue(webhook.x_aic_threshold),
  ].join("|");
}

function dedupeFlaggedProducts(flaggedProducts = []) {
  const uniqueProducts = new Map();

  for (const webhook of flaggedProducts) {
    const dedupeKey = buildDedupKey(webhook);
    if (uniqueProducts.has(dedupeKey)) continue;

    uniqueProducts.set(dedupeKey, webhook);
  }

  return Array.from(uniqueProducts.values());
}

function groupDiscrepancyProducts(flaggedProducts = []) {
  const shortages = [];
  const surpluses = [];
  const invalidThresholds = [];

  for (const webhook of flaggedProducts) {
    if (webhook.threshold_status === THRESHOLD_STATUS.INVALID) {
      invalidThresholds.push(webhook);
      continue;
    }

    if (webhook.discrepancy_direction === "negative") {
      shortages.push(webhook);
      continue;
    }

    if (webhook.discrepancy_direction === "positive") {
      surpluses.push(webhook);
    }
  }

  return { shortages, surpluses, invalidThresholds };
}

function formatQuantityLine(quantity, uomName, direction = "neutral") {
  const normalizedUom = toDisplayValue(uomName, "");
  const numericQuantity = Number(quantity);
  const isNumericQuantity = Number.isFinite(numericQuantity);
  const quantityBase = isNumericQuantity
    ? String(Math.abs(numericQuantity))
    : toDisplayValue(quantity, "N/A").replace(/^[+-]/, "");

  let signedQuantity = quantityBase;
  if (direction === "negative") signedQuantity = `-${quantityBase}`;
  if (direction === "positive") signedQuantity = `+${quantityBase}`;

  return normalizedUom ? `${signedQuantity} ${normalizedUom}` : signedQuantity;
}

function buildDiscrepancySection(title, products, direction) {
  let section = `### ${title}\n`;

  if (products.length === 0) {
    section += "> _No entries_\n";
    section += "\u200b\n";
    return section;
  }

  for (const webhook of products) {
    section += `> **Product:** ${webhook.x_product_name}\n`;
    section += `> **Quantity:** ${formatQuantityLine(
      webhook.quantity,
      webhook.x_uom_name,
      direction
    )}`;
    section += `\n\u200b\n`;
  }

  return section;
}

function buildInvalidThresholdSection(products = []) {
  if (products.length === 0) return "";

  let section = "### 🟡 Invalid Threshold\n";

  for (const webhook of products) {
    section += `> **Product:** ${webhook.x_product_name}\n`;
    section += `> **Quantity:** ${formatQuantityLine(
      webhook.quantity,
      webhook.x_uom_name,
      webhook.discrepancy_direction
    )}\n`;
    section += `> **Threshold:** ${webhook.x_aic_threshold}\n`;
    section += "\u200b\n";
  }

  return section;
}

function buildDiscrepancyDescription(flaggedProducts = []) {
  const { shortages, surpluses, invalidThresholds } =
    groupDiscrepancyProducts(flaggedProducts);
  let description = "## 🚩 UNUSUAL DISCREPANCY DETECTED\n\u200b\n";

  description += buildDiscrepancySection("🔴 Stock Shortage", shortages, "negative");
  description += buildDiscrepancySection("🟢 Stock Surplus", surpluses, "positive");
  description += buildInvalidThresholdSection(invalidThresholds);

  return description;
}

function resetTimer() {
  if (timer) clearTimeout(timer); // Clear the previous timer

  timer = setTimeout(async () => {
    const result = await processBatch();
    console.log(result);
  }, TIMEOUT); // Start a new timer
}
