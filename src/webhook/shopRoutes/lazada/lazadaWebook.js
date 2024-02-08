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
    return res
      .status(400)
      .json({ error: "Bad request", message: "Invalid authorization" });
  }

  console.log(body);

  return;
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
    console.log(response);
    const responseData = await response.json();
    console.log(responseData);
    return responseData.secrets;
  } catch (error) {
    return null;
  }
}
