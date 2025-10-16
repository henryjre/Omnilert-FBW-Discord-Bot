// discord.js v14
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  MessageFlags,
  StringSelectMenuOptionBuilder
} = require('discord.js');
const moment = require('moment-timezone');

const { analyzeAudit } = require('../../../openai.js');

const vnrQueueChannelId = '1424950819501113466';

module.exports = {
  data: { name: 'vnrModal' },

  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('discord.js').Client} client
   */
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

    await interaction.deferUpdate();

    const messageId = interaction.fields.getTextInputValue('messageIdInput');
    const vnrDescription = interaction.fields.getTextInputValue('vnrDescriptionInput');

    // Get the original message using the messageId from the current channel
    let originalMessage;
    try {
      originalMessage = await interaction.channel.messages.fetch(messageId);
    } catch (error) {
      return await interaction.editReply({
        content: `🔴 ERROR: Could not find the original message with ID: ${messageId}. Please try again.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const allEmbeds = originalMessage.embeds;
    const messageEmbed = allEmbeds[0];

    const auditTitle = messageEmbed.data.description;
    const auditIdMatch = auditTitle.match(/AUD-\d+/);
    const auditId = auditIdMatch ? auditIdMatch[0] : '0000';

    const serviceCrewRole = await interaction.guild.roles.cache.get('1314413960274907238');

    const membersWithServiceCrewRoles = await serviceCrewRole.members.map((m) => {
      const name = m.nickname.replace(/^[🔴🟢]\s*/, '') || m.user.username;
      return new StringSelectMenuOptionBuilder().setLabel(name).setValue(m.user.id);
    });

    const serviceCrewMenu = new StringSelectMenuBuilder()
      .setCustomId('vnrServiceCrewMenu')
      .setOptions(membersWithServiceCrewRoles)
      .setMinValues(1)
      .setMaxValues(membersWithServiceCrewRoles.length)
      .setPlaceholder('Select employees involved in this VNR.');

    const submitVnrButton = new ButtonBuilder()
      .setCustomId('submitVnr')
      .setLabel('Submit')
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const cancelVnrButton = new ButtonBuilder()
      .setCustomId('cancelVnr')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);

    const vnrButtonRow = new ActionRowBuilder().addComponents(submitVnrButton, cancelVnrButton);

    const serviceCrewMenuRow = new ActionRowBuilder().addComponents(serviceCrewMenu);

    const messageComponents = interaction.message.components;

    const submitButtonRow = messageComponents.find((row) =>
      row.components.some((component) => component.customId === 'auditVnr')
    );

    if (submitButtonRow) {
      const submitButtonIndex = submitButtonRow.components.findIndex(
        (component) => component.customId === 'auditVnr'
      );

      if (submitButtonIndex !== -1) {
        submitButtonRow.components[submitButtonIndex].data.disabled = true;
      }
    }

    await interaction.message.edit({
      components: messageComponents
    });

    const vnrEmbed = new EmbedBuilder()
      .setDescription('## ⌛ VIOLATION NOTICE REQUEST')
      .setColor('DarkRed')
      .addFields(
        {
          name: 'Requested By',
          value: interaction.user.toString()
        },
        {
          name: 'Employees Involved',
          value: 'Select employees involved on the menu below'
        },
        {
          name: 'Audit Link',
          value: originalMessage.url
        },
        {
          name: 'Audit Message ID',
          value: interaction.message.id
        },
        {
          name: 'Description',
          value: vnrDescription
        }
      )
      .setTimestamp(Date.now());

    const vnrThread = await interaction.message.startThread({
      name: `VN Request - ${auditId}`,
      type: ChannelType.PublicThread,
      autoArchiveDuration: 60
    });

    const threadCreatedMessages = await interaction.channel.messages.fetch().then((messages) => {
      return messages.filter((m) => m.author.bot && m.type === 18);
    });

    const lastThreadCreated = await threadCreatedMessages.find(
      (t) => t.reference.channelId === vnrThread.id
    );

    if (lastThreadCreated) {
      await lastThreadCreated.delete();
    }

    await vnrThread.send({
      content: `${interaction.user.toString()}, select employees or submit this VN Request.`,
      embeds: [vnrEmbed],
      components: [serviceCrewMenuRow, vnrButtonRow]
    });
  }
};

/**
 * Fetch all non-bot messages from a thread channel.
 * Automatically paginates through the entire message history (no limit).
 *
 * @param {ThreadChannel} thread - The Discord thread channel
 * @param {string} userId - The ID of the user whose messages to collect (optional)
 * @returns {Promise<Message[]>} Array of Message objects from non-bot users
 */
async function getAllUserMessages(thread, userId = null) {
  const allMessages = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    // Fetch next batch
    const fetched = await thread.messages.fetch(options);
    if (fetched.size === 0) break;

    // Filter out bot messages, and optionally filter by userId if provided
    const filteredMessages = fetched.filter((msg) => {
      if (msg.author.bot) return false;
      return userId ? msg.author.id === userId : true;
    });

    allMessages.push(...filteredMessages.values());

    // Prepare for next loop
    lastId = fetched.last().id;

    // Stop if we've reached the beginning of the thread
    if (fetched.size < 100) break;
  }

  // Return in chronological order (oldest → newest)
  return allMessages.reverse();
}
