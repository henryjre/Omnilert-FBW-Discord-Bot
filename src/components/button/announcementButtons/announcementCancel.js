const { EmbedBuilder, MessageFlags } = require("discord.js");

const cdnChannelId = "1384688917155938354";

module.exports = {
  data: {
    name: `announcementCancel`,
  },
  async execute(interaction, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const messageEmbed = interaction.message.embeds[0];

    const ownerField = messageEmbed.data.fields.find(
      (f) => f.name === "Prepared By"
    );

    if (!ownerField.value.includes(interaction.user.id)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`🔴 ERROR: You cannot use this button.`)
        .setColor("Red");

      return await interaction.editReply({
        embeds: [replyEmbed],
      });
    }

    const cancelEmbed = new EmbedBuilder()
      .setDescription("You have cancelled the announcement.")
      .setColor("Red");

    await interaction.editReply({
      embeds: [cancelEmbed],
    });

    const existingThread = await interaction.channel.threads.cache.find((t) =>
      t.name.includes(
        `Announcement Attachment Upload - ${interaction.message.id}`
      )
    );

    if (existingThread) {
      await existingThread.delete();

      const cdnChannel = await client.channels.cache.get(cdnChannelId);
      const messages = await cdnChannel.messages.fetch({ limit: 100 });
      const targetMessages = messages.filter((msg) =>
        msg.content.includes(interaction.message.id)
      );

      if (targetMessages.size > 0) {
        await cdnChannel.bulkDelete(targetMessages);
      }
    }

    await interaction.message.delete();
  },
};
