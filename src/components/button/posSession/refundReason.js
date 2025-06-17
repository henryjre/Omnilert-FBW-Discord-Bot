const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

module.exports = {
  data: {
    name: `posOrderVerificationRefundReason`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionName = messageEmbed.data.fields.find(
      (f) => f.name === "Session Name"
    );

    const messageMention = interaction.message.mentions.users.first();

    if (interaction.user.id !== messageMention?.id) {
      replyEmbed
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(`orderVerifRefundReason_${interaction.id}`)
      .setTitle(`POS Order Refund Reason`);

    const details = new TextInputBuilder()
      .setCustomId(`refundReason`)
      .setLabel(`Reason for Refund`)
      .setPlaceholder(`Insert the reason for refund here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `orderVerifRefundReason_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 180000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details =
          modalResponse.fields.getTextInputValue("additionalNotes");

        if (details) {
          messageEmbed.data.description += `\n\u200b\nReason for Rejection:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Rejected By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        messageEmbed.data.color = 15548997;

        await client.channels.cache
          .get(logsChannel)
          .send({
            content: mentionableMembers,
            embeds: [messageEmbed],
          })
          .then((msg) => {
            interaction.message.delete();
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
