const {
  ActionRowBuilder,
  MessageFlags,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
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

    const mentionedUser = interaction.message.mentions.users.first();
    const mentionedRole = interaction.message.mentions.roles.first();

    if (mentionedUser) {
      // Handle user mention
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;

      if (isNotMentionedUser) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot use this button.`)
          .setColor("Red");

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } else if (mentionedRole) {
      // Handle role mention
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );

      if (doesNotHaveRole) {
        replyEmbed
          .setDescription(`🔴 ERROR: You cannot use this button.`)
          .setColor("Red");

        return await interaction.reply({
          embeds: [replyEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const modal = new ModalBuilder()
      .setCustomId(`orderReject${interaction.id}`)
      .setTitle(`Order Reject Reason`);

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
          i.customId === `orderReject${interaction.id}` &&
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
            flags: MessageFlags.Ephemeral,
          });
        }

        if (details) {
          messageEmbed.data.description += `\n\u200b\nReason for Rejection:\n> *"${details}"*\n\u200b`;
        }

        messageEmbed.data.footer = {
          text: `Rejected By: ${interaction.member.nickname.replace(
            /^[🔴🟢]\s*/,
            ""
          )}`,
        };

        const submit = new ButtonBuilder()
          .setCustomId("posOrderAudit")
          .setLabel("Audit")
          .setStyle(ButtonStyle.Primary);

        const buttonRow = new ActionRowBuilder().addComponents(submit);

        await posThread.send({
          content: `<@&${managementRole}>`,
          embeds: [messageEmbed],
          components: [buttonRow],
        });

        try {
          await interaction.message.delete();

          if (interaction.message.thread) {
            await interaction.message.thread.delete();
          }
        } catch (error) {
          console.error("Error deleting messages:", error);
          await interaction.followUp({
            content:
              "🔴 ERROR: Failed to clean up messages. Please contact an administrator.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while creating your signature request. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
