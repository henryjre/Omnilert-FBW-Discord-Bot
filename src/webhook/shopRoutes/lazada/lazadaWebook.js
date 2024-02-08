const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");

const processedLazadaOrders = new Set();
module.exports = async (req, res) => {
  res.status(200).json({ ok: true, message: "success" });

  const body = req.body;
  const auth = req.headers.authorization;

  const secrets = await getLazSecrets();
  const appKey = secrets.appKey;
  const secretKey = secrets.appSecret;

  const stringToSign = appKey + JSON.stringify(body);
  const sign = signWebhookRequest(stringToSign, secretKey);

  if (sign !== auth) {
    return;
  }

  switch (body.message_type) {
    case 0:
      return await orderStatusChange();

    default:
      return;
  }

  async function orderStatusChange() {
    const status = body.data.order_status;
    const checkDupeId = body.data.trade_order_id + body.data.order_status;

    if (status === "unpaid") {
      return;
    }

    if (processedLazadaOrders.has(checkDupeId)) {
      console.log(
        `Duplicate order ID received: ${body.data.trade_order_id} with status ${status}. Ignoring...`
      );
      return;
    }

    processedLazadaOrders.add(checkDupeId);

    const response = await processLazadaOrder(body);
    console.log(response);
    return;
  }
};

function signWebhookRequest(input, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(input);

  return hmac.digest("hex");
}

async function getLazSecrets() {
  try {
    const url = `https://leviosa.ph/_functions/getLazadaSecrets`;
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

async function processLazadaOrder(body) {
  try {
    const url = `https://leviosa.ph/_functions/LazadaOrderStatusChange`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify(body),
    };
    const response = await fetch(url, options);
    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("LAZADA ORDER ERROR: ", error);
    return null;
  }
}
