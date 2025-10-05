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
const AsyncLock = require("async-lock");

const lock = new AsyncLock();
const CLAIM_TTL_MS = 3 * 60 * 1000;
const claimedMessages = new Set(); // messageId strings

const auditProcessingChannelId = "1423597801643708576";
const discussionChannelId = "1423654173504700496";

module.exports = {
  data: { name: "auditClaim" },

  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    if (!interaction.isButton()) return;
    const messageId = interaction.message.id;

    // 1) Acknowledge IMMEDIATELY to avoid the 3s timeout for all clickers.
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
    } catch (e) {
      // If we can't defer, the token likely expired or was acked elsewhere.
      // We can't safely respond anymore, so bail out.
      console.warn("deferReply failed:", e?.message || e);
      return;
    }

    // 2) One-at-a-time critical section per messageId
    await lock.acquire(messageId, async () => {
      // Already claimed? -> loser
      if (claimedMessages.has(messageId)) {
        return sendLoser(interaction);
      }

      // Claim it -> winner
      claimedMessages.add(messageId);

      try {
        await runForWinner(interaction, client);

        const winnerEmbed = new EmbedBuilder()
          .setDescription(
            "You claimed this audit. Please proceed to the processing channel."
          )
          .setColor(0x57f287);

        await interaction.editReply({ embeds: [winnerEmbed] });

        await interaction.message.delete();
        setTimeout(() => claimedMessages.delete(messageId), CLAIM_TTL_MS);
      } catch (err) {
        console.error("Winner flow failed:", err?.message || err);

        // Roll back so another user can try again
        claimedMessages.delete(messageId);

        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content:
              "Sorry, something went wrong setting up your audit. Please try again.",
          });
        }
      }
    });
  },
};

async function sendLoser(interaction) {
  const loserEmbed = new EmbedBuilder()
    .setDescription("This audit has already been claimed.")
    .setColor(0xed4245);

  try {
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [loserEmbed] });
    } else if (interaction.replied) {
      await interaction.followUp({
        embeds: [loserEmbed],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      // Normally we always defer first, so this path is unlikely
      await interaction.reply({
        embeds: [loserEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (e) {
    console.error("Failed to send loser response:", e?.message || e);
  }
}

/**
 * Winner setup: create processing + discussion threads, menus, etc.
 */
async function runForWinner(interaction, client) {
  const auditProcessingChannel =
    client.channels.cache.get(auditProcessingChannelId) ??
    (await client.channels.fetch(auditProcessingChannelId));
  const discussionChannel =
    client.channels.cache.get(discussionChannelId) ??
    (await client.channels.fetch(discussionChannelId));

  const auditor = interaction.member?.nickname
    ? interaction.member.nickname.replace(/^[🔴🟢]\s*/, "")
    : interaction.user.username;

  const base = interaction.message.embeds?.[0];
  const auditEmbed = base ? EmbedBuilder.from(base) : new EmbedBuilder();

  const auditTitle =
    (auditEmbed.data?.description || "# Audit").replace(/^#\s*/, "") +
    " | " +
    auditor;

  auditEmbed.setAuthor({
    name: auditor,
    iconURL: interaction.user.displayAvatarURL({ size: 128 }),
  });

  const auditRatingMenu = new StringSelectMenuBuilder()
    .setCustomId("auditRatingMenu")
    .setOptions([
      { label: "⭐", value: "⭐" },
      { label: "⭐⭐", value: "⭐⭐" },
      { label: "⭐⭐⭐", value: "⭐⭐⭐" },
      { label: "⭐⭐⭐⭐", value: "⭐⭐⭐⭐" },
      { label: "⭐⭐⭐⭐⭐", value: "⭐⭐⭐⭐⭐" },
    ])
    .setMinValues(1)
    .setMaxValues(1)
    .setPlaceholder("Select audit rating.");

  const auditFinishButton = new ButtonBuilder()
    .setCustomId("auditFinish")
    .setLabel("Submit")
    .setDisabled(true)
    .setStyle(ButtonStyle.Success);

  const auditMessage = await auditProcessingChannel.send({
    embeds: [auditEmbed],
    components: [
      new ActionRowBuilder().addComponents(auditRatingMenu),
      new ActionRowBuilder().addComponents(auditFinishButton),
    ],
  });

  const auditThread = await auditMessage.startThread({
    name: `Audit Logs`,
    type: ChannelType.PublicThread,
  });

  await auditThread.send({
    content: `${interaction.user.toString()}, please provide the audit details here.`,
  });

  const discussionMessage = await discussionChannel.send({
    content: auditTitle,
  });

  const discussionThread = await discussionMessage.startThread({
    name: `Audit Discussion`,
    type: ChannelType.PublicThread,
  });

  await discussionThread.send({
    content: `${interaction.user.toString()}, you can discuss the auditing of your current audit transaction here with other members.`,
  });
}
