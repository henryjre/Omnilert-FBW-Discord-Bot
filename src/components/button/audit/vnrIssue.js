const {
  ActionRowBuilder,
  MessageFlags,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const vnrIssuanceChannelId = '1424951192517214228';
const auditCompletedChannelId = '1423597979604095046';

const { editVnrStatus } = require('../../../functions/code/repeatFunctions.js');

module.exports = {
  data: {
    name: `vnrIssue`
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

    const auditCompletedChannel = await client.channels.cache.get(auditCompletedChannelId);
    const auditMessageIdField = messageEmbed.data.fields.find((f) => f.name === 'Audit Message ID');
    const auditMessageId = auditMessageIdField.value;

    const auditMessage = await auditCompletedChannel.messages.fetch(auditMessageId);
    const auditMessageEmbed = auditMessage.embeds[0];

    const auditTitle = auditMessageEmbed.data.description;
    const auditIdMatch = auditTitle.match(/AUD-\d+/);

    const vnrTitle = messageEmbed.data.description;
    const vnrIdMatch = vnrTitle.match(/VN-\d+/);

    const auditId = auditIdMatch ? auditIdMatch[0] : '0000';
    const vnrId = vnrIdMatch ? vnrIdMatch[0] : '0000';

    const vnrIssuanceChannel = await client.channels.cache.get(vnrIssuanceChannelId);

    messageEmbed.data.footer.text += `\nIssued By: ${confirmedBy}`;
    messageEmbed.data.fields.push({
      name: 'Discussion Thread',
      value: interaction.channel.toString()
    });

    const issueVnrButton = new ButtonBuilder()
      .setCustomId('vnrDisciplinaryMeeting')
      .setLabel('Submit')
      .setStyle(ButtonStyle.Success);

    const issueVnrButtonRow = new ActionRowBuilder().addComponents(issueVnrButton);

    const vnrThreadMessage = await vnrIssuanceChannel.send({
      content: `${interaction.user.toString()}, upload the PDF file of the Violation Notice in the thread below.`,
      embeds: [messageEmbed],
      components: [issueVnrButtonRow]
    });

    const thread = await vnrThreadMessage.startThread({
      name: `Violation Notice Issuance - ${vnrId} | ${auditId}`,
      type: ChannelType.PublicThread
    });

    await editVnrStatus(messageEmbed, '📝 Issued', vnrThreadMessage.url, client);

    const replyEmbed = new EmbedBuilder()
      .setDescription(`✅ Please proceed to <#${vnrIssuanceChannelId}> to issue the VN.`)
      .setColor('Green');

    await interaction.message.edit({
      components: []
    });

    await interaction.editReply({
      embeds: [replyEmbed]
    });

    if (interaction.channel.isThread()) {
      try {
        // Delete the starter message first
        const starterMessage = await interaction.channel.fetchStarterMessage();
        if (starterMessage) {
          await starterMessage.delete();
        }

        await interaction.channel.setArchived(true);
      } catch (threadError) {
        console.log('Error deleting thread or starter message:', threadError);
      }
    }
  }
};
