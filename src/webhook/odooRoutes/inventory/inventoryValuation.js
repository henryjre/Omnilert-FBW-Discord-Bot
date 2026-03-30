const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");
// const { table } = require("table");
const fs = require("fs");
const path = require("path");

let client = null;

// const config = {
//   columns: {
//     0: { alignment: "center", width: 25 },
//     1: { alignment: "center", width: 25 },
//   },
// };

let webhookBatch = []; // Store incoming webhooks
let timer = null;
const TIMEOUT = 3000; // 3 seconds delay

const receiveValuation = (req, res) => {
  const {
    create_date,
    reference,
    x_uom_name,
    x_product_tmpl_id,
    quantity,
    x_company_name,
    x_product_name,
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
  });

  resetTimer(); // Reset the timer
  return res.status(200).json({ ok: true, message: "Webhook received" });
};

// ✅ AIC VALUATION FLAG
const processBatch = async () => {
  if (webhookBatch.length === 0) return;

  try {
    const filePath = path.resolve(__dirname, "../../../config/products.json");
    const threshold_data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const productById = new Map(
      threshold_data.map((product) => [Number(product.id), product])
    );

    const flaggedProducts = [];

    for (const webhook of webhookBatch) {
      const product_data = productById.get(Number(webhook.x_product_tmpl_id));

      if (!product_data) continue;

      const isFlagged = checkThreshold(
        webhook.quantity,
        product_data.threshold_value
      );

      if (!isFlagged) continue;

      flaggedProducts.push(normalizeFlaggedProduct(webhook, product_data));
    }

    const uniqueFlaggedProducts = dedupeFlaggedProducts(flaggedProducts);

    if (uniqueFlaggedProducts.length === 0) return;

    const lastEntry = uniqueFlaggedProducts.at(-1);

    const formattedTime = formatTime(lastEntry.create_date);
    // const timestampId = formatTimestamp(lastEntry.create_date);

    const targetChannel = getClient().channels.cache.get("1350859218474897468");
    if (!targetChannel) throw new Error("AIC discrepancy channel not found");

    // const newTable = generateTable(tableData);

    let description = "## 🚩 UNUSUAL DISCREPANCY DETECTED\n\u200b\n";
    for (const webhook of uniqueFlaggedProducts) {
      description += `> **Product:** ${webhook.x_product_name}\n`;
      description += `> **Quantity:** ${formatQuantityLine(
        webhook.quantity,
        webhook.x_uom_name
      )}`;
      description += `\n\u200b\n`;
    }

    const embed = new EmbedBuilder()
      .setDescription(description)
      .addFields(
        { name: "Date", value: `📆 | ${formattedTime}` },
        { name: "AIC Reference", value: `🔗 | ${lastEntry.reference}` },
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
      content: `<@&1336990783341068348>`,
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

///////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
  receiveValuation,
  normalizeFlaggedProduct,
  dedupeFlaggedProducts,
};

function getClient() {
  if (!client) {
    client = require("../../../index");
  }

  return client;
}

// ✅ Time Formatting Helper
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
      // Example: "+800" means value must be between [0, 800]
      return value < 0 || value > numericValue; // Flag if value is negative or exceeds 800
    } else if (threshold.endsWith("-")) {
      // Example: "-800" means value must be between [-800, 0]
      return value < numericValue || value > 0; // Flag if value is outside this range
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

function normalizeFlaggedProduct(webhook, productData = {}) {
  const productNameFallback = toDisplayValue(productData.name, "Unknown Product");
  const uomFallback = toDisplayValue(productData.uom_name, "N/A");

  return {
    ...webhook,
    x_product_name: toDisplayValue(webhook.x_product_name, productNameFallback),
    x_uom_name: toDisplayValue(webhook.x_uom_name, uomFallback),
    quantity: toDisplayValue(webhook.quantity, "N/A"),
  };
}

function buildDedupKey(webhook) {
  return [
    toDisplayValue(webhook.reference, "N/A"),
    toDisplayValue(webhook.create_date, "N/A"),
    toDisplayValue(webhook.x_company_name, "N/A"),
    toDisplayValue(webhook.x_product_tmpl_id, "N/A"),
    toDisplayValue(webhook.quantity, "N/A"),
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

function formatQuantityLine(quantity, uomName) {
  const normalizedQuantity = toDisplayValue(quantity, "N/A");
  const normalizedUom = toDisplayValue(uomName, "");

  return normalizedUom ? `${normalizedQuantity} ${normalizedUom}` : normalizedQuantity;
}

// function generateTable(data) {
//   return "```\n" + table(data, config).trim() + "\n```";
// }

function resetTimer() {
  if (timer) clearTimeout(timer); // Clear the previous timer

  timer = setTimeout(async () => {
    const result = await processBatch();
    console.log(result);
  }, TIMEOUT); // Start a new timer
}
