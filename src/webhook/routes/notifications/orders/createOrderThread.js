const { EmbedBuilder } = require("discord.js");
const client = require("../../../../index.js");
const moment = require("moment-timezone");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = async (req, res) => {
  const { data, platform } = req.body;

  let updatedIds = [];
  for (const order of data) {
    let process;
    if (platform === "SHOPEE") {
      process = await processShopeeNotifications(order);
    } else if (platform === "LAZADA") {
      process = await processLazadaNotifications(order);
    } else if (platform === "TIKTOK") {
      process = await processTiktokNotifications(order);
    } else {
      continue;
    }

    if (process.ok) {
      updatedIds.push(process.updateData);
    }
  }

  res.status(200).json({ ok: true, message: "success", updated: updatedIds });
  return;
};

async function processShopeeNotifications(order) {
  const id = order.order_sn;
  try {
    const channel = client.channels.cache.get("1206946369387110400");

    const orderId = order.order_sn;
    const totalSubtotal = order.item_list.reduce((total, item) => {
      return total + Number(item.model_discounted_price);
    }, 0);
    const paymentMethod = order.payment_method;
    const orderStatus = order.order_status;
    const buyerMessage = order.message_to_seller;
    const buyerId = order.buyer_user_id;
    const buyerUsername = order.buyer_username;
    const orderCreateTime = moment
      .unix(order.create_time)
      .tz("Asia/Manila")
      .format("MMMM DD, YYYY [at] h:mm A");
    const lineitemsImages = order.item_list.map(
      (item) => item.image_info.image_url
    );

    let emoji;
    let status;
    switch (orderStatus) {
      case "UNPAID":
        emoji = "⌛";
        status = "Pending";
        break;
      case "READY_TO_SHIP":
        emoji = "📦";
        status = "Ready to Ship";
        break;
      case "PROCESSED":
        emoji = "⚙️";
        status = "Processed";
        break;
      case "CANCELLED":
        emoji = "🚫";
        status = "Cancelled";
        break;
      case "TO_CONFIRM_RECEIVE":
        emoji = "✅";
        status = "Delivered";
        break;
      case "COMPLETED":
        emoji = "⭐";
        status = "Completed";
        break;

      default:
        emoji = "";
        status = orderStatus;
        break;
    }

    let description = "";
    order.item_list.forEach((item) => {
      description += `▪️ ${item.item_name}\n`;
    });

    const title = `### 🛒 NEW SHOPEE ORDER`;

    const orderEmbed = new EmbedBuilder()
      .setDescription(title)
      .setColor("#2B2D31")
      .addFields([
        {
          name: `ORDER ID`,
          value: `\`${orderId}\``,
        },
        {
          name: `ORDER CREATE TIME`,
          value: `\`${orderCreateTime}\``,
        },
        {
          name: `ORDER TOTAL SUBTOTAL`,
          value: `\`${pesoFormatter.format(totalSubtotal)}\``,
        },
        {
          name: `ORDER ITEMS`,
          value: `\`\`\`${description}\`\`\``,
        },
      ]);

    const buyerFields = [
      {
        name: `BUYER ID`,
        value: `\`${buyerId}\``,
      },
      {
        name: `BUYER USERNAME`,
        value: `\`${buyerUsername}\``,
      },
      {
        name: `PAYMENT METHOD`,
        value: `\`${paymentMethod}\``,
      },
    ];

    if (buyerMessage.length) {
      buyerFields.push({
        name: `BUYER MESSAGE`,
        value: `\`\`\`${buyerMessage}\`\`\``,
      });
    }

    const buyerEmbed = new EmbedBuilder()
      .setDescription(`### 👤 BUYER DETAILS`)
      .setColor("#2B2D31")
      .addFields(buyerFields);

    const thread = await channel.threads.create({
      name: `${emoji} ${orderId} | ${status}`,
      autoArchiveDuration: 1440,
    });
    await thread.join();

    await thread.send({
      embeds: [orderEmbed, buyerEmbed],
      files: lineitemsImages,
    });

    return {
      ok: true,
      message: "success",
      updateData: { orderId: id, threadId: thread.id },
    };
  } catch (error) {
    return { ok: false, message: error.message, updateData: null };
  }
}

