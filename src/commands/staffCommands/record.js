const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const { leviosaPool } = require("../../sqlConnection");

const XLSX = require("xlsx");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 20);
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("record")
    .setDescription("Record something...")
    .addSubcommandGroup((group) =>
      group
        .setName("shopee-orders")
        .setDescription("Record shopee orders.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("to-ship")
            .setDescription("Record shopee orders that are To Ship.")
            .addAttachmentOption((option) =>
              option
                .setName("orders")
                .setDescription("The excel file of exported shopee orders.")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("cancelled")
            .setDescription("Record shopee orders that are Cancelled.")
            .addAttachmentOption((option) =>
              option
                .setName("orders")
                .setDescription("The excel file of exported shopee orders.")
                .setRequired(true)
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("settlement")
        .setDescription(
          "Record the settlement of orders of the Shopee account."
        )
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("The excel file of exported settlement of account.")
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520>.`,
        ephemeral: true,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "to-ship":
        return await processToShipOrders(interaction);
      case "cancelled":
        return await processCancelledOrders(interaction);
      case "settlement":
        return await processSettlement(interaction);

      default:
        break;
    }
  },
};

async function processToShipOrders(interaction) {
  try {
    const attachment = interaction.options.getAttachment("orders");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      await interaction.reply({
        content: `🔴 ERROR: The attachment should be an Excel file.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const attachmentUrl = attachment.url;
    const fetchBuffer = await fetch(attachmentUrl)
      .then((response) => response.arrayBuffer())
      .catch((error) => {
        console.error("Error downloading the file:", error);
        return null;
      });

    if (!fetchBuffer) {
      await interaction.editReply({
        content: `🔴 ERROR: There was an error while reading your Excel file. Please try again.`,
      });
      return;
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const successEmbed = new EmbedBuilder().setTitle("✅ SUCCESS");

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const orderSheets = workbook.Sheets["orders"];
    const orderData = XLSX.utils.sheet_to_json(orderSheets);

    const cancelledOrders = orderData.filter(
      (order) => order["Order Status"] === "Cancelled"
    );
    const toShipOrders = orderData.filter(
      (order) => order["Order Status"] === "To Ship"
    );

    if (cancelledOrders.length > 0 && toShipOrders.length > 0) {
      return await interaction.editReply({
        content:
          "🔴 ERROR: Multiple order statuses found. Do not export in **`All`** tab of Shopee Orders. Please try again.",
      });
    } else if (toShipOrders.length < 0) {
      return await interaction.editReply({
        content:
          "🔴 ERROR: No To Ship orders found. Only export in **`To Ship`** tab of Shopee Orders when using this command. Please try again.",
      });
    }

    const ordersToCalculateCogs = orderData.map((obj) => ({
      orderId: obj["Order ID"],
      sku: obj["SKU Reference No."],
      quantity: parseInt(obj["Quantity"]),
      status: obj["Order Status"],
      settlementAmount: parseFloat(obj["Product Subtotal"]),
    }));

    const url = `https://www.leviosa.ph/_functions/CalculateItemCosts`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        line_items: ordersToCalculateCogs,
      }),
    };

    const response = await fetch(url, options).then((res) => res.json());
    if (response.code === 3) {
      return await interaction.editReply({
        content:
          "🔴 FETCH ERROR: There was an error while fetching your request. Please try again.",
      });
    }

    const createdDate = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    const ordersToSave = response.orders.map((obj) => [
      obj.orderId,
      obj.status,
      obj.settlementAmount,
      JSON.stringify(obj.lineItems),
      createdDate,
      createdDate,
    ]);

    const receivablesPlacement = response.orders
      .filter((order) => order.status !== "Cancelled")
      .map((order) => [
        nanoid(),
        Date.now(),
        order.settlementAmount,
        "Shopee Receivables - Placement",
      ]);

    const cogsPlacement = response.orders.map((order) => {
      const orderCogs = order.lineItems.reduce(
        (sum, product) => sum + product.cogs,
        0
      );

      return [nanoid(), Date.now(), orderCogs, "Shopee Sales COGS - Placement"];
    });

    const journalEntries = [...receivablesPlacement, ...cogsPlacement];

    const connection = await leviosaPool.getConnection();

    const insertOrdersQuery = `INSERT INTO Shopee_Orders (ID, ORDER_STATUS, SETTLEMENT_AMOUNT, LINEITEMS, CREATED_DATE, LAST_UPDATED) VALUES ?`;
    await connection.query(insertOrdersQuery, [ordersToSave]);

    const journalQuery =
      "INSERT INTO Journalizing_Balances (_id, TIMESTAMP, AMOUNT, TYPE) VALUES ?";
    await connection.query(journalQuery, [journalEntries]);

    connection.release();

    const toUpdate = orders.flatMap((order) =>
      order.LINEITEMS.map((item) => {
        return {
          id: item.id,
          quantity: item.quantity,
        };
      })
    );

    const decrementUrl = `https://www.leviosa.ph/_functions/updateInventory`;
    const decrementOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        type: "decrement",
        line_items: toUpdate,
      }),
    };

    await fetch(decrementUrl, decrementOptions).then((res) => res.json());

    successEmbed
      .setDescription("To Ship orders were recorded.")
      .setColor("Green");
    await interaction.editReply({
      embeds: [successEmbed],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    return await interaction.editReply({
      content:
        "🔴 ERROR: There was an error while processing your request. Please try again.",
    });
  }
}

