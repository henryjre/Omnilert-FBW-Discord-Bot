const {
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
} = require("discord.js");
const moment = require("moment-timezone");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

// const conn = require("../../sqlConnection");
// const pools = require("../../sqlPools.js");
const commissionRates = require("./commission.json");
const ExcelJS = require("exceljs");

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
    const interactionMember = interaction.guild.members.cache.get(
      interaction.user.id
    );

    if (!interactionMember.roles.cache.some((r) => validRoles.includes(r.id))) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1176496361802301462>.`,
        ephemeral: true,
      });
      return;
    }

    const streamer = interaction.options.getUser("livestreamer");
    const start = interaction.options.getString("start-time");
    const duration = interaction.options.getString("duration");
    const member = interaction.guild.members.cache.get(streamer.id);

    await interaction.deferReply();
    if (!member.roles.cache.has("1117440696891220050")) {
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
    const streamerName = member.nickname;

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();
    // const def_connection = await conn.leviosaConnection();
    const def_connection = await pools.leviosaPool.getConnection();

    const findDupeQuery =
      "SELECT * FROM Tiktok_Livestream_Schedules WHERE LIVE_ID = ?";
    const findDupe = await connection
      .query(findDupeQuery, [liveId])
      .catch((err) => console.log(err));

    const querySecrets = "SELECT * FROM Shop_Tokens WHERE ID = ?";
    const [secretsResult] = await def_connection.query(querySecrets, [
      process.env.tiktok_secrets_id,
    ]);

    // await def_connection.end();
    def_connection.release();

    const secrets = secretsResult[0];

    const ordersResponse = await getOrdersLists(
      apiStartTime,
      apiEndTime,
      "",
      secrets
    );

    const embedStartDate = timeDates.start.format("MMM D, YYYY, h:mm A");
    const embedEndDate = timeDates.end.format("MMM D, YYYY, h:mm A");
    const livestreamId = nanoid();

    let embed = { color: "#78B159", emoji: "🟢", description: "" };
    let ordersToSave, ordersToExcel;
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
      ordersToExcel = [];
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
          secrets
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
          moment
            .unix(obj.create_time)
            .tz("Asia/Manila")
            .format("YYYY-MM-DD HH:mm:ss"),
        ];
      });

      ordersToExcel = orders.map((obj) => {
        const subtotal = Number(obj.payment.sub_total);
        const platformDiscount = Number(obj.payment.platform_discount);
        const sfSellerDiscount = Number(
          obj.payment.shipping_fee_seller_discount
        );
        const totalSubtotal = subtotal + platformDiscount - sfSellerDiscount;

        return [
          maskOrderId(obj.id),
          obj.status,
          pesoFormatter.format(totalSubtotal),
          moment
            .unix(obj.create_time)
            .tz("Asia/Manila")
            .format("MMMM DD, YYYY [at] h:mm A"),
          streamerName,
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

    let excelFile;

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

      excelFile = await createExcelFile(ordersToExcel, livestreamId);
    } else {
      embed.color = "Orange";
      embed.description = "No orders found within that livestream period.";
      embed.emoji = "🟠";

      excelFile = undefined;
    }

    const commission = calculateCommission(livestreamStats.netSubtotal);
    livestreamStats.netCommission = commission;

    const insertQueryLive =
      "INSERT INTO Tiktok_Livestream_Schedules (STREAM_ID, STREAMER_ID, STREAMER_NAME, START_TIME, END_TIME, LIVE_ID) VALUES (?, ?, ?, ?, ?, ?)";
    await connection
      .query(insertQueryLive, [
        livestreamId,
        streamer.id,
        streamerName,
        apiStartTime,
        apiEndTime,
        liveId,
      ])
      .catch((err) => console.log(err));

    // await connection.end();
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
          value: streamerName,
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
        text: `Command by: ${interactionMember.nickname}`,
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

    if (excelFile !== undefined) {
      messagePayload.files = [excelFile];
    }

    await interaction.editReply(messagePayload);

    async function getOrdersLists(start, end, nextPage, options) {
      const currentTimestamp = Math.floor(new Date().getTime() / 1000);
      const urlPath = `/order/202309/orders/search?app_key=${options.APP_KEY}&shop_cipher=${options.SHOP_CIPHER}&timestamp=${currentTimestamp}&page_token=${nextPage}&page_size=100`;
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
            "x-tts-access-token": options.ACCESS_TOKEN,
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
      const secretKey = secrets.APP_SECRET;
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

    async function createExcelFile(data, streamId) {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const streamIdRow = worksheet.addRow([
        "LIVESTREAM ID",
        streamId,
        "",
        "",
        "",
        "",
      ]);
      streamIdRow.getCell(1).font = { bold: true };

      worksheet.addRow(["", "", "", "", "", ""]);

      const headerRow = worksheet.addRow([
        "ORDER ID",
        "ORDER STATUS",
        "ORDER SUBTOTAL",
        "ORDER CREATED DATE",
        "LIVESTREAM HOST",
      ]);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true };
      });

      // Adding data
      data.forEach((row) => worksheet.addRow(row));

      for (let i = 1; i <= 5; i++) {
        worksheet.getColumn(i).width = 30;
        worksheet.getColumn(i).eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      }

      // Writing to buffer
      const buffer = await workbook.xlsx.writeBuffer();

      const attachment = new AttachmentBuilder()
        .setFile(buffer)
        .setName(`LIVESTREAM-${streamId}-ORDERS.xlsx`);

      return attachment;
    }
  },
};
