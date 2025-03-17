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

const client = require("../../../index");

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
    product_tmpl_id,
    quantity,
    x_company_name,
    x_product_name,
  } = req.body;

  webhookBatch.push({
    create_date,
    reference, // Using `_id` as `reference`
    x_uom_name,
    product_tmpl_id,
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

    const flaggedProducts = [];

    for (const webhook of webhookBatch) {
      const product_data = threshold_data.find(
        (d) => d.id === webhook.product_tmpl_id
      );

      if (!product_data) continue;

      const isFlagged = checkThreshold(
        webhook.quantity,
        product_data.threshold_value
      );

      if (!isFlagged) continue;

      flaggedProducts.push(webhook);
    }

    if (flaggedProducts.length === 0) return;

    const lastEntry = flaggedProducts.at(-1);

    const formattedTime = formatTime(lastEntry.create_date);
    // const timestampId = formatTimestamp(lastEntry.create_date);

    const targetChannel = client.channels.cache.get("1350859218474897468");
    if (!targetChannel) throw new Error("AIC discrepancy channel not found");

    // const newTable = generateTable(tableData);

    let description = "**🚩 UNUSUAL DISCREPANCY DETECTED**\n\u200b\n";
    for (const webhook of webhookBatch) {
      description += `**Product:** ${webhook.x_product_name}\n`;
      description += `**Quantity:** ${webhook.quantity} ${webhook.x_uom_name}\n\u200b\n`;
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

module.exports = { receiveValuation };

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
    if (threshold.includes("+")) {
      // Handle positive values that cannot be negative
      const [min, max] = [0, parseInt(threshold)];
      return value < min || value > max;
    } else if (threshold.includes("-")) {
      // Handle negative values that cannot be positive
      const numericThreshold = parseInt(threshold);
      return value < numericThreshold || value > 0;
    }
  } else if (typeof threshold === "number") {
    // Handle direct numeric threshold (e.g., just 10 or -10)
    return value > threshold || value < -threshold;
  }

  return false; // Default case if threshold format is unknown
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