async function processTiktokNotifications(order) {
  const id = order.id;
  try {
    const channel = client.channels.cache.get("1178932906014556171");

    const orderId = maskOrderId(order.id);
    const subtotal = Number(order.payment.sub_total);
    const platformDiscount = Number(order.payment.platform_discount);
    const sfSellerDiscount = Number(order.payment.shipping_fee_seller_discount);
    const totalSubtotal = subtotal + platformDiscount - sfSellerDiscount;
    const paymentMethod = order.payment_method_name;
    const orderStatus = order.status;
    const buyerMessage = order.buyer_message;
    const buyerId = order.user_id;
    const orderCreateTime = moment
      .unix(order.create_time)
      .format("MMMM DD, YYYY [at] h:mm A");
    const lineitemsImages = order.line_items.map((item) => item.sku_image);

    let emoji;
    let status;
    switch (orderStatus) {
      case "AWAITING_SHIPMENT":
        emoji = "⌛";
        status = "Pending";
        break;
      case "AWAITING_COLLECTION":
        emoji = "📦";
        status = "Packed and Waiting for Pickup";
        break;
      case "IN_TRANSIT":
        emoji = "🚚";
        status = "In Transit";
        break;
      case "CANCELLED":
        emoji = "🚫";
        status = "Cancelled";
        break;
      case "DELIVERED":
        emoji = "✅";
        status = "Delivered";
        break;
      case "COMPLETED":
        emoji = "⭐";
        status = "Completed";
        break;

      default:
        emoji = "";
        status = orderStatus;
        break;
    }

    let description = "";
    order.line_items.forEach((item) => {
      description += `▪️ ${item.product_name}\n`;
    });

    let title = `### 🛒 NEW TIKTOK ORDER`;
    let name = "ORDER";
    if (subtotal === 0) {
      title = `### 🧧 NEW TIKTOK GIVEAWAY`;
      name = "GIVEAWAY";
    }

    const orderEmbed = new EmbedBuilder()
      .setDescription(title)
      .setColor("#2B2D31")
      .addFields([
        {
          name: `ORDER ID`,
          value: `\`${orderId}\``,
        },
        {
          name: `ORDER CREATE TIME`,
          value: `\`${orderCreateTime}\``,
        },
        {
          name: `${name} SUBTOTAL`,
          value: `\`${pesoFormatter.format(subtotal)}\``,
        },
        {
          name: `${name} PLATFORM DISCOUNT`,
          value: `\`${pesoFormatter.format(platformDiscount)}\``,
        },
        {
          name: `${name} SHIPPING FEE SELLER DISCOUNT`,
          value: `\`${pesoFormatter.format(sfSellerDiscount)}\``,
        },
        {
          name: `${name} TOTAL SUBTOTAL`,
          value: `\`${pesoFormatter.format(totalSubtotal)}\``,
        },
        {
          name: `${name} ITEMS`,
          value: `\`\`\`${description}\`\`\``,
        },
      ]);

    const buyerFields = [
      {
        name: `BUYER ID`,
        value: `\`${buyerId}\``,
      },
      {
        name: `PAYMENT METHOD`,
        value: `\`${paymentMethod}\``,
      },
    ];

    if (buyerMessage) {
      buyerFields.push({
        name: `BUYER MESSAGE`,
        value: `\`\`\`${buyerMessage}\`\`\``,
      });
    }

    const buyerEmbed = new EmbedBuilder()
      .setDescription(`### 👤 BUYER DETAILS`)
      .setColor("#2B2D31")
      .addFields(buyerFields);

    const thread = await channel.threads.create({
      name: `${emoji} ${orderId} | ${status}`,
      autoArchiveDuration: 1440,
    });
    await thread.join();

    await thread.send({
      embeds: [orderEmbed, buyerEmbed],
      files: lineitemsImages,
    });

    return {
      ok: true,
      message: "success",
      updateData: { orderId: id, threadId: thread.id },
    };
  } catch (error) {
    return { ok: false, message: error.message, updateData: null };
  }

  function maskOrderId(number) {
    let numberStr = number.toString();
    let length = numberStr.length;
    if (length < 8) {
      return numberStr;
    } else {
      let maskedStr =
        numberStr.substring(0, 4) +
        "▪️".repeat(length - 8) +
        numberStr.substring(length - 4);
      return maskedStr;
    }
  }
}

