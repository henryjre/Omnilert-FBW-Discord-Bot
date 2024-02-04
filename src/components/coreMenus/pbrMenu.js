const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputStyle,
  TextInputBuilder,
} = require("discord.js");

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  data: {
    name: `pbrMenu`,
  },
  async execute(interaction, client) {
    const selected = interaction.values[0];
    const title = formatTitle(selected);

    const modal = new ModalBuilder();
    modal.setCustomId("criteriaRating").setTitle(title);

    const score = new TextInputBuilder()
      .setCustomId(`score`)
      .setLabel(`Criteria Score`)
      .setPlaceholder("The score range is 0 to 10.")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(score);
    modal.addComponents(firstRow);

    await interaction.showModal(modal);

    const modalResponse = await interaction
      .awaitModalSubmit({
        filter: async (i) => {
          const f =
            i.customId === "criteriaRating" &&
            i.user.id === interaction.user.id;
          return f;
        },
        time: 180000,
      })
      .catch(async () => {
        const dmChannel = client.channels.cache.get(interaction.channelId);
        await dmChannel
          .send({
            content: `🔴 ERROR: Request timed out. Please re-submit your PBR criteria score.`,
          })
          .then((m) => {
            setTimeout(() => {
              m.delete();
            }, 10000);
          });

        return;
      });

    try {
      if (modalResponse.isModalSubmit()) {
        await modalResponse.deferUpdate();
        const scoreString = modalResponse.fields.getTextInputValue("score");
        const score = Number(scoreString);
        const maxScore = 10;
        const maxPbr = 50;

        if (isNaN(score)) {
          modalResponse
            .followUp({
              content: "🔴 ERROR: Score must be number only.",
            })
            .then((m) => {
              setTimeout(() => {
                m.delete();
              }, 5000);
            });
          return;
        } else if (score > 10 || score < 0) {
          modalResponse
            .followUp({
              content: "🔴 ERROR: Enter a score in the valid range.",
            })
            .then((m) => {
              setTimeout(() => {
                m.delete();
              }, 5000);
            });
          return;
        }

        const messageEmbed = interaction.message.embeds[0].data;
        const fieldIndex = messageEmbed.fields.findIndex((f) =>
          f.name.includes(selected)
        );
        const pbrIndex = messageEmbed.fields.findIndex(
          (f) => f.name === "Calculated PBR"
        );
        messageEmbed.fields[fieldIndex].value = scoreString;

        const embedFields = messageEmbed.fields;

        const criteriaFields = embedFields.slice(2, 8);
        const weightedAvgs = [];
        for (const c of criteriaFields) {
          const fieldName = c.name;
          const fieldValue = c.value;

          const percentageMatch = fieldName.match(/\((\d+)%\)/);
          const criteriaWeight = percentageMatch
            ? parseFloat(percentageMatch[1]) / 100
            : 0;

          const scorePercentage = parseInt(fieldValue) / maxScore;
          const weightedAvg = scorePercentage * criteriaWeight;
          weightedAvgs.push(Number(weightedAvg.toFixed(2)));
        }

        const sumAvg = weightedAvgs.reduce((a, b) => a + b, 0).toFixed(2);
        const pbr = Number(sumAvg) * maxPbr;

        messageEmbed.fields[pbrIndex].value = pesoFormatter.format(pbr);

        await modalResponse.editReply({
          embeds: [messageEmbed],
        });
      }
    } catch (error) {
      const dmChannel = client.channels.cache.get(interaction.channelId);
      await dmChannel
        .send({
          content: `🔴 ERROR: An error occurred while adding your score. Please try selecting again.`,
        })
        .then((m) => {
          setTimeout(() => {
            m.delete();
          }, 5000);
        });
    }
  },
};

function formatTitle(title) {
  const maxLength = 45;

  if (title.length > maxLength) {
    return title.substring(0, maxLength - 3) + "...";
  } else {
    return title;
  }
}
