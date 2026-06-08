const { MessageFlags } = require('discord.js');
const db = require('../../../sqliteConnection.js');
const {
  buildPortalNotificationContainer,
  markReadOnPortal,
} = require('../../../webhook/websiteRoutes/notifications/portalNotification.js');

function rowToPayload(row) {
  return {
    recipient: {
      user_id: row.recipient_user_id,
      discord_user_id: row.discord_user_id,
    },
    notification: {
      id: row.notification_id,
      title: row.title,
      message: row.message,
      type: row.type,
      link_url: row.link_url,
      created_at: row.created_at,
    },
  };
}

module.exports = {
  data: {
    name: 'portalNotifRead',
  },
  async execute(interaction, client) {
    const notificationId = interaction.customId.split('_').slice(1).join('_');

    const row = db
      .prepare('SELECT * FROM portal_notifications WHERE notification_id = ?')
      .get(notificationId);

    if (!row) {
      return interaction.reply({
        content: '🔴 This notification could not be found.',
        flags: MessageFlags.Ephemeral,
      });
    }

    db.prepare(
      "UPDATE portal_notifications SET status = 'read', last_updated = datetime('now') WHERE notification_id = ?"
    ).run(notificationId);

    try {
      await markReadOnPortal(notificationId);
    } catch (error) {
      console.error('Failed to sync read status to Portal:', error);
    }

    const container = buildPortalNotificationContainer(rowToPayload(row), { status: 'read' });

    await interaction.update({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
