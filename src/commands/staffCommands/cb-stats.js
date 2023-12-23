const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require("discord.js");
const moment = require("moment");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cb-stats")
    .setDescription("Check your total work time."),
  async execute(interaction, client) {
    await interaction.deferReply();

    const url = `https://leviosa.ph/_functions/getClaimedCashbacks`;
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

    if (!response.ok) {z
      return await interaction.editReply({
        content: "🔴 FETCH ERROR: " + responseData.error,
      });
    }

    const data = responseData.data;
    const cashbackTotals = calculateCashbackTotals(data);

    const embedPages = [];
    let page = 1;

    for (const month of cashbackTotals) {
      const embedDescription = `### Cashback Statistics\nMonth: **${
        month.month
      }**\nCashback: \`${pesoFormatter.format(month.total)}\`\n\n${month.weeks
        .map((w) => `${w.week}: \`${pesoFormatter.format(w.total)}\`\n`)
        .join("")}`;

      const embed = new EmbedBuilder()
        .setDescription(embedDescription)
        .setColor("#2B2D31")
        .setTimestamp(Date.now())
        .setFooter({
          text: `Page ${page} of ${cashbackTotals.length}`,
        });

      page++;

      embedPages.push(embed);
    }

    if (embedPages.length === 1) {
      await interaction.editReply({
        embeds: embedPages,
        components: [],
        fetchReply: true,
      });

      return;
    }

    const prev = new ButtonBuilder()
      .setCustomId("prev")
      .setLabel("‹")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const first = new ButtonBuilder()
      .setCustomId("first")
      .setLabel("«")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const next = new ButtonBuilder()
      .setCustomId("next")
      .setLabel("›")
      .setStyle(ButtonStyle.Primary);

    const last = new ButtonBuilder()
      .setCustomId("last")
      .setLabel("»")
      .setStyle(ButtonStyle.Primary);

    const buttonRow = new ActionRowBuilder().addComponents(
      first,
      prev,
      next,
      last
    );

    let index = 0;

    const currentPage = await interaction.editReply({
      embeds: [embedPages[index]],
      components: [buttonRow],
      fetchReply: true,
    });

    const collector = await currentPage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) return;

      await i.deferUpdate();

      if (i.customId === "prev") {
        if (index > 0) index--;
      } else if (i.customId === "next") {
        if (index < embedPages.length - 1) index++;
      } else if (i.customId === "first") {
        index = 0;
      } else if (i.customId === "last") {
        index = embedPages.length - 1;
      }

      if (index === 0) {
        first.setDisabled(true).setStyle(ButtonStyle.Secondary);
        prev.setDisabled(true).setStyle(ButtonStyle.Secondary);
      } else {
        first.setDisabled(false).setStyle(ButtonStyle.Primary);
        prev.setDisabled(false).setStyle(ButtonStyle.Primary);
      }

      if (index === embedPages.length - 1) {
        next.setDisabled(true).setStyle(ButtonStyle.Secondary);
        last.setDisabled(true).setStyle(ButtonStyle.Secondary);
      } else {
        next.setDisabled(false).setStyle(ButtonStyle.Primary);
        last.setDisabled(false).setStyle(ButtonStyle.Primary);
      }

      await currentPage.edit({
        embeds: [embedPages[index]],
        components: [buttonRow],
      });

      collector.resetTimer();
    });

    collector.on("end", async (i) => {
      await currentPage.edit({
        embeds: [embedPages[index]],
        components: [],
      });
    });

    function formatWeekRange(startOfWeek, endOfWeek) {
      return `${startOfWeek.format("MMMM D")} - ${endOfWeek.format("MMMM D")}`;
    }

    function calculateCashbackTotals(data) {
      // Initialize an object to store totals
      const totals = [];

      // Iterate through each object in the array
      data.forEach((item) => {
        // Parse the _createdDate using moment
        const createdDate = moment(item._createdDate);

        // Get the month and week of the year
        const monthKey = createdDate.format("MMMM YYYY");
        const weekKey = formatWeekRange(
          createdDate.clone().startOf("week"),
          createdDate.clone().endOf("week")
        );

        const monthIndex = totals.findIndex(
          (entry) => entry && entry.month === monthKey
        );

        if (monthIndex === -1) {
          totals.push({
            month: monthKey,
            total:
              item.cashback && item.cashback.reward ? item.cashback.reward : 0,
            weeks: [
              {
                week: weekKey,
                total:
                  item.cashback && item.cashback.reward
                    ? item.cashback.reward
                    : 0,
              },
            ],
          });
        } else {
          // If the month is already present, update the total and weeks
          const weekIndex = totals[monthIndex].weeks.findIndex(
            (weekEntry) => weekEntry && weekEntry.week === weekKey
          );

          if (weekIndex === -1) {
            totals[monthIndex].weeks.push({
              week: weekKey,
              total:
                item.cashback && item.cashback.reward
                  ? item.cashback.reward
                  : 0,
            });
          } else {
            totals[monthIndex].weeks[weekIndex].total +=
              item.cashback && item.cashback.reward ? item.cashback.reward : 0;
          }

          totals[monthIndex].total +=
            item.cashback && item.cashback.reward ? item.cashback.reward : 0;
        }
      });

      return totals;
    }
  },
};
