const {
  ActionRowBuilder,
  MessageFlags,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const vnInquiriesAndDiscussionsChannelId = '1424951056558854144';

const {
  editVnrStatus,
  fetchVNandRequestID,
} = require('../../../functions/code/repeatFunctions.js');

module.exports = {
  data: {
    name: `vnrConfirm`,
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
      const doesNotHaveRole = !interaction.member.roles.cache.has(mentionedRole.id);
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const confirmedBy =
      interaction.member.nickname.replace(/^[🔴🟢]\s*/, '') || interaction.user.username;

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const { vnrId, request_id } = await fetchVNandRequestID(messageEmbed, client);

    const vnInquiriesAndDiscussionsChannel = await client.channels.cache.get(
      vnInquiriesAndDiscussionsChannelId
    );

    const thread = await vnInquiriesAndDiscussionsChannel.threads.create({
      name: `Violation Notice - ${vnrId} | ${request_id}`,
      type: ChannelType.PublicThread,
    });

    const newVnEmbed = EmbedBuilder.from(messageEmbed)
      .setDescription(`## 🚫 VIOLATION NOTICE | ${vnrId}`)
      .setFooter({
        text: `Confirmed By: ${confirmedBy}`,
      });

    const issueVnrButton = new ButtonBuilder()
      .setCustomId('vnrIssue')
      .setLabel('Issue VN')
      .setStyle(ButtonStyle.Success);

    const rejectVnrButton = new ButtonBuilder()
      .setCustomId('vnrReject')
      .setLabel('Reject VN')
      .setStyle(ButtonStyle.Danger);

    const issueVnrButtonRow = new ActionRowBuilder().addComponents(issueVnrButton, rejectVnrButton);

    const vnrThreadMessage = await thread.send({
      content: `${interaction.user.toString()}`,
      embeds: [newVnEmbed],
      components: [issueVnrButtonRow],
    });

    await editVnrStatus(messageEmbed, '🟢 Confirmed', vnrThreadMessage.url, client);

    await interaction.message.delete();

    const replyEmbed = new EmbedBuilder()
      .setDescription(
        `✅ VN has been confirmed. Please proceed to <#${vnInquiriesAndDiscussionsChannelId}> to issue the VN.`
      )
      .setColor('Green');

    await interaction.editReply({
      embeds: [replyEmbed],
    });
  },
};
