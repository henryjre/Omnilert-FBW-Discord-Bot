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

const vnrRejectChannelId = "1424951606436434032";

module.exports = {
  data: {
    name: `vnrReject`,
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const mentionableMembers = messageEmbed.data.fields.find((f) =>
      f.name.includes("Requested By")
    );

    const modal = new ModalBuilder()
      .setCustomId(`rejectVn_${interaction.id}`)
      .setTitle(`Reject Violation Notice`);

    const details = new TextInputBuilder()
      .setCustomId(`rejectVnReason`)
      .setLabel(`Reason for Rejection`)
      .setPlaceholder(`Insert the rejection details here.`)
      .setMaxLength(1000)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(details);
    modal.addComponents(firstRow);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `rejectVn_${interaction.id}` &&
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
        const details =
          modalResponse.fields.getTextInputValue("rejectVnReason");
        const rejectedBy = interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        );

        if (details) {
          messageEmbed.data.description += `\n\u200b\nReason for Rejection:\n> *"${details}"*\n\u200b`;
        }

        if (messageEmbed.data.footer) {
          messageEmbed.data.footer.text += `\nRejected By: ${rejectedBy}`;
        } else {
          messageEmbed.data.footer = {
            text: `Rejected By: ${rejectedBy}`,
          };
        }

        messageEmbed.data.color = 15548997;

        const vnrRejectMessage = await client.channels.cache
          .get(vnrRejectChannelId)
          .send({
            content: mentionableMembers.value,
            embeds: [messageEmbed],
          });

        await client.commands
          .get("edit_vnr_status")
          .execute(messageEmbed, "Rejected", vnrRejectMessage.url, client);

        await interaction.message.delete();

        // Check if the message is in a thread and delete it if so
        if (interaction.channel.isThread()) {
          try {
            // Delete the starter message first
            const starterMessage =
              await interaction.channel.fetchStarterMessage();
            if (starterMessage) {
              await starterMessage.delete();
            }

            // Then delete the thread itself
            await interaction.channel.delete();
          } catch (threadError) {
            console.log(
              "Error deleting thread or starter message:",
              threadError
            );
          }
        }
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while rejecting the violation notice. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
