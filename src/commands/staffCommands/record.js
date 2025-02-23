const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

// const conn = require("../../sqlConnection");
// const pools = require("../../sqlPools.js");

// const XLSX = require("xlsx");
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
        return await processToShipOrders(interaction, client);
      case "cancelled":
        return await processCancelledOrders(interaction, client);
      case "settlement":
        return await processSettlement(interaction, client);

      default:
        break;
    }
  },
};

async function processToShipOrders(interaction, client) {
  // const connection = await conn.leviosaConnection();
  const connection = await pools.leviosaPool.getConnection();
  try {
    const attachment = interaction.options.getAttachment("orders");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      throw new Error("The attachment should be an Excel file.");
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
      throw new Error(
        "There was an error while reading your Excel file. Please try again."
      );
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const orderSheets = workbook.Sheets["orders"];
    const orderData = XLSX.utils.sheet_to_json(orderSheets);

    const cancelledOrders = orderData.filter(
      (order) => order["Order Status"].toLowerCase() === "cancelled"
    );
    const toShipOrders = orderData.filter(
      (order) => order["Order Status"].toLowerCase() === "to ship"
    );

    if (cancelledOrders.length > 0 && toShipOrders.length > 0) {
      throw new Error(
        "Multiple order statuses found. Do not export in **`All`** tab of Shopee Orders. Please try again."
      );
    } else if (toShipOrders.length <= 0) {
      throw new Error(
        "No To Ship orders found. Only export in **`To Ship`** tab of Shopee Orders when using this command. Please try again."
      );
    }
    const cutoffDate = new Date("2024-02-20");

    const hasOrderBeforeCutoff = orderData.some((order) => {
      const orderCreationDate = new Date(order["Order Creation Date"]);
      return orderCreationDate < cutoffDate;
    });

    if (hasOrderBeforeCutoff) {
      throw new Error("Orders before February 20, 2024 found.");
    }

    const toShipOrderIds = orderData.map((order) => order["Order ID"]);
    const toShipPlaceholders = Array.from(
      { length: toShipOrderIds.length },
      (_, index) => "?"
    ).join(", ");
    const queryToShipOrders = `SELECT * FROM Shopee_Orders WHERE ID IN (${toShipPlaceholders})`;
    const [dbOrders] = await connection.query(
      queryToShipOrders,
      toShipOrderIds
    );

    const ordersToCalculateCogs = orderData
      .map((obj) => {
        const dbOrderIndex = dbOrders.findIndex(
          (order) => order.ID === obj["Order ID"]
        );
        if (dbOrderIndex === -1) {
          return {
            orderId: obj["Order ID"],
            sku: obj["SKU Reference No."],
            quantity: parseInt(obj["Quantity"]),
            status: obj["Order Status"],
            settlementAmount: parseFloat(obj["Product Subtotal"]),
          };
        } else {
          return null;
        }
      })
      .filter((order) => order !== null);

    if (ordersToCalculateCogs.length <= 0) {
      throw new Error(
        "No orders to record. Duplicate orders are already recorded."
      );
    }

    await interaction.followUp({
      content: "Fetching order costs...",
      ephemeral: true,
    });
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
      throw new Error(
        "There was an error while fetching your request. Please try again."
      );
    }

    const createdDate = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

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

    const channel = client.channels.cache.get("1206946369387110400");

    await interaction.followUp({
      content: "Creating threads...",
      ephemeral: true,
    });
    const ordersToSave = [];
    for (const order of response.orders) {
      const thread = await channel.threads.create({
        name: `🟡 ${order.orderId} | To Ship`,
        autoArchiveDuration: 1440,
      });
      await thread.join();

      let description = "";
      order.lineItems.forEach((item) => {
        description += `▪️ ${item.name}\n`;
      });

      const orderEmbed = new EmbedBuilder()
        .setDescription("🛒 ORDER DETAILS")
        .setColor("#2B2D31")
        .addFields([
          {
            name: `ORDER ID`,
            value: `\`${order.orderId}\``,
          },
          {
            name: `ORDER CREATE TIME`,
            value: `\`${moment()
              .tz("Asia/Manila")
              .format("MMMM DD, YYYY [at] h:mm A")}\``,
          },
          {
            name: `ORDER SUBTOTAL`,
            value: `\`${order.settlementAmount}\``,
          },
          {
            name: `ORDER ITEMS`,
            value: `\`\`\`${description}\`\`\``,
          },
        ]);

      await thread.send({
        embeds: [orderEmbed],
      });

      ordersToSave.push([
        order.orderId,
        order.status,
        order.settlementAmount,
        JSON.stringify(order.lineItems),
        thread.id,
        createdDate,
        createdDate,
      ]);
    }

    const insertOrdersQuery = `INSERT INTO Shopee_Orders (ID, ORDER_STATUS, SETTLEMENT_AMOUNT, LINEITEMS, DISCORD_CHANNEL, CREATED_DATE, LAST_UPDATED) VALUES ?`;
    await connection.query(insertOrdersQuery, [ordersToSave]);

    const journalQuery =
      "INSERT INTO Journalizing_Balances (_id, TIMESTAMP, AMOUNT, TYPE) VALUES ?";
    await connection.query(journalQuery, [journalEntries]);

    const toUpdate = response.orders.flatMap((order) =>
      order.lineItems.map((item) => {
        return {
          id: item.id,
          quantity: item.quantity,
        };
      })
    );

    await interaction.followUp({
      content: "Decrementing inventory...",
      ephemeral: true,
    });
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

    await fetch(decrementUrl, decrementOptions)
      .then((res) => res.json())
      .catch((err) => {
        throw new Error("There was an error while decrementing the Inventory.");
      });

    const success = new EmbedBuilder()
      .setDescription("## ✅ SUCCESS\nTo Ship orders were recorded.")
      .setColor("Green");
    await interaction.editReply({
      embeds: [success],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    const errorEmbed = new EmbedBuilder()
      .setDescription(`## 🔴 ERROR\n${error.toString()}`)
      .setColor("Red");
    return await interaction.editReply({
      embeds: [errorEmbed],
    });
  } finally {
    // await connection.end();
    connection.release();
  }
}

async function processCancelledOrders(interaction, client) {
  // const connection = await conn.leviosaConnection();
  const connection = await pools.leviosaPool.getConnection();

  try {
    const attachment = interaction.options.getAttachment("orders");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      throw new Error("The attachment should be an Excel file.");
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
      throw new Error(
        "There was an error while reading your Excel file. Please try again"
      );
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const orderSheets = workbook.Sheets["orders"];
    const orderData = XLSX.utils.sheet_to_json(orderSheets);

    const cancelledOrders = orderData.filter(
      (order) => order["Order Status"].toLowerCase() === "cancelled"
    );
    const toShipOrders = orderData.filter(
      (order) => order["Order Status"].toLowerCase() === "to ship"
    );

    if (cancelledOrders.length > 0 && toShipOrders.length > 0) {
      throw new Error(
        "Multiple order statuses found. Do not export in **`All`** tab of Shopee Orders. Please try again."
      );
    } else if (cancelledOrders.length <= 0) {
      throw new Error(
        "No Cancelled orders found. Only export in **`Cancelled`** tab of Shopee Orders when using this command. Please try again."
      );
    }

    const updatedDate = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    const cancelleOrderIds = orderData.map((order) => order["Order ID"]);
    const cancelledPlaceholders = Array.from(
      { length: cancelleOrderIds.length },
      (_, index) => "?"
    ).join(", ");
    const queryCancelledOrders = `SELECT * FROM Shopee_Orders WHERE ID IN (${cancelledPlaceholders})`;
    const [sqlOrders] = await connection.query(
      queryCancelledOrders,
      cancelleOrderIds
    );

    if (sqlOrders.length <= 0) {
      throw new Error("No orders to cancel found in database.");
    }

    const orders = sqlOrders.filter(
      (order) => order.ORDER_STATUS !== "Cancelled"
    );

    if (orders.length <= 0) {
      throw new Error(
        "No orders to cancel found in database. Duplicate orders were skipped."
      );
    }

    const toCancelOrderIds = orders.map((order) => order.ID);

    await interaction.followUp({
      content: "Fetching products to increment...",
      ephemeral: true,
    });
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

    await interaction.followUp({
      content: "Incrementing inventory and updating cogs...",
      ephemeral: true,
    });
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
    await connection.query(updateOrderQuery, [updatedDate, toCancelOrderIds]);

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

    await interaction.followUp({
      content: "Updating threads...",
      ephemeral: true,
    });
    for (const order of orders) {
      const thread = client.channels.cache.get(order.DISCORD_CHANNEL);
      await thread.setName(`🚫 ${order.ID} | Cancelled`);

      const updateEmbed = new EmbedBuilder()
        .setDescription(`## ORDER STATUS UPDATED`)
        .setColor("#2B2D31")
        .addFields([
          {
            name: `TIMESTAMP`,
            value: `\`${moment(Date.now()).format(
              "MMMM DD, YYYY [at] h:mm A"
            )}\``,
          },
          {
            name: `STATUS`,
            value: `\`Cancelled\``,
          },
        ]);

      await thread.send({
        embeds: [updateEmbed],
      });
    }

    await interaction.followUp({
      content: "Incrementing Wix inventory...",
      ephemeral: true,
    });
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

    const success = new EmbedBuilder()
      .setDescription("## ✅ SUCCESS\nCancelled orders were recorded.")
      .setColor("Green");
    await interaction.editReply({
      embeds: [success],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    const errorEmbed = new EmbedBuilder()
      .setDescription(`## 🔴 ERROR\n${error.toString()}`)
      .setColor("Red");
    return await interaction.editReply({
      embeds: [errorEmbed],
    });
  } finally {
    // await connection.end();
    connection.release();
  }
}

async function processSettlement(interaction, client) {
  // const connection = await conn.leviosaConnection();
  const connection = await pools.leviosaPool.getConnection();

  try {
    const attachment = interaction.options.getAttachment("file");

    if (
      attachment.contentType !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      throw new Error("The attachment should be an Excel file.");
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
      throw new Error(
        "There was an error while reading your Excel file. Please try again."
      );
    }

    const link = new ButtonBuilder()
      .setLabel("Recorded File")
      .setURL(attachmentUrl)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    const workbook = XLSX.read(new Uint8Array(fetchBuffer), {
      type: "array",
    });
    const settlementSheets = workbook.Sheets["Income"];
    const settlementData = XLSX.utils.sheet_to_json(settlementSheets, {
      range: 5,
    });

    const settlementOrderIds = settlementData.map((order) => order["Order ID"]);

    const orderQueryPlaceholders = Array.from(
      { length: settlementOrderIds.length },
      (_, index) => "?"
    ).join(", ");
    const queryOrders = `SELECT * FROM Shopee_Orders WHERE ID IN (${orderQueryPlaceholders})`;
    const [sqlOrders] = await connection.query(queryOrders, settlementOrderIds);

    if (sqlOrders.length <= 0) {
      throw new Error("There are no orders to settle in the provided file.");
    }

    const settledOrders = sqlOrders.filter(
      (order) => order.ORDER_STATUS !== "Completed"
    );

    if (settledOrders.length <= 0) {
      throw new Error(
        "No orders to settle found in database. Duplicate orders were skipped."
      );
    }

    const settlementAmountJournals = settlementData
      .map((order) => {
        const dbOrder = settledOrders.find((o) => o.ID === order["Order ID"]);

        if (dbOrder) {
          return [
            nanoid(),
            Date.now(),
            Number(order["Total Released Amount (₱)"]),
            "Shopee Settlement Amount",
          ];
        } else {
          return null;
        }
      })
      .filter((order) => order !== null);

    const amsFees = generateSettlementFees(
      settlementData,
      settledOrders,
      "AMS Commission Fee",
      "AMS"
    );
    const commissionFees = generateSettlementFees(
      settlementData,
      settledOrders,
      "Commission fee",
      "Commission"
    );
    const transactionFees = generateSettlementFees(
      settlementData,
      settledOrders,
      "Transaction Fee",
      "Transaction"
    );
    const voucherFees = generateSettlementFees(
      settlementData,
      settledOrders,
      "Seller Voucher Discount",
      "Voucher Discount"
    );

    const journalEntries = [
      ...settlementAmountJournals,
      ...amsFees,
      ...commissionFees,
      ...transactionFees,
      ...voucherFees,
    ];

    const journalQuery =
      "INSERT INTO Journalizing_Balances (_id, TIMESTAMP, AMOUNT, TYPE) VALUES ?";
    await connection.query(journalQuery, [journalEntries]);

    const toUpdateOrdersIds = settledOrders.map((o) => o.ID);
    const orderUpdatePlaceholders = Array.from(
      { length: toUpdateOrdersIds.length },
      (_, index) => "?"
    ).join(", ");
    const updateOrders = `UPDATE Shopee_Orders SET SETTLED = 1, ORDER_STATUS = 'Completed' WHERE ID IN (${orderUpdatePlaceholders})`;
    await connection.query(updateOrders, toUpdateOrdersIds);

    for (const order of settledOrders) {
      const thread = client.channels.cache.get(order.DISCORD_CHANNEL);
      await thread.setName(`⭐ ${order.ID} | Completed`);

      const updateEmbed = new EmbedBuilder()
        .setDescription(`## ORDER STATUS UPDATED`)
        .setColor("#2B2D31")
        .addFields([
          {
            name: `TIMESTAMP`,
            value: `\`${moment(Date.now()).format(
              "MMMM DD, YYYY [at] h:mm A"
            )}\``,
          },
          {
            name: `STATUS`,
            value: `\`Completed\``,
          },
        ]);

      await thread.send({
        embeds: [updateEmbed],
      });
    }

    const success = new EmbedBuilder()
      .setDescription("## ✅ SUCCESS\nOrder settlements were recorded.")
      .setColor("Green");
    await interaction.editReply({
      embeds: [success],
      components: [buttonRow],
    });
  } catch (error) {
    console.log(error);
    const errorEmbed = new EmbedBuilder()
      .setDescription(`## 🔴 ERROR\n${error.toString()}`)
      .setColor("Red");
    return await interaction.editReply({
      embeds: [errorEmbed],
    });
  } finally {
    // await connection.end();
    connection.release();
  }

  function generateSettlementFees(
    settlementData,
    settledOrders,
    feeKey,
    description
  ) {
    return settlementData
      .map((order) => {
        const dbOrder = settledOrders.find((o) => o.ID === order["Order ID"]);

        if (dbOrder) {
          const fee = Number(order[feeKey]);
          return [
            nanoid(),
            Date.now(),
            Math.abs(fee),
            `Shopee Settlement Fees - ${description}`,
          ];
        } else {
          return null;
        }
      })
      .filter((order) => order !== null);
  }
}
