const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const departments = require("../../../config/departments.json");

const managementRole = "1314413671245676685";

module.exports = {
  data: {
    name: `posOrderVerificationReject`,
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const sessionField = messageEmbed.data.fields.find(
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
      .setCustomId(`tokenPayReject_${interaction.id}`)
      .setTitle(`Token Pay Reject Reason`);

    const details = new TextInputBuilder()
      .setCustomId(`rejectReason`)
      .setLabel(`Reason for Rejection`)
      .setPlaceholder(`Insert the reason for rejection here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `tokenPayReject_${interaction.id}` &&
          i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 300000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue("rejectReason");

        const sessionName = sessionField.value;

        const department = departments.find(
          (d) => d.verificationChannel === interaction.message.channelId
        );

        const posChannel = client.channels.cache.get(department.posChannel);

        const sessionMessage = await posChannel.messages
          .fetch({ limit: 100 })
          .then((messages) =>
            messages.find((msg) => msg.content.includes(sessionName))
          );

        const posThread = await sessionMessage.thread;

        if (!posThread) {
          return await modalResponse.followUp({
            content: `🔴 ERROR: No thread found.`,
            ephemeral: true,
          });
        }

        if (details) {
          messageEmbed.data.description += `\n\u200b\nReason for Refund:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Rejected By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        await posThread.send({
          content: `<@&${managementRole}>`,
          embeds: [messageEmbed],
        });

        await interaction.message.delete();
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        ephemeral: true,
      });
    }
  },
};
