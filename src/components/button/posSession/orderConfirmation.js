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

      const threadMessages = await interaction.message.thread.messages.fetch({
        limit: 10,
      });

      const imageMessage = threadMessages.find((message) =>
        message.attachments.some((attachment) =>
          attachment.contentType?.startsWith("image/")
        )
      );

      if (!imageMessage) {
        return interaction.message.thread.send({
          content: `🔴 ERROR: No image found. Please send a photo as proof in this thread and click "Confirm" to verify.`,
        });
      }

      const imageAttachment = imageMessage.attachments.find((attachment) =>
        attachment.contentType?.startsWith("image/")
      );

      // Correct way to set image in v14
      messageEmbed.image = { url: imageAttachment.url };

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

      // Correct way to get thread in v14
      const posThread = await sessionMessage.threads
        .fetch()
        .then((threads) => threads.threads.first());

      if (!posThread) {
        return await interaction.reply({
          content: `🔴 ERROR: No thread found.`,
          ephemeral: true,
        });
      }

      messageEmbed.setFooter({
        text: `Confirmed By: ${interaction.member.nickname.replace(
          /^[🔴🟢]\s*/,
          ""
        )}`,
      });

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
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error in order confirmation:", error);
      await interaction.followUp({
        content:
          "🔴 ERROR: An error occurred while processing your confirmation. Please try again.",
        ephemeral: true,
      });
    }
  },
};
