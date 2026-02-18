const { EmbedBuilder, MessageFlags } = require("discord.js");
const { addAcknowledgment, getAnnouncementTracking } = require("../../../sqliteFunctions");
const moment = require("moment-timezone");

module.exports = {
  data: {
    name: `announcementAcknowledge`,
  },
  async execute(interaction, client) {
    const announcementId = interaction.message.id;
    const userId = interaction.user.id;

    // Check if this announcement is being tracked
    const tracking = getAnnouncementTracking(announcementId);

    if (!tracking) {
      // Announcement not tracked or already processed
      const replyEmbed = new EmbedBuilder()
        .setDescription(`This announcement is no longer accepting acknowledgments.`)
        .setColor("Grey");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Check if user is in expected users list
    if (!tracking.expected_users.includes(userId)) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`You are not required to acknowledge this announcement.`)
        .setColor("Grey");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Try to add acknowledgment
    const result = addAcknowledgment(announcementId, userId);

    if (result.alreadyAcknowledged) {
      const replyEmbed = new EmbedBuilder()
        .setDescription(`You have already acknowledged this announcement.`)
        .setColor("Grey");

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    // First time acknowledgment - send embed to thread
    try {
      const thread = await client.channels.fetch(tracking.thread_id);

      if (thread) {
        const timestamp = moment().tz('Asia/Manila').format('MMMM D, YYYY [at] h:mm A');

        const ackEmbed = new EmbedBuilder()
          .setTitle('✅ Acknowledged')
          .setDescription(`${interaction.user} • ${timestamp}`)
          .setColor(0x00FF00) // Green
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

        await thread.send({ embeds: [ackEmbed] });
      }
    } catch (error) {
      console.error('Error sending acknowledgment embed to thread:', error.message);
    }

    // Reply to user
    const successEmbed = new EmbedBuilder()
      .setDescription(`Your acknowledgment has been recorded.`)
      .setColor("Green");

    await interaction.reply({
      embeds: [successEmbed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
