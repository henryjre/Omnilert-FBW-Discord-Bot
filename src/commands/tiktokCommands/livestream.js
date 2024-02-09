const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment-timezone");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

const { managementPool } = require("../../sqlConnection");
const commissionRates = require("./commission.json");
const { time } = require("console");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("livestream")
    .setDescription("Save the tiktok livestream statistics.")
    .addUserOption((option) =>
      option
        .setName("livestreamer")
        .setDescription("The streamer of the livestream to end.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("start-time")
        .setDescription(
          "The beginning time of the livestream. E.G. 17:56 2024-01-27"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("The duration of the livestream in minutes.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const validRoles = ["1176496361802301462"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1176496361802301462>.`,
        ephemeral: true,
      });
      return;
    }

    const streamer = interaction.options.getUser("livestreamer");
    const start = interaction.options.getString("start-time");
    const duration = interaction.options.getString("duration");

    await interaction.deferReply();
    if (
      !interaction.guild.members.cache
        .get(streamer.id)
        .roles.cache.has("1117440696891220050")
    ) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`INVALID LIVESTREAMER`)
        .setColor("Red")
        .setDescription(
          `🔴 Cannot record the livestream. ${streamer.toString()} is not a livestreamer.`
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const timeDates = convertTime(start, duration);

    if (
      timeDates === null ||
      !timeDates.start.isValid() ||
      !timeDates.end.isValid()
    ) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`LIVESTREAM ERROR`)
        .setColor("Red")
        .setDescription(
          "🔴 Cannot parse the given time. Please make sure that `start-time` and `end-time` are in correct format: e.g. `20:38 2024-01-26` / `9:58 2024-01-18`"
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    if (timeDates.end.hour - timeDates.start.hour < 1.5) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`LIVESTREAM ERROR`)
        .setColor("Red")
        .setDescription(
          "🔴 Livestream duration does not meet the minimum required duration (1.5 hours)"
        );

      await interaction.editReply({
        embeds: [errorEmbed],
      });
      return;
    }

    const apiStartTime = timeDates.start.unix();
    const apiEndTime = timeDates.end.unix();

    const liveId =
      streamer.id +
      "_" +
      moment.unix(apiStartTime).tz("Asia/Manila").format("MMDDYY");
    const streamerName = streamer.globalName;
    const createdDate = moment()
      .tz("Asia/Manila")
      .format("YYYY-MM-DD HH:mm:ss");

    const connection = await managementPool
      .getConnection()
      .catch((err) => console.log(err));

    const findDupeQuery =
      "SELECT * FROM Tiktok_Livestream_Schedules WHERE LIVE_ID = ?";
    const findDupe = await connection
      .query(findDupeQuery, [liveId])
      .catch((err) => console.log(err));

    const url = `https://leviosa.ph/_functions/getTiktokSecrets`;
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
    };

    const response = await fetch(url, options).catch((err) => {
      interaction.editReply({
        content:
          "🔴 FETCH ERROR: An error has occured while fetching secret tokens.",
      });
      return;
    });
    const responseData = await response.json();

    if (!response.ok) {
      return await interaction.editReply({
        content: "🔴 FETCH ERROR: " + responseData.error,
      });
    }
    const ordersResponse = await getOrdersLists(
      apiStartTime,
      apiEndTime,
      "",
      responseData.secrets
    );

    console.log(apiStartTime, apiEndTime, ordersResponse);

    const embedStartDate = timeDates.start.format("MMM D, YYYY, h:mm A");
    const embedEndDate = timeDates.end.format("MMM D, YYYY, h:mm A");
    const livestreamId = nanoid();

    let embed = { color: "#78B159", emoji: "🟢", description: "" };
    let ordersToSave;
    if (!ordersResponse || ordersResponse.code !== 0) {
      return await interaction.editReply({
        content:
          "🔴 FETCH ERROR: There was an error while fetching tiktok livestream orders.",
      });
    } else if (
      !ordersResponse.data.orders ||
      ordersResponse.data.orders.length <= 0
    ) {
      ordersToSave = [];
    } else {
      let orders = [];

      let nextPageToken = ordersResponse.data.next_page_token;
      let ordersToPush = ordersResponse.data.orders.filter(
        (order) => Number(order.payment.sub_total) !== 0
      );
      orders = [...orders, ...ordersToPush];
      while (nextPageToken.length > 0) {
        const newResponse = await getOrdersLists(
          apiStartTime,
          apiEndTime,
          nextPageToken,
          responseData.secrets
        );
        if (!newResponse || newResponse.code !== 0) {
          break;
        }

        if (newResponse.data.orders.length > 0) {
          nextPageToken = newResponse.data.next_page_token;
          ordersToPush = newResponse.data.orders.filter(
            (order) => Number(order.payment.sub_total) !== 0
          );
          orders = [...orders, ...ordersToPush];
        } else {
          break;
        }
      }

      ordersToSave = orders.map((obj) => {
        const subtotal = Number(obj.payment.sub_total);
        const platformDiscount = Number(obj.payment.platform_discount);
        const sfSellerDiscount = Number(
          obj.payment.shipping_fee_seller_discount
        );
        const totalSubtotal = subtotal + platformDiscount - sfSellerDiscount;

        return [
          obj.id,
          livestreamId,
          obj.status,
          totalSubtotal,
          liveId,
          streamerName,
          createdDate,
        ];
      });
    }

    let livestreamStats = {
      totalOrders: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
      netSubtotal: 0,
      netCommission: 0,
    };

    if (ordersToSave.length > 0) {
      const insertQueryOrders =
        "INSERT INTO Tiktok_Livestream_Orders (ORDER_ID, STREAM_ID, ORDER_STATUS, ORDER_SUBTOTAL, LIVE_ID, STREAMER, CREATED_DATE) VALUES ?";
      await connection
        .query(insertQueryOrders, [ordersToSave])
        .catch((err) => console.log(err));

      ordersToSave.forEach((order) => {
        const order_status = order[2];
        const order_subtotal = order[3];

        if (order_status === "CANCELLED") {
          livestreamStats.cancelled += 1;
        } else if (order_status === "COMPLETED") {
          livestreamStats.completed += 1;
          livestreamStats.netSubtotal += Number(order_subtotal);
        } else {
          livestreamStats.pending += 1;
          livestreamStats.netSubtotal += Number(order_subtotal);
        }

        livestreamStats.totalOrders += 1;
      });
    } else {
      embed.color = "Orange";
      embed.description = "No orders found within that livestream period.";
      embed.emoji = "🟠";
    }

    const commission = calculateCommission(livestreamStats.netSubtotal);
    livestreamStats.netCommission = commission;

    const insertQueryLive =
      "INSERT INTO Tiktok_Livestream_Schedules (STREAM_ID, STREAMER_ID, STREAMER_NAME, START_TIME, END_TIME, LIVE_ID) VALUES (?, ?, ?, ?, ?, ?)";
    await connection
      .query(insertQueryLive, [
        livestreamId,
        streamer.id,
        streamer.globalName,
        apiStartTime,
        apiEndTime,
        liveId,
      ])
      .catch((err) => console.log(err));

    connection.release();

    const embedToSend = new EmbedBuilder()
      .setTitle(`${embed.emoji} TIKTOK LIVESTREAM SAVED`)
      .addFields([
        {
          name: `LIVESTREAM ID`,
          value: livestreamId,
        },
        {
          name: `LIVE STREAMER`,
          value: streamer.globalName,
        },
        {
          name: `ORDER DETAILS`,
          value: `**Total Orders:** ${livestreamStats.totalOrders}\n**Pending:** ${livestreamStats.pending}\n**Completed:** ${livestreamStats.completed}\n**Cancelled:** ${livestreamStats.cancelled}`,
        },
        {
          name: `ORDER NET SUBTOTAL`,
          value: pesoFormatter.format(livestreamStats.netSubtotal),
        },
        {
          name: `ORDER NET COMMISSION`,
          value: pesoFormatter.format(livestreamStats.netCommission),
        },
        {
          name: `STREAM START`,
          value: "⏱️ | " + embedStartDate,
        },
        {
          name: `STREAM END`,
          value: "⏱️ | " + embedEndDate,
        },
      ])
      .setColor(embed.color)
      .setFooter({
        text: `Command by: ${interaction.user.globalName}`,
      });

    if (embed.description.length > 0) {
      embedToSend.setDescription(embed.description);
    }

    let messagePayload = {
      embeds: [embedToSend],
    };
    if (findDupe[0].length > 0) {
      const dupeEmbed = new EmbedBuilder()
        .setDescription(
          `## WARNING: 🟡 MULTIPLE LIVESTREAM RECORDED\n*This streamer already has a livestream schedule recorded for the specified date. If you think this is a mistake, please report to the Web Development Department.*`
        )
        .addFields([
          {
            name: `RECORDED LIVESTREAM ID`,
            value: findDupe[0][0].STREAM_ID,
          },
          {
            name: `LIVE STREAMER`,
            value: findDupe[0][0].STREAMER_NAME,
          },
          {
            name: `STREAM START`,
            value:
              "⏱️ | " +
              moment
                .unix(findDupe[0][0].START_TIME)
                .tz("Asia/Manila")
                .format("MMM D, YYYY, h:mm A"),
          },
          {
            name: `STREAM END`,
            value:
              "⏱️ | " +
              moment
                .unix(findDupe[0][0].END_TIME)
                .tz("Asia/Manila")
                .format("MMM D, YYYY, h:mm A"),
          },
        ])
        .setColor("#FCD53F");

      messagePayload = {
        embeds: [dupeEmbed, embedToSend],
      };
    }

    await interaction.editReply(messagePayload);

    async function getOrdersLists(start, end, nextPage, options) {
      const currentTimestamp = Math.floor(new Date().getTime() / 1000);
      const urlPath = `/order/202309/orders/search?app_key=${options.tiktokAppKey}&shop_cipher=${options.tiktokShopCipher}&timestamp=${currentTimestamp}&page_token=${nextPage}&page_size=100`;
      const apiUrl = "https://open-api.tiktokglobalshop.com";

      const signReqOptions = {
        url: urlPath,
        headers: { "content-type": "application/json" },
        body: {
          create_time_ge: start,
          create_time_lt: end,
        },
      };

      const sign = await signRequest(signReqOptions);

      try {
        const response = await fetch(apiUrl + urlPath + `&sign=${sign}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-tts-access-token": options.tiktokAccessToken,
          },
          body: JSON.stringify(signReqOptions.body),
        });

        const responseJson = await response.json();
        return responseJson;
      } catch (error) {
        console.log(error);
        return null;
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

    function convertTime(startTime12h, duration) {
      const timeZone = "Asia/Manila";

      try {
        const momentStart = moment.tz(
          startTime12h,
          ["h:mm A YYYY-MM-DD", "hh:mm A YYYY-MM-DD"],
          timeZone
        );

        const momentEnd = momentStart.clone().add(duration, "minutes");

        return {
          start: momentStart,
          end: momentEnd,
        };
      } catch (error) {
        console.error(`Error: ${error.message}`);
        return null; // or throw the error if you prefer
      }
    }

    function calculateCommission(netSales) {
      for (const commissionRange of commissionRates) {
        const { min, max, commission } = commissionRange;

        if (
          (min <= netSales && netSales <= max) ||
          (min <= netSales && max === null)
        ) {
          if (commission === "Manual Computation") {
            return netSales * 0.1;
          } else {
            return commission;
          }
        }
      }

      if (netSales >= 20000) {
        return netSales * 0.1;
      }

      return "No commission applicable for the given netSales";
    }
  },
};