async function processLazadaNotifications(order) {
  const id = String(order.order_number);
  try {
    const channel = client.channels.cache.get("1200080084049068072");

    const orderId = String(order.order_number);
    const totalSubtotal = order.order_items.reduce((total, item) => {
      return total + Number(item.item_price);
    }, 0);
    const totalShippingFee = order.order_items.reduce((total, item) => {
      return total + Number(item.shipping_amount);
    }, 0);
    const totalVoucher = order.order_items.reduce((total, item) => {
      return total + Number(item.voucher_amount);
    }, 0);
    const paidAmount = totalSubtotal + totalShippingFee - totalVoucher;
    const orderStatus = order.order_items[0].status;
    const buyerId = order.order_items[0].buyer_id;

    const orderCreateTime = moment(
      order.order_items[0].created_at,
      "YYYY-MM-DD HH:mm:ss Z"
    ).format("MMMM DD, YYYY [at] h:mm A");

    const lineitemsImages = order.order_items.map(
      (item) => item.product_main_image
    );

    let emoji;
    let status;
    switch (orderStatus) {
      case "pending":
        emoji = "⌛";
        status = "Pending";
        break;
      case "packed":
        emoji = "📦";
        status = "Packed";
        break;
      case "ready_to_ship_pending":
        emoji = "⌛📦";
        status = "Waiting For Pickup";
        break;
      case "ready_to_ship":
        emoji = "⌛🚚";
        status = "Waiting for Transit";
        break;
      case "shipped":
        emoji = "🚚";
        status = "In Transit";
        break;
      case "canceled":
        emoji = "🚫";
        status = "Cancelled";
        break;
      case "delivered":
        emoji = "✅";
        status = "Delivered";
        break;
      case "confirmed":
        emoji = "⭐";
        status = "Completed";
        break;

      default:
        emoji = "";
        status = orderStatus;
        break;
    }

    let description = "";
    order.order_items.forEach((item) => {
      description += `▪️ ${item.name}\n`;
    });

    const title = `### 🛒 NEW LAZADA ORDER`;

    const orderEmbed = new EmbedBuilder()
      .setDescription(title)
      .setColor("#2B2D31")
      .addFields([
        {
          name: `ORDER ID`,
          value: `\`${orderId}\``,
        },
        {
          name: `BUYER ID`,
          value: `\`${buyerId}\``,
        },
        {
          name: `ORDER CREATE TIME`,
          value: `\`${orderCreateTime}\``,
        },
        {
          name: `ORDER TOTAL SUBTOTAL`,
          value: `\`${pesoFormatter.format(totalSubtotal)}\``,
        },
        {
          name: `ORDER SHIPPING FEE`,
          value: `\`${pesoFormatter.format(totalShippingFee)}\``,
        },
        {
          name: `ORDER VOUCHER DISCOUNT`,
          value: `\`${pesoFormatter.format(totalVoucher)}\``,
        },
        {
          name: `ORDER TOTAL PAID`,
          value: `\`${pesoFormatter.format(paidAmount)}\``,
        },
        {
          name: `ORDER ITEMS`,
          value: `\`\`\`${description}\`\`\``,
        },
      ]);

    const thread = await channel.threads.create({
      name: `${emoji} ${orderId} | ${status}`,
      autoArchiveDuration: 1440,
    });
    await thread.join();

    await thread.send({
      embeds: [orderEmbed],
      files: lineitemsImages,
    });

    return {
      ok: true,
      message: "success",
      updateData: { orderId: id, threadId: thread.id },
    };
  } catch (error) {
    return { ok: false, message: error.message, updateData: null };
  }
}
