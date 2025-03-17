const { EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
const { table } = require("table");
const fs = require("fs");
const path = require("path");

const client = require("../../../index");

const config = {
  columns: {
    0: { alignment: "center", width: 50 },
    1: { alignment: "center", width: 10 },
    2: { alignment: "center", width: 5 },
  },
};

// ✅ AIC VALUATION FLAG
const receiveValuation = async (req, res) => {
  try {
    const {
      create_date,
      reference,
      x_uom_name,
      product_tmpl_id,
      quantity,
      x_company_name,
      x_product_name,
    } = req.body;

    console.log(req.body);

    const filePath = path.resolve(__dirname, "../../../config/products.json");
    const threshold_data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    const product_data = threshold_data.find((d) => d.id === product_tmpl_id);

    const isFlagged = checkThreshold(quantity, product_data.threshold_value);

    console.log(isFlagged);

    if (!isFlagged) return;

    const formattedTime = formatTime(create_date);
    const timestampId = formatTimestamp(create_date);

    const targetChannel = client.channels.cache.get("1350859218474897468");
    if (!targetChannel) throw new Error("AIC discrepancy channel not found");

    const channelMessages = await targetChannel.messages.fetch({
      limit: 100,
    });

    const targetMessage = channelMessages.find((msg) =>
      msg.content.includes(timestampId)
    );

    if (targetMessage) {
      let messageEmbed = targetMessage.embeds[0];
      let existingTable = extractTableFromEmbed(messageEmbed);
      existingTable.push([x_product_name, quantity.toString(), x_uom_name]);

      const updatedTable = generateTable(existingTable);
      messageEmbed.description = updatedTable;

      await targetMessage.edit({ embeds: [messageEmbed] });
      return res.status(200).json({ ok: true, message: "AIC flag updated" });
    }

    // ✅ Create and send new aic flag
    const tableData = [["Product Name", "Quantity", "Unit"]];
    tableData.push([x_product_name, quantity.toString(), x_uom_name]);

    const newTable = generateTable(tableData);

    const embed = new EmbedBuilder()
      .setTitle("🚩 UNUSUAL DISCREPANCY DETECTED")
      .setDescription(newTable)
      .addFields(
        { name: "Date", value: `📆 | ${formattedTime}` },
        { name: "AIC Reference", value: `🔗 | ${reference}` },
        { name: "Branch", value: `🛒 | ${x_company_name}` }
      )
      .setColor("Red");

    await attendanceChannel.send({
      content: `AIC ID: ${timestampId}`,
      embeds: [embed],
    });

    return res.status(200).json({ ok: true, message: "AIC flagged" });
  } catch (error) {
    console.error("Check-In Error:", error);
    return res.status(500).json({ ok: false, message: error.message });
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

function generateTable(data) {
  return "```\n" + table(data, config).trim() + "\n```";
}

function extractTableFromEmbed(embed) {
  if (!embed || !embed.description) return [];

  const rows = embed.description
    .split("\n")
    .filter((line) => line.includes("|")) // Only keep table rows
    .map(
      (row) =>
        row
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell.length > 0) // Remove empty cells
    );

  return rows;
}
