const {
  ActionRowBuilder,
  MessageFlags,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const vnrDisciplinaryMeetingChannelId = '1424951422746759199';
const auditCompletedChannelId = '1423597979604095046';

const {
  editVnrStatus,
  cleanAuditDescription
} = require('../../../functions/code/repeatFunctions.js');

module.exports = {
  data: {
    name: `vnrDisciplinaryMeeting`
  },
  async execute(interaction, client) {
    const mentionedUser = interaction.message.mentions?.users?.first() || null;
    const mentionedRole = interaction.message.mentions?.roles?.first() || null;

    if (mentionedUser) {
      const isNotMentionedUser = interaction.user.id !== mentionedUser.id;
      if (isNotMentionedUser) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const confirmedBy =
      interaction.member.nickname.replace(/^[🔴🟢]\s*/, '') || interaction.user.username;

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const messageAttachments = interaction.message.attachments.map((a) => a.url);

    if (!messageAttachments.length) {
      return await interaction.editReply({
        content: `🔴 ERROR: No attachments found. Please upload the VN file in the thread below.`
      });
    }

    const auditCompletedChannel = await client.channels.cache.get(auditCompletedChannelId);
    const auditMessageIdField = messageEmbed.data.fields.find((f) => f.name === 'Audit Message ID');
    const auditMessageId = auditMessageIdField.value;

    const auditMessage = await auditCompletedChannel.messages.fetch(auditMessageId);
    const auditMessageEmbed = auditMessage.embeds[0];

    const auditTitle = auditMessageEmbed.data.description;
    const { audit_id } = cleanAuditDescription(auditTitle);

    const vnrTitle = messageEmbed.data.description;
    const vnrIdMatch = vnrTitle.match(/VN-\d+/);

    const vnrId = vnrIdMatch ? vnrIdMatch[0] : '0000';

    const vnrDisciplinaryMeetingChannel = await client.channels.cache.get(
      vnrDisciplinaryMeetingChannelId
    );

    const thread = await vnrDisciplinaryMeetingChannel.threads.create({
      name: `Disciplinary Meeting - ${vnrId} | ${audit_id}`,
      type: ChannelType.PublicThread
    });

    const vnrCompletedButton = new ButtonBuilder()
      .setCustomId('vnrCompleted')
      .setLabel('VN Complete')
      .setStyle(ButtonStyle.Success);

    const vnrCompletedButtonRow = new ActionRowBuilder().addComponents(vnrCompletedButton);

    const vnrThreadMessage = await thread.send({
      content: `${interaction.user.toString()}, upload proof of disciplinary meeting here.`,
      embeds: allEmbeds,
      components: [vnrCompletedButtonRow],
      files: messageAttachments
    });

    await editVnrStatus(messageEmbed, '🚨 In Disciplinary', vnrThreadMessage.url, client);

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `✅ VN has been moved to disciplinary meeting. Please proceed to <#${vnrDisciplinaryMeetingChannelId}>.`
      )
      .setColor('Green');

    await interaction.editReply({
      embeds: [replyEmbed]
    });

    await interaction.message.thread.delete();
    await interaction.message.delete();
  }
};
