// discord.js v14
const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ChannelType,
  StringSelectMenuBuilder,
  MessageFlags
} = require('discord.js');
const AsyncLock = require('async-lock');

const { getNextAuditId } = require('../../../sqliteFunctions.js');
const { cleanAuditDescription } = require('../../../functions/code/repeatFunctions.js');

const auditTypes = require('../../../config/audit_types.json');

const lock = new AsyncLock();
const CLAIM_TTL_MS = 3 * 60 * 1000;
const claimedMessages = new Set(); // messageId strings

const auditProcessingChannelId = '1423597801643708576';
const auditingRoleId = '1428232349417607269';
const auditorRoleId = '1423572648285442088';
const managementRoleId = '1314413671245676685';

module.exports = {
  data: { name: 'auditClaim' },

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
      console.warn('deferReply failed:', e?.message || e);
      return;
    }

    // 2) One-at-a-time critical section per messageId
    await lock.acquire(messageId, async () => {
      const hasAuditingRole = interaction.member.roles.cache.has(auditingRoleId);
      const hasAuditorRole = interaction.member.roles.cache.has(auditorRoleId);
      const hasManagementRole = interaction.member.roles.cache.has(managementRoleId);

      const errorEmbed = new EmbedBuilder();

      if (!hasAuditorRole && !hasManagementRole) {
        errorEmbed.setDescription(`🔴 ERROR: You cannot use this button.`);
        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }

      if (hasAuditingRole) {
        errorEmbed.setDescription(`🔴 ERROR: You currently have an audit in progress.`);

        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({
            embeds: [errorEmbed],
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }
      // Already claimed? -> loser
      if (claimedMessages.has(messageId)) {
        return sendLoser(interaction);
      }

      // Claim it -> winner
      claimedMessages.add(messageId);

      try {
        await runForWinner(interaction, client);

        const winnerEmbed = new EmbedBuilder()
          .setDescription('You claimed this audit. Please proceed to the processing channel.')
          .setColor(0x57f287)
          .setAuthor({
            name: interaction.member.nickname
              ? interaction.member.nickname.replace(/^[🔴🟢]\s*/, '')
              : interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ size: 128 })
          });

        await interaction.editReply({ embeds: [winnerEmbed] });

        await interaction.message.delete();
        setTimeout(() => claimedMessages.delete(messageId), CLAIM_TTL_MS);
      } catch (err) {
        console.error('Winner flow failed:', err?.message || err);

        // Roll back so another user can try again
        claimedMessages.delete(messageId);

        if (interaction.deferred && !interaction.replied) {
          await interaction.editReply({
            content: 'Sorry, something went wrong setting up your audit. Please try again.'
          });
        }
      }
    });
  }
};

async function sendLoser(interaction) {
  const loserEmbed = new EmbedBuilder()
    .setDescription('This audit has already been claimed.')
    .setColor(0xed4245);

  try {
    if (interaction.deferred) {
      await interaction.editReply({ embeds: [loserEmbed] });
    } else if (interaction.replied) {
      await interaction.followUp({
        embeds: [loserEmbed],
        flags: MessageFlags.Ephemeral
      });
    } else {
      // Normally we always defer first, so this path is unlikely
      await interaction.reply({
        embeds: [loserEmbed],
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (e) {
    console.error('Failed to send loser response:', e?.message || e);
  }
}

/**
 * Winner setup: create processing + discussion threads, menus, etc.
 */
async function runForWinner(interaction, client) {
  const auditProcessingChannel =
    client.channels.cache.get(auditProcessingChannelId) ??
    (await client.channels.fetch(auditProcessingChannelId));

  const auditor = interaction.member?.nickname
    ? interaction.member.nickname.replace(/^[🔴🟢]\s*/, '')
    : interaction.user.username;

  const base = interaction.message.embeds?.[0];
  const auditEmbed = base ? EmbedBuilder.from(base) : new EmbedBuilder();

  const auditTitleRaw = auditEmbed.data?.description;
  const { audit_type, audit_id } = cleanAuditDescription(auditTitleRaw); // null audit_id here

  const auditType = auditTypes.find((type) => type.name === audit_type);

  if (!auditType) {
    throw new Error('Audit type not found');
  }

  const auditIdRaw = getNextAuditId(auditType.code);
  const auditId = auditIdRaw.toString().padStart(4, '0');

  const auditTitle = `${auditEmbed.data?.description} | ${auditType.code}-${auditId}`;

  auditEmbed.setDescription(auditTitle);

  auditEmbed.setAuthor({
    name: auditor,
    iconURL: interaction.user.displayAvatarURL({ size: 128 })
  });

  const auditRatingMenu = new StringSelectMenuBuilder()
    .setCustomId('auditRatingMenu')
    .setOptions([
      { label: '⭐', value: '⭐' },
      { label: '⭐⭐', value: '⭐⭐' },
      { label: '⭐⭐⭐', value: '⭐⭐⭐' },
      { label: '⭐⭐⭐⭐', value: '⭐⭐⭐⭐' },
      { label: '⭐⭐⭐⭐⭐', value: '⭐⭐⭐⭐⭐' }
    ])
    .setMinValues(1)
    .setMaxValues(1)
    .setPlaceholder('Select audit rating.');

  const auditFinishButton = new ButtonBuilder()
    .setCustomId('auditFinish')
    .setLabel('Submit')
    .setDisabled(true)
    .setStyle(ButtonStyle.Success);

  const auditThread = await auditProcessingChannel.threads.create({
    name: `Audit Logs | ${auditor} | ${auditId}`,
    type: ChannelType.PublicThread
  });

  await auditThread.send({
    content: interaction.user.toString(),
    embeds: [auditEmbed],
    components: [
      new ActionRowBuilder().addComponents(auditRatingMenu),
      new ActionRowBuilder().addComponents(auditFinishButton)
    ]
  });

  await auditThread.send({
    content: `${interaction.user.toString()}, please provide the audit details here.`
  });

  // Add the auditing role to the user
  try {
    const member = interaction.member;
    await member.roles.add(auditingRoleId);
  } catch (error) {
    console.error('Failed to add auditing role:', error);
    await auditThread.send({
      content: `<@748568303219245117> ERROR: Failed to assign auditing role.`
    });
  }
}
