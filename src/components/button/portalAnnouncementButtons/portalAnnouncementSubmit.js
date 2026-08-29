const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const moment = require('moment-timezone');
const {
  buildPortalFinalPayload,
  collectPortalThreadAttachments,
  deletePortalAttachmentThreadForMessage,
  findPortalAttachmentThread,
  parsePortalPreviewMessage,
  ANNOUNCEMENT_CHANNEL_ID,
  PORTAL_ANNOUNCEMENT_CHANNEL_ID,
  QUESTION_THREAD_TITLE,
} = require('../../../functions/helpers/portalAnnouncementUtils');
const { createAnnouncementTracking } = require('../../../sqliteFunctions');
const { announcementAckQueue } = require('../../../queue/announcementAckQueue');

const ACK_TIMEOUT_MINUTES = parseInt(process.env.ANNOUNCEMENT_ACK_TIMEOUT_MINUTES || '5');

async function resolveChannel(client, channelId) {
  const cached = client.channels.cache.get(channelId);
  if (cached) return cached;
  return client.channels.fetch(channelId);
}

// Who is expected to acknowledge: everyone in the guild, the members of the
// mentioned roles, or the mentioned users - minus bots and the preparer.
async function resolveExpectedUsers(message, guild, preparerId) {
  let expectedUsers = [];

  if (message.content.includes('@everyone')) {
    await guild.members.fetch();
    expectedUsers = guild.members.cache
      .filter((member) => !member.user.bot)
      .map((member) => member.id);
  } else if (message.mentions.roles.size) {
    message.mentions.roles.forEach((role) => {
      role.members.forEach((member) => {
        if (!member.user.bot && !expectedUsers.includes(member.id)) {
          expectedUsers.push(member.id);
        }
      });
    });
  } else if (message.mentions.users.size) {
    message.mentions.users.forEach((user) => {
      if (!user.bot) expectedUsers.push(user.id);
    });
  }

  return expectedUsers.filter((userId) => userId !== preparerId);
}

module.exports = {
  data: {
    name: 'portalAnnouncementSubmit',
  },
  async execute(interaction, client) {
    const parsed = parsePortalPreviewMessage(interaction.message);

    if (parsed.ownerId !== interaction.user.id) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: You cannot use this button.')
        .setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (parsed.selectedRecipients.length === 0) {
      const replyEmbed = new EmbedBuilder()
        .setDescription('🔴 ERROR: Please select at least one recipient before announcing.')
        .setColor('Red');

      return interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferUpdate();

    const thread = findPortalAttachmentThread(interaction.message.channel, interaction.message.id);
    const attachments = await collectPortalThreadAttachments(thread);
    // Both copies share a timestamp so the audit log matches the announcement.
    const timestamp = moment().tz('Asia/Manila').format('MMMM D, YYYY [at] h:mm A');

    const announcementChannel = await resolveChannel(client, ANNOUNCEMENT_CHANNEL_ID);
    const announcementMessage = await announcementChannel.send(
      buildPortalFinalPayload({
        announcement: parsed.announcement,
        selectedRecipients: parsed.selectedRecipients,
        attachments,
        ownerId: parsed.ownerId,
        timestamp,
      })
    );

    const ackThread = await announcementMessage.startThread({
      name: QUESTION_THREAD_TITLE,
      autoArchiveDuration: 1440,
    });

    const expectedUsers = await resolveExpectedUsers(
      announcementMessage,
      interaction.guild,
      parsed.ownerId
    );

    // The acknowledge button is only attached once tracking exists, otherwise it
    // would answer "no longer accepting acknowledgments" forever.
    if (expectedUsers.length > 0) {
      createAnnouncementTracking(
        announcementMessage.id,
        ANNOUNCEMENT_CHANNEL_ID,
        ackThread.id,
        expectedUsers,
        ACK_TIMEOUT_MINUTES
      );

      const acknowledgeButton = new ButtonBuilder()
        .setCustomId('announcementAcknowledge')
        .setLabel('Acknowledge')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✅');

      await announcementMessage.edit({
        components: [new ActionRowBuilder().addComponents(acknowledgeButton)],
      });

      await announcementAckQueue.add(
        'check-acknowledgments',
        {
          announcementId: announcementMessage.id,
          channelId: ANNOUNCEMENT_CHANNEL_ID,
          threadId: ackThread.id,
        },
        {
          delay: ACK_TIMEOUT_MINUTES * 60 * 1000,
          jobId: `announcement-ack-${announcementMessage.id}`,
        }
      );

      console.log(
        `✓ Announcement ${announcementMessage.id} tracking ${expectedUsers.length} users, check scheduled in ${ACK_TIMEOUT_MINUTES} minutes`
      );
    }

    // Audit copy: no mentions, no thread, no acknowledgement tracking.
    if (parsed.isPortalUpdate) {
      const portalChannel = await resolveChannel(client, PORTAL_ANNOUNCEMENT_CHANNEL_ID);
      await portalChannel.send(
        buildPortalFinalPayload({
          announcement: parsed.announcement,
          selectedRecipients: parsed.selectedRecipients,
          attachments,
          ownerId: parsed.ownerId,
          timestamp,
          suppressMentions: true,
        })
      );
    }

    await deletePortalAttachmentThreadForMessage(interaction.message, client);
    await interaction.message.delete();
  },
};
