const { ActionRowBuilder, ButtonBuilder, EmbedBuilder } = require("discord.js");
const moment = require("moment");

const userChannels = [
  {
    //web dev
    users: ["864920050691866654"],
    channel: "1203998793473728572",
  },
  {
    //web dev
    users: ["748568303219245117"],
    channel: "1117387044696641607",
  },
  {
    //operations
    users: ["762612635605663767", "1196489541649977419"],
    channel: "1117386962580541473",
  },
  {
    //procurement
    users: ["851719358430576641"],
    channel: "1117386986374823977",
  },
  {
    //design
    users: ["719135399859060796"],
    channel: "1117387017089728512",
  },
  {
    //finance
    users: ["1120869673974649035"],
    channel: "1118180874136059964",
  },
  {
    //livestream
    users: ["938140159541665842"],
    channel: "1185979300936155136",
  },
  {
    //tiktok acc
    users: ["752713584148086795"],
    channel: "1185979374198071436",
  },
  {
    //tiktok seller center
    users: ["756483149411909693"],
    channel: "1185979531216027730",
  },
  {
    //lazada seller center
    users: ["841943205624283136"],
    channel: "1197118556467376188",
  },
  {
    //shopee seller center
    users: ["1196432863751577690"],
    channel: "1197118789855223888",
  },
];

module.exports = {
  data: {
    name: `documentSign`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    const message = await interaction.message.channel.messages.fetch(
      interaction.message.id
    );
    const components = interaction.message.components[0].components;
    const messageEmbed = interaction.message.embeds[0];
    const embedFields = messageEmbed.data.fields;

    const noSignIndex = embedFields.findIndex((field) =>
      field.name.includes("⌛")
    );

    if (components[0].label === "Submit") {
      if (!messageEmbed.data.fields[0].value.includes(interaction.user.id)) {
        await interaction.followUp({
          content: `You cannot use this button.`,
          ephemeral: true,
        });
        return;
      }
      const signButton = new ButtonBuilder(components[0].data).setLabel("Sign");
      const cancelButton = new ButtonBuilder(components[1].data).setLabel(
        "Return"
      );
      const documentButton = new ButtonBuilder(components[2].data);

      const newButtonRow = new ActionRowBuilder().addComponents(
        signButton,
        cancelButton,
        documentButton
      );

      const match = embedFields[noSignIndex].value.match(/<@(\d+)>/);
      const userId = match && match[1];

      const userData = userChannels.find((obj) => obj.users.includes(userId));
      let channel;
      if (userData) {
        channel = userData.channel;
      } else {
        channel = "1197134163262832722";
      }

      await client.channels.cache
        .get(channel)
        .send({
          content: `<@${userId}>`,
          embeds: [messageEmbed.data],
          components: [newButtonRow],
        })
        .then((msg) => {
          message.delete();
        });
    } else {
      if (noSignIndex !== -1) {
        const match = embedFields[noSignIndex].value.match(/<@(\d+)>/);
        const userId = match && match[1];

        if (interaction.user.id !== userId) {
          await interaction.followUp({
            content: `You cannot sign this document. Please wait for the preceding recipient to sign.`,
            ephemeral: true,
          });
          return;
        }
        interaction.message.embeds[0].data.fields[
          noSignIndex
        ].value = `${interaction.user.toString()} | Signed ${moment().format(
          "MM/DD/YY"
        )}`;
        interaction.message.embeds[0].data.fields[noSignIndex].name =
          interaction.message.embeds[0].data.fields[noSignIndex].name.replace(
            "⌛",
            "✅"
          );

        const updatedEmbed = new EmbedBuilder(
          interaction.message.embeds[0].data
        );

        const updatedEmbedFields = updatedEmbed.data.fields;
        const nextSignIndex = updatedEmbedFields.findIndex((field) =>
          field.name.includes("⌛")
        );

        if (nextSignIndex === -1) {
          const documentButton = new ButtonBuilder(components[2].data);
          const newButtonRow = new ActionRowBuilder().addComponents(
            documentButton
          );

          await client.channels.cache
            .get("1197134495917277204")
            .send({
              embeds: [updatedEmbed],
              components: [newButtonRow],
            })
            .then((msg) => {
              message.delete();
            });
          return;
        }

        const nextMatch =
          updatedEmbedFields[nextSignIndex].value.match(/<@(\d+)>/);
        const nextUserId = nextMatch && nextMatch[1];

        const userData = userChannels.find((obj) =>
          obj.users.includes(nextUserId)
        );
        let channel;
        if (userData) {
          channel = userData.channel;
        } else {
          channel = "1197134163262832722";
        }

        const buttonRow = new ActionRowBuilder().addComponents(components);

        await client.channels.cache
          .get(channel)
          .send({
            content: `<@${nextUserId}>`,
            embeds: [updatedEmbed],
            components: [buttonRow],
          })
          .then((msg) => {
            message.delete();
          });
      }
    }
  },
};