async function processCancelledOrders(interaction) {
  try {
    const attachment = interaction.options.getAttachment("orders");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      await interaction.reply({
        content: `🔴 ERROR: The attachment should be an Excel file.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const attachmentUrl = attachment.url;
    const fetchBuffer = await fetch(attachmentUrl)
      .then((response) => response.arrayBuffer())
      .catch((error) => {
        console.error("Error downloading the file:", error);
        return null;
      });

    if (!fetchBuffer) {
      await interaction.editReply({
        content: `🔴 ERROR: There was an error while reading your Excel file. Please try again.`,
      });
      return;
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const successEmbed = new EmbedBuilder().setTitle("✅ SUCCESS");

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const orderSheets = workbook.Sheets["orders"];
    const orderData = XLSX.utils.sheet_to_json(orderSheets);

    const cancelledOrders = orderData.filter(
      (order) => order["Order Status"] === "Cancelled"
    );
    const toShipOrders = orderData.filter(
      (order) => order["Order Status"] === "To Ship"
    );

    if (cancelledOrders.length > 0 && toShipOrders.length > 0) {
      return await interaction.editReply({
        content:
          "🔴 ERROR: Multiple order statuses found. Do not export in **`All`** tab of Shopee Orders. Please try again.",
      });
    } else if (cancelledOrders.length < 0) {
      return await interaction.editReply({
        content:
          "🔴 ERROR: No Cancelled orders found. Only export in **`Cancelled`** tab of Shopee Orders when using this command. Please try again.",
      });
    }

    const updatedDate = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    const connection = await leviosaPool.getConnection();

    const cancelleOrderIds = orderData.map((order) => order["Order ID"]);
    const cancelledPlaceholders = Array.from(
      { length: cancelleOrderIds.length },
      (_, index) => "?"
    ).join(", ");
    const queryCancelledOrders = `SELECT * FROM Shopee_Orders WHERE ID IN (${cancelledPlaceholders})`;
    const [orders] = await connection.query(
      queryCancelledOrders,
      cancelleOrderIds
    );

    const lineItemsSkus = orders.flatMap((order) =>
      order.LINEITEMS.map((item) => item.sku)
    );
    const productsPlaceholder = Array.from(
      { length: lineItemsSkus.length },
      (_, index) => "?"
    ).join(", ");
    const queryProductsArray = `SELECT * FROM Leviosa_Inventory WHERE SKU IN (${productsPlaceholder})`;
    const [products] = await connection.query(
      queryProductsArray,
      lineItemsSkus
    );

    const toUpdate = orders.flatMap((order) =>
      order.LINEITEMS.map((item) => {
        const product = products.find((p) => p.SKU === item.sku);
        const totalProductCost =
          Number(product.TOTAL_QUANTITY) * Number(product.COST_OF_GOODS) +
          Number(item.cogs);
        const totalProductQuantity =
          Number(product.TOTAL_QUANTITY) + Number(item.quantity);

        const newCost = parseFloat(
          (totalProductCost / totalProductQuantity).toFixed(2)
        );

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          newCogs: newCost,
        };
      })
    );

    const updateProductQuery = `
  UPDATE Leviosa_Inventory
  SET TOTAL_QUANTITY = TOTAL_QUANTITY + CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN ${product.quantity}`)
      .join(" ")}
  END,
      COST_OF_GOODS = CASE SKU
    ${toUpdate
      .map((product) => `WHEN '${product.sku}' THEN ${product.newCogs}`)
      .join(" ")}
  END
  WHERE SKU IN (${toUpdate.map((product) => `'${product.sku}'`).join(", ")});
`;
    await connection.query(updateProductQuery);

    const updateOrderQuery = `
  UPDATE Shopee_Orders
  SET ORDER_STATUS = 'Cancelled',
      LAST_UPDATED = ?
  WHERE ID IN (?);
`;
    await connection.query(updateOrderQuery, [updatedDate, cancelleOrderIds]);

    const receivablesReturn = orders.map((order) => [
      nanoid(),
      Date.now(),
      order.SETTLEMENT_AMOUNT,
      "Shopee Receivables - Return",
    ]);

    const cogsReturn = orders.map((order) => {
      const orderCogs = order.LINEITEMS.reduce(
        (sum, product) => sum + product.cogs,
        0
      );

      return [nanoid(), Date.now(), orderCogs, "Shopee Sales COGS - Return"];
    });

    const journalEntries = [...receivablesReturn, ...cogsReturn];

    const journalQuery =
      "INSERT INTO Journalizing_Balances (_id, TIMESTAMP, AMOUNT, TYPE) VALUES ?";
    await connection.query(journalQuery, [journalEntries]);

    connection.release();

    const url = `https://www.leviosa.ph/_functions/updateInventory`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        type: "increment",
        line_items: toUpdate,
      }),
    };

    await fetch(url, options).then((res) => res.json());

    successEmbed
      .setDescription("Cancelled orders were recorded.")
      .setColor("Red");
    await interaction.editReply({
      embeds: [successEmbed],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    return await interaction.editReply({
      content:
        "🔴 ERROR: There was an error while processing your request. Please try again.",
    });
  }
}

async function processSettlement(interaction) {
  try {
    const attachment = interaction.options.getAttachment("file");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      await interaction.reply({
        content: `🔴 ERROR: The attachment should be an Excel file.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const attachmentUrl = attachment.url;
    const fetchBuffer = await fetch(attachmentUrl)
      .then((response) => response.arrayBuffer())
      .catch((error) => {
        console.error("Error downloading the file:", error);
        return null;
      });

    if (!fetchBuffer) {
      await interaction.editReply({
        content: `🔴 ERROR: There was an error while reading your Excel file. Please try again.`,
      });
      return;
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const successEmbed = new EmbedBuilder().setTitle("✅ SUCCESS");

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const settlementSheets = workbook.Sheets["Income"];
    const settlementData = XLSX.utils.sheet_to_json(settlementSheets, {
      range: 5,
    });

    const settlementOrderIds = settlementData.map((order) => order["Order ID"]);

    const connection = await leviosaPool.getConnection();

    const orderQueryPlaceholders = Array.from(
      { length: settlementOrderIds.length },
      (_, index) => "?"
    ).join(", ");
    const queryOrders = `SELECT * FROM Shopee_Orders WHERE ID IN (${orderQueryPlaceholders})`;
    const [settledOrders] = await connection.query(
      queryOrders,
      settlementOrderIds
    );

    if (settledOrders.length <= 0) {
      connection.release();
      return await interaction.editReply({
        content:
          "🟡 WARNING: There are no orders to settle in the provided file.",
      });
    }

    const settlementAmountJournals = settlementData.map((order) => {
      const dbOrder = settledOrders.find((o) => o.ID === order["Order ID"]);

      if (dbOrder) {
        return [
          nanoid(),
          Date.now(),
          Number(order["Total Released Amount (₱)"]),
          "Shopee Settlement Amount",
        ];
      }
    });

    const settlementFeesJournal = settlementData.map((order) => {
      const dbOrder = settledOrders.find((o) => o.ID === order["Order ID"]);

      if (dbOrder) {
        const fee =
          Number(dbOrder.SETTLEMENT_AMOUNT) -
          Number(order["Total Released Amount (₱)"]);
        return [nanoid(), Date.now(), Math.abs(fee), "Shopee Settlement Fees"];
      }
    });

    const journalEntries = [
      ...settlementAmountJournals,
      ...settlementFeesJournal,
    ];

    const journalQuery =
      "INSERT INTO Journalizing_Balances (_id, TIMESTAMP, AMOUNT, TYPE) VALUES ?";
    await connection.query(journalQuery, [journalEntries]);

    const toUpdateOrdersIds = settledOrders.map((o) => o.ID);
    const orderUpdatePlaceholders = Array.from(
      { length: toUpdateOrdersIds.length },
      (_, index) => "?"
    ).join(", ");
    const updateOrders = `UPDATE Shopee_Orders SET SETTLED = 1 WHERE ID IN (${orderUpdatePlaceholders})`;
    await connection.query(updateOrders, toUpdateOrdersIds);

    connection.release();

    successEmbed
      .setDescription("Order settlements were recorded.")
      .setColor("Blue");
    await interaction.editReply({
      embeds: [successEmbed],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    return await interaction.editReply({
      content:
        "🔴 ERROR: There was an error while processing your request. Please try again.",
    });
  }
}
