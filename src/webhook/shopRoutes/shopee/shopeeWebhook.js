const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");

const processedShopeeOrders = new Set();
module.exports = async (req, res) => {
  console.log(req);

  const secrets = await getShopeeSecrets();
  const receivedSignature = req.get("Authorization");
  const url = req.originalUrl;
  const responseContent = JSON.stringify(req.body);
  const partnerKey = secrets.appKey;

  const sign = signWebhookRequest(url, responseContent, partnerKey);

  if (sign !== receivedSignature) {
    console.log("signature mismatch for shopee webhook")
    res.status(401).json({ ok: false, message: "unauthorized" });
    return;
  }

  res.status(200).json({ ok: true, message: "success" });

  const body = req.body;

  switch (body.code) {
    case 3:
      return await orderStatusChange();

    default:
      return;
  }

  async function orderStatusChange() {
    const status = body.data.status;
    const checkDupeId = body.data.ordersn + body.data.status;

    // if (status === "UNPAID") {
    //   return;
    // }

    if (processedShopeeOrders.has(checkDupeId)) {
      console.log(
        `Duplicate shopee order ID received: ${body.data.trade_order_id} with status ${status}. Ignoring...`
      );
      return;
    }
    processedShopeeOrders.add(checkDupeId);

    const orderFetch = await getOrderDetail(secrets, body.data.ordersn);
    console.log(orderFetch);
    return
  }
};

function signWebhookRequest(url, responseContent, partnerKey) {
  const signatureBaseString = `${url}|${responseContent}`;
  const keyBuffer = Buffer.from(partnerKey, "utf-8");
  const hmac = crypto.createHmac("sha256", keyBuffer);
  hmac.update(signatureBaseString);
  return hmac.digest("hex");
}

async function getShopeeSecrets() {
  try {
    const url = `https://leviosa.ph/_functions/getShopeeSecrets`;
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
    };
    const response = await fetch(url, options);
    const responseData = await response.json();
    return responseData.secrets;
  } catch (error) {
    console.log("LAZADA SECRETS FETCH ERROR: ", error);
    return null;
  }
}

async function getOrderDetail(secrets, orderId) {
  const host = "https://partner.test-stable.shopeemobile.com";
  const path = "/api/v2/order/get_order_detail";
  const timest = Math.floor(Date.now() / 1000);

  const partnerKey = secrets.appKey;
  const partnerId = secrets.partnerId;
  const accessToken = secrets.accessToken;
  const shopId = secrets.shopId;

  const baseString = `${partnerId}${path}${timest}${accessToken}${shopId}`;
  const sign = signRequest(baseString, partnerKey);

  const params = {
    partner_id: partnerId,
    timestamp: timest,
    access_token: accessToken,
    shop_id: shopId,
    sign: sign,
    order_sn_list: orderId,
  };

  const url = `${host}${path}?${Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&")}`;

  try {
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    const response = await fetch(url, options);
    const responseData = await response.json();

    if (!responseData.error) {
      return { ok: true, data: responseData };
    } else {
      return { ok: false, data: responseData, error: responseData.error };
    }
  } catch (error) {
    console.log("SHOPEE FETCH ERROR: ", error);
    return { ok: false, data: null, error: error.toString() };
  }

  function signRequest(input, partnerKey) {
    const inputBuffer = Buffer.from(input, "utf-8");
    const keyBuffer = Buffer.from(partnerKey, "utf-8");
    const hmac = crypto.createHmac("sha256", keyBuffer);
    hmac.update(inputBuffer);

    return hmac.digest("hex");
  }
}
