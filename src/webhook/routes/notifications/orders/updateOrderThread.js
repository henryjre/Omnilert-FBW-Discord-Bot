const client = require("../../../../index.js");

module.exports = async (req, res) => {
  const { status, threadId, platform } = req.body;

  if (platform === "SHOPEE") {
    await processShopeeNotifications(status, threadId);
  } else if (platform === "LAZADA") {
    await processLazadaNotifications(status, threadId);
  } else if (platform === "TIKTOK") {
    await processTiktokNotifications(status, threadId);
  }

  res.status(200).json({ ok: true, message: "success" });
  return;
};

async function processShopeeNotifications(orderStatus, channelId) {
  try {
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

    const thread = client.channels.cache.get(channelId);
    await thread.setName(`${emoji} ${orderId} | ${status}`);

    return {
      ok: true,
      message: "success",
    };
  } catch (error) {
    return { ok: false, message: error.message, updateData: null };
  }
}

async function processTiktokNotifications(orderStatus, channelId) {
  try {
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

    const thread = client.channels.cache.get(channelId);
    await thread.setName(`${emoji} ${orderId} | ${status}`);

    return {
      ok: true,
      message: "success",
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

async function processLazadaNotifications(orderStatus, channelId) {
  try {
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

    const thread = client.channels.cache.get(channelId);
    await thread.setName(`${emoji} ${orderId} | ${status}`);

    return {
      ok: true,
      message: "success",
    };
  } catch (error) {
    return { ok: false, message: error.message, updateData: null };
  }
}
