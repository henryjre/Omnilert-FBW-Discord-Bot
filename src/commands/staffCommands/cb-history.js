const {
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const moment = require("moment");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cb-history")
    .setDescription("Generate a story layout cashback history.")
    .addStringOption((option) =>
      option
        .setName("page")
        .setDescription("The page of the cashback history to generate.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    await interaction.deferReply();

    const page = interaction.options.getString("page");

    const url = `https://leviosa.ph/_functions/getCashbackHistory`;
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
      body: JSON.stringify({
        page: page,
      }),
    };

    const response = await fetch(url, options)
      .then((res) => res.json())
      .catch((err) => {
        console.log(err);
        interaction.editReply({
          content:
            "🔴 FETCH ERROR: An error has occured while fetching the request.",
        });
        return;
      });

    if (!response.ok) {
      console.log(response);
      interaction.editReply({
        content: `🔴 ERROR: ${response.message}.`,
      });
      return;
    }

    const cashbacks = response.data;

    registerFont("src/canvas/pamphlet/fonts/WixMadeforText-Regular.ttf", {
      family: "MadeforRegular",
    });
    registerFont("src/canvas/pamphlet/fonts/WixMadeforText-Bold.ttf", {
      family: "MadeforBold",
    });

    const bgImage = await loadImage(
      "src/canvas/cashbackHistory/cb-history-bg.png"
    );
    const canvas = createCanvas(bgImage.width, bgImage.height); //1080, 1920
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bgImage, 0, 0);
    ctx.fillStyle = "#FEFBEA";

    ctx.font = "35px MadeforRegular";
    ctx.textAlign = "left";
    ctx.fillText(cashbacks[0].gcash.name, 135, 866);
    ctx.fillText(cashbacks[1].gcash.name, 135, 966);
    ctx.fillText(cashbacks[2].gcash.name, 135, 1069);
    ctx.fillText(cashbacks[3].gcash.name, 135, 1170);
    ctx.fillText(cashbacks[4].gcash.name, 135, 1271);

    ctx.textAlign = "center";
    ctx.fillText(
      moment(cashbacks[0]._createdDate).add(8, "hours").format("MMMM DD, YYYY"),
      780,
      866
    );
    ctx.fillText(
      moment(cashbacks[0]._createdDate).add(8, "hours").format("h:mm a"),
      780,
      906
    );

    ctx.fillText(
      moment(cashbacks[1]._createdDate).add(8, "hours").format("MMMM DD, YYYY"),
      780,
      966
    );
    ctx.fillText(
      moment(cashbacks[1]._createdDate).add(8, "hours").format("h:mm a"),
      780,
      1006
    );

    ctx.fillText(
      moment(cashbacks[2]._createdDate).add(8, "hours").format("MMMM DD, YYYY"),
      780,
      1069
    );
    ctx.fillText(
      moment(cashbacks[2]._createdDate).add(8, "hours").format("h:mm a"),
      780,
      1109
    );

    ctx.fillText(
      moment(cashbacks[3]._createdDate).add(8, "hours").format("MMMM DD, YYYY"),
      780,
      1170
    );
    ctx.fillText(
      moment(cashbacks[3]._createdDate).add(8, "hours").format("h:mm a"),
      780,
      1210
    );

    ctx.fillText(
      moment(cashbacks[4]._createdDate).add(8, "hours").format("MMMM DD, YYYY"),
      780,
      1271
    );
    ctx.fillText(
      moment(cashbacks[4]._createdDate).add(8, "hours").format("h:mm a"),
      780,
      1311
    );

    ctx.font = "35px MadeforBold";
    ctx.textAlign = "left";
    ctx.fillText(`Claimed PHP ${cashbacks[0].cashback.reward}`, 135, 906);
    ctx.fillText(`Claimed PHP ${cashbacks[1].cashback.reward}`, 135, 1006);
    ctx.fillText(`Claimed PHP ${cashbacks[2].cashback.reward}`, 135, 1109);
    ctx.fillText(`Claimed PHP ${cashbacks[3].cashback.reward}`, 135, 1210);
    ctx.fillText(`Claimed PHP ${cashbacks[4].cashback.reward}`, 135, 1311);

    ctx.font = "40px MadeforBold";
    ctx.fillStyle = "#FEFBEA";
    ctx.textAlign = "center";
    ctx.fillText("1", 100, 889);
    ctx.fillText("2", 100, 989);
    ctx.fillText("3", 100, 1092);
    ctx.fillText("4", 100, 1193);
    ctx.fillText("5", 100, 1294);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), {
      name: `sample.jpeg`,
    });

    return await interaction.editReply({
      content: `## Cashback Claim History Page ${page}`,
      files: [attachment],
    });
  },
};
