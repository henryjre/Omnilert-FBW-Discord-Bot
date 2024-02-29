const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

// const fetch = (...args) =>
//   import("node-fetch").then(({ default: fetch }) => fetch(...args));
// const crypto = require("crypto");
const moment = require("moment");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = async (req, res) => {
  const { data } = req.body;

  const orderInfo = data.order_info;
  const orderItems = data.order_items;
  const orderStatus = data.status;
  const channel = client.channels.cache.get("1200080084049068072");

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

  const orderId = maskOrderId(orderInfo.order_id);
  const subtotal = Number(orderInfo.price);
  const paymentMethod = orderInfo.payment_method;
  const buyerMessage = orderInfo.buyer_note;
  const buyerId = orderItems[0].buyer_id;
  const buyerEmail = orderItems[0].digital_delivery_info;

  const orderCreateTime = moment(
    orderInfo.created_at,
    "YYYY-MM-DD HH:mm:ss Z"
  ).format("MMMM DD, YYYY [at] h:mm A");
  const lineitemsImages = orderItems.map((item) => item.product_main_image);

  let description = "";
  orderItems.forEach((item) => {
    description += `▪️ ${item.name}\n`;
  });

  let title = `### 🛒 NEW LAZADA ORDER`;
  let name = "ORDER";

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
    {
      name: `BUYER EMAIL`,
      value: `\`${buyerEmail}\``,
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

  try {
    const thread = await channel.threads.create({
      name: `${emoji} ${orderId} | ${status}`,
      autoArchiveDuration: 1440,
    });

    res
      .status(200)
      .json({ ok: true, message: "success", channelId: thread.id });

    await thread.join();

    await thread.send({
      embeds: [orderEmbed, buyerEmbed],
      files: lineitemsImages,
    });

    return;
  } catch (error) {
    console.log(error);
    console.log(orderEmbed, buyerEmbed);
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
};
