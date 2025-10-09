// discord.js v14
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");
const moment = require("moment-timezone");

const { analyzeAudit } = require("../../../openai.js");

const auditCompletedChannelId = "1423597979604095046";

module.exports = {
  data: { name: "auditFinish" },

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
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (mentionedRole) {
      const doesNotHaveRole = !interaction.member.roles.cache.has(
        mentionedRole.id
      );
      if (doesNotHaveRole) {
        return await interaction.reply({
          content: `🔴 ERROR: You cannot use this button.`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allEmbeds = interaction.message.embeds;
    const messageEmbed = allEmbeds[0];

    const auditTitle = messageEmbed.data.description;
    const auditIdMatch = auditTitle.match(/AUD-\d+/);
    const auditId = auditIdMatch ? auditIdMatch[0] : "0000";

    messageEmbed.data.author = null;

    const notifyEmployeeButton = new ButtonBuilder()
      .setCustomId("auditNotifyEmployee")
      .setLabel("Notify Employee")
      .setStyle(ButtonStyle.Success);

    const vnrButton = new ButtonBuilder()
      .setCustomId("auditVnr")
      .setLabel("Request VN")
      .setStyle(ButtonStyle.Primary);

    const notifyEmployeeButtonRow = new ActionRowBuilder().addComponents(
      notifyEmployeeButton,
      vnrButton
    );

    const auditCompletedChannel = client.channels.cache.get(
      auditCompletedChannelId
    );

    const threadMsgs = await getAllUserMessages(interaction.message.thread);

    if (!threadMsgs.length) {
      messageEmbed.data.fields.push({
        name: "Audit Summary",
        value: "No summary available.",
      });
    } else {
      // Prepare minimal content array for the summarizer
      const msgsForSummary = threadMsgs.map((m) => ({
        author: "Auditor", // deliberately anonymized
        content: (m.content || "").replace(/\s+/g, " ").trim(),
      }));

      // Call GPT-4o-mini to produce a confidential summary
      const summaryText = await analyzeAudit(msgsForSummary, "summary");

      messageEmbed.data.fields.push({
        name: "Audit Summary",
        value: summaryText,
      });
    }

    await auditCompletedChannel.send({
      content: interaction.user.toString(),
      embeds: allEmbeds,
      components: [notifyEmployeeButtonRow],
    });

    const replyEmbed = new EmbedBuilder().setDescription(
      `✅ Audit completed successfully. Please proceed to <#${auditCompletedChannelId}> to request for VN or Notify the employee/s involved.`
    );

    await interaction.editReply({
      embeds: [replyEmbed],
    });

    await interaction.message.thread.setArchived(true);
    await interaction.message.delete();
  },
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
