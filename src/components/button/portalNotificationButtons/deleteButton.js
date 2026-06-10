const { EmbedBuilder } = require('discord.js');
const db = require('../../../sqliteConnection.js');
const {
  deleteOnPortal,
} = require('../../../webhook/websiteRoutes/notifications/portalNotification.js');

module.exports = {
  data: {
    name: 'portalNotifDelete',
  },
  async execute(interaction, client) {
    const notificationId = interaction.customId.split('_').slice(1).join('_');

    try {
      await deleteOnPortal(notificationId);
    } catch (error) {
      console.error('Failed to sync deletion to Portal:', error);
    }

    db.prepare('DELETE FROM portal_notifications WHERE notification_id = ?').run(notificationId);

    try {
      await interaction.message.delete();
    } catch (error) {
      // DM messages from the bot can normally be deleted, but fall back to a tombstone.
      const tombstone = new EmbedBuilder()
        .setColor(0x99aab5)
        .setDescription('🗑️ This notification was deleted.');

      await interaction.update({
        content: '',
        embeds: [tombstone],
        components: [],
      });
    }
  },
};
