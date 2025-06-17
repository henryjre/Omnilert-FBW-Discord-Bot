const { MessageFlags, EmbedBuilder } = require("discord.js");

const departments = require("../../../config/departments.json");

module.exports = {
  data: {
    name: `posOrderVerificationConfirm`,
  },
  async execute(interaction, client) {
    try {
      let messageEmbed = interaction.message.embeds[0];

      const replyEmbed = new EmbedBuilder();

      const sessionField = messageEmbed.data.fields.find(
        (f) => f.name === "Session Name"
      );
      const image = messageEmbed.data.image;

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

      await interaction.deferUpdate();

      if (!image) {
        return await interaction.followUp({
          content: `🔴 ERROR: No proof of order found. Please send a photo as proof in the thread below and click "Confirm" to verify.`,
          flags: MessageFlags.Ephemeral,
        });
      }

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
        return await interaction.followUp({
          content: `🔴 ERROR: No thread found.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      messageEmbed.data.footer = {
        text: `Approved By: ${interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        )}`,
      };

      await posThread.send({
        embeds: [messageEmbed],
      });

      // Add error handling for deletions
      try {
        await interaction.message.thread.delete();
        await interaction.message.delete();
      } catch (error) {
        console.error("Error deleting messages:", error);
        await interaction.followUp({
          content:
            "🔴 ERROR: Failed to clean up messages. Please contact an administrator.",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (error) {
      console.error("Error in order confirmation:", error);
      await interaction.followUp({
        content:
          "🔴 ERROR: An error occurred while processing your confirmation. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
