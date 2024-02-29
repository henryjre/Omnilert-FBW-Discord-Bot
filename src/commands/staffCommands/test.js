const { SlashCommandBuilder, Embed, EmbedBuilder } = require("discord.js");
const { leviosaPool } = require("../../sqlConnection");
const XLSX = require("xlsx");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Returns an embed."),
  // .addAttachmentOption((option) =>
  //   option
  //     .setName("csv")
  //     .setDescription("The products csv file")
  //     .setRequired(true)
  // )
  async execute(interaction, client) {
    await interaction.deferReply();
    const timest = Math.floor(Date.now() / 1000);
    const path = "/api/v2/auth/token/get";
    const partnerKey =
      "424b4941644c776870534b4d474e45566e6d516e74717241717966637371634c";

    const partnerId = 1122945;
    const host = "https://partner.test-stable.shopeemobile.com";

    const baseString = `${partnerId}${path}${timest}`;

    const sign = signRequest(baseString, partnerKey);

    const params = {
      partner_id: partnerId,
      timestamp: timest,
      sign: sign,
    };

    const body = {
      partner_id: partnerId,
      shop_id: parseInt(process.env.shopeeShopId),
      code: "4f46796c5450515162514f7344655166",
    };

    const url = `${host}${path}?${Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")}`;

    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      };
      const response = await fetch(url, options);
      const responseData = await response.json();

      console.log(responseData);
    } catch (error) {
      console.log("LAZADA SECRETS FETCH ERROR: ", error);
      return null;
    }
  },
};

function signRequest(input, partnerKey) {
  const inputBuffer = Buffer.from(input, "utf-8");
  const keyBuffer = Buffer.from(partnerKey, "utf-8");
  const hmac = crypto.createHmac("sha256", keyBuffer);
  hmac.update(inputBuffer);

  return hmac.digest("hex");
}
