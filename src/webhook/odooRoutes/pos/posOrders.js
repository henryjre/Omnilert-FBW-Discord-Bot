const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");
const client = require("../../../index.js");
const moment = require("moment-timezone");
const departments = require("../../../config/departments.json");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const auditPercentChance = 0.15;

const auditQueueChannelId = "1423573262641922149";
const auditProcessingChannelId = "1423597801643708576";

// SERVICE QA AUDIT
const orderAudit = async (req, res) => {
  const {
    amount_total,
    cashier,
    company_id,
    date_order,
    id,
    pos_reference,
    x_company_name,
    x_discord_id,
    x_customer_discord_id,
    x_order_lines,
    x_payments,
    x_session_name,
  } = req.body;

  if (!shouldPushThrough()) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  try {
    const department = departments.find((d) => d.id === company_id);

    if (!department) throw new Error("Department not found");

    const readableDate = formatDateTime(date_order);

    let orderLinesMessage = "";
    for (const order of x_order_lines) {
      orderLinesMessage += `> **Name:** ${order.product_name}\n`;
      orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
      orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
        order.price_unit
      )}`;
      orderLinesMessage += `\n\n`;
    }

    const fields = [
      { name: "Session Name", value: x_session_name },
      { name: "Order Reference", value: pos_reference },
      { name: "Branch", value: department.name },
      { name: "Order Date", value: readableDate },
      {
        name: "Cashier",
        value: cashier,
      },
      {
        name: "Cashier Discord User",
        value: `<@${x_discord_id}>`,
      },
      ...(x_customer_discord_id
        ? [
            {
              name: "Customer",
              value: `<@${x_customer_discord_id}>`,
            },
          ]
        : []),
      {
        name: "Products",
        value: orderLinesMessage,
      },
      {
        name: "Order Total",
        value: pesoFormatter.format(amount_total),
      },
    ];

    const orderEmbed = new EmbedBuilder()
      .setDescription(`## 📑 Service QA Audit`)
      .setColor("Yellow")
      .addFields(fields)
      .setTimestamp(toDiscordTimestamp(date_order));

    const getAudit = new ButtonBuilder()
      .setCustomId("auditClaim")
      .setLabel("Claim Audit")
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(getAudit);

    const auditQueueChannel = client.channels.cache.get(auditQueueChannelId);

    await auditQueueChannel.send({
      embeds: [orderEmbed],
      components: [buttonRow],
    });

    return res.status(200).json({ ok: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error in orderAudit", error.message);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////
////////////////////// EXPORTS  ////////////////////////////
////////////////////////////////////////////////////////////

module.exports = {
  orderAudit,
};

////////////////////////////////////////////////////////////
////////////////////// HELPER FUNCTIONS ////////////////////
////////////////////////////////////////////////////////////

function shouldPushThrough() {
  return Math.random() < auditPercentChance;
}

function formatDateTime(datetime) {
  if (!datetime) return null;
  return moment
    .utc(datetime, "YYYY-MM-DD HH:mm:ss")
    .tz("Asia/Manila")
    .format("MMMM DD, YYYY [at] h:mm A");
}

function toDiscordTimestamp(datetime) {
  if (!datetime) return null;

  return moment.utc(datetime, "YYYY-MM-DD HH:mm:ss").tz("Asia/Manila").toDate();
}
