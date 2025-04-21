const {
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const moment = require("moment-timezone");

const client = require("../../../index.js");
const { content } = require("googleapis/build/src/apis/content/index.js");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const sessionChannelId = "1357021400363303143";
const verificationChannelId = "1363852188966846674";

const departments = [
  { id: 1, name: "DHVSU Bacolor", role: "1336992007910068225" },
  { id: 4, name: "Primark Center Guagua", role: "1336992011525558312" },
  { id: 5, name: "Robinsons Starmills CSFP", role: "1336992014545190933" },
  { id: 6, name: "Main Omnilert", role: null },
  { id: 7, name: "JASA Hiway Guagua", role: "1336991998791385129" },
];

// ✅ Employee Check-In
const sessionOpen = async (req, res) => {
  const {
    cash_register_balance_end,
    cash_register_balance_start,
    name,
    opening_notes,
    x_company_name,
  } = req.body;

  const currentDate = getFormattedDate();
  const sessionChannel = client.channels.cache.get(sessionChannelId);
  const threadName = `${currentDate} | ${x_company_name} | ${name}`;
  const pesoEndBal = pesoFormatter.format(cash_register_balance_end);
  const pesoStartBal = pesoFormatter.format(cash_register_balance_start);
  const cashDiff = cash_register_balance_end - cash_register_balance_start;
  const cashDiffBal = pesoFormatter.format(cashDiff);

  // sending the session name as a message content
  const sessionMessage = await sessionChannel.send({
    content: `# ${threadName}`,
  });

  // creating a thread for the opened session
  const sessionThread = await sessionMessage.startThread({
    name: threadName,
    type: ChannelType.PublicThread,
  });

  //creating an embed for the session
  const fields = [
    { name: "Session Name", value: name },
    { name: "Branch", value: x_company_name },
    { name: "Opening Date", value: getCurrentFormattedDate() },
    {
      name: "Opening Cash Counted",
      value: pesoStartBal,
    },
    {
      name: "Opening Cash Expected",
      value: pesoEndBal,
    },
    {
      name: "Opening Cash Difference",
      value: cashDiffBal,
    },
  ];

  if (opening_notes && opening_notes.length > 0) {
    fields.push({
      name: "Opening Notes",
      value: `*${opening_notes}*`,
    });
  }

  const openingEmbed = new EmbedBuilder()
    .setTitle(` 🟢 Register Open`)
    .setColor("Green")
    .addFields(fields);

  await sessionThread.send({ embeds: [openingEmbed] });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const discountOrder = async (req, res) => {
  const {
    cashier,
    amount_total,
    date_order,
    name,
    x_company_name,
    x_discord_id,
    x_order_lines,
    x_session_name,
  } = req.body;

  console.log("discount", req.body);

  const verificationChannel = client.channels.cache.get(verificationChannelId);
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    const department = departments.find((d) => d.name === x_company_name);
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )} ${order.uom_name}`;
    orderLinesMessage += `\n\n`;
  }

  //creating an embed for the session
  const fields = [
    { name: "Session Name", value: x_session_name },
    { name: "Order Reference", value: name },
    { name: "Branch", value: x_company_name },
    { name: "Order Date", value: orderDate },
    {
      name: "Cashier",
      value: cashier,
    },
    {
      name: "Discord User",
      value: x_discord_id ? `<@${x_discord_id}>` : "No user found",
    },
    {
      name: "Products",
      value: orderLinesMessage,
    },
    {
      name: "Order Total",
      value: pesoFormatter.format(amount_total),
    },
  ];

  const targetProductIds = [1032, 1033, 1034];
  const orderVerif = x_order_lines.find((o) =>
    targetProductIds.includes(o.product_id)
  );

  const orderEmbed = new EmbedBuilder()
    .setDescription(`## 🔔 ${orderVerif.product_name} Verification`)
    .setColor("Yellow")
    .addFields(fields)
    .setFooter({
      text: `Please send a photo as proof in the thread below this message and click "Confirm" to verify.`,
    });

  const confirm = new ButtonBuilder()
    .setCustomId("posOrderVerificationConfirm")
    .setLabel("Confirm")
    .setStyle(ButtonStyle.Success);

  const reject = new ButtonBuilder()
    .setCustomId("posOrderVerificationReject")
    .setLabel("Reject")
    .setStyle(ButtonStyle.Danger);

  const buttonRow = new ActionRowBuilder().addComponents(confirm, reject);

  const orderDiscordMessage = await verificationChannel.send({
    content: mentionable,
    embeds: [orderEmbed],
    components: [buttonRow],
  });

  const proofThread = await orderDiscordMessage.startThread({
    name: `Image Proof - ${orderDiscordMessage.id}`,
    type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
  });

  await proofThread.send({
    content: `📸 **${mentionable}, please upload the PWD ID or captured image here as proof.**`,
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const refundOrder = async (req, res) => {
  const {
    cashier,
    amount_total,
    date_order,
    name,
    x_company_name,
    x_discord_id,
    x_order_lines,
    x_session_name,
  } = req.body;

  const verificationChannel = client.channels.cache.get(verificationChannelId);
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    const department = departments.find((d) => d.name === x_company_name);
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )} ${order.uom_name}`;
    orderLinesMessage += `\n\n`;
  }

  //creating an embed for the session
  const fields = [
    { name: "Session Name", value: x_session_name },
    { name: "Order Reference", value: name },
    { name: "Branch", value: x_company_name },
    { name: "Order Date", value: orderDate },
    {
      name: "Cashier",
      value: cashier,
    },
    {
      name: "Discord User",
      value: x_discord_id ? `<@${x_discord_id}>` : "No user found",
    },
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
    .setDescription(`## ↩️ Order Refund Verification`)
    .setColor("Blue")
    .addFields(fields)
    .setFooter({
      text: `Click the "Add Reason" button and explain the reason for refund.`,
    });

  const addReason = new ButtonBuilder()
    .setCustomId("posOrderVerificationRefundReason")
    .setLabel("Add Reason")
    .setStyle(ButtonStyle.Success);

  const buttonRow = new ActionRowBuilder().addComponents(addReason);

  const orderDiscordMessage = await verificationChannel.send({
    content: mentionable,
    embeds: [orderEmbed],
    components: [buttonRow],
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const tokenPayOrder = async (req, res) => {
  const {
    cashier,
    amount_total,
    date_order,
    name,
    x_company_name,
    x_discord_id,
    x_order_lines,
    x_session_name,
  } = req.body;

  console.log("token pay", req.body);

  const verificationChannel = client.channels.cache.get(verificationChannelId);
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    const department = departments.find((d) => d.name === x_company_name);
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )} ${order.uom_name}`;
    orderLinesMessage += `\n\n`;
  }

  //creating an embed for the session
  const fields = [
    { name: "Session Name", value: x_session_name },
    { name: "Order Reference", value: name },
    { name: "Branch", value: x_company_name },
    { name: "Order Date", value: orderDate },
    {
      name: "Cashier",
      value: cashier,
    },
    {
      name: "Discord User",
      value: x_discord_id ? `<@${x_discord_id}>` : "No user found",
    },
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
    .setDescription(`## 🪙 Token Pay Order Verification`)
    .setColor("Orange")
    .addFields(fields)
    .setFooter({
      text: `Click the "Approve" button to confirm the approval of the order. Reject to add rejection reason.`,
    });

  const confirm = new ButtonBuilder()
    .setCustomId("posOrderVerificationApprove")
    .setLabel("Approve")
    .setStyle(ButtonStyle.Success);

  const reject = new ButtonBuilder()
    .setCustomId("posOrderVerificationReject")
    .setLabel("Reject")
    .setStyle(ButtonStyle.Danger);
  const buttonRow = new ActionRowBuilder().addComponents(confirm, reject);

  const orderDiscordMessage = await verificationChannel.send({
    content: mentionable,
    embeds: [orderEmbed],
    components: [buttonRow],
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

module.exports = { sessionOpen, discountOrder, refundOrder, tokenPayOrder };

////////////////////////// HELPER FUNCTIONS /////////////////////////////////////////

function getFormattedDate(timezone = "Asia/Manila") {
  return moment().tz(timezone).format("MMMM DD, YYYY");
}

function getCurrentFormattedDate(timezone = "Asia/Manila") {
  return moment().tz(timezone).format("MMMM DD, YYYY [at] h:mm A");
}

function formatDateTime(datetime, timezone = "Asia/Manila") {
  if (!datetime) {
    return null;
  }

  return moment
    .tz(datetime, "YYYY-MM-DD HH:mm:ss", timezone)
    .format("MMMM DD, YYYY [at] h:mm A");
}
