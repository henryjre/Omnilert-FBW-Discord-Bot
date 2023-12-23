const { EmbedBuilder } = require("discord.js");
const client = require("../../../../../index");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = async (req, res) => {
  const { data } = req.body;

  const url = `https://leviosa.ph/_functions/getTiktokSecrets`;
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.apiKey,
    },
  };

  const response = await fetch(url, options).catch((err) => {
    console.log("TIKTOK ORDER FETCH ERROR");
    return res.status(200).json({ ok: true, message: "fetch error" });
  });
  const responseData = await response.json();

  if (!response.ok) {
    console.log("TIKTOK ORDER FETCH NOT OK");
    return res
      .status(200)
      .json({ ok: true, message: "fetch error: fetch not ok" });
  }

  const { ok, message, order } = await getOrder(
    data.order_id,
    responseData.secrets
  );

  if (!ok) return res.status(200).json({ ok: true, message: "no order found" });

  if (order === null)
    return res.status(200).json({ ok: true, message: "no order found" });

  if (order.buyer_message && order.buyer_message.includes("DPD"))
    return res.status(200).json({ ok: true, message: "dpd winner order" });

  const orderId = maskOrderId(data.order_id);
  const subtotal = Number(order.payment.sub_total);

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

  const embed = new EmbedBuilder()
    .setDescription(title)
    .setColor("#2B2D31")
    .addFields([
      {
        name: `ORDER ID`,
        value: `\`${orderId}\``,
      },
      {
        name: `${name} SUBTOTAL`,
        value: `\`${pesoFormatter.format(subtotal)}\``,
      },
      {
        name: `${name} ITEMS`,
        value: `\`\`\`${description}\`\`\``,
      },
    ])
    .setTimestamp(Date.now());

  client.channels.cache.get("1178932906014556171").send({
    embeds: [embed],
  });

  res.status(200).json({ ok: true, message: "success" });
  return;

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

  async function getOrder(ids, options) {
    const currentTimestamp = Math.floor(new Date().getTime() / 1000);
    const apiUrl = "https://open-api.tiktokglobalshop.com/";
    const urlPath = `/order/202309/orders?app_key=${options.tiktokAppKey}&shop_cipher=${options.tiktokShopCipher}&timestamp=${currentTimestamp}&ids=${ids}`;

    const signReqOptions = {
      url: urlPath,
      headers: { "content-type": "application/json" },
    };

    const sign = await signRequest(signReqOptions);

    try {
      const response = await fetch(apiUrl + urlPath + `&sign=${sign}`, {
        method: "GET",
        headers: {
          "content-type": "application/json",
          "x-tts-access-token": options.tiktokAccessToken,
        },
      })
        .then((response) => response.json())
        .catch((error) => {
          console.error(error);
        });

      if (response.code !== 0) {
        console.log(response);
        return {
          ok: false,
          message: "There was an error while searching for your order.",
          order: null,
        };
      } else {
        return {
          ok: true,
          message: "Order found!",
          order: response.data.orders[0],
        };
      }
    } catch (error) {
      console.log(error);
      return {
        ok: false,
        message: "There was an error while searching for your order.",
        order: null,
      };
    }
  }

  async function signRequest(request) {
    const secretKey = responseData.secrets.tiktokAppSecret;
    const signature = CalSign(request, secretKey);
    return signature;

    function CalSign(req, secret) {
      const urlParts = req.url.split("?");
      const path = urlParts[0];
      const queryString = urlParts[1] || "";

      const queryParameters = {};
      queryString.split("&").forEach((param) => {
        const parts = param.split("=");
        const key = decodeURIComponent(parts.shift());
        const value = decodeURIComponent(parts.join("=")); // Join the remaining parts to form the value
        queryParameters[key] = value;
      });

      // Extract all query parameters excluding 'sign' and 'access_token'
      const keys = Object.keys(queryParameters).filter(
        (k) => k !== "sign" && k !== "access_token"
      );

      // Reorder the parameters' key in alphabetical order
      keys.sort();

      // Concatenate all the parameters in the format of {key}{value}
      let input = "";
      for (const key of keys) {
        input += key + queryParameters[key];
      }

      // Append the request path
      input = path + input;

      // If the request header Content-type is not multipart/form-data, append the body to the end
      const contentType = req.headers["content-type"];
      if (contentType !== "multipart/form-data") {
        if (req.body) {
          const body = JSON.stringify(req.body);
          input += body;
        }
      }

      // Wrap the string generated in step 5 with the App secret
      input = secret + input + secret;

      return generateSHA256(input, secret);
    }

    function generateSHA256(input, secret) {
      return crypto.createHmac("sha256", secret).update(input).digest("hex");
    }
  }
};
