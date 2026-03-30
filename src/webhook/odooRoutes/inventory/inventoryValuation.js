const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");
const fs = require("fs");
const path = require("path");

let client = null;

let webhookBatch = []; // Store incoming webhooks
let timer = null;
const TIMEOUT = 3000; // 3 seconds delay
const AIC_DISCREPANCY_CHANNEL_ID = "1350859218474897468";
const AIC_DISCREPANCY_ROLE_ID = "1336990783341068348";

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
  } = req.body;

  if (typeof reference !== "string") {
    return res.status(400).json({ ok: false, message: "Invalid reference" });
  }

  if (reference.startsWith("UB/")) {
    return res.status(200).json({ ok: false, message: "Invalid reference" });
  }

  console.log(req.body);

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
  });

  resetTimer(); // Reset the timer
  return res.status(200).json({ ok: true, message: "Webhook received" });
};

// AIC valuation flag
const processBatch = async () => {
  if (webhookBatch.length === 0) return;

  try {
    const filePath = path.resolve(__dirname, "../../../config/products.json");
    const thresholdData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const productById = new Map(
      thresholdData.map((product) => [Number(product.id), product])
    );

    const flaggedProducts = [];

    for (const webhook of webhookBatch) {
      const productData = productById.get(Number(webhook.x_product_tmpl_id));
      if (!productData) continue;

      const isFlagged = checkThreshold(webhook.quantity, productData.threshold_value);
      if (!isFlagged) continue;

      flaggedProducts.push(normalizeFlaggedProduct(webhook, productData));
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
        { name: "Date", value: `| ${formattedTime}` },
        { name: "AIC Reference", value: `| ${lastEntry.reference}` },
        { name: "Branch", value: `| ${lastEntry.x_company_name}` }
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
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss", "UTC")
    .tz("Asia/Manila")
    .format("MMMM D, YYYY [at] h:mm A");
}

function formatTimestamp(rawTime) {
  return moment
    .tz(rawTime, "YYYY-MM-DD HH:mm:ss.SSSSSS", "Asia/Manila")
    .valueOf();
}

function checkThreshold(value, threshold) {
  if (typeof threshold === "string") {
    const numericValue = parseInt(threshold, 10);

    if (threshold.endsWith("+")) {
      // Example: "800+" means value must be between [0, 800]
      return value < 0 || value > numericValue;
    }

    if (threshold.endsWith("-")) {
      // Example: "800-" means value must be between [-800, 0]
      return value < numericValue || value > 0;
    }
  } else if (typeof threshold === "number") {
    // Example: 800 means symmetric threshold [-800, 800]
    return Math.abs(value) > threshold;
  }

  return false; // Default case if threshold format is unknown
}

function toDisplayValue(value, fallback = "N/A") {
  if (value === false || value === null || value === undefined) return fallback;

  const stringValue = String(value).trim();
  if (stringValue.length === 0) return fallback;
  if (stringValue.toLowerCase() === "false") return fallback;

  return stringValue;
}

function hasDisplayValue(value) {
  return toDisplayValue(value, "") !== "";
}

function resolveDiscrepancyDirection(webhook) {
  const hasDestination = hasDisplayValue(webhook.x_destination_name);
  const hasSource = hasDisplayValue(webhook.x_source_name);

  if (hasSource && !hasDestination) return "positive";
  if (hasDestination && !hasSource) return "negative";

  if (hasSource) return "positive";
  if (hasDestination) return "negative";

  const numericQuantity = Number(webhook.quantity);
  if (Number.isFinite(numericQuantity)) {
    if (numericQuantity < 0) return "negative";
    if (numericQuantity > 0) return "positive";
  }

  return "neutral";
}

function normalizeFlaggedProduct(webhook, productData = {}) {
  const productNameFallback = toDisplayValue(productData.name, "Unknown Product");
  const uomFallback = toDisplayValue(productData.uom_name, "N/A");
  const destinationName = toDisplayValue(webhook.x_destination_name, "");
  const sourceName = toDisplayValue(webhook.x_source_name, "");

  return {
    ...webhook,
    x_product_name: toDisplayValue(webhook.x_product_name, productNameFallback),
    x_uom_name: toDisplayValue(webhook.x_uom_name, uomFallback),
    quantity: toDisplayValue(webhook.quantity, "N/A"),
    x_destination_name: destinationName,
    x_source_name: sourceName,
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

  for (const webhook of flaggedProducts) {
    if (webhook.discrepancy_direction === "negative") {
      shortages.push(webhook);
      continue;
    }

    if (webhook.discrepancy_direction === "positive") {
      surpluses.push(webhook);
    }
  }

  return { shortages, surpluses };
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

function buildDiscrepancyDescription(flaggedProducts = []) {
  const { shortages, surpluses } = groupDiscrepancyProducts(flaggedProducts);
  let description = "## UNUSUAL DISCREPANCY DETECTED\n\u200b\n";

  description += buildDiscrepancySection("Stock Shortage", shortages, "negative");
  description += buildDiscrepancySection("Stock Surplus", surpluses, "positive");

  return description;
}

function resetTimer() {
  if (timer) clearTimeout(timer); // Clear the previous timer

  timer = setTimeout(async () => {
    const result = await processBatch();
    console.log(result);
  }, TIMEOUT); // Start a new timer
}
