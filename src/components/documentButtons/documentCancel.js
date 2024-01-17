const {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const userChannels = [
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
    name: `documentCancel`,
  },
  async execute(interaction, client) {
    const components = interaction.message.components[0].components;

    if (components[1].label === "Cancel") {
      await interaction.deferUpdate();
      const cancelEmbed = new EmbedBuilder()
        .setTitle("Command Cancelled")
        .setDescription("You have cancelled the document signing.")
        .setColor("Red");

      await interaction.editReply({
        embeds: [cancelEmbed],
        components: [],
      });
    } else {
      const message = await interaction.message.channel.messages.fetch(
        interaction.message.id
      );
      const messageEmbed = interaction.message.embeds[0];

      const noSignIndex = messageEmbed.data.fields.findIndex((field) =>
        field.name.includes("⌛")
      );

      const match =
        messageEmbed.data.fields[noSignIndex].value.match(/<@(\d+)>/);
      const userId = match && match[1];

      if (interaction.user.id !== userId) {
        await interaction.reply({
          content: `You cannot return this document.`,
          ephemeral: true,
        });
        return;
      }

      const linkButton = new ButtonBuilder(components[2].data);
      const buttonRow = new ActionRowBuilder().addComponents(linkButton);

      const members = await interaction.guild.members.fetch();
      const author = members.find((m) =>
        messageEmbed.data.footer.text.includes(m.nickname)
      );

      const modal = new ModalBuilder();

      modal.setCustomId("returnRequest").setTitle(`Return the document`);
      const details = new TextInputBuilder()
        .setCustomId(`details`)
        .setLabel(`Return Reason`)
        .setPlaceholder(
          `The reason of returning the document to ${author.nickname}.`
        )
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(details);
      modal.addComponents(firstRow);
      await interaction.showModal(modal);

      const modalResponse = await interaction.awaitModalSubmit({
        filter: async (i) => {
          const f =
            i.customId === "returnRequest" && i.user.id === interaction.user.id;

          if (f) {
            await i.deferUpdate();
          }
          return f;
        },
        time: 120000,
      });

      try {
        if (modalResponse.isModalSubmit()) {
          const details = modalResponse.fields.getTextInputValue("details");

          if (interaction.message.embeds[0].data.description) {
            interaction.message.embeds[0].data.description += `\n\n> Returned by **${interaction.member.nickname}**:\n> *"${details}"*`;
          } else {
            interaction.message.embeds[0].data.description = `> Returned by **${interaction.member.nickname}**:\n> *"${details}"*`;
          }

          const userData = userChannels.find((obj) =>
            obj.users.includes(author.user.id)
          );
          let channel;
          if (userData) {
            channel = userData.channel;
          } else {
            channel = "1053860453853433860";
          }

          await client.channels.cache
            .get(channel)
            .send({
              content: `<@${author.user.id}>`,
              embeds: [interaction.message.embeds[0].data],
              components: [buttonRow],
            })
            .then((msg) => {
              message.delete();
            });
        }
      } catch (error) {
        console.log(error);
        await modalResponse.followUp({
          content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
          ephemeral: true,
        });
      }
    }
  },
};
