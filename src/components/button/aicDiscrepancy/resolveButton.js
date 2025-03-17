const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const inventoryRole = "1336990783341068348";

module.exports = {
  data: {
    name: `aicResolveButton`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    if (!interaction.member.roles.cache.has(inventoryRole)) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`aicResolution_${interaction.id}`)
      .setTitle(`Resolve AIC Discrepancy`);

    const details = new TextInputBuilder()
      .setCustomId(`resolution`)
      .setLabel(`Resolution`)
      .setPlaceholder(`Add the resolution details.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `aicResolution_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 120000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue("resolution");

        messageEmbed.data.fields.push({
          name: "Resolution",
          value: `*${details}*`,
        });

        messageEmbed.data.footer = {
          icon_url: interaction.user.displayAvatarURL(),
          text: `Resolved By: ${
            interaction.member?.nickname.replace(/^[🔴🟢]\s*/, "") ||
            interaction.user.globalName
          }`,
        };

        messageEmbed.data.color = 5763719;

        await interaction.message.edit({
          embeds: [messageEmbed],
          components: [],
        });
      }
    } catch (error) {
      console.log(error);
      // await modalResponse.followUp({
      //   content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
      //   ephemeral: true,
      // });
    }
  },
};
