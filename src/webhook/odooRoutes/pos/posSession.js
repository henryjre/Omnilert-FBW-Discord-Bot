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

const departments = require("../../../config/departments.json");

// ✅ Employee Check-In
const sessionOpen = async (req, res) => {
  const {
    cash_register_balance_end,
    cash_register_balance_start,
    display_name,
    opening_notes,
    x_company_name,
    company_id,
  } = req.body;

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const currentDate = getFormattedDate();
  const sessionChannel = client.channels.cache.get(department.posChannel);
  const threadName = `${currentDate} | ${x_company_name} | ${display_name}`;
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
    { name: "Session Name", value: display_name },
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

/**
 * Finds a discount order by ID
 * @param {Array} orders - Array of discount orders
 * @param {number} id - Discount ID to find
 * @returns {Object|null} Found discount order or null
 */
const findDiscount = (orders, id) =>
  orders?.find((item) => item.id === id) ?? null;

const sessionClose = async (req, res) => {
  try {
    const {
      cash_register_balance_end,
      cash_register_balance_end_real,
      cash_register_difference,
      display_name,
      x_company_name,
      company_id,
      x_discount_orders,
      x_payment_methods,
      x_refund_orders,
      x_statement_lines,
      closing_notes,
    } = req.body;

    const department = departments.find((d) => d.id === company_id);

    if (!department) {
      return res.status(200).json({ ok: true, message: "Webhook received" });
    }

    const sessionChannel = client.channels.cache.get(department.posChannel);
    const verificationChannel = client.channels.cache.get(
      department.verificationChannel
    );

    if (!sessionChannel) {
      return res.status(200).json({ ok: true, message: "Channel not found" });
    }

    const sessionMessage = await sessionChannel.messages
      .fetch({ limit: 100 })
      .then((messages) =>
        messages.find((msg) => msg.content.includes(display_name))
      );

    const posThread = await sessionMessage?.thread;

    if (!posThread) {
      return res.status(200).json({ ok: true, message: "Webhook received" });
    }

    const pesoEndBal = pesoFormatter.format(cash_register_balance_end); //expected
    const pesoEndBalReal = pesoFormatter.format(cash_register_balance_end_real); //counted
    const cashDiffBal = pesoFormatter.format(cash_register_difference);

    let totalDiscountOrders,
      discountSales = 0;
    if (x_discount_orders) {
      totalDiscountOrders = Object.values(
        x_discount_orders.reduce((acc, item) => {
          const key = item.product_id;
          if (!acc[key]) {
            acc[key] = {
              id: key,
              name: item.product_name,
              amount: 0,
            };
          }
          acc[key].amount += Math.abs(item.price_unit);
          return acc;
        }, {})
      );

      discountSales = totalDiscountOrders.reduce(
        (total, item) => total + Math.abs(item.amount),
        0
      );
    }

    const pwdDiscount = findDiscount(totalDiscountOrders, 1032);
    const xopb = findDiscount(totalDiscountOrders, 1033);
    const gc100 = findDiscount(totalDiscountOrders, 1034);
    const tokenPay = findDiscount(totalDiscountOrders, 1153);

    const otherPayments = x_payment_methods.filter(
      (item) => item.payment_method_name !== "Cash"
    );

    const totalOtherPayments =
      otherPayments.length > 0
        ? otherPayments.reduce(
            (total, item) => total + Math.abs(item.amount),
            0
          )
        : 0;

    let totalRefunds = 0;
    if (x_refund_orders) {
      totalRefunds = x_refund_orders.reduce(
        (total, item) => total + Math.abs(item.price_unit * item.qty),
        0
      );
    }

    const netSales = x_payment_methods.reduce(
      (total, item) => total + Math.abs(item.amount),
      0
    );

    const cashPayments = x_payment_methods.find(
      (item) => item.payment_method_name === "Cash"
    );

    const grossSales = netSales + totalRefunds + discountSales;

    let cashInOut;
    if (x_statement_lines) {
      cashInOut = groupCashInOutByType(x_statement_lines);
    }

    const closingFields = [
      { name: "Session Name", value: display_name },
      { name: "Branch", value: x_company_name },
      { name: "Closing Date", value: getCurrentFormattedDate() },
      {
        name: "Closing Cash Counted",
        value: pesoEndBalReal,
      },
      {
        name: "Closing Cash Expected",
        value: pesoEndBal,
      },
      {
        name: "Closing Cash Difference",
        value: cashDiffBal,
      },
    ];

    const salesReportFields = [
      {
        name: "Gross Sales",
        value: pesoFormatter.format(grossSales),
      },
      {
        name: "PWD and Senior Discount",
        value: pwdDiscount
          ? pesoFormatter.format(pwdDiscount.amount)
          : pesoFormatter.format(0),
      },
      {
        name: "XOPB",
        value: xopb
          ? pesoFormatter.format(xopb.amount)
          : pesoFormatter.format(0),
      },
      {
        name: "GC100",
        value: gc100
          ? pesoFormatter.format(gc100.amount)
          : pesoFormatter.format(0),
      },
      {
        name: "Token Pay",
        value: tokenPay
          ? pesoFormatter.format(tokenPay.amount)
          : pesoFormatter.format(0),
      },
      {
        name: "Refund Claims",
        value: pesoFormatter.format(totalRefunds),
      },
      {
        name: "Net Sales",
        value: pesoFormatter.format(netSales),
      },
    ];

    const nonCashReportFields =
      otherPayments.length > 0
        ? [
            ...otherPayments.map((item) => ({
              name: item.payment_method_name,
              value: pesoFormatter.format(item.amount),
            })),
            {
              name: "Total Non-Cash Payments",
              value: pesoFormatter.format(totalOtherPayments),
            },
          ]
        : [];

    const cashReportFields = [
      {
        name: "Cash In",
        value:
          cashInOut && cashInOut.in.length > 0
            ? cashInOut.in
                .map(
                  (item) =>
                    `> **${item.name}:** ${pesoFormatter.format(item.amount)}`
                )
                .join("\n")
            : "No cash in found.",
      },
      {
        name: "Cash Out",
        value:
          cashInOut && cashInOut.out.length > 0
            ? cashInOut.out
                .map(
                  (item) =>
                    `> **${item.name}:** ${pesoFormatter.format(item.amount)}`
                )
                .join("\n")
            : "No cash out found.",
      },
      {
        name: "Cash Payments",
        value: cashPayments
          ? pesoFormatter.format(cashPayments.amount)
          : pesoFormatter.format(0),
      },
    ];

    const salesReportEmbed = new EmbedBuilder()
      .setTitle(` 📊 Sales Report`)
      .setColor("#FF0000")
      .addFields(salesReportFields);

    const nonCashReportEmbed = new EmbedBuilder()
      .setTitle(` 📊 Non-Cash Report`)
      .setColor("#FF0000")
      .addFields(nonCashReportFields);

    const cashReportEmbed = new EmbedBuilder()
      .setTitle(` 📊 Cash Report`)
      .setColor("#FF0000")
      .addFields(cashReportFields);

    const closingEmbed = new EmbedBuilder()
      .setTitle(` 🔴 Register Closed`)
      .setColor("#FF0000")
      .addFields(closingFields);

    if (closing_notes && closing_notes.length > 0) {
      closingEmbed.setDescription(`>>> *${closing_notes}*`);
    }

    const submit = new ButtonBuilder()
      .setCustomId("posOrderAudit")
      .setLabel("Audit")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(submit);

    await posThread.send({
      embeds: [salesReportEmbed],
      components: [buttonRow],
    });
    await posThread.send({
      embeds: [nonCashReportEmbed],
      components: [buttonRow],
    });
    await posThread.send({
      embeds: [cashReportEmbed],
      components: [buttonRow],
    });
    await posThread.send({ embeds: [closingEmbed], components: [buttonRow] });

    if (company_id !== 3) {
      return res.status(200).json({ ok: true, message: "Webhook received" });
    }

    const pcfEmbed = new EmbedBuilder()
      .setDescription(`## 📝 PCF Report`)
      .setColor("White")
      .addFields([
        {
          name: "Session Name",
          value: display_name,
        },
        {
          name: "Opening PCF Expected",
          value: "N/A",
        },
        {
          name: "Closing PCF Expected",
          value: "N/A",
        },
        {
          name: "Closing PCF Counted",
          value: "N/A",
        },
        {
          name: "Closing PCF Difference",
          value: "N/A", // closing counted - closing expected
        },
      ])
      .setFooter({
        text: "Please click the 'Input' button to add details to the PCF report.",
      });

    const inputButton = new ButtonBuilder()
      .setCustomId("posPcfInput")
      .setLabel("Input")
      .setStyle(ButtonStyle.Success);

    const pcfButtonRow = new ActionRowBuilder().addComponents(inputButton);

    await verificationChannel.send({
      content: `<@&${department.role}>`,
      embeds: [pcfEmbed],
      components: [pcfButtonRow],
    });

    return res.status(200).json({ ok: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error in sessionClose:", error);
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }
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
    company_id,
  } = req.body;

  const targetProductIds = [1032, 1033, 1034];
  const orderVerif = x_order_lines.find((o) =>
    targetProductIds.includes(o.product_id)
  );

  if (!orderVerif) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const verificationChannel = client.channels.cache.get(
    department.verificationChannel
  );
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )}`;
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
    name: `Discount Proof - ${orderDiscordMessage.id}`,
    type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
  });

  await proofThread.send({
    content: `📸 **${mentionable}, please upload the PWD ID or captured image here as proof.**`,
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const nonCashOrder = async (req, res) => {
  const {
    cashier,
    amount_total,
    date_order,
    name,
    x_company_name,
    x_discord_id,
    x_order_lines,
    x_session_name,
    company_id,
    x_payments,
  } = req.body;

  const payments = x_payments.filter((p) => p.name !== "Cash");
  if (payments.length === 0) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const verificationChannel = client.channels.cache.get(
    department.verificationChannel
  );
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )}`;
    orderLinesMessage += `\n\n`;
  }

  let paymentMessage = x_payments
    ? x_payments
        .map((p) => `> **${p.name}:** ${pesoFormatter.format(p.amount)}`)
        .join("\n")
    : "No payments found";

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
      name: "Payments",
      value: paymentMessage,
    },
    {
      name: "Order Total",
      value: pesoFormatter.format(amount_total),
    },
  ];

  const orderEmbed = new EmbedBuilder()
    .setDescription(`## 🔔 Non-Cash Payment Verification`)
    .setColor("Grey")
    .addFields(fields)
    .setFooter({
      text: `Please send the receipt in the thread below this message and click "Confirm" to verify.`,
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
    name: `Receipt Proof - ${orderDiscordMessage.id}`,
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
    company_id,
  } = req.body;

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const verificationChannel = client.channels.cache.get(
    department.verificationChannel
  );
  const orderDate = formatDateTime(date_order);

  let mentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
  } else {
    mentionable = `<@&${department.role}>`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )}`;
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
    x_customer_discord_id,
    x_order_lines,
    x_session_name,
    company_id,
  } = req.body;

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const verificationChannel = client.channels.cache.get(
    department.verificationChannel
  );
  const orderDate = formatDateTime(date_order);

  let mentionable, customerMentionable;

  if (x_discord_id) {
    mentionable = `<@${x_discord_id}>`;
    customerMentionable = `<@${x_customer_discord_id}>`;
  } else {
    mentionable = `<@&${department.role}>`;
    customerMentionable = `the crew customer`;
  }

  let orderLinesMessage = "";

  for (const order of x_order_lines) {
    orderLinesMessage += `> **Name:** ${order.product_name}\n`;
    orderLinesMessage += `> **Quantity:** ${order.qty} ${order.uom_name}\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit
    )}`;
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
      name: "Customer",
      value: x_customer_discord_id
        ? `<@${x_customer_discord_id}>`
        : "No user found",
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
    name: `Token Pay Proof - ${orderDiscordMessage.id}`,
    type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
  });

  await proofThread.send({
    content: `📸 **${mentionable}, please upload the captured picture of ${customerMentionable} ordering here as proof.**`,
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

const ispeOrder = async (req, res) => {
  const {
    amount_total,
    name,
    partner_ref,
    x_pos_session,
    company_id,
    x_order_line_details,
    date_approve,
  } = req.body;

  const department = departments.find((d) => d.id === company_id);

  if (!department) {
    return res.status(200).json({ ok: true, message: "Webhook received" });
  }

  const departmentName = department.name;
  const mentionable = `<@&${department.role}>`;
  const verificationChannel = client.channels.cache.get(
    department.verificationChannel
  );

  const orderDate = formatDateTime(date_approve);

  let orderLinesMessage = "";

  for (const order of x_order_line_details) {
    orderLinesMessage += `> **Name:** ${
      order.product_name || "No Product Name"
    }\n`;
    orderLinesMessage += `> **Quantity:** ${order.quantity || "N/A"} ${
      order.uom_name || "N/A"
    }\n`;
    orderLinesMessage += `> **Unit Price:** ${pesoFormatter.format(
      order.price_unit || "N/A"
    )}`;
    orderLinesMessage += `\n\n`;
  }

  const fields = [
    { name: "Session Name", value: x_pos_session },
    { name: "Order Reference", value: name },
    { name: "Vendor Reference", value: partner_ref || "N/A" },
    { name: "Branch", value: departmentName },
    { name: "Confirmation Date", value: orderDate },
    {
      name: "Products",
      value: orderLinesMessage,
    },
    {
      name: "Amount Total",
      value: pesoFormatter.format(amount_total),
    },
  ];

  const orderEmbed = new EmbedBuilder()
    .setDescription(`## 🛒 ISPE Order Verification`)
    .setURL("https://omnilert.odoo.com/")
    .setColor("White")
    .addFields(fields)
    .setFooter({
      text: `Please send the receipts as proof in the thread below this message and click "Confirm" to verify.`,
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
    name: `ISPE Receipts Proof - ${orderDiscordMessage.id}`,
    type: ChannelType.PublicThread, // Set to 'GuildPrivateThread' if only the user should see it
  });

  await proofThread.send({
    content: `📸 **${mentionable}, please upload the receipts here as proof.**`,
  });

  return res.status(200).json({ ok: true, message: "Webhook received" });
};

module.exports = {
  sessionOpen,
  sessionClose,
  discountOrder,
  refundOrder,
  tokenPayOrder,
  nonCashOrder,
  ispeOrder,
};

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

function groupCashInOutByType(data) {
  const grouped = { out: [], in: [] };

  data.forEach((item) => {
    const parts = item.payment_ref.split("-");
    const type = parts[1];
    const name = parts.slice(2).join("-");
    const amount = Math.abs(item.amount);

    if (["in", "out"].includes(type)) {
      grouped[type].push({ name, amount });
    }
  });

  return { out: grouped.out, in: grouped.in };
}
